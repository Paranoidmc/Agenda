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
        Schema::table('vehicles', function (Blueprint $table) {
            // Informazioni tecniche
            $table->string('vin')->nullable()->after('plate')->comment('Vehicle Identification Number');
            $table->string('engine_number')->nullable()->after('vin');
            $table->string('color')->nullable()->after('model');
            $table->string('fuel_type')->nullable()->after('type');
            $table->integer('seats')->nullable()->after('fuel_type');
            $table->decimal('weight', 8, 2)->nullable()->after('seats')->comment('Weight in kg');
            $table->decimal('max_load', 8, 2)->nullable()->after('weight')->comment('Maximum load in kg');
            
            // Informazioni amministrative
            $table->date('registration_date')->nullable()->after('max_load');
            $table->date('purchase_date')->nullable()->after('registration_date');
            $table->decimal('purchase_price', 10, 2)->nullable()->after('purchase_date');
            $table->string('owner')->nullable()->after('purchase_price');
            
            // Informazioni assicurative
            $table->string('insurance_company')->nullable()->after('owner');
            $table->string('insurance_policy_number')->nullable()->after('insurance_company');
            $table->date('insurance_expiry')->nullable()->after('insurance_policy_number');
            
            // Informazioni manutenzione
            $table->integer('odometer')->nullable()->after('insurance_expiry')->comment('Current odometer reading in km');
            $table->date('last_maintenance_date')->nullable()->after('odometer');
            $table->integer('last_maintenance_odometer')->nullable()->after('last_maintenance_date')->comment('Odometer reading at last maintenance in km');
            $table->integer('maintenance_interval_km')->nullable()->after('last_maintenance_odometer')->comment('Maintenance interval in km');
            $table->integer('maintenance_interval_months')->nullable()->after('maintenance_interval_km')->comment('Maintenance interval in months');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn([
                'vin',
                'engine_number',
                'color',
                'fuel_type',
                'seats',
                'weight',
                'max_load',
                'registration_date',
                'purchase_date',
                'purchase_price',
                'owner',
                'insurance_company',
                'insurance_policy_number',
                'insurance_expiry',
                'odometer',
                'last_maintenance_date',
                'last_maintenance_odometer',
                'maintenance_interval_km',
                'maintenance_interval_months',
            ]);
        });
    }
};