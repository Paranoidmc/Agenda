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
        Schema::table('activity_resource', function (Blueprint $table) {
            if (!Schema::hasColumn('activity_resource', 'start_time')) {
                $table->dateTime('start_time')->nullable()->after('vehicle_id');
            }
            if (!Schema::hasColumn('activity_resource', 'end_time')) {
                $table->dateTime('end_time')->nullable()->after('start_time');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_resource', function (Blueprint $table) {
            $table->dropColumn(['start_time', 'end_time']);
        });
    }
};
