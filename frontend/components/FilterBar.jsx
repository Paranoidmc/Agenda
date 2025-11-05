"use client";
import { useState, useEffect, useRef } from "react";

export default function FilterBar({ filters: filterConfig, currentFilters = {}, onFilterChange, onClearFilters }) {
  // Mantieni lo stato dei filtri aperti usando localStorage per persistenza tra re-render
  const [showFilters, setShowFilters] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('filterBarOpen') === 'true';
    }
    return false;
  });
  const [localFilters, setLocalFilters] = useState(currentFilters || {});
  const debounceTimerRef = useRef(null);

  // Sincronizza localFilters con currentFilters quando cambiano dall'esterno
  useEffect(() => {
    // Se currentFilters è stato resettato esplicitamente (oggetto vuoto), resetta anche localFilters
    if (currentFilters && Object.keys(currentFilters).length === 0 && Object.keys(localFilters).length > 0) {
      // Controlla se è un reset esplicito controllando se i filtri attivi erano diversi
      const hasActiveFilters = Object.values(localFilters).some(v => v !== undefined && v !== '' && v !== null);
      if (hasActiveFilters) {
        // È un reset esplicito, svuota localFilters
        setLocalFilters({});
      }
    } else if (currentFilters && Object.keys(currentFilters).length > 0) {
      // Aggiorna localFilters con i valori da currentFilters
      setLocalFilters(prev => {
        // Merge intelligente: mantieni i valori di currentFilters ma preserva anche quelli che non sono ancora stati applicati
        const merged = { ...prev };
        Object.entries(currentFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== '' && value !== null) {
            merged[key] = value;
          } else {
            delete merged[key];
          }
        });
        return merged;
      });
    }
  }, [currentFilters]);

  // Salva lo stato aperto/chiuso in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('filterBarOpen', showFilters.toString());
    }
  }, [showFilters]);

  // Debounce per i campi di testo - aggiorna solo dopo che l'utente smette di digitare
  const handleFilterChange = (key, value, isTextInput = false) => {
    const newFilters = { ...localFilters, [key]: value === '' ? undefined : value };
    setLocalFilters(newFilters);
    
    // Per i campi di testo, usa debounce (500ms)
    // Per select e date, applica immediatamente
    if (isTextInput) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (onFilterChange) {
          onFilterChange(newFilters);
        }
      }, 500);
    } else {
      // Per select e date, applica immediatamente
      if (onFilterChange) {
        onFilterChange(newFilters);
      }
    }
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (onFilterChange) {
      onFilterChange({});
    }
    if (onClearFilters) {
      onClearFilters();
    }
  };

  // Cleanup del timer quando il componente viene smontato
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const activeFiltersCount = Object.values(localFilters).filter(v => v !== undefined && v !== '' && v !== null).length;

  // Se non ci sono filtri configurati, non renderizzare nulla
  if (!filterConfig || !Array.isArray(filterConfig) || filterConfig.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: 20, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showFilters ? 16 : 0 }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #e5e5ea',
            background: '#f5f5f7',
            color: '#1a1a1a',
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#e5e5ea'}
          onMouseLeave={(e) => e.target.style.background = '#f5f5f7'}
        >
          <span>🔍</span>
          Filtri {activeFiltersCount > 0 && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}>{activeFiltersCount}</span>}
        </button>
        
        {activeFiltersCount > 0 && (
          <button
            onClick={handleClearFilters}
            type="button"
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #e5e5ea',
              background: '#fff',
              color: '#ff3b30',
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>✕</span> Cancella Filtri
          </button>
        )}
      </div>

      {showFilters && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 16,
          padding: '16px',
          background: '#f9fafb',
          borderRadius: 8,
          border: '1px solid #e5e5ea'
        }}>
          {filterConfig.map((filter) => {
            if (!filter || !filter.key) return null;
            return (
              <div key={filter.key}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>
                  {filter.label || filter.key}
                </label>
                {filter.type === 'select' ? (
                  <select
                    value={localFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value, false)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #e5e5ea',
                      fontSize: 14,
                      background: '#fff'
                    }}
                  >
                    <option value="">Tutti</option>
                    {filter.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : filter.type === 'date' ? (
                  <input
                    type="date"
                    value={localFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value, false)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #e5e5ea',
                      fontSize: 14,
                      background: '#fff'
                    }}
                  />
                ) : filter.type === 'dateRange' ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="date"
                      placeholder="Da"
                      value={localFilters[filter.key]?.from || ''}
                      onChange={(e) => handleFilterChange(filter.key, { ...(localFilters[filter.key] || {}), from: e.target.value }, false)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid #e5e5ea',
                        fontSize: 14,
                        background: '#fff'
                      }}
                    />
                    <input
                      type="date"
                      placeholder="A"
                      value={localFilters[filter.key]?.to || ''}
                      onChange={(e) => handleFilterChange(filter.key, { ...(localFilters[filter.key] || {}), to: e.target.value }, false)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid #e5e5ea',
                        fontSize: 14,
                        background: '#fff'
                      }}
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={localFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value, true)}
                    placeholder={filter.placeholder || `Filtra per ${filter.label?.toLowerCase() || filter.key}`}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #e5e5ea',
                      fontSize: 14,
                      background: '#fff'
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
