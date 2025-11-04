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
        Schema::create('vehicle_rentals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('vehicle_id');
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
            $table->string('returned_or_redeemed')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('vehicle_id')->references('id')->on('vehicles')->onDelete('cascade');
            $table->index(['vehicle_id', 'is_active']);
            $table->index(['contract_start_date', 'contract_end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicle_rentals');
    }
};
