<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class DriverController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // If 'all' parameter is present, return all drivers (for dropdowns/planning)
        if ($request->has('all')) {
            $drivers = Driver::with('activities')->get();
            $drivers = $drivers->map(function ($driver) {
                // Assicurati che tutti i campi siano definiti
                $driver->name = $driver->name ?? '';
                $driver->surname = $driver->surname ?? '';
                $driver->phone = $driver->phone ?? '';
                $driver->address = $driver->address ?? '';
                $driver->city = $driver->city ?? '';
                $driver->postal_code = $driver->postal_code ?? '';
                $driver->province = $driver->province ?? '';
                $driver->fiscal_code = $driver->fiscal_code ?? '';
                $driver->license_number = $driver->license_number ?? '';
                $driver->license_expiry = $driver->license_expiry ?? null;
                $driver->notes = $driver->notes ?? '';
                
                // Aggiungi i campi in italiano
                $driver->nome = $driver->name;
                $driver->cognome = $driver->surname;
                $driver->telefono = $driver->phone;
                $driver->indirizzo = $driver->address;
                $driver->citta = $driver->city;
                $driver->cap = $driver->postal_code;
                $driver->provincia = $driver->province;
                $driver->codice_fiscale = $driver->fiscal_code;
                $driver->patente = $driver->license_number;
                $driver->scadenza_patente = $driver->license_expiry;
                $driver->note = $driver->notes;
                
                return $driver;
            });
            return response()->json([
                'data' => $drivers
            ]);
        }
        
        $perPage = $request->input('perPage', 25);
        $search = $request->input('search');
        $query = Driver::with('activities');

        // Search by name, surname, phone, fiscal code, license number, city, etc.
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('surname', 'like', "%$search%")
                  ->orWhere('phone', 'like', "%$search%")
                  ->orWhere('fiscal_code', 'like', "%$search%")
                  ->orWhere('license_number', 'like', "%$search%")
                  ->orWhere('city', 'like', "%$search%")
                  ->orWhere('address', 'like', "%$search%")
                  ->orWhere('notes', 'like', "%$search%")
                  ->orWhere('province', 'like', "%$search%")
                  ->orWhere('postal_code', 'like', "%$search%")
                  ;
            });
        }

        $drivers = $query->paginate($perPage);

        // Map Italian fields for each driver in the paginated collection
        $drivers->getCollection()->transform(function ($driver) {
            $driver->nome = $driver->name;
            $driver->cognome = $driver->surname;
            $driver->telefono = $driver->phone;
            $driver->indirizzo = $driver->address;
            $driver->citta = $driver->city;
            $driver->cap = $driver->postal_code;
            $driver->provincia = $driver->province;
            $driver->codice_fiscale = $driver->fiscal_code;
            $driver->patente = $driver->license_number;
            $driver->scadenza_patente = $driver->license_expiry;
            $driver->note = $driver->notes;
            return $driver;
        });

        return response()->json($drivers);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // $this->authorize('manage-anagrafiche'); // TEMPORANEO: disabilitato per debug gate

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'surname' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'license_number' => 'nullable|string|max:20',
            'license_type' => 'nullable|string|max:20',
            'license_issue_date' => 'nullable|date',
            'license_issued_by' => 'nullable|string|max:255',
            'license_expiry' => 'nullable|date',
            'birth_date' => 'nullable|date',
            'birth_place' => 'nullable|string|max:255',
            'fiscal_code' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'province' => 'nullable|string|max:50',
            'hire_date' => 'nullable|date',
            'termination_date' => 'nullable|date',
            'employee_id' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|max:20',
            // Campi in italiano
            'nome' => 'sometimes|required|string|max:255',
            'cognome' => 'sometimes|required|string|max:255',
            'telefono' => 'nullable|string|max:20',
            'indirizzo' => 'nullable|string|max:255',
            'citta' => 'nullable|string|max:255',
            'cap' => 'nullable|string|max:20',
            'provincia' => 'nullable|string|max:50',
            'codice_fiscale' => 'nullable|string|max:20',
            'patente' => 'nullable|string|max:20',
            'scadenza_patente' => 'nullable|date',
            'note' => 'nullable|string',
        ]);

        // Map Italian field names to English field names
        $data = [];
        
        // Prioritize English fields, but use Italian if English is not provided
        $data['name'] = $validated['name'] ?? $validated['nome'] ?? null;
        $data['surname'] = $validated['surname'] ?? $validated['cognome'] ?? null;
        $data['email'] = $validated['email'] ?? null;
        $data['phone'] = $validated['phone'] ?? $validated['telefono'] ?? null;
        $data['license_number'] = $validated['license_number'] ?? $validated['patente'] ?? null;
        $data['license_expiry'] = $validated['license_expiry'] ?? $validated['scadenza_patente'] ?? null;
        $data['fiscal_code'] = $validated['fiscal_code'] ?? $validated['codice_fiscale'] ?? null;
        $data['address'] = $validated['address'] ?? $validated['indirizzo'] ?? null;
        $data['city'] = $validated['city'] ?? $validated['citta'] ?? null;
        $data['postal_code'] = $validated['postal_code'] ?? $validated['cap'] ?? null;
        $data['province'] = $validated['province'] ?? $validated['provincia'] ?? null;
        $data['notes'] = $validated['notes'] ?? $validated['note'] ?? null;
        
        // Fields that only exist in English
        if (isset($validated['license_type'])) $data['license_type'] = $validated['license_type'];
        if (isset($validated['license_issue_date'])) $data['license_issue_date'] = $validated['license_issue_date'];
        if (isset($validated['license_issued_by'])) $data['license_issued_by'] = $validated['license_issued_by'];
        if (isset($validated['birth_date'])) $data['birth_date'] = $validated['birth_date'];
        if (isset($validated['birth_place'])) $data['birth_place'] = $validated['birth_place'];
        if (isset($validated['hire_date'])) $data['hire_date'] = $validated['hire_date'];
        if (isset($validated['termination_date'])) $data['termination_date'] = $validated['termination_date'];
        if (isset($validated['employee_id'])) $data['employee_id'] = $validated['employee_id'];
        if (isset($validated['status'])) $data['status'] = $validated['status'];

        $driver = Driver::create($data);
        
        // Aggiungiamo i campi in italiano
        $driver->nome = $driver->name;
        $driver->cognome = $driver->surname;
        $driver->telefono = $driver->phone;
        $driver->indirizzo = $driver->address;
        $driver->citta = $driver->city;
        $driver->cap = $driver->postal_code;
        $driver->provincia = $driver->province;
        $driver->codice_fiscale = $driver->fiscal_code;
        $driver->patente = $driver->license_number;
        $driver->scadenza_patente = $driver->license_expiry;
        $driver->note = $driver->notes;
        
        return response()->json($driver, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Driver $driver)
    {
        $driver->load('activities');
        
        // Aggiungiamo i campi in italiano
        $driver->nome = $driver->name;
        $driver->cognome = $driver->surname;
        $driver->telefono = $driver->phone;
        $driver->indirizzo = $driver->address;
        $driver->citta = $driver->city;
        $driver->cap = $driver->postal_code;
        $driver->provincia = $driver->province;
        $driver->codice_fiscale = $driver->fiscal_code;
        $driver->patente = $driver->license_number;
        $driver->scadenza_patente = $driver->license_expiry;
        $driver->note = $driver->notes;
        
        return response()->json($driver);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Driver $driver)
    {
        $this->authorize('manage-anagrafiche');

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'surname' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'license_number' => 'nullable|string|max:20',
            'license_type' => 'nullable|string|max:20',
            'license_issue_date' => 'nullable|date',
            'license_issued_by' => 'nullable|string|max:255',
            'license_expiry' => 'nullable|date',
            'birth_date' => 'nullable|date',
            'birth_place' => 'nullable|string|max:255',
            'fiscal_code' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'province' => 'nullable|string|max:50',
            'hire_date' => 'nullable|date',
            'termination_date' => 'nullable|date',
            'employee_id' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|max:20',
            // Campi in italiano
            'nome' => 'sometimes|required|string|max:255',
            'cognome' => 'sometimes|required|string|max:255',
            'telefono' => 'nullable|string|max:20',
            'indirizzo' => 'nullable|string|max:255',
            'citta' => 'nullable|string|max:255',
            'cap' => 'nullable|string|max:20',
            'provincia' => 'nullable|string|max:50',
            'codice_fiscale' => 'nullable|string|max:20',
            'patente' => 'nullable|string|max:20',
            'scadenza_patente' => 'nullable|date',
            'note' => 'nullable|string',
        ]);

        // Map Italian field names to English field names
        $data = [];
        
        // Prioritize English fields, but use Italian if English is not provided
        if (isset($validated['name']) || isset($validated['nome'])) {
            $data['name'] = $validated['name'] ?? $validated['nome'];
        }
        
        if (isset($validated['surname']) || isset($validated['cognome'])) {
            $data['surname'] = $validated['surname'] ?? $validated['cognome'];
        }
        
        if (isset($validated['email'])) {
            $data['email'] = $validated['email'];
        }
        
        if (isset($validated['phone']) || isset($validated['telefono'])) {
            $data['phone'] = $validated['phone'] ?? $validated['telefono'];
        }
        
        if (isset($validated['license_number']) || isset($validated['patente'])) {
            $data['license_number'] = $validated['license_number'] ?? $validated['patente'];
        }
        
        if (isset($validated['license_expiry']) || isset($validated['scadenza_patente'])) {
            $data['license_expiry'] = $validated['license_expiry'] ?? $validated['scadenza_patente'];
        }
        
        if (isset($validated['fiscal_code']) || isset($validated['codice_fiscale'])) {
            $data['fiscal_code'] = $validated['fiscal_code'] ?? $validated['codice_fiscale'];
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
        
        if (isset($validated['notes']) || isset($validated['note'])) {
            $data['notes'] = $validated['notes'] ?? $validated['note'];
        }
        
        // Fields that only exist in English
        if (isset($validated['license_type'])) $data['license_type'] = $validated['license_type'];
        if (isset($validated['license_issue_date'])) $data['license_issue_date'] = $validated['license_issue_date'];
        if (isset($validated['license_issued_by'])) $data['license_issued_by'] = $validated['license_issued_by'];
        if (isset($validated['birth_date'])) $data['birth_date'] = $validated['birth_date'];
        if (isset($validated['birth_place'])) $data['birth_place'] = $validated['birth_place'];
        if (isset($validated['hire_date'])) $data['hire_date'] = $validated['hire_date'];
        if (isset($validated['termination_date'])) $data['termination_date'] = $validated['termination_date'];
        if (isset($validated['employee_id'])) $data['employee_id'] = $validated['employee_id'];
        if (isset($validated['status'])) $data['status'] = $validated['status'];

        $driver->update($data);
        
        // Aggiungiamo i campi in italiano
        $driver->nome = $driver->name;
        $driver->cognome = $driver->surname;
        $driver->telefono = $driver->phone;
        $driver->indirizzo = $driver->address;
        $driver->citta = $driver->city;
        $driver->cap = $driver->postal_code;
        $driver->provincia = $driver->province;
        $driver->codice_fiscale = $driver->fiscal_code;
        $driver->patente = $driver->license_number;
        $driver->scadenza_patente = $driver->license_expiry;
        $driver->note = $driver->notes;
        
        return response()->json($driver);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Driver $driver)
    {
        // $this->authorize('manage-anagrafiche'); // TEMPORANEO: disabilitato per debug gate

        $driver->delete();
        return response()->json(null, 204);
    }

    /**
     * Sincronizza autisti da Arca
     */
    public function sync()
    {
        try {
            // Imposta il tempo massimo di esecuzione a 10 minuti
            set_time_limit(600);
            
            // Esegue solo la sincronizzazione autisti del comando arca:sync
            \Artisan::call('arca:sync');
            $output = \Artisan::output();
            
            // Estrai il numero di autisti sincronizzati dall'output
            $autistiSincronizzati = 0;
            if (preg_match('/Autista sincronizzato:/', $output)) {
                // Conta le occorrenze
                $autistiSincronizzati = substr_count($output, 'Autista sincronizzato:');
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Sincronizzazione autisti completata con successo',
                'data' => [
                    'autisti' => $autistiSincronizzati
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Errore sincronizzazione autisti: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Errore durante la sincronizzazione: ' . $e->getMessage()
            ], 500);
        }
    }
}
