"use client";
import { useState, useEffect, useCallback } from 'react';
import dataService from '../services/dataService';
import api from '../../lib/api';

/**
 * Hook personalizzato per la gestione ottimizzata dei dati
 * @param {Object} options - Opzioni di configurazione
 * @param {string} options.endpoint - Endpoint API da chiamare
 * @param {Object} options.params - Parametri da passare alla richiesta
 * @param {boolean} options.useCache - Se utilizzare la cache (default: true)
 * @param {number} options.cacheTTL - TTL personalizzato per la cache in ms
 * @param {boolean} options.autoRefresh - Se aggiornare automaticamente i dati (default: false)
 * @param {number} options.refreshInterval - Intervallo di aggiornamento in ms (default: 60000)
 * @param {Function} options.transform - Funzione per trasformare i dati ricevuti
 * @returns {Object} Stato e funzioni per gestire i dati
 */
export default function useData(options) {
  const {
    endpoint,
    params = {},
    useCache = true,
    cacheTTL,
    autoRefresh = false,
    refreshInterval = 60000,
    transform = data => data,
    initialData = null
  } = options;
  
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Funzione per caricare i dati
  const fetchData = useCallback(async (overrideParams = {}) => {
    if (!endpoint) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Combina i parametri di base con quelli di override
      const requestParams = { ...params, ...overrideParams };
      
      const response = await api.get(endpoint, {
        params: requestParams,
        useCache,
        cacheTTL,
        retry: true
      });
      
      // Trasforma i dati se necessario
      const transformedData = transform(response.data);
      
      setData(transformedData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(`Errore nel caricamento dei dati da ${endpoint}:`, err);
      setError(err.message || 'Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  }, [endpoint, params, useCache, cacheTTL, transform]);
  
  // Funzione per ricaricare i dati
  const refresh = useCallback(() => {
    return fetchData({ _t: Date.now() }); // Aggiungi un timestamp per forzare il refresh
  }, [fetchData]);
  
  // Funzione per invalidare la cache
  const invalidateCache = useCallback(() => {
    api.invalidateCache(endpoint);
  }, [endpoint]);
  
  // Carica i dati all'inizializzazione e quando cambiano le dipendenze
  useEffect(() => {
    fetchData();
    
    // Imposta un intervallo di aggiornamento se autoRefresh è attivo
    let refreshTimer;
    if (autoRefresh) {
      refreshTimer = setInterval(() => {
        refresh();
      }, refreshInterval);
    }
    
    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [fetchData, autoRefresh, refreshInterval, refresh]);
  
  return {
    data,
    loading,
    error,
    refresh,
    invalidateCache,
    lastUpdated,
    setData // Espone setData per permettere aggiornamenti manuali
  };
}