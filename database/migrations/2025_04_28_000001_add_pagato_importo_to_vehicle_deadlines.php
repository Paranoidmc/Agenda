<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('vehicle_deadlines', function (Blueprint $table) {
            $table->boolean('pagato')->default(false)->after('status');
            $table->decimal('importo', 10, 2)->default(0)->after('pagato');
        });
    }

    public function down()
    {
        Schema::table('vehicle_deadlines', function (Blueprint $table) {
            $table->dropColumn(['pagato', 'importo']);
        });
    }
};
