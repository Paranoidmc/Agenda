<?php

namespace App\Http\Controllers;

use App\Models\VehicleDeadline;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class VehicleDeadlineController extends Controller
{
    /**
     * Constructor
     */
    public function __construct()
    {
        // Rimuovi qualsiasi middleware di autenticazione
        $this->middleware('auth:sanctum')->except(['index', 'show', 'getVehicleDeadlines']);
    }
    
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Log dei parametri della richiesta
        Log::info('VehicleDeadlineController: Richiesta ricevuta', [
            'parametri' => $request->all(),
            'headers' => $request->header(),
            'user' => $request->user() ? $request->user()->id : 'non autenticato',
            'auth' => Auth::check() ? 'autenticato' : 'non autenticato',
            'auth_id' => Auth::id(),
            'auth_user' => Auth::user() ? Auth::id() : null
        ]);
        
        // Verifica se ci sono scadenze nel database
        $totalDeadlines = VehicleDeadline::count();
        Log::info('VehicleDeadlineController: Totale scadenze nel database', [
            'count' => $totalDeadlines
        ]);
        
        // Verifica se ci sono scadenze nel periodo specificato
        $today = date('Y-m-d');
        $thirtyDaysLater = date('Y-m-d', strtotime('+30 days'));
        $deadlinesInPeriod = VehicleDeadline::whereDate('expiry_date', '<=', $thirtyDaysLater)->count();
        Log::info('VehicleDeadlineController: Scadenze nel periodo', [
            'periodo' => "$today - $thirtyDaysLater",
            'count' => $deadlinesInPeriod
        ]);
        
        $query = VehicleDeadline::with('vehicle');
        
        // Filtraggio per data di scadenza
        if ($request->has('start_date')) {
            // Non filtrare per data di inizio per mostrare anche le scadenze passate
            // $query->whereDate('expiry_date', '>=', $request->start_date);
            Log::info('VehicleDeadlineController: start_date presente ma non applicata', [
                'start_date' => $request->start_date
            ]);
        }
        
        // Filtraggio per data di fine
        if ($request->has('end_date')) {
            $query->whereDate('expiry_date', '<=', $request->end_date);
            Log::info('VehicleDeadlineController: end_date applicata', [
                'end_date' => $request->end_date
            ]);
        }
        
        // Filtraggio per veicolo
        if ($request->has('vehicle_id')) {
            $query->where('vehicle_id', $request->vehicle_id);
        }
        
        // Filtraggio per tipo
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }
        
        // Filtraggio per stato
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        // Log della query SQL
        $sql = $query->toSql();
        $bindings = $query->getBindings();
        Log::info('VehicleDeadlineController: Query SQL', [
            'sql' => $sql,
            'bindings' => $bindings
        ]);
        
        $deadlines = $query->get();
        
        // Log del numero di risultati
        Log::info('VehicleDeadlineController: Risultati', [
            'count' => $deadlines->count()
        ]);
        
        // Aggiungiamo i campi in italiano per ogni scadenza
        $deadlines = $deadlines->map(function ($deadline) {
            // Aggiungiamo i campi in italiano
            $deadline->tipo = $deadline->type;
            $deadline->data_scadenza = $deadline->expiry_date;
            $deadline->data_promemoria = $deadline->reminder_date;
            $deadline->stato = $deadline->status;
            $deadline->note = $deadline->notes;
            
            // Aggiungiamo i campi in italiano per il veicolo
            if ($deadline->vehicle) {
                $deadline->vehicle->targa = $deadline->vehicle->plate;
                $deadline->vehicle->modello = $deadline->vehicle->model;
                $deadline->vehicle->marca = $deadline->vehicle->brand;
                $deadline->vehicle->colore = $deadline->vehicle->color;
                $deadline->vehicle->anno = $deadline->vehicle->year;
                $deadline->vehicle->tipo = $deadline->vehicle->type;
                $deadline->vehicle->carburante = $deadline->vehicle->fuel_type;
                $deadline->vehicle->km = $deadline->vehicle->odometer;
                $deadline->vehicle->note = $deadline->vehicle->notes;
            }
            
            return $deadline;
        });
        
        return response()->json($deadlines);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'type' => 'sometimes|required|string|max:50',
            'expiry_date' => 'sometimes|required|date',
            'reminder_date' => 'nullable|date|before:expiry_date',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|max:20',
            // Campi in italiano
            'tipo' => 'sometimes|required|string|max:50',
            'data_scadenza' => 'sometimes|required|date',
            'data_promemoria' => 'nullable|date|before:data_scadenza',
            'note' => 'nullable|string',
            'stato' => 'nullable|string|max:20',
        ]);

        // Map Italian field names to English field names
        $data = [];
        
        // Prioritize English fields, but use Italian if English is not provided
        $data['vehicle_id'] = $validated['vehicle_id'];
        $data['type'] = $validated['type'] ?? $validated['tipo'] ?? null;
        $data['expiry_date'] = $validated['expiry_date'] ?? $validated['data_scadenza'] ?? null;
        $data['reminder_date'] = $validated['reminder_date'] ?? $validated['data_promemoria'] ?? null;
        $data['notes'] = $validated['notes'] ?? $validated['note'] ?? null;
        $data['status'] = $validated['status'] ?? $validated['stato'] ?? 'active';

        $deadline = VehicleDeadline::create($data);
        
        // Aggiungiamo i campi in italiano
        $deadline->tipo = $deadline->type;
        $deadline->data_scadenza = $deadline->expiry_date;
        $deadline->data_promemoria = $deadline->reminder_date;
        $deadline->stato = $deadline->status;
        $deadline->note = $deadline->notes;
        
        return response()->json($deadline, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(VehicleDeadline $vehicleDeadline)
    {
        $vehicleDeadline->load('vehicle');
        
        // Aggiungiamo i campi in italiano
        $vehicleDeadline->tipo = $vehicleDeadline->type;
        $vehicleDeadline->data_scadenza = $vehicleDeadline->expiry_date;
        $vehicleDeadline->data_promemoria = $vehicleDeadline->reminder_date;
        $vehicleDeadline->stato = $vehicleDeadline->status;
        $vehicleDeadline->note = $vehicleDeadline->notes;
        
        // Aggiungiamo i campi in italiano per il veicolo
        if ($vehicleDeadline->vehicle) {
            $vehicleDeadline->vehicle->targa = $vehicleDeadline->vehicle->plate;
            $vehicleDeadline->vehicle->modello = $vehicleDeadline->vehicle->model;
            $vehicleDeadline->vehicle->marca = $vehicleDeadline->vehicle->brand;
            $vehicleDeadline->vehicle->colore = $vehicleDeadline->vehicle->color;
            $vehicleDeadline->vehicle->anno = $vehicleDeadline->vehicle->year;
            $vehicleDeadline->vehicle->tipo = $vehicleDeadline->vehicle->type;
            $vehicleDeadline->vehicle->carburante = $vehicleDeadline->vehicle->fuel_type;
            $vehicleDeadline->vehicle->km = $vehicleDeadline->vehicle->odometer;
            $vehicleDeadline->vehicle->note = $vehicleDeadline->vehicle->notes;
        }
        
        return response()->json($vehicleDeadline);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, VehicleDeadline $vehicleDeadline)
    {
        $validated = $request->validate([
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'type' => 'sometimes|required|string|max:50',
            'expiry_date' => 'sometimes|required|date',
            'reminder_date' => 'nullable|date|before:expiry_date',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|max:20',
            // Campi in italiano
            'tipo' => 'sometimes|required|string|max:50',
            'data_scadenza' => 'sometimes|required|date',
            'data_promemoria' => 'nullable|date|before:data_scadenza',
            'note' => 'nullable|string',
            'stato' => 'nullable|string|max:20',
        ]);

        // Map Italian field names to English field names
        $data = [];
        
        // Prioritize English fields, but use Italian if English is not provided
        if (isset($validated['vehicle_id'])) {
            $data['vehicle_id'] = $validated['vehicle_id'];
        }
        
        if (isset($validated['type']) || isset($validated['tipo'])) {
            $data['type'] = $validated['type'] ?? $validated['tipo'];
        }
        
        if (isset($validated['expiry_date']) || isset($validated['data_scadenza'])) {
            $data['expiry_date'] = $validated['expiry_date'] ?? $validated['data_scadenza'];
        }
        
        if (isset($validated['reminder_date']) || isset($validated['data_promemoria'])) {
            $data['reminder_date'] = $validated['reminder_date'] ?? $validated['data_promemoria'];
        }
        
        if (isset($validated['notes']) || isset($validated['note'])) {
            $data['notes'] = $validated['notes'] ?? $validated['note'];
        }
        
        if (isset($validated['status']) || isset($validated['stato'])) {
            $data['status'] = $validated['status'] ?? $validated['stato'];
        }

        $vehicleDeadline->update($data);
        
        // Aggiungiamo i campi in italiano
        $vehicleDeadline->tipo = $vehicleDeadline->type;
        $vehicleDeadline->data_scadenza = $vehicleDeadline->expiry_date;
        $vehicleDeadline->data_promemoria = $vehicleDeadline->reminder_date;
        $vehicleDeadline->stato = $vehicleDeadline->status;
        $vehicleDeadline->note = $vehicleDeadline->notes;
        
        return response()->json($vehicleDeadline);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(VehicleDeadline $vehicleDeadline)
    {
        $vehicleDeadline->delete();
        return response()->json(null, 204);
    }
    
    /**
     * Get all deadlines for a specific vehicle.
     */
    public function getVehicleDeadlines($vehicleId)
    {
        $vehicle = Vehicle::findOrFail($vehicleId);
        $deadlines = $vehicle->deadlines;
        
        // Aggiungiamo i campi in italiano per ogni scadenza
        $deadlines = $deadlines->map(function ($deadline) {
            // Aggiungiamo i campi in italiano
            $deadline->tipo = $deadline->type;
            $deadline->data_scadenza = $deadline->expiry_date;
            $deadline->data_promemoria = $deadline->reminder_date;
            $deadline->stato = $deadline->status;
            $deadline->note = $deadline->notes;
            
            return $deadline;
        });
        
        return response()->json($deadlines);
    }
}
