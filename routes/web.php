<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/login', function () {
    return redirect('http://localhost:3000/login');
})->name('login');

// Login con sessione web
Route::post('/login', [AuthController::class, 'login'])->middleware(['web']);

// Login con token API
Route::post('/token-login', [App\Http\Controllers\Api\AuthController::class, 'login']);

Route::get('/react-app', function () {
    return view('react-app');
});

// Route per il CSRF cookie di Sanctum
use Laravel\Sanctum\Http\Controllers\CsrfCookieController;
Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show'])->middleware('web');

// Rotta di debug sessione
Route::get('/session-debug', function (\Illuminate\Http\Request $request) {
    $request->session()->put('debug', 'ok');
    \Log::info('SESSION DEBUG TEST', [
        'session_id' => $request->session()->getId(),
        'session_data' => $request->session()->all(),
        'cookies' => $request->cookies->all(),
    ]);
    return response()->json([
        'session_id' => $request->session()->getId(),
        'session_data' => $request->session()->all(),
    ]);
});

// Rotta autenticata per ottenere l'utente corrente (SESSIONE WEB)
Route::middleware(['web', 'auth:sanctum'])->get('/user', function (\Illuminate\Http\Request $request) {
    \Log::info('SESSION DEBUG /user', [
        'session_id' => $request->session()->getId(),
        'session_data' => $request->session()->all(),
        'user' => $request->user(),
        'auth_check' => \Auth::check(),
        'cookies' => $request->cookies->all(),
    ]);
    return response()->json($request->user());
});

// Rotta di test per la sessione
Route::get('/session-test', function (\Illuminate\Http\Request $request) {
    $request->session()->put('test', 'ok');
    \Log::info('SESSION-TEST', [
        'session_driver' => config('session.driver'),
        'session_files_path' => config('session.files'),
        'session_id' => $request->session()->getId(),
        'session_started' => $request->session()->isStarted(),
        'session_file_exists' => file_exists(config('session.files') . '/' . $request->session()->getId()),
        'session_file_path' => config('session.files') . '/' . $request->session()->getId(),
    ]);
    return response()->json([
        'session_id' => $request->session()->getId(),
        'session_file_exists' => file_exists(config('session.files') . '/' . $request->session()->getId()),
        'session_file_path' => config('session.files') . '/' . $request->session()->getId(),
    ]);
});
