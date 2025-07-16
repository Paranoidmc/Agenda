<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Vehicle;
use Illuminate\Support\Facades\Log;

class VehicleTrackingController extends Controller
{
    /**
     * Ottieni la posizione di un veicolo specifico
     */
    public function getVehiclePosition($vehicleId)
    {
        try {
            $vehicle = Vehicle::findOrFail($vehicleId);
            
            // Qui andrà la logica per ottenere la posizione reale dal GPS
            // Per ora restituiamo dati simulati
            $position = $this->simulateVehiclePosition($vehicle);
            
            return response()->json($position);
        } catch (\Exception $e) {
            Log::error("Errore nel recupero posizione veicolo {$vehicleId}: " . $e->getMessage());
            return response()->json(['message' => 'Veicolo non trovato'], 404);
        }
    }
    
    /**
     * Ottieni le posizioni di più veicoli
     */
    public function getMultipleVehiclePositions(Request $request)
    {
        $vehicleIds = $request->input('vehicle_ids', []);
        
        if (empty($vehicleIds)) {
            return response()->json(['message' => 'Nessun ID veicolo fornito'], 400);
        }
        
        try {
            $vehicles = Vehicle::whereIn('id', $vehicleIds)->get();
            $positions = [];
            
            foreach ($vehicles as $vehicle) {
                $positions[] = $this->simulateVehiclePosition($vehicle);
            }
            
            return response()->json($positions);
        } catch (\Exception $e) {
            Log::error("Errore nel recupero posizioni veicoli: " . $e->getMessage());
            return response()->json(['message' => 'Errore interno del server'], 500);
        }
    }
    
    /**
     * Aggiorna la posizione di un veicolo (per quando ricevi dati GPS)
     */
    public function updateVehiclePosition(Request $request, $vehicleId)
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'speed' => 'nullable|numeric|min:0',
            'heading' => 'nullable|numeric|between:0,360',
            'timestamp' => 'nullable|date',
        ]);
        
        try {
            $vehicle = Vehicle::findOrFail($vehicleId);
            
            // Qui salveresti la posizione nel database
            // Per ora logghiamo solo i dati ricevuti
            Log::info("Posizione ricevuta per veicolo {$vehicleId}", [
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'speed' => $request->speed,
                'heading' => $request->heading,
                'timestamp' => $request->timestamp ?? now(),
            ]);
            
            return response()->json([
                'message' => 'Posizione aggiornata con successo',
                'vehicle_id' => $vehicleId,
                'timestamp' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error("Errore nell'aggiornamento posizione veicolo {$vehicleId}: " . $e->getMessage());
            return response()->json(['message' => 'Errore interno del server'], 500);
        }
    }
    
    /**
     * Simula la posizione di un veicolo (da rimuovere quando avrai i dati reali)
     */
    private function simulateVehiclePosition($vehicle)
    {
        // Coordinate di esempio per diverse città italiane
        $locations = [
            ['lat' => 41.9028, 'lng' => 12.4964, 'city' => 'Roma'],
            ['lat' => 45.4642, 'lng' => 9.1900, 'city' => 'Milano'],
            ['lat' => 40.8518, 'lng' => 14.2681, 'city' => 'Napoli'],
            ['lat' => 45.4408, 'lng' => 12.3155, 'city' => 'Venezia'],
            ['lat' => 43.7696, 'lng' => 11.2558, 'city' => 'Firenze'],
        ];
        
        $baseLocation = $locations[$vehicle->id % count($locations)];
        
        // Aggiungi un po' di movimento casuale
        $randomOffset = function() {
            return (mt_rand(-100, 100) / 10000); // ~1km di raggio
        };
        
        return [
            'vehicle_id' => $vehicle->id,
            'latitude' => $baseLocation['lat'] + $randomOffset(),
            'longitude' => $baseLocation['lng'] + $randomOffset(),
            'speed' => mt_rand(0, 80), // km/h
            'heading' => mt_rand(0, 360), // gradi
            'status' => 'active', // active, idle, offline
            'last_update' => now()->toISOString(),
            'vehicle' => [
                'id' => $vehicle->id,
                'plate' => $vehicle->plate,
                'model' => $vehicle->model,
                'brand' => $vehicle->brand,
            ],
        ];
    }
}