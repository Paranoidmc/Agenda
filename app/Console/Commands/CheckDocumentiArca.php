<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use GuzzleHttp\Client;

class CheckDocumentiArca extends Command
{
    protected $signature = 'documenti:check-arca {--giorni=1 : Numero di giorni da controllare}';
    protected $description = 'Controlla quanti documenti ci sono nell\'API Arca per oggi';

    public function handle()
    {
        $giorni = $this->option('giorni');
        $oggi = now()->format('Ymd'); // Formato YYYYMMDD per API Arca
        
        $this->info("🔍 Controllo documenti nell'API Arca per oggi ({$oggi})...");
        
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
            'timeout' => 60,
            'connect_timeout' => 30,
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
        
        // 3. Interroga l'API per i documenti di oggi
        $documentiTotali = 0;
        
        for ($giorno = 0; $giorno < $giorni; $giorno++) {
            $data = date('Ymd', strtotime("-{$giorno} days")); // Formato YYYYMMDD
            $dataFormatted = date('Y-m-d', strtotime("-{$giorno} days"));
        
        try {
                $this->info("📅 Controllo documenti per {$dataFormatted} ({$data})...");
                
            $res = $client->get('documenti/date', [
                'headers' => $headers,
                'query' => [
                        'dataInizio' => $data,
                        'dataFine' => $data
                ],
                'timeout' => 60
            ]);
            
            $list = json_decode($res->getBody(), true);
            
            if (!is_array($list)) {
                    $this->warn("⚠️ Risposta non valida per {$dataFormatted}");
                    continue;
            }
            
            $count = count($list);
                $documentiTotali += $count;
                
                $this->info("✅ {$dataFormatted}: {$count} documenti trovati");
                
                // Mostra dettagli dei primi 5 documenti
                if ($count > 0 && $giorno == 0) {
                    $this->info("\n📋 Primi documenti trovati:");
                    foreach (array_slice($list, 0, 5) as $doc) {
                        $this->line("  - {$doc['codiceDoc']}/{$doc['numeroDoc']} - Cliente: " . ($doc['codiceCliente'] ?? 'N/A') . " - Totale: " . ($doc['totaleDoc'] ?? '0'));
                    }
                    if ($count > 5) {
                        $this->line("  ... e altri " . ($count - 5) . " documenti");
                    }
                }
                
            } catch (\Exception $e) {
                $this->error("❌ Errore per {$dataFormatted}: " . $e->getMessage());
                }
            }
        
        $this->info("\n🎯 TOTALE documenti trovati nell'API Arca: {$documentiTotali}");
            
        // Confronta con il database locale
        $documentiDB = DB::table('documenti')
            ->whereDate('data_doc', '>=', now()->subDays($giorni - 1)->format('Y-m-d'))
                ->count();
            
        $this->info("💾 Documenti nel database locale (ultimi {$giorni} giorni): {$documentiDB}");
            
        if ($documentiTotali > $documentiDB) {
            $this->warn("⚠️ Differenza: ci sono " . ($documentiTotali - $documentiDB) . " documenti nell'API che non sono nel database!");
        } elseif ($documentiTotali == $documentiDB) {
            $this->info("✅ Database sincronizzato!");
            } else {
            $this->warn("⚠️ Database locale ha più documenti dell'API (potrebbero essere documenti vecchi)");
            }
            
            return 0;
    }
}
