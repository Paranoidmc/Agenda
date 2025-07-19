<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SessionLoginController extends Controller
{
    public function login(Request $request)
    {
        Log::info('MIDDLEWARE ATTIVI SESSION-LOGIN-CONTROLLER', app('router')->getCurrentRoute()->gatherMiddleware());
        return app(AuthController::class)->login($request);
    }
}
