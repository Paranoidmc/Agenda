<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->string('stato')->nullable()->after('status');
            $table->text('note')->nullable()->after('notes');
        });
        
        // Aggiorna i valori esistenti
        DB::statement('UPDATE activities SET stato = status, note = notes');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn('stato');
            $table->dropColumn('note');
        });
    }
};