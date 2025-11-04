<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Models\VehicleRental;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RentalVehicleController extends Controller
{
    /**
     * Restituisce tutti i veicoli con contratto di noleggio attivo
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = VehicleRental::with('vehicle')
                ->where('is_active', true);

            // Filtro opzionale per data
            if ($request->has('date')) {
                $date = $request->input('date');
                $query->where(function ($q) use ($date) {
                    $q->where('contract_start_date', '<=', $date)
                      ->where('contract_end_date', '>=', $date);
                });
            }

            // Filtro per contratti attivi (non scaduti)
            if ($request->has('active') && $request->input('active') == '1') {
                $query->where('contract_end_date', '>=', now());
            }

            // Ordina per data inizio contratto
            $rentals = $query->orderBy('contract_start_date', 'desc')->get();

            // Trasforma i dati per compatibilità con il frontend
            $vehicles = $rentals->map(function ($rental) {
                $vehicle = $rental->vehicle;
                if (!$vehicle) return null;
                
                // Combina dati veicolo e contratto
                return array_merge(
                    $vehicle->toArray(),
                    [
                        'contract_start_date' => $rental->contract_start_date,
                        'contract_end_date' => $rental->contract_end_date,
                        'contract_holder' => $rental->contract_holder,
                        'rental_type' => $rental->rental_type,
                        'monthly_fee' => $rental->monthly_fee,
                        'contract_duration_months' => $rental->contract_duration_months,
                        'contract_kilometers' => $rental->contract_kilometers,
                        'supplier' => $rental->supplier,
                        'notes' => $rental->notes,
                        'rental_id' => $rental->id, // ID del contratto per riferimento
                    ]
                );
            })->filter();

            return response()->json($vehicles->values());
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Errore nel recupero dei veicoli noleggiati',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Restituisce un singolo veicolo noleggiato con dettagli
     */
    public function show($id): JsonResponse
    {
        try {
            // Cerca per ID veicolo o ID contratto
            $rental = VehicleRental::with('vehicle')
                ->where('id', $id)
                ->orWhere('vehicle_id', $id)
                ->first();

            if (!$rental || !$rental->vehicle) {
                return response()->json([
                    'error' => 'Contratto di noleggio non trovato'
                ], 404);
            }

            $vehicle = $rental->vehicle->toArray();
            $vehicle['contract_start_date'] = $rental->contract_start_date;
            $vehicle['contract_end_date'] = $rental->contract_end_date;
            $vehicle['contract_holder'] = $rental->contract_holder;
            $vehicle['rental_type'] = $rental->rental_type;
            $vehicle['rental_id'] = $rental->id;

            return response()->json($vehicle);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Contratto non trovato',
                'message' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Restituisce statistiche sui noleggi
     */
    public function statistics(): JsonResponse
    {
        try {
            $total = VehicleRental::where('is_active', true)->count();

            $active = VehicleRental::where('is_active', true)
                ->where('contract_start_date', '<=', now())
                ->where('contract_end_date', '>=', now())
                ->count();

            $expired = VehicleRental::where('is_active', true)
                ->where('contract_end_date', '<', now())
                ->count();

            $upcoming = VehicleRental::where('is_active', true)
                ->where('contract_start_date', '>', now())
                ->count();

            // Contratti in scadenza nei prossimi 30 giorni
            $expiringSoon = VehicleRental::where('is_active', true)
                ->where('contract_end_date', '>=', now())
                ->where('contract_end_date', '<=', now()->addDays(30))
                ->count();

            $totalMonthlyFees = VehicleRental::where('is_active', true)
                ->where('contract_start_date', '<=', now())
                ->where('contract_end_date', '>=', now())
                ->sum('monthly_fee');

            return response()->json([
                'total' => $total,
                'active' => $active,
                'expired' => $expired,
                'upcoming' => $upcoming,
                'expiring_soon' => $expiringSoon,
                'total_monthly_fees' => $totalMonthlyFees
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Errore nel calcolo delle statistiche',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}







