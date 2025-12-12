<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use GuzzleHttp\Client;

class ArcaCheckClienti extends Command
{
    protected $signature = 'arca:check-clienti {--codice= : Verifica un cliente specifico per codice Arca}';
    protected $description = 'Verifica quali clienti esistono in Arca ma non sono sincronizzati nel database locale';

    public function handle(): int
    {
        $this->info('🔍 Verifica clienti Arca vs Database locale...');

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
            Log::error('ArcaCheckClienti login error', ['error' => $e->getMessage()]);
            return 1;
        }

        $headers = ['Authorization' => 'Bearer ' . $token];

        // 3) Scarica clienti da Arca
        $this->info('📥 Scarico clienti da Arca...');
        try {
            $res = $client->get('clienti', ['headers' => $headers]);
            $arcaClienti = json_decode($res->getBody(), true);
            if (!is_array($arcaClienti)) {
                throw new \RuntimeException('Risposta ARCA clienti non valida');
            }
            $this->info("✅ Ricevuti " . count($arcaClienti) . " clienti da Arca");
        } catch (\Throwable $e) {
            $this->error('❌ Errore recupero clienti ARCA: ' . $e->getMessage());
            Log::error('ArcaCheckClienti clienti error', ['error' => $e->getMessage()]);
            return 1;
        }

        // 4) Recupera clienti locali
        $localClienti = DB::table('clients')
            ->whereNotNull('codice_arca')
            ->where('codice_arca', '<>', '')
            ->pluck('codice_arca', 'id')
            ->toArray();

        $this->info("📊 Clienti locali con codice_arca: " . count($localClienti));

        // 5) Verifica specifica per codice se richiesto
        $codiceSpecifico = $this->option('codice');
        if ($codiceSpecifico) {
            $this->line("\n🔎 Verifica cliente codice: {$codiceSpecifico}");
            $foundInArca = false;
            $foundInLocal = false;
            
            foreach ($arcaClienti as $item) {
                $codice = $item['codice'] ?? $item['id'] ?? null;
                if ($codice == $codiceSpecifico) {
                    $foundInArca = true;
                    $nome = $item['descrizione'] ?? $item['ragioneSociale'] ?? $item['denominazione'] ?? $item['nome'] ?? $item['name'] ?? 'N/D';
                    $this->info("✅ Trovato in Arca: {$codice} - {$nome}");
                    $this->line("   Dati completi: " . json_encode($item, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                    break;
                }
            }
            
            if (in_array($codiceSpecifico, $localClienti)) {
                $foundInLocal = true;
                $localClient = DB::table('clients')->where('codice_arca', $codiceSpecifico)->first();
                $this->info("✅ Trovato in DB locale: ID={$localClient->id}, Nome={$localClient->name}");
                
                // Conta documenti associati
                $docCount = DB::table('documenti')->where('client_id', $localClient->id)->count();
                $this->line("   Documenti associati: {$docCount}");
                
                // Conta destinazioni associate
                $siteCount = DB::table('sites')->where('client_id', $localClient->id)->count();
                $this->line("   Destinazioni associate: {$siteCount}");
            } else {
                $this->warn("⚠️ NON trovato in DB locale!");
            }
            
            if (!$foundInArca) {
                $this->error("❌ Cliente {$codiceSpecifico} NON trovato in Arca!");
            }
            
            return 0;
        }

        // 6) Confronto generale
        $this->line("\n📋 Analisi completa:");
        
        $codiciArca = [];
        foreach ($arcaClienti as $item) {
            $codice = $item['codice'] ?? $item['id'] ?? null;
            if ($codice) {
                $codiciArca[] = (string)$codice;
            }
        }
        
        $codiciLocali = array_map('strval', array_values($localClienti));
        
        $mancantiInLocale = array_diff($codiciArca, $codiciLocali);
        $presentiSoloInLocale = array_diff($codiciLocali, $codiciArca);
        
        $this->info("\n✅ Clienti sincronizzati: " . count(array_intersect($codiciArca, $codiciLocali)));
        $this->warn("\n⚠️ Clienti presenti in Arca ma NON in DB locale: " . count($mancantiInLocale));
        
        if (count($mancantiInLocale) > 0) {
            $this->line("\n📝 Lista clienti mancanti:");
            $this->table(
                ['Codice Arca', 'Nome in Arca'],
                array_map(function($codice) use ($arcaClienti) {
                    $item = array_filter($arcaClienti, function($c) use ($codice) {
                        $cCodice = $c['codice'] ?? $c['id'] ?? null;
                        return (string)$cCodice === (string)$codice;
                    });
                    $item = reset($item);
                    $nome = $item ? ($item['descrizione'] ?? $item['ragioneSociale'] ?? $item['denominazione'] ?? $item['nome'] ?? $item['name'] ?? 'N/D') : 'N/D';
                    return [$codice, $nome];
                }, array_slice($mancantiInLocale, 0, 50)) // Limita a 50 per non intasare l'output
            );
            
            if (count($mancantiInLocale) > 50) {
                $this->warn("... e altri " . (count($mancantiInLocale) - 50) . " clienti mancanti");
            }
        }
        
        if (count($presentiSoloInLocale) > 0) {
            $this->warn("\n⚠️ Clienti presenti solo in DB locale (non in Arca): " . count($presentiSoloInLocale));
            $this->line("   Codici: " . implode(', ', array_slice($presentiSoloInLocale, 0, 20)));
            if (count($presentiSoloInLocale) > 20) {
                $this->line("   ... e altri " . (count($presentiSoloInLocale) - 20));
            }
        }
        
        // 7) Verifica specifica per codice 149
        $this->line("\n🔎 Verifica specifica: Cave Di Grotta Oscura (codice 149)");
        if (in_array('149', $codiciArca)) {
            $this->info("✅ Cliente 149 presente in Arca");
            $item149 = array_filter($arcaClienti, function($c) {
                $codice = $c['codice'] ?? $c['id'] ?? null;
                return (string)$codice === '149';
            });
            $item149 = reset($item149);
            if ($item149) {
                $nome = $item149['descrizione'] ?? $item149['ragioneSociale'] ?? $item149['denominazione'] ?? $item149['nome'] ?? $item149['name'] ?? 'N/D';
                $this->line("   Nome in Arca: {$nome}");
            }
        } else {
            $this->error("❌ Cliente 149 NON trovato in Arca!");
        }
        
        if (in_array('149', $codiciLocali)) {
            $this->info("✅ Cliente 149 presente in DB locale");
            $local149 = DB::table('clients')->where('codice_arca', '149')->first();
            if ($local149) {
                $this->line("   ID locale: {$local149->id}");
                $this->line("   Nome locale: {$local149->name}");
                $docCount = DB::table('documenti')->where('client_id', $local149->id)->count();
                $this->line("   Documenti: {$docCount}");
                $siteCount = DB::table('sites')->where('client_id', $local149->id)->count();
                $this->line("   Destinazioni: {$siteCount}");
            }
        } else {
            $this->warn("⚠️ Cliente 149 NON presente in DB locale!");
            $this->line("   Esegui: php artisan arca:sync --only=clienti");
        }
        
        $this->info("\n✅ Verifica completata!");
        return 0;
    }
}



