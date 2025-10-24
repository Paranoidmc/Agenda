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

    public function apiLogin(Request $request)
    {
        Log::info('API LOGIN: Tentativo login con token', [
            'email' => $request->input('email'),
            'headers' => $request->headers->all(),
        ]);
        
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required'
            ]);
            
            $attempt = \Illuminate\Support\Facades\Auth::attempt($request->only('email', 'password'));
            
            if (!$attempt) {
                return response()->json(['error' => 'Credenziali non valide'], 401);
            }
            
            $user = \Illuminate\Support\Facades\Auth::user();
            
            // Crea un token per l'utente
            $token = $user->createToken('api-token')->plainTextToken;
            
            Log::info('API LOGIN: Token creato per utente', [
                'user_id' => $user->id,
                'email' => $user->email,
                'token_preview' => substr($token, 0, 10) . '...'
            ]);
            
            return response()->json([
                'user' => $user,
                'token' => $token,
                'message' => 'Login effettuato con successo'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Errore API login: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Errore durante il login: ' . $e->getMessage()
            ], 500);
        }
    }
}
