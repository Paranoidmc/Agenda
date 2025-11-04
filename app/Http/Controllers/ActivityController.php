<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class ActivityController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Log::info('ActivityController: Richiesta ricevuta', [
            'parametri' => $request->all(),
            'user' => $request->user() ? $request->user()->id : 'non autenticato',
        ]);

                $query = Activity::with(['client', 'resources.driver', 'resources.vehicle', 'site.client', 'activityType', 'resources']);
        
        // Filtraggio per data singola (giorno intero) se passato 'date' (YYYY-MM-DD)
        if ($request->filled('date')) {
            $day = $request->input('date');
            Log::info('ActivityController: Filtraggio per giorno singolo', [
                'date' => $day,
            ]);
            $query->where('data_inizio', '<=', $day . ' 23:59:59')
                  ->where(function($q) use ($day) {
                      $q->whereNull('data_fine')
                        ->orWhere('data_fine', '>=', $day . ' 00:00:00');
                  });
        }

        // Filtraggio per intervallo date (inclusione se l'attività tocca anche solo parzialmente il range)
        if ($request->has('start_date') && $request->has('end_date')) {
            Log::info('ActivityController: Filtraggio per date applicato', [
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
            ]);
            $query->where('data_inizio', '<=', $request->end_date)
                  ->where('data_fine', '>=', $request->start_date);
        }
        
        // Filtraggio per cliente
        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        

        
        // Filtraggio per sede
        if ($request->has('site_id')) {
            $query->where('site_id', $request->site_id);
        }
        
        // Filtraggio per tipo di attività
        if ($request->has('activity_type_id')) {
            $query->where('activity_type_id', $request->activity_type_id);
        }
        
        // Filtraggio per stato
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        // PAGINAZIONE E RICERCA
        $perPage = $request->input('perPage', 25);
        $search = $request->input('search');
        
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('descrizione', 'like', "%$search%")
                  ->orWhere('notes', 'like', "%$search%")
                  ->orWhere('note', 'like', "%$search%")
                  ->orWhereHas('client', function ($sub) use ($search) {
                      $sub->where('name', 'like', "%$search%")
                          ->orWhere('address', 'like', "%$search%")
                          ->orWhere('city', 'like', "%$search%")
                          ->orWhere('province', 'like', "%$search%")
                          ->orWhere('postal_code', 'like', "%$search%")
                          ->orWhere('notes', 'like', "%$search%")
                          ;
                  })
                  ->orWhereHas('site', function ($sub) use ($search) {
                      $sub->where('name', 'like', "%$search%")
                          ->orWhere('address', 'like', "%$search%")
                          ->orWhere('city', 'like', "%$search%")
                          ->orWhere('province', 'like', "%$search%")
                          ->orWhere('postal_code', 'like', "%$search%")
                          ->orWhere('notes', 'like', "%$search%")
                          ;
                  })
                  ;
            });
        }
        
        // Carica le relazioni aggiornate
        // $query->with(['client', 'resources.driver', 'resources.vehicle', 'site.client', 'activityType']); // Rimosso perché già caricato sopra
        
        $sql = $query->toSql();
        $bindings = $query->getBindings();
        Log::info('ActivityController: Query SQL (prima della paginazione)', [
            'sql' => $sql,
            'bindings' => $bindings
        ]);

        // Conteggio totale prima della paginazione per debug
        $totalBeforePaginate = $query->count();
        Log::info('ActivityController: Totale attività prima paginazione', [
            'total' => $totalBeforePaginate,
            'filters' => [
                'date' => $request->input('date'),
                'start_date' => $request->input('start_date'),
                'end_date' => $request->input('end_date'),
                'search' => $request->input('search'),
            ]
        ]);

        $activities = $query->orderBy('data_inizio', 'desc')->paginate($perPage);

        Log::info('ActivityController: Risultati dopo paginazione', [
            'total' => $activities->total(),
            'count_items_current_page' => count($activities->items()),
            'current_page' => $activities->currentPage(),
            'per_page' => $perPage,
            'first_item_id' => count($activities->items()) > 0 ? $activities->items()[0]->id : null,
        ]);

        // Debug: verifica che le relazioni resources siano caricate
        if ($activities->items()) {
            $firstActivity = $activities->items()[0];
            Log::info('ActivityController: Debug prima attività', [
                'activity_id' => $firstActivity->id,
                'has_resources' => $firstActivity->relationLoaded('resources'),
                'resources_count' => $firstActivity->resources ? $firstActivity->resources->count() : 0,
                'resources_data' => $firstActivity->resources ? $firstActivity->resources->toArray() : null
            ]);
        }

        // Aggiungiamo i campi in italiano per ogni attività
        $activities->getCollection()->transform(function ($activity) {
            // Serializza data_inizio e data_fine
            if ($activity->data_inizio) {
                $activity->data_inizio = $activity->data_inizio instanceof \Carbon\Carbon
                    ? $activity->data_inizio->copy()->setTimezone('Europe/Rome')->format('Y-m-d\TH:i')
                    : (string) $activity->data_inizio;
            }
            if ($activity->data_fine) {
                $activity->data_fine = $activity->data_fine instanceof \Carbon\Carbon
                    ? $activity->data_fine->copy()->setTimezone('Europe/Rome')->format('Y-m-d\TH:i')
                    : (string) $activity->data_fine;
            }

            // Trasformazione dati cliente
            if ($activity->client) {
                $activity->client->nome = $activity->client->name;
                $activity->client->indirizzo = $activity->client->address;
            }

            // Popola i campi drivers e vehicles per retrocompatibilità con la UI attuale (temporaneo)
            $activity->drivers = $activity->resources->map(function ($resource) {
                if ($resource->driver) {
                    $resource->driver->nome = $resource->driver->name;
                    $resource->driver->cognome = $resource->driver->surname;
                    return $resource->driver;
                }
                return null;
            })->filter();

            $activity->vehicles = $activity->resources->map(function ($resource) {
                if ($resource->vehicle) {
                    $resource->vehicle->targa = $resource->vehicle->plate;
                    $resource->vehicle->modello = $resource->vehicle->model;
                    $resource->vehicle->marca = $resource->vehicle->brand;
                    return $resource->vehicle;
                }
                return null;
            })->filter();

            // Trasformazione dati sede
            if ($activity->site) {
                $activity->site->nome = $activity->site->name;
            }

            // Trasformazione dati tipo attività
            if ($activity->activityType) {
                $activity->activityType->nome = $activity->activityType->name;
            }

            // Aggiungiamo i campi autista e veicolo per la colonna Risorse
            $activity->autista = 'N/D';
            $activity->veicolo = 'N/D';
            
            if ($activity->resources && $activity->resources->isNotEmpty()) {
                $firstResource = $activity->resources->first();
                
                if ($firstResource->driver) {
                    $driver = $firstResource->driver;
                    $activity->autista = $driver->name . ' ' . $driver->surname;
                }
                
                if ($firstResource->vehicle) {
                    $vehicle = $firstResource->vehicle;
                    $vehicleName = $vehicle->name ?? $vehicle->model ?? $vehicle->brand ?? 'Veicolo';
                    $vehiclePlate = $vehicle->license_plate ?? $vehicle->targa ?? $vehicle->plate ?? '';
                    
                    if ($vehiclePlate) {
                        $activity->veicolo = $vehicleName . ' (' . $vehiclePlate . ')';
                    } else {
                        $activity->veicolo = $vehicleName;
                    }
                }
            }

            // Mappa 'notes' a 'note' per il frontend
            $activity->note = $activity->notes;
            
            // Assicurati che descrizione sia sempre presente (mappa da descrizione o description)
            if (!isset($activity->descrizione) && isset($activity->description)) {
                $activity->descrizione = $activity->description;
            } elseif (!isset($activity->description) && isset($activity->descrizione)) {
                $activity->description = $activity->descrizione;
            }
            
            // Assicurati che status sia sempre presente (mappa da status o stato)
            if (!isset($activity->status) && isset($activity->stato)) {
                $activity->status = $activity->stato;
            } elseif (!isset($activity->stato) && isset($activity->status)) {
                $activity->stato = $activity->status;
            }

            return $activity;
        });
        
        return response()->json($activities);
    }

    /**
     * Store a newly created resource in storage.
     */
     public function store(Request $request)
    {
        // $this->authorize('manage-activities');

        Log::info('ActivityController@store - Dati ricevuti', ['request_data' => $request->all()]);

        $validated = $request->validate([
            'descrizione' => 'nullable|string',
            'data_inizio' => 'required|date_format:Y-m-d\TH:i',
            'data_fine' => 'nullable|date_format:Y-m-d\TH:i|after_or_equal:data_inizio',
            'client_id' => 'required|exists:clients,id',
            'site_id' => 'required|exists:sites,id',
            'activity_type_id' => 'required|exists:activity_types,id',
            'status' => 'nullable|string|max:50',
            'note' => 'nullable|string',
            'resources' => 'nullable|array',
            'resources.*.driver_id' => 'required|exists:drivers,id',
            'resources.*.vehicle_id' => 'nullable|exists:vehicles,id',
        ]);

        try {
            $activityData = collect($validated)->except('resources')->toArray();
            
            // Mappa 'note' a 'notes' per il database
            if (isset($activityData['note'])) {
                $activityData['notes'] = $activityData['note'];
                unset($activityData['note']);
            }
            
            $resourcesData = $validated['resources'] ?? [];

            $activity = new Activity();
            $activity->syncResourcesAndSave($activityData, $resourcesData);

            $activity->load(['client', 'resources.driver', 'resources.vehicle', 'site', 'activityType']);

            // Mappa 'notes' a 'note' per il frontend
            $activity->note = $activity->notes;

            return response()->json($activity, 201);
        } catch (\Exception $e) {
            Log::error('Errore durante la creazione dell\'attività: ' . $e->getMessage());
            return response()->json(['message' => 'Errore interno del server.'], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Activity $activity)
    {
        $activity->load(['client', 'resources.driver', 'resources.vehicle', 'site', 'activityType']);
        
        // Mappa 'notes' a 'note' per il frontend
        $activity->note = $activity->notes;
        
        return response()->json($activity);
    }

    /**
     * Update the specified resource in storage.
     */
     public function update(Request $request, Activity $activity)
    {
        // $this->authorize('manage-activities');

        Log::info('ActivityController@update - Dati ricevuti', ['activity_id' => $activity->id, 'request_data' => $request->all()]);

        $validated = $request->validate([
            'descrizione' => 'nullable|string',
            'data_inizio' => 'sometimes|required|date_format:Y-m-d\TH:i',
            'data_fine' => 'nullable|date_format:Y-m-d\TH:i|after_or_equal:data_inizio',
            'client_id' => 'sometimes|required|exists:clients,id',
            'site_id' => 'sometimes|required|exists:sites,id',
            'activity_type_id' => 'sometimes|required|exists:activity_types,id',
            'status' => 'nullable|string|max:50',
            'note' => 'nullable|string',
            'resources' => 'nullable|array',
            'resources.*.driver_id' => 'required|exists:drivers,id',
            'resources.*.vehicle_id' => 'nullable|exists:vehicles,id',
        ]);

        try {
            $activityData = collect($validated)->except('resources')->toArray();
            
            // Mappa 'note' a 'notes' per il database
            if (isset($activityData['note'])) {
                $activityData['notes'] = $activityData['note'];
                unset($activityData['note']);
            }
            
            $resourcesData = $validated['resources'] ?? [];

            $activity->syncResourcesAndSave($activityData, $resourcesData);

            $activity->load(['client', 'resources.driver', 'resources.vehicle', 'site', 'activityType']);

            // Mappa 'notes' a 'note' per il frontend
            $activity->note = $activity->notes;

            return response()->json($activity);
        } catch (\Exception $e) {
            Log::error('Errore durante l\'aggiornamento dell\'attività: ' . $e->getMessage());
            return response()->json(['message' => 'Errore interno del server.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
     public function destroy(Activity $activity)
    {
        // $this->authorize('manage-activities');

        $activity->delete();
        return response()->json(null, 204);
    }
    
    /**
     * Get all activities for a specific site
     */
    public function getSiteActivities($siteId)
    {
        $activities = Activity::where('site_id', $siteId)
            ->with(['client', 'driver', 'vehicle', 'site.client', 'activityType'])
            ->get();
        
        return $this->formatActivitiesResponse($activities);
    }
    
    /**
     * Get all activities for a specific client
     */
    public function getClientActivities($clientId)
    {
        $activities = Activity::where('client_id', $clientId)
            ->with(['client', 'driver', 'vehicle', 'site.client', 'activityType'])
            ->get();
        
        return $this->formatActivitiesResponse($activities);
    }
    
    /**
     * Restituisce driver e veicoli disponibili per una data
     */
    public function getAvailableResources(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
        ]);
        $date = $request->date;

    // Recupera tutti i driver e veicoli
    $allDrivers = \App\Models\Driver::all();
    $allVehicles = \App\Models\Vehicle::all();

    // Trova le attività che si sovrappongono alla data specificata
    $activitiesOnDate = Activity::where('status', '!=', 'cancelled')
        ->where(function ($query) use ($date) {
            $query->where('data_inizio', '<=', $date . ' 23:59:59')
                  ->where('data_fine', '>=', $date . ' 00:00:00');
        })
        ->with(['drivers:id', 'vehicles:id']) // Carica solo gli ID delle relazioni
        ->get();

    // Estrai gli ID degli autisti e dei veicoli occupati dalle attività
    $busyDriverIds = $activitiesOnDate->flatMap(function ($activity) {
        return $activity->drivers->pluck('id');
    })->unique()->toArray();

    $busyVehicleIds = $activitiesOnDate->flatMap(function ($activity) {
        return $activity->vehicles->pluck('id');
    })->unique()->toArray();

    // Filtra driver disponibili
    $availableDrivers = $allDrivers->filter(function($driver) use ($busyDriverIds) {
        return !in_array($driver->id, $busyDriverIds);
    })->values();

    // Filtra veicoli disponibili
    $availableVehicles = $allVehicles->filter(function($vehicle) use ($busyVehicleIds) {
        return !in_array($vehicle->id, $busyVehicleIds);
    })->values();

    // Aggiungi i campi italiani
    $availableDrivers = $availableDrivers->map(function($driver) {
        $driver->nome = $driver->name;
        $driver->cognome = $driver->surname;
        return $driver;
    });
    $availableVehicles = $availableVehicles->map(function($vehicle) {
        $vehicle->targa = $vehicle->plate;
        $vehicle->marca = $vehicle->brand;
        $vehicle->modello = $vehicle->model;
        return $vehicle;
    });

    return response()->json([
        'drivers' => $availableDrivers,
        'vehicles' => $availableVehicles
    ]);
    }
    
    /**
     * Get all activities for a specific driver
     */
    public function getDriverActivities($driverId)
    {
        // Filtra le attività che hanno una risorsa con lo specifico driver
        $activities = Activity::whereHas('resources', function ($q) use ($driverId) {
                $q->where('driver_id', $driverId);
            })
            ->with(['client', 'resources.driver', 'resources.vehicle', 'site.client', 'activityType'])
            ->get();
        
        return $this->formatActivitiesResponse($activities);
    }
    
    /**
     * Get all activities for a specific vehicle
     */
    public function getVehicleActivities($vehicleId)
    {
        $activities = Activity::whereHas('vehicles', function ($q) use ($vehicleId) {
                $q->where('vehicles.id', $vehicleId);
            })
                        ->with(['client', 'resources.driver', 'resources.vehicle', 'site.client', 'activityType', 'vehicles'])
            ->get();
        
        return $this->formatActivitiesResponse($activities);
    }
    
    /**
     * Format activities response with Italian fields
     */
    private function formatActivitiesResponse($activities)
    {
        // Aggiungiamo i campi in italiano per ogni attività
        $activities = $activities->map(function ($activity) {
            // Aggiungiamo i campi in italiano
            $activity->titolo = $activity->title ?? '';
            $activity->descrizione = $activity->description ?? '';
            // Serializza data_inizio/data_fine in formato ISO Europe/Rome o stringa vuota
            if ($activity->data_inizio instanceof \Carbon\Carbon) {
                $activity->data_inizio = $activity->data_inizio->copy()->setTimezone('Europe/Rome')->format('Y-m-d\TH:i');
            } else {
                $activity->data_inizio = $activity->data_inizio ? (string) $activity->data_inizio : '';
            }
            if ($activity->data_fine instanceof \Carbon\Carbon) {
                $activity->data_fine = $activity->data_fine->copy()->setTimezone('Europe/Rome')->format('Y-m-d\TH:i');
            } else {
                $activity->data_fine = $activity->data_fine ? (string) $activity->data_fine : '';
            }
            $activity->stato = $activity->status;
            $activity->note = $activity->notes;
            
            // Aggiungiamo i campi in italiano per il cliente
            if ($activity->client) {
                $activity->client->nome = $activity->client->name;
                $activity->client->indirizzo = $activity->client->address;
                $activity->client->citta = $activity->client->city;
                $activity->client->cap = $activity->client->postal_code;
                $activity->client->provincia = $activity->client->province;
                $activity->client->telefono = $activity->client->phone;
                $activity->client->partita_iva = $activity->client->vat_number;
                $activity->client->codice_fiscale = $activity->client->fiscal_code;
                $activity->client->note = $activity->client->notes;
            }

            // Aggiungiamo i campi in italiano anche per il cliente del cantiere
            if ($activity->site) {
                // Se il cantiere ha un indirizzo, lo traduciamo
                if (isset($activity->site->address)) {
                    $activity->site->indirizzo = $activity->site->address;
                }
                // Manteniamo la logica per il cliente del cantiere, se esiste
                if ($activity->site->client) {
                    $activity->site->client->nome = $activity->site->client->name;
                    $activity->site->client->indirizzo = $activity->site->client->address;
                }
            }
            
            // Aggiungiamo i campi in italiano per autista e veicolo dalle risorse
            $activity->autista = 'N/D';
            $activity->veicolo = 'N/D';
            
            if ($activity->resources && $activity->resources->isNotEmpty()) {
                $firstResource = $activity->resources->first();
                
                if ($firstResource->driver) {
                    $driver = $firstResource->driver;
                    $activity->autista = $driver->name . ' ' . $driver->surname;
                    
                    // Aggiungiamo i campi in italiano per l'autista
                    $activity->driver_data = [
                        'nome' => $driver->name,
                        'cognome' => $driver->surname,
                        'telefono' => $driver->phone,
                        'indirizzo' => $driver->address,
                        'citta' => $driver->city,
                        'cap' => $driver->postal_code,
                        'provincia' => $driver->province,
                        'codice_fiscale' => $driver->fiscal_code,
                        'patente' => $driver->license_number,
                        'scadenza_patente' => $driver->license_expiry,
                        'note' => $driver->notes,
                    ];
                }
                
                if ($firstResource->vehicle) {
                    $vehicle = $firstResource->vehicle;
                    $activity->veicolo = $vehicle->name . ' (' . $vehicle->license_plate . ')';
                    
                    // Aggiungiamo i campi in italiano per il veicolo
                    $activity->vehicle_data = [
                        'targa' => $vehicle->license_plate,
                        'modello' => $vehicle->name,
                        'marca' => $vehicle->brand,
                        'colore' => $vehicle->color,
                        'anno' => $vehicle->year,
                        'tipo' => $vehicle->type,
                        'carburante' => $vehicle->fuel_type,
                        'km' => $vehicle->odometer,
                        'note' => $vehicle->notes,
                    ];
                }
            }
            
            // Aggiungiamo i campi in italiano per la sede
            if ($activity->site) {
                $activity->site->nome = $activity->site->name;
                $activity->site->indirizzo = $activity->site->address;
                $activity->site->citta = $activity->site->city;
                $activity->site->cap = $activity->site->postal_code;
                $activity->site->provincia = $activity->site->province;
                $activity->site->note = $activity->site->notes;
            }
            
            // Aggiungiamo i campi in italiano per il tipo di attività
            if ($activity->activityType) {
                $activity->activityType->nome = $activity->activityType->name;
                $activity->activityType->descrizione = $activity->activityType->description;
                $activity->activityType->colore = $activity->activityType->color;
            }
            
            return $activity;
        });
        
        return response()->json($activities);
    }

    /**
     * Allega un documento a un'attività
     */
    public function attachDocument(Request $request)
    {
        try {
            $request->validate([
                'activity_id' => 'required|integer|exists:activities,id',
                'document_id' => 'required|integer|exists:documenti,id'
            ]);

            $activityId = $request->input('activity_id');
            $documentId = $request->input('document_id');

            Log::info('Allegando documento all\'attività', [
                'activity_id' => $activityId,
                'document_id' => $documentId
            ]);

            // Verifica che l'attività esista
            $activity = Activity::find($activityId);
            if (!$activity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Attività non trovata'
                ], 404);
            }

            // Verifica che il documento esista
            $document = \App\Models\Documento::find($documentId);
            if (!$document) {
                return response()->json([
                    'success' => false,
                    'message' => 'Documento non trovato'
                ], 404);
            }

            // Verifica se il documento è già allegato a questa attività
            $existingAttachment = DB::table('activity_documents')
                ->where('activity_id', $activityId)
                ->where('document_id', $documentId)
                ->first();

            if ($existingAttachment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Documento già allegato a questa attività'
                ], 409);
            }

            // Allega il documento all'attività
            DB::table('activity_documents')->insert([
                'activity_id' => $activityId,
                'document_id' => $documentId,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Documento allegato con successo', [
                'activity_id' => $activityId,
                'document_id' => $documentId
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Documento allegato con successo all\'attività',
                'data' => [
                    'activity_id' => $activityId,
                    'document_id' => $documentId
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Dati non validi',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Errore nell\'allegare documento all\'attività', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Errore interno del server'
            ], 500);
        }
    }

    /**
     * Recupera i documenti allegati a un'attività
     */
    public function getAttachedDocuments($activityId)
    {
        try {
            // Verifica che l'attività esista
            $activity = Activity::find($activityId);
            if (!$activity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Attività non trovata'
                ], 404);
            }

            // Recupera i documenti allegati con le relazioni
            $documents = DB::table('activity_documents')
                ->join('documenti', 'activity_documents.document_id', '=', 'documenti.id')
                ->leftJoin('clients', 'documenti.client_id', '=', 'clients.id')
                ->leftJoin('sites', 'documenti.site_id', '=', 'sites.id')
                ->where('activity_documents.activity_id', $activityId)
                ->select(
                    'documenti.*',
                    'clients.name as cliente_name',
                    'sites.name as sede_name',
                    'sites.city as sede_city',
                    'activity_documents.created_at as attached_at'
                )
                ->orderBy('activity_documents.created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $documents,
                'count' => $documents->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Errore nel recupero documenti allegati', [
                'activity_id' => $activityId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Errore interno del server'
            ], 500);
        }
    }

    /**
     * Rimuove un documento allegato da un'attività
     */
    public function detachDocument($activityId, $documentId)
    {
        try {
            // Verifica che l'attività esista
            $activity = Activity::find($activityId);
            if (!$activity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Attività non trovata'
                ], 404);
            }

            // Verifica che l'associazione esista
            $existing = DB::table('activity_documents')
                ->where('activity_id', $activityId)
                ->where('document_id', $documentId)
                ->first();

            if (!$existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Allegato non trovato per questa attività'
                ], 404);
            }

            // Rimuovi dal pivot
            DB::table('activity_documents')
                ->where('activity_id', $activityId)
                ->where('document_id', $documentId)
                ->delete();

            return response()->json([
                'success' => true,
                'message' => 'Documento rimosso dall\'attività'
            ]);
        } catch (\Exception $e) {
            Log::error('Errore nella rimozione documento dall\'attività', [
                'activity_id' => $activityId,
                'document_id' => $documentId,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Errore interno del server'
            ], 500);
        }
    }
}
