"use client";
import { useEffect, useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

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
          { MapContainer, TileLayer, Marker, Popup }
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
    if (mapInstanceRef.current && leafletComponents && vehicles.length > 0) {
      try {
        const bounds = leafletComponents.L.latLngBounds(vehicles.map(v => [v.lat, v.lng]));
        mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
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
        whenCreated={(map) => {
          mapInstanceRef.current = map;
          
          // Auto-fit ai veicoli se presenti
          if (vehicles.length > 0) {
            try {
              const bounds = L.latLngBounds(vehicles.map(v => [v.lat, v.lng]));
              map.fitBounds(bounds, { padding: [20, 20] });
            } catch (error) {
              console.error('Errore nel fit bounds iniziale:', error);
            }
          }
        }}
      >
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
            <Marker
              key={vehicle.id || index}
              position={[vehicle.lat, vehicle.lng]}
              icon={truckIcon}
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
                  <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>
                    {vehicle.plate || vehicle.targa || `Veicolo ${vehicle.id || index + 1}`}
                  </h4>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    <div><strong>Modello:</strong> {vehicle.model || vehicle.modello || 'N/D'}</div>
                    <div><strong>Marca:</strong> {vehicle.brand || vehicle.marca || 'N/D'}</div>
                    {vehicle.driver && (
                      <div><strong>Autista:</strong> {vehicle.driver.name || vehicle.driver.nome} {vehicle.driver.surname || vehicle.driver.cognome}</div>
                    )}
                    {vehicle.speed !== undefined && (
                      <div><strong>Velocità:</strong> {vehicle.speed} km/h</div>
                    )}
                    {vehicle.status && (
                      <div><strong>Stato:</strong> {vehicle.status}</div>
                    )}
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                      <div>Lat: {vehicle.lat.toFixed(6)}</div>
                      <div>Lng: {vehicle.lng.toFixed(6)}</div>
                      {vehicle.lastUpdate && (
                        <div>Aggiornato: {new Date(vehicle.lastUpdate).toLocaleTimeString('it-IT')}</div>
                      )}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        }).filter(Boolean)}
      </MapContainer>
    </div>
  );
}