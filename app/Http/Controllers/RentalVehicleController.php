<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
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
            $query = Vehicle::query()
                ->whereNotNull('contract_start_date')
                ->whereNotNull('contract_end_date');

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
            $vehicles = $query->orderBy('contract_start_date', 'desc')->get();

            return response()->json($vehicles);
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
            $vehicle = Vehicle::findOrFail($id);

            // Verifica che abbia le date di contratto
            if (!$vehicle->contract_start_date || !$vehicle->contract_end_date) {
                return response()->json([
                    'error' => 'Questo veicolo non ha un contratto di noleggio attivo'
                ], 404);
            }

            return response()->json($vehicle);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Veicolo non trovato',
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
            $total = Vehicle::whereNotNull('contract_start_date')
                ->whereNotNull('contract_end_date')
                ->count();

            $active = Vehicle::whereNotNull('contract_start_date')
                ->whereNotNull('contract_end_date')
                ->where('contract_start_date', '<=', now())
                ->where('contract_end_date', '>=', now())
                ->count();

            $expired = Vehicle::whereNotNull('contract_start_date')
                ->whereNotNull('contract_end_date')
                ->where('contract_end_date', '<', now())
                ->count();

            $upcoming = Vehicle::whereNotNull('contract_start_date')
                ->whereNotNull('contract_end_date')
                ->where('contract_start_date', '>', now())
                ->count();

            // Contratti in scadenza nei prossimi 30 giorni
            $expiringSoon = Vehicle::whereNotNull('contract_start_date')
                ->whereNotNull('contract_end_date')
                ->where('contract_end_date', '>=', now())
                ->where('contract_end_date', '<=', now()->addDays(30))
                ->count();

            $totalMonthlyFees = Vehicle::whereNotNull('contract_start_date')
                ->whereNotNull('contract_end_date')
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






