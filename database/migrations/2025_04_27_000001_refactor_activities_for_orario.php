<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            // Nuovi campi SOLO se non esistono già
            if (!Schema::hasColumn('activities', 'data_inizio')) {
                $table->dateTime('data_inizio')->after('id');
            }
            if (!Schema::hasColumn('activities', 'data_fine')) {
                $table->dateTime('data_fine')->nullable()->after('data_inizio');
            }
            // Rendi nullable driver_id e vehicle_id
            $table->unsignedBigInteger('driver_id')->nullable()->change();
            $table->unsignedBigInteger('vehicle_id')->nullable()->change();
            // Rimuovi vecchi campi se esistono
            if (Schema::hasColumn('activities', 'titolo')) $table->dropColumn('titolo');
            if (Schema::hasColumn('activities', 'date')) $table->dropColumn('date');
            if (Schema::hasColumn('activities', 'time_slot')) $table->dropColumn('time_slot');
            if (Schema::hasColumn('activities', 'start_time')) $table->dropColumn('start_time');
            if (Schema::hasColumn('activities', 'end_time')) $table->dropColumn('end_time');
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->string('titolo')->nullable();
            $table->date('date')->nullable();
            $table->string('time_slot')->nullable();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->unsignedBigInteger('driver_id')->nullable(false)->change();
            $table->unsignedBigInteger('vehicle_id')->nullable(false)->change();
            $table->dropColumn(['data_inizio', 'data_fine']);
        });
    }
};
