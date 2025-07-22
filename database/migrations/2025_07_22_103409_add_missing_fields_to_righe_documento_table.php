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
        Schema::table('righe_documento', function (Blueprint $table) {
            // Campi righe documento mancanti dalla specifica API Arca
            $table->integer('riga')->nullable()->after('documento_id');
            $table->string('unita')->nullable()->after('quantita');
            $table->decimal('prezzo_scontato', 10, 2)->nullable()->after('sconto');
            $table->string('codice_iva')->nullable()->after('prezzo_scontato');
            $table->date('data_consegna')->nullable()->after('totale_riga');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('righe_documento', function (Blueprint $table) {
            // Rimuovi campi aggiunti
            $table->dropColumn([
                'riga',
                'unita',
                'prezzo_scontato',
                'codice_iva',
                'data_consegna'
            ]);
        });
    }
};
