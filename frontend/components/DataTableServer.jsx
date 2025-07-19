"use client";
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

/**
 * Componente DataTable con paginazione, ordinamento e filtri lato server
 * Ottimizzato per gestire grandi quantità di dati
 */
export default function DataTableServer({
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
  // Stato per i dati
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Stato per la ricerca
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Stato per i filtri
  const [filters, setFilters] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);
  
  // Stato per la paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [totalPages, setTotalPages] = useState(1);
  
  // Stato per le colonne visibili
  const [visibleColumns, setVisibleColumns] = useState(
    defaultVisibleColumns || columns.map(col => col.key)
  );
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  // Stato per l'ordinamento
  const [sortConfig, setSortConfig] = useState({ 
    key: defaultSortKey, 
    direction: defaultSortDirection 
  });
  
  // Debounce per la ricerca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Reset della pagina quando cambiano i filtri o la ricerca
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters, itemsPerPage, sortConfig]);
  
  // Funzione per caricare i dati dal server
  const loadData = useCallback(async () => {
    if (!endpoint) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Prepara i parametri per la richiesta
      const params = {
        page: currentPage,
        per_page: itemsPerPage,
        ...additionalParams
      };
      
      // Aggiungi parametri di ricerca
      if (debouncedSearchTerm) {
        params.search = debouncedSearchTerm;
      }
      
      // Aggiungi parametri di ordinamento
      if (sortConfig.key) {
        params.sort_by = sortConfig.key;
        params.sort_direction = sortConfig.direction;
      }
      
      // Aggiungi filtri
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params[`filter_${key}`] = value;
        }
      });
      
      // Esegui la richiesta
      const response = await api.get(endpoint, {
        params,
        useCache: true,
        cacheTTL: 5 * 60 * 1000 // 5 minuti
      });
      
      // Gestisci la risposta
      if (response.data.data) {
        // Risposta paginata
        setData(response.data.data);
        setTotalItems(response.data.total || 0);
        setTotalPages(response.data.last_page || 1);
      } else {
        // Array semplice
        setData(response.data);
        setTotalItems(response.data.length);
        setTotalPages(Math.ceil(response.data.length / itemsPerPage));
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error(`Errore nel caricamento dei dati da ${endpoint}:`, err);
      setError(err.message || 'Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  }, [
    endpoint, 
    currentPage, 
    itemsPerPage, 
    debouncedSearchTerm, 
    sortConfig, 
    filters,
    additionalParams
  ]);
  
  // Carica i dati quando cambiano le dipendenze
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Imposta un intervallo di aggiornamento se richiesto
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const intervalId = setInterval(() => {
      loadData();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval, loadData]);
  
  // Funzione per gestire la ricerca
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Funzione per gestire i filtri
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Funzione per gestire l'ordinamento
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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
  
  // Funzione per cambiare pagina
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  // Funzione per cambiare il numero di elementi per pagina
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
  };
  
  // Funzione per aggiornare manualmente i dati
  const handleRefresh = () => {
    loadData();
  };
  
  // Funzione per ottenere un valore annidato da un oggetto
  const getNestedValue = (obj, path) => {
    if (!path) return obj;
    const keys = path.split('.');
    return keys.reduce((o, k) => (o && o[k] !== undefined) ? o[k] : null, obj);
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
  const FilterPopover = () => {
    const [localFilters, setLocalFilters] = useState({...filters});
    
    const handleApplyFilters = () => {
      setFilters(localFilters);
      setActiveFilter(null);
    };
    
    const handleClearFilters = () => {
      setLocalFilters({});
      setFilters({});
      setActiveFilter(null);
    };
    
    return (
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
  };
  
  // Funzione per generare i numeri di pagina da visualizzare
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Mostra tutte le pagine se sono meno del massimo
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Mostra sempre la prima pagina
      pageNumbers.push(1);
      
      // Calcola l'intervallo di pagine da mostrare
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Aggiusta l'intervallo per mostrare sempre 3 pagine
      if (startPage === 2) endPage = Math.min(totalPages - 1, 4);
      if (endPage === totalPages - 1) startPage = Math.max(2, totalPages - 3);
      
      // Aggiungi ellipsis se necessario
      if (startPage > 2) pageNumbers.push('...');
      
      // Aggiungi le pagine dell'intervallo
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      // Aggiungi ellipsis se necessario
      if (endPage < totalPages - 1) pageNumbers.push('...');
      
      // Mostra sempre l'ultima pagina
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };
  
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
        onClick={handleRefresh}
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
    <div style={{ ...styles.tableContainer, ...(className ? { className } : {}) }}>
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
            onClick={handleRefresh}
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
      
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState />
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {columns
                    .filter(column => visibleColumns.includes(column.key))
                    .map(column => (
                      <th
                        key={column.key}
                        style={styles.th}
                        onClick={() => column.key !== 'actions' && handleSort(column.key)}
                      >
                        {column.label}
                        {sortConfig.key === column.key && (
                          <span style={styles.sortIcon}>
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
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
              Mostrando {data.length} di {totalItems} risultati
            </div>
            <div style={styles.pagination}>
              <button
                style={{
                  ...styles.pageButton,
                  opacity: currentPage === 1 ? 0.5 : 1,
                  cursor: currentPage === 1 ? 'default' : 'pointer',
                }}
                onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ←
              </button>
              
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  style={{
                    ...styles.pageButton,
                    ...(page === currentPage ? styles.activePageButton : {}),
                    cursor: page === '...' ? 'default' : 'pointer',
                  }}
                  onClick={() => page !== '...' && handlePageChange(page)}
                  disabled={page === '...'}
                >
                  {page}
                </button>
              ))}
              
              <button
                style={{
                  ...styles.pageButton,
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  cursor: currentPage === totalPages ? 'default' : 'pointer',
                }}
                onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                →
              </button>
            </div>
            <div style={styles.itemsPerPageContainer}>
              <span>Righe per pagina:</span>
              <select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
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