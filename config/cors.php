<?php

return [
    'paths' => ['api/*', 'login', 'logout', 'user', 'sanctum/csrf-cookie', 'refresh'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8000', 'http://127.0.0.1:8000'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['X-XSRF-TOKEN', 'Content-Type', 'Accept', 'Authorization', 'X-Requested-With', 'Application'],
    'exposed_headers' => ['*'],
    'max_age' => 0,
    'supports_credentials' => true,
];
