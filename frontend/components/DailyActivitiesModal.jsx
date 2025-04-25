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
  // DEBUG: Logga la prop clients ogni volta che la modale viene renderizzata
  console.log('[DEBUG][DailyActivitiesModal] clients:', clients);
  // Stato delle righe della tabella (sia esistenti che nuove)
  const [rows, setRows] = useState(
    initialRows.length > 0
      ? initialRows.map(r => ({ ...r, _isNew: false }))
      : []
  );

  // Sync rows con initialRows quando cambia la data o initialRows
  React.useEffect(() => {
    setRows(
      initialRows.length > 0
        ? initialRows.map(r => ({ ...r, _isNew: false }))
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
        newEmptyRows[idx] = { titolo: "", descrizione: "", client_id: "", site_id: "", ora: "", data_fine: "", driver_id: "", vehicle_id: "", stato: "", activity_type_id: "", _isNew: true };
        setEmptyRows(newEmptyRows);
      }
    } else {
      setRows(targetRows);
      // Salvataggio automatico per righe esistenti
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
      { titolo: "", descrizione: "", client_id: "", site_id: "", ora: "", data_fine: "", driver_id: "", vehicle_id: "", stato: "", activity_type_id: "", _isNew: true }
    ]);
  };


  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Attività giornaliere</h2>
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
        <table className="daily-table">
          <thead>
            <tr>
              <th>Titolo</th>
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
              <tr key={row.id || idx}>
                <td>
                  <input
                    type="text"
                    value={row.titolo || ""}
                    onChange={e => handleFieldChange(idx, "titolo", e.target.value)}
                  />
                </td>
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
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.nome}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={row.site_id || ""}
                    onChange={e => handleFieldChange(idx, "site_id", e.target.value)}
                  >
                    <option value="">Seleziona...</option>
                    {sites.map(site => (
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
                    {vehicles.map(vehicle => (
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
                    {drivers.map(driver => (
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
              <tr key={"empty-" + idx}>
                <td>
                  <input
                    type="text"
                    value={row.titolo || ""}
                    onChange={e => handleFieldChange(idx, "titolo", e.target.value, true)}
                  />
                </td>
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
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.nome}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={row.site_id || ""}
                    onChange={e => handleFieldChange(idx, "site_id", e.target.value, true)}
                  >
                    <option value="">Seleziona...</option>
                    {sites.map(site => (
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
                    {vehicles.map(vehicle => (
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
                    {drivers.map(driver => (
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
        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
          <button onClick={handleAddEmptyRow} style={{ background: "#007aff", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer" }}>
            + Nuova riga vuota
          </button>
          <button onClick={onClose} style={{ background: "#aaa", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer" }}>
            Chiudi
          </button>
        </div>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #fff;
          padding: 32px 24px;
          border-radius: 12px;
          min-width: 900px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.12);
        }
        .daily-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        .daily-table th, .daily-table td {
          border: 1px solid #e5e5ea;
          padding: 8px;
          text-align: left;
        }
        .daily-table th {
          background: #f7f7fa;
        }
      `}</style>
    </div>
  );
}
