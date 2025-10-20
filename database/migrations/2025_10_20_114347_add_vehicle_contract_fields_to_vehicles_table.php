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
            // Campi motore/telaio
            $table->string('vin_code', 50)->nullable()->after('imei');
            $table->string('engine_serial_number', 50)->nullable()->after('vin_code');
            $table->string('chassis_number', 255)->nullable()->after('engine_serial_number');
            $table->string('engine_capacity', 255)->nullable()->after('chassis_number');
            $table->string('engine_code', 255)->nullable()->after('engine_capacity');
            $table->string('fiscal_horsepower', 255)->nullable()->after('engine_code');
            $table->decimal('power_kw', 10, 2)->nullable()->after('fiscal_horsepower');
            $table->decimal('engine_hours', 10, 2)->nullable()->after('power_kw');
            $table->string('front_tire_size', 50)->nullable()->after('engine_hours');
            $table->string('rear_tire_size', 50)->nullable()->after('front_tire_size');
            
            // Campi amministrativi
            $table->string('registration_number', 255)->nullable()->after('rear_tire_size');
            $table->string('euro_classification', 255)->nullable()->after('registration_number');
            $table->date('first_registration_date')->nullable()->after('euro_classification');
            $table->string('ownership', 255)->nullable()->after('first_registration_date');
            $table->string('current_profitability', 255)->nullable()->after('ownership');
            $table->string('supplier', 255)->nullable()->after('current_profitability');
            $table->date('collection_date')->nullable()->after('supplier');
            
            // Campi contratto/noleggio
            $table->string('contract_holder', 255)->nullable()->after('collection_date');
            $table->string('ownership_type', 255)->nullable()->after('contract_holder');
            $table->string('rental_type', 255)->nullable()->after('ownership_type');
            $table->decimal('advance_paid', 10, 2)->nullable()->after('rental_type');
            $table->decimal('final_installment', 10, 2)->nullable()->after('advance_paid');
            $table->decimal('monthly_fee', 10, 2)->nullable()->after('final_installment');
            $table->date('contract_start_date')->nullable()->after('monthly_fee');
            $table->date('contract_end_date')->nullable()->after('contract_start_date');
            $table->string('monthly_alert', 255)->nullable()->after('contract_end_date');
            $table->string('end_alert', 255)->nullable()->after('monthly_alert');
            $table->string('installment_payment_day', 255)->nullable()->after('end_alert');
            $table->integer('contract_duration_months')->nullable()->after('installment_payment_day');
            $table->integer('contract_kilometers')->nullable()->after('contract_duration_months');
            $table->decimal('invoice_amount_excl_vat', 10, 2)->nullable()->after('contract_kilometers');
            $table->decimal('invoice_amount_incl_vat', 10, 2)->nullable()->after('invoice_amount_excl_vat');
            $table->text('contract_equipment')->nullable()->after('invoice_amount_incl_vat');
            $table->string('tomtom', 255)->nullable()->after('contract_equipment');
            $table->string('tires', 255)->nullable()->after('tomtom');
            $table->string('returned_or_redeemed', 255)->nullable()->after('tires');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn([
                'vin_code',
                'engine_serial_number',
                'chassis_number',
                'engine_capacity',
                'engine_code',
                'fiscal_horsepower',
                'power_kw',
                'engine_hours',
                'front_tire_size',
                'rear_tire_size',
                'registration_number',
                'euro_classification',
                'first_registration_date',
                'ownership',
                'current_profitability',
                'supplier',
                'collection_date',
                'contract_holder',
                'ownership_type',
                'rental_type',
                'advance_paid',
                'final_installment',
                'monthly_fee',
                'contract_start_date',
                'contract_end_date',
                'monthly_alert',
                'end_alert',
                'installment_payment_day',
                'contract_duration_months',
                'contract_kilometers',
                'invoice_amount_excl_vat',
                'invoice_amount_incl_vat',
                'contract_equipment',
                'tomtom',
                'tires',
                'returned_or_redeemed',
            ]);
        });
    }
};
