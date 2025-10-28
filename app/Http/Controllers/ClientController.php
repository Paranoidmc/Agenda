<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class ClientController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $perPage = $request->input('perPage', 25);
        $search = $request->input('search');
        $query = Client::query();

        // Ricerca base su nome, citta, partita iva, codice fiscale
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('city', 'like', "%$search%")
                  ->orWhere('vat_number', 'like', "%$search%")
                  ->orWhere('fiscal_code', 'like', "%$search%")
                  ->orWhere('codice_arca', 'like', "%$search%")
                  ->orWhere('email', 'like', "%$search%")
                  ->orWhere('phone', 'like', "%$search%")
                  ->orWhere('address', 'like', "%$search%")
                  ->orWhere('province', 'like', "%$search%")
                  ->orWhere('postal_code', 'like', "%$search%")
                  ->orWhere('notes', 'like', "%$search%")
                ;
            });
        }

        // Solo i campi necessari per la tabella
        $fields = [
            'id', 'name', 'address', 'city', 'postal_code', 'province', 'phone', 'email', 'vat_number', 'fiscal_code', 'codice_arca', 'notes'
        ];

        // Se perPage è 'all' o > 10000, restituisci tutti i clienti senza paginazione
        if ($perPage === 'all' || intval($perPage) > 10000) {
            $clients = $query->select($fields)->orderBy('name')->get();
            // Mappa i campi in italiano per ogni cliente
            $clients->transform(function ($client) {
                $client->name = $client->name ?? '';
                $client->address = $client->address ?? '';
                $client->city = $client->city ?? '';
                $client->postal_code = $client->postal_code ?? '';
                $client->province = $client->province ?? '';
                $client->phone = $client->phone ?? '';
                $client->email = $client->email ?? '';
                $client->vat_number = $client->vat_number ?? '';
                $client->fiscal_code = $client->fiscal_code ?? '';
                $client->codice_arca = $client->codice_arca ?? '';
                $client->notes = $client->notes ?? '';
                // Aggiungi i campi in italiano
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
            return response()->json([
                'data' => $clients
            ]);
        } else {
            $clients = $query->select($fields)->orderBy('name')->paginate($perPage);
            // Mappa i campi in italiano per ogni cliente
            $clients->getCollection()->transform(function ($client) {
                $client->name = $client->name ?? '';
                $client->address = $client->address ?? '';
                $client->city = $client->city ?? '';
                $client->postal_code = $client->postal_code ?? '';
                $client->province = $client->province ?? '';
                $client->phone = $client->phone ?? '';
                $client->email = $client->email ?? '';
                $client->vat_number = $client->vat_number ?? '';
                $client->fiscal_code = $client->fiscal_code ?? '';
                $client->codice_arca = $client->codice_arca ?? '';
                $client->notes = $client->notes ?? '';
                // Aggiungi i campi in italiano
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
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // $this->authorize('manage-activities');

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
            'codice_arca' => 'nullable|string|max:50',
            'note' => 'nullable|string',
        ]);

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
            'codice_arca' => $validated['codice_arca'] ?? null,
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
        $client->codice_arca = $client->codice_arca;
        $client->note = $client->notes;
        
        return response()->json($client, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Client $client)
    {
        $client->load(['activities', 'sites']);
        
        // Assicurati che tutti i campi siano definiti
        $client->name = $client->name ?? '';
        $client->address = $client->address ?? '';
        $client->city = $client->city ?? '';
        $client->postal_code = $client->postal_code ?? '';
        $client->province = $client->province ?? '';
        $client->phone = $client->phone ?? '';
        $client->email = $client->email ?? '';
        $client->vat_number = $client->vat_number ?? '';
        $client->fiscal_code = $client->fiscal_code ?? '';
        $client->codice_arca = $client->codice_arca ?? '';
        $client->notes = $client->notes ?? '';
        
        // Aggiungiamo i campi in italiano
        $client->nome = $client->name;
        $client->indirizzo = $client->address;
        $client->citta = $client->city;
        $client->cap = $client->postal_code;
        $client->provincia = $client->province;
        $client->telefono = $client->phone;
        $client->partita_iva = $client->vat_number;
        $client->codice_fiscale = $client->fiscal_code;
        $client->codice_arca = $client->codice_arca;
        $client->note = $client->notes;
        
        return response()->json($client);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Client $client)
    {
        // $this->authorize('manage-activities');

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
            'codice_arca' => 'nullable|string|max:50',
            'note' => 'nullable|string',
        ]);

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
        
        if (isset($validated['codice_arca'])) {
            $data['codice_arca'] = $validated['codice_arca'];
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
        $client->codice_arca = $client->codice_arca;
        $client->note = $client->notes;
        
        return response()->json($client);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Client $client)
    {
        // $this->authorize('manage-activities');

        $client->delete();
        return response()->json(null, 204);
    }

    /**
     * Sincronizza clienti da Arca
     */
    public function sync()
    {
        try {
            // Esegue solo la sincronizzazione clienti del comando arca:sync
            \Artisan::call('arca:sync');
            $output = \Artisan::output();
            
            // Estrai il numero di clienti sincronizzati dall'output
            $clientiSincronizzati = 0;
            if (preg_match('/Cliente sincronizzato: (\d+)/', $output)) {
                // Conta le occorrenze
                $clientiSincronizzati = substr_count($output, 'Cliente sincronizzato:');
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Sincronizzazione clienti completata con successo',
                'data' => [
                    'clienti' => $clientiSincronizzati
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Errore sincronizzazione clienti: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Errore durante la sincronizzazione: ' . $e->getMessage()
            ], 500);
        }
    }
}
