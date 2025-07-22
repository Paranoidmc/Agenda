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
        Schema::create('activity_documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('activity_id');
            $table->unsignedBigInteger('document_id');
            $table->timestamps();
            
            // Foreign key constraints
            $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
            $table->foreign('document_id')->references('id')->on('documenti')->onDelete('cascade');
            
            // Unique constraint per evitare duplicati
            $table->unique(['activity_id', 'document_id']);
            
            // Indexes per performance
            $table->index('activity_id');
            $table->index('document_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_documents');
    }
};
