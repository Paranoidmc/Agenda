<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        try {
            $credentials = $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);

            if (!Auth::attempt($credentials)) {
                Log::error('Login fallito', ['email' => $request->email]);
                return response()->json(['message' => 'Credenziali non valide'], 401);
            }

            $user = Auth::user();
            Log::info('Login riuscito', ['email' => $user->email]);

            // Genera un token personale per l'utente
            $token = $user->createToken('api-token')->plainTextToken;

            return response()->json([
                'user' => $user,
                'token' => $token
            ]);
        } catch (\Exception $e) {
            Log::error('Errore durante il login', ['exception' => $e->getMessage()]);
            return response()->json(['message' => 'Errore durante il login'], 500);
        }
    }

    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logout effettuato']);
    }
}
