<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $vehicles = Vehicle::with(['activities', 'deadlines'])->get();
        
        // Aggiungiamo i campi in italiano per ogni veicolo
        $vehicles = $vehicles->map(function ($vehicle) {
            // Aggiungiamo i campi in italiano
            $vehicle->targa = $vehicle->plate;
            $vehicle->modello = $vehicle->model;
            $vehicle->marca = $vehicle->brand;
            $vehicle->colore = $vehicle->color;
            $vehicle->anno = $vehicle->year;
            $vehicle->tipo = $vehicle->type;
            $vehicle->carburante = $vehicle->fuel_type;
            $vehicle->km = $vehicle->odometer;
            $vehicle->note = $vehicle->notes;
            
            return $vehicle;
        });
        
        return response()->json($vehicles);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'plate' => 'sometimes|required|string|max:20|unique:vehicles',
            'vin' => 'nullable|string|max:50',
            'engine_number' => 'nullable|string|max:50',
            'brand' => 'sometimes|required|string|max:255',
            'model' => 'sometimes|required|string|max:255',
            'color' => 'nullable|string|max:50',
            'year' => 'nullable|integer',
            'type' => 'nullable|string|max:50',
            'fuel_type' => 'nullable|string|max:50',
            'seats' => 'nullable|integer',
            'weight' => 'nullable|numeric',
            'max_load' => 'nullable|numeric',
            'registration_date' => 'nullable|date',
            'purchase_date' => 'nullable|date',
            'purchase_price' => 'nullable|numeric',
            'owner' => 'nullable|string|max:255',
            'insurance_company' => 'nullable|string|max:255',
            'insurance_policy_number' => 'nullable|string|max:50',
            'insurance_expiry' => 'nullable|date',
            'odometer' => 'nullable|integer',
            'last_maintenance_date' => 'nullable|date',
            'last_maintenance_odometer' => 'nullable|integer',
            'maintenance_interval_km' => 'nullable|integer',
            'maintenance_interval_months' => 'nullable|integer',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            // Campi in italiano
            'targa' => 'sometimes|required|string|max:20|unique:vehicles,plate',
            'modello' => 'sometimes|required|string|max:255',
            'marca' => 'sometimes|required|string|max:255',
            'colore' => 'nullable|string|max:50',
            'anno' => 'nullable|integer',
            'tipo' => 'nullable|string|max:50',
            'carburante' => 'nullable|string|max:50',
            'km' => 'nullable|integer',
            'note' => 'nullable|string',
        ]);

        // Map Italian field names to English field names
        $data = [];
        
        // Prioritize English fields, but use Italian if English is not provided
        $data['plate'] = $validated['plate'] ?? $validated['targa'] ?? null;
        $data['brand'] = $validated['brand'] ?? $validated['marca'] ?? null;
        $data['model'] = $validated['model'] ?? $validated['modello'] ?? null;
        $data['color'] = $validated['color'] ?? $validated['colore'] ?? null;
        $data['year'] = $validated['year'] ?? $validated['anno'] ?? null;
        $data['type'] = $validated['type'] ?? $validated['tipo'] ?? null;
        $data['fuel_type'] = $validated['fuel_type'] ?? $validated['carburante'] ?? null;
        $data['odometer'] = $validated['odometer'] ?? $validated['km'] ?? null;
        $data['notes'] = $validated['notes'] ?? $validated['note'] ?? null;
        
        // Fields that only exist in English
        if (isset($validated['vin'])) $data['vin'] = $validated['vin'];
        if (isset($validated['engine_number'])) $data['engine_number'] = $validated['engine_number'];
        if (isset($validated['seats'])) $data['seats'] = $validated['seats'];
        if (isset($validated['weight'])) $data['weight'] = $validated['weight'];
        if (isset($validated['max_load'])) $data['max_load'] = $validated['max_load'];
        if (isset($validated['registration_date'])) $data['registration_date'] = $validated['registration_date'];
        if (isset($validated['purchase_date'])) $data['purchase_date'] = $validated['purchase_date'];
        if (isset($validated['purchase_price'])) $data['purchase_price'] = $validated['purchase_price'];
        if (isset($validated['owner'])) $data['owner'] = $validated['owner'];
        if (isset($validated['insurance_company'])) $data['insurance_company'] = $validated['insurance_company'];
        if (isset($validated['insurance_policy_number'])) $data['insurance_policy_number'] = $validated['insurance_policy_number'];
        if (isset($validated['insurance_expiry'])) $data['insurance_expiry'] = $validated['insurance_expiry'];
        if (isset($validated['last_maintenance_date'])) $data['last_maintenance_date'] = $validated['last_maintenance_date'];
        if (isset($validated['last_maintenance_odometer'])) $data['last_maintenance_odometer'] = $validated['last_maintenance_odometer'];
        if (isset($validated['maintenance_interval_km'])) $data['maintenance_interval_km'] = $validated['maintenance_interval_km'];
        if (isset($validated['maintenance_interval_months'])) $data['maintenance_interval_months'] = $validated['maintenance_interval_months'];
        if (isset($validated['status'])) $data['status'] = $validated['status'];

        $vehicle = Vehicle::create($data);
        
        // Aggiungiamo i campi in italiano
        $vehicle->targa = $vehicle->plate;
        $vehicle->modello = $vehicle->model;
        $vehicle->marca = $vehicle->brand;
        $vehicle->colore = $vehicle->color;
        $vehicle->anno = $vehicle->year;
        $vehicle->tipo = $vehicle->type;
        $vehicle->carburante = $vehicle->fuel_type;
        $vehicle->km = $vehicle->odometer;
        $vehicle->note = $vehicle->notes;
        
        return response()->json($vehicle, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Vehicle $vehicle)
    {
        $vehicle->load(['activities', 'deadlines']);
        
        // Aggiungiamo i campi in italiano
        $vehicle->targa = $vehicle->plate;
        $vehicle->modello = $vehicle->model;
        $vehicle->marca = $vehicle->brand;
        $vehicle->colore = $vehicle->color;
        $vehicle->anno = $vehicle->year;
        $vehicle->tipo = $vehicle->type;
        $vehicle->carburante = $vehicle->fuel_type;
        $vehicle->km = $vehicle->odometer;
        $vehicle->note = $vehicle->notes;
        
        return response()->json($vehicle);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Vehicle $vehicle)
    {
        $validated = $request->validate([
            'plate' => 'sometimes|required|string|max:20|unique:vehicles,plate,' . $vehicle->id,
            'vin' => 'nullable|string|max:50',
            'engine_number' => 'nullable|string|max:50',
            'brand' => 'sometimes|required|string|max:255',
            'model' => 'sometimes|required|string|max:255',
            'color' => 'nullable|string|max:50',
            'year' => 'nullable|integer',
            'type' => 'nullable|string|max:50',
            'fuel_type' => 'nullable|string|max:50',
            'seats' => 'nullable|integer',
            'weight' => 'nullable|numeric',
            'max_load' => 'nullable|numeric',
            'registration_date' => 'nullable|date',
            'purchase_date' => 'nullable|date',
            'purchase_price' => 'nullable|numeric',
            'owner' => 'nullable|string|max:255',
            'insurance_company' => 'nullable|string|max:255',
            'insurance_policy_number' => 'nullable|string|max:50',
            'insurance_expiry' => 'nullable|date',
            'odometer' => 'nullable|integer',
            'last_maintenance_date' => 'nullable|date',
            'last_maintenance_odometer' => 'nullable|integer',
            'maintenance_interval_km' => 'nullable|integer',
            'maintenance_interval_months' => 'nullable|integer',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            // Campi in italiano
            'targa' => 'sometimes|required|string|max:20|unique:vehicles,plate,' . $vehicle->id,
            'modello' => 'sometimes|required|string|max:255',
            'marca' => 'sometimes|required|string|max:255',
            'colore' => 'nullable|string|max:50',
            'anno' => 'nullable|integer',
            'tipo' => 'nullable|string|max:50',
            'carburante' => 'nullable|string|max:50',
            'km' => 'nullable|integer',
            'note' => 'nullable|string',
        ]);

        // Map Italian field names to English field names
        $data = [];
        
        // Prioritize English fields, but use Italian if English is not provided
        if (isset($validated['plate']) || isset($validated['targa'])) {
            $data['plate'] = $validated['plate'] ?? $validated['targa'];
        }
        
        if (isset($validated['brand']) || isset($validated['marca'])) {
            $data['brand'] = $validated['brand'] ?? $validated['marca'];
        }
        
        if (isset($validated['model']) || isset($validated['modello'])) {
            $data['model'] = $validated['model'] ?? $validated['modello'];
        }
        
        if (isset($validated['color']) || isset($validated['colore'])) {
            $data['color'] = $validated['color'] ?? $validated['colore'];
        }
        
        if (isset($validated['year']) || isset($validated['anno'])) {
            $data['year'] = $validated['year'] ?? $validated['anno'];
        }
        
        if (isset($validated['type']) || isset($validated['tipo'])) {
            $data['type'] = $validated['type'] ?? $validated['tipo'];
        }
        
        if (isset($validated['fuel_type']) || isset($validated['carburante'])) {
            $data['fuel_type'] = $validated['fuel_type'] ?? $validated['carburante'];
        }
        
        if (isset($validated['odometer']) || isset($validated['km'])) {
            $data['odometer'] = $validated['odometer'] ?? $validated['km'];
        }
        
        if (isset($validated['notes']) || isset($validated['note'])) {
            $data['notes'] = $validated['notes'] ?? $validated['note'];
        }
        
        // Fields that only exist in English
        if (isset($validated['vin'])) $data['vin'] = $validated['vin'];
        if (isset($validated['engine_number'])) $data['engine_number'] = $validated['engine_number'];
        if (isset($validated['seats'])) $data['seats'] = $validated['seats'];
        if (isset($validated['weight'])) $data['weight'] = $validated['weight'];
        if (isset($validated['max_load'])) $data['max_load'] = $validated['max_load'];
        if (isset($validated['registration_date'])) $data['registration_date'] = $validated['registration_date'];
        if (isset($validated['purchase_date'])) $data['purchase_date'] = $validated['purchase_date'];
        if (isset($validated['purchase_price'])) $data['purchase_price'] = $validated['purchase_price'];
        if (isset($validated['owner'])) $data['owner'] = $validated['owner'];
        if (isset($validated['insurance_company'])) $data['insurance_company'] = $validated['insurance_company'];
        if (isset($validated['insurance_policy_number'])) $data['insurance_policy_number'] = $validated['insurance_policy_number'];
        if (isset($validated['insurance_expiry'])) $data['insurance_expiry'] = $validated['insurance_expiry'];
        if (isset($validated['last_maintenance_date'])) $data['last_maintenance_date'] = $validated['last_maintenance_date'];
        if (isset($validated['last_maintenance_odometer'])) $data['last_maintenance_odometer'] = $validated['last_maintenance_odometer'];
        if (isset($validated['maintenance_interval_km'])) $data['maintenance_interval_km'] = $validated['maintenance_interval_km'];
        if (isset($validated['maintenance_interval_months'])) $data['maintenance_interval_months'] = $validated['maintenance_interval_months'];
        if (isset($validated['status'])) $data['status'] = $validated['status'];

        $vehicle->update($data);
        
        // Aggiungiamo i campi in italiano
        $vehicle->targa = $vehicle->plate;
        $vehicle->modello = $vehicle->model;
        $vehicle->marca = $vehicle->brand;
        $vehicle->colore = $vehicle->color;
        $vehicle->anno = $vehicle->year;
        $vehicle->tipo = $vehicle->type;
        $vehicle->carburante = $vehicle->fuel_type;
        $vehicle->km = $vehicle->odometer;
        $vehicle->note = $vehicle->notes;
        
        return response()->json($vehicle);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Vehicle $vehicle)
    {
        $vehicle->delete();
        return response()->json(null, 204);
    }
}
