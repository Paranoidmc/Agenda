"use client";
import { useState, useEffect, useCallback } from 'react';
import dataService from '../src/services/dataService';

export default function ActivityList({ 
  siteId, 
  clientId, 
  driverId, 
  vehicleId, 
  onActivityClick,
  limit = 0,
  showPagination = false,
  autoRefresh = false
}) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Funzione per determinare l'endpoint corretto
  const getEndpoint = useCallback(() => {
    if (siteId) {
      return `/sites/${siteId}/activities`;
    } else if (clientId) {
      return `/clients/${clientId}/activities`;
    } else if (driverId) {
      return `/drivers/${driverId}/activities`;
    } else if (vehicleId) {
      return `/vehicles/${vehicleId}/activities`;
    }
    return '/activities';
  }, [siteId, clientId, driverId, vehicleId]);
  
  // Funzione per caricare le attività
  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = getEndpoint();
      const options = {
        endpoint,
        useCache: true,
        cacheTTL: 5 * 60 * 1000 // 5 minuti
      };
      
      // Aggiungi paginazione se richiesta
      if (showPagination) {
        options.page = page;
        options.perPage = 10; // Numero di elementi per pagina
      } else if (limit > 0) {
        options.perPage = limit;
      }
      
      const result = await dataService.getActivities(options);
      
      if (result.data) {
        // Se il risultato è paginato
        setActivities(result.data);
        setTotalPages(result.last_page || 1);
        setTotalItems(result.total || result.data.length);
      } else {
        // Se il risultato è un array semplice
        setActivities(result);
        setTotalItems(result.length);
      }
    } catch (err) {
      console.error("Errore nel caricamento delle attività:", err);
      setError("Errore nel caricamento delle attività");
    } finally {
      setLoading(false);
    }
  }, [getEndpoint, page, limit, showPagination]);
  
  // Carica le attività quando cambiano i parametri
  useEffect(() => {
    loadActivities();
    
    // Imposta un intervallo di aggiornamento se autoRefresh è attivo
    let refreshInterval;
    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        loadActivities();
      }, 60000); // Aggiorna ogni minuto
    }
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [loadActivities, autoRefresh]);
  
  // Funzione per cambiare pagina
  const changePage = (newPage) => {
    setPage(newPage);
  };
  
  // Componente per la paginazione
  const Pagination = () => {
    if (!showPagination || totalPages <= 1) return null;
    
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginTop: 16,
        fontSize: 14
      }}>
        <div>
          Mostrando {activities.length} di {totalItems} attività
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={() => changePage(page - 1)} 
            disabled={page === 1}
            style={{
              padding: '4px 8px',
              border: '1px solid #eee',
              borderRadius: 4,
              background: page === 1 ? '#f5f5f5' : '#fff',
              cursor: page === 1 ? 'default' : 'pointer'
            }}
          >
            Precedente
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Logica per mostrare le pagine intorno alla pagina corrente
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            
            return (
              <button 
                key={pageNum}
                onClick={() => changePage(pageNum)}
                style={{
                  padding: '4px 10px',
                  border: '1px solid #eee',
                  borderRadius: 4,
                  background: page === pageNum ? 'var(--primary)' : '#fff',
                  color: page === pageNum ? '#fff' : '#333',
                  cursor: 'pointer'
                }}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button 
            onClick={() => changePage(page + 1)} 
            disabled={page === totalPages}
            style={{
              padding: '4px 8px',
              border: '1px solid #eee',
              borderRadius: 4,
              background: page === totalPages ? '#f5f5f5' : '#fff',
              cursor: page === totalPages ? 'default' : 'pointer'
            }}
          >
            Successiva
          </button>
        </div>
      </div>
    );
  };
  
  // Componente per il messaggio di caricamento
  const LoadingState = () => (
    <div style={{ 
      padding: 16, 
      textAlign: 'center',
      color: '#666'
    }}>
      Caricamento attività...
    </div>
  );
  
  // Componente per il messaggio di errore
  const ErrorState = () => (
    <div style={{ 
      padding: 16, 
      textAlign: 'center',
      color: 'red'
    }}>
      {error}
      <button 
        onClick={loadActivities}
        style={{
          display: 'block',
          margin: '10px auto',
          padding: '6px 12px',
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer'
        }}
      >
        Riprova
      </button>
    </div>
  );
  
  // Componente per il messaggio di nessun dato
  const EmptyState = () => (
    <div style={{ 
      padding: 16, 
      textAlign: 'center',
      color: '#666'
    }}>
      Nessuna attività trovata.
    </div>
  );
  
  if (loading) return <LoadingState />;
  if (error) return <ErrorState />;
  if (activities.length === 0) return <EmptyState />;

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <th style={{ textAlign: 'left', padding: 8 }}>Data</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Fascia Oraria</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Autista</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Veicolo</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Tipo</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Stato</th>
          </tr>
        </thead>
        <tbody>
          {activities.map(activity => (
            <tr 
              key={activity.id} 
              style={{ 
                borderBottom: '1px solid #f3f3f3',
                cursor: onActivityClick ? 'pointer' : 'default'
              }}
              onClick={() => onActivityClick && onActivityClick(activity)}
            >
              <td style={{ padding: 8 }}>
                {new Date(activity.data_inizio).toLocaleDateString('it-IT')}
              </td>
              <td style={{ padding: 8 }}>
                {activity.time_slot === 'morning' ? 'Mattina' : 
                 activity.time_slot === 'afternoon' ? 'Pomeriggio' : 
                 activity.time_slot === 'full_day' ? 'Giornata Intera' : 
                 activity.time_slot}
              </td>
              <td style={{ padding: 8 }}>
                {activity.driver?.nome} {activity.driver?.cognome}
              </td>
              <td style={{ padding: 8 }}>
                {activity.vehicle?.targa}
              </td>
              <td style={{ padding: 8 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px' 
                }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '3px', 
                    backgroundColor: activity.activityType?.colore || '#007aff' 
                  }}></div>
                  {activity.activityType?.nome}
                </div>
              </td>
              <td style={{ padding: 8 }}>
                <span style={{ 
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  backgroundColor: 
                    activity.status === 'Pianificata' ? '#007aff' : 
                    activity.status === 'In Corso' ? '#ff9500' :
                    activity.status === 'Completata' ? '#4cd964' :
                    activity.status === 'Annullata' ? '#ff3b30' : '#8e8e93',
                  color: '#fff'
                }}>
                  {activity.status === 'Pianificata' ? 'Pianificata' : 
                   activity.status === 'In Corso' ? 'In Corso' :
                   activity.status === 'Completata' ? 'Completata' :
                   activity.status === 'Annullata' ? 'Annullata' : 
                   activity.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <Pagination />
    </div>
  );
}