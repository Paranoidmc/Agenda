# Configurazione Cron Job per Sincronizzazione Documenti

## Problema
La sincronizzazione dei documenti era ferma al 29/09 perché il comando non veniva eseguito automaticamente.

## Soluzione
Configurare un cron job per eseguire la sincronizzazione automaticamente.

## Cron Job da configurare sul server di produzione

```bash
# Esegue la sincronizzazione ogni giorno alle 2:00
0 2 * * * cd /path/to/your/backend && php artisan arca:sync-documenti --giorni=7 >> /path/to/your/backend/storage/logs/cron.log 2>&1
```

## Come configurare sul server

1. **Connettiti al server via SSH:**
   ```bash
   ssh peels@89.34.236.133
   ```

2. **Trova il percorso del backend:**
   ```bash
   pwd
   ls -la
   ```

3. **Configura il cron job:**
   ```bash
   crontab -e
   ```

4. **Aggiungi questa riga (sostituisci il percorso con quello corretto):**
   ```bash
   0 2 * * * cd /var/www/html && php artisan arca:sync-documenti --giorni=7 >> /var/www/html/storage/logs/cron.log 2>&1
   ```

5. **Salva e esci (Ctrl+X, Y, Enter)**

6. **Verifica che sia configurato:**
   ```bash
   crontab -l
   ```

## Test manuale

Per testare manualmente la sincronizzazione:
```bash
php artisan arca:sync-documenti --giorni=30
```

## Log

I log della sincronizzazione automatica saranno salvati in:
`/path/to/your/backend/storage/logs/cron.log`

## Note

- Il comando sincronizza gli ultimi 7 giorni ogni giorno
- I log vengono salvati per monitorare eventuali errori
- La sincronizzazione avviene alle 2:00 di notte per non interferire con l'uso dell'applicazione
