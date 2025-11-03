<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use GuzzleHttp\Client;

class CheckDocumentiArca extends Command
{
    protected $signature = 'documenti:check-arca-oggi';
    protected $description = 'Controlla quanti documenti ci sono di oggi dall\'API Arca';

    public function handle()
    {
        $this->info("🔍 Controllo documenti di oggi dall'API Arca...");
        
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
        
        // 3. Chiedi documenti di oggi
        $headers = ['Authorization' => 'Bearer ' . $token];
        $oggi = date('Ymd'); // Formato YYYYMMDD
        
        try {
            $this->info("📅 Richiesta documenti di oggi ({$oggi})...");
            $res = $client->get('documenti/date', [
                'headers' => $headers,
                'query' => [
                    'dataInizio' => $oggi,
                    'dataFine' => $oggi
                ],
                'timeout' => 60
            ]);
            
            $list = json_decode($res->getBody(), true);
            
            if (!is_array($list)) {
                $this->error('❌ Risposta API non valida');
                return 1;
            }
            
            $count = count($list);
            $this->info("✅ Trovati {$count} documenti di oggi dall'API Arca");
            
            if ($count > 0) {
                $this->info("\n📋 Primi 10 documenti:");
                foreach (array_slice($list, 0, 10) as $doc) {
                    $this->line("  - {$doc['codiceDoc']}/{$doc['numeroDoc']} - Data: {$doc['dataDoc']} - Cliente: {$doc['codiceCliente']}");
                }
            }
            
            // Confronta con database locale
            $dbCount = DB::table('documenti')
                ->whereDate('data_doc', date('Y-m-d'))
                ->count();
            
            $this->info("\n📊 Confronto:");
            $this->info("  - API Arca: {$count} documenti");
            $this->info("  - Database locale: {$dbCount} documenti");
            
            if ($count != $dbCount) {
                $this->warn("⚠️ Discrepanza rilevata! Mancano " . ($count - $dbCount) . " documenti nel database locale.");
            } else {
                $this->info("✅ Database locale sincronizzato!");
            }
            
            return 0;
            
        } catch (\Exception $e) {
            $this->error('❌ Errore nella richiesta API: ' . $e->getMessage());
            return 1;
        }
    }
}

