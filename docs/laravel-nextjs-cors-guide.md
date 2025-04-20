# Guida alla configurazione CORS tra Laravel 12 e Next.js

Questa guida fornisce i passaggi corretti e universali per gestire le problematiche CORS (Cross-Origin Resource Sharing) quando si sviluppa un'applicazione con backend Laravel 12 e frontend Next.js.

## Indice
1. [Configurazione Laravel](#configurazione-laravel)
2. [Configurazione Next.js](#configurazione-nextjs)
3. [Gestione dell'autenticazione](#gestione-dellautenticazione)
4. [Risoluzione problemi comuni](#risoluzione-problemi-comuni)
5. [Best practices](#best-practices)

## Configurazione Laravel

### 1. Installare e configurare il middleware CORS

Laravel 12 include già il supporto CORS tramite il pacchetto `fruitcake/laravel-cors`. Assicurati che sia configurato correttamente:

```bash
# Se non è già installato
composer require fruitcake/laravel-cors
```

### 2. Configurare il file `config/cors.php`

```php
<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'user', 'refresh'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        // Aggiungi qui i domini di produzione quando necessario
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => [
        'X-XSRF-TOKEN',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Requested-With',
        'Application'
    ],
    'exposed_headers' => ['*'],
    'max_age' => 0,
    'supports_credentials' => true, // Importante per le richieste autenticate
];
```

### 3. Registrare il middleware CORS in `app/Http/Kernel.php`

Assicurati che il middleware CORS sia registrato correttamente:

```php
protected $middleware = [
    // Posizionalo all'inizio dell'array per assicurarti che venga eseguito prima di altri middleware
    \App\Http\Middleware\HandleCors::class,
    // Altri middleware...
];

protected $middlewareGroups = [
    'api' => [
        \App\Http\Middleware\HandleCors::class, // Anche nel gruppo API
        \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        // Altri middleware...
    ],
    // ...
];
```

### 4. Creare o modificare il middleware `HandleCors`

```php
<?php

namespace App\Http\Middleware;

use Illuminate\Cors\Middleware\HandleCors as Middleware;

class HandleCors extends Middleware
{
    // La configurazione viene presa da config/cors.php
}
```

### 5. Correggere il middleware di autenticazione

Modifica `app/Http/Middleware/Authenticate.php` per gestire correttamente le richieste API:

```php
<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo($request)
    {
        // Per richieste API, non fare redirect ma restituisci 401
        if ($request->expectsJson()) {
            return null;
        }
        
        // Per richieste web, redirect alla pagina di login
        return route('login');
    }
}
```

## Configurazione Next.js

### 1. Configurare il proxy API in `next.config.js` o `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
      {
        source: '/sanctum/:path*',
        destination: 'http://127.0.0.1:8000/sanctum/:path*',
      },
      {
        source: '/login',
        destination: 'http://127.0.0.1:8000/login',
      },
      {
        source: '/logout',
        destination: 'http://127.0.0.1:8000/logout',
      },
      {
        source: '/user',
        destination: 'http://127.0.0.1:8000/user',
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:8000'],
    },
  },
};

export default nextConfig;
```

### 2. Creare un file di configurazione per l'API

Crea un file `src/config.ts` per centralizzare la configurazione dell'API:

```typescript
// Centralized API endpoint for all backend requests
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
```

### 3. Gestire i token in modo coerente

Crea un file `src/api/token.ts` per gestire i token:

```typescript
export function getToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token") || "";
  }
  return "";
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  }
}
```

## Gestione dell'autenticazione

### 1. Implementare un servizio di autenticazione

Crea un file `src/services/auth.ts` per gestire l'autenticazione:

```typescript
import { API_URL } from '../config';
import { getToken, setToken, removeToken } from '../api/token';

// Estraiamo il BASE_URL dall'API_URL
const BASE_URL = API_URL.replace(/\/api$/, '');

export async function login(email: string, password: string) {
  // 1. Prendi sempre il CSRF cookie prima del login
  await fetch(`${BASE_URL}/sanctum/csrf-cookie`, { credentials: 'include' });

  // 2. Estrai XSRF-TOKEN dai cookie
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  const csrfToken = match ? decodeURIComponent(match[1]) : '';

  // 3. Effettua la POST con header e cookie giusti
  try {
    const loginUrl = `${API_URL}/login`;
    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-XSRF-TOKEN': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      throw new Error('Credenziali non valide');
    }

    const data = await res.json();
    
    // Salva il token e il refresh token
    if (data.token) {
      setToken(data.token);
    }
    
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  } catch (e) {
    console.error('Login error:', e);
    throw e;
  }
}

export async function getUser() {
  const token = getToken();
  if (!token) {
    return null;
  }
  
  try {
    const res = await fetch(`${API_URL}/user`, { 
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      }
    });
    
    if (!res.ok) {
      return null;
    }
    
    return await res.json();
  } catch (e) {
    console.error('Get user error:', e);
    return null;
  }
}

