<?php

namespace App\Http\Controllers;

use App\Models\DriverPreference;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class DriverPreferenceController extends Controller
{
    use AuthorizesRequests;

    /**
     * Ottiene le preferenze globali
     */
    public function getGlobal()
    {
        $pref = DriverPreference::getGlobal();
        
        return response()->json([
            'driver_order' => $pref?->driver_order ?? [],
            'hidden_drivers' => $pref?->hidden_drivers ?? [],
        ]);
    }

    /**
     * Salva le preferenze globali (solo admin)
     */
    public function saveGlobal(Request $request)
    {
        // Solo admin possono salvare preferenze globali
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['error' => 'Non autorizzato'], 403);
        }

        $validated = $request->validate([
            'driver_order' => 'nullable|array',
            'driver_order.*' => 'string',
            'hidden_drivers' => 'nullable|array',
            'hidden_drivers.*' => 'string',
        ]);

        $driverOrder = $validated['driver_order'] ?? [];
        $hiddenDrivers = $validated['hidden_drivers'] ?? [];

        $pref = DriverPreference::saveGlobal($driverOrder, $hiddenDrivers);

        return response()->json([
            'success' => true,
            'data' => [
                'driver_order' => $pref->driver_order,
                'hidden_drivers' => $pref->hidden_drivers,
            ]
        ]);
    }

    /**
     * Ottiene le preferenze dell'utente corrente
     */
    public function getUser(Request $request)
    {
        if (!$request->user()) {
            return response()->json([
                'driver_order' => [],
                'hidden_drivers' => [],
            ]);
        }

        $pref = DriverPreference::getUserPreferences($request->user()->id);
        
        return response()->json([
            'driver_order' => $pref?->driver_order ?? [],
            'hidden_drivers' => $pref?->hidden_drivers ?? [],
        ]);
    }

    /**
     * Salva le preferenze dell'utente corrente
     */
    public function saveUser(Request $request)
    {
        if (!$request->user()) {
            return response()->json(['error' => 'Non autenticato'], 401);
        }

        $validated = $request->validate([
            'driver_order' => 'nullable|array',
            'driver_order.*' => 'string',
            'hidden_drivers' => 'nullable|array',
            'hidden_drivers.*' => 'string',
        ]);

        $driverOrder = $validated['driver_order'] ?? [];
        $hiddenDrivers = $validated['hidden_drivers'] ?? [];

        $pref = DriverPreference::saveUserPreferences(
            $request->user()->id,
            $driverOrder,
            $hiddenDrivers
        );

        return response()->json([
            'success' => true,
            'data' => [
                'driver_order' => $pref->driver_order,
                'hidden_drivers' => $pref->hidden_drivers,
            ]
        ]);
    }
}
