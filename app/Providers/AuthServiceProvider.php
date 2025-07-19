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


        Gate::define('manage-activities', fn($user) => $user->isAdmin() || $user->isManager());
        Gate::define('manage-anagrafiche', fn($user) => $user->isAdmin());
        Gate::define('view-own-deadlines', fn($user, $deadline) => $user->id === $deadline->user_id);
    }
}
