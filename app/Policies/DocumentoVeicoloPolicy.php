<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Models\DocumentoVeicolo;

class DocumentoVeicoloPolicy
{
    /**
     * Tutti gli utenti autenticati possono vedere la lista documenti.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Tutti gli utenti autenticati possono visualizzare ogni documento.
     */
    public function view(User $user, DocumentoVeicolo $documento): bool
    {
        return true;
    }

    /**
     * Tutti gli utenti autenticati possono creare documenti.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Tutti gli utenti autenticati possono aggiornare documenti.
     */
    public function update(User $user, DocumentoVeicolo $documento): bool
    {
        return true;
    }

    /**
     * Tutti gli utenti autenticati possono eliminare documenti.
     */
    public function delete(User $user, DocumentoVeicolo $documento): bool
    {
        return true;
    }


}
