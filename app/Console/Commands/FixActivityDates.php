<?php

namespace App\Console\Commands;

use App\Models\Activity;
use Illuminate\Console\Command;

class FixActivityDates extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:activity-dates';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Corregge le date delle attività per assicurarsi che abbiano orari validi';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Inizio correzione date attività...');
        
        $activities = Activity::all();
        $count = 0;
        
        foreach ($activities as $activity) {
            $modified = false;
            
            // Verifica se abbiamo date di inizio e fine valide
            if (!$activity->data_inizio || !$activity->data_fine) {
                $dateObj = $activity->date;
                $dateStr = $dateObj->format('Y-m-d');
                
                // Se abbiamo orari di inizio e fine, li usiamo per creare date complete
                if ($activity->start_time) {
                    $startTime = $activity->start_time;
                    if ($startTime instanceof \DateTime) {
                        $startTimeStr = $startTime->format('H:i:s');
                    } else {
                        $startTimeStr = $startTime;
                    }
                    $activity->data_inizio = $dateStr . ' ' . $startTimeStr;
                } else {
                    // Se non c'è un orario di inizio, impostiamo un orario predefinito (9:00)
                    $activity->data_inizio = $dateStr . ' 09:00:00';
                }
                
                // Per la data di fine, usiamo la stessa data ma con l'orario di fine se disponibile
                if ($activity->end_time) {
                    $endTime = $activity->end_time;
                    if ($endTime instanceof \DateTime) {
                        $endTimeStr = $endTime->format('H:i:s');
                    } else {
                        $endTimeStr = $endTime;
                    }
                    $activity->data_fine = $dateStr . ' ' . $endTimeStr;
                } else {
                    // Se non c'è un orario di fine, impostiamo la fine a un'ora dopo l'inizio
                    $activity->data_fine = $dateStr . ' 10:00:00';
                }
                
                $modified = true;
            }
            
            // Forza l'aggiornamento di tutte le date con orari casuali
            $dateStr = $activity->data_inizio;
            if (!$dateStr) {
                $dateStr = $activity->date->format('Y-m-d');
            } else {
                // Estrai solo la parte della data (Y-m-d)
                $dateObj = new \DateTime($dateStr);
                $dateStr = $dateObj->format('Y-m-d');
            }
            
            // Assegna un orario casuale tra le 8:00 e le 16:00
            $randomHour = rand(8, 16);
            $randomMinute = rand(0, 59);
            
            // Crea una nuova data con orario
            $startTimeStr = sprintf('%02d:%02d:00', $randomHour, $randomMinute);
            $activity->data_inizio = $dateStr . ' ' . $startTimeStr;
            $this->info("Orario inizio impostato a: " . $activity->data_inizio);
            
            // Aggiungi da 1 a 3 ore di durata
            $randomDuration = rand(1, 3);
            $endDate = new \DateTime($activity->data_inizio);
            $endDate->modify("+{$randomDuration} hour");
            $activity->data_fine = $endDate->format('Y-m-d H:i:s');
            $this->info("Orario fine impostato a: " . $activity->data_fine);
            
            $modified = true;
            
            if ($modified) {
                try {
                    // Disabilitiamo temporaneamente i controlli di validazione
                    Activity::withoutEvents(function () use ($activity) {
                        $activity->save();
                    });
                    $count++;
                    $this->info("Attività {$activity->id} aggiornata: {$activity->data_inizio} - {$activity->data_fine}");
                } catch (\Exception $e) {
                    $this->error("Errore nell'aggiornamento dell'attività {$activity->id}: " . $e->getMessage());
                }
            }
        }
        
        $this->info("Completato! {$count} attività aggiornate.");
    }
}
