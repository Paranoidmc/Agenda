<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use GuzzleHttp\Client;

class ArcaSync extends Command
{
    protected $signature = 'arca:sync';
    protected $description = 'Sincronizza dati da API Arca (clienti, destinazioni, agenti, documenti)';

    public function handle()
    {
        $this->info('Inizio sincronizzazione ARCA');
        // 1. Recupera credenziali
        $row = DB::table('settings')->where('key', 'arca_credentials')->first();
        if (!$row) {
            $this->error('Credenziali Arca non trovate.');
            return 1;
        }
        $creds = json_decode(Crypt::decryptString($row->value), true);
        $username = $creds['username'] ?? '';
        $password = $creds['password'] ?? '';
        if (!$username || !$password) {
            $this->error('Username o password Arca mancanti.');
            return 1;
        }
        // 2. Login
        $client = new Client([
            'base_uri' => 'http://ws.grsis.it:8082/api-arca/cgf/', 
            'timeout' => 120, // Aumentato timeout a 2 minuti per documenti
            'connect_timeout' => 30,
            'read_timeout' => 120
        ]);
        try {
            $res = $client->post('auth/login', [
                'json' => [ 'username' => $username, 'password' => $password ]
            ]);
            $body = json_decode($res->getBody(), true);
            $token = $body['token'] ?? null;
            if (!$token) throw new \Exception('Token JWT non ricevuto');
        } catch (\Exception $e) {
            $this->error('Login Arca fallito: ' . $e->getMessage());
            Log::error('Arca sync login error: ' . $e->getMessage());
            return 1;
        }
        $headers = [ 'Authorization' => 'Bearer ' . $token ];
        // 3. Sincronizza ogni entità
        $this->syncClienti($client, $headers);
        $this->syncDestinazioni($client, $headers);
        $this->syncAgenti($client, $headers);
        $this->syncDocumenti($client, $headers, $token);
        $this->info('Sincronizzazione ARCA completata!');
        return 0;
    }

