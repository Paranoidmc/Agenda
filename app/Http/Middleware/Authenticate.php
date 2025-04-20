<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo($request)
    {
        // Per richieste API, restituisci solo 401 JSON (niente redirect)
        if ($request->expectsJson()) {
            // Per richieste API: nessun redirect
            return null;
        }
        
        // Per richieste web, redirect alla pagina di login
        return route('login');
    }
}
