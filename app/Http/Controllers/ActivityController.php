<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ActivityController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Activity::with(['client', 'driver', 'vehicle', 'site', 'activityType']);
        
        // Filtraggio per intervallo date (inclusione se l'attività tocca anche solo parzialmente il range)
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->where('data_inizio', '<=', $request->end_date)
                  ->where('data_fine', '>=', $request->start_date);
        }
        
        // Filtraggio per cliente
        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        
        // Filtraggio per autista
        if ($request->has('driver_id')) {
            $query->where('driver_id', $request->driver_id);
        }
        
        // Filtraggio per veicolo
        if ($request->has('vehicle_id')) {
            $query->where('vehicle_id', $request->vehicle_id);
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
        
        // Carica le relazioni senza specificare i campi
        $query->with(['client', 'driver', 'vehicle', 'site', 'activityType']);
        
        $activities = $query->orderBy('data_inizio', 'desc')->paginate($perPage);
        // Aggiungiamo i campi in italiano per ogni attività
        $activities->getCollection()->transform(function ($activity) {
            // Serializza data_inizio e data_fine con offset ISO8601 (Y-m-d\TH:i:sP)
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
            // Manteniamo solo i campi in italiano
            
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
            
            // Aggiungiamo i campi in italiano per l'autista
            if ($activity->driver) {
                $activity->driver->nome = $activity->driver->name;
                $activity->driver->cognome = $activity->driver->surname;
                $activity->driver->telefono = $activity->driver->phone;
                $activity->driver->indirizzo = $activity->driver->address;
                $activity->driver->citta = $activity->driver->city;
                $activity->driver->cap = $activity->driver->postal_code;
                $activity->driver->provincia = $activity->driver->province;
                $activity->driver->codice_fiscale = $activity->driver->fiscal_code;
                $activity->driver->patente = $activity->driver->license_number;
                $activity->driver->scadenza_patente = $activity->driver->license_expiry;
                $activity->driver->note = $activity->driver->notes;
            }
            
            // Aggiungiamo i campi in italiano per il veicolo
            if ($activity->vehicle) {
                $activity->vehicle->targa = $activity->vehicle->plate;
                $activity->vehicle->modello = $activity->vehicle->model;
                $activity->vehicle->marca = $activity->vehicle->brand;
                $activity->vehicle->colore = $activity->vehicle->color;
                $activity->vehicle->anno = $activity->vehicle->year;
                $activity->vehicle->tipo = $activity->vehicle->type;
                $activity->vehicle->carburante = $activity->vehicle->fuel_type;
                $activity->vehicle->km = $activity->vehicle->odometer;
                $activity->vehicle->note = $activity->vehicle->notes;
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
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Log::info('Raw request data for activity store:', $request->all()); // Log dati grezzi

        $validated = $request->validate([
    
            'descrizione' => 'nullable|string',
            'data_inizio' => 'required|date_format:Y-m-d\TH:i',
            'data_fine' => 'required|date_format:Y-m-d\TH:i|after_or_equal:data_inizio',
            'client_id' => 'required|exists:clients,id',
            'driver_id' => 'nullable|exists:drivers,id',
            'vehicle_id' => 'nullable|exists:vehicles,id',
            'site_id' => 'required|exists:sites,id',
            'activity_type_id' => 'required|exists:activity_types,id',
            'stato' => 'nullable|string|max:50',
            'note' => 'nullable|string',
            'time_slot' => 'nullable|string|in:morning,afternoon,full_day',
            'ora_inizio' => 'nullable|date_format:H:i',
            'ora_fine' => 'nullable|date_format:H:i|after:ora_inizio',
            'start_location' => 'nullable|string|max:255',
            'end_location' => 'nullable|string|max:255',
        ]);

        Log::info('Validated data for activity store:', $validated); // Log dati validati
        Log::info('Value of stato received:', ['stato' => $validated['stato'] ?? 'Not provided/Null']); // Log specifico per stato

        try {
            Log::info('Dati validati:', $validated);
            
            // Verifica se stiamo usando orari specifici o time slot
            $useSpecificTimes = isset($validated['ora_inizio']) && isset($validated['ora_fine']);
            
            // Prepara i dati per la creazione
            $data = [
                'descrizione' => $validated['descrizione'] ?? null,
                'data_inizio' => \Carbon\Carbon::createFromFormat('Y-m-d\TH:i', $validated['data_inizio']),
                'data_fine' => \Carbon\Carbon::createFromFormat('Y-m-d\TH:i', $validated['data_fine']),
                'driver_id' => $validated['driver_id'] ?? null,
                'vehicle_id' => $validated['vehicle_id'] ?? null,
                'client_id' => $validated['client_id'],
                'site_id' => $validated['site_id'],
                'activity_type_id' => $validated['activity_type_id'],
                'status' => $validated['status'] ?? $validated['stato'] ?? 'planned', // Accetta sia 'status' che 'stato', fallback 'planned'
                'start_location' => $validated['start_location'] ?? null, // Usa start_location
                'end_location' => $validated['end_location'] ?? null,   // Usa end_location
                'note' => $validated['note'] ?? null, // Usa solo 'note'
            ];

            // Se stiamo usando orari specifici, aggiungili
            if ($useSpecificTimes) {
                $data['ora_inizio'] = $validated['ora_inizio'];
                $data['ora_fine'] = $validated['ora_fine'];
            }

            Log::info('Data before create:', $data); // Log prima della creazione

            // Verifica l'esistenza dei record prima di procedere
            $driver = isset($validated['driver_id']) ? \App\Models\Driver::find($validated['driver_id']) : null;
            $vehicle = isset($validated['vehicle_id']) ? \App\Models\Vehicle::find($validated['vehicle_id']) : null;
            $client = \App\Models\Client::find($validated['client_id']);
            $site = \App\Models\Site::find($validated['site_id']);
            $activityType = \App\Models\ActivityType::find($validated['activity_type_id']);

            
            if (!$client) {
                throw new \Exception("Cliente non trovato");
            }
            if (!$site) {
                throw new \Exception("Sede non trovata");
            }
            if (!$activityType) {
                throw new \Exception("Tipo di attività non trovato");
            }

            // Crea l'attività
            $activity = Activity::create($data);
            
            // Carica solo le relazioni che esistono
            try {
                $activity->load(['client', 'driver', 'vehicle', 'site', 'activityType']);
            } catch (\Exception $e) {
                Log::error('Errore nel caricamento delle relazioni: ' . $e->getMessage());
                $activity->load(['client', 'driver', 'vehicle', 'activityType']);
            }
            
            return response()->json($activity, 201);
        } catch (\Exception $e) {
            Log::error('Errore durante la creazione dell\'attività: ' . $e->getMessage());
            
            // Gestione specifica dei conflitti di pianificazione
            if (strpos($e->getMessage(), "L'autista è già impegnato") !== false) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'errors' => [
                        'driver_id' => ["L'autista selezionato è già impegnato in questa fascia oraria."]
                    ]
                ], 422);
            }
            
            // Gestione degli altri errori
            return response()->json([
                'message' => "Si è verificato un errore durante il salvataggio dell'attività.",
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Activity $activity)
    {
        // Carica le relazioni senza specificare i campi
        $activity->load(['client', 'driver', 'vehicle', 'site', 'activityType']);
        
        // Serializza data_inizio e data_fine con offset ISO8601 (Y-m-d\TH:i:sP)
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
        // Aggiungiamo i campi in inglese (per compatibilità)
        $activity->title = $activity->titolo ?? '';
        $activity->description = $activity->descrizione ?? '';
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
        
        // Aggiungiamo i campi in italiano per l'autista
        if ($activity->driver) {
            $activity->driver->nome = $activity->driver->name;
            $activity->driver->cognome = $activity->driver->surname;
            $activity->driver->telefono = $activity->driver->phone;
            $activity->driver->indirizzo = $activity->driver->address;
            $activity->driver->citta = $activity->driver->city;
            $activity->driver->cap = $activity->driver->postal_code;
            $activity->driver->provincia = $activity->driver->province;
            $activity->driver->codice_fiscale = $activity->driver->fiscal_code;
            $activity->driver->patente = $activity->driver->license_number;
            $activity->driver->scadenza_patente = $activity->driver->license_expiry;
            $activity->driver->note = $activity->driver->notes;
        }
        
        // Aggiungiamo i campi in italiano per il veicolo
        if ($activity->vehicle) {
            $activity->vehicle->targa = $activity->vehicle->plate;
            $activity->vehicle->modello = $activity->vehicle->model;
            $activity->vehicle->marca = $activity->vehicle->brand;
            $activity->vehicle->colore = $activity->vehicle->color;
            $activity->vehicle->anno = $activity->vehicle->year;
            $activity->vehicle->tipo = $activity->vehicle->type;
            $activity->vehicle->carburante = $activity->vehicle->fuel_type;
            $activity->vehicle->km = $activity->vehicle->odometer;
            $activity->vehicle->note = $activity->vehicle->notes;
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
        
        return response()->json($activity)->header('Cache-Control', 'no-store');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Activity $activity)
    {
        \Log::info('ActivityController@update - dati ricevuti', ['all' => $request->all()]);
        $validated = $request->validate([
    
            'descrizione' => 'nullable|string',
            'data_inizio' => 'sometimes|required|date_format:Y-m-d\TH:i',
            'data_fine' => 'sometimes|required|date_format:Y-m-d\TH:i|after_or_equal:data_inizio',
            'client_id' => 'sometimes|required|exists:clients,id',
            'driver_id' => 'sometimes|required|exists:drivers,id',
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'site_id' => 'sometimes|required|exists:sites,id',
            'activity_type_id' => 'sometimes|required|exists:activity_types,id',
            'stato' => 'nullable|string|max:50',
            'note' => 'nullable|string',
            'time_slot' => 'nullable|string|in:morning,afternoon,full_day',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'start_location' => 'nullable|string|max:255',
            'end_location' => 'nullable|string|max:255',
            'km_inizio' => 'nullable|numeric',
            'km_fine' => 'nullable|numeric|gte:km_inizio',
        ]);

        // Map Italian field names to English field names
        $data = [];
        // Gestione coerente status
        if ($request->has('status')) {
            $data['status'] = strtolower($request->input('status'));
        }
        
        if (isset($validated['data_inizio'])) {
            $data['data_inizio'] = \Carbon\Carbon::createFromFormat('Y-m-d\TH:i', $validated['data_inizio']);
        }
        if (isset($validated['data_fine'])) {
            $data['data_fine'] = \Carbon\Carbon::createFromFormat('Y-m-d\TH:i', $validated['data_fine']);
        }
        
        if (isset($validated['driver_id'])) {
            $data['driver_id'] = $validated['driver_id'];
        }
        
        if (isset($validated['vehicle_id'])) {
            $data['vehicle_id'] = $validated['vehicle_id'];
        }
        
        if (isset($validated['client_id'])) {
            $data['client_id'] = $validated['client_id'];
        }
        
        if (isset($validated['site_id'])) {
            $data['site_id'] = $validated['site_id'];
        }
        
        if (isset($validated['end_location'])) {
            $data['end_location'] = $validated['end_location'];
        }
        
        if (isset($validated['note'])) {
            $data['notes'] = $validated['note'];
            $data['note'] = $validated['note'];
        }
        
        if (isset($validated['titolo'])) {
            $data['titolo'] = $validated['titolo'];
        }
        
        if (isset($validated['descrizione'])) {
            $data['descrizione'] = $validated['descrizione'];
        }

        try {
            $activity->update($data);
            $activity->load(['client', 'driver', 'vehicle', 'site', 'activityType']);
            // Risposta coerente: status sempre minuscolo
            $activity->status = strtolower($activity->status);
            return response()->json($activity);
        } catch (\Exception $e) {
            \Log::error('ActivityController@update - Errore durante update', [
                'message' => $e->getMessage(),
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'data' => $data,
            ]);
            // Check if it's a scheduling conflict
            if (strpos($e->getMessage(), "L'autista è già impegnato") !== false) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'errors' => [
                        'driver_id' => ["L'autista selezionato è già impegnato in questa fascia oraria."]
                    ]
                ], 422);
            } elseif (strpos($e->getMessage(), "Il veicolo è già impegnato") !== false) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'errors' => [
                        'vehicle_id' => ["Il veicolo selezionato è già impegnato in questa fascia oraria."]
                    ]
                ], 422);
            }
            
            // For other exceptions, return a 500 error
            return response()->json([
                'message' => 'Si è verificato un errore durante l\'aggiornamento dell\'attività.',
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTrace()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Activity $activity)
    {
        $activity->delete();
        return response()->json(null, 204);
    }
    
    /**
     * Get all activities for a specific site
     */
    public function getSiteActivities($siteId)
    {
        $activities = Activity::where('site_id', $siteId)
            ->with(['client', 'driver', 'vehicle', 'site', 'activityType'])
            ->get();
        
        return $this->formatActivitiesResponse($activities);
    }
    
    /**
     * Get all activities for a specific client
     */
    public function getClientActivities($clientId)
    {
        $activities = Activity::where('client_id', $clientId)
            ->with(['client', 'driver', 'vehicle', 'site', 'activityType'])
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

    // Trova driver occupati per la data specificata
    $busyDriverIds = Activity::whereDate('data_inizio', $date)
        ->where('status', '!=', 'cancelled')
        ->pluck('driver_id')
        ->toArray();

    // Trova veicoli occupati per la data specificata
    $busyVehicleIds = Activity::whereDate('data_inizio', $date)
        ->where('status', '!=', 'cancelled')
        ->pluck('vehicle_id')
        ->toArray();

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
        $activities = Activity::where('driver_id', $driverId)
            ->with(['client', 'driver', 'vehicle', 'site', 'activityType'])
            ->get();
        
        return $this->formatActivitiesResponse($activities);
    }
    
    /**
     * Get all activities for a specific vehicle
     */
    public function getVehicleActivities($vehicleId)
    {
        $activities = Activity::where('vehicle_id', $vehicleId)
            ->with(['client', 'driver', 'vehicle', 'site', 'activityType'])
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
            
            // Aggiungiamo i campi in italiano per l'autista
            if ($activity->driver) {
                $activity->driver->nome = $activity->driver->name;
                $activity->driver->cognome = $activity->driver->surname;
                $activity->driver->telefono = $activity->driver->phone;
                $activity->driver->indirizzo = $activity->driver->address;
                $activity->driver->citta = $activity->driver->city;
                $activity->driver->cap = $activity->driver->postal_code;
                $activity->driver->provincia = $activity->driver->province;
                $activity->driver->codice_fiscale = $activity->driver->fiscal_code;
                $activity->driver->patente = $activity->driver->license_number;
                $activity->driver->scadenza_patente = $activity->driver->license_expiry;
                $activity->driver->note = $activity->driver->notes;
            }
            
            // Aggiungiamo i campi in italiano per il veicolo
            if ($activity->vehicle) {
                $activity->vehicle->targa = $activity->vehicle->plate;
                $activity->vehicle->modello = $activity->vehicle->model;
                $activity->vehicle->marca = $activity->vehicle->brand;
                $activity->vehicle->colore = $activity->vehicle->color;
                $activity->vehicle->anno = $activity->vehicle->year;
                $activity->vehicle->tipo = $activity->vehicle->type;
                $activity->vehicle->carburante = $activity->vehicle->fuel_type;
                $activity->vehicle->km = $activity->vehicle->odometer;
                $activity->vehicle->note = $activity->vehicle->notes;
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
}
