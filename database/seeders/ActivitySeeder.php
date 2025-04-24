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
        // Pulisci la tabella attività per evitare conflitti residui
        \App\Models\Activity::truncate();
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
                // Mappa per tracciare slot già occupati per ciascun driver/vehicle
                $driverSlots = [];
                $vehicleSlots = [];
                foreach ($timeSlots as $timeSlot) {
                    $maxActivities = min($drivers->count(), $vehicles->count(), $clients->count(), $sites->count(), $activityTypes->count());
                    $shuffledDrivers = $drivers->shuffle()->values();
                    $shuffledVehicles = $vehicles->shuffle()->values();
                    $shuffledClients = $clients->shuffle()->values();
                    $shuffledSites = $sites->shuffle()->values();
                    $shuffledActivityTypes = $activityTypes->shuffle()->values();
                    for ($i = 0; $i < $maxActivities; $i++) {
                        $driver = $shuffledDrivers[$i];
                        $vehicle = $shuffledVehicles[$i];
                        $client = $shuffledClients[$i];
                        $site = $shuffledSites[$i];
                        $activityType = $shuffledActivityTypes[$i];
                        // Determiniamo lo stato in base alla data
                        $status = 'planned';
                        if ($currentDate < Carbon::now()) {
                            $status = $statuses[array_rand([1, 2, 3])];
                        } elseif ($currentDate->isToday()) {
                            $status = $statuses[array_rand([0, 1])];
                        }

                        // Funzione di supporto per conflitti slot
                        $conflictsWith = function($existingSlot, $newSlot) {
                            if ($existingSlot === 'full_day' || $newSlot === 'full_day') {
                                return true;
                            }
                            if ($existingSlot === $newSlot) {
                                return true;
                            }
                            // morning/afternoon non confliggono tra loro
                            return false;
                        };
                        $driverId = $driver->id;
                        $vehicleId = $vehicle->id;
                        $skip = false;
                        // Controlla conflitti slot per driver
                        if (isset($driverSlots[$driverId])) {
                            foreach ($driverSlots[$driverId] as $usedSlot) {
                                if ($conflictsWith($usedSlot, $timeSlot)) {
                                    $skip = true;
                                    break;
                                }
                            }
                        }
                        // Controlla conflitti slot per vehicle
                        if (!$skip && isset($vehicleSlots[$vehicleId])) {
                            foreach ($vehicleSlots[$vehicleId] as $usedSlot) {
                                if ($conflictsWith($usedSlot, $timeSlot)) {
                                    $skip = true;
                                    break;
                                }
                            }
                        }
                        if ($skip) {
                            info('SKIP per conflitto slot (driver o vehicle)', [
                                'driver_id' => $driverId,
                                'vehicle_id' => $vehicleId,
                                'data' => $currentDate->format('Y-m-d'),
                                'time_slot' => $timeSlot
                            ]);
                            continue;
                        }
                        // Log per debug
                        info('Creazione attività', [
                            'driver_id' => $driverId,
                            'vehicle_id' => $vehicleId,
                            'data' => $currentDate->format('Y-m-d'),
                            'time_slot' => $timeSlot
                        ]);
                        Activity::create([
                            'date' => $currentDate->format('Y-m-d'),
                            'time_slot' => $timeSlot,
                            'driver_id' => $driverId,
                            'vehicle_id' => $vehicleId,
                            'client_id' => $client->id,
                            'site_id' => $site->id,
                            'activity_type_id' => $activityType->id,
                            'status' => $status,
                            'start_location' => 'Sede aziendale',
                            'end_location' => $site->address . ', ' . $site->city,
                            'notes' => 'Attività generata automaticamente',
                            'completed_at' => $status === 'completed' ? $currentDate->copy()->addHours(rand(8, 17)) : null,
                        ]);
                        // Aggiorna mappa slot occupati
                        $driverSlots[$driverId][] = $timeSlot;
                        $vehicleSlots[$vehicleId][] = $timeSlot;
                    }
                }
            }
            $currentDate->addDay();
        }
    }
}