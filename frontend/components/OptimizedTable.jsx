"use client";
import { useState, useEffect } from 'react';
import useServerPagination from '../src/hooks/useServerPagination';

/**
 * Componente di tabella ottimizzato con paginazione lato server
 * Utilizza il hook useServerPagination per gestire i dati
 */
export default function OptimizedTable({
  endpoint,
  columns = [],
  onRowClick = null,
  selectedRow = null,
  searchPlaceholder = "Cerca...",
  itemsPerPageOptions = [10, 25, 50, 100],
  defaultItemsPerPage = 10,
  defaultVisibleColumns = null,
  filterableColumns = [],
  className = "",
  emptyMessage = "Nessun dato disponibile",
  defaultSortKey = null,
  defaultSortDirection = 'asc',
  refreshInterval = 0, // 0 = nessun refresh automatico
  additionalParams = {}
}) {
  // Stato per le colonne visibili
  const [visibleColumns, setVisibleColumns] = useState(
    defaultVisibleColumns || columns.map(col => col.key)
  );
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  // Stato per i filtri
  const [activeFilter, setActiveFilter] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [localFilters, setLocalFilters] = useState({});
  
  // Usa il hook personalizzato per la paginazione lato server
  const {
    data,
    loading,
    error,
    lastUpdated,
    page,
    perPage,
    total,
    lastPage,
    sortBy,
    sortDirection,
    filters,
    search,
    goToPage,
    changePerPage,
    changeSort,
    applyFilters,
    applySearch,
    refresh,
    resetFilters
  } = useServerPagination({
    endpoint,
    params: additionalParams,
    defaultPage: 1,
    defaultPerPage: defaultItemsPerPage,
    defaultSortBy: defaultSortKey,
    defaultSortDirection,
    autoRefresh: refreshInterval > 0,
    refreshInterval
  });
  
  // Debounce per la ricerca
  useEffect(() => {
    const timer = setTimeout(() => {
      applySearch(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm, applySearch]);
  
  // Funzione per gestire la ricerca
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Funzione per gestire l'ordinamento
  const handleSort = (key) => {
    if (key === 'actions') return;
    changeSort(key);
  };
  
  // Funzione per gestire la selezione delle colonne
  const handleColumnToggle = (key) => {
    setVisibleColumns(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };
  
  // Funzione per applicare i filtri
  const handleApplyFilters = () => {
    applyFilters(localFilters);
    setActiveFilter(null);
  };
  
  // Funzione per resettare i filtri
  const handleClearFilters = () => {
    setLocalFilters({});
    resetFilters();
    setActiveFilter(null);
  };
  
  // Funzione per ottenere un valore annidato da un oggetto
  const getNestedValue = (obj, path) => {
    if (!path) return obj;
    const keys = path.split('.');
    return keys.reduce((o, k) => (o && o[k] !== undefined) ? o[k] : null, obj);
  };
  
  // Funzione per generare i numeri di pagina da visualizzare
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (lastPage <= maxVisiblePages) {
      // Mostra tutte le pagine se sono meno del massimo
      for (let i = 1; i <= lastPage; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Mostra sempre la prima pagina
      pageNumbers.push(1);
      
      // Calcola l'intervallo di pagine da mostrare
      let startPage = Math.max(2, page - 1);
      let endPage = Math.min(lastPage - 1, page + 1);
      
      // Aggiusta l'intervallo per mostrare sempre 3 pagine
      if (startPage === 2) endPage = Math.min(lastPage - 1, 4);
      if (endPage === lastPage - 1) startPage = Math.max(2, lastPage - 3);
      
      // Aggiungi ellipsis se necessario
      if (startPage > 2) pageNumbers.push('...');
      
      // Aggiungi le pagine dell'intervallo
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      // Aggiungi ellipsis se necessario
      if (endPage < lastPage - 1) pageNumbers.push('...');
      
      // Mostra sempre l'ultima pagina
      pageNumbers.push(lastPage);
    }
    
    return pageNumbers;
  };
  
  // Stili comuni
  const styles = {
    tableContainer: {
      borderRadius: '10px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      background: '#fff',
    },
    header: {
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #e5e5ea',
      flexWrap: 'wrap',
      gap: '10px'
    },
    searchContainer: {
      position: 'relative',
      flex: '1 1 300px',
      maxWidth: '400px',
    },
    searchInput: {
      width: '100%',
      padding: '8px 12px 8px 36px',
      borderRadius: '8px',
      border: '1px solid #e5e5ea',
      fontSize: '14px',
      background: '#f5f5f7',
      outline: 'none',
      transition: 'all 0.2s',
    },
    searchIcon: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#8e8e93',
      pointerEvents: 'none',
    },
    actionsContainer: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
    },
    button: {
      padding: '8px 12px',
      borderRadius: '8px',
      border: 'none',
      background: '#f5f5f7',
      color: '#1a1a1a',
      fontSize: '14px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      transition: 'all 0.2s',
    },
    activeButton: {
      background: 'var(--primary)',
      color: '#fff',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px',
    },
    th: {
      padding: '12px 16px',
      textAlign: 'left',
      fontWeight: '600',
      color: '#1a1a1a',
      borderBottom: '1px solid #e5e5ea',
      position: 'relative',
      cursor: 'pointer',
      userSelect: 'none',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '12px 16px',
      borderBottom: '1px solid #f5f5f7',
      color: '#1a1a1a',
    },
    sortIcon: {
      marginLeft: '5px',
      fontSize: '12px',
    },
    footer: {
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTop: '1px solid #e5e5ea',
      flexWrap: 'wrap',
      gap: '10px'
    },
    pagination: {
      display: 'flex',
      gap: '5px',
      alignItems: 'center',
    },
    pageButton: {
      minWidth: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
      border: 'none',
      background: 'transparent',
      color: '#1a1a1a',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    activePageButton: {
      background: 'var(--primary)',
      color: '#fff',
    },
    itemsPerPageContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    select: {
      padding: '6px 10px',
      borderRadius: '6px',
      border: '1px solid #e5e5ea',
      background: '#f5f5f7',
      fontSize: '14px',
      outline: 'none',
    },
    popover: {
      position: 'absolute',
      top: '100%',
      right: '0',
      marginTop: '5px',
      background: '#fff',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 100,
      minWidth: '200px',
      maxWidth: '300px',
      maxHeight: '400px',
      overflow: 'auto',
    },
    columnSelectorItem: {
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      transition: 'background 0.2s',
      borderBottom: '1px solid #f5f5f7',
    },
    checkbox: {
      width: '18px',
      height: '18px',
      accentColor: 'var(--primary)',
    },
    filterContainer: {
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    filterItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    filterLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#1a1a1a',
    },
    filterInput: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid #e5e5ea',
      fontSize: '14px',
      outline: 'none',
    },
    filterActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '10px',
    },
    emptyState: {
      padding: '40px 20px',
      textAlign: 'center',
      color: '#8e8e93',
    },
    selectedRow: {
      backgroundColor: 'rgba(0, 122, 255, 0.05)',
    },
    clickableRow: {
      cursor: 'pointer',
    },
    rowCount: {
      fontSize: '14px',
      color: '#8e8e93',
    },
    refreshButton: {
      marginLeft: '10px',
      padding: '6px 10px',
      borderRadius: '6px',
      border: 'none',
      background: '#f5f5f7',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    lastUpdated: {
      fontSize: '12px',
      color: '#8e8e93',
      marginLeft: '10px',
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(255, 255, 255, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '3px solid #f3f3f3',
      borderTop: '3px solid var(--primary)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    }
  };
  
  // Componente per il selettore di colonne
  const ColumnSelector = () => (
    <div style={styles.popover}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e5ea', fontWeight: '600' }}>
        Colonne visibili
      </div>
      {columns.map(column => (
        <div 
          key={column.key} 
          style={styles.columnSelectorItem}
          onClick={() => handleColumnToggle(column.key)}
        >
          <input 
            type="checkbox" 
            checked={visibleColumns.includes(column.key)} 
            onChange={() => {}} 
            style={styles.checkbox}
          />
          <span>{column.label}</span>
        </div>
      ))}
    </div>
  );
  
  // Componente per il filtro
  const FilterPopover = () => (
    <div style={styles.popover}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e5ea', fontWeight: '600' }}>
        Filtri
      </div>
      <div style={styles.filterContainer}>
        {filterableColumns.map(column => (
          <div key={column.key} style={styles.filterItem}>
            <label style={styles.filterLabel}>{column.label}</label>
            {column.filterType === 'select' ? (
              <select 
                style={styles.filterInput}
                value={localFilters[column.key] || ''}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  [column.key]: e.target.value
                }))}
              >
                <option value="">Tutti</option>
                {column.filterOptions?.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : column.filterType === 'date' ? (
              <input 
                type="date" 
                style={styles.filterInput}
                value={localFilters[column.key] || ''}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  [column.key]: e.target.value
                }))}
              />
            ) : (
              <input 
                type="text" 
                style={styles.filterInput}
                value={localFilters[column.key] || ''}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  [column.key]: e.target.value
                }))}
                placeholder={`Filtra per ${column.label.toLowerCase()}`}
              />
            )}
          </div>
        ))}
        <div style={styles.filterActions}>
          <button 
            onClick={handleClearFilters}
            style={{
              ...styles.button,
              background: '#f5f5f7',
              color: '#1a1a1a',
            }}
          >
            Cancella
          </button>
          <button 
            onClick={handleApplyFilters}
            style={{
              ...styles.button,
              background: 'var(--primary)',
              color: '#fff',
            }}
          >
            Applica
          </button>
        </div>
      </div>
    </div>
  );
  
  // Componente per il messaggio di caricamento
  const LoadingState = () => (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 16, color: '#8e8e93', marginBottom: 10 }}>
        Caricamento dati...
      </div>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        border: '3px solid #f3f3f3',
        borderTop: '3px solid var(--primary)',
        borderRadius: '50%',
        margin: '0 auto',
        animation: 'spin 1s linear infinite'
      }}></div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
  
  // Componente per il messaggio di errore
  const ErrorState = () => (
    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#ff3b30' }}>
      <div style={{ fontSize: 16, marginBottom: 10 }}>
        {error}
      </div>
      <button 
        onClick={refresh}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          background: 'var(--primary)',
          color: '#fff',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        Riprova
      </button>
    </div>
  );
  
  // Componente per il messaggio di nessun dato
  const EmptyState = () => (
    <div style={styles.emptyState}>
      {emptyMessage}
    </div>
  );
  
  return (
    <div style={{ ...styles.tableContainer, ...(className ? { className } : {}), position: 'relative' }}>
      <div style={styles.header}>
        <div style={styles.searchContainer}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={handleSearch}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.actionsContainer}>
          {filterableColumns.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                style={{
                  ...styles.button,
                  ...(activeFilter === 'filter' ? styles.activeButton : {})
                }}
                onClick={() => setActiveFilter(activeFilter === 'filter' ? null : 'filter')}
              >
                Filtri {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
              </button>
              {activeFilter === 'filter' && <FilterPopover />}
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <button
              style={{
                ...styles.button,
                ...(activeFilter === 'columns' ? styles.activeButton : {})
              }}
              onClick={() => setActiveFilter(activeFilter === 'columns' ? null : 'columns')}
            >
              Colonne
            </button>
            {activeFilter === 'columns' && <ColumnSelector />}
          </div>
          <button
            style={styles.refreshButton}
            onClick={refresh}
            title="Aggiorna"
          >
            🔄
          </button>
          {lastUpdated && (
            <span style={styles.lastUpdated}>
              Aggiornato: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
      
      {loading && data.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <ErrorState />
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div style={{ overflowX: 'auto', position: 'relative' }}>
            {loading && (
              <div style={styles.loadingOverlay}>
                <div style={styles.spinner}></div>
              </div>
            )}
            <table style={styles.table}>
              <thead>
                <tr>
                  {columns
                    .filter(column => visibleColumns.includes(column.key))
                    .map(column => (
                      <th
                        key={column.key}
                        style={styles.th}
                        onClick={() => handleSort(column.key)}
                      >
                        {column.label}
                        {sortBy === column.key && (
                          <span style={styles.sortIcon}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr
                    key={item.id || index}
                    style={{
                      ...(onRowClick ? styles.clickableRow : {}),
                      ...(selectedRow && selectedRow.id === item.id ? styles.selectedRow : {}),
                    }}
                    onClick={() => onRowClick && onRowClick(item)}
                  >
                    {columns
                      .filter(column => visibleColumns.includes(column.key))
                      .map(column => (
                        <td key={column.key} style={styles.td}>
                          {column.render
                            ? column.render(item)
                            : getNestedValue(item, column.key) || '-'}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={styles.footer}>
            <div style={styles.rowCount}>
              Mostrando {data.length} di {total} risultati
            </div>
            <div style={styles.pagination}>
              <button
                style={{
                  ...styles.pageButton,
                  opacity: page === 1 ? 0.5 : 1,
                  cursor: page === 1 ? 'default' : 'pointer',
                }}
                onClick={() => page > 1 && goToPage(page - 1)}
                disabled={page === 1}
              >
                ←
              </button>
              
              {getPageNumbers().map((pageNum, index) => (
                <button
                  key={index}
                  style={{
                    ...styles.pageButton,
                    ...(pageNum === page ? styles.activePageButton : {}),
                    cursor: pageNum === '...' ? 'default' : 'pointer',
                  }}
                  onClick={() => pageNum !== '...' && goToPage(pageNum)}
                  disabled={pageNum === '...'}
                >
                  {pageNum}
                </button>
              ))}
              
              <button
                style={{
                  ...styles.pageButton,
                  opacity: page === lastPage ? 0.5 : 1,
                  cursor: page === lastPage ? 'default' : 'pointer',
                }}
                onClick={() => page < lastPage && goToPage(page + 1)}
                disabled={page === lastPage}
              >
                →
              </button>
            </div>
            <div style={styles.itemsPerPageContainer}>
              <span>Righe per pagina:</span>
              <select
                value={perPage}
                onChange={(e) => changePerPage(Number(e.target.value))}
                style={styles.select}
              >
                {itemsPerPageOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  );
}