<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('driver_professional_licenses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('driver_id');
            $table->string('tipo');
            $table->string('numero')->nullable();
            $table->string('ente_rilascio')->nullable();
            $table->date('rilasciata_il')->nullable();
            $table->date('scadenza');
            $table->text('note')->nullable();
            $table->timestamps();

            $table->foreign('driver_id')->references('id')->on('drivers')->onDelete('cascade');
            $table->index(['driver_id', 'scadenza']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_professional_licenses');
    }
};
