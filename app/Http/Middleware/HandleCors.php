<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class HandleCors
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
        // For preflight OPTIONS requests, return an empty response with CORS headers
        if ($request->isMethod('OPTIONS')) {
            $response = response('', 200);
            
            // Add CORS headers manually for OPTIONS requests
            $response->header('Access-Control-Allow-Origin', $request->header('Origin'));
            $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, X-CSRF-TOKEN, Accept');
            $response->header('Access-Control-Allow-Credentials', 'true');
            $response->header('Access-Control-Max-Age', '86400'); // 24 hours
            
            return $response;
        }
        
        // For non-OPTIONS requests, process the request normally
        $response = $next($request);
        
        // Ensure CORS headers are set on the response
        if ($request->header('Origin')) {
            $response->header('Access-Control-Allow-Origin', $request->header('Origin'));
            $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, X-CSRF-TOKEN, Accept');
            $response->header('Access-Control-Allow-Credentials', 'true');
        }
        
        return $response;
    }
    
}
