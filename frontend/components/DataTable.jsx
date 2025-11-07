"use client";
import { useState, useEffect, useMemo, useRef } from 'react';

export default function DataTable({
  data = [],
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
  // Props per paginazione server-side
  totalItems = null,
  itemsPerPage = null,
  currentPage = null,
  onPageChange = null,
  onItemsPerPageChange = null,
  searchTerm = null,
  onSearchTermChange = null,
  isLoading = false,
  hideSearch = false
}) {
  // Stato per la ricerca (usa props esterni se disponibili)
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const actualSearchTerm = searchTerm !== null ? searchTerm : internalSearchTerm;
  const displaySearchTerm = internalSearchTerm;
  
  // Stato per i filtri
  const [filters, setFilters] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);
  
  // Stato per la paginazione (usa props esterni se disponibili)
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [internalItemsPerPage, setInternalItemsPerPage] = useState(defaultItemsPerPage);
  
  // Usa props esterni per paginazione server-side se disponibili
  const isServerSide = totalItems !== null && currentPage !== null && itemsPerPage !== null;
  const actualCurrentPage = isServerSide ? currentPage : internalCurrentPage;
  const actualItemsPerPage = isServerSide ? itemsPerPage : internalItemsPerPage;
  
  // Stato per le colonne visibili
  const [visibleColumns, setVisibleColumns] = useState(
    defaultVisibleColumns || columns.map(col => col.key)
  );
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  // Stato per l'ordinamento
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Reset della pagina quando cambiano i dati o i filtri (solo per client-side)
  // Per server-side, il reset è gestito dal componente padre tramite handleSearchChange
  // RIMOSSO: questo effect causava problemi di reset pagina anche in modalità server-side
  
  // Mantiene stabile il riferimento al callback di ricerca
  const onSearchTermChangeRef = useRef(onSearchTermChange);

  useEffect(() => {
    onSearchTermChangeRef.current = onSearchTermChange;
  }, [onSearchTermChange]);

  // Debounce per la ricerca server-side
  useEffect(() => {
    if (onSearchTermChangeRef.current) {
      const timer = setTimeout(() => {
        onSearchTermChangeRef.current(internalSearchTerm);
      }, 500); // Aspetta 500ms dopo che l'utente smette di digitare
      
      return () => clearTimeout(timer);
    }
  }, [internalSearchTerm]);
  
  // Funzione per gestire la ricerca
  const handleSearch = (e) => {
    const newSearchTerm = e.target.value;
    if (onSearchTermChange) {
      // Per server-side, aggiorna solo lo stato locale (il debounce gestirà la chiamata)
      setInternalSearchTerm(newSearchTerm);
    } else {
      setInternalSearchTerm(newSearchTerm);
    }
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
  
  // Funzione per ottenere un valore annidato da un oggetto
  const getNestedValue = (obj, path) => {
    if (!path) return obj;
    const keys = path.split('.');
    return keys.reduce((o, k) => (o && o[k] !== undefined) ? o[k] : null, obj);
  };
  
  // Filtraggio e ordinamento dei dati
  const filteredAndSortedData = useMemo(() => {
    // Filtraggio per ricerca
    let result = [...data];
    
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(item => {
        return columns.some(column => {
          const value = getNestedValue(item, column.key);
          return value !== null && 
                 String(value).toLowerCase().includes(lowerSearchTerm);
        });
      });
    }
    
    // Filtraggio per filtri specifici
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        result = result.filter(item => {
          const itemValue = getNestedValue(item, key);
          if (Array.isArray(value)) {
            return value.includes(itemValue);
          } else if (typeof value === 'object' && value !== null) {
            // Range filter
            const { min, max } = value;
            if (min !== undefined && max !== undefined) {
              return itemValue >= min && itemValue <= max;
            } else if (min !== undefined) {
              return itemValue >= min;
            } else if (max !== undefined) {
              return itemValue <= max;
            }
            return true;
          } else {
            return String(itemValue).toLowerCase() === String(value).toLowerCase();
          }
        });
      }
    });
    
    // Ordinamento
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = getNestedValue(a, sortConfig.key);
        const bValue = getNestedValue(b, sortConfig.key);
        
        if (aValue === null) return sortConfig.direction === 'asc' ? -1 : 1;
        if (bValue === null) return sortConfig.direction === 'asc' ? 1 : -1;
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return result;
  }, [data, actualSearchTerm, filters, sortConfig]);
  
  // Paginazione dei dati (solo per client-side)
  const paginatedData = useMemo(() => {
    if (isServerSide) {
      // Per server-side, usa direttamente i dati ricevuti
      return data;
    } else {
      // Per client-side, applica paginazione locale
      const startIndex = (actualCurrentPage - 1) * actualItemsPerPage;
      return filteredAndSortedData.slice(startIndex, startIndex + actualItemsPerPage);
    }
  }, [filteredAndSortedData, actualCurrentPage, actualItemsPerPage, isServerSide, data]);
  
  // Calcolo del numero totale di pagine
  const totalPages = isServerSide 
    ? Math.ceil(totalItems / actualItemsPerPage)
    : Math.ceil(filteredAndSortedData.length / actualItemsPerPage);
  
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
              ) : column.filterType === 'range' ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="number" 
                    placeholder="Min" 
                    style={{ ...styles.filterInput, flex: 1 }}
                    value={localFilters[column.key]?.min || ''}
                    onChange={(e) => setLocalFilters(prev => ({
                      ...prev,
                      [column.key]: {
                        ...prev[column.key],
                        min: e.target.value ? Number(e.target.value) : undefined
                      }
                    }))}
                  />
                  <input 
                    type="number" 
                    placeholder="Max" 
                    style={{ ...styles.filterInput, flex: 1 }}
                    value={localFilters[column.key]?.max || ''}
                    onChange={(e) => setLocalFilters(prev => ({
                      ...prev,
                      [column.key]: {
                        ...prev[column.key],
                        max: e.target.value ? Number(e.target.value) : undefined
                      }
                    }))}
                  />
                </div>
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
              style={styles.button}
              onClick={handleClearFilters}
            >
              Cancella
            </button>
            <button 
              style={{...styles.button, ...styles.activeButton}}
              onClick={handleApplyFilters}
            >
              Applica
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Icone SVG
  const SearchIcon = () => (
    <svg style={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  
  const FilterIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  
  const ColumnsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H12V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 3H12V21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  
  const ChevronUpIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 15L12 9L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  
  const ChevronDownIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  
  const ChevronLeftIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  
  const ChevronRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  
  // Rendering della tabella
  return (
    <div style={styles.tableContainer} className={className}>
      {/* Header con ricerca, filtri e selettore colonne */}
      <div style={styles.header}>
        {!hideSearch && (
          <div style={styles.searchContainer}>
            <SearchIcon />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={displaySearchTerm}
              onChange={handleSearch}
              style={styles.searchInput}
            />
          </div>
        )}
        <div style={styles.actionsContainer}>
          {filterableColumns.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                style={{
                  ...styles.button,
                  ...(Object.keys(filters).length > 0 ? styles.activeButton : {})
                }}
                onClick={() => setActiveFilter(activeFilter === 'filter' ? null : 'filter')}
              >
                <FilterIcon />
                Filtri
                {Object.keys(filters).length > 0 && (
                  <span style={{
                    background: activeFilter === 'filter' ? '#fff' : 'var(--primary)',
                    color: activeFilter === 'filter' ? 'var(--primary)' : '#fff',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                  }}>
                    {Object.keys(filters).length}
                  </span>
                )}
              </button>
              {activeFilter === 'filter' && <FilterPopover />}
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <button
              style={styles.button}
              onClick={() => setShowColumnSelector(!showColumnSelector)}
            >
              <ColumnsIcon />
              Colonne
            </button>
            {showColumnSelector && <ColumnSelector />}
          </div>
        </div>
      </div>
      
      {/* Tabella */}
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
                    onClick={() => handleSort(column.key)}
                  >
                    {column.label}
                    {sortConfig.key === column.key && (
                      <span style={styles.sortIcon}>
                        {sortConfig.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />}
                      </span>
                    )}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item, index) => (
                <tr 
                  key={index}
                  style={{
                    ...styles.tr,
                    ...(onRowClick ? styles.clickableRow : {}),
                    ...(selectedRow && selectedRow.id === item.id ? styles.selectedRow : {})
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
              ))
            ) : (
              <tr>
                <td 
                  colSpan={visibleColumns.length} 
                  style={styles.emptyState}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer con paginazione */}
      <div style={styles.footer}>
        <div style={styles.rowCount}>
          Mostrando {paginatedData.length} di {isServerSide ? totalItems : filteredAndSortedData.length} risultati
        </div>
        <div style={styles.pagination}>
          <button
            style={styles.pageButton}
            onClick={() => {
              if (onPageChange) {
                onPageChange(1);
              } else {
                setInternalCurrentPage(1);
              }
            }}
            disabled={actualCurrentPage === 1}
          >
            <ChevronLeftIcon />
            <ChevronLeftIcon />
          </button>
          <button
            style={styles.pageButton}
            onClick={() => {
              const newPage = Math.max(1, actualCurrentPage - 1);
              if (onPageChange) {
                onPageChange(newPage);
              } else {
                setInternalCurrentPage(newPage);
              }
            }}
            disabled={actualCurrentPage === 1}
          >
            <ChevronLeftIcon />
          </button>
          
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              style={{
                ...styles.pageButton,
                ...(page === actualCurrentPage ? styles.activePageButton : {})
              }}
              onClick={() => {
                if (typeof page === 'number') {
                  if (onPageChange) {
                    onPageChange(page);
                  } else {
                    setInternalCurrentPage(page);
                  }
                }
              }}
              disabled={typeof page !== 'number'}
            >
              {page}
            </button>
          ))}
          
          <button
            style={styles.pageButton}
            onClick={() => {
              const newPage = Math.min(totalPages, actualCurrentPage + 1);
              if (onPageChange) {
                onPageChange(newPage);
              } else {
                setInternalCurrentPage(newPage);
              }
            }}
            disabled={actualCurrentPage === totalPages || totalPages === 0}
          >
            <ChevronRightIcon />
          </button>
          <button
            style={styles.pageButton}
            onClick={() => {
              if (onPageChange) {
                onPageChange(totalPages);
              } else {
                setInternalCurrentPage(totalPages);
              }
            }}
            disabled={actualCurrentPage === totalPages || totalPages === 0}
          >
            <ChevronRightIcon />
            <ChevronRightIcon />
          </button>
        </div>
        <div style={styles.itemsPerPageContainer}>
          <span>Righe per pagina:</span>
          <select
            style={styles.select}
            value={actualItemsPerPage}
            onChange={(e) => {
              const newItemsPerPage = Number(e.target.value);
              if (onItemsPerPageChange) {
                onItemsPerPageChange(newItemsPerPage);
              } else {
                setInternalItemsPerPage(newItemsPerPage);
              }
            }}
          >
            {itemsPerPageOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}