<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        \Log::info('MIDDLEWARE ATTIVI', app('router')->getCurrentRoute()->gatherMiddleware());
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
            
            \Log::info('LOGIN: richiesta ricevuta', [
                'email' => $request->input('email'),
                'cookie' => $request->cookie(),
                'session_id' => $request->hasSession() ? $request->session()->getId() : null
            ]);

            $attempt = Auth::attempt($request->only('email', 'password'), $request->boolean('remember'));
            \Log::info('LOGIN: risultato Auth::attempt', ['result' => $attempt]);

            if (!$attempt) {
                $response = response()->json(['error' => 'Credenziali non valide'], 401);
                \Log::info('HEADERS DI RISPOSTA LOGIN (401)', $response->headers->all());
                return $response;
            }
            // Forza il guard web per la sessione
            Auth::shouldUse('web');
            \Log::info('LOGIN: guard usato', ['guard' => Auth::getDefaultDriver()]);

            // Forza la rigenerazione della sessione dopo login
            if ($request->hasSession()) {
                $request->session()->regenerate();
                \Log::info('LOGIN: sessione rigenerata', [
                    'session_id' => $request->session()->getId()
                ]);
            } else {
                \Log::warning('LOGIN: sessione NON presente dopo login!');
            }
            
            $user = Auth::user();
            \Log::info('LOGIN: utente autenticato', [
                'id' => $user ? $user->id : null,
                'email' => $user ? $user->email : null
            ]);

            // Salva user_id e email in sessione per debug
            if ($request->hasSession()) {
                $request->session()->put('user_id', $user->id);
                $request->session()->put('user_email', $user->email);
                \Log::info('LOGIN: dati scritti in sessione', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'session_all' => $request->session()->all()
                ]);
            }

            $response = response()->json([
                'user' => $user,
                'message' => 'Login effettuato con successo'
            ]);

            // Logga tutti gli header di risposta
            \Log::info('HEADERS DI RISPOSTA LOGIN', $response->headers->all());
            return $response;
        } catch (\Exception $e) {
            \Log::error('Errore login: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            $response = response()->json([
                'error' => 'Errore durante il login: ' . $e->getMessage()
            ], 500);
            \Log::info('HEADERS DI RISPOSTA LOGIN (500)', $response->headers->all());
            return $response;
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
