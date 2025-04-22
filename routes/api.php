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

// Rotta per il login spostata più in basso con middleware e logging

Route::middleware('web')->post('/logout', function (Request $request) {
    Auth::logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return response()->json(['message' => 'Logout ok']);
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    // Log per debug
    \Log::info('GET su /api/user', [
        'ip' => request()->ip(),
        'user-agent' => request()->userAgent(),
        'referer' => request()->headers->get('referer'),
        'full_url' => request()->fullUrl(),
        'headers' => $request->headers->all(),
        'user' => $request->user() ? $request->user()->id : null,
    ]);
    
    return $request->user();
});

// DEBUG: Log tutte le richieste GET sospette a /api/login
Route::get('/login', function () {
    \Log::info('GET su /api/login', [
        'ip' => request()->ip(),
        'user-agent' => request()->userAgent(),
        'referer' => request()->headers->get('referer'),
        'full_url' => request()->fullUrl(),
    ]);
    abort(405, 'Solo POST consentito');
});

// Log tutte le richieste POST a /api/login per debug
// Login Sanctum: sessione/cookie
Route::post('/login', [App\Http\Controllers\AuthController::class, 'login']);
Route::middleware('api')->post('/refresh', [AuthController::class, 'refresh']);

Route::middleware('auth:sanctum')->group(function () {
    // Le route reali restano sotto
    Route::apiResource('drivers', App\Http\Controllers\DriverController::class);
    Route::apiResource('vehicles', App\Http\Controllers\VehicleController::class);
    Route::apiResource('activities', App\Http\Controllers\ActivityController::class);
    Route::apiResource('clients', App\Http\Controllers\ClientController::class);
    Route::apiResource('sites', App\Http\Controllers\SiteController::class);
    Route::apiResource('activity-types', App\Http\Controllers\ActivityTypeController::class);
    Route::apiResource('vehicle-deadlines', App\Http\Controllers\VehicleDeadlineController::class);
    
    // Rotte aggiuntive per le relazioni
    Route::get('vehicles/{vehicle}/deadlines', [App\Http\Controllers\VehicleDeadlineController::class, 'getVehicleDeadlines']);
    Route::get('clients/{client}/sites', [App\Http\Controllers\SiteController::class, 'getClientSites']);
    Route::get('sites/{site}/activities', [App\Http\Controllers\ActivityController::class, 'getSiteActivities']);
    Route::get('clients/{client}/activities', [App\Http\Controllers\ActivityController::class, 'getClientActivities']);
    Route::get('drivers/{driver}/activities', [App\Http\Controllers\ActivityController::class, 'getDriverActivities']);
    Route::get('vehicles/{vehicle}/activities', [App\Http\Controllers\ActivityController::class, 'getVehicleActivities']);
    Route::get('available-resources', [App\Http\Controllers\ActivityController::class, 'getAvailableResources']);
});
