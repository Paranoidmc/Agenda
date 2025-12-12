<?php
/**
 * Script di emergenza per riabilitare SSH e verificare servizi
 * 
 * ATTENZIONE: Questo file è per EMERGENZA. Eliminalo dopo l'uso!
 * 
 * Accesso: https://edilcipriano.peels.it/fix_via_web.php?token=EMERGENCY_FIX_2025
 */

$TOKEN = 'EMERGENCY_FIX_2025';
$requested_token = $_GET['token'] ?? '';

if ($requested_token !== $TOKEN) {
    http_response_code(403);
    die('Accesso negato');
}

// Verifica che siamo sul server
$hostname = gethostname();
if (strpos($hostname, 'edilcipriano') === false && strpos($hostname, 'peels') === false) {
    die('Questo script può essere eseguito solo sul server di produzione');
}

header('Content-Type: text/plain; charset=utf-8');
echo "=== FIX EMERGENZA SERVER ===\n\n";

// 1. Riabilita SSH
echo "1. Riabilito SSH con password...\n";
$ssh_config = '/etc/ssh/sshd_config';
$backup = '/etc/ssh/sshd_config.backup.' . date('YmdHis');

// Crea backup
exec("sudo cp $ssh_config $backup 2>&1", $output, $return);
if ($return === 0) {
    echo "  ✓ Backup creato: $backup\n";
}

// Modifica configurazione
exec("sudo sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' $ssh_config 2>&1", $output, $return);
exec("sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' $ssh_config 2>&1", $output, $return);
exec("sudo systemctl restart sshd 2>&1", $output, $return);
if ($return === 0) {
    echo "  ✓ SSH riabilitato\n";
} else {
    echo "  ✗ Errore: " . implode("\n", $output) . "\n";
}

// 2. Riavvia servizi
echo "\n2. Riavvio servizi...\n";

// PHP-FPM
exec("sudo systemctl restart php8.2-fpm 2>&1", $output, $return);
echo "  " . ($return === 0 ? "✓" : "✗") . " PHP-FPM\n";

// Nginx
exec("sudo systemctl restart nginx 2>&1", $output, $return);
echo "  " . ($return === 0 ? "✓" : "✗") . " Nginx\n";

// PM2
exec("cd /home/peels/Agenda/frontend && pm2 restart all 2>&1", $output, $return);
if ($return !== 0) {
    exec("cd /home/peels/Agenda/frontend && pm2 start ecosystem.config.js 2>&1", $output, $return);
}
echo "  " . ($return === 0 ? "✓" : "✗") . " PM2\n";

// 3. Verifica processi sospetti
echo "\n3. Verifico processi sospetti...\n";
exec("ps aux | grep -E '\\.local/share/.*node|runnv|PJOw' | grep -v grep", $output, $return);
if (!empty($output)) {
    echo "  ⚠ Trovati processi sospetti:\n";
    foreach ($output as $line) {
        echo "    - $line\n";
    }
    exec("pkill -f '\\.local/share/.*node' 2>&1");
    exec("pkill -f 'runnv' 2>&1");
    exec("pkill -f 'PJOw' 2>&1");
    echo "  ✓ Processi terminati\n";
} else {
    echo "  ✓ Nessun processo sospetto\n";
}

// 4. Stato memoria
echo "\n4. Stato memoria:\n";
exec("free -h", $output, $return);
echo implode("\n", $output) . "\n";

// 5. Porte
echo "\n5. Porte in ascolto:\n";
exec("ss -tlnp | grep -E ':(80|443|3000|9000)'", $output, $return);
if (!empty($output)) {
    echo implode("\n", $output) . "\n";
} else {
    echo "  Nessuna porta trovata\n";
}

echo "\n=== COMPLETATO ===\n";
echo "\nOra puoi accedere via SSH con:\n";
echo "  ssh peels@edilcipriano.peels.it\n";
echo "  Password: Peels2025!\n";
echo "\n⚠ ELIMINA QUESTO FILE DOPO L'USO!\n";




