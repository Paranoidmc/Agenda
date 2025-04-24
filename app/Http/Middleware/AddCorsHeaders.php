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
        // Per le richieste OPTIONS, restituisci una risposta vuota con gli header CORS
        if ($request->isMethod('OPTIONS')) {
            $response = response('', 200);
            
            if ($request->header('Origin') && $this->isAllowedOrigin($request->header('Origin'))) {
                $response->header('Access-Control-Allow-Origin', $request->header('Origin'));
                $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
                $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, X-CSRF-TOKEN, Accept');
                $response->header('Access-Control-Allow-Credentials', 'true');
                $response->header('Access-Control-Max-Age', '86400'); // 24 hours
            }
            
            return $response;
        }
        
        $response = $next($request);
        
        // Add CORS headers to all responses
        if ($request->header('Origin') && $this->isAllowedOrigin($request->header('Origin'))) {
            $response->header('Access-Control-Allow-Origin', $request->header('Origin'));
            $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, X-CSRF-TOKEN, Accept');
            $response->header('Access-Control-Allow-Credentials', 'true');
            $response->header('Access-Control-Max-Age', '86400'); // 24 hours
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
            'http://localhost:3001',
        ];
        
        // Per lo sviluppo, accetta tutte le origini
        return true;
        
        // In produzione, usa questo:
        // return in_array($origin, $allowedOrigins);
    }
}