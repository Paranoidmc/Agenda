<?php

namespace App\Policies;

use App\Models\User;
use App\Models\VehicleDeadline;
use Illuminate\Auth\Access\HandlesAuthorization;

class VehicleDeadlinePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     *
     * @param  \App\Models\User  $user
     * @return bool
     */
    public function viewAny(User $user)
    {
        // Qualsiasi utente autenticato può vedere l'elenco delle scadenze.
        return true;
    }

    /**
     * Determine whether the user can view the model.
     *
     * @param  \App\Models\User  $user
     * @param  \App\Models\VehicleDeadline  $vehicleDeadline
     * @return bool
     */
    public function view(User $user, VehicleDeadline $vehicleDeadline)
    {
        // Qualsiasi utente autenticato può vedere una singola scadenza.
        return true;
    }

    /**
     * Determine whether the user can create models.
     *
     * @param  \App\Models\User  $user
     * @return bool
     */
    public function create(User $user)
    {
        // Solo gli admin possono creare scadenze.
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can update the model.
     *
     * @param  \App\Models\User  $user
     * @param  \App\Models\VehicleDeadline  $vehicleDeadline
     * @return bool
     */
    public function update(User $user, VehicleDeadline $vehicleDeadline)
    {
        // Solo gli admin possono aggiornare le scadenze.
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the model.
     *
     * @param  \App\Models\User  $user
     * @param  \App\Models\VehicleDeadline  $vehicleDeadline
     * @return bool
     */
    public function delete(User $user, VehicleDeadline $vehicleDeadline)
    {
        // Solo gli admin possono eliminare le scadenze.
        return $user->isAdmin();
    }
}
