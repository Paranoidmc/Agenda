<?php

return [
    'paths' => [
        'api/*',
        'login',
        'logout',
        'user',
        'sanctum/csrf-cookie',
        'sanctum/*',
        'vehicles/*',
        'activities*',
        'vehicle-deadlines*'
    ],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['http://localhost:3000', 'http://localhost:3001', 'https://edilcipriano.peels.it'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-XSRF-TOKEN',
        'X-CSRF-TOKEN',
        'Accept',
        'X-Custom-Header',
        'X-Socket-ID',
        'X-Api-Version'
    ],
    'exposed_headers' => [
        'Authorization',
        'X-CSRF-TOKEN',
        'X-XSRF-TOKEN',
        'X-Api-Version',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'Link',
        'Content-Range'
    ],
    'max_age' => 0,
    'supports_credentials' => true,
    'forbidden_response' => [
        'message' => 'Forbidden (cors).',
        'status' => 403,
    ],
];
