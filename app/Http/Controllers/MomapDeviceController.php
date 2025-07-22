<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use App\Http\Controllers\MomapController;

class MomapDeviceController extends Controller
{
    /**
     * Restituisce i dati live di un veicolo MOMAP dato l'IMEI.
     */
    public function deviceData(Request $request, string $imei)
    {
        $token = MomapController::getMomapToken();
        if (!$token) {
            return response()->json(['success' => false, 'error' => 'Token MOMAP non disponibile.'], 401);
        }
        $url = 'https://auth-api.momap.it/v1/Customers/Devices/deviceData?imei=' . urlencode($imei);
        $res = Http::timeout(10)->withToken($token)->get($url);
        if ($res->successful() && $res->json('success')) {
            return response()->json(['success' => true, 'data' => $res->json('data')]);
        }
        // Se token scaduto, tenta un refresh e riprova una volta
        if ($res->status() === 401 || ($res->json('error') ?? '') === 'Token non valido') {
            $token = MomapController::getMomapToken(); // forza refresh
            $res = Http::timeout(10)->withToken($token)->get($url);
            if ($res->successful() && $res->json('success')) {
                return response()->json(['success' => true, 'data' => $res->json('data')]);
            }
        }
        Log::error('MOMAP deviceData error', ['imei' => $imei, 'response' => $res->json()]);
        return response()->json([
            'success' => false,
            'error' => $res->json('error') ?? 'Errore MOMAP',
            'status' => $res->status()
        ], $res->status());
    }
}
