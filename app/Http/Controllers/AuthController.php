<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

use App\Models\User;

class AuthController extends Controller
{
    /**
     * Login utente e generazione token
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => 'Dati non validi'], 422);
        }

        $credentials = $request->only('email', 'password');
        if (!auth()->attempt($credentials)) {
            return response()->json(['error' => 'Credenziali non valide'], 401);
        }
        
        $user = auth()->user();
        $token = $user->createToken('api')->plainTextToken;
        $refreshToken = bin2hex(random_bytes(32)); // Genera un refresh token casuale
        
        // Salva il refresh token nell'utente (aggiungi un campo refresh_token alla tabella users)
        $user->refresh_token = $refreshToken;
        $user->save();
        
        return response()->json([
            'token' => $token,
            'refresh_token' => $refreshToken,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }
    
    /**
     * Refresh del token
     */
    public function refresh(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'refresh_token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => 'Refresh token mancante'], 422);
        }
        
        $refreshToken = $request->refresh_token;
        $user = User::where('refresh_token', $refreshToken)->first();
        
        if (!$user) {
            return response()->json(['error' => 'Refresh token non valido'], 401);
        }
        
        // Revoca tutti i token esistenti
        $user->tokens()->delete();
        
        // Genera un nuovo token
        $token = $user->createToken('api')->plainTextToken;
        $newRefreshToken = bin2hex(random_bytes(32));
        
        // Aggiorna il refresh token
        $user->refresh_token = $newRefreshToken;
        $user->save();
        
        return response()->json([
            'token' => $token,
            'refresh_token' => $newRefreshToken,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }
}
