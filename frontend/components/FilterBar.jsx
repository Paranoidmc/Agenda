"use client";
import { useState } from "react";
import { FiFilter, FiX } from "react-icons/fi";

export default function FilterBar({ filters: filterConfig, onFilterChange, onClearFilters }) {
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState({});

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value === '' ? undefined : value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    onFilterChange({});
    if (onClearFilters) onClearFilters();
  };

  const activeFiltersCount = Object.values(localFilters).filter(v => v !== undefined && v !== '' && v !== null).length;

  return (
    <div style={{ marginBottom: 20, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showFilters ? 16 : 0 }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
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
          <FiFilter />
          Filtri {activeFiltersCount > 0 && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}>{activeFiltersCount}</span>}
        </button>
        
        {activeFiltersCount > 0 && (
          <button
            onClick={handleClearFilters}
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
            <FiX /> Cancella Filtri
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
          {filterConfig?.map((filter) => (
            <div key={filter.key}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>
                {filter.label}
              </label>
              {filter.type === 'select' ? (
                <select
                  value={localFilters[filter.key] || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
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
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
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
                    onChange={(e) => handleFilterChange(filter.key, { ...(localFilters[filter.key] || {}), from: e.target.value })}
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
                    onChange={(e) => handleFilterChange(filter.key, { ...(localFilters[filter.key] || {}), to: e.target.value })}
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
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  placeholder={filter.placeholder || `Filtra per ${filter.label.toLowerCase()}`}
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
          ))}
        </div>
      )}
    </div>
  );
}

