<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\ActivityType;
use App\Models\Client;
use App\Models\Driver;
use App\Models\Site;
use App\Models\Vehicle;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class ActivitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Assicuriamoci che ci siano i dati necessari nel database
        $drivers = Driver::where('status', 'active')->get();
        $vehicles = Vehicle::where('status', 'operational')->get();
        $clients = Client::all();
        $sites = Site::where('status', 'active')->get();
        $activityTypes = ActivityType::all();
        
        if ($drivers->isEmpty() || $vehicles->isEmpty() || $clients->isEmpty() || $sites->isEmpty() || $activityTypes->isEmpty()) {
            $this->command->info('Dati mancanti. Esegui prima gli altri seeder.');
            return;
        }
        
        $timeSlots = ['morning', 'afternoon', 'full_day'];
        $statuses = ['planned', 'in_progress', 'completed', 'cancelled'];
        
        // Creiamo attività per le ultime 2 settimane e le prossime 2 settimane
        $startDate = Carbon::now()->subDays(14);
        $endDate = Carbon::now()->addDays(14);
        
        $currentDate = $startDate->copy();
        
        while ($currentDate <= $endDate) {
            // Saltiamo le domeniche
            if ($currentDate->dayOfWeek !== Carbon::SUNDAY) {
                // Creiamo da 5 a 15 attività per ogni giorno
                $activitiesCount = rand(5, 15);
                
                for ($i = 0; $i < $activitiesCount; $i++) {
                    $client = $clients->random();
                    $clientSites = $sites->where('client_id', $client->id);
                    
                    // Se il cliente non ha cantieri, ne scegliamo uno casuale
                    $site = $clientSites->isEmpty() ? $sites->random() : $clientSites->random();
                    
                    $timeSlot = $timeSlots[array_rand($timeSlots)];
                    
                    // Determiniamo lo stato in base alla data
                    $status = 'planned';
                    if ($currentDate < Carbon::now()) {
                        $status = $statuses[array_rand([1, 2, 3])]; // in_progress, completed o cancelled
                    } elseif ($currentDate->isToday()) {
                        $status = $statuses[array_rand([0, 1])]; // planned o in_progress
                    }
                    
                    // Creiamo l'attività
                    Activity::create([
                        'date' => $currentDate->format('Y-m-d'),
                        'time_slot' => $timeSlot,
                        'driver_id' => $drivers->random()->id,
                        'vehicle_id' => $vehicles->random()->id,
                        'client_id' => $client->id,
                        'site_id' => $site->id,
                        'activity_type_id' => $activityTypes->random()->id,
                        'status' => $status,
                        'start_location' => 'Sede aziendale',
                        'end_location' => $site->address . ', ' . $site->city,
                        'notes' => 'Attività generata automaticamente',
                        'completed_at' => $status === 'completed' ? $currentDate->copy()->addHours(rand(8, 17)) : null,
                    ]);
                }
            }
            
            $currentDate->addDay();
        }
    }
}