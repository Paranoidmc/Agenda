"use client";
import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';

export function useVehicleTracking(activityId, vehicles = [], refreshInterval = 30000) {
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

      // Chiamata API per ottenere le posizioni multiple
      try {
        const response = await api.post('/vehicles/positions', {
          vehicle_ids: vehicleIds
        });
        
        // Mappa i dati dell'API al formato atteso dal componente mappa
        const positions = response.data.map(position => ({
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
        }));
        
        setVehiclePositions(positions);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Errore nel recupero posizioni veicoli:', error);
        
        // Fallback alla simulazione se l'API non è disponibile
        const positions = await Promise.all(
          vehicleIds.map(async (vehicleId) => {
            const vehicle = vehicles.find(v => v.id === vehicleId);
            return simulateVehiclePosition(vehicle, vehicleId);
          })
        );
        
        const validPositions = positions.filter(Boolean);
        setVehiclePositions(validPositions);
        setLastUpdate(new Date());
      }
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