<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // Non è più necessario disabilitare la protezione CSRF, poiché l'abbiamo rimossa dal middleware API
        
        \Log::info('Tentativo login', [
            'email' => $request->input('email'),
            'password' => 'NASCOSTA',
            'all' => $request->except(['password']),
            'headers' => $request->headers->all(),
            'cookies' => $request->cookies->all(),
            'xsrf' => $request->header('X-XSRF-TOKEN'),
            'cookie_xsrf' => $request->cookie('XSRF-TOKEN'),
            'has_session' => $request->hasSession(),
        ]);
        
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required'
            ]);
            
            if (!Auth::attempt($request->only('email', 'password'), $request->boolean('remember'))) {
                return response()->json(['error' => 'Credenziali non valide'], 401);
            }
            
            $user = Auth::user();
            $token = $user->createToken('auth_token')->plainTextToken;
            
            return response()->json([
                'user' => $user,
                'token' => $token,
                'message' => 'Login effettuato con successo'
            ]);
        } catch (\Exception $e) {
            \Log::error('Errore login: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Errore durante il login: ' . $e->getMessage()
            ], 500);
        }
    }

    public function logout(Request $request)
    {
        // Revoca il token corrente
        if ($request->user()) {
            $request->user()->currentAccessToken()->delete();
        }
        
        // Logout dalla sessione web
        Auth::guard('web')->logout();
        
        // Invalida la sessione e rigenera il token CSRF
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }
        
        return response()->json(['message' => 'Logout effettuato con successo']);
    }

    public function user(Request $request)
    {
        return response()->json(Auth::user());
    }
}
