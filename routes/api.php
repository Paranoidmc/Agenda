<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\AuthController;

file_put_contents(storage_path('logs/api_route_loaded.log'), date('c')." api.php loaded\n", FILE_APPEND);

Route::get('/test-api', function () {
    return ['status' => 'ok'];
});

// Rotta per il login spostata più in basso con middleware e logging

Route::middleware('web')->post('/logout', function (Request $request) {
    Auth::logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return response()->json(['message' => 'Logout ok']);
});

Route::middleware('auth:api')->get('/user', function (Request $request) {
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
Route::middleware('api')->post('/login', function (Request $request) {
    \Log::info('POST su /api/login', [
        'ip' => request()->ip(),
        'user-agent' => request()->userAgent(),
        'referer' => request()->headers->get('referer'),
        'full_url' => request()->fullUrl(),
        'headers' => $request->headers->all(),
        'body' => $request->all(),
    ]);
    
    return app()->call([app(AuthController::class), 'login']);
});
Route::middleware('api')->post('/refresh', [AuthController::class, 'refresh']);

Route::middleware('auth:api')->group(function () {
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
});
