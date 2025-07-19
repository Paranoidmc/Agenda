# Ottimizzazioni per il Caricamento dei Dati

Questo documento descrive le ottimizzazioni implementate per migliorare le prestazioni e l'efficienza del caricamento dei dati nell'applicazione.

## Componenti Principali

### 1. Sistema di Cache

È stato implementato un sistema di cache per memorizzare temporaneamente le risposte delle API e ridurre il numero di richieste al server.

**File**: `src/services/cacheService.js`

**Caratteristiche**:
- Memorizzazione delle risposte API con TTL (Time-To-Live) configurabile
- Invalidazione selettiva della cache per endpoint specifici
- Supporto per chiavi di cache basate su URL e parametri

### 2. Gestione Ottimizzata delle Richieste API

L'istanza Axios è stata migliorata con funzionalità avanzate per la gestione delle richieste.

**File**: `lib/api.js`

**Caratteristiche**:
- Integrazione con il sistema di cache
- Gestione centralizzata degli errori
- Meccanismo di retry automatico per le richieste fallite
- Indicatore di caricamento globale
- Timeout configurabile per le richieste

### 3. Servizio Dati Centralizzato

È stato creato un servizio centralizzato per la gestione dei dati dell'applicazione.

**File**: `src/services/dataService.js`

**Caratteristiche**:
- Metodi ottimizzati per il caricamento dei dati
- Supporto per paginazione e filtri
- Integrazione con il sistema di cache
- Gestione automatica dell'invalidazione della cache

### 4. Hook Personalizzato per i Dati

È stato implementato un hook React per semplificare l'uso del servizio dati nei componenti.

**File**: `src/hooks/useData.js`

**Caratteristiche**:
- Gestione dello stato di caricamento, errori e dati
- Supporto per aggiornamento automatico dei dati
- Funzioni per refresh manuale e invalidazione della cache
- Trasformazione dei dati

### 5. Componenti UI Ottimizzati

Sono stati migliorati i componenti UI per sfruttare le nuove funzionalità di caricamento dati.

**File**: `components/ActivityList.jsx`, `components/LazyList.jsx`, `components/GlobalLoader.jsx`

**Caratteristiche**:
- Caricamento lazy e infinito
- Paginazione ottimizzata
- Indicatori di caricamento
- Gestione degli errori con retry
- Aggiornamento automatico dei dati

## Come Utilizzare le Nuove Funzionalità

### Utilizzo del Hook useData

```jsx
import useData from '../src/hooks/useData';

function MyComponent() {
  const { 
    data, 
    loading, 
    error, 
    refresh, 
    invalidateCache 
  } = useData({
    endpoint: '/api/items',
    params: { category: 'example' },
    useCache: true,
    autoRefresh: true,
    refreshInterval: 30000, // 30 secondi
    transform: data => data.map(item => ({ ...item, processed: true }))
  });

  if (loading) return <div>Caricamento...</div>;
  if (error) return <div>Errore: {error}</div>;

  return (
    <div>
      <button onClick={refresh}>Aggiorna</button>
      <button onClick={invalidateCache}>Invalida Cache</button>
      <ul>
        {data.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Utilizzo del Componente LazyList

```jsx
import LazyList from '../components/LazyList';

function MyLazyListComponent() {
  return (
    <LazyList
      endpoint="/api/items"
      pageSize={20}
      filters={{ category: 'example' }}
      renderItem={(item, index) => (
        <div key={item.id}>
          {index + 1}. {item.name}
        </div>
      )}
      loadingComponent={<div>Caricamento altri elementi...</div>}
      emptyComponent={<div>Nessun elemento trovato</div>}
    />
  );
}
```

### Utilizzo del Servizio Dati

```jsx
import { useState, useEffect } from 'react';
import dataService from '../src/services/dataService';

function MyComponent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await dataService.getActivities({
          filters: { status: 'active' },
          page: 1,
          perPage: 10
        });
        setItems(result.data || result);
      } catch (error) {
        console.error('Errore:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Resto del componente...
}
```

## Benefici delle Ottimizzazioni

1. **Riduzione delle Richieste al Server**: La cache riduce il numero di richieste HTTP ripetute.
2. **Miglioramento della Reattività dell'UI**: Gli indicatori di caricamento e la gestione ottimizzata dello stato migliorano l'esperienza utente.
3. **Gestione Robusta degli Errori**: Meccanismi di retry e gestione centralizzata degli errori aumentano l'affidabilità.
4. **Caricamento Efficiente dei Dati**: Paginazione, caricamento lazy e filtri riducono il volume di dati trasferiti.
5. **Codice Più Manutenibile**: Centralizzazione della logica di caricamento dati e pattern consistenti.

## Configurazione Avanzata

### Personalizzazione del TTL della Cache

```javascript
// Imposta il TTL predefinito a 10 minuti
import api from '../lib/api';
api.setDefaultCacheTTL(10 * 60 * 1000);

// Imposta un TTL specifico per una richiesta
api.get('/endpoint', { cacheTTL: 30 * 60 * 1000 }); // 30 minuti
```

### Disabilitazione della Cache per Richieste Specifiche

```javascript
// Disabilita la cache per questa richiesta
api.get('/endpoint', { useCache: false });
```

### Configurazione dei Retry

```javascript
// Configura i retry per una richiesta specifica
api.get('/endpoint', {
  retry: true,
  maxRetries: 3
});
```