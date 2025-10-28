<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use GuzzleHttp\Client;

class ArcaSyncDocumenti extends Command
{
    protected $signature = 'arca:sync-documenti {--giorni=7 : Numero di giorni da sincronizzare} {--retry=3 : Numero di tentativi}';
    protected $description = 'Sincronizza documenti da API Arca con strategie alternative per evitare timeout';

    public function handle()
    {
        // Imposta il tempo massimo di esecuzione a 10 minuti
        set_time_limit(600);
        
        $giorni = $this->option('giorni');
        $retry = $this->option('retry');
        
        $this->info("🚀 Inizio sincronizzazione documenti Arca (ultimi {$giorni} giorni)");
        
        // 1. Recupera credenziali
        $row = DB::table('settings')->where('key', 'arca_credentials')->first();
        if (!$row) {
            $this->error('❌ Credenziali Arca non trovate.');
            return 1;
        }
        
        $creds = json_decode(Crypt::decryptString($row->value), true);
        $username = $creds['username'] ?? '';
        $password = $creds['password'] ?? '';
        
        if (!$username || !$password) {
            $this->error('❌ Username o password Arca mancanti.');
            return 1;
        }
        
        // 2. Login
        $client = new Client([
            'base_uri' => 'http://ws.grsis.it:8082/api-arca/cgf/',
            'timeout' => 300, // ✅ FIX: 5 minuti per produzione
            'connect_timeout' => 60, // ✅ FIX: 1 minuto per connessione
            'read_timeout' => 300 // ✅ FIX: 5 minuti per lettura
        ]);
        
        try {
            $this->info('🔐 Login Arca in corso...');
            $res = $client->post('auth/login', [
                'json' => ['username' => $username, 'password' => $password]
            ]);
            $body = json_decode($res->getBody(), true);
            $token = $body['token'] ?? null;
            
            if (!$token) {
                throw new \Exception('Token JWT non ricevuto');
            }
            
            $this->info('✅ Login Arca completato');
        } catch (\Exception $e) {
            $this->error('❌ Login Arca fallito: ' . $e->getMessage());
            return 1;
        }
        
        $headers = ['Authorization' => 'Bearer ' . $token];
        
        // 3. Sincronizzazione documenti con strategie alternative
        return $this->syncDocumentiConStrategieAlternative($client, $headers, $giorni, $retry);
    }
    
    private function syncDocumentiConStrategieAlternative($client, $headers, $giorni, $maxRetry)
    {
        $this->info("📄 Inizio sincronizzazione documenti...");
        
        $documentiTotali = 0;
        $righeTotali = 0;
        
        // Strategia: Range date flessibile (giorni singoli per piccoli range)
        if ($giorni <= 3) {
            // Per 1-3 giorni: sincronizza giorno per giorno
            for ($giorno = 0; $giorno < $giorni; $giorno++) {
                $data = date('Y-m-d', strtotime("-{$giorno} days"));
                $dataInizio = $data;
                $dataFine = $data;
                
                $this->info("📅 Sincronizzazione giorno: {$data}");
                
                $risultato = $this->tentaSincronizzazioneRange($client, $headers, $dataInizio, $dataFine, $maxRetry);
                $documentiTotali += $risultato['documenti'];
                $righeTotali += $risultato['righe'];
            }
        } else {
            // Per più di 3 giorni: sincronizza per settimane o range più ampi
            $giorniRimanenti = $giorni;
            $offsetGiorni = 0;
            
            while ($giorniRimanenti > 0) {
                $giorniRange = min(7, $giorniRimanenti); // Max 7 giorni per volta
                
                $dataFine = date('Y-m-d', strtotime("-{$offsetGiorni} days"));
                $dataInizio = date('Y-m-d', strtotime("-" . ($offsetGiorni + $giorniRange - 1) . " days"));
                
                $this->info("📅 Sincronizzazione range: {$dataInizio} - {$dataFine}");
                
                $risultato = $this->tentaSincronizzazioneRange($client, $headers, $dataInizio, $dataFine, $maxRetry);
                $documentiTotali += $risultato['documenti'];
                $righeTotali += $risultato['righe'];
                
                $offsetGiorni += $giorniRange;
                $giorniRimanenti -= $giorniRange;
            }
        }
        
        $this->info("🎉 Sincronizzazione documenti completata!");
        $this->info("📄 Documenti sincronizzati: {$documentiTotali}");
        $this->info("📋 Righe documento sincronizzate: {$righeTotali}");
        
        // Salva timestamp ultima sincronizzazione
        DB::table('settings')->updateOrInsert(
            ['key' => 'ultima_sync_documenti'],
            ['value' => now()->toDateTimeString()]
        );
        
        return 0;
    }
    
