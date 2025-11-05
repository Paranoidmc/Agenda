<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixDriverNameSurname extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'drivers:fix-name-surname';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Corregge l\'inversione di nome e cognome per gli autisti già sincronizzati';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔧 Correzione inversione nome/cognome per autisti...');
        
        // Conta quanti autisti hanno nome e cognome (non vuoti)
        $total = DB::table('drivers')
            ->whereNotNull('name')
            ->whereNotNull('surname')
            ->where('name', '!=', '')
            ->where('surname', '!=', '')
            ->where('name', '!=', 'N/D')
            ->where('surname', '!=', 'N/D')
            ->count();
        
        $this->info("Trovati {$total} autisti da correggere.");
        
        if ($total === 0) {
            $this->warn('Nessun autista da correggere.');
            return 0;
        }
        
        if (!$this->confirm('Vuoi procedere con la correzione? (nome e cognome verranno scambiati)')) {
            $this->info('Operazione annullata.');
            return 0;
        }
        
        $bar = $this->output->createProgressBar($total);
        $bar->start();
        
        $updated = 0;
        
        // Per ogni autista, scambia name e surname
        DB::table('drivers')
            ->whereNotNull('name')
            ->whereNotNull('surname')
            ->where('name', '!=', '')
            ->where('surname', '!=', '')
            ->where('name', '!=', 'N/D')
            ->where('surname', '!=', 'N/D')
            ->orderBy('id')
            ->chunk(100, function ($drivers) use (&$updated, $bar) {
                foreach ($drivers as $driver) {
                    // Scambia name e surname usando DB::raw per evitare problemi con valori identici
                    DB::table('drivers')
                        ->where('id', $driver->id)
                        ->update([
                            'name' => DB::raw('surname'),
                            'surname' => DB::raw('name'),
                            'updated_at' => now()
                        ]);
                    
                    $updated++;
                    $bar->advance();
                }
            });
        
        $bar->finish();
        $this->newLine();
        $this->info("✅ Corretti {$updated} autisti!");
        
        return 0;
    }
}