    private function syncClienti($client, $headers)
    {
        $this->info('Sincronizzo clienti...');
        try {
            $res = $client->get('clienti', ['headers' => $headers]);
            $list = json_decode($res->getBody(), true);
            
            $this->info('Ricevuti ' . count($list) . ' clienti da Arca');
            
            foreach ($list as $index => $item) {
                // Debug: mostra struttura del primo cliente
                if ($index === 0) {
                    $this->info('Struttura primo cliente: ' . json_encode($item, JSON_PRETTY_PRINT));
                }
                
                // Mapping flessibile dei campi
                $nome = $item['descrizione'] ?? $item['ragioneSociale'] ?? $item['denominazione'] ?? $item['nome'] ?? $item['name'] ?? 'N/D';
                $codice = $item['codice'] ?? $item['id'] ?? null;
                
                if (!$codice) {
                    $this->warn('Cliente senza codice saltato: ' . json_encode($item));
                    continue;
                }
                
                DB::table('clients')->updateOrInsert(
                    ['codice_arca' => $codice],
                    [
                        'name' => $nome,  // Usa 'name' invece di 'nome'
                        'email' => $item['email'] ?? null,
                        'phone' => $item['telefono'] ?? $item['phone'] ?? null  // Usa 'phone' invece di 'telefono'
                    ]
                );
                
                $this->info("Cliente sincronizzato: {$codice} - {$nome}");
            }
        } catch (\Exception $e) {
            $this->error('Errore sync clienti: ' . $e->getMessage());
            Log::error('Arca sync clienti error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    private function syncDestinazioni($client, $headers)
    {
        $this->info('Sincronizzo destinazioni...');
        try {
            $res = $client->get('destinazioni', ['headers' => $headers]);
            $list = json_decode($res->getBody(), true);
            foreach ($list as $item) {
                // Normalizza codici (trim spazi)
                $codiceCliente = isset($item['codiceCliente']) ? trim((string)$item['codiceCliente']) : null;
                $codiceDest = isset($item['codice']) ? trim((string)$item['codice']) : null;

                // Trova client_id tramite codiceCliente
                $clientRow = $codiceCliente ? DB::table('clients')->where('codice_arca', $codiceCliente)->first() : null;
                $client_id = $clientRow ? $clientRow->id : null;

                // Se il cliente non esiste, logga warning e salta (evita client_id NULL su colonna NOT NULL)
                if (!$client_id) {
                    $this->warn("Destinazione senza cliente match: codiceDest={$item['codice']} codiceCliente={$item['codiceCliente']} — record saltato");
                    Log::warning('ArcaSync destinazione senza cliente', [
                        'codice_destinazione' => $item['codice'] ?? null,
                        'codice_cliente' => $item['codiceCliente'] ?? null,
                    ]);
                    continue;
                }

                // Verifica se esiste già e se cambia l'associazione cliente
                $existing = $codiceDest ? DB::table('sites')->where('codice_arca', $codiceDest)->first() : null;
                if ($existing && (int)$existing->client_id !== (int)$client_id) {
                    $this->line("Aggiornamento associazione cantiere: codice={$item['codice']} client_id {$existing->client_id} -> {$client_id}");
                    Log::info('ArcaSync cambio client su site', [
                        'site_id' => $existing->id,
                        'codice_arca' => $item['codice'],
                        'from_client_id' => $existing->client_id,
                        'to_client_id' => $client_id,
                    ]);
                }

                DB::table('sites')->updateOrInsert(
                    [
                        'client_id' => $client_id,
                        'codice_arca' => $codiceDest,
                    ],
                    [
                        'name' => $item['descrizione'],  // Usa 'name' invece di 'nome'
                        'address' => $item['indirizzo'] ?? null,  // Usa 'address' invece di 'indirizzo'
                        'city' => $item['localita'] ?? null,  // Usa 'city' invece di 'comune'
                        'province' => $item['provincia'] ?? null,
                        'client_id' => $client_id,
                        'updated_at' => now(),
                    ]
                );
            }
        } catch (\Exception $e) {
            $this->error('Errore sync destinazioni: ' . $e->getMessage());
        }
    }

    private function syncAgenti($client, $headers)
    {
        $this->info('Sincronizzo agenti...');
        try {
            $res = $client->get('agenti', ['headers' => $headers]);
            $list = json_decode($res->getBody(), true);
            foreach ($list as $item) {
                // Dividi nome completo in nome e cognome
                $nomeCompleto = $item['descrizione'] ?? 'N/D';
                $parti = explode(' ', $nomeCompleto, 2);
                $nome = $parti[0] ?? 'N/D';
                $cognome = $parti[1] ?? 'N/D';
                
                DB::table('drivers')->updateOrInsert(
                    ['codice_arca' => $item['codice']],
                    [
                        'name' => $nome,
                        'surname' => $cognome,
                        'email' => $item['email'] ?? null
                    ]
                );
            }
        } catch (\Exception $e) {
            $this->error('Errore sync agenti: ' . $e->getMessage());
        }
    }

    private function syncDocumenti($client, $headers, $token)
    {
        $this->info('📄 Inizio sincronizzazione documenti...');
        try {
            $documentiSincronizzati = 0;
            $righeSincronizzate = 0;
            
            // Sincronizza ultimi 7 giorni giorno per giorno
            for ($giorno = 0; $giorno < 7; $giorno++) {
                $data = date('Y-m-d', strtotime("-{$giorno} days"));
                $dataFormatted = date('Ymd', strtotime($data));
                
                $this->info("📅 Sincronizzazione documenti del {$data}...");
                
                try {
                    $res = $client->get('documenti/date', [
                        'headers' => ['Authorization' => 'Bearer ' . $token],
                        'query' => [
                            'dataInizio' => $dataFormatted,
                            'dataFine' => $dataFormatted
                        ],
                        'timeout' => 60
                    ]);
                    
                    $list = json_decode($res->getBody(), true);
                    
                    if (!is_array($list)) {
                        $this->warn("⚠️ Risposta non valida per {$data}");
                        continue;
                    }
                    
                    $this->info("✅ {$data}: " . count($list) . " documenti ricevuti");
                    
                    // Processa documenti del giorno
                    foreach ($list as $doc) {
                        // Validazione campi obbligatori
                        if (empty($doc['codiceDoc']) || empty($doc['numeroDoc'])) {
                            continue;
                        }
                        
                        // Trova associazioni
                        $clientRow = DB::table('clients')->where('codice_arca', $doc['codiceCliente'] ?? '')->first();
                        $siteRow = DB::table('sites')->where('codice_arca', $doc['codiceDestinazione'] ?? '')->first();
                        $driverRow = DB::table('drivers')->where('codice_arca', $doc['agente1'] ?? '')->first();
                        
                        // Inserisci/aggiorna documento
                        $documento_id = DB::table('documenti')->updateOrInsert(
                            ['codice_doc' => $doc['codiceDoc'], 'numero_doc' => $doc['numeroDoc']],
                            [
                                'data_doc' => $doc['dataDoc'] ?? null,
                                'client_id' => $clientRow ? $clientRow->id : null,
                                'site_id' => $siteRow ? $siteRow->id : null,
                                'driver_id' => $driverRow ? $driverRow->id : null,
                                'totale_doc' => $doc['totaleDoc'] ?? null,
                                'updated_at' => now()
                            ]
                        );
                        
                        $documentiSincronizzati++;
                        
                        // Gestione righe documento
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
                                        'descrizione' => $riga['descrizione'] ?? null,
                                        'quantita' => $riga['quantita'] ?? null,
                                        'prezzo_unitario' => $riga['prezzo'] ?? null,
                                        'sconto' => $riga['sconto'] ?? null,
                                        'totale_riga' => $riga['totaleRiga'] ?? null,
                                        'updated_at' => now()
                                    ]
                                );
                                
                                $righeSincronizzate++;
                            }
                        }
                    }
                    
                } catch (\Exception $e) {
                    $this->warn("⚠️ Errore sincronizzazione {$data}: " . $e->getMessage());
                    continue;
                }
            }
            
            $this->info("✅ Documenti sincronizzati: {$documentiSincronizzati}");
            $this->info("✅ Righe documento sincronizzate: {$righeSincronizzate}");
            
        } catch (\Exception $e) {
            $this->error('❌ Errore sincronizzazione documenti: ' . $e->getMessage());
            Log::error('Errore sync documenti Arca', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
}
