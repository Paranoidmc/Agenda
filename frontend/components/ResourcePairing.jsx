import React, { useMemo, useState } from 'react';
import SearchableSelect from './SearchableSelect';

const ResourcePairing = ({ value = [], onChange, drivers = [], vehicles = [] }) => {
  // Assicuriamoci che value sia sempre un array
  const currentValue = Array.isArray(value) ? value : [];
  const [showNoPlate, setShowNoPlate] = useState(false);

  // Ordina i veicoli per targa in ordine alfabetico
  const sortedVehicles = useMemo(() => {
    let list = [...vehicles];

    // Filtra veicoli senza targa se showNoPlate è false
    if (!showNoPlate) {
      list = list.filter(v => {
        const targa = (v.targa || v.plate || '').trim();
        // Considera valido se ha una targa non vuota
        return targa.length > 0;
      });
    }

    return list.sort((a, b) => {
      // Estrai la targa (può essere in targa o plate)
      const targaA = (a.targa || a.plate || '').toUpperCase().trim();
      const targaB = (b.targa || b.plate || '').toUpperCase().trim();
      // Ordina alfabeticamente per targa
      return targaA.localeCompare(targaB);
    });
  }, [vehicles, showNoPlate]);

  // Ordina gli autisti per nome
  const sortedDrivers = useMemo(() => {
    return [...drivers].sort((a, b) => {
      const nomeA = (a.nome || a.name || a.first_name || '').toUpperCase().trim();
      const nomeB = (b.nome || b.name || b.first_name || '').toUpperCase().trim();
      return nomeA.localeCompare(nomeB);
    });
  }, [drivers]);

  const handleAddPair = () => {
    // Inizializza con driver_id e times vuoti
    const newValue = [...currentValue, { vehicle_id: '', driver_id: '', start_time: '', end_time: '' }];
    onChange(newValue);
  };

  const handleRemovePair = (index) => {
    const newValue = [...currentValue];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const handlePairChange = (index, field, selectedValue) => {
    const newValue = [...currentValue];
    newValue[index] = { ...newValue[index], [field]: selectedValue };
    onChange(newValue);
  };

  return (
    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#666' }}>
          <input
            type="checkbox"
            checked={showNoPlate}
            onChange={e => setShowNoPlate(e.target.checked)}
          />
          Mostra anche mezzi senza targa
        </label>
      </div>

      {currentValue.map((pair, index) => (
        <div key={index} style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>
              Veicolo:
            </label>
            <SearchableSelect
              name={`vehicle_${index}`}
              value={pair.vehicle_id || ''}
              options={sortedVehicles.map(vehicle => {
                const targa = vehicle.targa || vehicle.plate || '';
                const marca = vehicle.marca || vehicle.brand || '';
                const modello = vehicle.modello || vehicle.model || '';
                // Mostra sempre la targa per prima, poi marca e modello se disponibili
                let label = targa;
                if (!targa) label = '(No Targa)';
                if (marca || modello) {
                  label += ` - ${marca} ${modello}`.trim();
                }
                return {
                  value: vehicle.id,
                  label: label
                };
              })}
              placeholder="Cerca o seleziona veicolo..."
              onChange={(e) => handlePairChange(index, 'vehicle_id', e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>
              Autista:
            </label>
            <SearchableSelect
              name={`driver_${index}`}
              value={pair.driver_id || ''}
              options={sortedDrivers.map(driver => {
                const nome = (driver.nome || driver.name || '').trim();
                const cognome = (driver.cognome || driver.surname || '').trim();
                let displayName;
                if (nome && cognome && nome !== cognome) {
                  displayName = `${nome} ${cognome}`.trim();
                } else if (nome) {
                  displayName = nome;
                } else if (cognome) {
                  displayName = cognome;
                } else {
                  displayName = 'N/D';
                }
                return {
                  value: driver.id,
                  label: displayName
                };
              })}
              placeholder="Cerca o seleziona autista..."
              onChange={(e) => handlePairChange(index, 'driver_id', e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666' }}>Inizio Utilizzo (opzionale)</label>
              <input
                type="datetime-local"
                value={pair.start_time || ''}
                onChange={e => handlePairChange(index, 'start_time', e.target.value)}
                style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid #ddd', fontSize: '12px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666' }}>Fine Utilizzo (opzionale)</label>
              <input
                type="datetime-local"
                value={pair.end_time || ''}
                onChange={e => handlePairChange(index, 'end_time', e.target.value)}
                style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid #ddd', fontSize: '12px' }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleRemovePair(index)}
            style={{
              padding: '6px 12px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Rimuovi Risorsa
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddPair}
        style={{
          width: '100%',
          marginTop: '8px',
          padding: '10px 12px',
          background: '#22c55e',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '500'
        }}
      >
        + Aggiungi Risorsa
      </button>
    </div>
  );
};

export default ResourcePairing;