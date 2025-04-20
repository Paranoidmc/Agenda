<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $activities = Activity::with(['client', 'driver', 'vehicle', 'site', 'activityType'])->get();
        
        // Aggiungiamo i campi in italiano per ogni attività
        $activities = $activities->map(function ($activity) {
            // Aggiungiamo i campi in italiano
            $activity->titolo = $activity->title ?? '';
            $activity->descrizione = $activity->description ?? '';
            $activity->data_inizio = $activity->date;
            $activity->data_fine = $activity->date;
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
                $activity->site->telefono = $activity->site->phone;
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
        $validated = $request->validate([
            'titolo' => 'required|string|max:255',
            'descrizione' => 'nullable|string',
            'data_inizio' => 'required|date',
            'data_fine' => 'required|date|after_or_equal:data_inizio',
            'client_id' => 'required|exists:clients,id',
            'driver_id' => 'required|exists:drivers,id',
            'vehicle_id' => 'required|exists:vehicles,id',
            'site_id' => 'required|exists:sites,id',
            'activity_type_id' => 'required|exists:activity_types,id',
            'stato' => 'nullable|string|max:50',
            'note' => 'nullable|string',
            'time_slot' => 'nullable|string|in:morning,afternoon,full_day',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'start_location' => 'nullable|string|max:255',
            'end_location' => 'nullable|string|max:255',
        ]);

        // Map Italian field names to English field names
        $data = [
            'date' => $validated['data_inizio'],
            'time_slot' => $validated['time_slot'] ?? 'full_day',
            'start_time' => $validated['start_time'] ?? null,
            'end_time' => $validated['end_time'] ?? null,
            'driver_id' => $validated['driver_id'],
            'vehicle_id' => $validated['vehicle_id'],
            'client_id' => $validated['client_id'],
            'site_id' => $validated['site_id'],
            'activity_type_id' => $validated['activity_type_id'],
            'status' => $validated['stato'] ?? 'planned',
            'start_location' => $validated['start_location'] ?? null,
            'end_location' => $validated['end_location'] ?? null,
            'notes' => $validated['note'] ?? null,
            // Keep the Italian fields too for compatibility
            'titolo' => $validated['titolo'],
            'descrizione' => $validated['descrizione'] ?? null,
            'data_inizio' => $validated['data_inizio'],
            'data_fine' => $validated['data_fine'],
            'stato' => $validated['stato'] ?? 'planned',
            'note' => $validated['note'] ?? null,
        ];

        $activity = Activity::create($data);
        $activity->load(['client', 'driver', 'vehicle', 'site', 'activityType']);
        return response()->json($activity, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Activity $activity)
    {
        $activity->load(['client', 'driver', 'vehicle', 'site', 'activityType']);
        
        // Aggiungiamo i campi in italiano
        $activity->titolo = $activity->title ?? '';
        $activity->descrizione = $activity->description ?? '';
        $activity->data_inizio = $activity->date;
        $activity->data_fine = $activity->date;
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
            $activity->site->telefono = $activity->site->phone;
            $activity->site->note = $activity->site->notes;
        }
        
        // Aggiungiamo i campi in italiano per il tipo di attività
        if ($activity->activityType) {
            $activity->activityType->nome = $activity->activityType->name;
            $activity->activityType->descrizione = $activity->activityType->description;
            $activity->activityType->colore = $activity->activityType->color;
        }
        
        return response()->json($activity);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Activity $activity)
    {
        $validated = $request->validate([
            'titolo' => 'sometimes|required|string|max:255',
            'descrizione' => 'nullable|string',
            'data_inizio' => 'sometimes|required|date',
            'data_fine' => 'sometimes|required|date|after_or_equal:data_inizio',
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
        ]);

        // Map Italian field names to English field names
        $data = [];
        
        if (isset($validated['data_inizio'])) {
            $data['date'] = $validated['data_inizio'];
            $data['data_inizio'] = $validated['data_inizio'];
        }
        
        if (isset($validated['data_fine'])) {
            $data['data_fine'] = $validated['data_fine'];
        }
        
        if (isset($validated['time_slot'])) {
            $data['time_slot'] = $validated['time_slot'];
        }
        
        if (isset($validated['start_time'])) {
            $data['start_time'] = $validated['start_time'];
        }
        
        if (isset($validated['end_time'])) {
            $data['end_time'] = $validated['end_time'];
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
        
        if (isset($validated['activity_type_id'])) {
            $data['activity_type_id'] = $validated['activity_type_id'];
        }
        
        if (isset($validated['stato'])) {
            $data['status'] = $validated['stato'];
            $data['stato'] = $validated['stato'];
        }
        
        if (isset($validated['start_location'])) {
            $data['start_location'] = $validated['start_location'];
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

        $activity->update($data);
        $activity->load(['client', 'driver', 'vehicle', 'site', 'activityType']);
        return response()->json($activity);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Activity $activity)
    {
        $activity->delete();
        return response()->json(null, 204);
    }
}
