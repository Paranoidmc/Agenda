<?php

namespace Database\Seeders;

use App\Models\Driver;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class DriverSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $drivers = [
            [
                'name' => 'Marco',
                'surname' => 'Rossi',
                'email' => 'marco.rossi@example.com',
                'phone' => '333 1234567',
                'license_number' => 'AB123456',
                'license_expiry' => Carbon::now()->addYears(5),
                'notes' => 'Autista esperto con patente C+E',
                'status' => 'active',
            ],
            [
                'name' => 'Giuseppe',
                'surname' => 'Bianchi',
                'email' => 'giuseppe.bianchi@example.com',
                'phone' => '333 2345678',
                'license_number' => 'CD234567',
                'license_expiry' => Carbon::now()->addYears(3),
                'notes' => 'Specializzato in trasporti eccezionali',
                'status' => 'active',
            ],
            [
                'name' => 'Antonio',
                'surname' => 'Verdi',
                'email' => 'antonio.verdi@example.com',
                'phone' => '333 3456789',
                'license_number' => 'EF345678',
                'license_expiry' => Carbon::now()->addYears(4),
                'notes' => 'Autista con esperienza in cantieri',
                'status' => 'active',
            ],
            [
                'name' => 'Francesco',
                'surname' => 'Neri',
                'email' => 'francesco.neri@example.com',
                'phone' => '333 4567890',
                'license_number' => 'GH456789',
                'license_expiry' => Carbon::now()->addYears(2),
                'notes' => 'Specializzato in trasporto materiali pesanti',
                'status' => 'active',
            ],
            [
                'name' => 'Luigi',
                'surname' => 'Esposito',
                'email' => 'luigi.esposito@example.com',
                'phone' => '333 5678901',
                'license_number' => 'IJ567890',
                'license_expiry' => Carbon::now()->addYears(1),
                'notes' => 'Autista con patente ADR',
                'status' => 'active',
            ],
            [
                'name' => 'Paolo',
                'surname' => 'Romano',
                'email' => 'paolo.romano@example.com',
                'phone' => '333 6789012',
                'license_number' => 'KL678901',
                'license_expiry' => Carbon::now()->addYears(6),
                'notes' => 'Autista con esperienza in trasporti internazionali',
                'status' => 'active',
            ],
            [
                'name' => 'Salvatore',
                'surname' => 'Martini',
                'email' => 'salvatore.martini@example.com',
                'phone' => '333 7890123',
                'license_number' => 'MN789012',
                'license_expiry' => Carbon::now()->addYears(4),
                'notes' => 'Autista con patente C',
                'status' => 'active',
            ],
            [
                'name' => 'Mario',
                'surname' => 'Ricci',
                'email' => 'mario.ricci@example.com',
                'phone' => '333 8901234',
                'license_number' => 'OP890123',
                'license_expiry' => Carbon::now()->addYears(3),
                'notes' => 'Specializzato in trasporto macchinari',
                'status' => 'active',
            ],
            [
                'name' => 'Giovanni',
                'surname' => 'Moretti',
                'email' => 'giovanni.moretti@example.com',
                'phone' => '333 9012345',
                'license_number' => 'QR901234',
                'license_expiry' => Carbon::now()->addYears(5),
                'notes' => 'Autista con esperienza in cantieri urbani',
                'status' => 'active',
            ],
            [
                'name' => 'Fabio',
                'surname' => 'Conti',
                'email' => 'fabio.conti@example.com',
                'phone' => '333 0123456',
                'license_number' => 'ST012345',
                'license_expiry' => Carbon::now()->addYears(2),
                'notes' => 'Autista con patente C+E e CQC',
                'status' => 'active',
            ],
            [
                'name' => 'Andrea',
                'surname' => 'Gallo',
                'email' => 'andrea.gallo@example.com',
                'phone' => '334 1234567',
                'license_number' => 'UV123456',
                'license_expiry' => Carbon::now()->addYears(4),
                'notes' => 'Specializzato in trasporto calcestruzzo',
                'status' => 'active',
            ],
            [
                'name' => 'Luca',
                'surname' => 'Marini',
                'email' => 'luca.marini@example.com',
                'phone' => '334 2345678',
                'license_number' => 'WX234567',
                'license_expiry' => Carbon::now()->addYears(3),
                'notes' => 'Autista con esperienza in trasporti speciali',
                'status' => 'active',
            ],
            [
                'name' => 'Gianni',
                'surname' => 'Vitale',
                'email' => 'gianni.vitale@example.com',
                'phone' => '334 3456789',
                'license_number' => 'YZ345678',
                'license_expiry' => Carbon::now()->addYears(1),
                'notes' => 'Autista con patente C',
                'status' => 'active',
            ],
            [
                'name' => 'Davide',
                'surname' => 'Lombardi',
                'email' => 'davide.lombardi@example.com',
                'phone' => '334 4567890',
                'license_number' => 'AB456789',
                'license_expiry' => Carbon::now()->addYears(5),
                'notes' => 'Specializzato in trasporto prefabbricati',
                'status' => 'active',
            ],
            [
                'name' => 'Matteo',
                'surname' => 'Fabbri',
                'email' => 'matteo.fabbri@example.com',
                'phone' => '334 5678901',
                'license_number' => 'CD567890',
                'license_expiry' => Carbon::now()->addYears(4),
                'notes' => 'Autista con esperienza in cantieri montani',
                'status' => 'active',
            ],
            [
                'name' => 'Stefano',
                'surname' => 'Greco',
                'email' => 'stefano.greco@example.com',
                'phone' => '334 6789012',
                'license_number' => 'EF678901',
                'license_expiry' => Carbon::now()->addYears(3),
                'notes' => 'Autista con patente C+E',
                'status' => 'active',
            ],
            [
                'name' => 'Giuseppe',
                'surname' => 'De Luca',
                'email' => 'giuseppe.deluca@example.com',
                'phone' => '334 7890123',
                'license_number' => 'GH789012',
                'license_expiry' => Carbon::now()->addYears(2),
                'notes' => 'Specializzato in trasporto rifiuti',
                'status' => 'active',
            ],
            [
                'name' => 'Luca',
                'surname' => 'Santoro',
                'email' => 'luca.santoro@example.com',
                'phone' => '334 8901234',
                'license_number' => 'IJ890123',
                'license_expiry' => Carbon::now()->addYears(6),
                'notes' => 'Autista con esperienza in trasporti urbani',
                'status' => 'active',
            ],
            [
                'name' => 'Roberto',
                'surname' => 'Ferrari',
                'email' => 'roberto.ferrari@example.com',
                'phone' => '334 9012345',
                'license_number' => 'KL901234',
                'license_expiry' => Carbon::now()->addYears(5),
                'notes' => 'Autista con patente C e CQC',
                'status' => 'active',
            ],
            [
                'name' => 'Alessio',
                'surname' => 'Marino',
                'email' => 'alessio.marino@example.com',
                'phone' => '334 0123456',
                'license_number' => 'MN012345',
                'license_expiry' => Carbon::now()->addYears(4),
                'notes' => 'Specializzato in trasporto attrezzature',
                'status' => 'inactive',
            ],
        ];

        foreach ($drivers as $driver) {
            Driver::create($driver);
        }
    }
}