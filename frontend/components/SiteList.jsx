"use client";
import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function SiteList({ clientId, onSiteClick }) {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSites = async () => {
      if (!clientId) {
        setSites([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      console.log("SiteList - Caricamento sedi per cliente:", clientId);
      
      try {
        console.log("SiteList - Iniziando chiamata API per il cliente:", clientId);
        
        // Aggiungiamo un parametro per evitare la cache
        const response = await api.get(`/clients/${clientId}/sites`, {
          params: { _t: new Date().getTime() },
          useCache: false
        });
        
        console.log("SiteList - Risposta API completa:", response);
        console.log("SiteList - Risposta API data:", response.data);
        
        if (Array.isArray(response.data)) {
          setSites(response.data);
        } else if (response.data && Array.isArray(response.data.data)) {
          setSites(response.data.data);
        } else {
          console.error("SiteList - Formato dati non valido:", response.data);
          setSites([]);
          setError("Formato dati non valido");
        }
      } catch (err) {
        console.error("SiteList - Errore nel caricamento delle sedi:", err);
        
        // Log dettagliato dell'errore
        if (err.response) {
          console.error("SiteList - Dettagli errore:", {
            status: err.response.status,
            data: err.response.data,
            headers: err.response.headers,
            config: err.config
          });
        } else if (err.request) {
          console.error("SiteList - Nessuna risposta ricevuta:", err.request);
        } else {
          console.error("SiteList - Errore di configurazione:", err.message);
        }
        
        setError("Errore nel caricamento delle sedi");
      } finally {
        setLoading(false);
      }
    };
    
    loadSites();
  }, [clientId]);

  if (loading) return <div>Caricamento cantieri...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (sites.length === 0) return <div>Nessun cantiere trovato per questo cliente.</div>;

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <th style={{ textAlign: 'left', padding: 8 }}>Nome</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Indirizzo</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Città</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Telefono</th>
          </tr>
        </thead>
        <tbody>
          {sites.map(site => (
            <tr 
              key={site.id} 
              style={{ 
                borderBottom: '1px solid #f3f3f3',
                cursor: 'pointer'
              }}
              onClick={() => onSiteClick && onSiteClick(site)}
            >
              <td style={{ padding: 8 }}>{site.nome}</td>
              <td style={{ padding: 8 }}>{site.indirizzo}</td>
              <td style={{ padding: 8 }}>{site.citta}</td>
              <td style={{ padding: 8 }}>{site.telefono}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
