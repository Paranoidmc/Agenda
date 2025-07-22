<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        if (!Schema::hasTable('documenti')) {
            Schema::create('documenti', function (Blueprint $table) {
                $table->id();
                $table->string('codice_doc')->nullable();
                $table->string('numero_doc')->nullable();
                $table->date('data_doc')->nullable();
                $table->unsignedBigInteger('client_id')->nullable();
                $table->unsignedBigInteger('site_id')->nullable();
                $table->unsignedBigInteger('driver_id')->nullable();
                $table->decimal('totale_doc', 12, 2)->nullable();
                $table->timestamps();
                $table->index(['codice_doc', 'numero_doc']);
            });
        }
        if (!Schema::hasTable('righe_documento')) {
            Schema::create('righe_documento', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('documento_id');
                $table->string('codice_articolo')->nullable();
                $table->text('descrizione')->nullable();
                $table->decimal('quantita', 12, 3)->nullable();
                $table->decimal('prezzo_unitario', 12, 4)->nullable();
                $table->string('sconto')->nullable();
                $table->decimal('totale_riga', 12, 2)->nullable();
                $table->timestamps();
                $table->foreign('documento_id')->references('id')->on('documenti')->onDelete('cascade');
            });
        }
    }
    public function down() {
        Schema::dropIfExists('righe_documento');
        Schema::dropIfExists('documenti');
    }
};
