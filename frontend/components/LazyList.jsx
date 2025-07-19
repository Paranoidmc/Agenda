"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';

/**
 * Componente per il caricamento lazy di liste di dati
 * Carica automaticamente più dati quando l'utente scorre verso il basso
 */
export default function LazyList({
  endpoint,
  renderItem,
  loadingComponent = <div>Caricamento...</div>,
  emptyComponent = <div>Nessun elemento trovato</div>,
  errorComponent = (error, retry) => (
    <div>
      Errore: {error}
      <button onClick={retry}>Riprova</button>
    </div>
  ),
  pageSize = 20,
  filters = {},
  deps = []
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();
  const lastItemRef = useRef();
  
  // Funzione per caricare i dati
  const loadItems = useCallback(async (pageNum, append = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(endpoint, {
        params: {
          page: pageNum,
          per_page: pageSize,
          ...filters
        },
        useCache: true,
        cacheTTL: 5 * 60 * 1000 // 5 minuti
      });
      
      const result = response.data;
      const newItems = result.data || result;
      
      // Aggiorna lo stato in base al tipo di caricamento (iniziale o append)
      if (append) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      
      // Determina se ci sono altre pagine da caricare
      if (result.data && result.last_page) {
        setHasMore(pageNum < result.last_page);
      } else {
        setHasMore(newItems.length === pageSize);
      }
      
      setPage(pageNum);
    } catch (err) {
      console.error(`Errore nel caricamento dei dati da ${endpoint}:`, err);
      setError(err.message || 'Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  }, [endpoint, pageSize, filters]);
  
  // Carica la prima pagina quando cambiano le dipendenze
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    loadItems(1, false);
  }, [loadItems, ...deps]);
  
  // Configura l'observer per il caricamento infinito
  useEffect(() => {
    if (!hasMore || loading) return;
    
    const handleObserver = (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loading) {
        loadItems(page + 1, true);
      }
    };
    
    const options = {
      root: null,
      rootMargin: '20px',
      threshold: 0.1
    };
    
    observer.current = new IntersectionObserver(handleObserver, options);
    
    if (lastItemRef.current) {
      observer.current.observe(lastItemRef.current);
    }
    
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [hasMore, loading, page, loadItems]);
  
  // Funzione per il retry in caso di errore
  const retry = () => {
    loadItems(page, items.length > 0);
  };
  
  // Rendering condizionale per errori e stato vuoto
  if (error && items.length === 0) {
    return errorComponent(error, retry);
  }
  
  if (items.length === 0 && !loading && !error) {
    return emptyComponent;
  }
  
  return (
    <div>
      {items.map((item, index) => {
        if (index === items.length - 1) {
          return (
            <div key={item.id || index} ref={lastItemRef}>
              {renderItem(item, index)}
            </div>
          );
        }
        return <div key={item.id || index}>{renderItem(item, index)}</div>;
      })}
      
      {loading && loadingComponent}
      {error && items.length > 0 && errorComponent(error, retry)}
    </div>
  );
}