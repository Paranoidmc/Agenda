# Ottimizzazione della Paginazione delle Tabelle

Questo documento descrive le ottimizzazioni implementate per migliorare le prestazioni della paginazione nelle tabelle dell'applicazione.

## Componenti Principali

### 1. Hook useServerPagination

È stato implementato un hook personalizzato per gestire la paginazione lato server in modo efficiente.

**File**: `src/hooks/useServerPagination.js`

**Caratteristiche**:
- Gestione completa della paginazione lato server
- Supporto per ordinamento, filtri e ricerca
- Aggiornamento automatico dei dati
- Gestione ottimizzata dello stato di caricamento

### 2. Componente OptimizedTable

È stato creato un componente di tabella ottimizzato che utilizza il hook useServerPagination.

**File**: `components/OptimizedTable.jsx`

**Caratteristiche**:
- Paginazione lato server
- Ordinamento lato server
- Filtri lato server
- Ricerca lato server
- Selezione delle colonne visibili
- Indicatori di caricamento
- Gestione degli errori con retry
- Aggiornamento automatico dei dati

### 3. Componente DataTableServer

È stato implementato un componente alternativo per la paginazione lato server.

**File**: `components/DataTableServer.jsx`

**Caratteristiche**:
- Simile a OptimizedTable ma con un'implementazione diversa
- Può essere utilizzato come alternativa in base alle esigenze

## Come Utilizzare i Nuovi Componenti

### Utilizzo di OptimizedTable

```jsx
import OptimizedTable from '../components/OptimizedTable';

function MyComponent() {
  const handleRowClick = (item) => {
    console.log('Riga cliccata:', item);
  };

  return (
    <OptimizedTable
      endpoint="/api/items"
      columns={[
        { key: 'name', label: 'Nome' },
        { key: 'category', label: 'Categoria' },
        { key: 'price', label: 'Prezzo' },
        {
          key: 'actions',
          label: 'Azioni',
          render: (item) => (
            <button onClick={() => handleEdit(item)}>Modifica</button>
          )
        }
      ]}
      filterableColumns={[
        { key: 'name', label: 'Nome', filterType: 'text' },
        { key: 'category', label: 'Categoria', filterType: 'select', filterOptions: [
          { value: 'electronics', label: 'Elettronica' },
          { value: 'clothing', label: 'Abbigliamento' }
        ]}
      ]}
      onRowClick={handleRowClick}
      searchPlaceholder="Cerca elementi..."
      defaultVisibleColumns={['name', 'category', 'actions']}
      defaultSortKey="name"
      defaultSortDirection="asc"
      refreshInterval={60000} // Aggiorna ogni minuto
    />
  );
}
```

### Utilizzo di useServerPagination

```jsx
import { useState } from 'react';
import useServerPagination from '../src/hooks/useServerPagination';

function MyCustomTable() {
  const {
    data,
    loading,
    error,
    page,
    perPage,
    total,
    lastPage,
    sortBy,
    sortDirection,
    goToPage,
    changePerPage,
    changeSort,
    applyFilters,
    applySearch,
    refresh
  } = useServerPagination({
    endpoint: '/api/items',
    params: { type: 'product' },
    defaultPage: 1,
    defaultPerPage: 10,
    defaultSortBy: 'name',
    defaultSortDirection: 'asc',
    autoRefresh: true,
    refreshInterval: 30000
  });

  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    // Debounce la ricerca
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      applySearch(e.target.value);
    }, 300);
  };

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={handleSearch}
        placeholder="Cerca..."
      />
      
      <button onClick={refresh}>Aggiorna</button>
      
      <table>
        <thead>
          <tr>
            <th onClick={() => changeSort('name')}>
              Nome {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => changeSort('category')}>
              Categoria {sortBy === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="2">Caricamento...</td></tr>
          ) : error ? (
            <tr><td colSpan="2">Errore: {error}</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan="2">Nessun elemento trovato</td></tr>
          ) : (
            data.map(item => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.category}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      
      <div>
        <span>Mostrando {data.length} di {total} risultati</span>
        <div>
          <button onClick={() => goToPage(page - 1)} disabled={page === 1}>
            Precedente
          </button>
          <span>Pagina {page} di {lastPage}</span>
          <button onClick={() => goToPage(page + 1)} disabled={page === lastPage}>
            Successiva
          </button>
        </div>
        <select value={perPage} onChange={(e) => changePerPage(Number(e.target.value))}>
          <option value="10">10 per pagina</option>
          <option value="25">25 per pagina</option>
          <option value="50">50 per pagina</option>
        </select>
      </div>
    </div>
  );
}
```

## Modifiche Necessarie sul Backend

Per supportare completamente la paginazione lato server, il backend deve implementare:

1. **Paginazione**: Supporto per i parametri `page` e `per_page`
2. **Ordinamento**: Supporto per i parametri `sort_by` e `sort_direction`
3. **Filtri**: Supporto per i parametri `filter_*` (es. `filter_nome`, `filter_categoria`)
4. **Ricerca**: Supporto per il parametro `search`

Esempio di risposta paginata dal backend:

```json
{
  "current_page": 1,
  "data": [
    { "id": 1, "nome": "Esempio 1", "categoria": "A" },
    { "id": 2, "nome": "Esempio 2", "categoria": "B" }
  ],
  "from": 1,
  "last_page": 5,
  "per_page": 10,
  "to": 10,
  "total": 50
}
```

## Benefici delle Ottimizzazioni

1. **Riduzione del Carico sul Client**: Solo i dati necessari vengono trasferiti e processati
2. **Miglioramento delle Prestazioni**: Tabelle con migliaia di righe possono essere gestite efficientemente
3. **Esperienza Utente Migliorata**: Tempi di caricamento ridotti e interfaccia più reattiva
4. **Riduzione del Consumo di Memoria**: Il browser non deve gestire grandi quantità di dati in memoria
5. **Scalabilità**: L'applicazione può gestire dataset molto grandi senza problemi di prestazioni

## Configurazione Avanzata

### Personalizzazione del Componente OptimizedTable

```jsx
// Personalizzazione dello stile
<OptimizedTable
  className="my-custom-table"
  // Altre proprietà...
/>

// Personalizzazione dei messaggi
<OptimizedTable
  emptyMessage="Non ci sono elementi da visualizzare"
  searchPlaceholder="Cerca tra gli elementi..."
  // Altre proprietà...
/>

// Personalizzazione del comportamento
<OptimizedTable
  refreshInterval={0} // Disabilita l'aggiornamento automatico
  defaultItemsPerPage={25}
  itemsPerPageOptions={[10, 25, 50, 100, 200]}
  // Altre proprietà...
/>
```

### Personalizzazione del Hook useServerPagination

```jsx
// Configurazione avanzata
const paginationOptions = {
  endpoint: '/api/items',
  params: { 
    type: 'product',
    status: 'active'
  },
  defaultPage: 2, // Inizia dalla seconda pagina
  defaultPerPage: 25,
  defaultSortBy: 'created_at',
  defaultSortDirection: 'desc',
  autoRefresh: true,
  refreshInterval: 30000 // 30 secondi
};

const pagination = useServerPagination(paginationOptions);
```