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
        Schema::table('documenti', function (Blueprint $table) {
            // Campi documento mancanti dalla specifica API Arca
            $table->string('numero_doc_rif')->nullable()->after('numero_doc');
            $table->date('data_doc_rif')->nullable()->after('data_doc');
            $table->date('data_consegna')->nullable()->after('data_doc_rif');
            $table->string('agente1')->nullable()->after('driver_id');
            $table->string('agente2')->nullable()->after('agente1');
            $table->decimal('totale_imponibile_doc', 10, 2)->nullable()->after('totale_doc');
            $table->decimal('totale_imposta_doc', 10, 2)->nullable()->after('totale_imponibile_doc');
            $table->decimal('totale_sconto_doc', 10, 2)->nullable()->after('totale_imposta_doc');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documenti', function (Blueprint $table) {
            // Rimuovi campi aggiunti
            $table->dropColumn([
                'numero_doc_rif',
                'data_doc_rif', 
                'data_consegna',
                'agente1',
                'agente2',
                'totale_imponibile_doc',
                'totale_imposta_doc',
                'totale_sconto_doc'
            ]);
        });
    }
};
