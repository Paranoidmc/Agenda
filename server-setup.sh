#!/bin/bash

# ============================================
# Script di Setup Server Produzione
# ============================================

echo "🚀 Setup Server Produzione per Agenda Edilcipriano"
echo ""

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Chiedi conferma
read -p "Stai per configurare il server di PRODUZIONE. Sei sicuro? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Operazione annullata"
    exit 1
fi

echo ""
echo "${YELLOW}📦 Installazione dipendenze Composer...${NC}"
composer install --no-dev --optimize-autoloader --no-interaction

echo ""
echo "${YELLOW}🔑 Generazione Application Key...${NC}"
read -p "Vuoi generare una nuova APP_KEY? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    php artisan key:generate
fi

echo ""
echo "${YELLOW}🗄️  Esecuzione Migrations...${NC}"
read -p "Vuoi eseguire le migrations? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    php artisan migrate --force
fi

echo ""
echo "${YELLOW}⚡ Ottimizzazione Laravel...${NC}"
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo ""
echo "${YELLOW}📁 Impostazione permessi...${NC}"
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

echo ""
echo "${GREEN}✅ Setup completato!${NC}"
echo ""
echo "📋 Checklist finale:"
echo "  1. Verifica il file .env"
echo "  2. Controlla che SESSION_SECURE_COOKIE=true"
echo "  3. Controlla che SESSION_SAME_SITE=none"
echo "  4. Controlla che SESSION_DOMAIN=.edilcipriano.peels.it"
echo "  5. Testa il login su https://edilcipriano.peels.it"
echo ""
echo "📝 Log disponibili in: storage/logs/laravel.log"
echo "🔍 Per vedere i log: tail -f storage/logs/laravel.log"
echo ""

