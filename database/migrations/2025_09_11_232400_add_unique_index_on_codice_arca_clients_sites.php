<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Normalizza stringhe vuote a NULL per evitare violazioni banali
        DB::table('clients')->where('codice_arca', '')->update(['codice_arca' => null]);
        DB::table('sites')->where('codice_arca', '')->update(['codice_arca' => null]);

        // Controllo duplicati prima di aggiungere UNIQUE
        $dupClients = DB::table('clients')
            ->select('codice_arca', DB::raw('COUNT(*) as n'))
            ->whereNotNull('codice_arca')
            ->groupBy('codice_arca')
            ->having('n', '>', 1)
            ->get();
        $dupSites = DB::table('sites')
            ->select('codice_arca', DB::raw('COUNT(*) as n'))
            ->whereNotNull('codice_arca')
            ->groupBy('codice_arca')
            ->having('n', '>', 1)
            ->get();

        if ($dupClients->count() > 0 || $dupSites->count() > 0) {
            $msg = "Impossibile aggiungere UNIQUE su codice_arca: trovati duplicati. Risolvere e riprovare. ";
            $msg .= 'clients dup: ' . $dupClients->count() . ', sites dup: ' . $dupSites->count();
            throw new RuntimeException($msg);
        }

        Schema::table('clients', function (Blueprint $table) {
            // Aggiungi indice unico se non esiste già
            $table->unique('codice_arca', 'clients_codice_arca_unique');
        });

        Schema::table('sites', function (Blueprint $table) {
            // Aggiungi indice unico se non esiste già
            $table->unique('codice_arca', 'sites_codice_arca_unique');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropUnique('clients_codice_arca_unique');
        });
        Schema::table('sites', function (Blueprint $table) {
            $table->dropUnique('sites_codice_arca_unique');
        });
    }
};
