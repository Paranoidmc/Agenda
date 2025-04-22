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
      
      try {
        const response = await api.get(`/clients/${clientId}/sites`);
        setSites(response.data);
      } catch (err) {
        console.error("Errore nel caricamento delle sedi:", err);
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