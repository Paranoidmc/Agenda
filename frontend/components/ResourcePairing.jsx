import React, { useMemo } from 'react';
import SearchableSelect from './SearchableSelect';

const ResourcePairing = ({ value = [], onChange, drivers = [], vehicles = [] }) => {
  // Assicuriamoci che value sia sempre un array
  const currentValue = Array.isArray(value) ? value : [];
  
  // Ordina i veicoli per targa in ordine alfabetico
  const sortedVehicles = useMemo(() => {
    return [...vehicles].sort((a, b) => {
      // Estrai la targa (può essere in targa o plate)
      const targaA = (a.targa || a.plate || '').toUpperCase().trim();
      const targaB = (b.targa || b.plate || '').toUpperCase().trim();
      // Ordina alfabeticamente per targa
      return targaA.localeCompare(targaB);
    });
  }, [vehicles]);

  const handleAddPair = () => {
    const newValue = [...currentValue, { vehicle_id: '', driver_ids: [] }];
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

  const handleDriverChange = (index, event) => {
    const selectedDriverIds = Array.from(event.target.selectedOptions, option => option.value);
    handlePairChange(index, 'driver_ids', selectedDriverIds);
  };

  return (
    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
              Autisti (tieni premuto Ctrl/Cmd per selezione multipla):
            </label>
            <select
              multiple
              value={pair.driver_ids || []}
              onChange={(e) => handleDriverChange(index, e)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #d1d5db', 
                height: '80px',
                backgroundColor: 'white',
                overflowY: 'auto'
              }}
            >
              {drivers.map(driver => {
                // Usa la stessa logica che funziona in altre parti dell'app (agenda-autisti, pianificazione):
                // Prima prova con nome/cognome (campi italiani), poi fallback a name/surname
                const nome = (driver.nome || driver.name || '').trim();
                const cognome = (driver.cognome || driver.surname || '').trim();
                // Se nome e cognome sono uguali, usa solo uno (evita duplicati)
                // Altrimenti costruisci il nome completo
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
                return (
                  <option key={driver.id} value={driver.id}>
                    {displayName}
                  </option>
                );
              })}
            </select>
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