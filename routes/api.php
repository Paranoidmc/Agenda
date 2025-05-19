<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Api\AuthController as ApiAuthController;

file_put_contents(storage_path('logs/api_route_loaded.log'), date('c')." api.php loaded\n", FILE_APPEND);

Route::get('/test-api', function () {
    return ['status' => 'ok'];
});

// Rotte senza autenticazione per i veicoli
Route::get('/vehicles', [App\Http\Controllers\VehicleController::class, 'index']);
Route::get('/vehicles/{vehicle}', [App\Http\Controllers\VehicleController::class, 'show']);
Route::get('/vehicles/{vehicle}/activities', [App\Http\Controllers\ActivityController::class, 'getVehicleActivities']);
Route::get('/vehicles/{vehicle}/deadlines', [App\Http\Controllers\VehicleDeadlineController::class, 'getVehicleDeadlines']);
Route::get('/vehicle-deadlines', [App\Http\Controllers\VehicleDeadlineController::class, 'index']);
Route::get('/vehicle-deadlines/all', [App\Http\Controllers\VehicleDeadlineController::class, 'allWithVehicles']);

// Test route for CORS
Route::get('/cors-test', function (Request $request) {
    return response()->json([
        'message' => 'CORS is working!',
        'origin' => $request->header('Origin'),
        'method' => $request->method(),
        'headers' => $request->headers->all(),
    ]);
});

// Route per il CSRF cookie di Sanctum
use Laravel\Sanctum\Http\Controllers\CsrfCookieController;
Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show']);

// LOGIN API SESSION
Route::post('/login', [App\Http\Controllers\AuthController::class, 'login']);

// LOGOUT API SESSION
Route::middleware(['auth:sanctum'])->post('/logout', function (Request $request) {
    // Revoca il token corrente se presente
    if ($request->user()) {
        $request->user()->currentAccessToken()->delete();
    }
    
    // Logout dalla sessione web
    Auth::logout();
    
    // Invalida la sessione e rigenera il token CSRF
    if ($request->hasSession()) {
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
    
    return response()->json(['message' => 'Logout effettuato con successo']);
});

// USER API SESSION
Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    Log::info('GET su /api/user', [
        'ip' => request()->ip(),
        'user-agent' => request()->userAgent(),
        'referer' => request()->headers->get('referer'),
        'full_url' => request()->fullUrl(),
        'headers' => $request->headers->all(),
        'user' => $request->user() ? $request->user()->id : null,
        // DEBUG avanzato sessione
        'session_driver' => config('session.driver'),
        'session_files_path' => config('session.files'),
        'session_id' => $request->hasSession() ? $request->session()->getId() : null,
        'session_started' => $request->hasSession() ? $request->session()->isStarted() : null,
        'session_file_exists' => $request->hasSession() ? file_exists(config('session.files') . '/' . $request->session()->getId()) : null,
        'session_file_path' => $request->hasSession() ? config('session.files') . '/' . $request->session()->getId() : null,
    ]);
    return $request->user();
});

// DEBUG: Log tutte le richieste GET sospette a /api/login
Route::get('/login', function () {
    Log::info('GET su /api/login', [
        'ip' => request()->ip(),
        'user-agent' => request()->userAgent(),
        'referer' => request()->headers->get('referer'),
        'full_url' => request()->fullUrl(),
    ]);
    abort(405, 'Solo POST consentito');
});

// Login API con token
Route::post('/token-login', [ApiAuthController::class, 'login']);
Route::middleware('api')->post('/refresh', [AuthController::class, 'refresh']);

Route::middleware(['auth:sanctum'])->group(function () {
    // Le route reali restano sotto
    Route::apiResource('drivers', App\Http\Controllers\DriverController::class);
    Route::get('/activities/new', [App\Http\Controllers\ActivityController::class, 'create']);
    
    // Per i veicoli, solo le operazioni di modifica richiedono autenticazione
    Route::post('vehicles', [App\Http\Controllers\VehicleController::class, 'store']);
    Route::put('vehicles/{vehicle}', [App\Http\Controllers\VehicleController::class, 'update']);
    Route::patch('vehicles/{vehicle}', [App\Http\Controllers\VehicleController::class, 'update']);
    Route::delete('vehicles/{vehicle}', [App\Http\Controllers\VehicleController::class, 'destroy']);
    
    Route::apiResource('activities', App\Http\Controllers\ActivityController::class);
    Route::apiResource('clients', App\Http\Controllers\ClientController::class);
    Route::apiResource('sites', App\Http\Controllers\SiteController::class);
    Route::apiResource('activity-types', App\Http\Controllers\ActivityTypeController::class);
    Route::apiResource('vehicle-deadlines', App\Http\Controllers\VehicleDeadlineController::class);
    
    // Rotte aggiuntive per le relazioni
    // Rotta principale per le sedi dei clienti (GET: elenco sedi, POST: aggiungi sede)
    Route::get('clients/{client}/sites', [App\Http\Controllers\SiteController::class, 'getClientSites']);
    Route::post('clients/{client}/sites', [App\Http\Controllers\SiteController::class, 'store']);
    Route::get('sites/{site}/activities', [App\Http\Controllers\ActivityController::class, 'getSiteActivities']);
    Route::get('clients/{client}/activities', [App\Http\Controllers\ActivityController::class, 'getClientActivities']);
    Route::get('drivers/{driver}/activities', [App\Http\Controllers\ActivityController::class, 'getDriverActivities']);
    Route::get('available-resources', [App\Http\Controllers\ActivityController::class, 'getAvailableResources']);
});
