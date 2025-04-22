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
        Schema::table('activities', function (Blueprint $table) {
            $table->date('data_inizio')->nullable()->after('date');
            $table->date('data_fine')->nullable()->after('data_inizio');
            $table->string('titolo')->nullable()->after('id');
            $table->text('descrizione')->nullable()->after('titolo');
        });
        
        // Aggiorna i valori esistenti
        DB::statement('UPDATE activities SET data_inizio = date, data_fine = date');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn('data_inizio');
            $table->dropColumn('data_fine');
            $table->dropColumn('titolo');
            $table->dropColumn('descrizione');
        });
    }
};