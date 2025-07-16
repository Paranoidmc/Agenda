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
        Log::info('ActivityController: Richiesta ricevuta', [
            'parametri' => $request->all(),
            'user' => $request->user() ? $request->user()->id : 'non autenticato',
        ]);

        $query = Activity::with(['client', 'resources.driver', 'resources.vehicle', 'site', 'activityType']);
        
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
        $query->with(['client', 'resources.driver', 'resources.vehicle', 'site', 'activityType']);
        
        $sql = $query->toSql();
        $bindings = $query->getBindings();
        Log::info('ActivityController: Query SQL (prima della paginazione)', [
            'sql' => $sql,
            'bindings' => $bindings
        ]);

        $activities = $query->orderBy('data_inizio', 'desc')->paginate($perPage);

        Log::info('ActivityController: Risultati dopo paginazione', [
            'total' => $activities->total(),
            'count_items_current_page' => count($activities->items()),
        ]);

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

            // Mappa 'notes' a 'note' per il frontend
            $activity->note = $activity->notes;

            return $activity;
        });
        
        return response()->json($activities);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
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