export async function logout() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  const csrfToken = match ? decodeURIComponent(match[1]) : '';
  
  try {
    await fetch(`${API_URL}/logout`, { 
      method: 'POST', 
      credentials: 'include',
      headers: {
        'X-XSRF-TOKEN': csrfToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
  } catch (e) {
    console.error('Logout error:', e);
  } finally {
    // Pulisci lo storage locale anche se la richiesta fallisce
    removeToken();
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }
}
```

### 2. Implementare un client API standard

Crea un modello per i client API, ad esempio `src/api/apiClient.ts`:

```typescript
import { API_URL } from '../config';
import { getToken } from './token';

// Funzione helper per aggiungere headers di autenticazione
const getAuthHeaders = (contentType = false) => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };
  
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
};

// Client API generico
export const apiClient = {
  get: async (endpoint: string) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${await res.text()}`);
    }
    
    return res.json();
  },
  
  post: async (endpoint: string, data: any) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${await res.text()}`);
    }
    
    return res.json();
  },
  
  put: async (endpoint: string, data: any) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${await res.text()}`);
    }
    
    return res.json();
  },
  
  delete: async (endpoint: string) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${await res.text()}`);
    }
    
    return res.json();
  },
};
```

### 3. Utilizzare il client API nei servizi specifici

Esempio per un servizio di gestione utenti `src/api/users.ts`:

```typescript
import { apiClient } from './apiClient';

export const userService = {
  getAll: () => apiClient.get('/users'),
  getById: (id: number) => apiClient.get(`/users/${id}`),
  create: (data: any) => apiClient.post('/users', data),
  update: (id: number, data: any) => apiClient.put(`/users/${id}`, data),
  delete: (id: number) => apiClient.delete(`/users/${id}`),
};
```

## Risoluzione problemi comuni

### 1. Errore "No 'Access-Control-Allow-Origin' header is present"

**Problema**: Le richieste vengono bloccate dalla policy CORS.

**Soluzioni**:
- Verifica che il middleware CORS sia registrato correttamente in Laravel
- Controlla che l'origine del frontend sia inclusa in `allowed_origins` nel file `config/cors.php`
- Assicurati che il middleware CORS sia eseguito prima di altri middleware che potrebbero terminare la richiesta

### 2. Errore "Redirected from 'http://127.0.0.1:8000/api/resource' to 'http://localhost:3000/login'"

**Problema**: Il middleware di autenticazione sta reindirizzando le richieste API alla pagina di login invece di restituire un errore 401.

**Soluzione**: Correggi il metodo `redirectTo` nel middleware `Authenticate.php` come mostrato sopra.

### 3. Errore "CSRF token mismatch"

**Problema**: Laravel sta bloccando le richieste perché manca il token CSRF.

**Soluzioni**:
- Assicurati di chiamare `/sanctum/csrf-cookie` prima di effettuare richieste POST/PUT/DELETE
- Verifica che il token CSRF sia incluso nell'header `X-XSRF-TOKEN`
- Controlla che `supports_credentials` sia impostato su `true` nella configurazione CORS

### 4. Errore "Unauthenticated" nonostante il token sia presente

**Problema**: Il token non viene riconosciuto o è scaduto.

**Soluzioni**:
- Verifica che il token sia inviato nell'header `Authorization: Bearer {token}`
- Controlla che il token non sia scaduto
- Implementa un meccanismo di refresh token

## Best practices

1. **Centralizza la configurazione API**: Usa un file di configurazione centrale per l'URL dell'API.

2. **Usa un client API standard**: Crea un client API riutilizzabile per standardizzare le richieste.

3. **Gestisci i token in modo coerente**: Usa un servizio centralizzato per la gestione dei token.

4. **Implementa il refresh token**: Aggiungi un meccanismo per rinnovare automaticamente i token scaduti.

5. **Gestisci gli errori in modo uniforme**: Crea un sistema di gestione degli errori che interpreti correttamente le risposte del server.

6. **Usa TypeScript per i tipi di dati**: Definisci interfacce per i dati scambiati tra frontend e backend.

7. **Testa le richieste CORS in ambiente di sviluppo**: Verifica che le richieste CORS funzionino correttamente prima di andare in produzione.

8. **Configura correttamente gli ambienti di produzione**: Assicurati che le configurazioni CORS siano appropriate per l'ambiente di produzione.

9. **Usa variabili d'ambiente**: Utilizza variabili d'ambiente per configurare gli URL dell'API in diversi ambienti.

10. **Documenta l'API**: Mantieni una documentazione aggiornata dell'API per facilitare lo sviluppo frontend.

---

Seguendo questa guida, dovresti essere in grado di configurare correttamente CORS tra Laravel 12 e Next.js, evitando i problemi più comuni e seguendo le best practices del settore.