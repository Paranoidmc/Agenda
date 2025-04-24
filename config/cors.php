<?php

return [
    'paths' => ['*', 'api/*', 'login', 'logout', 'user', 'sanctum/csrf-cookie', 'sanctum/*', 'api/vehicles/*', 'api/vehicles'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => ['*'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'X-XSRF-TOKEN', 'X-CSRF-TOKEN', 'Accept'],
    'exposed_headers' => ['*'],
    'max_age' => 86400,
    'supports_credentials' => true,
];
