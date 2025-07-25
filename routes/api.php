<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\SessionLoginController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VehicleDocumentController;
use App\Http\Controllers\DriverController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ActivityTypeController;
use App\Http\Controllers\SiteController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\VehicleController;
use App\Http\Controllers\MomapController;
use App\Http\Controllers\ArcaSettingsController;
use App\Http\Controllers\DocumentiController;

use App\Http\Controllers\VehicleDeadlineController;
use App\Http\Controllers\VehicleTrackingController;
use Laravel\Sanctum\Http\Controllers\CsrfCookieController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// =========================================================================
// PUBLIC ROUTES
// =========================================================================
// These routes do not require authentication.

// Arca settings API (temporaneamente pubbliche)
Route::get('/settings/arca', [ArcaSettingsController::class, 'get']);
Route::post('/settings/arca', [ArcaSettingsController::class, 'save']);
Route::post('/arca/test-login', [ArcaSettingsController::class, 'testLogin']);

// Sanctum CSRF Cookie: Essential for initializing session-based authentication.
Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show']);

// Session-based Login: The primary endpoint for users to log in.
Route::post('/session-login-controller', [SessionLoginController::class, 'login']);

// Fallback route for unauthenticated requests, required by Sanctum's middleware.
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthenticated.'], 401);
})->name('login');


// =========================================================================
// PROTECTED ROUTES
// =========================================================================
// These routes require session-based authentication via Sanctum.

Route::middleware(['web', 'auth:sanctum'])->group(function () {

    // MOMAP settings (temporaneamente senza can:admin per debug)
    Route::get('/momap/device-data/{imei}', [\App\Http\Controllers\MomapDeviceController::class, 'deviceData']);
    Route::get('/settings/momap', [\App\Http\Controllers\MomapController::class, 'getCredentials']);
    Route::post('/settings/momap', [\App\Http\Controllers\MomapController::class, 'saveCredentials']);
    Route::post('/momap/test-login', [\App\Http\Controllers\MomapController::class, 'testLogin']);

    // Get the currently authenticated user's data.
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Logout the user, invalidating the session.
    Route::any('/logout', function (Request $request) {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['message' => 'Logout effettuato con successo']);
    });

    // User Management (typically admin-only, protected by gates in the controller)
    Route::apiResource('users', UserController::class);

    // Vehicle Documents
    Route::get('/veicoli/{veicolo}/documenti', [VehicleDocumentController::class, 'index']);
    Route::post('/veicoli/{veicolo}/documenti', [VehicleDocumentController::class, 'store']);
    Route::get('/documenti/{documento}/download', [VehicleDocumentController::class, 'download']);
    Route::delete('/documenti/{documento}', [VehicleDocumentController::class, 'destroy']);
    Route::put('/documenti/{documento}', [VehicleDocumentController::class, 'update']);

    // Core API Resources
    Route::apiResource('drivers', DriverController::class);
    Route::apiResource('clients', ClientController::class);
    Route::apiResource('activity-types', ActivityTypeController::class);
    Route::apiResource('sites', SiteController::class);
    Route::apiResource('vehicles', VehicleController::class);

    Route::apiResource('activities', ActivityController::class);

    // La rotta specifica per 'all' deve essere definita PRIMA dell'apiResource per evitare conflitti
    Route::get('/vehicle-deadlines/all', [VehicleDeadlineController::class, 'allWithVehicles']);
    Route::apiResource('vehicle-deadlines', VehicleDeadlineController::class);

    // Vehicle-related routes
    Route::get('/vehicles/{vehicle}/activities', [ActivityController::class, 'getVehicleActivities']);
    Route::get('/vehicles/{vehicle}/deadlines', [VehicleDeadlineController::class, 'getVehicleDeadlines']);

    // GPS Tracking Routes
    Route::get('/vehicles/{vehicle}/position', [VehicleTrackingController::class, 'getVehiclePosition']);
    Route::post('/vehicles/{vehicle}/position', [VehicleTrackingController::class, 'updateVehiclePosition']);
    Route::post('/vehicles/positions', [VehicleTrackingController::class, 'getMultipleVehiclePositions']);

    // Documenti API routes
    Route::middleware(['web', 'auth'])->group(function () {
        Route::get('/documenti', [DocumentiController::class, 'index']);
        Route::get('/documenti/{id}', [DocumentiController::class, 'show']);
        Route::get('/documenti/{id}/pdf', [DocumentiController::class, 'generatePdf']);
        Route::post('/documenti/sincronizza-oggi', [DocumentiController::class, 'sincronizzaOggi']);
        Route::post('/documenti/sync', [DocumentiController::class, 'syncDocumenti']);
        Route::get('/documenti/suggerisci', [DocumentiController::class, 'suggerisciPerAttivita']);
        Route::post('/documenti/suggest-for-activity', [DocumentiController::class, 'suggestDocumentsForActivity']);
    });

    // Relationship Routes
    Route::get('clients/{client}/sites', [SiteController::class, 'getClientSites']);
    Route::post('clients/{client}/sites', [SiteController::class, 'store']);
    Route::get('sites/{site}/activities', [ActivityController::class, 'getSiteActivities']);
    Route::get('clients/{client}/activities', [ActivityController::class, 'getClientActivities']);
    Route::get('drivers/{driver}/activities', [ActivityController::class, 'getDriverActivities']);
    
    // Allegamento documenti alle attività
    Route::post('activities/attach-document', [ActivityController::class, 'attachDocument']);
    Route::get('activities/{activity}/documents', [ActivityController::class, 'getAttachedDocuments']);
    
    // Other routes
    Route::get('available-resources', [ActivityController::class, 'getAvailableResources']);
});
