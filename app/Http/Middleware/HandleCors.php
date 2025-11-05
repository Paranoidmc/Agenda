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
        $origin = $request->header('Origin');
        
        // Verifica se l'origine è consentita
        if (!$this->isAllowedOrigin($origin)) {
            return response()->json(['error' => 'CORS: Origin not allowed'], 403);
        }
        
        // For preflight OPTIONS requests, return an empty response with CORS headers
        if ($request->isMethod('OPTIONS')) {
            $response = response('', 200);
            
            // Add CORS headers manually for OPTIONS requests
            $response->header('Access-Control-Allow-Origin', $origin);
            $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, X-CSRF-TOKEN, Accept');
            $response->header('Access-Control-Allow-Credentials', 'true');
            $response->header('Access-Control-Max-Age', '86400'); // 24 hours
            
            return $response;
        }
        
        // For non-OPTIONS requests, process the request normally
        $response = $next($request);
        
        // Ensure CORS headers are set on the response
        if ($origin) {
            $response->header('Access-Control-Allow-Origin', $origin);
            $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, X-CSRF-TOKEN, Accept');
            $response->header('Access-Control-Allow-Credentials', 'true');
        }
        
        return $response;
    }
    
    /**
     * Verifica se l'origine è consentita
     */
    protected function isAllowedOrigin($origin)
    {
        if (!$origin) {
            return false;
        }
        
        $corsConfig = config('cors');
        $allowedOrigins = $corsConfig['allowed_origins'] ?? [];
        $allowedPatterns = $corsConfig['allowed_origins_patterns'] ?? [];
        
        // Controlla origini esatte
        if (in_array($origin, $allowedOrigins)) {
            return true;
        }
        
        // Controlla pattern regex
        foreach ($allowedPatterns as $pattern) {
            if (preg_match($pattern, $origin)) {
                return true;
            }
        }
        
        return false;
    }
    
}
