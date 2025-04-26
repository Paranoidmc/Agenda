<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Verifichiamo che entrambe le tabelle esistano
        if (Schema::hasTable('vehicles') && Schema::hasTable('vehicles_complete')) {
            // Otteniamo tutti i veicoli dalla tabella originale
            $vehicles = DB::table('vehicles')->get();

            foreach ($vehicles as $vehicle) {
                // Inseriamo i dati nella nuova tabella con i nomi dei campi aggiornati
                DB::table('vehicles_complete')->insert([
                    'id' => $vehicle->id,
                    'nome' => $vehicle->name ?? null,
                    'targa' => $vehicle->plate,
                    'modello' => $vehicle->model ?? null,
                    'tipo_carburante' => $vehicle->fuel_type ?? null,
                    'status_mezzo' => $vehicle->status ?? 'operational',
                    'colore' => $vehicle->color ?? null,
                    'km_attuali' => $vehicle->odometer ?? null,
                    'ore_motore' => $vehicle->engine_hours ?? null,
                    'portata_kg' => $vehicle->max_load ?? null,
                    'numero_telaio' => $vehicle->chassis_number ?? null,
                    'data_acquisto' => $vehicle->purchase_date ?? null,
                    'costo_acquisto' => $vehicle->purchase_price ?? null,
                    'misura_gomme_anteriori' => $vehicle->front_tire_size ?? null,
                    'misura_gomme_posteriori' => $vehicle->rear_tire_size ?? null,
                    'codice_vin' => $vehicle->vin_code ?? null,
                    'cilindrata' => $vehicle->engine_capacity ?? null,
                    'codice_motore' => $vehicle->engine_code ?? null,
                    'numero_serie_motore' => $vehicle->engine_serial_number ?? null,
                    'cavalli_fiscali' => $vehicle->fiscal_horsepower ?? null,
                    'potenza_kw' => $vehicle->power_kw ?? null,
                    'matricola' => $vehicle->registration_number ?? null,
                    'classificazione_euro' => $vehicle->euro_classification ?? null,
                    'gruppi_autista_assegnato' => $vehicle->groups ?? null,
                    'data_prima_immatricolazione' => $vehicle->first_registration_date ?? null,
                    'proprieta' => $vehicle->ownership ?? null,
                    'redditivita_attuale' => $vehicle->current_profitability ?? null,
                    'intestatario_contratto' => $vehicle->contract_holder ?? null,
                    'tipo_proprieta' => $vehicle->ownership_type ?? null,
                    'tipologia_noleggio' => $vehicle->rental_type ?? null,
                    'anticipo_versato' => $vehicle->advance_paid ?? null,
                    'maxirata_finale' => $vehicle->final_installment ?? null,
                    'importo_rata_mensile' => $vehicle->monthly_fee ?? null,
                    'data_inizio_contratto' => $vehicle->contract_start_date ?? null,
                    'data_fine_contratto' => $vehicle->contract_end_date ?? null,
                    'alert_mensile' => $vehicle->monthly_alert ?? null,
                    'alert_fine' => $vehicle->end_alert ?? null,
                    'giorno_pagamento_rata' => $vehicle->installment_payment_day ?? null,
                    'fornitore' => $vehicle->supplier ?? null,
                    'data_ritiro' => $vehicle->collection_date ?? null,
                    'durata_contrattuale_mesi' => $vehicle->contract_duration_months ?? null,
                    'km_contrattuali' => $vehicle->contract_kilometers ?? null,
                    'canone_fattura_iva_esclusa' => $vehicle->invoice_amount_excl_vat ?? null,
                    'canone_fattura_iva_inclusa' => $vehicle->invoice_amount_incl_vat ?? null,
                    'dotazioni_contratto' => $vehicle->contract_equipment ?? null,
                    'note' => $vehicle->notes ?? null,
                    'tom_tom' => $vehicle->tomtom ?? null,
                    'pneumatici' => $vehicle->tires ?? null,
                    'veicolo_riconsegnato_riscattato' => $vehicle->returned_or_redeemed ?? null,
                    'link' => $vehicle->external_link ?? null,
                    'created_at' => $vehicle->created_at,
                    'updated_at' => $vehicle->updated_at,
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Svuotiamo la tabella vehicles_complete
        DB::table('vehicles_complete')->truncate();
    }
};