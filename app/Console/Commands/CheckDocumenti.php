<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CheckDocumenti extends Command
{
    protected $signature = 'documenti:check-oggi';
    protected $description = 'Controlla quanti documenti ci sono di oggi';

    public function handle()
    {
        $oggi = now()->format('Y-m-d');
        
        $documentiOggi = DB::table('documenti')
            ->whereDate('data_doc', $oggi)
            ->count();
            
        $documentiConsegnaOggi = DB::table('documenti')
            ->whereDate('data_consegna', $oggi)
            ->count();
            
        $this->info("📄 Documenti con data_doc di oggi ({$oggi}): {$documentiOggi}");
        $this->info("📦 Documenti con data_consegna di oggi ({$oggi}): {$documentiConsegnaOggi}");
        
        // Mostra ultimi 5 documenti
        $ultimi = DB::table('documenti')
            ->orderBy('data_doc', 'desc')
            ->limit(5)
            ->get(['id', 'codice_doc', 'numero_doc', 'data_doc', 'data_consegna', 'updated_at']);
            
        $this->info("\n📋 Ultimi 5 documenti:");
        foreach ($ultimi as $doc) {
            $this->line("  - {$doc->codice_doc}/{$doc->numero_doc} - Data: {$doc->data_doc} - Aggiornato: {$doc->updated_at}");
        }
        
        return 0;
    }
}

