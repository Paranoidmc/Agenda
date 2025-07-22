<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ArcaSettingsController extends Controller
{
    // GET /api/settings/arca
    public function get()
    {
        $row = DB::table('settings')->where('key', 'arca_credentials')->first();
        if (!$row) return response()->json(["username" => "", "password" => ""]);
        $data = json_decode(Crypt::decryptString($row->value), true);
        return response()->json([
            "username" => $data['username'] ?? '',
            "password" => $data['password'] ?? '' // restituisce la password solo per uso interno, mai in frontend reale
        ]);
    }

    // POST /api/settings/arca
    public function save(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);
        $data = [
            'username' => $request->input('username'),
            'password' => $request->input('password'),
        ];
        $encrypted = Crypt::encryptString(json_encode($data));
        DB::table('settings')->updateOrInsert(
            ['key' => 'arca_credentials'],
            ['value' => $encrypted]
        );
        return response()->json(['success' => true]);
    }

    // POST /api/arca/test-login
    public function testLogin(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);
        
        $username = $request->input('username');
        $password = $request->input('password');
        
        Log::info('Arca test login attempt', [
            'username' => $username,
            'password_length' => strlen($password)
        ]);
        
        $client = new \GuzzleHttp\Client([
            'base_uri' => 'http://ws.grsis.it:8082/api-arca/cgf/',
            'timeout'  => 10.0,
            'verify' => false, // Disabilita verifica SSL per test
        ]);
        
        try {
            Log::info('Sending request to Arca API', [
                'url' => 'http://ws.grsis.it:8082/api-arca/cgf/auth/login',
                'username' => $username
            ]);
            
            $res = $client->post('auth/login', [
                'json' => [
                    'username' => $username,
                    'password' => $password,
                ],
                'headers' => [
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json'
                ]
            ]);
            
            $statusCode = $res->getStatusCode();
            $body = $res->getBody()->getContents();
            
            Log::info('Arca API response', [
                'status_code' => $statusCode,
                'body' => $body
            ]);
            
            $data = json_decode($body, true);
            
            if ($statusCode === 200 && isset($data['token'])) {
                Log::info('Arca login successful', ['token_length' => strlen($data['token'])]);
                return response()->json(['success' => true, 'token' => $data['token']]);
            } else {
                Log::warning('Arca login failed - no token', ['response_data' => $data]);
                return response()->json([
                    'success' => false, 
                    'message' => 'Token non ricevuto',
                    'details' => $data
                ], 400);
            }
        } catch (\GuzzleHttp\Exception\RequestException $e) {
            $response = $e->getResponse();
            $statusCode = $response ? $response->getStatusCode() : 0;
            $responseBody = $response ? $response->getBody()->getContents() : 'No response';
            
            Log::error('Arca API request failed', [
                'status_code' => $statusCode,
                'response_body' => $responseBody,
                'error_message' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false, 
                'message' => 'Errore di connessione: ' . $e->getMessage(),
                'status_code' => $statusCode,
                'response' => $responseBody
            ], 400);
        } catch (\Exception $e) {
            Log::error('Arca test login exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false, 
                'message' => 'Errore interno: ' . $e->getMessage()
            ], 500);
        }
    }
}
