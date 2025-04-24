<?php
// Carica l'ambiente Laravel
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Ottieni le date
$today = date('Y-m-d');
$thirtyDaysLater = date('Y-m-d', strtotime('+30 days'));

echo "Periodo: $today - $thirtyDaysLater\n";

// Conta le scadenze nel periodo
$deadlinesCount = \App\Models\VehicleDeadline::whereDate('expiry_date', '<=', $thirtyDaysLater)->count();
echo "Scadenze nel periodo: $deadlinesCount\n";

// Ottieni alcune scadenze di esempio
$deadlines = \App\Models\VehicleDeadline::whereDate('expiry_date', '<=', $thirtyDaysLater)
    ->with('vehicle')
    ->limit(5)
    ->get();

echo "\nEsempio di scadenze:\n";
foreach ($deadlines as $deadline) {
    echo "ID: {$deadline->id}, Tipo: {$deadline->type}, Data: {$deadline->expiry_date}, ";
    echo "Veicolo: " . ($deadline->vehicle ? $deadline->vehicle->plate : 'N/D') . "\n";
}

// Verifica se ci sono scadenze con veicolo nullo
$deadlinesWithoutVehicle = \App\Models\VehicleDeadline::whereNull('vehicle_id')
    ->orWhereDoesntHave('vehicle')
    ->count();
echo "\nScadenze senza veicolo associato: $deadlinesWithoutVehicle\n";
