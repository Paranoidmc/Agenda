<?php

namespace Database\Seeders;

use App\Models\Site;
use App\Models\Client;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SiteSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Assicuriamoci che ci siano clienti nel database
        $clients = Client::all();
        
        if ($clients->isEmpty()) {
            $this->command->info('Nessun cliente trovato. Esegui prima il ClientSeeder.');
            return;
        }
        
        $sites = [
            [
                'name' => 'Cantiere Via Roma',
                'address' => 'Via Roma 45',
                'city' => 'Milano',
                'postal_code' => '20100',
                'province' => 'MI',
                'client_id' => $clients->random()->id,
                'notes' => 'Costruzione edificio residenziale',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Piazza Duomo',
                'address' => 'Piazza Duomo 1',
                'city' => 'Milano',
                'postal_code' => '20100',
                'province' => 'MI',
                'client_id' => $clients->random()->id,
                'notes' => 'Ristrutturazione facciata',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Via Napoli',
                'address' => 'Via Napoli 23',
                'city' => 'Roma',
                'postal_code' => '00100',
                'province' => 'RM',
                'client_id' => $clients->random()->id,
                'notes' => 'Costruzione centro commerciale',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Corso Italia',
                'address' => 'Corso Italia 78',
                'city' => 'Roma',
                'postal_code' => '00100',
                'province' => 'RM',
                'client_id' => $clients->random()->id,
                'notes' => 'Ristrutturazione edificio storico',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Via Torino',
                'address' => 'Via Torino 56',
                'city' => 'Torino',
                'postal_code' => '10100',
                'province' => 'TO',
                'client_id' => $clients->random()->id,
                'notes' => 'Costruzione edificio uffici',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Corso Francia',
                'address' => 'Corso Francia 123',
                'city' => 'Torino',
                'postal_code' => '10100',
                'province' => 'TO',
                'client_id' => $clients->random()->id,
                'notes' => 'Ristrutturazione condominio',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Via Garibaldi',
                'address' => 'Via Garibaldi 45',
                'city' => 'Bologna',
                'postal_code' => '40100',
                'province' => 'BO',
                'client_id' => $clients->random()->id,
                'notes' => 'Costruzione scuola',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Piazza Maggiore',
                'address' => 'Piazza Maggiore 1',
                'city' => 'Bologna',
                'postal_code' => '40100',
                'province' => 'BO',
                'client_id' => $clients->random()->id,
                'notes' => 'Restauro edificio storico',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Viale Europa',
                'address' => 'Viale Europa 67',
                'city' => 'Firenze',
                'postal_code' => '50100',
                'province' => 'FI',
                'client_id' => $clients->random()->id,
                'notes' => 'Costruzione ospedale',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Via Dante',
                'address' => 'Via Dante 89',
                'city' => 'Firenze',
                'postal_code' => '50100',
                'province' => 'FI',
                'client_id' => $clients->random()->id,
                'notes' => 'Ristrutturazione museo',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Via Vesuvio',
                'address' => 'Via Vesuvio 34',
                'city' => 'Napoli',
                'postal_code' => '80100',
                'province' => 'NA',
                'client_id' => $clients->random()->id,
                'notes' => 'Costruzione hotel',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Lungomare',
                'address' => 'Lungomare Caracciolo 12',
                'city' => 'Napoli',
                'postal_code' => '80100',
                'province' => 'NA',
                'client_id' => $clients->random()->id,
                'notes' => 'Ristrutturazione ristorante',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Via Libertà',
                'address' => 'Via Libertà 56',
                'city' => 'Palermo',
                'postal_code' => '90100',
                'province' => 'PA',
                'client_id' => $clients->random()->id,
                'notes' => 'Costruzione centro sportivo',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Piazza Politeama',
                'address' => 'Piazza Politeama 3',
                'city' => 'Palermo',
                'postal_code' => '90100',
                'province' => 'PA',
                'client_id' => $clients->random()->id,
                'notes' => 'Restauro teatro',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Via Marconi',
                'address' => 'Via Marconi 78',
                'city' => 'Genova',
                'postal_code' => '16100',
                'province' => 'GE',
                'client_id' => $clients->random()->id,
                'notes' => 'Costruzione porto turistico',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Porto Antico',
                'address' => 'Porto Antico 5',
                'city' => 'Genova',
                'postal_code' => '16100',
                'province' => 'GE',
                'client_id' => $clients->random()->id,
                'notes' => 'Ristrutturazione acquario',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Corso Vittorio Emanuele',
                'address' => 'Corso Vittorio Emanuele 45',
                'city' => 'Bari',
                'postal_code' => '70100',
                'province' => 'BA',
                'client_id' => $clients->random()->id,
                'notes' => 'Costruzione centro direzionale',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Lungomare Nazario Sauro',
                'address' => 'Lungomare Nazario Sauro 12',
                'city' => 'Bari',
                'postal_code' => '70100',
                'province' => 'BA',
                'client_id' => $clients->random()->id,
                'notes' => 'Ristrutturazione hotel',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Via Mazzini',
                'address' => 'Via Mazzini 67',
                'city' => 'Venezia',
                'postal_code' => '30100',
                'province' => 'VE',
                'client_id' => $clients->random()->id,
                'notes' => 'Restauro palazzo storico',
                'status' => 'active',
            ],
            [
                'name' => 'Cantiere Canal Grande',
                'address' => 'Canal Grande 23',
                'city' => 'Venezia',
                'postal_code' => '30100',
                'province' => 'VE',
                'client_id' => $clients->random()->id,
                'notes' => 'Ristrutturazione ponte',
                'status' => 'inactive',
            ],
        ];

        foreach ($sites as $site) {
            Site::create($site);
        }
    }
}