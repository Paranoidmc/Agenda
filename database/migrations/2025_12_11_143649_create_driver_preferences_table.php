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
        Schema::create('driver_preferences', function (Blueprint $table) {
            $table->id();
            $table->boolean('is_global')->default(false)->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->json('driver_order')->nullable(); // Array di ID driver ordinati
            $table->json('hidden_drivers')->nullable(); // Array di ID driver nascosti
            $table->timestamps();
            
            // Un solo record globale (is_global = true, user_id = null)
            // Un record per utente (is_global = false, user_id = user_id)
            $table->unique(['is_global', 'user_id']);
            
            if (Schema::hasTable('users')) {
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('driver_preferences');
    }
};
