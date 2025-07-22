<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\DocumentoVeicolo;
use App\Policies\DocumentoVeicoloPolicy;
use App\Models\VehicleDeadline;
use App\Policies\VehicleDeadlinePolicy;
use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Support\Facades\Log;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        DocumentoVeicolo::class => DocumentoVeicoloPolicy::class,
        VehicleDeadline::class => VehicleDeadlinePolicy::class,
        User::class => UserPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Gates con debug logging
        Gate::define('admin', function ($user) {
            $result = $user->isAdmin();
            Log::info('Gate admin check', ['user_id' => $user->id, 'result' => $result]);
            return $result;
        });
        
        Gate::define('manage-activities', function ($user) {
            $result = $user->isAdmin() || $user->isManager();
            Log::info('Gate manage-activities check', ['user_id' => $user->id, 'result' => $result]);
            return $result;
        });
        
        Gate::define('manage-anagrafiche', function ($user) {
            $result = $user->isAdmin();
            Log::info('Gate manage-anagrafiche check', [
                'user_id' => $user->id, 
                'email' => $user->email,
                'role' => $user->role,
                'isAdmin' => $user->isAdmin(),
                'result' => $result
            ]);
            return $result;
        });
        
        Gate::define('view-own-deadlines', function ($user, $deadline) {
            $result = $user->id === $deadline->user_id;
            Log::info('Gate view-own-deadlines check', ['user_id' => $user->id, 'result' => $result]);
            return $result;
        });
    }
}
