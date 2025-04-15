<?php

namespace Database\Seeders;

use App\Models\ActivityType;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ActivityTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $activityTypes = [
            [
                'name' => 'Trasporto materiali',
                'description' => 'Trasporto di materiali edili verso i cantieri',
                'color' => '#4287f5',
            ],
            [
                'name' => 'Consegna attrezzature',
                'description' => 'Consegna di attrezzature e macchinari',
                'color' => '#42f5a7',
            ],
            [
                'name' => 'Ritiro materiali',
                'description' => 'Ritiro di materiali dai fornitori',
                'color' => '#f5d442',
            ],
            [
                'name' => 'Trasporto operai',
                'description' => 'Trasporto di personale ai cantieri',
                'color' => '#f54242',
            ],
            [
                'name' => 'Manutenzione',
                'description' => 'Attività di manutenzione in cantiere',
                'color' => '#a142f5',
            ],
            [
                'name' => 'Sopralluogo',
                'description' => 'Sopralluogo tecnico in cantiere',
                'color' => '#42f5f2',
            ],
            [
                'name' => 'Scarico materiali',
                'description' => 'Scarico di materiali in cantiere',
                'color' => '#f59c42',
            ],
            [
                'name' => 'Trasporto rifiuti',
                'description' => 'Trasporto di rifiuti edili',
                'color' => '#8c8c8c',
            ],
            [
                'name' => 'Consegna documenti',
                'description' => 'Consegna di documenti e pratiche',
                'color' => '#42adf5',
            ],
            [
                'name' => 'Fornitura calcestruzzo',
                'description' => 'Fornitura di calcestruzzo in cantiere',
                'color' => '#f5425a',
            ],
            [
                'name' => 'Trasporto macchinari',
                'description' => 'Trasporto di macchinari pesanti',
                'color' => '#f542e9',
            ],
            [
                'name' => 'Assistenza tecnica',
                'description' => 'Assistenza tecnica in cantiere',
                'color' => '#42f578',
            ],
            [
                'name' => 'Ritiro attrezzature',
                'description' => 'Ritiro di attrezzature dai cantieri',
                'color' => '#f5e642',
            ],
            [
                'name' => 'Consegna materiali',
                'description' => 'Consegna di materiali specifici',
                'color' => '#4263f5',
            ],
            [
                'name' => 'Trasporto straordinario',
                'description' => 'Trasporto di materiali fuori misura',
                'color' => '#f54e42',
            ],
            [
                'name' => 'Fornitura sabbia',
                'description' => 'Fornitura di sabbia in cantiere',
                'color' => '#d9a66c',
            ],
            [
                'name' => 'Trasporto prefabbricati',
                'description' => 'Trasporto di elementi prefabbricati',
                'color' => '#6cd9d3',
            ],
            [
                'name' => 'Consegna urgente',
                'description' => 'Consegna urgente di materiali o attrezzature',
                'color' => '#ff0000',
            ],
            [
                'name' => 'Ritiro rifiuti speciali',
                'description' => 'Ritiro di rifiuti speciali dai cantieri',
                'color' => '#7a7a7a',
            ],
            [
                'name' => 'Trasporto interno',
                'description' => 'Trasporto tra sedi aziendali',
                'color' => '#42b0f5',
            ],
        ];

        foreach ($activityTypes as $activityType) {
            ActivityType::create($activityType);
        }
    }
}