"use client";
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Importa VehicleMap solo lato client
const VehicleMap = dynamic(() => import("../../components/VehicleMap"), {
  ssr: false,
  loading: () => <div>Caricamento mappa...</div>
});

export default function TestMapPage() {
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    // Simula alcuni veicoli per il test
    const testVehicles = [
      {
        id: 1,
        lat: 41.9028,
        lng: 12.4964,
        plate: "AB123CD",
        model: "Camion Test 1",
        brand: "Test Brand",
        speed: 45,
        status: "active",
        lastUpdate: new Date().toISOString(),
        driver: {
          name: "Mario",
          surname: "Rossi"
        }
      },
      {
        id: 2,
        lat: 45.4642,
        lng: 9.1900,
        plate: "EF456GH",
        model: "Camion Test 2",
        brand: "Test Brand",
        speed: 60,
        status: "active",
        lastUpdate: new Date().toISOString(),
        driver: {
          name: "Luigi",
          surname: "Verdi"
        }
      }
    ];

    setVehicles(testVehicles);
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Mappa Veicoli</h1>
      <p>Questa è una pagina di test per verificare che la mappa funzioni correttamente.</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Mappa con {vehicles.length} veicoli</h2>
        <VehicleMap
          vehicles={vehicles}
          height="500px"
          onVehicleClick={(vehicle) => {
            alert(`Cliccato veicolo: ${vehicle.plate}`);
          }}
        />
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Dati veicoli:</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
          {JSON.stringify(vehicles, null, 2)}
        </pre>
      </div>
    </div>
  );
}