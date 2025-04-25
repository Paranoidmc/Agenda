<?php

namespace App\Http\Controllers;

use App\Models\Site;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SiteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $perPage = $request->input('perPage', 25);
        $search = $request->input('search');
        $query = Site::with('client');

        // Ricerca base su nome, città, indirizzo, cliente
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('city', 'like', "%$search%")
                  ->orWhere('address', 'like', "%$search%")
                  ->orWhere('province', 'like', "%$search%")
                  ->orWhere('postal_code', 'like', "%$search%")
                  ->orWhere('notes', 'like', "%$search%")
                ;
            });
        }

        // Solo i campi necessari
        $fields = [
            'id', 'name', 'address', 'city', 'postal_code', 'province', 'client_id', 'phone', 'email', 'notes'
        ];

        $sites = $query->orderBy('name')->paginate($perPage);

        // Mappa i campi in italiano per ogni sede
        $sites->getCollection()->transform(function ($site) {
            $site->nome = $site->name;
            $site->indirizzo = $site->address;
            $site->citta = $site->city;
            $site->cap = $site->postal_code;
            $site->provincia = $site->province;
            $site->telefono = $site->phone;
            $site->note = $site->notes;
            // Campi cliente
            if ($site->client) {
                $site->client->nome = $site->client->name;
                $site->client->indirizzo = $site->client->address;
                $site->client->citta = $site->client->city;
                $site->client->cap = $site->client->postal_code;
                $site->client->provincia = $site->client->province;
                $site->client->telefono = $site->client->phone;
                $site->client->partita_iva = $site->client->vat_number;
                $site->client->codice_fiscale = $site->client->fiscal_code;
                $site->client->note = $site->client->notes;
            }
            return $site;
        });

        return response()->json($sites);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'address' => 'sometimes|required|string|max:255',
            'city' => 'sometimes|required|string|max:100',
            'postal_code' => 'nullable|string|max:10',
            'province' => 'nullable|string|max:50',
            'client_id' => 'required|exists:clients,id',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|max:20',
            // Campi in italiano
            'nome' => 'sometimes|required|string|max:255',
            'indirizzo' => 'sometimes|required|string|max:255',
            'citta' => 'sometimes|required|string|max:100',
            'cap' => 'nullable|string|max:10',
            'provincia' => 'nullable|string|max:50',
            'telefono' => 'nullable|string|max:20',
            'note' => 'nullable|string',
        ]);

        // Map Italian field names to English field names
        $data = [];
        
        // Prioritize English fields, but use Italian if English is not provided
        $data['name'] = $validated['name'] ?? $validated['nome'] ?? null;
        $data['address'] = $validated['address'] ?? $validated['indirizzo'] ?? null;
        $data['city'] = $validated['city'] ?? $validated['citta'] ?? null;
        $data['postal_code'] = $validated['postal_code'] ?? $validated['cap'] ?? null;
        $data['province'] = $validated['province'] ?? $validated['provincia'] ?? null;
        $data['client_id'] = $validated['client_id'];
        $data['phone'] = $validated['phone'] ?? $validated['telefono'] ?? null;
        $data['notes'] = $validated['notes'] ?? $validated['note'] ?? null;
        
        // Fields that only exist in English
        if (isset($validated['email'])) $data['email'] = $validated['email'];
        if (isset($validated['status'])) $data['status'] = $validated['status'];

        $site = Site::create($data);
        
        // Aggiungiamo i campi in italiano
        $site->nome = $site->name;
        $site->indirizzo = $site->address;
        $site->citta = $site->city;
        $site->cap = $site->postal_code;
        $site->provincia = $site->province;
        $site->telefono = $site->phone;
        $site->note = $site->notes;
        
        return response()->json($site, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Site $site)
    {
        $site->load(['client', 'activities' => function($query) {
            $query->with(['driver', 'vehicle', 'activityType']);
        }]);
        
        // Aggiungiamo i campi in italiano
        $site->nome = $site->name;
        $site->indirizzo = $site->address;
        $site->citta = $site->city;
        $site->cap = $site->postal_code;
        $site->provincia = $site->province;
        $site->telefono = $site->phone;
        $site->note = $site->notes;
        
        // Aggiungiamo i campi in italiano per il cliente
        if ($site->client) {
            $site->client->nome = $site->client->name;
            $site->client->indirizzo = $site->client->address;
            $site->client->citta = $site->client->city;
            $site->client->cap = $site->client->postal_code;
            $site->client->provincia = $site->client->province;
            $site->client->telefono = $site->client->phone;
            $site->client->partita_iva = $site->client->vat_number;
            $site->client->codice_fiscale = $site->client->fiscal_code;
            $site->client->note = $site->client->notes;
        }
        
        // Aggiungiamo i campi in italiano per le attività
        $site->activities = $site->activities->map(function ($activity) {
            // Aggiungiamo i campi in italiano
            $activity->titolo = $activity->title ?? '';
            $activity->descrizione = $activity->description ?? '';
            $activity->data_inizio = $activity->date;
            $activity->data_fine = $activity->date;
            $activity->stato = $activity->status;
            $activity->note = $activity->notes;
            
            // Aggiungiamo i campi in italiano per l'autista
            if ($activity->driver) {
                $activity->driver->nome = $activity->driver->name;
                $activity->driver->cognome = $activity->driver->surname;
                $activity->driver->telefono = $activity->driver->phone;
            }
            
            // Aggiungiamo i campi in italiano per il veicolo
            if ($activity->vehicle) {
                $activity->vehicle->targa = $activity->vehicle->plate;
                $activity->vehicle->modello = $activity->vehicle->model;
                $activity->vehicle->marca = $activity->vehicle->brand;
            }
            
            // Aggiungiamo i campi in italiano per il tipo di attività
            if ($activity->activityType) {
                $activity->activityType->nome = $activity->activityType->name;
                $activity->activityType->descrizione = $activity->activityType->description;
                $activity->activityType->colore = $activity->activityType->color;
            }
            
            return $activity;
        });
        
        return response()->json($site);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Site $site)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'address' => 'sometimes|required|string|max:255',
            'city' => 'sometimes|required|string|max:100',
            'postal_code' => 'nullable|string|max:10',
            'province' => 'nullable|string|max:50',
            'client_id' => 'sometimes|required|exists:clients,id',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|max:20',
            // Campi in italiano
            'nome' => 'sometimes|required|string|max:255',
            'indirizzo' => 'sometimes|required|string|max:255',
            'citta' => 'sometimes|required|string|max:100',
            'cap' => 'nullable|string|max:10',
            'provincia' => 'nullable|string|max:50',
            'telefono' => 'nullable|string|max:20',
            'note' => 'nullable|string',
        ]);

        // Map Italian field names to English field names
        $data = [];
        
        // Prioritize English fields, but use Italian if English is not provided
        if (isset($validated['name']) || isset($validated['nome'])) {
            $data['name'] = $validated['name'] ?? $validated['nome'];
        }
        
        if (isset($validated['address']) || isset($validated['indirizzo'])) {
            $data['address'] = $validated['address'] ?? $validated['indirizzo'];
        }
        
        if (isset($validated['city']) || isset($validated['citta'])) {
            $data['city'] = $validated['city'] ?? $validated['citta'];
        }
        
        if (isset($validated['postal_code']) || isset($validated['cap'])) {
            $data['postal_code'] = $validated['postal_code'] ?? $validated['cap'];
        }
        
        if (isset($validated['province']) || isset($validated['provincia'])) {
            $data['province'] = $validated['province'] ?? $validated['provincia'];
        }
        
        if (isset($validated['client_id'])) {
            $data['client_id'] = $validated['client_id'];
        }
        
        if (isset($validated['phone']) || isset($validated['telefono'])) {
            $data['phone'] = $validated['phone'] ?? $validated['telefono'];
        }
        
        if (isset($validated['notes']) || isset($validated['note'])) {
            $data['notes'] = $validated['notes'] ?? $validated['note'];
        }
        
        // Fields that only exist in English
        if (isset($validated['email'])) $data['email'] = $validated['email'];
        if (isset($validated['status'])) $data['status'] = $validated['status'];

        $site->update($data);
        
        // Aggiungiamo i campi in italiano
        $site->nome = $site->name;
        $site->indirizzo = $site->address;
        $site->citta = $site->city;
        $site->cap = $site->postal_code;
        $site->provincia = $site->province;
        $site->telefono = $site->phone;
        $site->note = $site->notes;
        
        return response()->json($site);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Site $site)
    {
        $site->delete();
        return response()->json(null, 204);
    }
    
    /**
     * Get all sites for a specific client
     */
    public function getClientSites($clientId)
    {
        // Log per debug
        Log::info('Richiesta sedi per cliente', [
            'client_id' => $clientId,
            'headers' => request()->headers->all(),
            'ip' => request()->ip()
        ]);
        
        // Verifica se il client_id è valido
        $clientExists = \App\Models\Client::where('id', $clientId)->exists();
        
        if (!$clientExists) {
            Log::warning('Cliente non trovato', ['client_id' => $clientId]);
            return response()->json(['error' => 'Cliente non trovato'], 404);
        }
        
        $query = Site::where('client_id', $clientId);
        
        // Log della query per debug
        Log::info('Query sedi', [
            'query_sql' => $query->toSql(),
            'query_bindings' => $query->getBindings()
        ]);
        
        $sites = $query->get();
        
        // Log del risultato
        Log::info('Sedi trovate per il cliente', [
            'client_id' => $clientId,
            'count' => $sites->count()
        ]);
        
        // Aggiungiamo i campi in italiano per ogni sede
        $sites = $sites->map(function ($site) {
            // Aggiungiamo i campi in italiano
            $site->nome = $site->name;
            $site->indirizzo = $site->address;
            $site->citta = $site->city;
            $site->cap = $site->postal_code;
            $site->provincia = $site->province;
            $site->telefono = $site->phone;
            $site->note = $site->notes;
            
            return $site;
        });
        
        return response()->json($sites);
    }
}
