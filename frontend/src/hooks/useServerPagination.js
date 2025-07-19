"use client";
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';

/**
 * Hook personalizzato per gestire la paginazione lato server
 * @param {Object} options - Opzioni di configurazione
 * @param {string} options.endpoint - Endpoint API da chiamare
 * @param {Object} options.params - Parametri aggiuntivi da passare alla richiesta
 * @param {number} options.defaultPage - Pagina iniziale (default: 1)
 * @param {number} options.defaultPerPage - Elementi per pagina (default: 10)
 * @param {string} options.defaultSortBy - Campo per l'ordinamento iniziale
 * @param {string} options.defaultSortDirection - Direzione dell'ordinamento iniziale ('asc' o 'desc')
 * @param {boolean} options.autoRefresh - Se aggiornare automaticamente i dati (default: false)
 * @param {number} options.refreshInterval - Intervallo di aggiornamento in ms (default: 60000)
 * @returns {Object} Stato e funzioni per gestire la paginazione
 */
export default function useServerPagination(options) {
  const {
    endpoint,
    params = {},
    defaultPage = 1,
    defaultPerPage = 10,
    defaultSortBy = null,
    defaultSortDirection = 'asc',
    autoRefresh = false,
    refreshInterval = 60000
  } = options;
  
  // Stato per i dati
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Stato per la paginazione
  const [page, setPage] = useState(defaultPage);
  const [perPage, setPerPage] = useState(defaultPerPage);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  
  // Stato per l'ordinamento
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortDirection, setSortDirection] = useState(defaultSortDirection);
  
  // Stato per i filtri
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  
  // Funzione per caricare i dati
  const fetchData = useCallback(async (overrideParams = {}) => {
    if (!endpoint) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Prepara i parametri per la richiesta
      const requestParams = {
        page,
        per_page: perPage,
        ...params,
        ...overrideParams
      };
      
      // Aggiungi parametri di ordinamento
      if (sortBy) {
        requestParams.sort_by = sortBy;
        requestParams.sort_direction = sortDirection;
      }
      
      // Aggiungi parametri di ricerca
      if (search) {
        requestParams.search = search;
      }
      
      // Aggiungi filtri
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          requestParams[`filter_${key}`] = value;
        }
      });
      
      // Esegui la richiesta
      const response = await api.get(endpoint, {
        params: requestParams,
        useCache: true,
        cacheTTL: 5 * 60 * 1000 // 5 minuti
      });
      
      // Gestisci la risposta
      if (response.data.data) {
        // Risposta paginata
        setData(response.data.data);
        setTotal(response.data.total || 0);
        setLastPage(response.data.last_page || 1);
      } else {
        // Array semplice
        setData(response.data);
        setTotal(response.data.length);
        setLastPage(Math.ceil(response.data.length / perPage));
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error(`Errore nel caricamento dei dati da ${endpoint}:`, err);
      setError(err.message || 'Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, perPage, sortBy, sortDirection, search, filters, params]);
  
  // Carica i dati quando cambiano le dipendenze
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Imposta un intervallo di aggiornamento se richiesto
  useEffect(() => {
    if (!autoRefresh) return;
    
    const intervalId = setInterval(() => {
      fetchData();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchData]);
  
  // Funzione per cambiare pagina
  const goToPage = useCallback((newPage) => {
    setPage(newPage);
  }, []);
  
  // Funzione per cambiare elementi per pagina
  const changePerPage = useCallback((newPerPage) => {
    setPerPage(newPerPage);
    setPage(1); // Reset alla prima pagina
  }, []);
  
  // Funzione per cambiare ordinamento
  const changeSort = useCallback((newSortBy, newSortDirection = null) => {
    setSortBy(newSortBy);
    
    // Se non è specificata una direzione, inverti quella corrente
    if (newSortDirection === null) {
      setSortDirection(prev => 
        newSortBy === sortBy && prev === 'asc' ? 'desc' : 'asc'
      );
    } else {
      setSortDirection(newSortDirection);
    }
    
    setPage(1); // Reset alla prima pagina
  }, [sortBy]);
  
  // Funzione per impostare i filtri
  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset alla prima pagina
  }, []);
  
  // Funzione per impostare la ricerca
  const applySearch = useCallback((newSearch) => {
    setSearch(newSearch);
    setPage(1); // Reset alla prima pagina
  }, []);
  
  // Funzione per ricaricare i dati
  const refresh = useCallback(() => {
    return fetchData();
  }, [fetchData]);
  
  // Funzione per resettare tutti i filtri e la ricerca
  const resetFilters = useCallback(() => {
    setFilters({});
    setSearch('');
    setPage(1);
  }, []);
  
  return {
    // Dati
    data,
    loading,
    error,
    lastUpdated,
    
    // Informazioni sulla paginazione
    page,
    perPage,
    total,
    lastPage,
    
    // Informazioni sull'ordinamento
    sortBy,
    sortDirection,
    
    // Informazioni sui filtri
    filters,
    search,
    
    // Funzioni
    goToPage,
    changePerPage,
    changeSort,
    applyFilters,
    applySearch,
    refresh,
    resetFilters
  };
}