<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    use AuthorizesRequests;

    /**
     * Get unique values for filter dropdowns
     */
    public function getFilterValues(Request $request)
    {
        $field = $request->input('field');
        
        if (!$field) {
            return response()->json(['error' => 'Field parameter required'], 400);
        }
        
        $fieldMap = [
            'brand' => 'brand',
            'model' => 'model',
            'year' => 'year',
        ];
        
        $dbField = $fieldMap[$field] ?? $field;
        
        if (!in_array($dbField, ['brand', 'model', 'year'])) {
            return response()->json(['error' => 'Invalid field'], 400);
        }
        
        $values = Vehicle::select($dbField)
            ->whereNotNull($dbField)
            ->where($dbField, '!=', '')
            ->distinct()
            ->orderBy($dbField)
            ->pluck($dbField)
            ->filter()
            ->values();
        
        return response()->json(['data' => $values]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            // Se richiesto 'all', restituisce tutti i veicoli (per dropdown/planning)
            if ($request->has('all')) {
                $vehicles = Vehicle::with(['activities', 'deadlines'])->get();
            } else {
                // Paginazione e ricerca server-side
                $perPage = $request->input('perPage', 25);
                $search = $request->input('search');
                $query = Vehicle::with(['activities', 'deadlines']);

                // Ricerca per targa, nome, marca, modello, tipo, stato, note, colore, ecc.
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('plate', 'like', "%$search%")
                          ->orWhere('name', 'like', "%$search%")
                          ->orWhere('brand', 'like', "%$search%")
                          ->orWhere('model', 'like', "%$search%")
                          ->orWhere('type', 'like', "%$search%")
                          ->orWhere('status', 'like', "%$search%")
                          ->orWhere('color', 'like', "%$search%")
                          ->orWhere('fuel_type', 'like', "%$search%")
                          ->orWhere('notes', 'like', "%$search%");
                    });
                }

                // Filtri avanzati per campo specifico
                $filterParams = $request->input('filter', []);
                if (is_array($filterParams) && !empty($filterParams)) {
                    foreach ($filterParams as $field => $value) {
                        // Salta se il campo è un numero (indice array) o se il valore è vuoto/null
                        if (is_numeric($field) || $value === null || $value === '') {
                            continue;
                        }
                        
                        // Mappa i campi italiani ai campi inglesi
                        $fieldMap = [
                            'plate' => 'plate',
                            'brand' => 'brand',
                            'model' => 'model',
                            'year' => 'year',
                            'type' => 'type',
                            'fuel_type' => 'fuel_type',
                            'status' => 'status',
                            'targa' => 'plate',
                            'marca' => 'brand',
                            'modello' => 'model',
                            'anno' => 'year',
                            'tipo' => 'type',
                            'carburante' => 'fuel_type',
                            'stato' => 'status',
                        ];
                        
                        $dbField = $fieldMap[$field] ?? null;
                        
                        // Se il campo non è nella mappa, salta
                        if (!$dbField) {
                            continue;
                        }
                        
                        // Verifica che il campo esista nella tabella prima di applicare il filtro
                        if (in_array($dbField, ['plate', 'name', 'brand', 'model', 'year', 'type', 'fuel_type', 'status', 'color', 'notes'])) {
                            $query->where($dbField, 'like', "%{$value}%");
                        }
                    }
                }

                $vehicles = $query->paginate($perPage);
                
                // Per paginazione, mappa i campi italiani nella collection
                $vehicles->getCollection()->transform(function ($vehicle) {
                    return $this->mapItalianFields($vehicle);
                });
                
                return response()->json($vehicles);
            }
            
            // Per 'all', mappa tutti i veicoli
            $vehicles = $vehicles->map(function ($vehicle) {
                return $this->mapItalianFields($vehicle);
            });
            
            return response()->json([
                'data' => $vehicles
            ]);
        } catch (\Exception $e) {
            \Log::error('VehicleController error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Errore nel caricamento dei veicoli: ' . $e->getMessage()
            ], 500);
        }
    }
    
    private function mapItalianFields($vehicle)
    {
        // Gestiamo i campi decimali
        $vehicle->max_load = is_null($vehicle->max_load) ? null : $vehicle->max_load;
        $vehicle->purchase_price = is_null($vehicle->purchase_price) ? null : $vehicle->purchase_price;
        $vehicle->advance_paid = is_null($vehicle->advance_paid) ? null : $vehicle->advance_paid;
        $vehicle->final_installment = is_null($vehicle->final_installment) ? null : $vehicle->final_installment;
        $vehicle->monthly_fee = is_null($vehicle->monthly_fee) ? null : $vehicle->monthly_fee;
        $vehicle->invoice_amount_excl_vat = is_null($vehicle->invoice_amount_excl_vat) ? null : $vehicle->invoice_amount_excl_vat;
        $vehicle->invoice_amount_incl_vat = is_null($vehicle->invoice_amount_incl_vat) ? null : $vehicle->invoice_amount_incl_vat;
        $vehicle->power_kw = is_null($vehicle->power_kw) ? null : $vehicle->power_kw;
        $vehicle->engine_hours = is_null($vehicle->engine_hours) ? null : $vehicle->engine_hours;
        $vehicle->fuel_type = is_null($vehicle->fuel_type) ? null : $vehicle->fuel_type;
        
        // Aggiungiamo i campi in italiano
        $vehicle->targa = $vehicle->plate;
        $vehicle->nome = $vehicle->name;
        $vehicle->marca = $vehicle->brand;
        $vehicle->modello = $vehicle->model;
        $vehicle->anno = $vehicle->year;
        $vehicle->tipo = $vehicle->type;
        $vehicle->stato = $vehicle->status;
        $vehicle->note = $vehicle->notes;
        $vehicle->colore = $vehicle->color;
        $vehicle->chilometraggio = $vehicle->odometer;
        $vehicle->ore_motore = $vehicle->engine_hours;
        $vehicle->portata_max = $vehicle->max_load;
        $vehicle->numero_telaio = $vehicle->chassis_number;
        $vehicle->data_acquisto = $vehicle->purchase_date;
        $vehicle->prezzo_acquisto = $vehicle->purchase_price;
        $vehicle->misura_gomme_anteriori = $vehicle->front_tire_size;
        $vehicle->misura_gomme_posteriori = $vehicle->rear_tire_size;
        $vehicle->vin = $vehicle->vin_code;
        $vehicle->cilindrata = $vehicle->engine_capacity;
        $vehicle->codice_motore = $vehicle->engine_code;
        $vehicle->matricola_motore = $vehicle->engine_serial_number;
        $vehicle->cavalli_fiscali = $vehicle->fiscal_horsepower;
        $vehicle->potenza_kw = $vehicle->power_kw;
        $vehicle->numero_immatricolazione = $vehicle->registration_number;
        $vehicle->classe_euro = $vehicle->euro_classification;
        $vehicle->gruppi = $vehicle->groups;
        $vehicle->autista_assegnato = $vehicle->assigned_driver;
        $vehicle->data_prima_immatricolazione = $vehicle->first_registration_date;
        $vehicle->proprieta = $vehicle->ownership;
        $vehicle->carburante = $vehicle->fuel_type;
        $vehicle->km = $vehicle->odometer;
        $vehicle->contratto_titolare = $vehicle->contract_holder;
        $vehicle->tipo_proprieta = $vehicle->ownership_type;
        $vehicle->tipo_noleggio = $vehicle->rental_type;
        $vehicle->acconto_pagato = $vehicle->advance_paid;
        $vehicle->rata_finale = $vehicle->final_installment;
        $vehicle->canone_mensile = $vehicle->monthly_fee;
        $vehicle->data_inizio_contratto = $vehicle->contract_start_date;
        $vehicle->data_fine_contratto = $vehicle->contract_end_date;
        $vehicle->allarme_mensile = $vehicle->monthly_alert;
        $vehicle->allarme_fine = $vehicle->end_alert;
        $vehicle->giorno_pagamento_rata = $vehicle->installment_payment_day;
        $vehicle->fornitore = $vehicle->supplier;
        $vehicle->data_riconsegna = $vehicle->collection_date;
        $vehicle->durata_contratto_mesi = $vehicle->contract_duration_months;
        $vehicle->chilometraggio_contratto = $vehicle->contract_kilometers;
        $vehicle->importo_fattura_esclusa_iva = $vehicle->invoice_amount_excl_vat;
        $vehicle->importo_fattura_inclusa_iva = $vehicle->invoice_amount_incl_vat;
        $vehicle->attrezzatura_contratto = $vehicle->contract_equipment;
        $vehicle->pneumatici = $vehicle->tires;
        $vehicle->restituito_o_riscattato = $vehicle->returned_or_redeemed;
        $vehicle->link_esterno = $vehicle->external_link;
        
        return $vehicle;
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        \Log::info('DEBUG VehicleController@store', [
            'user_id' => auth()->id(),
            'user' => auth()->user(),
            'is_admin' => auth()->user() ? auth()->user()->isAdmin() : null,
            'request' => $request->all(),
        ]);
    // $this->authorize('manage-anagrafiche'); // TEMPORANEO: disabilitato per debug gate

    try {
            $validated = $request->validate([
                'plate' => 'sometimes|required|string|max:20|unique:vehicles',
                'vin_code' => 'nullable|string|max:50',
                'engine_serial_number' => 'nullable|string|max:50',
                'brand' => 'sometimes|required|string|max:255',
                'model' => 'sometimes|required|string|max:255',
                'color' => 'nullable|string|max:50',
                'year' => 'nullable|integer',
                'type' => 'nullable|string|max:50',
                'fuel_type' => 'nullable|string|max:50',
                'max_load' => 'nullable|numeric',
                'first_registration_date' => 'nullable|date',
                'purchase_date' => 'nullable|date',
                'purchase_price' => 'nullable|numeric',
                'power_kw' => 'nullable|numeric',
                'odometer' => 'nullable|integer',
                'engine_hours' => 'nullable|numeric',
                'front_tire_size' => 'nullable|string|max:50',
                'rear_tire_size' => 'nullable|string|max:50',
                'status' => 'nullable|string|max:50',
                'notes' => 'nullable|string',
                'name' => 'nullable|string|max:255',
                'chassis_number' => 'nullable|string|max:255',
                'engine_capacity' => 'nullable|string|max:255',
                'engine_code' => 'nullable|string|max:255',
                'fiscal_horsepower' => 'nullable|string|max:255',
                'registration_number' => 'nullable|string|max:255',
                'euro_classification' => 'nullable|string|max:255',
                'groups' => 'nullable|string|max:255',
                'assigned_driver' => 'nullable|string|max:255',
                'ownership' => 'nullable|string|max:255',
                'current_profitability' => 'nullable|string|max:255',
                'contract_holder' => 'nullable|string|max:255',
                'ownership_type' => 'nullable|string|max:255',
                'rental_type' => 'nullable|string|max:255',
                'advance_paid' => 'nullable|numeric',
                'final_installment' => 'nullable|numeric',
                'monthly_fee' => 'nullable|numeric',
                'contract_start_date' => 'nullable|date',
                'contract_end_date' => 'nullable|date',
                'monthly_alert' => 'nullable|string|max:255',
                'end_alert' => 'nullable|string|max:255',
                'installment_payment_day' => 'nullable|string|max:255',
                'supplier' => 'nullable|string|max:255',
                'collection_date' => 'nullable|date',
                'contract_duration_months' => 'nullable|integer',
                'contract_kilometers' => 'nullable|integer',
                'invoice_amount_excl_vat' => 'nullable|numeric',
                'invoice_amount_incl_vat' => 'nullable|numeric',
                'contract_equipment' => 'nullable|string',
                'tomtom' => 'nullable|string|max:255',
                'tires' => 'nullable|string|max:255',
                'returned_or_redeemed' => 'nullable|string|max:255',

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
                'imei' => 'nullable|string|max:50',
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
        $data['imei'] = $validated['imei'] ?? null;
            
            // Fields that only exist in English - use null for empty values
            if (array_key_exists('vin_code', $validated)) $data['vin_code'] = $validated['vin_code'] === '' ? null : $validated['vin_code'];
            if (array_key_exists('engine_serial_number', $validated)) $data['engine_serial_number'] = $validated['engine_serial_number'] === '' ? null : $validated['engine_serial_number'];
            if (array_key_exists('max_load', $validated)) $data['max_load'] = $validated['max_load'] === '' ? null : $validated['max_load'];
            if (array_key_exists('first_registration_date', $validated)) $data['first_registration_date'] = $validated['first_registration_date'] === '' ? null : $validated['first_registration_date'];
            if (array_key_exists('purchase_date', $validated)) $data['purchase_date'] = $validated['purchase_date'] === '' ? null : $validated['purchase_date'];
            if (array_key_exists('purchase_price', $validated)) $data['purchase_price'] = $validated['purchase_price'] === '' ? null : $validated['purchase_price'];
            if (array_key_exists('power_kw', $validated)) $data['power_kw'] = $validated['power_kw'] === '' ? null : $validated['power_kw'];
            if (array_key_exists('engine_hours', $validated)) $data['engine_hours'] = $validated['engine_hours'] === '' ? null : $validated['engine_hours'];
            if (array_key_exists('front_tire_size', $validated)) $data['front_tire_size'] = $validated['front_tire_size'] === '' ? null : $validated['front_tire_size'];
            if (array_key_exists('rear_tire_size', $validated)) $data['rear_tire_size'] = $validated['rear_tire_size'] === '' ? null : $validated['rear_tire_size'];
            if (array_key_exists('name', $validated)) $data['name'] = $validated['name'] === '' ? null : $validated['name'];
            if (array_key_exists('chassis_number', $validated)) $data['chassis_number'] = $validated['chassis_number'] === '' ? null : $validated['chassis_number'];
            if (array_key_exists('engine_capacity', $validated)) $data['engine_capacity'] = $validated['engine_capacity'] === '' ? null : $validated['engine_capacity'];
            if (array_key_exists('engine_code', $validated)) $data['engine_code'] = $validated['engine_code'] === '' ? null : $validated['engine_code'];
            if (array_key_exists('fiscal_horsepower', $validated)) $data['fiscal_horsepower'] = $validated['fiscal_horsepower'] === '' ? null : $validated['fiscal_horsepower'];
            if (array_key_exists('registration_number', $validated)) $data['registration_number'] = $validated['registration_number'] === '' ? null : $validated['registration_number'];
            if (array_key_exists('euro_classification', $validated)) $data['euro_classification'] = $validated['euro_classification'] === '' ? null : $validated['euro_classification'];
            if (array_key_exists('groups', $validated)) $data['groups'] = $validated['groups'] === '' ? null : $validated['groups'];
            if (array_key_exists('assigned_driver', $validated)) $data['assigned_driver'] = $validated['assigned_driver'] === '' ? null : $validated['assigned_driver'];
            if (array_key_exists('ownership', $validated)) $data['ownership'] = $validated['ownership'] === '' ? null : $validated['ownership'];
            if (array_key_exists('current_profitability', $validated)) $data['current_profitability'] = $validated['current_profitability'] === '' ? null : $validated['current_profitability'];
            if (array_key_exists('contract_holder', $validated)) $data['contract_holder'] = $validated['contract_holder'] === '' ? null : $validated['contract_holder'];
            if (array_key_exists('ownership_type', $validated)) $data['ownership_type'] = $validated['ownership_type'] === '' ? null : $validated['ownership_type'];
            if (array_key_exists('rental_type', $validated)) $data['rental_type'] = $validated['rental_type'] === '' ? null : $validated['rental_type'];
            if (array_key_exists('advance_paid', $validated)) $data['advance_paid'] = $validated['advance_paid'] === '' ? null : $validated['advance_paid'];
            if (array_key_exists('final_installment', $validated)) $data['final_installment'] = $validated['final_installment'] === '' ? null : $validated['final_installment'];
            if (array_key_exists('monthly_fee', $validated)) $data['monthly_fee'] = $validated['monthly_fee'] === '' ? null : $validated['monthly_fee'];
            if (array_key_exists('contract_start_date', $validated)) $data['contract_start_date'] = $validated['contract_start_date'] === '' ? null : $validated['contract_start_date'];
            if (array_key_exists('contract_end_date', $validated)) $data['contract_end_date'] = $validated['contract_end_date'] === '' ? null : $validated['contract_end_date'];
            if (array_key_exists('monthly_alert', $validated)) $data['monthly_alert'] = $validated['monthly_alert'] === '' ? null : $validated['monthly_alert'];
            if (array_key_exists('end_alert', $validated)) $data['end_alert'] = $validated['end_alert'] === '' ? null : $validated['end_alert'];
            if (array_key_exists('installment_payment_day', $validated)) $data['installment_payment_day'] = $validated['installment_payment_day'] === '' ? null : $validated['installment_payment_day'];
            if (array_key_exists('supplier', $validated)) $data['supplier'] = $validated['supplier'] === '' ? null : $validated['supplier'];
            if (array_key_exists('collection_date', $validated)) $data['collection_date'] = $validated['collection_date'] === '' ? null : $validated['collection_date'];
            if (array_key_exists('contract_duration_months', $validated)) $data['contract_duration_months'] = $validated['contract_duration_months'] === '' ? null : $validated['contract_duration_months'];
            if (array_key_exists('contract_kilometers', $validated)) $data['contract_kilometers'] = $validated['contract_kilometers'] === '' ? null : $validated['contract_kilometers'];
            if (array_key_exists('invoice_amount_excl_vat', $validated)) $data['invoice_amount_excl_vat'] = $validated['invoice_amount_excl_vat'] === '' ? null : $validated['invoice_amount_excl_vat'];
            if (array_key_exists('invoice_amount_incl_vat', $validated)) $data['invoice_amount_incl_vat'] = $validated['invoice_amount_incl_vat'] === '' ? null : $validated['invoice_amount_incl_vat'];
            if (array_key_exists('contract_equipment', $validated)) $data['contract_equipment'] = $validated['contract_equipment'] === '' ? null : $validated['contract_equipment'];
            if (array_key_exists('tomtom', $validated)) $data['tomtom'] = $validated['tomtom'] === '' ? null : $validated['tomtom'];
            if (array_key_exists('tires', $validated)) $data['tires'] = $validated['tires'] === '' ? null : $validated['tires'];
            if (array_key_exists('returned_or_redeemed', $validated)) $data['returned_or_redeemed'] = $validated['returned_or_redeemed'] === '' ? null : $validated['returned_or_redeemed'];

            if (array_key_exists('status', $validated)) $data['status'] = $validated['status'] === '' ? null : $validated['status'];

            $vehicle = Vehicle::create($data);
            
            // Gestiamo i campi decimali
            $vehicle->max_load = is_null($vehicle->max_load) ? null : $vehicle->max_load;
            $vehicle->purchase_price = is_null($vehicle->purchase_price) ? null : $vehicle->purchase_price;
            $vehicle->advance_paid = is_null($vehicle->advance_paid) ? null : $vehicle->advance_paid;
            $vehicle->final_installment = is_null($vehicle->final_installment) ? null : $vehicle->final_installment;
            $vehicle->monthly_fee = is_null($vehicle->monthly_fee) ? null : $vehicle->monthly_fee;
            $vehicle->invoice_amount_excl_vat = is_null($vehicle->invoice_amount_excl_vat) ? null : $vehicle->invoice_amount_excl_vat;
            $vehicle->invoice_amount_incl_vat = is_null($vehicle->invoice_amount_incl_vat) ? null : $vehicle->invoice_amount_incl_vat;
            $vehicle->power_kw = is_null($vehicle->power_kw) ? null : $vehicle->power_kw;
            $vehicle->engine_hours = is_null($vehicle->engine_hours) ? null : $vehicle->engine_hours;
            $vehicle->fuel_type = is_null($vehicle->fuel_type) ? null : $vehicle->fuel_type;
            
            // Aggiungiamo i campi in italiano
            $vehicle->targa = $vehicle->plate;
            $vehicle->nome = $vehicle->name;
            $vehicle->marca = $vehicle->brand;
            $vehicle->modello = $vehicle->model;
            $vehicle->anno = $vehicle->year;
            $vehicle->tipo = $vehicle->type;
            $vehicle->stato = $vehicle->status;
            $vehicle->note = $vehicle->notes;
            $vehicle->colore = $vehicle->color;
            $vehicle->chilometraggio = $vehicle->odometer;
            $vehicle->ore_motore = $vehicle->engine_hours;
            $vehicle->portata_max = $vehicle->max_load;
            $vehicle->numero_telaio = $vehicle->chassis_number;
            $vehicle->data_acquisto = $vehicle->purchase_date;
            $vehicle->prezzo_acquisto = $vehicle->purchase_price;
            $vehicle->misura_gomme_anteriori = $vehicle->front_tire_size;
            $vehicle->misura_gomme_posteriori = $vehicle->rear_tire_size;
            $vehicle->vin = $vehicle->vin_code;
            $vehicle->cilindrata = $vehicle->engine_capacity;
            $vehicle->codice_motore = $vehicle->engine_code;
            $vehicle->matricola_motore = $vehicle->engine_serial_number;
            $vehicle->cavalli_fiscali = $vehicle->fiscal_horsepower;
            $vehicle->potenza_kw = $vehicle->power_kw;
            $vehicle->numero_immatricolazione = $vehicle->registration_number;
            $vehicle->classe_euro = $vehicle->euro_classification;
            $vehicle->gruppi = $vehicle->groups;
            $vehicle->autista_assegnato = $vehicle->assigned_driver;
            $vehicle->data_prima_immatricolazione = $vehicle->first_registration_date;
            $vehicle->proprieta = $vehicle->ownership;
            $vehicle->carburante = $vehicle->fuel_type;
            $vehicle->km = $vehicle->odometer;
            $vehicle->contratto_titolare = $vehicle->contract_holder;
            $vehicle->tipo_proprieta = $vehicle->ownership_type;
            $vehicle->tipo_noleggio = $vehicle->rental_type;
            $vehicle->acconto_pagato = $vehicle->advance_paid;
            $vehicle->rata_finale = $vehicle->final_installment;
            $vehicle->canone_mensile = $vehicle->monthly_fee;
            $vehicle->data_inizio_contratto = $vehicle->contract_start_date;
            $vehicle->data_fine_contratto = $vehicle->contract_end_date;
            $vehicle->allarme_mensile = $vehicle->monthly_alert;
            $vehicle->allarme_fine = $vehicle->end_alert;
            $vehicle->giorno_pagamento_rata = $vehicle->installment_payment_day;
            $vehicle->fornitore = $vehicle->supplier;
            $vehicle->data_riconsegna = $vehicle->collection_date;
            $vehicle->durata_contratto_mesi = $vehicle->contract_duration_months;
            $vehicle->chilometraggio_contratto = $vehicle->contract_kilometers;
            $vehicle->importo_fattura_esclusa_iva = $vehicle->invoice_amount_excl_vat;
            $vehicle->importo_fattura_inclusa_iva = $vehicle->invoice_amount_incl_vat;
            $vehicle->attrezzatura_contratto = $vehicle->contract_equipment;
            $vehicle->pneumatici = $vehicle->tires;
            $vehicle->restituito_o_riscattato = $vehicle->returned_or_redeemed;
            $vehicle->link_esterno = $vehicle->external_link;
            
            return response()->json($vehicle, 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Si è verificato un errore durante la creazione del veicolo.',
                'exception' => get_class($e),
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Vehicle $vehicle)
    {
        try {
            $vehicle->load(['activities', 'deadlines']);
            
            // Gestiamo i campi decimali
            $vehicle->max_load = is_null($vehicle->max_load) ? null : $vehicle->max_load;
            $vehicle->purchase_price = is_null($vehicle->purchase_price) ? null : $vehicle->purchase_price;
            $vehicle->advance_paid = is_null($vehicle->advance_paid) ? null : $vehicle->advance_paid;
            $vehicle->final_installment = is_null($vehicle->final_installment) ? null : $vehicle->final_installment;
            $vehicle->monthly_fee = is_null($vehicle->monthly_fee) ? null : $vehicle->monthly_fee;
            $vehicle->invoice_amount_excl_vat = is_null($vehicle->invoice_amount_excl_vat) ? null : $vehicle->invoice_amount_excl_vat;
            $vehicle->invoice_amount_incl_vat = is_null($vehicle->invoice_amount_incl_vat) ? null : $vehicle->invoice_amount_incl_vat;
            $vehicle->power_kw = is_null($vehicle->power_kw) ? null : $vehicle->power_kw;
            $vehicle->engine_hours = is_null($vehicle->engine_hours) ? null : $vehicle->engine_hours;
            $vehicle->fuel_type = is_null($vehicle->fuel_type) ? null : $vehicle->fuel_type;
            
            // Aggiungiamo i campi in italiano
            $vehicle->targa = $vehicle->plate;
            $vehicle->nome = $vehicle->name;
            $vehicle->marca = $vehicle->brand;
            $vehicle->modello = $vehicle->model;
            $vehicle->anno = $vehicle->year;
            $vehicle->tipo = $vehicle->type;
            $vehicle->stato = $vehicle->status;
            $vehicle->note = $vehicle->notes;
            $vehicle->colore = $vehicle->color;
            $vehicle->chilometraggio = $vehicle->odometer;
            $vehicle->ore_motore = $vehicle->engine_hours;
            $vehicle->portata_max = $vehicle->max_load;
            $vehicle->numero_telaio = $vehicle->chassis_number;
            $vehicle->data_acquisto = $vehicle->purchase_date;
            $vehicle->prezzo_acquisto = $vehicle->purchase_price;
            $vehicle->misura_gomme_anteriori = $vehicle->front_tire_size;
            $vehicle->misura_gomme_posteriori = $vehicle->rear_tire_size;
            $vehicle->vin = $vehicle->vin_code;
            $vehicle->cilindrata = $vehicle->engine_capacity;
            $vehicle->codice_motore = $vehicle->engine_code;
            $vehicle->matricola_motore = $vehicle->engine_serial_number;
            $vehicle->cavalli_fiscali = $vehicle->fiscal_horsepower;
            $vehicle->potenza_kw = $vehicle->power_kw;
            $vehicle->numero_immatricolazione = $vehicle->registration_number;
            $vehicle->classe_euro = $vehicle->euro_classification;
            $vehicle->gruppi = $vehicle->groups;
            $vehicle->autista_assegnato = $vehicle->assigned_driver;
            $vehicle->data_prima_immatricolazione = $vehicle->first_registration_date;
            $vehicle->proprieta = $vehicle->ownership;
            $vehicle->carburante = $vehicle->fuel_type;
            $vehicle->km = $vehicle->odometer;
            $vehicle->contratto_titolare = $vehicle->contract_holder;
            $vehicle->tipo_proprieta = $vehicle->ownership_type;
            $vehicle->tipo_noleggio = $vehicle->rental_type;
            $vehicle->acconto_pagato = $vehicle->advance_paid;
            $vehicle->rata_finale = $vehicle->final_installment;
            $vehicle->canone_mensile = $vehicle->monthly_fee;
            $vehicle->data_inizio_contratto = $vehicle->contract_start_date;
            $vehicle->data_fine_contratto = $vehicle->contract_end_date;
            $vehicle->allarme_mensile = $vehicle->monthly_alert;
            $vehicle->allarme_fine = $vehicle->end_alert;
            $vehicle->giorno_pagamento_rata = $vehicle->installment_payment_day;
            $vehicle->fornitore = $vehicle->supplier;
            $vehicle->data_riconsegna = $vehicle->collection_date;
            $vehicle->durata_contratto_mesi = $vehicle->contract_duration_months;
            $vehicle->chilometraggio_contratto = $vehicle->contract_kilometers;
            $vehicle->importo_fattura_esclusa_iva = $vehicle->invoice_amount_excl_vat;
            $vehicle->importo_fattura_inclusa_iva = $vehicle->invoice_amount_incl_vat;
            $vehicle->attrezzatura_contratto = $vehicle->contract_equipment;
            $vehicle->pneumatici = $vehicle->tires;
            $vehicle->restituito_o_riscattato = $vehicle->returned_or_redeemed;
            $vehicle->link_esterno = $vehicle->external_link;
            
            // Aggiungiamo anche i campi mancanti
            $vehicle->name = $vehicle->name ?? '';
            $vehicle->chassis_number = $vehicle->chassis_number ?? '';
            $vehicle->vin_code = $vehicle->vin_code ?? '';
            $vehicle->engine_capacity = $vehicle->engine_capacity ?? '';
            $vehicle->engine_code = $vehicle->engine_code ?? '';
            $vehicle->engine_serial_number = $vehicle->engine_serial_number ?? '';
            $vehicle->fiscal_horsepower = $vehicle->fiscal_horsepower ?? '';
            $vehicle->registration_number = $vehicle->registration_number ?? '';
            $vehicle->euro_classification = $vehicle->euro_classification ?? '';
            $vehicle->groups = $vehicle->groups ?? '';
            $vehicle->assigned_driver = $vehicle->assigned_driver ?? '';
            $vehicle->first_registration_date = $vehicle->first_registration_date ?? null;
            $vehicle->ownership = $vehicle->ownership ?? '';
            $vehicle->current_profitability = $vehicle->current_profitability ?? '';
            $vehicle->contract_holder = $vehicle->contract_holder ?? '';
            $vehicle->ownership_type = $vehicle->ownership_type ?? '';
            $vehicle->rental_type = $vehicle->rental_type ?? '';
            $vehicle->monthly_alert = $vehicle->monthly_alert ?? '';
            $vehicle->end_alert = $vehicle->end_alert ?? '';
            $vehicle->installment_payment_day = $vehicle->installment_payment_day ?? '';
            $vehicle->supplier = $vehicle->supplier ?? '';
            $vehicle->collection_date = $vehicle->collection_date ?? null;
            $vehicle->contract_duration_months = $vehicle->contract_duration_months ?? null;
            $vehicle->contract_kilometers = $vehicle->contract_kilometers ?? null;
            $vehicle->contract_equipment = $vehicle->contract_equipment ?? '';
            $vehicle->tomtom = $vehicle->tomtom ?? '';
            $vehicle->tires = $vehicle->tires ?? '';
            $vehicle->returned_or_redeemed = $vehicle->returned_or_redeemed ?? '';
            $vehicle->link = $vehicle->link ?? '';
            $vehicle->status = $vehicle->status ?? 'operational';
            $vehicle->front_tire_size = $vehicle->front_tire_size ?? '';
            $vehicle->rear_tire_size = $vehicle->rear_tire_size ?? '';
            
            return response()->json($vehicle);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Si è verificato un errore durante il caricamento del veicolo.',
                'exception' => get_class($e),
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Vehicle $vehicle)
    {
        \Log::info('DEBUG VehicleController@update', [
            'user_id' => auth()->id(),
            'user' => auth()->user(),
            'is_admin' => auth()->user() ? auth()->user()->isAdmin() : null,
            'request' => $request->all(),
        ]);

    // $this->authorize('manage-anagrafiche'); // TEMPORANEO: disabilitato per debug gate

        try {
            $validated = $request->validate([
                'plate' => 'sometimes|string|max:20',
                'vin_code' => 'nullable|string|max:50',
                'engine_serial_number' => 'nullable|string|max:50',
                'brand' => 'sometimes|required|string|max:255',
                'model' => 'sometimes|required|string|max:255',
                'color' => 'nullable|string|max:50',
                'year' => 'nullable|integer',
                'type' => 'nullable|string|max:50',
                'fuel_type' => 'nullable|string|max:50',
                'max_load' => 'nullable|numeric',
                'first_registration_date' => 'nullable|date',
                'purchase_date' => 'nullable|date',
                'purchase_price' => 'nullable|numeric',
                'power_kw' => 'nullable|numeric',
                'odometer' => 'nullable|integer',
                'engine_hours' => 'nullable|numeric',
                'front_tire_size' => 'nullable|string|max:50',
                'rear_tire_size' => 'nullable|string|max:50',
                'status' => 'nullable|string|max:50',
                'notes' => 'nullable|string',
                'name' => 'nullable|string|max:255',
                'chassis_number' => 'nullable|string|max:255',
                'engine_capacity' => 'nullable|string|max:255',
                'engine_code' => 'nullable|string|max:255',
                'fiscal_horsepower' => 'nullable|string|max:255',
                'registration_number' => 'nullable|string|max:255',
                'euro_classification' => 'nullable|string|max:255',
                'groups' => 'nullable|string|max:255',
                'assigned_driver' => 'nullable|string|max:255',
                'ownership' => 'nullable|string|max:255',
                'current_profitability' => 'nullable|string|max:255',
                'contract_holder' => 'nullable|string|max:255',
                'ownership_type' => 'nullable|string|max:255',
                'rental_type' => 'nullable|string|max:255',
                'advance_paid' => 'nullable|numeric',
                'final_installment' => 'nullable|numeric',
                'monthly_fee' => 'nullable|numeric',
                'contract_start_date' => 'nullable|date',
                'contract_end_date' => 'nullable|date',
                'monthly_alert' => 'nullable|string|max:255',
                'end_alert' => 'nullable|string|max:255',
                'installment_payment_day' => 'nullable|string|max:255',
                'supplier' => 'nullable|string|max:255',
                'collection_date' => 'nullable|date',
                'contract_duration_months' => 'nullable|integer',
                'contract_kilometers' => 'nullable|integer',
                'invoice_amount_excl_vat' => 'nullable|numeric',
                'invoice_amount_incl_vat' => 'nullable|numeric',
                'contract_equipment' => 'nullable|string',
                'tomtom' => 'nullable|string|max:255',
                'tires' => 'nullable|string|max:255',
                'returned_or_redeemed' => 'nullable|string|max:255',

                // Campi in italiano
                'targa' => 'sometimes|string|max:20',
                'modello' => 'sometimes|string|max:255',
                'marca' => 'sometimes|string|max:255',
                'colore' => 'nullable|string|max:50',
                'anno' => 'nullable|integer',
                'tipo' => 'nullable|string|max:50',
                'carburante' => 'nullable|string|max:50',
                'km' => 'nullable|integer',
                'note' => 'nullable|string',
                'imei' => 'nullable|string|max:50',
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
            
            if (isset($validated['imei'])) {
                $data['imei'] = $validated['imei'];
            }
            
            // Fields that only exist in English - use null for empty values
            if (array_key_exists('vin_code', $validated)) $data['vin_code'] = $validated['vin_code'] === '' ? null : $validated['vin_code'];
            if (array_key_exists('engine_serial_number', $validated)) $data['engine_serial_number'] = $validated['engine_serial_number'] === '' ? null : $validated['engine_serial_number'];
            if (array_key_exists('max_load', $validated)) $data['max_load'] = $validated['max_load'] === '' ? null : $validated['max_load'];
            if (array_key_exists('first_registration_date', $validated)) $data['first_registration_date'] = $validated['first_registration_date'] === '' ? null : $validated['first_registration_date'];
            if (array_key_exists('purchase_date', $validated)) $data['purchase_date'] = $validated['purchase_date'] === '' ? null : $validated['purchase_date'];
            if (array_key_exists('purchase_price', $validated)) $data['purchase_price'] = $validated['purchase_price'] === '' ? null : $validated['purchase_price'];
            if (array_key_exists('power_kw', $validated)) $data['power_kw'] = $validated['power_kw'] === '' ? null : $validated['power_kw'];
            if (array_key_exists('engine_hours', $validated)) $data['engine_hours'] = $validated['engine_hours'] === '' ? null : $validated['engine_hours'];
            if (array_key_exists('front_tire_size', $validated)) $data['front_tire_size'] = $validated['front_tire_size'] === '' ? null : $validated['front_tire_size'];
            if (array_key_exists('rear_tire_size', $validated)) $data['rear_tire_size'] = $validated['rear_tire_size'] === '' ? null : $validated['rear_tire_size'];
            if (array_key_exists('name', $validated)) $data['name'] = $validated['name'] === '' ? null : $validated['name'];
            if (array_key_exists('chassis_number', $validated)) $data['chassis_number'] = $validated['chassis_number'] === '' ? null : $validated['chassis_number'];
            if (array_key_exists('engine_capacity', $validated)) $data['engine_capacity'] = $validated['engine_capacity'] === '' ? null : $validated['engine_capacity'];
            if (array_key_exists('engine_code', $validated)) $data['engine_code'] = $validated['engine_code'] === '' ? null : $validated['engine_code'];
            if (array_key_exists('fiscal_horsepower', $validated)) $data['fiscal_horsepower'] = $validated['fiscal_horsepower'] === '' ? null : $validated['fiscal_horsepower'];
            if (array_key_exists('registration_number', $validated)) $data['registration_number'] = $validated['registration_number'] === '' ? null : $validated['registration_number'];
            if (array_key_exists('euro_classification', $validated)) $data['euro_classification'] = $validated['euro_classification'] === '' ? null : $validated['euro_classification'];
            if (array_key_exists('groups', $validated)) $data['groups'] = $validated['groups'] === '' ? null : $validated['groups'];
            if (array_key_exists('assigned_driver', $validated)) $data['assigned_driver'] = $validated['assigned_driver'] === '' ? null : $validated['assigned_driver'];
            if (array_key_exists('ownership', $validated)) $data['ownership'] = $validated['ownership'] === '' ? null : $validated['ownership'];
            if (array_key_exists('current_profitability', $validated)) $data['current_profitability'] = $validated['current_profitability'] === '' ? null : $validated['current_profitability'];
            if (array_key_exists('contract_holder', $validated)) $data['contract_holder'] = $validated['contract_holder'] === '' ? null : $validated['contract_holder'];
            if (array_key_exists('ownership_type', $validated)) $data['ownership_type'] = $validated['ownership_type'] === '' ? null : $validated['ownership_type'];
            if (array_key_exists('rental_type', $validated)) $data['rental_type'] = $validated['rental_type'] === '' ? null : $validated['rental_type'];
            if (array_key_exists('advance_paid', $validated)) $data['advance_paid'] = $validated['advance_paid'] === '' ? null : $validated['advance_paid'];
            if (array_key_exists('final_installment', $validated)) $data['final_installment'] = $validated['final_installment'] === '' ? null : $validated['final_installment'];
            if (array_key_exists('monthly_fee', $validated)) $data['monthly_fee'] = $validated['monthly_fee'] === '' ? null : $validated['monthly_fee'];
            if (array_key_exists('contract_start_date', $validated)) $data['contract_start_date'] = $validated['contract_start_date'] === '' ? null : $validated['contract_start_date'];
            if (array_key_exists('contract_end_date', $validated)) $data['contract_end_date'] = $validated['contract_end_date'] === '' ? null : $validated['contract_end_date'];
            if (array_key_exists('monthly_alert', $validated)) $data['monthly_alert'] = $validated['monthly_alert'] === '' ? null : $validated['monthly_alert'];
            if (array_key_exists('end_alert', $validated)) $data['end_alert'] = $validated['end_alert'] === '' ? null : $validated['end_alert'];
            if (array_key_exists('installment_payment_day', $validated)) $data['installment_payment_day'] = $validated['installment_payment_day'] === '' ? null : $validated['installment_payment_day'];
            if (array_key_exists('supplier', $validated)) $data['supplier'] = $validated['supplier'] === '' ? null : $validated['supplier'];
            if (array_key_exists('collection_date', $validated)) $data['collection_date'] = $validated['collection_date'] === '' ? null : $validated['collection_date'];
            if (array_key_exists('contract_duration_months', $validated)) $data['contract_duration_months'] = $validated['contract_duration_months'] === '' ? null : $validated['contract_duration_months'];
            if (array_key_exists('contract_kilometers', $validated)) $data['contract_kilometers'] = $validated['contract_kilometers'] === '' ? null : $validated['contract_kilometers'];
            if (array_key_exists('invoice_amount_excl_vat', $validated)) $data['invoice_amount_excl_vat'] = $validated['invoice_amount_excl_vat'] === '' ? null : $validated['invoice_amount_excl_vat'];
            if (array_key_exists('invoice_amount_incl_vat', $validated)) $data['invoice_amount_incl_vat'] = $validated['invoice_amount_incl_vat'] === '' ? null : $validated['invoice_amount_incl_vat'];
            if (array_key_exists('contract_equipment', $validated)) $data['contract_equipment'] = $validated['contract_equipment'] === '' ? null : $validated['contract_equipment'];
            if (array_key_exists('tomtom', $validated)) $data['tomtom'] = $validated['tomtom'] === '' ? null : $validated['tomtom'];
            if (array_key_exists('tires', $validated)) $data['tires'] = $validated['tires'] === '' ? null : $validated['tires'];
            if (array_key_exists('returned_or_redeemed', $validated)) $data['returned_or_redeemed'] = $validated['returned_or_redeemed'] === '' ? null : $validated['returned_or_redeemed'];

            if (array_key_exists('status', $validated)) $data['status'] = $validated['status'] === '' ? null : $validated['status'];
            if (array_key_exists('gruppi', $validated)) $data['gruppi'] = $validated['gruppi'] === '' ? null : $validated['gruppi'];
            if (array_key_exists('autista_assegnato', $validated)) $data['autista_assegnato'] = $validated['autista_assegnato'] === '' ? null : $validated['autista_assegnato'];
            if (array_key_exists('link', $validated)) $data['link'] = $validated['link'] === '' ? null : $validated['link'];

            $vehicle->update($data);
            
            return response()->json($vehicle);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('VehicleController@update VALIDATION ERROR', [
                'errors' => $e->errors(),
                'message' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Errore di validazione',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('VehicleController@update EXCEPTION', [
                'message' => $e->getMessage(),
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Si è verificato un errore durante l\'aggiornamento del veicolo.',
                'exception' => get_class($e),
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Vehicle $vehicle)
    {
        $this->authorize('manage-anagrafiche');

        $vehicle->delete();
        return response()->json(null, 204);
    }
}