    private function tentaSincronizzazioneRange($client, $headers, $dataInizio, $dataFine, $maxRetry)
    {
        $tentativo = 1;
        $successo = false;
        $risultato = ['documenti' => 0, 'righe' => 0];
        
        while ($tentativo <= $maxRetry && !$successo) {
            try {
                $this->info("🔄 Tentativo {$tentativo}/{$maxRetry}...");
                $startTime = microtime(true);
                
                $res = $client->get('documenti/date', [
                    'headers' => $headers,
                    'query' => [
                        'dataInizio' => date('Ymd', strtotime($dataInizio)), // Formato YYYYMMDD
                        'dataFine' => date('Ymd', strtotime($dataFine))       // Formato YYYYMMDD
                    ],
                    'timeout' => 300 // ✅ FIX: 5 minuti per chiamate singole in produzione
                ]);
                
                $endTime = microtime(true);
                $duration = round($endTime - $startTime, 2);
                
                $list = json_decode($res->getBody(), true);
                
                if (!is_array($list)) {
                    throw new \Exception('Risposta API non valida');
                }
                
                $documentiRicevuti = count($list);
                $this->info("✅ API completata in {$duration}s - {$documentiRicevuti} documenti ricevuti");
                
                // Processa documenti
                $risultato = $this->processaDocumenti($list);
                $successo = true;
                
            } catch (\Exception $e) {
                $this->warn("⚠️ Tentativo {$tentativo} fallito: " . $e->getMessage());
                $tentativo++;
                
                if ($tentativo <= $maxRetry) {
                    $this->info("⏳ Attesa 10 secondi prima del prossimo tentativo...");
                    sleep(10);
                }
            }
        }
        
        if (!$successo) {
            $this->error("❌ Impossibile sincronizzare range {$dataInizio} - {$dataFine} dopo {$maxRetry} tentativi");
        }
        
        return $risultato;
    }
    
    private function processaDocumenti($list)
    {
        $documentiSincronizzati = 0;
        $righeSincronizzate = 0;
        
        foreach ($list as $doc) {
            // Validazione campi obbligatori
            if (empty($doc['codiceDoc']) || empty($doc['numeroDoc'])) {
                continue;
            }
            
            // Trova associazioni
            $clientRow = DB::table('clients')->where('codice_arca', $doc['codiceCliente'] ?? '')->first();
            $siteRow = DB::table('sites')->where('codice_arca', $doc['codiceDestinazione'] ?? '')->first();
            $driverRow = DB::table('drivers')->where('codice_arca', $doc['agente1'] ?? '')->first();
            
            // Inserisci/aggiorna documento con tutti i campi della specifica API Arca
            DB::table('documenti')->updateOrInsert(
                ['codice_doc' => $doc['codiceDoc'], 'numero_doc' => $doc['numeroDoc']],
                [
                    'data_doc' => $doc['dataDoc'] ?? null,
                    'numero_doc_rif' => $doc['numeroDocRif'] ?? null,
                    'data_doc_rif' => $doc['dataDocRif'] ?? null,
                    'data_consegna' => $doc['dataConsegna'] ?? null,
                    'agente1' => $doc['agente1'] ?? null,
                    'agente2' => $doc['agente2'] ?? null,
                    'totale_imponibile_doc' => $doc['totaleImponibileDoc'] ?? null,
                    'totale_imposta_doc' => $doc['totaleImpostaDoc'] ?? null,
                    'totale_sconto_doc' => $doc['totaleScontoDoc'] ?? null,
                    'totale_doc' => $doc['totaleDoc'] ?? null,
                    'client_id' => $clientRow ? $clientRow->id : null,
                    'site_id' => $siteRow ? $siteRow->id : null,
                    'driver_id' => $driverRow ? $driverRow->id : null,
                    'updated_at' => now()
                ]
            );
            
            // Recupera l'ID del documento appena inserito/aggiornato
            $documento = DB::table('documenti')
                ->where('codice_doc', $doc['codiceDoc'])
                ->where('numero_doc', $doc['numeroDoc'])
                ->first();
            
            if (!$documento) {
                continue; // Salta se il documento non è stato trovato
            }
            
            $documento_id = $documento->id;
            
            $documentiSincronizzati++;
            
            // Gestione righe documento con tutti i campi della specifica API Arca
            if (!empty($doc['righe']) && is_array($doc['righe'])) {
                foreach ($doc['righe'] as $riga) {
                    if (empty($riga['articolo'])) {
                        continue;
                    }
                    
                    DB::table('righe_documento')->updateOrInsert(
                        [
                            'documento_id' => $documento_id,
                            'codice_articolo' => $riga['articolo'],
                        ],
                        [
                            'riga' => $riga['riga'] ?? null,
                            'descrizione' => $riga['descrizione'] ?? null,
                            'unita' => $riga['unita'] ?? null,
                            'quantita' => $riga['quantita'] ?? null,
                            'prezzo_unitario' => $riga['prezzo'] ?? null,
                            'sconto' => $riga['sconto'] ?? null,
                            'prezzo_scontato' => $riga['prezzoScontato'] ?? null,
                            'codice_iva' => $riga['codiceIva'] ?? null,
                            'totale_riga' => $riga['totaleRiga'] ?? null,
                            'data_consegna' => $riga['dataConsegna'] ?? null,
                            'updated_at' => now()
                        ]
                    );
                    
                    $righeSincronizzate++;
                }
            }
        }
        
        return [
            'documenti' => $documentiSincronizzati,
            'righe' => $righeSincronizzate
        ];
    }
}
