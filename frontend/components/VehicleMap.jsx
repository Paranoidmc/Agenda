"use client";
import { useEffect, useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

// Componente per marker animato che si muove fluidamente tra posizioni GPS
function AnimatedMarker({ vehicle, leafletComponents, onVehicleClick }) {
  const { useMap, Marker, Popup } = leafletComponents || {};
  const map = useMap ? useMap() : null;
  const markerRef = useRef(null);
  const [currentPosition, setCurrentPosition] = useState([vehicle.lat, vehicle.lng]);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef(null);
  
  // Aggiorna immediatamente il marker alle coordinate GPS reali
  useEffect(() => {
    if (!map || !markerRef.current) return;
    
    const newPos = [vehicle.lat, vehicle.lng];
    const oldPos = currentPosition;
    
    // Verifica se la posizione è cambiata
    const latDiff = Math.abs(newPos[0] - oldPos[0]);
    const lngDiff = Math.abs(newPos[1] - oldPos[1]);
    
    if (latDiff > 0.00001 || lngDiff > 0.00001) {
      console.log(`📍 GPS Update for ${vehicle.plate}: [${newPos[0].toFixed(6)}, ${newPos[1].toFixed(6)}] (was [${oldPos[0].toFixed(6)}, ${oldPos[1].toFixed(6)}])`);
      
      // Cancella eventuali animazioni precedenti
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      
      // Aggiorna immediatamente alle coordinate GPS reali
      setCurrentPosition(newPos);
      setIsAnimating(false);
      
      // Aggiorna posizione marker immediatamente
      if (markerRef.current) {
        markerRef.current.setLatLng(newPos);
      }
      
      console.log(`✅ GPS position updated for ${vehicle.plate}`);
    }
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [vehicle.lat, vehicle.lng, map]);
  
  // Determina il colore del marker in base al tipo di dati e velocità
  const speed = vehicle.speed || 0;
  const isMoving = speed > 5;
  const isMomapVehicle = vehicle.momap === true;
  
  // Colori: Blu per MOMAP GPS reale, Verde/Rosso per simulati
  let markerColor;
  if (isMomapVehicle) {
    markerColor = '#3b82f6'; // Blu per dati GPS reali MOMAP
  } else {
    markerColor = isMoving ? '#22c55e' : '#ef4444'; // Verde/Rosso per dati simulati
  }
  
  // Crea icona dinamica
  const dynamicIcon = new leafletComponents.L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${markerColor}" width="32" height="32">
        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        ${isAnimating ? '<circle cx="20" cy="6" r="3" fill="#f59e0b" opacity="0.9"><animate attributeName="r" values="2;4;2" dur="1s" repeatCount="indefinite"/></circle>' : ''}
        ${isMoving && !isAnimating ? '<circle cx="20" cy="6" r="3" fill="#fbbf24" opacity="0.8"/>' : ''}
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
  
  return (
    <Marker
      position={currentPosition}
      icon={dynamicIcon}
      ref={markerRef}
      eventHandlers={{
        click: () => {
          if (onVehicleClick) {
            onVehicleClick(vehicle);
          }
        }
      }}
    >
      <Popup>
        <div style={{ minWidth: '200px' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
            🚛 {vehicle.plate || 'N/D'}
            {isMomapVehicle && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#3b82f6' }}>📡 GPS LIVE</span>}
            {!isMomapVehicle && isMoving && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#22c55e' }}>🟢 SIMULATO</span>}
            {!isMomapVehicle && !isMoving && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#ef4444' }}>🔴 SIMULATO</span>}
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
            <div><strong>Modello:</strong> {vehicle.model || 'N/D'}</div>
            <div><strong>Marca:</strong> {vehicle.brand || 'N/D'}</div>
            {vehicle.driver && (
              <div><strong>Autista:</strong> {vehicle.driver.nome} {vehicle.driver.cognome}</div>
            )}
            <div><strong>Velocità:</strong> {speed} km/h</div>
            {vehicle.heading && (
              <div><strong>Direzione:</strong> {vehicle.heading}°</div>
            )}
            <div><strong>Coordinate:</strong> {currentPosition[0].toFixed(6)}, {currentPosition[1].toFixed(6)}</div>
            {vehicle.lastUpdate && (
              <div><strong>Ultimo aggiornamento:</strong> {new Date(vehicle.lastUpdate).toLocaleString('it-IT')}</div>
            )}
            <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: isMomapVehicle ? '#e0f2fe' : '#fef3c7', borderRadius: '4px', fontSize: '12px', border: `1px solid ${isMomapVehicle ? '#3b82f6' : '#f59e0b'}` }}>
              {isMomapVehicle ? (
                <div>
                  <div style={{ fontWeight: 'bold', color: '#3b82f6' }}>📡 Dati GPS Reali MOMAP</div>
                  <div style={{ marginTop: '2px', fontSize: '11px' }}>Posizione aggiornata in tempo reale</div>
                  {vehicle.lastUpdate && (
                    <div style={{ fontSize: '11px', color: '#666' }}>Ultimo GPS: {new Date(vehicle.lastUpdate).toLocaleTimeString('it-IT')}</div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 'bold', color: '#f59e0b' }}>⚠️ Dati Simulati</div>
                  <div style={{ marginTop: '2px', fontSize: '11px' }}>Posizione non collegata a GPS reale</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>Configurare IMEI per dati live</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Componente interno per gestire la centratura della mappa
function MapController({ vehicles, leafletComponents, mapInstanceRef }) {
  const { useMap } = leafletComponents || {};
  const map = useMap ? useMap() : null;
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const lastPositionsRef = useRef({});
  const simulationRef = useRef({});
  const markersRef = useRef({});
  
  useEffect(() => {
    if (map && vehicles.length > 0) {
      mapInstanceRef.current = map;
      
      try {
        const validVehicles = vehicles.filter(v => v.lat && v.lng && !isNaN(v.lat) && !isNaN(v.lng));
        
        if (validVehicles.length > 0) {
          // Prima volta: centra su tutti i veicoli
          if (isFirstLoad) {
            console.log('🎯 MapController: Initial centering on', validVehicles.length, 'vehicles');
            const bounds = leafletComponents.L.latLngBounds(validVehicles.map(v => [v.lat, v.lng]));
            map.fitBounds(bounds, { padding: [20, 20] });
            setIsFirstLoad(false);
          } else {
            // Aggiornamenti successivi: centratura intelligente
            console.log('🔍 MapController: Checking movement for', validVehicles.length, 'vehicles');
            
            validVehicles.forEach(vehicle => {
              const lastPos = lastPositionsRef.current[vehicle.id];
              const currentPos = { lat: vehicle.lat, lng: vehicle.lng };
              
              console.log(`🚛 Vehicle ${vehicle.plate}:`, {
                lastPos,
                currentPos,
                speed: vehicle.speed,
                lastUpdate: vehicle.lastUpdate,
                hasLastPos: !!lastPos
              });
              
              // Logica di movimento migliorata
              const speed = vehicle.speed || 0;
              const isHighSpeed = speed > 30; // Soglia ridotta per test
              
              if (lastPos) {
                const latDiff = Math.abs(lastPos.lat - currentPos.lat);
                const lngDiff = Math.abs(lastPos.lng - currentPos.lng);
                const hasMoved = latDiff > 0.00001 || lngDiff > 0.00001;
                
                console.log(`📊 ANALYSIS ${vehicle.plate}:`, {
                  speed: speed,
                  isHighSpeed: isHighSpeed,
                  latDiff: latDiff.toFixed(8),
                  lngDiff: lngDiff.toFixed(8),
                  hasMoved: hasMoved,
                  lastUpdate: vehicle.lastUpdate
                });
                
                // FORZA movimento se alta velocità O coordinate cambiate
                if (isHighSpeed || hasMoved) {
                  if (isHighSpeed) {
                    console.log('🚀🚀 FORCING MOVEMENT - High speed:', speed, 'km/h');
                  }
                  if (hasMoved) {
                    console.log('📍 COORDINATES CHANGED - Following vehicle');
                  }
                  
                  // SEMPRE centra se alta velocità
                  map.panTo([currentPos.lat, currentPos.lng], {
                    animate: true,
                    duration: 0.8,
                    easeLinearity: 0.3
                  });
                  
                  // Aggiungi un piccolo zoom per enfatizzare
                  setTimeout(() => {
                    if (map.getZoom() < 16) {
                      map.setZoom(16);
                    }
                  }, 100);
                  
                } else {
                  console.log('⏸️ Vehicle stopped or low speed:', speed, 'km/h');
                }
              } else {
                console.log('🆕 First position for vehicle', vehicle.plate);
              }
            });
          }
          
          // Salva le posizioni correnti per il prossimo confronto
          const newPositions = {};
          validVehicles.forEach(v => {
            newPositions[v.id] = { lat: v.lat, lng: v.lng };
          });
          lastPositionsRef.current = newPositions;
        }
      } catch (error) {
        console.error('Errore MapController:', error);
      }
    }
  }, [map, vehicles, leafletComponents, mapInstanceRef, isFirstLoad]);
  
  // Funzione per determinare se un veicolo si è mosso significativamente
  const hasMovedSignificantly = (lastPos, currentPos, threshold = 0.00001) => {
    const latDiff = Math.abs(lastPos.lat - currentPos.lat);
    const lngDiff = Math.abs(lastPos.lng - currentPos.lng);
    return latDiff > threshold || lngDiff > threshold;
  };
  
  return null; // Componente invisibile
}

export default function VehicleMap({ 
  vehicles = [], 
  height = '400px',
  center = [41.9028, 12.4964], // Roma come default
  onVehicleClick = null 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [leafletComponents, setLeafletComponents] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    // Carica dinamicamente Leaflet e React-Leaflet
    const loadLeaflet = async () => {
      try {
        const [
          { default: L },
          { MapContainer, TileLayer, Marker, Popup, useMap }
        ] = await Promise.all([
          import('leaflet'),
          import('react-leaflet')
        ]);

        // Fix per le icone di Leaflet in Next.js
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Icona personalizzata per i camion
        const truckIcon = new L.Icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2563eb" width="32" height="32">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          `),
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });

        setLeafletComponents({
          L,
          MapContainer,
          TileLayer,
          Marker,
          Popup,
          useMap,
          truckIcon
        });
        setIsLoaded(true);
      } catch (error) {
        console.error('Errore nel caricamento di Leaflet:', error);
      }
    };

    loadLeaflet();
  }, []);

  // Aggiorna la mappa quando cambiano i veicoli
  useEffect(() => {
    console.log('🗺️ VehicleMap useEffect triggered:', {
      hasMapInstance: !!mapInstanceRef.current,
      hasLeafletComponents: !!leafletComponents,
      vehiclesCount: vehicles.length,
      vehicles: vehicles.map(v => ({ 
        id: v?.id || 'unknown', 
        plate: v?.plate || 'N/D', 
        lat: v?.lat || 0, 
        lng: v?.lng || 0 
      }))
    });
    
    // Se abbiamo veicoli ma la mappa non è ancora pronta, proviamo con un retry
    if (!mapInstanceRef.current && vehicles.length > 0) {
      console.log('🔄 Map not ready yet, will retry in 500ms...');
      const retryTimer = setTimeout(() => {
        if (mapInstanceRef.current && leafletComponents) {
          console.log('🔄 Retry successful, fitting bounds now');
          const validVehicles = vehicles.filter(v => v.lat && v.lng && !isNaN(v.lat) && !isNaN(v.lng));
          if (validVehicles.length > 0) {
            try {
              const bounds = leafletComponents.L.latLngBounds(validVehicles.map(v => [v.lat, v.lng]));
              console.log('🎯 Retry fitting bounds:', bounds.toBBoxString());
              mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
            } catch (error) {
              console.error('Errore nel retry fit bounds:', error);
            }
          }
        }
      }, 500);
      
      return () => clearTimeout(retryTimer);
    }
    
    if (mapInstanceRef.current && leafletComponents && vehicles.length > 0) {
      try {
        const validVehicles = vehicles.filter(v => v.lat && v.lng && !isNaN(v.lat) && !isNaN(v.lng));
        console.log('🎯 Valid vehicles for bounds:', validVehicles.length, 'out of', vehicles.length);
        
        if (validVehicles.length > 0) {
          const bounds = leafletComponents.L.latLngBounds(validVehicles.map(v => [v.lat, v.lng]));
          console.log('🎯 Fitting bounds to vehicles:', bounds.toBBoxString());
          mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
        } else {
          console.warn('⚠️ No vehicles with valid coordinates found!');
        }
      } catch (error) {
        console.error('Errore nell\'aggiornamento bounds mappa:', error);
      }
    }
  }, [vehicles, leafletComponents]);

  // Mostra loading mentre carica
  if (!isLoaded || !leafletComponents) {
    return (
      <div 
        style={{ 
          height, 
          backgroundColor: '#f5f5f5', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px solid #e5e5ea',
          borderRadius: '8px'
        }}
      >
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🗺️</div>
          <div>Caricamento mappa...</div>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, truckIcon, L } = leafletComponents;

  return (
    <div style={{ height, border: '1px solid #e5e5ea', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <MapController vehicles={vehicles} leafletComponents={leafletComponents} mapInstanceRef={mapInstanceRef} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {vehicles.map((vehicle, index) => {
          // Verifica che le coordinate siano valide
          if (!vehicle.lat || !vehicle.lng || isNaN(vehicle.lat) || isNaN(vehicle.lng)) {
            console.warn('Coordinate non valide per veicolo:', vehicle);
            return null;
          }
          
          return (
            <AnimatedMarker
              key={vehicle.id || index}
              vehicle={vehicle}
              leafletComponents={leafletComponents}
              onVehicleClick={onVehicleClick}
            />
          );
        }).filter(Boolean)}
      </MapContainer>
    </div>
  );
}