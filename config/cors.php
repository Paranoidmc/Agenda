<?php

return [
    'paths' => [
        'api/*',
        'login',
        'logout',
        'user',
        'sanctum/csrf-cookie',
        'sanctum/*',
        // aggiunte esplicite per garantire matching
        'clients/*',
        'drivers/*',
        'sites/*',
        'vehicles/*',
        'activities*',
        'vehicle-deadlines*',
        'broadcasting/*'
    ],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://edilcipriano.peels.it',
        'https://attivita.edilcipriano.peels.it',
        'https://api.edilcipriano.peels.it'
    ],
    // Consente tutti i sottodomini *.peels.it in HTTPS
    'allowed_origins_patterns' => ['#^https:\/\/[a-z0-9-]+\.peels\.it$#i'],
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
