<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Creiamo un utente di test
        User::factory()->create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
        ]);
        
        // Eseguiamo i seeder nell'ordine corretto
        $this->call([
            ClientSeeder::class,
            ActivityTypeSeeder::class,
            DriverSeeder::class,
            VehicleSeeder::class,
            SiteSeeder::class,
            VehicleDeadlineSeeder::class,
            ActivitySeeder::class,
        ]);
    }
}
