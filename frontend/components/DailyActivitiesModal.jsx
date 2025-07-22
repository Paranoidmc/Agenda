"use client";
import React, { useState, useEffect } from "react";
import api from '../lib/api';

// CSS per l'animazione del loading spinner
const spinKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Aggiungi i keyframes al documento se non esistono già
if (typeof document !== 'undefined' && !document.querySelector('#spin-keyframes')) {
  const style = document.createElement('style');
  style.id = 'spin-keyframes';
  style.textContent = spinKeyframes;
  document.head.appendChild(style);
}

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

  // Stato per documenti suggeriti
  const [suggestedDocuments, setSuggestedDocuments] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState(new Map()); // Map<rowIndex, documentId>

  // Funzione per suggerire documenti allegabili
  const suggestDocuments = async (clientId, siteId, dataInizio) => {
    if (!clientId || !siteId || !dataInizio) {
      setSuggestedDocuments([]);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const response = await api.documenti.suggestForActivity({
        client_id: clientId,
        site_id: siteId,
        data_inizio: dataInizio
      });
      
      if (response.data.success) {
        setSuggestedDocuments(response.data.data || []);
      } else {
        console.warn('Nessun documento suggerito:', response.data.message);
        setSuggestedDocuments([]);
      }
    } catch (error) {
      console.error('Errore nel suggerimento documenti:', error);
      setSuggestedDocuments([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };


  // Sync rows con initialRows quando cambia la data o initialRows
  React.useEffect(() => {
    setRows(
      initialRows.length > 0
        ? initialRows.map(mapRow)
        : []
    );
  }, [initialRows]);

  // Suggerisci documenti quando cambia la data
  useEffect(() => {
    // Trova la prima riga con cliente e destinazione per suggerire documenti
    const firstRowWithData = [...rows, ...emptyRows].find(row => row.client_id && row.site_id);
    if (firstRowWithData && date) {
      suggestDocuments(firstRowWithData.client_id, firstRowWithData.site_id, date);
    }
  }, [date]);
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
    
    // Se cambia cliente o destinazione, suggerisci documenti
    if ((field === 'client_id' || field === 'site_id') && targetRows[idx].client_id && targetRows[idx].site_id) {
      suggestDocuments(targetRows[idx].client_id, targetRows[idx].site_id, date);
    }
    
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
        
        {/* Sezione Documenti Suggeriti */}
        {(suggestedDocuments.length > 0 || loadingSuggestions) && (
          <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8, border: '1px solid #dee2e6' }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, color: '#495057' }}>
              📄 Documenti Allegabili Suggeriti
            </h3>
            
            {loadingSuggestions ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid #f3f3f3', borderTop: '2px solid #007bff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ marginTop: 8, color: '#6c757d' }}>Ricerca documenti in corso...</p>
              </div>
            ) : (
              <div>
                {suggestedDocuments.length === 0 ? (
                  <p style={{ color: '#6c757d', fontStyle: 'italic' }}>Nessun documento trovato per i criteri selezionati.</p>
                ) : (
                  <div>
                    <p style={{ marginBottom: 12, color: '#495057' }}>
                      Trovati {suggestedDocuments.length} documenti che potrebbero essere collegati a questa attività:
                    </p>
                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                      {suggestedDocuments.map((doc, index) => (
                        <div key={doc.id} style={{ 
                          padding: 12, 
                          backgroundColor: 'white', 
                          border: '1px solid #dee2e6', 
                          borderRadius: 6,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          ':hover': { borderColor: '#007bff', boxShadow: '0 2px 4px rgba(0,123,255,0.1)' }
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <strong style={{ color: '#007bff' }}>
                                {doc.codice_doc} #{doc.numero_doc}
                              </strong>
                              <span style={{ marginLeft: 8, fontSize: '0.9em', color: '#6c757d' }}>
                                {doc.data_doc}
                              </span>
                            </div>
                            {doc.giorni_differenza === 0 && (
                              <span style={{ 
                                fontSize: '0.8em', 
                                backgroundColor: '#28a745', 
                                color: 'white', 
                                padding: '2px 6px', 
                                borderRadius: 3 
                              }}>
                                Stessa data
                              </span>
                            )}
                          </div>
                          
                          <div style={{ fontSize: '0.9em', color: '#495057', marginBottom: 4 }}>
                            <strong>Cliente:</strong> {doc.cliente?.name || 'N/A'}
                          </div>
                          
                          <div style={{ fontSize: '0.9em', color: '#495057', marginBottom: 4 }}>
                            <strong>Destinazione:</strong> {doc.destinazione?.name || 'N/A'}
                            {doc.destinazione?.city && (
                              <span style={{ color: '#6c757d' }}> - {doc.destinazione.city}</span>
                            )}
                          </div>
                          
                          <div style={{ fontSize: '0.9em', color: '#495057', marginBottom: 8 }}>
                            <strong>Totale:</strong> €{doc.totale_doc || '0,00'}
                          </div>
                          
                          <button
                            onClick={() => {
                              // Qui implementeremo la logica per allegare il documento
                              alert(`Documento ${doc.codice_doc} #${doc.numero_doc} allegato all'attività!`);
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 12px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: '0.9em',
                              transition: 'background-color 0.2s ease'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                          >
                            📎 Allega Documento
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
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
