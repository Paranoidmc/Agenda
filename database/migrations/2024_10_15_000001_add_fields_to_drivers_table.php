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
        Schema::table('drivers', function (Blueprint $table) {
            // Informazioni personali aggiuntive
            $table->date('birth_date')->nullable()->after('surname');
            $table->string('birth_place')->nullable()->after('birth_date');
            $table->string('fiscal_code')->nullable()->after('birth_place');
            $table->string('address')->nullable()->after('fiscal_code');
            $table->string('city')->nullable()->after('address');
            $table->string('postal_code')->nullable()->after('city');
            $table->string('province')->nullable()->after('postal_code');
            
            // Informazioni patente aggiuntive
            $table->string('license_type')->nullable()->after('license_number');
            $table->date('license_issue_date')->nullable()->after('license_type');
            $table->string('license_issued_by')->nullable()->after('license_issue_date');
            
            // Informazioni lavorative
            $table->date('hire_date')->nullable()->after('license_expiry');
            $table->date('termination_date')->nullable()->after('hire_date');
            $table->string('employee_id')->nullable()->after('termination_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn([
                'birth_date',
                'birth_place',
                'fiscal_code',
                'address',
                'city',
                'postal_code',
                'province',
                'license_type',
                'license_issue_date',
                'license_issued_by',
                'hire_date',
                'termination_date',
                'employee_id',
            ]);
        });
    }
};