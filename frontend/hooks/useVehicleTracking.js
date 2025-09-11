"use client";
import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';

export function useVehicleTracking(activityId, vehicles = [], refreshInterval = 10000) {
  const [vehiclePositions, setVehiclePositions] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  // Funzione per ottenere le posizioni dei veicoli
  const fetchVehiclePositions = async () => {
    if (!activityId || !vehicles.length) {
      setVehiclePositions([]);
      return;
    }

    try {
      const vehicleIds = vehicles.map(v => v.id).filter(Boolean);
      if (vehicleIds.length === 0) return;

      // Se almeno un veicolo ha IMEI, fetch MOMAP in parallelo
      const momapVehicles = vehicles.filter(v => v.imei && v.imei.length > 5);
      const classicVehicles = vehicles.filter(v => !v.imei || v.imei.length <= 5);
      let positions = [];
      // Fetch MOMAP - TEMPORANEAMENTE DISABILITATO per evitare errori 500
      // TODO: Riabilitare quando credenziali MOMAP saranno configurate correttamente
      if (false && momapVehicles.length > 0) {
        console.info('🗺️ MOMAP geolocalizzazione temporaneamente disabilitata. Configurare credenziali MOMAP per riabilitare.');
        const momapResults = await Promise.all(momapVehicles.map(async v => {
          try {
            const res = await api.get(`/momap/device-data/${v.imei}`);
            if (res.data.success && res.data.data) {
              const d = res.data.data;
              return {
                id: v.id,
                lat: parseFloat(d.latitude),
                lng: parseFloat(d.longitude),
                plate: v.plate,
                model: v.model,
                brand: v.brand,
                driver: v.driver,
                lastUpdate: d.timestamp ? new Date(d.timestamp) : new Date(),
                status: d.deviceStatus || d.status,
                speed: parseFloat(d.speed || 0),
                heading: parseFloat(d.direction || 0),
                momap: true
              };
            }
          } catch (error) {
            // Gestione silenziosa degli errori MOMAP per evitare spam nella console
            if (error.response?.status === 500) {
              console.warn(`⚠️ API MOMAP non disponibile per veicolo ${v.id} (IMEI: ${v.imei}). Possibili cause: credenziali scadute, IMEI non valido, servizio temporaneamente non disponibile.`);
            } else if (error.response?.status === 401) {
              console.warn(`🔐 Token MOMAP scaduto per veicolo ${v.id}. Verifica configurazione credenziali MOMAP.`);
            } else {
              console.warn(`🗺️ Errore geolocalizzazione MOMAP per veicolo ${v.id}:`, error.message);
            }
          }
          return null;
        }));
        positions.push(...momapResults.filter(Boolean));
      }
      // Fetch classici
      if (classicVehicles.length > 0) {
        try {
          const response = await api.post('/vehicles/positions', {
            vehicle_ids: classicVehicles.map(v => v.id)
          });
          positions.push(...response.data.map(position => ({
            id: position.vehicle_id,
            lat: position.latitude,
            lng: position.longitude,
            plate: position.vehicle?.plate,
            model: position.vehicle?.model,
            brand: position.vehicle?.brand,
            driver: vehicles.find(v => v.id === position.vehicle_id)?.driver,
            lastUpdate: position.last_update,
            status: position.status,
            speed: position.speed,
            heading: position.heading,
            momap: false
          })));
        } catch (error) {
          console.error('Errore nel recupero posizioni veicoli:', error);
        }
      }
      console.log('🚛 MOMAP Positions found:', positions.length, 'at', new Date().toLocaleTimeString());
      positions.forEach((pos, idx) => {
        console.log(`🚛 Vehicle ${idx + 1} (${pos.plate}):`, {
          id: pos.id,
          lat: pos.lat,
          lng: pos.lng,
          speed: pos.speed,
          heading: pos.heading,
          lastUpdate: pos.lastUpdate,
          momap: pos.momap,
          hasValidCoords: !!(pos.lat && pos.lng && !isNaN(pos.lat) && !isNaN(pos.lng))
        });
      });
      
      if (positions.length > 0) {
        setVehiclePositions(positions);
        setLastUpdate(new Date());
        console.log('🗺️ VehiclePositions updated with', positions.length, 'vehicles');
        return;
      }
      // Fallback simulazione se nessuna posizione trovata
      console.warn('Nessuna posizione valida trovata, uso simulazione');
      // Fallback alla simulazione se l'API non è disponibile
      const simPositions = await Promise.all(
        vehicleIds.map(async (vehicleId) => {
          const vehicle = vehicles.find(v => v.id === vehicleId);
          return simulateVehiclePosition(vehicle, vehicleId);
        })
      );
      setVehiclePositions(simPositions.filter(Boolean));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Errore nel recupero posizioni veicoli:', error);
    }
  };

  // Simulazione posizioni veicoli (da rimuovere quando avremo le API reali)
  const simulateVehiclePosition = (vehicle, vehicleId) => {
    // Coordinate di esempio per diverse città italiane
    const locations = [
      { lat: 41.9028, lng: 12.4964, city: 'Roma' },
      { lat: 45.4642, lng: 9.1900, city: 'Milano' },
      { lat: 40.8518, lng: 14.2681, city: 'Napoli' },
      { lat: 45.4408, lng: 12.3155, city: 'Venezia' },
      { lat: 43.7696, lng: 11.2558, city: 'Firenze' },
    ];

    const baseLocation = locations[vehicleId % locations.length];
    
    // Aggiungi un po' di movimento casuale
    const randomOffset = () => (Math.random() - 0.5) * 0.01; // ~1km di raggio
    
    return {
      id: vehicleId,
      lat: baseLocation.lat + randomOffset(),
      lng: baseLocation.lng + randomOffset(),
      plate: vehicle?.plate || vehicle?.targa || `Veicolo ${vehicleId}`,
      model: vehicle?.model || vehicle?.modello,
      brand: vehicle?.brand || vehicle?.marca,
      driver: vehicle?.driver,
      lastUpdate: new Date().toISOString(),
      status: 'active', // active, idle, offline
      speed: Math.floor(Math.random() * 80), // km/h
      heading: Math.floor(Math.random() * 360), // gradi
    };
  };

  // Avvia il tracking
  const startTracking = () => {
    if (isTracking) return;
    
    setIsTracking(true);
    fetchVehiclePositions(); // Prima chiamata immediata
    
    intervalRef.current = setInterval(() => {
      fetchVehiclePositions();
    }, refreshInterval);
  };

  // Ferma il tracking
  const stopTracking = () => {
    setIsTracking(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Aggiorna manualmente le posizioni
  const refreshPositions = () => {
    fetchVehiclePositions();
  };

  // Cleanup quando il componente viene smontato
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Auto-start tracking quando ci sono veicoli
  useEffect(() => {
    if (vehicles.length > 0 && activityId) {
      startTracking();
    } else {
      stopTracking();
    }
  }, [vehicles.length, activityId]);

  return {
    vehiclePositions,
    isTracking,
    lastUpdate,
    startTracking,
    stopTracking,
    refreshPositions,
  };
}