# Setup GitHub Actions per Deployment Automatico

## 📋 Secrets da configurare in GitHub

Vai su **Repository → Settings → Secrets and variables → Actions** e aggiungi questi secrets:

### Per il Backend

```
SSH_HOST = indirizzo IP o hostname del server backend
SSH_USERNAME = username SSH (es. root o deploy)
SSH_PRIVATE_KEY = chiave privata SSH (contenuto del file id_rsa)
SSH_PORT = porta SSH (di solito 22)
```

### Per il Frontend

```
SSH_HOST_FRONTEND = indirizzo IP o hostname del server frontend
SSH_USERNAME_FRONTEND = username SSH
SSH_PRIVATE_KEY_FRONTEND = chiave privata SSH
SSH_PORT_FRONTEND = porta SSH (di solito 22)
```

## 🔑 Come generare la chiave SSH

Se non hai già una chiave SSH sul server:

```bash
# Sul tuo computer locale
ssh-keygen -t ed25519 -C "github-actions@edilcipriano.it"

# Copia la chiave pubblica sul server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server-ip

# Mostra la chiave privata (da copiare in GitHub Secrets)
cat ~/.ssh/id_ed25519
```

## 📝 Modifiche da fare al workflow

Apri `.github/workflows/deploy.yml` e modifica:

### Backend
```yaml
script: |
  cd /path/to/your/backend  # ← Cambia con il percorso reale sul server
  git pull origin main
  # ... resto dei comandi
```

### Frontend
```yaml
script: |
  cd /path/to/your/frontend  # ← Cambia con il percorso reale sul server
  git pull origin main
  # ... resto dei comandi
```

## 🚀 Test del Deployment

1. Fai un commit e push su `main`:
   ```bash
   git add .
   git commit -m "Setup GitHub Actions deployment"
   git push origin main
   ```

2. Vai su **Actions** nel repository GitHub

3. Vedrai il workflow in esecuzione

4. Se ci sono errori, controlla i log

## ⚙️ Configurazione Server Backend (da fare una sola volta)

Sul server dove è deployato il backend (`api.edilcipriano.peels.it`):

```bash
# Connettiti via SSH
ssh user@api.edilcipriano.peels.it

# Vai nella directory del progetto
cd /path/to/backend

# Copia il file .env di esempio
cp .env.production.example .env

# Modifica il file .env con i dati corretti
nano .env

# Genera la chiave applicazione
php artisan key:generate

# Esegui le migrations
php artisan migrate --force

# Imposta i permessi
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Ottimizza
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Configurazione `.env` sul server backend:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.edilcipriano.peels.it

SESSION_DRIVER=database
SESSION_DOMAIN=.edilcipriano.peels.it
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none

# ... altri valori (database, ecc.)
```

## ⚙️ Configurazione Server Frontend (da fare una sola volta)

Sul server dove è deployato il frontend (`edilcipriano.peels.it`):

```bash
# Connettiti via SSH
ssh user@edilcipriano.peels.it

# Vai nella directory del progetto
cd /path/to/frontend

# Crea il file .env.production
echo "NEXT_PUBLIC_API_URL=https://api.edilcipriano.peels.it/api/" > .env.production

# Installa dipendenze
npm ci

# Build iniziale
npm run build

# Avvia con PM2 (se non già fatto)
pm2 start npm --name "nextjs" -- start
pm2 save
pm2 startup
```

## ✅ Checklist Post-Deploy

Dopo ogni deployment automatico, verifica:

- [ ] Il backend risponde su `https://api.edilcipriano.peels.it`
- [ ] Il frontend risponde su `https://edilcipriano.peels.it`
- [ ] Il login funziona correttamente
- [ ] I cookie di sessione vengono impostati
- [ ] Non ci sono errori in console

## 🐛 Troubleshooting

### Il workflow fallisce

1. Controlla i log in GitHub Actions
2. Verifica che i secrets siano configurati correttamente
3. Testa la connessione SSH manualmente:
   ```bash
   ssh -i ~/.ssh/id_ed25519 user@server-ip
   ```

### Il login non funziona dopo il deploy

1. Controlla che il file `.env` sul server abbia:
   - `SESSION_SECURE_COOKIE=true`
   - `SESSION_SAME_SITE=none`
   - `SESSION_DOMAIN=.edilcipriano.peels.it`

2. Pulisci la cache:
   ```bash
   php artisan config:clear
   php artisan config:cache
   ```

3. Verifica i log:
   ```bash
   tail -f storage/logs/laravel.log
   ```

## 📚 Risorse

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Laravel Deployment](https://laravel.com/docs/deployment)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

