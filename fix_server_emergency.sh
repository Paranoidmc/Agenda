#!/bin/bash

# Script di emergenza per risolvere 504 e riabilitare SSH
# Esegui questo script dalla console del server (DigitalOcean/AWS) o se riesci ad accedere

echo "=== FIX EMERGENZA SERVER ==="
echo ""

# 1. Riabilita SSH con password
echo "1. Riabilito SSH con password..."
sudo sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart sshd
echo "✓ SSH riabilitato"

# 2. Verifica e riavvia servizi
echo ""
echo "2. Verifico servizi..."

# PHP-FPM
echo "  - PHP-FPM:"
sudo systemctl status php8.2-fpm --no-pager | head -5
sudo systemctl restart php8.2-fpm
echo "    ✓ PHP-FPM riavviato"

# Nginx
echo "  - Nginx:"
sudo systemctl status nginx --no-pager | head -5
sudo systemctl restart nginx
echo "    ✓ Nginx riavviato"

# PM2
echo "  - PM2:"
pm2 list
pm2 restart all || pm2 start ecosystem.config.js
echo "    ✓ PM2 riavviato"

# 3. Verifica processi sospetti
echo ""
echo "3. Verifico processi sospetti..."
SUSPICIOUS=$(ps aux | grep -E '\.local/share/.*node|runnv|PJOw' | grep -v grep)
if [ ! -z "$SUSPICIOUS" ]; then
    echo "  ⚠ Trovati processi sospetti, li termino..."
    pkill -f '\.local/share/.*node' || true
    pkill -f 'runnv' || true
    pkill -f 'PJOw' || true
    echo "    ✓ Processi terminati"
else
    echo "    ✓ Nessun processo sospetto"
fi

# 4. Verifica memoria
echo ""
echo "4. Stato memoria:"
free -h

# 5. Verifica porte
echo ""
echo "5. Porte in ascolto:"
ss -tlnp | grep -E ':(80|443|3000|9000)' || true

# 6. Verifica log recenti
echo ""
echo "6. Ultimi errori Laravel:"
tail -20 /home/peels/Agenda/storage/logs/laravel.log 2>/dev/null | grep -i error | tail -5 || echo "Nessun errore recente"

echo ""
echo "=== COMPLETATO ==="
echo ""
echo "Ora puoi accedere via SSH con:"
echo "  ssh peels@edilcipriano.peels.it"
echo ""
echo "Password: Peels2025!"




