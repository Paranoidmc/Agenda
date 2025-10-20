# ⚠️ SECRETS GITHUB RICHIESTI

Il workflow GitHub Actions **NON FUNZIONERÀ** finché non configuri questi secrets.

## 🔐 Come Configurare i Secrets

1. Vai su: **https://github.com/Paranoidmc/Agenda/settings/secrets/actions**
2. Clicca su **"New repository secret"**
3. Aggiungi uno per uno i seguenti secrets:

## 📋 Secrets Necessari

### Backend (Laravel)

| Nome Secret | Descrizione | Esempio |
|------------|-------------|---------|
| `SSH_HOST` | IP o hostname del server backend | `123.45.67.89` o `api.edilcipriano.peels.it` |
| `SSH_USERNAME` | Username SSH | `root` o `deploy` |
| `SSH_PORT` | Porta SSH | `22` |
| `SSH_PRIVATE_KEY` | Chiave privata SSH **completa** | Vedi sotto |

### Frontend (Next.js)

| Nome Secret | Descrizione | Esempio |
|------------|-------------|---------|
| `SSH_HOST_FRONTEND` | IP o hostname del server frontend | `123.45.67.90` o `edilcipriano.peels.it` |
| `SSH_USERNAME_FRONTEND` | Username SSH | `root` o `deploy` |
| `SSH_PORT_FRONTEND` | Porta SSH | `22` |
| `SSH_PRIVATE_KEY_FRONTEND` | Chiave privata SSH **completa** | Vedi sotto |

## 🔑 Come Ottenere la Chiave SSH Privata

### Se hai già una chiave SSH:

```bash
# Mostra la chiave privata
cat ~/.ssh/id_rsa
# O per chiavi ed25519
cat ~/.ssh/id_ed25519
```

**COPIA TUTTO IL CONTENUTO** incluso:
```
-----BEGIN OPENSSH PRIVATE KEY-----
...tutto il contenuto...
-----END OPENSSH PRIVATE KEY-----
```

### Se NON hai una chiave SSH:

```bash
# Genera una nuova chiave
ssh-keygen -t ed25519 -C "github-actions@edilcipriano.it" -f ~/.ssh/github_deploy

# Copia la chiave PUBBLICA sul server
ssh-copy-id -i ~/.ssh/github_deploy.pub user@server-ip

# Mostra la chiave PRIVATA (da copiare in GitHub Secrets)
cat ~/.ssh/github_deploy
```

## ✅ Verifica della Configurazione

Dopo aver aggiunto tutti i secrets, puoi testare la connessione SSH manualmente:

```bash
# Test connessione backend
ssh -i ~/.ssh/id_rsa username@backend-ip

# Test connessione frontend
ssh -i ~/.ssh/id_rsa username@frontend-ip
```

## 🚨 Importante

- **NON CONDIVIDERE MAI** la chiave privata pubblicamente
- I secrets su GitHub sono **crittografati** e sicuri
- Se il backend e frontend sono sullo stesso server, puoi usare gli stessi valori per entrambi
- La chiave privata deve essere copiata **esattamente** come appare nel file, incluse tutte le righe

## 🛠️ Dopo la Configurazione

1. Fai un nuovo push su `main`
2. Vai su **Actions** nel repository
3. Il workflow dovrebbe partire automaticamente
4. Se tutto è configurato correttamente, vedrai ✅ verde

## 📝 Percorsi da Modificare nel Workflow

Apri `.github/workflows/deploy.yml` e modifica:

```yaml
# Backend - riga ~35
cd /path/to/your/backend  # ← Cambia con il percorso reale

# Frontend - riga ~61  
cd /path/to/your/frontend  # ← Cambia con il percorso reale
```

## 🔍 Troubleshooting

### Il workflow fallisce con "Permission denied"
→ Verifica che la chiave pubblica sia sul server: `cat ~/.ssh/authorized_keys`

### Il workflow fallisce con "Host key verification failed"
→ Aggiungi `StrictHostKeyChecking=no` alle opzioni SSH (già nel workflow)

### Il workflow fallisce con "Connection timeout"
→ Verifica l'IP e la porta del server

### Non so quale sia il percorso sul server
→ Connettiti via SSH e usa `pwd` per vedere il percorso corrente

