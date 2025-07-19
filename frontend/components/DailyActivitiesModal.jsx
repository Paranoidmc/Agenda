"use client";
import React, { useState } from "react";

export default function DailyActivitiesModal({
  isOpen,
  onClose,
  date,
  onChangeDate,
  sites = [],
  drivers = [],
  vehicles = [],
  clients = [],
  activityTypes = [],
  activityStates = [],
  onSaveActivity,
  initialRows = [],
}) {
  // Normalizza tutte le props a array veri (anche se passate come Map)
  drivers = Array.isArray(drivers) ? drivers : (drivers && typeof drivers.values === 'function' ? Array.from(drivers.values()) : []);
  vehicles = Array.isArray(vehicles) ? vehicles : (vehicles && typeof vehicles.values === 'function' ? Array.from(vehicles.values()) : []);
  sites = Array.isArray(sites) ? sites : (sites && typeof sites.values === 'function' ? Array.from(sites.values()) : []);
  clients = Array.isArray(clients) ? clients : (clients && typeof clients.values === 'function' ? Array.from(clients.values()) : []);
  // DEBUG: Log dettagliati
  // DEBUG: Logga la prop clients ogni volta che la modale viene renderizzata
  // Stato delle righe della tabella (sia esistenti che nuove)
// Mapping robusto: supporta sia struttura piatta che nidificata (es. row.data)
function mapRow(r) {
  const data = r.data || {};
  return {
    ...r,
        descrizione: r.descrizione || data.descrizione || data.description || '',
    client_id: r.client_id || data.client_id || data.site?.client?.id || '',
    site_id: r.site_id || data.site_id || data.site?.id || '',
    driver_id: r.driver_id || data.driver_id || data.driver?.id || '',
    vehicle_id: r.vehicle_id || data.vehicle_id || data.vehicle?.id || '',
    ora: r.ora || (data.data_inizio ? (data.data_inizio.split('T')[1] || '').slice(0,5) : ''),
    data_fine: r.data_fine || (data.data_fine ? (data.data_fine.split('T')[1] || '').slice(0,5) : ''),
    stato: r.stato || data.stato || '',
    activity_type_id: r.activity_type_id || data.activity_type_id || data.activityType?.id || '',
    _isNew: false,
  };
}

  const [rows, setRows] = useState(
    initialRows.length > 0
      ? initialRows.map(mapRow)
      : []
  );


  // Sync rows con initialRows quando cambia la data o initialRows
  React.useEffect(() => {
    setRows(
      initialRows.length > 0
        ? initialRows.map(mapRow)
        : []
    );
  }, [initialRows]);
  // Stato delle righe vuote temporanee
  const [emptyRows, setEmptyRows] = useState([
    { titolo: "", descrizione: "", client_id: "", site_id: "", ora: "", data_fine: "", driver_id: "", vehicle_id: "", stato: "", activity_type_id: "", _isNew: true },
  ]);

  // Gestore cambi campo (editabile, automatico)
  const handleFieldChange = (idx, field, value, isEmptyRow = false) => {
    const targetRows = isEmptyRow ? [...emptyRows] : [...rows];
    
    // Format time values if they come from time inputs
    if (field === 'ora' || field === 'data_fine') {
      // Ensure time is in HH:MM format
      if (value && !value.includes(':')) {
        value = `${value.slice(0,2)}:${value.slice(2)}`;
      }
    }
    
    targetRows[idx][field] = value;
    if (isEmptyRow) {
      setEmptyRows(targetRows);
      // Se la riga vuota è stata compilata almeno in descrizione, salva subito
      if (
        targetRows[idx].titolo &&
        targetRows[idx].descrizione &&
        targetRows[idx].client_id &&
        targetRows[idx].site_id &&
        targetRows[idx].ora &&
        targetRows[idx].data_fine &&
        targetRows[idx].driver_id &&
        targetRows[idx].vehicle_id &&
        targetRows[idx].stato &&
        targetRows[idx].activity_type_id
      ) {
        // Chiamata di salvataggio verso il parent
        onSaveActivity({
          ...targetRows[idx],
          data_inizio: date + 'T' + targetRows[idx].ora,
          data_fine: date + 'T' + targetRows[idx].data_fine,
        });
        // Svuota la riga dopo il salvataggio
        const newEmptyRows = [...emptyRows];
        newEmptyRows[idx] = { descrizione: "", client_id: "", site_id: "", ora: "", data_fine: "", driver_id: "", vehicle_id: "", stato: "", activity_type_id: "", _isNew: true };
        setEmptyRows(newEmptyRows);
      }
    } else {
      setRows(targetRows);
      // Salvataggio automatico per righe esistenti
      // Genera titolo automatico se mancante
      const clientObj = clients.find(c => String(c.id) === String(targetRows[idx].client_id));
      const nomeCliente = clientObj ? clientObj.nome : '';
      const dataAttivita = date;
      const titoloGenerato = `${nomeCliente} - ${dataAttivita}`;
      onSaveActivity({
        ...targetRows[idx],
        data_inizio: date + 'T' + targetRows[idx].ora,
        data_fine: date + 'T' + targetRows[idx].data_fine,
      });
    }
  };

  // Aggiungi nuova riga vuota
  const handleAddEmptyRow = () => {
    setEmptyRows([
      ...emptyRows,
      { descrizione: "", client_id: "", site_id: "", ora: "", data_fine: "", driver_id: "", vehicle_id: "", stato: "", activity_type_id: "", _isNew: true }
    ]);
  };


  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: '95vw', maxHeight: '95vh', width: 'auto', backgroundColor: 'white', padding: '20px', borderRadius: '8px', overflow: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>Attività giornaliere</h2>
        <div style={{ marginBottom: 16 }}>
          <label>
            Data:
            <input
              type="date"
              value={date}
              onChange={e => onChangeDate && onChangeDate(e.target.value)}
              style={{ marginLeft: 8 }}
            />
          </label>
        </div>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="daily-table" style={{ minWidth: '1200px', width: '100%' }}>
            <thead>
              <tr>
                                <th>Descrizione attività</th>
                <th>Cliente</th>
                <th>Cantiere</th>
                <th>Ora inizio</th>
                <th>Ora fine</th>
                <th>Veicolo</th>
                <th>Assegnato a</th>
                <th>Stato</th>
                <th>Tipologia di attività</th>
              </tr>
            </thead>
            <tbody>
              {/* Righe esistenti */}
              {rows.map((row, idx) => (
                <tr key={row.id || idx} style={{ whiteSpace: 'nowrap' }}>
                                    <td>
                    <input
                      type="text"
                      value={row.descrizione || ""}
                      onChange={e => handleFieldChange(idx, "descrizione", e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={row.client_id || ""}
                      onChange={e => handleFieldChange(idx, "client_id", e.target.value)}
                    >
                      <option value="">Seleziona...</option>
                      {(Array.isArray(clients) ? clients : []).map(client => (
                        <option key={client.id} value={client.id}>{client.nome}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.site_id || ""}
                      onChange={e => handleFieldChange(idx, "site_id", e.target.value)}
                      disabled={!row.client_id}
                    >
                      <option value="">Seleziona...</option>
                      {(Array.isArray(sites) ? sites.filter(site => 
                        site.client_id == row.client_id || 
                        (site.client && site.client.id == row.client_id)
                      ) : []).map(site => (
                        <option key={site.id} value={site.id}>{site.nome}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="time"
                      value={row.ora || ""}
                      onChange={e => handleFieldChange(idx, "ora", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      value={row.data_fine || ""}
                      onChange={e => handleFieldChange(idx, "data_fine", e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={row.vehicle_id || ""}
                      onChange={e => handleFieldChange(idx, "vehicle_id", e.target.value)}
                    >
                      <option value="">Seleziona...</option>
                      {(Array.isArray(vehicles) ? vehicles : []).map(vehicle => (
                        <option key={vehicle.id} value={vehicle.id}>{vehicle.targa} - {vehicle.marca} {vehicle.modello}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.driver_id || ""}
                      onChange={e => handleFieldChange(idx, "driver_id", e.target.value)}
                    >
                      <option value="">Seleziona...</option>
                      {(Array.isArray(drivers) ? drivers : []).map(driver => (
                        <option key={driver.id} value={driver.id}>{driver.nome} {driver.cognome}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.stato || ""}
                      onChange={e => handleFieldChange(idx, "stato", e.target.value)}
                    >
                      <option value="">Seleziona...</option>
                      {activityStates.map(stato => (
                        <option key={stato} value={stato}>{stato}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.activity_type_id || ""}
                      onChange={e => handleFieldChange(idx, "activity_type_id", e.target.value)}
                    >
                      <option value="">Seleziona...</option>
                      {activityTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.nome || type.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {/* Righe vuote per nuove attività */}
              {emptyRows.map((row, idx) => (
                <tr key={"empty-" + idx} style={{ whiteSpace: 'nowrap' }}>
                                    <td>
                    <input
                      type="text"
                      value={row.descrizione || ""}
                      onChange={e => handleFieldChange(idx, "descrizione", e.target.value, true)}
                    />
                  </td>
                  <td>
                    <select
                      value={row.client_id || ""}
                      onChange={e => handleFieldChange(idx, "client_id", e.target.value, true)}
                    >
                      <option value="">Seleziona...</option>
                      {(Array.isArray(clients) ? clients : []).map(client => (
                        <option key={client.id} value={client.id}>{client.nome}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.site_id || ""}
                      onChange={e => handleFieldChange(idx, "site_id", e.target.value, true)}
                      disabled={!row.client_id}
                    >
                      <option value="">Seleziona...</option>
                      {(Array.isArray(sites) ? sites.filter(site => 
                        site.client_id == row.client_id || 
                        (site.client && site.client.id == row.client_id)
                      ) : []).map(site => (
                        <option key={site.id} value={site.id}>{site.nome}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="time"
                      value={row.ora || ""}
                      onChange={e => handleFieldChange(idx, "ora", e.target.value, true)}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      value={row.data_fine || ""}
                      onChange={e => handleFieldChange(idx, "data_fine", e.target.value, true)}
                    />
                  </td>
                  <td>
                    <select
                      value={row.vehicle_id || ""}
                      onChange={e => handleFieldChange(idx, "vehicle_id", e.target.value, true)}
                    >
                      <option value="">Seleziona...</option>
                      {(Array.isArray(vehicles) ? vehicles : []).map(vehicle => (
                        <option key={vehicle.id} value={vehicle.id}>{vehicle.targa} - {vehicle.marca} {vehicle.modello}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.driver_id || ""}
                      onChange={e => handleFieldChange(idx, "driver_id", e.target.value, true)}
                    >
                      <option value="">Seleziona...</option>
                      {(Array.isArray(drivers) ? drivers : []).map(driver => (
                        <option key={driver.id} value={driver.id}>{driver.nome} {driver.cognome}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.stato || ""}
                      onChange={e => handleFieldChange(idx, "stato", e.target.value, true)}
                    >
                      <option value="">Seleziona...</option>
                      {activityStates.map(stato => (
                        <option key={stato} value={stato}>{stato}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.activity_type_id || ""}
                      onChange={e => handleFieldChange(idx, "activity_type_id", e.target.value, true)}
                    >
                      <option value="">Seleziona...</option>
                      {activityTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.nome || type.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
          <button 
            onClick={handleAddEmptyRow}
            style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Aggiungi attività
          </button>
          <button 
            onClick={onClose}
            style={{ marginTop: '16px', marginLeft: '16px', padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
