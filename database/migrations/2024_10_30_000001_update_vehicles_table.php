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
        // Verifica se la tabella vehicles esiste
        if (Schema::hasTable('vehicles')) {
            // Aggiungiamo i campi mancanti o modifichiamo quelli esistenti
            Schema::table('vehicles', function (Blueprint $table) {
                // Rinominiamo alcuni campi per allinearli alla nomenclatura richiesta
                // Nota: questi campi sono già presenti ma con nomi diversi
                
                // Verifichiamo se i campi esistono prima di aggiungerli
                if (!Schema::hasColumn('vehicles', 'matricola')) {
                    $table->string('matricola')->nullable();
                    // Nota: questo è probabilmente un duplicato di registration_number
                }
                
                // Aggiungiamo un campo per gestire le scadenze direttamente nella tabella vehicles
                // anche se esiste già una tabella separata vehicle_deadlines
                if (!Schema::hasColumn('vehicles', 'scadenze')) {
                    $table->text('scadenze')->nullable();
                }
                
                // Aggiungiamo un campo per le note se non esiste già
                if (!Schema::hasColumn('vehicles', 'note')) {
                    $table->text('note')->nullable();
                    // Nota: questo è probabilmente un duplicato di notes
                }
                
                // Aggiungiamo un campo per il link se non esiste già
                if (!Schema::hasColumn('vehicles', 'link')) {
                    $table->text('link')->nullable();
                    // Nota: questo è probabilmente un duplicato di external_link
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('vehicles')) {
            Schema::table('vehicles', function (Blueprint $table) {
                // Rimuoviamo i campi aggiunti
                $table->dropColumn([
                    'matricola',
                    'scadenze',
                    'note',
                    'link'
                ]);
            });
        }
    }
};