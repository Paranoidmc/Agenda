<?php

namespace Database\Seeders;

use App\Models\Vehicle;
use App\Models\VehicleDeadline;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class VehicleDeadlineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Assicuriamoci che ci siano veicoli nel database
        $vehicles = Vehicle::all();
        
        if ($vehicles->isEmpty()) {
            $this->command->info('Nessun veicolo trovato. Esegui prima il VehicleSeeder.');
            return;
        }
        
        $deadlineTypes = ['insurance', 'tax', 'revision', 'maintenance', 'other'];
        $statuses = ['active', 'expired', 'completed'];
        
        // Per ogni veicolo, creiamo alcune scadenze
        foreach ($vehicles as $vehicle) {
            // Assicurazione
            VehicleDeadline::create([
                'vehicle_id' => $vehicle->id,
                'type' => 'insurance',
                'expiry_date' => Carbon::now()->addMonths(rand(1, 12)),
                'reminder_date' => Carbon::now()->addMonths(rand(1, 12))->subDays(15),
                'notes' => 'Scadenza assicurazione annuale',
                'status' => 'active',
            ]);
            
            // Bollo
            VehicleDeadline::create([
                'vehicle_id' => $vehicle->id,
                'type' => 'tax',
                'expiry_date' => Carbon::now()->addMonths(rand(1, 12)),
                'reminder_date' => Carbon::now()->addMonths(rand(1, 12))->subDays(15),
                'notes' => 'Scadenza bollo annuale',
                'status' => 'active',
            ]);
            
            // Revisione
            VehicleDeadline::create([
                'vehicle_id' => $vehicle->id,
                'type' => 'revision',
                'expiry_date' => Carbon::now()->addMonths(rand(1, 24)),
                'reminder_date' => Carbon::now()->addMonths(rand(1, 24))->subDays(30),
                'notes' => 'Revisione periodica',
                'status' => 'active',
            ]);
            
            // Manutenzione
            VehicleDeadline::create([
                'vehicle_id' => $vehicle->id,
                'type' => 'maintenance',
                'expiry_date' => Carbon::now()->addMonths(rand(1, 6)),
                'reminder_date' => Carbon::now()->addMonths(rand(1, 6))->subDays(7),
                'notes' => 'Manutenzione ordinaria',
                'status' => rand(0, 1) ? 'active' : 'completed',
            ]);
            
            // Scadenza passata (per test)
            if (rand(0, 1)) {
                VehicleDeadline::create([
                    'vehicle_id' => $vehicle->id,
                    'type' => $deadlineTypes[array_rand($deadlineTypes)],
                    'expiry_date' => Carbon::now()->subDays(rand(1, 30)),
                    'reminder_date' => Carbon::now()->subDays(rand(31, 45)),
                    'notes' => 'Scadenza passata per test',
                    'status' => rand(0, 1) ? 'expired' : 'completed',
                ]);
            }
        }
    }
}