<?php

namespace App\Http\Controllers;

use App\Models\Site;
use Illuminate\Http\Request;

class SiteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $sites = Site::with(['client', 'activities'])->get();
        
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
        $site->load(['client', 'activities']);
        
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
}
