<?php
// Script per testare l'API direttamente

// Imposta le intestazioni per simulare una richiesta AJAX
$opts = [
    'http' => [
        'method' => 'GET',
        'header' => [
            'Accept: application/json',
            'X-Requested-With: XMLHttpRequest'
        ]
    ]
];

$context = stream_context_create($opts);

// Ottieni la data corrente e la data tra 30 giorni
$today = date('Y-m-d');
$thirtyDaysLater = date('Y-m-d', strtotime('+30 days'));

// URL dell'API per le scadenze di tutti i veicoli (ora non protetta)
$url = "http://localhost:8000/api/vehicle-deadlines?start_date={$today}&end_date={$thirtyDaysLater}";

echo "Richiesta a: $url\n";

// Esegui la richiesta
$response = file_get_contents($url, false, $context);

if ($response === false) {
    echo "Errore nella richiesta\n";
    echo "Errore: " . error_get_last()['message'] . "\n";
} else {
    echo "Risposta ricevuta\n";
    $data = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "Errore nel parsing JSON: " . json_last_error_msg() . "\n";
        echo "Risposta raw:\n$response\n";
    } else {
        echo "Numero di scadenze: " . count($data) . "\n";
        
        if (count($data) > 0) {
            echo "\nPrima scadenza:\n";
            print_r($data[0]);
        } else {
            echo "\nNessuna scadenza trovata\n";
        }
    }
}
