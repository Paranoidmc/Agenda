# Sistema di Tracking Veicoli GPS

Questo documento descrive come utilizzare e integrare il sistema di tracking GPS dei veicoli.

## 🗺️ Funzionalità

- **Mappa interattiva** con posizioni dei veicoli in tempo reale
- **Tracking automatico** con aggiornamenti periodici
- **API REST** per ricevere e inviare dati GPS
- **Simulazione** per test e sviluppo
- **Popup informativi** con dettagli del veicolo e autista

## 📍 Come funziona

### Frontend
1. **VehicleMap**: Componente React con mappa Leaflet
2. **useVehicleTracking**: Hook per gestire il tracking automatico
3. **Integrazione nel SidePanel**: La mappa appare automaticamente quando un'attività ha veicoli assegnati

### Backend
1. **VehicleTrackingController**: Gestisce le API per posizioni GPS
2. **Simulazione**: Genera posizioni casuali per test
3. **Validazione**: Controlla che i dati GPS siano validi

## 🚀 Utilizzo

### Visualizzare la mappa
La mappa appare automaticamente nel SidePanel quando:
- Apri un'attività esistente
- L'attività ha almeno un veicolo assegnato
- I veicoli hanno dati GPS disponibili

### API Endpoints

#### Ottenere posizione singolo veicolo
```bash
GET /api/vehicles/{id}/position
```

#### Ottenere posizioni multiple
```bash
POST /api/vehicles/positions
Content-Type: application/json

{
  "vehicle_ids": [1, 2, 3]
}
```

#### Aggiornare posizione veicolo
```bash
POST /api/vehicles/{id}/position
Content-Type: application/json

{
  "latitude": 41.9028,
  "longitude": 12.4964,
  "speed": 65,
  "heading": 180,
  "timestamp": "2025-01-13T10:30:00Z"
}
```

## 🔧 Integrazione con dispositivi GPS reali

### 1. Sostituire la simulazione
Nel file `app/Http/Controllers/VehicleTrackingController.php`, sostituisci il metodo `simulateVehiclePosition()` con la logica per recuperare dati reali dal tuo provider GPS.

### 2. Creare tabella posizioni (opzionale)
Se vuoi salvare lo storico delle posizioni:

```sql
CREATE TABLE vehicle_positions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(5, 2) NULL,
    heading DECIMAL(5, 2) NULL,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    INDEX idx_vehicle_recorded (vehicle_id, recorded_at)
);
```

### 3. Webhook per ricevere dati GPS
Esempio di endpoint per ricevere dati da dispositivi GPS:

```php
Route::post('/gps/webhook/{vehicle_id}', function (Request $request, $vehicleId) {
    $request->validate([
        'lat' => 'required|numeric|between:-90,90',
        'lng' => 'required|numeric|between:-180,180',
        'speed' => 'nullable|numeric|min:0',
        'heading' => 'nullable|numeric|between:0,360',
        'timestamp' => 'nullable|date',
    ]);
    
    // Salva la posizione nel database
    VehiclePosition::create([
        'vehicle_id' => $vehicleId,
        'latitude' => $request->lat,
        'longitude' => $request->lng,
        'speed' => $request->speed,
        'heading' => $request->heading,
        'recorded_at' => $request->timestamp ?? now(),
    ]);
    
    return response()->json(['status' => 'success']);
});
```

## 🧪 Test e Simulazione

### Simulare movimento GPS
```javascript
import { simulateGPSUpdates } from '../lib/vehicleTracking';

// Simula movimento per veicolo ID 1
const stopSimulation = simulateGPSUpdates(1, {
  intervalMs: 3000,  // Aggiorna ogni 3 secondi
  maxUpdates: 20     // Ferma dopo 20 aggiornamenti
});

// Ferma la simulazione manualmente
// stopSimulation();
```

### Test API con curl
```bash
# Test posizione singola
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/vehicles/1/position

# Test posizioni multiple
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"vehicle_ids": [1, 2]}' \
     http://localhost:8000/api/vehicles/positions
```

## ⚙️ Configurazione

### Intervallo di aggiornamento
Nel hook `useVehicleTracking`, puoi modificare l'intervallo:

```javascript
const { vehiclePositions } = useVehicleTracking(
  activityId, 
  vehicles, 
  10000  // Aggiorna ogni 10 secondi invece di 30
);
```

### Personalizzare l'icona dei veicoli
Nel file `VehicleMap.jsx`, modifica la variabile `truckIcon`:

```javascript
const truckIcon = new L.Icon({
  iconUrl: '/path/to/your/custom-truck-icon.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});
```

## 🔍 Troubleshooting

### La mappa non si carica
1. Verifica che Leaflet CSS sia importato
2. Controlla la console per errori JavaScript
3. Assicurati che il componente sia renderizzato lato client

### Nessun veicolo sulla mappa
1. Verifica che l'attività abbia veicoli assegnati
2. Controlla che le API restituiscano dati validi
3. Verifica le coordinate (devono essere numeri validi)

### Errori API
1. Controlla l'autenticazione (token valido)
2. Verifica che i veicoli esistano nel database
3. Controlla i log del server per errori dettagliati

## 📱 Responsive Design

La mappa è ottimizzata per dispositivi mobili:
- Touch gestures per zoom e pan
- Layout responsive
- Controlli adattivi

## 🔒 Sicurezza

- Tutte le API richiedono autenticazione
- Validazione dei dati GPS in input
- Rate limiting consigliato per webhook GPS
- HTTPS obbligatorio per dati di posizione

## 🚀 Prossimi sviluppi

- [ ] Storico percorsi
- [ ] Geofencing (zone geografiche)
- [ ] Notifiche per eventi (velocità, zone)
- [ ] Export dati GPS
- [ ] Clustering per molti veicoli
- [ ] Modalità offline