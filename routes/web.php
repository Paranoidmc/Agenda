<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/login', function () {
    return redirect('http://localhost:3000/login');
})->name('login');

Route::get('/react-app', function () {
    return view('react-app');
});

// Route per il CSRF cookie di Sanctum
use Laravel\Sanctum\Http\Controllers\CsrfCookieController;
Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show']);
