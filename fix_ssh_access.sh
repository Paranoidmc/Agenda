#!/bin/bash
# Script per riabilitare temporaneamente l'accesso SSH con password
# e aggiungere la chiave pubblica

echo "=== ISTRUZIONI PER ACCEDERE A SSH ==="
echo ""
echo "Opzione 1: Accedi fisicamente al server e esegui:"
echo "  sudo sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config"
echo "  sudo systemctl restart sshd"
echo ""
echo "Opzione 2: Se hai accesso fisico o console, aggiungi la chiave:"
echo "  cat >> ~/.ssh/authorized_keys << 'EOF'"
cat ~/.ssh/id_rsa.pub
echo "EOF"
echo ""
echo "Poi riabilita solo chiavi SSH:"
echo "  sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config"
echo "  sudo systemctl restart sshd"
echo ""
echo "=== CHIAVE PUBBLICA DA AGGIUNGERE ==="
cat ~/.ssh/id_rsa.pub






