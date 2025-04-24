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
            // DEBUG avanzato sessione
            'session_driver' => config('session.driver'),
            'session_files_path' => config('session.files'),
            'session_id' => $request->hasSession() ? $request->session()->getId() : null,
            'session_started' => $request->hasSession() ? $request->session()->isStarted() : null,
            'session_file_exists' => $request->hasSession() ? file_exists(config('session.files') . '/' . $request->session()->getId()) : null,
            'session_file_path' => $request->hasSession() ? config('session.files') . '/' . $request->session()->getId() : null,
        ]);
        
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required'
            ]);
            
            if (!Auth::attempt($request->only('email', 'password'), $request->boolean('remember'))) {
                return response()->json(['error' => 'Credenziali non valide'], 401);
            }

            // Forza la rigenerazione della sessione dopo login
            if ($request->hasSession()) {
                $request->session()->regenerate();
            }
            
            $user = Auth::user();
            
            // Genera un token personale per l'utente
            $token = $user->createToken('api-token')->plainTextToken;
            
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
