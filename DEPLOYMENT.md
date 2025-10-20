# Guida al Deployment in Produzione

## 🎯 Problema Attuale
Il frontend su `https://edilcipriano.peels.it` non riesce ad autenticarsi perché cerca di connettersi a `localhost:8000` che non è accessibile da internet.

## ✅ Soluzione

### 1. Backend Laravel

#### A. Configurazione `.env` in Produzione

Crea/modifica il file `.env` sul server di produzione con queste impostazioni:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://[URL-BACKEND-PRODUZIONE]

# Session - CRUCIALE per l'autenticazione SPA
SESSION_DRIVER=database
SESSION_DOMAIN=.edilcipriano.peels.it
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none

# CORS
CORS_ALLOWED_ORIGINS=https://edilcipriano.peels.it,https://attivita.edilcipriano.peels.it
```

**Sostituisci `[URL-BACKEND-PRODUZIONE]`** con l'URL effettivo dove è deployato il backend (es. `https://api.edilcipriano.peels.it`)

#### B. Comandi da eseguire sul server dopo il deployment

```bash
# 1. Installa dipendenze
composer install --no-dev --optimize-autoloader

# 2. Genera application key (solo la prima volta)
php artisan key:generate

# 3. Esegui migrations
php artisan migrate --force

# 4. Ottimizza per produzione
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 5. Imposta permessi corretti
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

#### C. File già configurati ✅

- `config/sanctum.php` - Domini stateful già aggiunti
- `config/cors.php` - Domini già configurati

### 2. Frontend Next.js

#### A. Variabili d'Ambiente

Nel tuo sistema CI/CD (Vercel, Netlify, ecc.), imposta:

```env
NEXT_PUBLIC_API_URL=https://[URL-BACKEND-PRODUZIONE]/api/
```

**Esempio:** Se il backend è su `https://api.edilcipriano.peels.it`, imposta:
```env
NEXT_PUBLIC_API_URL=https://api.edilcipriano.peels.it/api/
```

#### B. File creati

- `frontend/.env.production` - Template per la produzione (da modificare con URL reale)

### 3. Checklist Deployment

#### Backend
- [ ] File `.env` configurato con `SESSION_SECURE_COOKIE=true` e `SESSION_SAME_SITE=none`
- [ ] `SESSION_DOMAIN` impostato a `.edilcipriano.peels.it`
- [ ] URL backend corretto in `APP_URL`
- [ ] Migrations eseguite
- [ ] Cache di configurazione pulita e rigenerata
- [ ] HTTPS attivo e certificato valido

#### Frontend
- [ ] `NEXT_PUBLIC_API_URL` impostato con URL backend produzione
- [ ] Variabile d'ambiente configurata nel CI/CD
- [ ] Frontend ri-deployato dopo la modifica

### 4. Test dopo il Deployment

1. Apri `https://edilcipriano.peels.it`
2. Apri DevTools → Network
3. Prova a fare login
4. Verifica che:
   - Le chiamate vadano a `https://[backend-url]/api/...` (non a localhost)
   - Il cookie di sessione venga impostato
   - Dopo il login non vieni buttato fuori

### 5. Debugging

Se continua a non funzionare, controlla:

#### Backend
```bash
# Visualizza log Laravel
tail -f storage/logs/laravel.log

# Controlla configurazione sessione
php artisan tinker
>>> config('session.domain')
>>> config('session.secure')
>>> config('session.same_site')
```

#### Frontend
- Apri DevTools → Console
- Verifica che `NEXT_PUBLIC_API_URL` punti all'URL corretto
- Controlla che i cookie vengano impostati (DevTools → Application → Cookies)

### 6. Domini Consigliati

- Frontend: `https://edilcipriano.peels.it` (già attivo ✅)
- Backend: `https://api.edilcipriano.peels.it` (da configurare)

### 7. Note Importanti

⚠️ **HTTPS è obbligatorio** per `SESSION_SECURE_COOKIE=true`
⚠️ **Pulisci sempre la cache** dopo modifiche al `.env`: `php artisan config:clear`
⚠️ **Ri-deploya il frontend** dopo aver cambiato `NEXT_PUBLIC_API_URL`

### 8. Supporto

Se hai problemi:
1. Controlla i log: `storage/logs/laravel.log`
2. Verifica le variabili d'ambiente: `php artisan tinker` → `env('SESSION_DOMAIN')`
3. Testa l'autenticazione con `curl`:

```bash
# Test CSRF cookie
curl -v https://[backend-url]/sanctum/csrf-cookie

# Test login
curl -v -X POST https://[backend-url]/api/session-login-controller \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

---

## 📝 Riepilogo

**Il problema principale è che `localhost:8000` non è accessibile da internet.**

**Soluzione:**
1. Backend deve essere deployato su un URL pubblico (es. `https://api.edilcipriano.peels.it`)
2. Frontend deve essere configurato per puntare a quell'URL
3. Configurazioni di sessione devono permettere cookie cross-site (same_site=none, secure=true)

