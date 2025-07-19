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
        Schema::create('documenti_veicolo', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('veicolo_id');
            $table->string('categoria'); // bollo, assicurazione, manutenzione
            $table->string('file_path');
            $table->string('descrizione')->nullable();
            $table->date('data_scadenza')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('veicolo_id')->references('id')->on('vehicles')->onDelete('cascade');
            $table->index(['veicolo_id', 'categoria']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documenti_veicolo');
    }
};
