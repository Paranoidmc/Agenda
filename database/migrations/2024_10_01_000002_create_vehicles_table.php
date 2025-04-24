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
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->string('plate')->unique();
            $table->string('brand');
            $table->string('model');
            $table->year('year')->nullable();
            $table->string('type')->nullable();
            $table->string('status')->default('operational');
            $table->text('notes')->nullable();
            // Nuovi campi richiesti
            $table->string('name')->nullable();
            $table->string('fuel_type')->nullable();
            $table->string('color')->nullable();
            $table->integer('odometer')->nullable();
            $table->integer('engine_hours')->nullable();
            $table->decimal('max_load', 8, 2)->nullable();
            $table->string('chassis_number')->nullable();
            $table->date('purchase_date')->nullable();
            $table->decimal('purchase_price', 10, 2)->nullable();
            $table->string('front_tire_size')->nullable();
            $table->string('rear_tire_size')->nullable();
            $table->string('vin_code')->nullable();
            $table->string('engine_capacity')->nullable();
            $table->string('engine_code')->nullable();
            $table->string('engine_serial_number')->nullable();
            $table->string('fiscal_horsepower')->nullable();
            $table->decimal('power_kw', 5, 2)->nullable();
            $table->string('registration_number')->nullable();
            $table->string('euro_classification')->nullable();
            $table->string('groups')->nullable();
            $table->string('assigned_driver')->nullable();
            $table->date('first_registration_date')->nullable();
            $table->string('ownership')->nullable();
            $table->string('current_profitability')->nullable();
            $table->string('contract_holder')->nullable();
            $table->string('ownership_type')->nullable();
            $table->string('rental_type')->nullable();
            $table->decimal('advance_paid', 10, 2)->nullable();
            $table->decimal('final_installment', 10, 2)->nullable();
            $table->decimal('monthly_fee', 10, 2)->nullable();
            $table->date('contract_start_date')->nullable();
            $table->date('contract_end_date')->nullable();
            $table->string('monthly_alert')->nullable();
            $table->string('end_alert')->nullable();
            $table->string('installment_payment_day')->nullable();
            $table->string('supplier')->nullable();
            $table->date('collection_date')->nullable();
            $table->integer('contract_duration_months')->nullable();
            $table->integer('contract_kilometers')->nullable();
            $table->decimal('invoice_amount_excl_vat', 10, 2)->nullable();
            $table->decimal('invoice_amount_incl_vat', 10, 2)->nullable();
            $table->text('contract_equipment')->nullable();
            $table->string('tomtom')->nullable();
            $table->string('tires')->nullable();
            $table->string('returned_or_redeemed')->nullable();
            $table->text('external_link')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};