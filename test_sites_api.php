<?php
// Script per testare l'API delle sedi per un cliente specifico con debug avanzato

// Per misurare il tempo di esecuzione
$startTime = microtime(true);

// Ottieni i parametri dalla riga di comando o usa i valori predefiniti
$clientId = $argv[1] ?? 1;
$useAuth = isset($argv[2]) && $argv[2] === 'auth';
$baseUrl = $argv[3] ?? "http://localhost:8000";

// Costruisci l'URL
$url = "{$baseUrl}/api/clients/{$clientId}/sites?" . http_build_query(['_t' => time()]);

echo "=== TEST API SEDI PER CLIENTE ===\n";
echo "URL: $url\n";
echo "Client ID: $clientId\n";
echo "Usando autenticazione: " . ($useAuth ? "Sì" : "No") . "\n\n";

// Verifica prima se il cliente specificato esiste
$clientUrl = "{$baseUrl}/api/clients/{$clientId}";
echo "Verificando l'esistenza del cliente...\n";

// Intestazione per la richiesta del cliente
$clientOpts = [
    'http' => [
        'method' => 'GET',
        'header' => [
            'Accept: application/json',
            'X-Requested-With: XMLHttpRequest',
            'Content-Type: application/json'
        ]
    ]
];

if ($useAuth) {
    echo "Lettura token di autenticazione...\n";
    // Prova a leggere il token da un file di configurazione
    if (file_exists('cookies.txt')) {
        $cookies = file_get_contents('cookies.txt');
        echo "Cookie trovati: " . substr($cookies, 0, 50) . "...\n";
        $clientOpts['http']['header'][] = "Cookie: $cookies";
    } else {
        echo "AVVISO: File cookies.txt non trovato. Il test potrebbe fallire se l'API richiede autenticazione.\n";
    }
    
    if (file_exists('token.txt')) {
        $token = trim(file_get_contents('token.txt'));
        echo "Token trovato: " . substr($token, 0, 20) . "...\n";
        $clientOpts['http']['header'][] = "Authorization: Bearer $token";
    } else {
        echo "AVVISO: File token.txt non trovato. Il test potrebbe fallire se l'API richiede token.\n";
    }
}

$clientContext = stream_context_create($clientOpts);

// Prova a ottenere le informazioni sul cliente per verificare che esista
try {
    echo "GET $clientUrl\n";
    $clientResponse = @file_get_contents($clientUrl, false, $clientContext);
    if ($clientResponse === false) {
        echo "ERRORE: Cliente non trovato o errore di connessione\n";
        echo "Errore: " . (error_get_last() ? error_get_last()['message'] : "Sconosciuto") . "\n";
        exit(1);
    }
    
    $clientData = json_decode($clientResponse, true);
    if ($clientData) {
        echo "Cliente trovato: " . ($clientData['name'] ?? $clientData['nome'] ?? "ID: $clientId") . "\n\n";
    } else {
        echo "AVVISO: Risposta cliente ricevuta ma non valida JSON\n";
    }
} catch (Exception $e) {
    echo "ECCEZIONE nella verifica del cliente: " . $e->getMessage() . "\n";
    // Continuiamo comunque con il test principale
}

// Ora fa la richiesta principale per le sedi del cliente
$opts = [
    'http' => [
        'method' => 'GET',
        'header' => [
            'Accept: application/json',
            'X-Requested-With: XMLHttpRequest',
            'X-Debug-Request: true',
            'Content-Type: application/json'
        ]
    ]
];

// Aggiunge le stesse intestazioni di autenticazione se necessario
if ($useAuth) {
    if (isset($cookies)) {
        $opts['http']['header'][] = "Cookie: $cookies";
    }
    if (isset($token)) {
        $opts['http']['header'][] = "Authorization: Bearer $token";
    }
}

echo "Intestazioni della richiesta:\n";
foreach ($opts['http']['header'] as $header) {
    echo "- $header\n";
}
echo "\n";

$context = stream_context_create($opts);

// Esegui la richiesta principale
echo "Esecuzione richiesta principale...\n";
echo "GET $url\n";

try {
    $response = @file_get_contents($url, false, $context);
    
    $endTime = microtime(true);
    echo "Tempo di esecuzione: " . number_format($endTime - $startTime, 3) . " secondi\n\n";
    
    if ($response === false) {
        echo "ERRORE nella richiesta\n";
        echo "Errore: " . (error_get_last() ? error_get_last()['message'] : "Sconosciuto") . "\n";
        
        // Visualizza informazioni sulla connessione HTTP
        if (isset($http_response_header)) {
            echo "\nIntestazioni di risposta:\n";
            foreach ($http_response_header as $header) {
                echo "- $header\n";
            }
        }
        exit(1);
    }
    
    echo "Risposta ricevuta (" . strlen($response) . " bytes)\n";
    
    // Visualizza intestazioni di risposta se disponibili
    if (isset($http_response_header)) {
        echo "\nIntestazioni di risposta:\n";
        foreach ($http_response_header as $header) {
            echo "- $header\n";
        }
        echo "\n";
    }
    
    $data = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "ERRORE nel parsing JSON: " . json_last_error_msg() . "\n";
        echo "Primi 1000 caratteri della risposta raw:\n" . substr($response, 0, 1000) . "\n";
        if (strlen($response) > 1000) {
            echo "... (risposta troncata)\n";
        }
        exit(1);
    }
    
    echo "Analisi dati...\n";
    echo "Numero di sedi trovate: " . count($data) . "\n";
    
    if (count($data) > 0) {
        echo "\nPrima sede:\n";
        print_r($data[0]);
        
        echo "\nCampi disponibili:\n";
        echo "- " . implode("\n- ", array_keys($data[0])) . "\n";
        
        // Verifica dei campi necessari
        $requiredFields = ['id', 'nome', 'name', 'client_id'];
        $missingFields = [];
        
        foreach ($requiredFields as $field) {
            if (!isset($data[0][$field])) {
                $missingFields[] = $field;
            }
        }
        
        if (!empty($missingFields)) {
            echo "\nATTENZIONE: Campi mancanti nella risposta: " . implode(", ", $missingFields) . "\n";
        }
    } else {
        echo "\nNessuna sede trovata per questo cliente\n";
        
        // Suggerimenti di debug
        echo "\nVerifiche consigliate:\n";
        echo "1. Controlla che il cliente con ID $clientId abbia effettivamente delle sedi associate nel database\n";
        echo "2. Verifica che la tabella 'sites' contenga record con client_id = $clientId\n";
        echo "3. Controlla i log di Laravel in storage/logs/laravel.log\n";
        echo "4. Verifica le autorizzazioni dell'API e se è richiesta autenticazione\n";
    }
} catch (Exception $e) {
    echo "ECCEZIONE: " . $e->getMessage() . "\n";
}
