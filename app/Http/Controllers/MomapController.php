<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Setting;

class MomapController extends Controller
{
    /**
     * Recupera le credenziali MOMAP salvate (solo admin).
     */
    public function getCredentials(Request $request)
    {
        // Autorizzazione gestita dal middleware nelle rotte
        $setting = Setting::where('key', 'momap_credentials')->first();
        if (!$setting) {
            return response()->json([ 'email' => '', 'password' => '' ]);
        }
        $data = json_decode(Crypt::decryptString($setting->value), true);
        return response()->json([
            'email' => $data['email'] ?? '',
            'password' => $data['password'] ?? ''
        ]);
    }

    /**
     * Salva le credenziali MOMAP (solo admin).
     */
    public function saveCredentials(Request $request)
    {
        // Autorizzazione gestita dal middleware nelle rotte
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:4',
        ]);
        $data = [
            'email' => $request->email,
            'password' => $request->password
        ];
        Setting::updateOrCreate(
            ['key' => 'momap_credentials'],
            ['value' => Crypt::encryptString(json_encode($data))]
        );
        // Invalida token in cache
        Cache::forget('momap_token');
        return response()->json(['success' => true]);
    }

    /**
     * Effettua login MOMAP e salva il token in cache.
     */
    public function testLogin(Request $request)
    {
        // Autorizzazione gestita dal middleware nelle rotte
        $email = $request->email;
        $password = $request->password;
        $url = 'https://auth-api.momap.it/v1/Customers/Authentication/login';
        $res = Http::timeout(10)->post($url, [
            'email' => $email,
            'password' => $password
        ]);
        if ($res->successful() && $res->json('success')) {
            $token = $res->json('data.token');
            // Salva token in cache per 55 minuti (token dura 1h)
            Cache::put('momap_token', $token, now()->addMinutes(55));
            return response()->json(['success' => true, 'token' => $token]);
        }
        return response()->json([
            'success' => false,
            'error' => $res->json('error') ?? 'Login MOMAP fallito'
        ], 401);
    }

    /**
     * Recupera il token MOMAP da cache o effettua login se scaduto.
     */
    public static function getMomapToken()
    {
        $token = Cache::get('momap_token');
        if ($token) return $token;
        $setting = Setting::where('key', 'momap_credentials')->first();
        if (!$setting) return null;
        $data = json_decode(Crypt::decryptString($setting->value), true);
        $url = 'https://auth-api.momap.it/v1/Customers/Authentication/login';
        $res = Http::timeout(10)->post($url, [
            'email' => $data['email'] ?? '',
            'password' => $data['password'] ?? ''
        ]);
        if ($res->successful() && $res->json('success')) {
            $token = $res->json('data.token');
            Cache::put('momap_token', $token, now()->addMinutes(55));
            return $token;
        }
        Log::error('MOMAP login failed', ['response' => $res->json()]);
        return null;
    }
}
