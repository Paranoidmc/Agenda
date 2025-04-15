<?php

namespace Database\Seeders;

use App\Models\Vehicle;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class VehicleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $vehicles = [
            [
                'plate' => 'AB123CD',
                'brand' => 'Iveco',
                'model' => 'Daily',
                'year' => 2020,
                'type' => 'Furgone',
                'status' => 'operational',
                'notes' => 'Veicolo per trasporto materiali leggeri',
            ],
            [
                'plate' => 'EF456GH',
                'brand' => 'Mercedes',
                'model' => 'Actros',
                'year' => 2019,
                'type' => 'Camion',
                'status' => 'operational',
                'notes' => 'Veicolo per trasporti pesanti',
            ],
            [
                'plate' => 'IJ789KL',
                'brand' => 'Fiat',
                'model' => 'Ducato',
                'year' => 2021,
                'type' => 'Furgone',
                'status' => 'operational',
                'notes' => 'Veicolo per trasporto operai',
            ],
            [
                'plate' => 'MN012OP',
                'brand' => 'Volvo',
                'model' => 'FH16',
                'year' => 2018,
                'type' => 'Camion',
                'status' => 'operational',
                'notes' => 'Veicolo per trasporti eccezionali',
            ],
            [
                'plate' => 'QR345ST',
                'brand' => 'Renault',
                'model' => 'Master',
                'year' => 2022,
                'type' => 'Furgone',
                'status' => 'operational',
                'notes' => 'Veicolo per consegne rapide',
            ],
            [
                'plate' => 'UV678WX',
                'brand' => 'Scania',
                'model' => 'R500',
                'year' => 2017,
                'type' => 'Camion',
                'status' => 'operational',
                'notes' => 'Veicolo per trasporti a lungo raggio',
            ],
            [
                'plate' => 'YZ901AB',
                'brand' => 'Ford',
                'model' => 'Transit',
                'year' => 2020,
                'type' => 'Furgone',
                'status' => 'operational',
                'notes' => 'Veicolo per trasporto attrezzature',
            ],
            [
                'plate' => 'CD234EF',
                'brand' => 'MAN',
                'model' => 'TGX',
                'year' => 2019,
                'type' => 'Camion',
                'status' => 'operational',
                'notes' => 'Veicolo con gru',
            ],
            [
                'plate' => 'GH567IJ',
                'brand' => 'Peugeot',
                'model' => 'Boxer',
                'year' => 2021,
                'type' => 'Furgone',
                'status' => 'operational',
                'notes' => 'Veicolo per trasporto materiali',
            ],
            [
                'plate' => 'KL890MN',
                'brand' => 'DAF',
                'model' => 'XF',
                'year' => 2018,
                'type' => 'Camion',
                'status' => 'operational',
                'notes' => 'Veicolo per trasporti pesanti',
            ],
            [
                'plate' => 'OP123QR',
                'brand' => 'Volkswagen',
                'model' => 'Crafter',
                'year' => 2022,
                'type' => 'Furgone',
                'status' => 'operational',
                'notes' => 'Veicolo per trasporto operai',
            ],
            [
                'plate' => 'ST456UV',
                'brand' => 'Iveco',
                'model' => 'Stralis',
                'year' => 2017,
                'type' => 'Camion',
                'status' => 'operational',
                'notes' => 'Veicolo per trasporto materiali edili',
            ],
            [
                'plate' => 'WX789YZ',
                'brand' => 'Mercedes',
                'model' => 'Sprinter',
                'year' => 2020,
                'type' => 'Furgone',
                'status' => 'operational',
                'notes' => 'Veicolo per consegne urgenti',
            ],
            [
                'plate' => 'AB012CD',
                'brand' => 'Volvo',
                'model' => 'FM',
                'year' => 2019,
                'type' => 'Camion',
                'status' => 'operational',
                'notes' => 'Veicolo con cassone ribaltabile',
            ],
            [
                'plate' => 'EF345GH',
                'brand' => 'Fiat',
                'model' => 'Talento',
                'year' => 2021,
                'type' => 'Furgone',
                'status' => 'operational',
                'notes' => 'Veicolo per trasporto materiali leggeri',
            ],
            [
                'plate' => 'IJ678KL',
                'brand' => 'Scania',
                'model' => 'P410',
                'year' => 2018,
                'type' => 'Camion',
                'status' => 'maintenance',
                'notes' => 'Veicolo per trasporto prefabbricati',
            ],
            [
                'plate' => 'MN901OP',
                'brand' => 'Renault',
                'model' => 'Trafic',
                'year' => 2022,
                'type' => 'Furgone',
                'status' => 'operational',
                'notes' => 'Veicolo per trasporto operai',
            ],
            [
                'plate' => 'QR234ST',
                'brand' => 'MAN',
                'model' => 'TGS',
                'year' => 2017,
                'type' => 'Camion',
                'status' => 'operational',
                'notes' => 'Veicolo per trasporto calcestruzzo',
            ],
            [
                'plate' => 'UV567WX',
                'brand' => 'Ford',
                'model' => 'Custom',
                'year' => 2020,
                'type' => 'Furgone',
                'status' => 'operational',
                'notes' => 'Veicolo per trasporto attrezzature',
            ],
            [
                'plate' => 'YZ890AB',
                'brand' => 'DAF',
                'model' => 'CF',
                'year' => 2019,
                'type' => 'Camion',
                'status' => 'out_of_service',
                'notes' => 'Veicolo per trasporto materiali edili',
            ],
        ];

        foreach ($vehicles as $vehicle) {
            Vehicle::create($vehicle);
        }
    }
}