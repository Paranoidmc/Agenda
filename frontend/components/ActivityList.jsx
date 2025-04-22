"use client";
import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function ActivityList({ siteId, clientId, driverId, vehicleId, onActivityClick }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let endpoint = '/activities';
        
        // Se è specificato un ID, carica le attività specifiche
        if (siteId) {
          // Se è specificato un ID del cantiere, carica solo le attività di quel cantiere
          console.log("Caricamento attività per il cantiere ID:", siteId);
          endpoint = `/sites/${siteId}/activities`;
        } else if (clientId) {
          console.log("Caricamento attività per il cliente ID:", clientId);
          endpoint = `/clients/${clientId}/activities`;
        } else if (driverId) {
          endpoint = `/drivers/${driverId}/activities`;
        } else if (vehicleId) {
          endpoint = `/vehicles/${vehicleId}/activities`;
        }
        
        console.log("Endpoint attività:", endpoint);
        const response = await api.get(endpoint);
        console.log("Attività caricate:", response.data.length);
        setActivities(response.data);
      } catch (err) {
        console.error("Errore nel caricamento delle attività:", err);
        setError("Errore nel caricamento delle attività");
      } finally {
        setLoading(false);
      }
    };
    
    loadActivities();
  }, [siteId, clientId, driverId, vehicleId]);

  if (loading) return <div>Caricamento attività...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (activities.length === 0) return <div>Nessuna attività trovata.</div>;

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
                cursor: 'pointer'
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
                    activity.stato === 'planned' ? '#007aff' : 
                    activity.stato === 'in_progress' ? '#ff9500' :
                    activity.stato === 'completed' ? '#4cd964' :
                    activity.stato === 'cancelled' ? '#ff3b30' : '#8e8e93',
                  color: '#fff'
                }}>
                  {activity.stato === 'planned' ? 'Pianificata' : 
                   activity.stato === 'in_progress' ? 'In Corso' :
                   activity.stato === 'completed' ? 'Completata' :
                   activity.stato === 'cancelled' ? 'Annullata' : 
                   activity.stato}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}