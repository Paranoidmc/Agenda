<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $clients = Client::with(['activities', 'sites'])->get();
        
        // Aggiungiamo i campi in italiano per ogni cliente
        $clients = $clients->map(function ($client) {
            $client->nome = $client->name;
            $client->indirizzo = $client->address;
            $client->citta = $client->city;
            $client->cap = $client->postal_code;
            $client->provincia = $client->province;
            $client->telefono = $client->phone;
            $client->partita_iva = $client->vat_number;
            $client->codice_fiscale = $client->fiscal_code;
            $client->note = $client->notes;
            return $client;
        });
        
        return response()->json($clients);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nome' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'telefono' => 'nullable|string|max:20',
            'indirizzo' => 'nullable|string|max:255',
            'citta' => 'nullable|string|max:255',
            'cap' => 'nullable|string|max:20',
            'provincia' => 'nullable|string|max:50',
            'partita_iva' => 'nullable|string|max:50',
            'codice_fiscale' => 'nullable|string|max:50',
            'note' => 'nullable|string',
        ]);

        // Map Italian field names to English field names
        $data = [
            'name' => $validated['nome'],
            'email' => $validated['email'],
            'phone' => $validated['telefono'] ?? null,
            'address' => $validated['indirizzo'] ?? null,
            'city' => $validated['citta'] ?? null,
            'postal_code' => $validated['cap'] ?? null,
            'province' => $validated['provincia'] ?? null,
            'vat_number' => $validated['partita_iva'] ?? null,
            'fiscal_code' => $validated['codice_fiscale'] ?? null,
            'notes' => $validated['note'] ?? null,
        ];

        $client = Client::create($data);
        
        // Aggiungiamo i campi in italiano
        $client->nome = $client->name;
        $client->indirizzo = $client->address;
        $client->citta = $client->city;
        $client->cap = $client->postal_code;
        $client->provincia = $client->province;
        $client->telefono = $client->phone;
        $client->partita_iva = $client->vat_number;
        $client->codice_fiscale = $client->fiscal_code;
        $client->note = $client->notes;
        
        return response()->json($client, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Client $client)
    {
        $client->load(['activities', 'sites']);
        
        // Aggiungiamo i campi in italiano
        $client->nome = $client->name;
        $client->indirizzo = $client->address;
        $client->citta = $client->city;
        $client->cap = $client->postal_code;
        $client->provincia = $client->province;
        $client->telefono = $client->phone;
        $client->partita_iva = $client->vat_number;
        $client->codice_fiscale = $client->fiscal_code;
        $client->note = $client->notes;
        
        return response()->json($client);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Client $client)
    {
        $validated = $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255',
            'telefono' => 'nullable|string|max:20',
            'indirizzo' => 'nullable|string|max:255',
            'citta' => 'nullable|string|max:255',
            'cap' => 'nullable|string|max:20',
            'provincia' => 'nullable|string|max:50',
            'partita_iva' => 'nullable|string|max:50',
            'codice_fiscale' => 'nullable|string|max:50',
            'note' => 'nullable|string',
        ]);

        // Map Italian field names to English field names
        $data = [];
        
        if (isset($validated['nome'])) {
            $data['name'] = $validated['nome'];
        }
        
        if (isset($validated['email'])) {
            $data['email'] = $validated['email'];
        }
        
        if (isset($validated['telefono'])) {
            $data['phone'] = $validated['telefono'];
        }
        
        if (isset($validated['indirizzo'])) {
            $data['address'] = $validated['indirizzo'];
        }
        
        if (isset($validated['citta'])) {
            $data['city'] = $validated['citta'];
        }
        
        if (isset($validated['cap'])) {
            $data['postal_code'] = $validated['cap'];
        }
        
        if (isset($validated['provincia'])) {
            $data['province'] = $validated['provincia'];
        }
        
        if (isset($validated['partita_iva'])) {
            $data['vat_number'] = $validated['partita_iva'];
        }
        
        if (isset($validated['codice_fiscale'])) {
            $data['fiscal_code'] = $validated['codice_fiscale'];
        }
        
        if (isset($validated['note'])) {
            $data['notes'] = $validated['note'];
        }

        $client->update($data);
        
        // Aggiungiamo i campi in italiano
        $client->nome = $client->name;
        $client->indirizzo = $client->address;
        $client->citta = $client->city;
        $client->cap = $client->postal_code;
        $client->provincia = $client->province;
        $client->telefono = $client->phone;
        $client->partita_iva = $client->vat_number;
        $client->codice_fiscale = $client->fiscal_code;
        $client->note = $client->notes;
        
        return response()->json($client);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Client $client)
    {
        $client->delete();
        return response()->json(null, 204);
    }
}
