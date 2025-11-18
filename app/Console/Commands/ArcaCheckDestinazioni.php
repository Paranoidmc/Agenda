<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use GuzzleHttp\Client;

class ArcaCheckDestinazioni extends Command
{
    protected $signature = 'arca:check-destinazioni {--codice= : Verifica una destinazione specifica per codice Arca}';
    protected $description = 'Verifica quali destinazioni (cantieri) esistono in Arca ma non sono sincronizzate nel database locale';

    public function handle(): int
    {
        $this->info('🔍 Verifica destinazioni Arca vs Database locale...');

        // 1) Recupero credenziali ARCA
        $row = DB::table('settings')->where('key', 'arca_credentials')->first();
        if (!$row) {
            $this->error('❌ Credenziali Arca non trovate in settings.arca_credentials');
            return 1;
        }
        $creds = json_decode(Crypt::decryptString($row->value), true);
        $username = $creds['username'] ?? '';
        $password = $creds['password'] ?? '';
        if (!$username || !$password) {
            $this->error('❌ Username o password Arca mancanti.');
            return 1;
        }

        // 2) Login ARCA
        $client = new Client([
            'base_uri' => 'http://ws.grsis.it:8082/api-arca/cgf/',
            'timeout' => 60,
            'connect_timeout' => 15,
        ]);

        try {
            $res = $client->post('auth/login', [
                'json' => ['username' => $username, 'password' => $password]
            ]);
            $body = json_decode($res->getBody(), true);
            $token = $body['token'] ?? null;
            if (!$token) {
                throw new \RuntimeException('Token JWT non ricevuto da ARCA');
            }
        } catch (\Throwable $e) {
            $this->error('❌ Login ARCA fallito: ' . $e->getMessage());
            Log::error('ArcaCheckDestinazioni login error', ['error' => $e->getMessage()]);
            return 1;
        }

        $headers = ['Authorization' => 'Bearer ' . $token];

        // 3) Scarica destinazioni da Arca
        $this->info('📥 Scarico destinazioni da Arca...');
        try {
            $res = $client->get('destinazioni', ['headers' => $headers]);
            $arcaDestinazioni = json_decode($res->getBody(), true);
            if (!is_array($arcaDestinazioni)) {
                throw new \RuntimeException('Risposta ARCA destinazioni non valida');
            }
            $this->info("✅ Ricevute " . count($arcaDestinazioni) . " destinazioni da Arca");
        } catch (\Throwable $e) {
            $this->error('❌ Errore recupero destinazioni ARCA: ' . $e->getMessage());
            Log::error('ArcaCheckDestinazioni destinazioni error', ['error' => $e->getMessage()]);
            return 1;
        }

        // 4) Recupera destinazioni locali
        $localDestinazioni = DB::table('sites')
            ->whereNotNull('codice_arca')
            ->where('codice_arca', '<>', '')
            ->pluck('codice_arca', 'id')
            ->toArray();

        $this->info("📊 Destinazioni locali con codice_arca: " . count($localDestinazioni));

        // 5) Verifica specifica per codice se richiesto
        $codiceSpecifico = $this->option('codice');
        if ($codiceSpecifico) {
            $this->line("\n🔎 Verifica destinazione codice: {$codiceSpecifico}");
            $foundInArca = false;
            $foundInLocal = false;
            
            foreach ($arcaDestinazioni as $item) {
                $codice = isset($item['codice']) ? trim((string)$item['codice']) : null;
                if ($codice == $codiceSpecifico) {
                    $foundInArca = true;
                    $nome = $item['descrizione'] ?? 'N/D';
                    $codiceCliente = $item['codiceCliente'] ?? null;
                    $indirizzo = $item['indirizzo'] ?? null;
                    $localita = $item['localita'] ?? null;
                    $this->info("✅ Trovata in Arca: {$codice} - {$nome}");
                    $this->line("   Codice Cliente: {$codiceCliente}");
                    $this->line("   Indirizzo: {$indirizzo}");
                    $this->line("   Località: {$localita}");
                    $this->line("   Dati completi: " . json_encode($item, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                    break;
                }
            }
            
            if (in_array($codiceSpecifico, $localDestinazioni)) {
                $foundInLocal = true;
                $localSite = DB::table('sites')->where('codice_arca', $codiceSpecifico)->first();
                $this->info("✅ Trovata in DB locale: ID={$localSite->id}, Nome={$localSite->name}");
                $this->line("   Client ID: {$localSite->client_id}");
                
                if ($localSite->client_id) {
                    $client = DB::table('clients')->where('id', $localSite->client_id)->first();
                    if ($client) {
                        $this->line("   Cliente: {$client->name} (codice: {$client->codice_arca})");
                    }
                }
                
                // Conta documenti associati
                $docCount = DB::table('documenti')->where('site_id', $localSite->id)->count();
                $this->line("   Documenti associati: {$docCount}");
            } else {
                $this->warn("⚠️ NON trovata in DB locale!");
            }
            
            if (!$foundInArca) {
                $this->error("❌ Destinazione {$codiceSpecifico} NON trovata in Arca!");
            }
            
            return 0;
        }

        // 6) Confronto generale
        $this->line("\n📋 Analisi completa:");
        
        $codiciArca = [];
        foreach ($arcaDestinazioni as $item) {
            $codice = isset($item['codice']) ? trim((string)$item['codice']) : null;
            if ($codice) {
                $codiciArca[] = $codice;
            }
        }
        
        $codiciLocali = array_map('strval', array_values($localDestinazioni));
        
        $mancantiInLocale = array_diff($codiciArca, $codiciLocali);
        $presentiSoloInLocale = array_diff($codiciLocali, $codiciArca);
        
        $this->info("\n✅ Destinazioni sincronizzate: " . count(array_intersect($codiciArca, $codiciLocali)));
        $this->warn("\n⚠️ Destinazioni presenti in Arca ma NON in DB locale: " . count($mancantiInLocale));
        
        if (count($mancantiInLocale) > 0) {
            $this->line("\n📝 Lista destinazioni mancanti (prime 50):");
            $tableData = [];
            $count = 0;
            foreach ($mancantiInLocale as $codice) {
                if ($count >= 50) break;
                $item = array_filter($arcaDestinazioni, function($d) use ($codice) {
                    $cCodice = isset($d['codice']) ? trim((string)$d['codice']) : null;
                    return $cCodice === $codice;
                });
                $item = reset($item);
                $nome = $item ? ($item['descrizione'] ?? 'N/D') : 'N/D';
                $codiceCliente = $item['codiceCliente'] ?? 'N/D';
                $tableData[] = [$codice, $nome, $codiceCliente];
                $count++;
            }
            $this->table(
                ['Codice Arca', 'Nome in Arca', 'Codice Cliente'],
                $tableData
            );
            
            if (count($mancantiInLocale) > 50) {
                $this->warn("... e altre " . (count($mancantiInLocale) - 50) . " destinazioni mancanti");
            }
        }
        
        if (count($presentiSoloInLocale) > 0) {
            $this->warn("\n⚠️ Destinazioni presenti solo in DB locale (non in Arca): " . count($presentiSoloInLocale));
            $this->line("   Codici: " . implode(', ', array_slice($presentiSoloInLocale, 0, 20)));
            if (count($presentiSoloInLocale) > 20) {
                $this->line("   ... e altre " . (count($presentiSoloInLocale) - 20));
            }
        }
        
        // 7) Verifica specifica per codice 149
        $this->line("\n🔎 Verifica specifica: Cave Di Grotta Oscura (codice 149)");
        $codice149 = null;
        foreach ($arcaDestinazioni as $item) {
            $codice = isset($item['codice']) ? trim((string)$item['codice']) : null;
            if ($codice === '149') {
                $codice149 = $item;
                break;
            }
        }
        
        if ($codice149) {
            $this->info("✅ Destinazione 149 presente in Arca");
            $nome = $codice149['descrizione'] ?? 'N/D';
            $codiceCliente = $codice149['codiceCliente'] ?? null;
            $indirizzo = $codice149['indirizzo'] ?? null;
            $localita = $codice149['localita'] ?? null;
            $this->line("   Nome in Arca: {$nome}");
            $this->line("   Codice Cliente: {$codiceCliente}");
            $this->line("   Indirizzo: {$indirizzo}");
            $this->line("   Località: {$localita}");
        } else {
            $this->error("❌ Destinazione 149 NON trovata in Arca!");
        }
        
        if (in_array('149', $codiciLocali)) {
            $this->info("✅ Destinazione 149 presente in DB locale");
            $local149 = DB::table('sites')->where('codice_arca', '149')->first();
            if ($local149) {
                $this->line("   ID locale: {$local149->id}");
                $this->line("   Nome locale: {$local149->name}");
                $this->line("   Client ID: {$local149->client_id}");
                if ($local149->client_id) {
                    $client = DB::table('clients')->where('id', $local149->client_id)->first();
                    if ($client) {
                        $this->line("   Cliente associato: {$client->name} (codice: {$client->codice_arca})");
                    }
                }
                $docCount = DB::table('documenti')->where('site_id', $local149->id)->count();
                $this->line("   Documenti: {$docCount}");
            }
        } else {
            $this->warn("⚠️ Destinazione 149 NON presente in DB locale!");
            $this->line("   Esegui: php artisan arca:sync --only=destinazioni");
        }
        
        $this->info("\n✅ Verifica completata!");
        return 0;
    }
}

