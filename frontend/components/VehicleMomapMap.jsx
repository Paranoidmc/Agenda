"use client";
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import api from '../lib/api';
import { FiMapPin, FiRefreshCw } from 'react-icons/fi';

// Carica VehicleMap solo lato client (usa Leaflet) con gestione errori
const VehicleMap = dynamic(() => import('./VehicleMap'), { 
  ssr: false,
  loading: () => <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>Caricamento mappa...</div>,
  onError: (error) => {
    console.error('Errore caricamento VehicleMap:', error);
  }
});

export default function VehicleMomapMap({ vehicleId, imei }) {
  const [vehiclePosition, setVehiclePosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchVehiclePosition = useCallback(async () => {
    if (!imei || imei.length < 5) {
      setError('IMEI non valido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/momap/device-data/${imei}`);
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        const position = {
          id: vehicleId,
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude),
          plate: data.imei || `IMEI ${imei}`,
          speed: parseFloat(data.speed || 0),
          heading: parseFloat(data.direction || 0),
          lastUpdate: data.timestamp ? new Date(data.timestamp) : new Date(),
          status: data.deviceStatus || data.status,
          momap: true
        };

        setVehiclePosition(position);
        setLastUpdate(new Date());
      } else {
        setError('Dati GPS non disponibili');
      }
    } catch (err) {
      console.error('Errore recupero posizione MOMAP:', err);
      setError(err.response?.data?.error || 'Errore nel recupero della posizione GPS');
    } finally {
      setLoading(false);
    }
  }, [imei, vehicleId]);

  // Carica posizione iniziale
  useEffect(() => {
    if (imei && imei.length >= 5) {
      fetchVehiclePosition();
    }
  }, [imei, fetchVehiclePosition]);

  // Auto-refresh ogni 30 secondi se abilitato
  useEffect(() => {
    if (!autoRefresh || !imei || imei.length < 5) return;

    const interval = setInterval(() => {
      fetchVehiclePosition();
    }, 30000); // 30 secondi

    return () => clearInterval(interval);
  }, [autoRefresh, imei, fetchVehiclePosition]);

  if (!imei || imei.length < 5) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        border: '1px solid #e5e7eb',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <FiMapPin style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }} />
        <div style={{ fontSize: 14 }}>
          Nessun IMEI configurato per questo veicolo.<br />
          Configura l'IMEI nella sezione "Generale" per attivare il tracking GPS.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 24,
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <FiMapPin style={{ fontSize: 20, color: '#3b82f6' }} />
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
            Posizione GPS (MOMAP)
          </h3>
          {vehiclePosition && (
            <span style={{
              fontSize: 12,
              padding: '4px 8px',
              background: '#e0f2fe',
              color: '#0369a1',
              borderRadius: 4,
              fontWeight: 500
            }}>
              📡 LIVE
            </span>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            color: '#6b7280',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchVehiclePosition}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 500,
              opacity: loading ? 0.6 : 1
            }}
          >
            <FiRefreshCw style={{
              animation: loading ? 'spin 1s linear infinite' : 'none'
            }} />
            Aggiorna
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: 12,
          marginBottom: 20,
          color: '#dc2626',
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      {vehiclePosition && vehiclePosition.lat && vehiclePosition.lng ? (
        <div style={{
          height: 400,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }}>
          {typeof window !== 'undefined' && (
            <VehicleMap
              vehicles={[vehiclePosition]}
              height="400px"
            />
          )}
          {lastUpdate && (
            <div style={{
              marginTop: 12,
              fontSize: 12,
              color: '#6b7280',
              textAlign: 'right'
            }}>
              Ultimo aggiornamento: {lastUpdate.toLocaleTimeString('it-IT')}
            </div>
          )}
        </div>
      ) : !loading && (
        <div style={{
          height: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          borderRadius: 8,
          color: '#6b7280'
        }}>
          {loading ? 'Caricamento posizione...' : 'Nessuna posizione disponibile'}
        </div>
      )}

      {loading && !vehiclePosition && (
        <div style={{
          height: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          borderRadius: 8
        }}>
          <div style={{
            width: 40,
            height: 40,
            border: '4px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      )}
    </div>
  );
}

