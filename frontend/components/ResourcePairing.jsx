import React from 'react';

const ResourcePairing = ({ value = [], onChange, drivers = [], vehicles = [] }) => {
  // Assicuriamoci che value sia sempre un array
  const currentValue = Array.isArray(value) ? value : [];

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
            <select
              value={pair.vehicle_id || ''}
              onChange={(e) => handlePairChange(index, 'vehicle_id', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #d1d5db',
                backgroundColor: 'white'
              }}
            >
              <option value="">Seleziona Veicolo</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.targa} ({vehicle.modello})
                </option>
              ))}
            </select>
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
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.nome} {driver.cognome}
                </option>
              ))}
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