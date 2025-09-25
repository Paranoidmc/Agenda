<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use GuzzleHttp\Client;

class ArcaCheckLinks extends Command
{
    protected $signature = 'arca:check-links {--fix : Corregge automaticamente i mismatch tra cantiere e cliente}';
    protected $description = 'Verifica coerenza tra cantieri (sites) e clienti (clients) usando i codici ARCA e opzionalmente corregge i mismatch.';

    public function handle(): int
    {
        $this->info('Inizio verifica collegamenti ARCA (cantieri ⇄ clienti)');

        // 1) Recupero credenziali ARCA
        $row = DB::table('settings')->where('key', 'arca_credentials')->first();
        if (!$row) {
            $this->error('Credenziali Arca non trovate in settings.arca_credentials');
            return 1;
        }
        $creds = json_decode(Crypt::decryptString($row->value), true);
        $username = $creds['username'] ?? '';
        $password = $creds['password'] ?? '';
        if (!$username || !$password) {
            $this->error('Username o password Arca mancanti.');
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
                'json' => [ 'username' => $username, 'password' => $password ]
            ]);
            $body = json_decode($res->getBody(), true);
            $token = $body['token'] ?? null;
            if (!$token) {
                throw new \RuntimeException('Token JWT non ricevuto da ARCA');
            }
        } catch (\Throwable $e) {
            $this->error('Login ARCA fallito: ' . $e->getMessage());
            Log::error('ArcaCheckLinks login error', ['error' => $e->getMessage()]);
            return 1;
        }

        $headers = [ 'Authorization' => 'Bearer ' . $token ];

        // 3) Report duplicati in DB su codice_arca
        $this->line('Controllo duplicati codice_arca in clients...');
        $dupClients = DB::table('clients')
            ->select('codice_arca', DB::raw('COUNT(*) as n'))
            ->whereNotNull('codice_arca')
            ->where('codice_arca', '<>', '')
            ->groupBy('codice_arca')
            ->having('n', '>', 1)
            ->get();
        if ($dupClients->count() > 0) {
            $this->warn('Trovati duplicati in clients.codice_arca:');
            foreach ($dupClients as $dc) {
                $this->warn(" - codice_arca={$dc->codice_arca} occorrenze={$dc->n}");
            }
        } else {
            $this->info('Nessun duplicato in clients.codice_arca.');
        }

        $this->line('Controllo duplicati codice_arca in sites...');
        $dupSites = DB::table('sites')
            ->select('codice_arca', DB::raw('COUNT(*) as n'))
            ->whereNotNull('codice_arca')
            ->where('codice_arca', '<>', '')
            ->groupBy('codice_arca')
            ->having('n', '>', 1)
            ->get();
        if ($dupSites->count() > 0) {
            $this->warn('Trovati duplicati in sites.codice_arca:');
            foreach ($dupSites as $ds) {
                $this->warn(" - codice_arca={$ds->codice_arca} occorrenze={$ds->n}");
            }
        } else {
            $this->info('Nessun duplicato in sites.codice_arca.');
        }

        // 4) Scarico destinazioni da ARCA e confronto mapping
        $this->line('Scarico destinazioni da ARCA...');
        try {
            $res = $client->get('destinazioni', ['headers' => $headers]);
            $destList = json_decode($res->getBody(), true);
            if (!is_array($destList)) {
                throw new \RuntimeException('Risposta ARCA destinazioni non valida');
            }
        } catch (\Throwable $e) {
            $this->error('Errore recupero destinazioni ARCA: ' . $e->getMessage());
            Log::error('ArcaCheckLinks destinazioni error', ['error' => $e->getMessage()]);
            return 1;
        }

        $fix = (bool) $this->option('fix');
        $mismatch = 0; $fixed = 0; $missingSite = 0; $missingClient = 0; $total = 0;

        foreach ($destList as $item) {
            $total++;
            $codiceDest = $item['codice'] ?? null;
            $codiceCliente = $item['codiceCliente'] ?? null;
            if (!$codiceDest) { continue; }

            $site = DB::table('sites')->where('codice_arca', $codiceDest)->first();
            if (!$site) { $missingSite++; continue; }

            $client = $codiceCliente ? DB::table('clients')->where('codice_arca', $codiceCliente)->first() : null;
            if (!$client) { $missingClient++; continue; }

            $expectedClientId = $client->id;
            if ((int)$site->client_id !== (int)$expectedClientId) {
                $mismatch++;
                $this->warn("Mismatch: site[codice_arca={$codiceDest}, id={$site->id}] client_id={$site->client_id} != expected={$expectedClientId} (codiceCliente={$codiceCliente})");
                Log::warning('ArcaCheckLinks mismatch', [
                    'site_id' => $site->id,
                    'site_codice_arca' => $codiceDest,
                    'current_client_id' => $site->client_id,
                    'expected_client_id' => $expectedClientId,
                    'codice_cliente_arca' => $codiceCliente,
                ]);
                if ($fix) {
                    DB::table('sites')->where('id', $site->id)->update([
                        'client_id' => $expectedClientId,
                        'updated_at' => now(),
                    ]);
                    $fixed++;
                }
            }
        }

        $this->info("Totale destinazioni analizzate: {$total}");
        $this->info("Cantieri mancanti in DB: {$missingSite}");
        $this->info("Clienti mancanti in DB: {$missingClient}");
        $this->info("Mismatch client_id: {$mismatch}");
        if ($fix) {
            $this->info("Mismatch corretti: {$fixed}");
        } else {
            $this->line('Esegui con --fix per correggere automaticamente i mismatch rilevati.');
        }

        $this->info('Verifica collegamenti ARCA completata.');
        return 0;
    }
}
