<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AddCorsHeaders
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        
        // Add CORS headers to all responses
        if (!$response->headers->has('Access-Control-Allow-Origin') && $request->header('Origin')) {
            $response->header('Access-Control-Allow-Origin', $request->header('Origin'));
        }
        
        if (!$response->headers->has('Access-Control-Allow-Methods')) {
            $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        }
        
        if (!$response->headers->has('Access-Control-Allow-Headers')) {
            $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN');
        }
        
        if (!$response->headers->has('Access-Control-Allow-Credentials')) {
            $response->header('Access-Control-Allow-Credentials', 'true');
        }
        
        return $response;
    }
}