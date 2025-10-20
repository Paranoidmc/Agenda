# 🚀 Quick Start - Messa in Produzione

## ✅ Configurazione Completata

- **Frontend:** `https://edilcipriano.peels.it`
- **Backend:** `https://api.edilcipriano.peels.it`
- **CI/CD:** GitHub Actions

## 📋 Passi da Fare SUBITO

### 1. Sul Server Backend (`api.edilcipriano.peels.it`)

```bash
# Connettiti via SSH
ssh user@api.edilcipriano.peels.it

# Vai nella directory del backend
cd /path/to/backend

# Copia e modifica il file .env
cp .env.production.example .env
nano .env

# Verifica che ci siano questi valori:
# APP_URL=https://api.edilcipriano.peels.it
# SESSION_DRIVER=database
# SESSION_DOMAIN=.edilcipriano.peels.it
# SESSION_SECURE_COOKIE=true
# SESSION_SAME_SITE=none

# Esegui lo script di setup
chmod +x server-setup.sh
./server-setup.sh
```

### 2. Su GitHub

Vai su **Repository → Settings → Secrets and variables → Actions** e aggiungi:

**Backend:**
- `SSH_HOST` = IP del server backend
- `SSH_USERNAME` = username SSH
- `SSH_PRIVATE_KEY` = chiave privata SSH (tutto il contenuto del file)
- `SSH_PORT` = 22

**Frontend:**
- `SSH_HOST_FRONTEND` = IP del server frontend
- `SSH_USERNAME_FRONTEND` = username SSH
- `SSH_PRIVATE_KEY_FRONTEND` = chiave privata SSH
- `SSH_PORT_FRONTEND` = 22

### 3. Modifica il Workflow

Apri `.github/workflows/deploy.yml` e cambia:
- `/path/to/your/backend` → percorso reale sul server backend
- `/path/to/your/frontend` → percorso reale sul server frontend

### 4. Deploy!

```bash
# Fai commit e push
git add .
git commit -m "Configure production deployment"
git push origin main
```

## 🧪 Test

Dopo il deployment:

1. Vai su `https://edilcipriano.peels.it`
2. Apri DevTools (F12) → Network
3. Prova a fare login con `admin@example.com` / `password`
4. Verifica che:
   - ✅ Le chiamate vadano a `https://api.edilcipriano.peels.it`
   - ✅ I cookie vengano impostati
   - ✅ Il login funzioni e NON ti butti fuori

## 🐛 Se il Login Non Funziona

### Sul Server Backend

```bash
# Verifica la configurazione
php artisan tinker
>>> config('session.domain')
>>> config('session.secure')  
>>> config('session.same_site')

# Pulisci la cache
php artisan config:clear
php artisan config:cache

# Guarda i log
tail -f storage/logs/laravel.log
```

### Nel Browser

1. Apri DevTools → Application → Cookies
2. Verifica che ci sia un cookie `laravel_session` (o simile)
3. Guarda la Console per eventuali errori

## 📞 Supporto

Se hai problemi, controlla:

1. **Log Laravel:** `storage/logs/laravel.log`
2. **Log GitHub Actions:** vai su Actions nel repository
3. **File di documentazione:**
   - `DEPLOYMENT.md` - Guida completa
   - `.github/SETUP_GITHUB_ACTIONS.md` - Setup GitHub Actions

## ⚠️ IMPORTANTE

- **HTTPS è obbligatorio** - entrambi i server devono avere certificati SSL validi
- **Dopo modifiche al `.env`** - sempre eseguire `php artisan config:cache`
- **Dopo modifiche a `NEXT_PUBLIC_API_URL`** - ri-deployare il frontend

## 🎉 Files Creati

- ✅ `frontend/.env.production` - Configurazione frontend produzione
- ✅ `.env.production.example` - Template backend produzione  
- ✅ `.github/workflows/deploy.yml` - Workflow GitHub Actions
- ✅ `.github/SETUP_GITHUB_ACTIONS.md` - Guida setup CI/CD
- ✅ `server-setup.sh` - Script di setup automatico
- ✅ `DEPLOYMENT.md` - Guida completa deployment
- ✅ `config/sanctum.php` - Domini stateful configurati
- ✅ `config/cors.php` - CORS già configurato

