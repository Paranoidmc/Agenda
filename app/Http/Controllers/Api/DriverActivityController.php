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
                \Log::info('DriverActivityController: Driver non trovato', ['driver_name' => $driverName]);
                return response()->json([]);
            }
            
            \Log::info('DriverActivityController: Driver trovato', [
                'driver_id' => $driver->id,
                'driver_name' => $driver->name . ' ' . $driver->surname,
                'search_name' => $driverName
            ]);
            
            // Carica le attività dell'autista tramite ActivityResource (stesso sistema del frontend)
            $activities = Activity::with([
                'client', 
                'site', 
                'activityType', 
                'resources.driver', 
                'resources.vehicle.documentiVeicolo',
                'resources.vehicle.deadlines'
            ])
                ->whereHas('resources', function ($query) use ($driver) {
                    $query->where('driver_id', $driver->id);
                })
                // ->whereDate('data_inizio', now()->format('Y-m-d')) // Filtra solo per oggi - temporaneamente disabilitato per debug
                ->orderBy('activities.created_at', 'desc')
                ->get();
                
            \Log::info('DriverActivityController: Attività trovate', [
                'driver_id' => $driver->id,
                'activities_count' => $activities->count(),
                'activities_ids' => $activities->pluck('id')->toArray()
            ]);
                
            $activities = $activities->map(function ($activity) use ($driver) {
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
                        'tipologia' => $activity->activityType->nome ?? $activity->activityType->name ?? null,
                        'descrizione' => $activity->descrizione,
                        'data_inizio' => $activity->data_inizio,
                        'data_fine' => $activity->data_fine,
                        'data_consegna' => $activity->created_at->format('Y-m-d'),
                        'ddt_url' => null, // TODO: implementare gestione DDT
                        'stato' => $activity->status ?? 'planned',
                        'autista' => $driver->name . ' ' . $driver->surname,
                        'veicolo' => $this->getVehicleFromResources($activity),
                        'veicolo_dettagli' => $this->getVehicleDetailsFromResources($activity),
                        'note' => $activity->notes ?? $activity->note ?? 'Nessuna nota',
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
        $vehicleName = $vehicle->name ?? $vehicle->nome ?? $vehicle->model ?? $vehicle->brand ?? 'Veicolo';
        $vehiclePlate = $vehicle->license_plate ?? $vehicle->targa ?? $vehicle->plate ?? '';
        
        if ($vehiclePlate) {
            return $vehicleName . ' (' . $vehiclePlate . ')';
        } else {
            return $vehicleName;
        }
    }

    /**
     * Estrae i dati completi del veicolo con documenti e scadenze
     */
    private function getVehicleDetailsFromResources($activity)
    {
        if (!$activity->resources || $activity->resources->isEmpty()) {
            return null;
        }

        $firstResource = $activity->resources->first();
        if (!$firstResource->vehicle) {
            return null;
        }

        $vehicle = $firstResource->vehicle;
        
        // Formatta i documenti
        $documenti = $vehicle->documentiVeicolo ? $vehicle->documentiVeicolo->map(function ($doc) {
            return [
                'id' => $doc->id,
                'categoria' => $doc->categoria,
                'descrizione' => $doc->descrizione,
                'file_path' => $doc->file_path,
                // URL relativo per permettere al proxy Next.js di gestirlo
                'file_url' => $doc->file_path ? '/api/p/download-document/' . $doc->id : null,
                'data_scadenza' => $doc->data_scadenza,
                'scaduto' => $doc->data_scadenza ? \Carbon\Carbon::parse($doc->data_scadenza)->isPast() : false,
            ];
        })->toArray() : [];

        // Formatta le scadenze
        $scadenze = $vehicle->deadlines ? $vehicle->deadlines->map(function ($deadline) {
            return [
                'id' => $deadline->id,
                'tipo' => $deadline->type,
                'data_scadenza' => $deadline->expiry_date,
                'data_promemoria' => $deadline->reminder_date,
                'note' => $deadline->notes,
                'stato' => $deadline->status,
                'pagato' => $deadline->pagato ?? false,
                'importo' => $deadline->importo,
                'scaduto' => $deadline->expiry_date ? \Carbon\Carbon::parse($deadline->expiry_date)->isPast() : false,
                'in_scadenza' => $deadline->expiry_date ? \Carbon\Carbon::parse($deadline->expiry_date)->between(now(), now()->addDays(30)) : false,
            ];
        })->toArray() : [];

        return [
            'id' => $vehicle->id,
            'targa' => $vehicle->plate,
            'marca' => $vehicle->brand,
            'modello' => $vehicle->model,
            'nome' => $vehicle->nome ?? $vehicle->name ?? ($vehicle->brand . ' ' . $vehicle->model),
            'anno' => $vehicle->year,
            'documenti' => $documenti,
            'scadenze' => $scadenze,
        ];
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
                'status' => 'in corso' // Usa lo stato italiano invece di 'in_progress'
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Attività avviata con successo',
                'activity' => [
                    'id' => $activity->id,
                    'data_inizio' => $activity->data_inizio,
                    'status' => 'in corso',
                    'stato' => 'in corso'
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
                'status' => 'completato', // Usa lo stato italiano invece di 'completed'
                'completed_at' => now()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Attività completata con successo',
                'activity' => [
                    'id' => $activity->id,
                    'data_fine' => $activity->data_fine,
                    'status' => 'completato',
                    'stato' => 'completato'
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

    /**
     * Download documento veicolo
     */
    public function downloadDocument($documentId)
    {
        try {
            $document = \App\Models\DocumentoVeicolo::findOrFail($documentId);
            
            if (!$document->file_path) {
                return response()->json(['error' => 'File non trovato'], 404);
            }

            // Prova entrambi i percorsi: private e public
            $possiblePaths = [
                storage_path('app/' . $document->file_path),              // Path diretto (private/...)
                storage_path('app/private/' . $document->file_path),      // Con prefix private
                storage_path('app/public/' . $document->file_path),       // Con prefix public
            ];

            $filePath = null;
            foreach ($possiblePaths as $path) {
                if (file_exists($path)) {
                    $filePath = $path;
                    break;
                }
            }
            
            // Verifica se il file esiste
            if (!$filePath) {
                return response()->json([
                    'error' => 'File non trovato sul server',
                    'debug' => [
                        'document_id' => $documentId,
                        'file_path_db' => $document->file_path,
                        'tried_paths' => $possiblePaths
                    ]
                ], 404);
            }

            // Determina il MIME type
            $mimeType = mime_content_type($filePath);
            $fileName = basename($document->file_path);

            // Restituisci il file con headers corretti
            return response()->file($filePath, [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'inline; filename="' . $fileName . '"',
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Expose-Headers' => 'Content-Disposition',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Errore nel download del documento',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
