<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\ProfessionalDriverLicense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProfessionalDriverLicenseController extends Controller
{
    /**
     * Display empty data for new driver professional licenses.
     */
    public function indexNew()
    {
        return response()->json([]);
    }

    public function index(Driver $driver)
    {
        try {
            $licenses = $driver->professionalLicenses()->orderBy('scadenza', 'asc')->get();
        } catch (\Throwable $exception) {
            \Log::error('Errore caricamento patenti professionali', [
                'driver_id' => $driver->id,
                'exception' => $exception->getMessage(),
            ]);
            $licenses = collect();
        }

        return response()->json([
            'success' => true,
            'data' => $licenses,
        ]);
    }

    public function store(Request $request, Driver $driver)
    {
        try {
            $validated = $request->validate([
                'tipo' => 'required|string|max:255',
                'numero' => 'nullable|string|max:255',
                'ente_rilascio' => 'nullable|string|max:255',
                'rilasciata_il' => 'nullable|date',
                'scadenza' => 'required|date',
                'note' => 'nullable|string',
            ]);

            $license = $driver->professionalLicenses()->create($validated);

            return response()->json([
                'success' => true,
                'data' => $license,
            ], 201);
        } catch (\Throwable $exception) {
            \Log::error('Errore creazione patente professionale', [
                'driver_id' => $driver->id,
                'request' => $request->all(),
                'exception' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Errore interno durante la creazione della patente professionale.',
            ], 500);
        }
    }

    public function update(Request $request, Driver $driver, ProfessionalDriverLicense $license)
    {
        if ($license->driver_id !== $driver->id) {
            return response()->json(['success' => false, 'message' => 'License does not belong to this driver'], 404);
        }

        try {
            $validated = $request->validate([
                'tipo' => 'required|string|max:255',
                'numero' => 'nullable|string|max:255',
                'ente_rilascio' => 'nullable|string|max:255',
                'rilasciata_il' => 'nullable|date',
                'scadenza' => 'required|date',
                'note' => 'nullable|string',
            ]);

            $license->fill($validated)->save();

            return response()->json([
                'success' => true,
                'data' => $license,
            ]);
        } catch (\Throwable $exception) {
            \Log::error('Errore aggiornamento patente professionale', [
                'driver_id' => $driver->id,
                'license_id' => $license->id,
                'request' => $request->all(),
                'exception' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Errore interno durante l\'aggiornamento della patente professionale.',
            ], 500);
        }
    }

    public function destroy(Driver $driver, ProfessionalDriverLicense $license)
    {
        if ($license->driver_id !== $driver->id) {
            return response()->json(['success' => false, 'message' => 'License does not belong to this driver'], 404);
        }
        $license->delete();
        return response()->json(['success' => true]);
    }
}
