<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Models\VehicleRental;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;

class VehicleRentalController extends Controller
{
    /**
     * Elenco contratti per veicolo
     */
    public function index(Request $request, string $vehicleId): Response
    {
        $vehicle = Vehicle::findOrFail($vehicleId);
        
        $query = $vehicle->rentals()->orderBy('contract_start_date', 'desc');
        
        // Filtri opzionali
        if ($request->has('status')) {
            $status = $request->input('status');
            $now = now();
            
            switch ($status) {
                case 'active':
                    $query->where('is_active', true)
                        ->where('contract_start_date', '<=', $now)
                        ->where('contract_end_date', '>=', $now);
                    break;
                case 'expired':
                    $query->where('contract_end_date', '<', $now);
                    break;
                case 'upcoming':
                    $query->where('contract_start_date', '>', $now);
                    break;
            }
        }
        
        $rentals = $query->get();
        
        return response(['data' => $rentals], 200);
    }

    /**
     * Crea un nuovo contratto
     */
    public function store(Request $request, string $vehicleId): Response
    {
        $vehicle = Vehicle::findOrFail($vehicleId);
        
        $validator = Validator::make($request->all(), [
            'contract_holder' => 'nullable|string|max:255',
            'ownership_type' => 'nullable|string|max:255',
            'rental_type' => 'nullable|string|max:255',
            'advance_paid' => 'nullable|numeric|min:0',
            'final_installment' => 'nullable|numeric|min:0',
            'monthly_fee' => 'nullable|numeric|min:0',
            'contract_start_date' => 'required|date',
            'contract_end_date' => 'required|date|after_or_equal:contract_start_date',
            'monthly_alert' => 'nullable|string|max:255',
            'end_alert' => 'nullable|string|max:255',
            'installment_payment_day' => 'nullable|string|max:255',
            'supplier' => 'nullable|string|max:255',
            'collection_date' => 'nullable|date',
            'contract_duration_months' => 'nullable|integer|min:1',
            'contract_kilometers' => 'nullable|integer|min:0',
            'invoice_amount_excl_vat' => 'nullable|numeric|min:0',
            'invoice_amount_incl_vat' => 'nullable|numeric|min:0',
            'contract_equipment' => 'nullable|string',
            'returned_or_redeemed' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);
        
        if ($validator->fails()) {
            return response(['errors' => $validator->errors()], 422);
        }
        
        // Verifica sovrapposizioni di date con altri contratti attivi
        $startDate = $request->input('contract_start_date');
        $endDate = $request->input('contract_end_date');
        
        $overlapping = $vehicle->rentals()
            ->where('is_active', true)
            ->where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('contract_start_date', [$startDate, $endDate])
                  ->orWhereBetween('contract_end_date', [$startDate, $endDate])
                  ->orWhere(function($q2) use ($startDate, $endDate) {
                      $q2->where('contract_start_date', '<=', $startDate)
                         ->where('contract_end_date', '>=', $endDate);
                  });
            })
            ->exists();
        
        if ($overlapping) {
            return response([
                'errors' => [
                    'contract_start_date' => ['Esiste già un contratto attivo per questo periodo'],
                    'contract_end_date' => ['Esiste già un contratto attivo per questo periodo'],
                ]
            ], 422);
        }
        
        $data = $validator->validated();
        $data['vehicle_id'] = $vehicleId;
        $data['is_active'] = $request->input('is_active', true);
        
        $rental = VehicleRental::create($data);
        
        return response(['data' => $rental], 201);
    }

    /**
     * Mostra un contratto specifico
     */
    public function show(string $vehicleId, string $id): Response
    {
        $rental = VehicleRental::where('vehicle_id', $vehicleId)
            ->findOrFail($id);
        
        return response(['data' => $rental], 200);
    }

    /**
     * Aggiorna un contratto
     */
    public function update(Request $request, string $vehicleId, string $id): Response
    {
        $rental = VehicleRental::where('vehicle_id', $vehicleId)
            ->findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'contract_holder' => 'nullable|string|max:255',
            'ownership_type' => 'nullable|string|max:255',
            'rental_type' => 'nullable|string|max:255',
            'advance_paid' => 'nullable|numeric|min:0',
            'final_installment' => 'nullable|numeric|min:0',
            'monthly_fee' => 'nullable|numeric|min:0',
            'contract_start_date' => 'required|date',
            'contract_end_date' => 'required|date|after_or_equal:contract_start_date',
            'monthly_alert' => 'nullable|string|max:255',
            'end_alert' => 'nullable|string|max:255',
            'installment_payment_day' => 'nullable|string|max:255',
            'supplier' => 'nullable|string|max:255',
            'collection_date' => 'nullable|date',
            'contract_duration_months' => 'nullable|integer|min:1',
            'contract_kilometers' => 'nullable|integer|min:0',
            'invoice_amount_excl_vat' => 'nullable|numeric|min:0',
            'invoice_amount_incl_vat' => 'nullable|numeric|min:0',
            'contract_equipment' => 'nullable|string',
            'returned_or_redeemed' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);
        
        if ($validator->fails()) {
            return response(['errors' => $validator->errors()], 422);
        }
        
        // Verifica sovrapposizioni di date con altri contratti attivi (escludendo questo)
        $startDate = $request->input('contract_start_date');
        $endDate = $request->input('contract_end_date');
        
        $overlapping = VehicleRental::where('vehicle_id', $vehicleId)
            ->where('id', '!=', $id)
            ->where('is_active', true)
            ->where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('contract_start_date', [$startDate, $endDate])
                  ->orWhereBetween('contract_end_date', [$startDate, $endDate])
                  ->orWhere(function($q2) use ($startDate, $endDate) {
                      $q2->where('contract_start_date', '<=', $startDate)
                         ->where('contract_end_date', '>=', $endDate);
                  });
            })
            ->exists();
        
        if ($overlapping) {
            return response([
                'errors' => [
                    'contract_start_date' => ['Esiste già un contratto attivo per questo periodo'],
                    'contract_end_date' => ['Esiste già un contratto attivo per questo periodo'],
                ]
            ], 422);
        }
        
        $rental->update($validator->validated());
        
        return response(['data' => $rental->fresh()], 200);
    }

    /**
     * Elimina un contratto
     */
    public function destroy(string $vehicleId, string $id): Response
    {
        $rental = VehicleRental::where('vehicle_id', $vehicleId)
            ->findOrFail($id);
        
        $rental->delete();
        
        return response([], 204);
    }
}
