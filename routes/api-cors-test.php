<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Test route for CORS
Route::get('/cors-test', function (Request $request) {
    return response()->json([
        'message' => 'CORS is working!',
        'origin' => $request->header('Origin'),
        'method' => $request->method(),
        'headers' => $request->headers->all(),
    ]);
});