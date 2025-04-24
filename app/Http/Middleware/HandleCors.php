<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Cors\Middleware\HandleCors as Middleware;

class HandleCors extends Middleware
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
            if ($request->header('Origin') && $this->isAllowedOrigin($request->header('Origin'))) {
                $response->header('Access-Control-Allow-Origin', $request->header('Origin'));
                $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
                $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, X-CSRF-TOKEN, Accept');
                $response->header('Access-Control-Allow-Credentials', 'true');
                $response->header('Access-Control-Max-Age', '86400'); // 24 hours
            }
            
            return $response;
        }
        
        // For non-OPTIONS requests, use the parent middleware
        $response = parent::handle($request, $next);
        
        // Ensure CORS headers are set on the response
        if ($request->header('Origin') && $this->isAllowedOrigin($request->header('Origin'))) {
            $response->header('Access-Control-Allow-Origin', $request->header('Origin'));
            $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, X-CSRF-TOKEN, Accept');
            $response->header('Access-Control-Allow-Credentials', 'true');
        }
        
        return $response;
    }
    
    /**
     * Verifica se l'origine è consentita
     * 
     * @param string $origin
     * @return bool
     */
    protected function isAllowedOrigin($origin)
    {
        $allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:8000',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:8000',
            'http://localhost',
        ];
        
        return in_array($origin, $allowedOrigins);
    }
}
