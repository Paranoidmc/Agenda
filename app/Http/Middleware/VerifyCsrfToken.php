<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array<int, string>
     */
    protected $except = [
        'sanctum/*',
        'sanctum/csrf-cookie',
        'sanctum/token',
        'login',
        'logout',
        'api/*',
        'api/login',
        'api/user',
        'api/logout',
        'api/vehicles/*',
        'api/vehicles',
        '*',
    ];
}