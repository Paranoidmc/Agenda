<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Creiamo una nuova tabella vehicles_complete che contiene tutti i campi richiesti
        // con i nomi esatti specificati
        Schema::create('vehicles_complete', function (Blueprint $table) {
            $table->id();
            $table->text('scadenze')->nullable(); // Scadenze
            $table->string('nome')->nullable(); // Nome
            $table->string('targa')->unique(); // Targa
            $table->string('modello')->nullable(); // Modello
            $table->string('tipo_carburante')->nullable(); // Tipo di carburante
            $table->string('status_mezzo')->default('operational'); // Status del mezzo
            $table->string('colore')->nullable(); // Colore
            $table->integer('km_attuali')->nullable(); // Km attuali del veicolo
            $table->integer('ore_motore')->nullable(); // Ore motore
            $table->decimal('portata_kg', 8, 2)->nullable(); // Portata (Kg)
            $table->string('numero_telaio')->nullable(); // Numero di telaio
            $table->date('data_acquisto')->nullable(); // Data di acquisto
            $table->decimal('costo_acquisto', 10, 2)->nullable(); // Costo di acquisto
            $table->string('misura_gomme_anteriori')->nullable(); // Misura gomme anteriori
            $table->string('misura_gomme_posteriori')->nullable(); // Misura gomme posteriori
            $table->string('codice_vin')->nullable(); // Codice VIN
            $table->string('cilindrata')->nullable(); // Cilindrata
            $table->string('codice_motore')->nullable(); // Codice motore
            $table->string('numero_serie_motore')->nullable(); // Numero di serie motore
            $table->string('cavalli_fiscali')->nullable(); // Cavalli fiscali (CV)
            $table->decimal('potenza_kw', 5, 2)->nullable(); // Potenza (KW)
            $table->string('matricola')->nullable(); // Matricola
            $table->string('classificazione_euro')->nullable(); // Classificazione Euro
            $table->string('gruppi_autista_assegnato')->nullable(); // Gruppi Autista assegnato
            $table->date('data_prima_immatricolazione')->nullable(); // Data prima immatricolazione
            $table->string('proprieta')->nullable(); // Proprietà
            $table->string('redditivita_attuale')->nullable(); // Redditività attuale
            $table->string('intestatario_contratto')->nullable(); // Intestatario del contratto
            $table->string('tipo_proprieta')->nullable(); // Tipo di Proprietà
            $table->string('tipologia_noleggio')->nullable(); // Tipologia di noleggio
            $table->decimal('anticipo_versato', 10, 2)->nullable(); // Anticipo versato
            $table->decimal('maxirata_finale', 10, 2)->nullable(); // Maxi-rata finale
            $table->decimal('importo_rata_mensile', 10, 2)->nullable(); // Importo rata mensile
            $table->date('data_inizio_contratto')->nullable(); // Data inizio contratto
            $table->date('data_fine_contratto')->nullable(); // Data fine contratto
            $table->string('alert_mensile')->nullable(); // Alert mensile
            $table->string('alert_fine')->nullable(); // Alert di fine
            $table->string('giorno_pagamento_rata')->nullable(); // Giorno pagamento rata
            $table->string('fornitore')->nullable(); // Fornitore
            $table->date('data_ritiro')->nullable(); // Data ritiro
            $table->integer('durata_contrattuale_mesi')->nullable(); // Durata contrattuale (mesi)
            $table->integer('km_contrattuali')->nullable(); // Km contrattuali
            $table->decimal('canone_fattura_iva_esclusa', 10, 2)->nullable(); // Canone fattura iva esclusa
            $table->decimal('canone_fattura_iva_inclusa', 10, 2)->nullable(); // Canone fattura iva inclusa
            $table->text('dotazioni_contratto')->nullable(); // Dotazioni da contratto
            $table->text('note')->nullable(); // Note
            $table->string('tom_tom')->nullable(); // Tom Tom
            $table->string('pneumatici')->nullable(); // Pneumatici
            $table->string('veicolo_riconsegnato_riscattato')->nullable(); // Veicolo riconsegnato/Riscattato
            $table->text('link')->nullable(); // Link
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicles_complete');
    }
};