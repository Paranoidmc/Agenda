<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ProxyController extends Controller
{
    /**
     * Handle proxy requests to internal API routes
     * This allows the frontend to use /api/proxy/* in production instead of direct backend URLs
     * The proxy forwards requests to the actual API routes including authentication
     */
    public function handle(Request $request, string $path = '')
    {
        try {
            // Build the actual API route
            $method = $request->method();
            $route = rtrim($path, '/');
            
            Log::info('[Proxy request]', [
                'method' => $method,
                'path' => $route,
                'full_path' => $request->fullUrl(),
                'query' => $request->query(),
                'has_auth' => !empty($request->bearerToken()),
                'bearer_token' => $request->bearerToken() ? substr($request->bearerToken(), 0, 20) . '...' : null,
            ]);

            // Handle the route internally by creating a sub-request
            $uri = '/api/' . $route;
            
            if (!empty($request->query())) {
                $uri .= '?' . http_build_query($request->query());
            }

            Log::info('[Proxy] Creating sub-request', ['uri' => $uri]);

            // Forward the request to the internal API
            $subRequest = Request::create(
                $uri,
                $method,
                $request->all(),
                $request->cookies->all(),
                $request->files->all(),
                $request->server->all()
            );

            // Copy all headers from the original request
            foreach ($request->headers->all() as $key => $value) {
                $subRequest->headers->set($key, $value, false);
            }

            // Ensure authentication is set on the sub-request
            if ($token = $request->bearerToken()) {
                $subRequest->headers->set('Authorization', 'Bearer ' . $token, false);
                $subRequest->headers->set('Accept', 'application/json', false);
            }

            Log::info('[Proxy] Handling sub-request', [
                'uri' => $uri,
                'has_auth_header' => $subRequest->hasHeader('Authorization'),
            ]);

            // Handle the sub-request through the application
            // This will properly apply middleware including auth:sanctum
            $response = app()->handle($subRequest);
            
            Log::info('[Proxy response]', [
                'status' => $response->getStatusCode(),
                'path' => $route,
            ]);
            
            return $response;
            
        } catch (\Exception $e) {
            Log::error('[Proxy error]', [
                'path' => $path,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Proxy error',
                'message' => $e->getMessage(),
                'path' => $path
            ], 500);
        }
    }
}
