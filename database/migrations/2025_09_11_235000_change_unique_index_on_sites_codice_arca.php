<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rimuove l'univocità su solo codice_arca se esiste (uso raw per evitare deferred exceptions)
        $exists = DB::select("SHOW INDEX FROM `sites` WHERE Key_name = 'sites_codice_arca_unique'");
        if (!empty($exists)) {
            DB::statement('ALTER TABLE `sites` DROP INDEX `sites_codice_arca_unique`');
        }

        // Aggiunge univocità composita (client_id, codice_arca) solo se non esiste già
        $existsComposite = DB::select("SHOW INDEX FROM `sites` WHERE Key_name = 'sites_client_codice_arca_unique'");
        if (empty($existsComposite)) {
            Schema::table('sites', function (Blueprint $table) {
                $table->unique(['client_id', 'codice_arca'], 'sites_client_codice_arca_unique');
            });
        }
    }

    public function down(): void
    {
        // Rimuove l'univocità composita se esiste
        $existsComposite = DB::select("SHOW INDEX FROM `sites` WHERE Key_name = 'sites_client_codice_arca_unique'");
        if (!empty($existsComposite)) {
            DB::statement('ALTER TABLE `sites` DROP INDEX `sites_client_codice_arca_unique`');
        }

        // Ripristina unique su codice_arca singolo (se necessario)
        $existsSingle = DB::select("SHOW INDEX FROM `sites` WHERE Key_name = 'sites_codice_arca_unique'");
        if (empty($existsSingle)) {
            Schema::table('sites', function (Blueprint $table) {
                $table->unique('codice_arca', 'sites_codice_arca_unique');
            });
        }
    }
};
