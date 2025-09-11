<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class DriverActivityController extends Controller
{
    /**
     * Recupera tutte le attività per un autista specifico
     */
    public function getActivitiesByDriver($driverName): JsonResponse
    {
        try {
            // Normalizza il nome per la ricerca (case insensitive)
            $normalizedName = strtolower(trim($driverName));
            
            // Trova l'autista per nome e cognome
            $driver = DB::table('drivers')
                ->whereRaw('LOWER(CONCAT(name, " ", surname)) LIKE ?', ["%{$normalizedName}%"])
                ->first();
            
            if (!$driver) {
                return response()->json([]);
            }
            
            // Carica le attività dell'autista tramite ActivityResource (stesso sistema del frontend)
            $activities = Activity::with(['client', 'site', 'resources.driver', 'resources.vehicle'])
                ->whereHas('resources', function ($query) use ($driver) {
                    $query->where('driver_id', $driver->id);
                })
                ->orderBy('activities.created_at', 'desc')
                ->get()
                ->map(function ($activity) use ($driver) {
                    // Costruisce l'indirizzo completo dal sito
                    $indirizzo = 'Indirizzo non specificato';
                    if ($activity->site) {
                        $parts = array_filter([
                            $activity->site->address,
                            $activity->site->city,
                            $activity->site->postal_code,
                            $activity->site->province
                        ]);
                        if (!empty($parts)) {
                            $indirizzo = implode(', ', $parts);
                        }
                    }
                    
                    return [
                        'id' => $activity->id,
                        'nome_cliente' => $activity->client->nome ?? $activity->client->name ?? 'Cliente sconosciuto',
                        'cantiere' => $activity->site->nome ?? $activity->site->name ?? 'Cantiere non specificato',
                        'indirizzo' => $indirizzo,
                        'data_inizio' => $activity->data_inizio,
                        'data_fine' => $activity->data_fine,
                        'data_consegna' => $activity->created_at->format('Y-m-d'),
                        'ddt_url' => null, // TODO: implementare gestione DDT
                        'stato' => $activity->status ?? 'planned',
                        'autista' => $driver->name . ' ' . $driver->surname,
                        'veicolo' => $this->getVehicleFromResources($activity),
                        'note' => $activity->notes ?? $activity->note ?? 'Nessuna nota',
                        'descrizione' => $activity->descrizione,
                    ];
                });

            return response()->json($activities);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Errore nel caricamento attività',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Estrae i dati del veicolo dalle risorse dell'attività
     */
    private function getVehicleFromResources($activity)
    {
        if (!$activity->resources || $activity->resources->isEmpty()) {
            return 'Veicolo non assegnato';
        }

        $firstResource = $activity->resources->first();
        if (!$firstResource->vehicle) {
            return 'Veicolo non assegnato';
        }

        $vehicle = $firstResource->vehicle;
        $vehicleName = $vehicle->name ?? $vehicle->model ?? $vehicle->brand ?? 'Veicolo';
        $vehiclePlate = $vehicle->license_plate ?? $vehicle->targa ?? $vehicle->plate ?? '';
        
        if ($vehiclePlate) {
            return $vehicleName . ' (' . $vehiclePlate . ')';
        } else {
            return $vehicleName;
        }
    }

    /**
     * Avvia un'attività (imposta data inizio)
     */
    public function startActivity(Request $request, $id): JsonResponse
    {
        try {
            $activity = Activity::findOrFail($id);
            
            // Se viene fornito il nome dell'autista, verifica l'autorizzazione
            if ($request->has('driver_name')) {
                $driverName = strtolower(trim($request->driver_name));
                
                // Verifica che l'autista sia assegnato a questa attività
                $isAssigned = DB::table('activity_resource')
                    ->join('drivers', 'activity_resource.driver_id', '=', 'drivers.id')
                    ->where('activity_resource.activity_id', $id)
                    ->whereRaw('LOWER(CONCAT(drivers.name, " ", drivers.surname)) LIKE ?', ["%{$driverName}%"])
                    ->exists();
                
                if (!$isAssigned) {
                    return response()->json(['error' => 'Non autorizzato per questa attività'], 403);
                }
            }
            
            // Aggiorna data inizio e stato
            $activity->update([
                'data_inizio' => $request->started_at ?? now(),
                'status' => 'in_progress'
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Attività avviata con successo',
                'activity' => [
                    'id' => $activity->id,
                    'data_inizio' => $activity->data_inizio,
                    'stato' => $activity->status
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Errore nell\'avvio dell\'attività',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Termina un'attività (imposta data fine)
     */
    public function endActivity(Request $request, $id): JsonResponse
    {
        try {
            $activity = Activity::findOrFail($id);
            
            // Se viene fornito il nome dell'autista, verifica l'autorizzazione
            if ($request->has('driver_name')) {
                $driverName = strtolower(trim($request->driver_name));
                
                // Verifica che l'autista sia assegnato a questa attività
                $isAssigned = DB::table('activity_resource')
                    ->join('drivers', 'activity_resource.driver_id', '=', 'drivers.id')
                    ->where('activity_resource.activity_id', $id)
                    ->whereRaw('LOWER(CONCAT(drivers.name, " ", drivers.surname)) LIKE ?', ["%{$driverName}%"])
                    ->exists();
                
                if (!$isAssigned) {
                    return response()->json(['error' => 'Non autorizzato per questa attività'], 403);
                }
            }
            
            // Aggiorna data fine e stato
            $activity->update([
                'data_fine' => $request->ended_at ?? now(),
                'status' => 'completed',
                'completed_at' => now()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Attività completata con successo',
                'activity' => [
                    'id' => $activity->id,
                    'data_fine' => $activity->data_fine,
                    'stato' => $activity->status
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Errore nel completamento dell\'attività',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calcola lo stato dell'attività
     */
    private function calculateStatus($activity): string
    {
        if ($activity->data_fine) {
            return 'completed';
        }
        
        if ($activity->data_inizio) {
            return 'in_progress';
        }
        
        return 'planned';
    }

    /**
     * Upload DDT per un'attività
     */
    public function uploadDDT(Request $request, $id): JsonResponse
    {
        $request->validate([
            'ddt_file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:2048',
            'driver_name' => 'required|string',
        ]);

        $activity = Attivita::findOrFail($id);
        
        // Verifica autista
        if (strtolower(trim($activity->autista)) !== strtolower(trim($request->driver_name))) {
            return response()->json(['error' => 'Autista non autorizzato'], 403);
        }

        if ($request->hasFile('ddt_file')) {
            $file = $request->file('ddt_file');
            $path = $file->store('ddt', 'public');
            
            $activity->ddt_path = $path;
            $activity->save();

            return response()->json([
                'message' => 'DDT caricato con successo',
                'ddt_url' => url('storage/' . $path)
            ]);
        }

        return response()->json(['error' => 'File non fornito'], 400);
    }
}
