"use client";
import { useState, useEffect } from 'react';

export default function EntityForm({
  data,
  fields,
  onSave,
  onDelete,
  onCancel,
  isEditing = false,
  setIsEditing,
  isLoading = false,
  isSaving = false,
  errors = {},
  extraBelowSite // nuova prop opzionale
}) {
  const [formData, setFormData] = useState(data || {});
  
  // Aggiorna i dati del form quando cambiano i dati esterni
  useEffect(() => {
    if (data) {
      // Crea una copia profonda dei dati per evitare riferimenti
      const formattedData = { ...data };
      
      // Formatta i campi in base al loro tipo
      fields.forEach(field => {
        const fieldName = field.name;
        const fieldValue = formattedData[fieldName];
        
        // Gestisci i campi vuoti o null
        if (fieldValue === undefined || fieldValue === null) {
          // Per i campi select, imposta un valore vuoto
          if (field.type === 'select') {
            formattedData[fieldName] = '';
          }
          // Per i campi numerici, imposta un valore vuoto
          else if (field.type === 'number') {
            formattedData[fieldName] = '';
          }
          // Per gli altri campi, imposta una stringa vuota
          else {
            formattedData[fieldName] = '';
          }
        }
        // Gestisci i campi datetime-local
        else if (field.type === 'datetime-local' && fieldValue) {
          try {
            // Funzione per convertire stringa ISO con offset in YYYY-MM-DDTHH:mm Europe/Rome
            const toInputDatetimeLocal = (isoString) => {
              if (!isoString) return '';
              const date = new Date(isoString);
              // Ricava valori in Europe/Rome
              const tzDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
              const year = tzDate.getFullYear();
              const month = String(tzDate.getMonth() + 1).padStart(2, '0');
              const day = String(tzDate.getDate()).padStart(2, '0');
              const hour = String(tzDate.getHours()).padStart(2, '0');
              const minute = String(tzDate.getMinutes()).padStart(2, '0');
              return `${year}-${month}-${day}T${hour}:${minute}`;
            };
            if (typeof fieldValue === 'string') {
              formattedData[fieldName] = toInputDatetimeLocal(fieldValue);
            } else if (fieldValue instanceof Date) {
              formattedData[fieldName] = toInputDatetimeLocal(fieldValue.toISOString());
            }
          } catch (e) {
            // In caso di errore lascia il valore invariato
          }
        }
        // Gestisci i campi date
        else if (field.type === 'date' && fieldValue) {
          try {
            // Assicurati che la data sia nel formato corretto per l'input date
            // Il formato richiesto è: YYYY-MM-DD
            if (typeof fieldValue === 'string') {
              // Se la data contiene la T, prendi solo la parte della data
              if (fieldValue.includes('T')) {
                formattedData[fieldName] = fieldValue.split('T')[0];
              }
              // Altrimenti, prova a formattarla come data
              else {
                const date = new Date(fieldValue);
                if (!isNaN(date.getTime())) {
                  formattedData[fieldName] = date.toISOString().split('T')[0];
                }
              }
            } else if (fieldValue instanceof Date) {
              // Se è un oggetto Date, convertilo in stringa ISO
              formattedData[fieldName] = fieldValue.toISOString().split('T')[0];
            }
          } catch (error) {
            console.error(`Errore nella formattazione della data per il campo ${fieldName}:`, error);
            formattedData[fieldName] = '';
          }
        }
        // Gestisci i campi select (assicurati che il valore sia sempre una stringa)
        else if (field.type === 'select') {
          formattedData[fieldName] = String(fieldValue);
        }
        // Gestisci i campi numerici
        else if (field.type === 'number') {
          // Se il valore è una stringa vuota, lascialo così
          if (fieldValue === '') {
            formattedData[fieldName] = '';
          }
          // Altrimenti, assicurati che sia un numero
          else {
            formattedData[fieldName] = Number(fieldValue);
          }
        }
      });
      
      console.log('Dati form aggiornati:', formattedData);
      setFormData(formattedData);
    } else {
      // Se non ci sono dati, inizializza il form con valori vuoti
      const emptyData = {};
      fields.forEach(field => {
        // Per i campi select, imposta un valore vuoto
        if (field.type === 'select') {
          emptyData[field.name] = '';
        }
        // Per i campi numerici, imposta un valore vuoto
        else if (field.type === 'number') {
          emptyData[field.name] = '';
        }
        // Per gli altri campi, imposta una stringa vuota
        else {
          emptyData[field.name] = '';
        }
      });
      setFormData(emptyData);
    }
  }, [data, fields]);
  const [localErrors, setLocalErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  // Combina gli errori locali con quelli passati come props
  const allErrors = { ...localErrors, ...errors };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Trova la definizione del campo
    const field = fields.find(f => f.name === name);
    
    // Callback custom: chiama sempre field.onChange se esiste (es: AttivitaPage.handleFieldChange)
    if (field && typeof field.onChange === 'function') {
      console.log('[EntityForm] Chiamo field.onChange per', name, value);
      field.onChange(name, value);
    }
    
    // Determina il valore corretto in base al tipo di campo
    let processedValue = value;
    
    // Gestisci i tipi di campo specifici
    if (field) {
      if (field.type === 'number') {
        // Converti in numero se è un campo numerico e il valore non è vuoto
        if (value !== '') {
          processedValue = Number(value);
        }
      } else if (field.type === 'select' && field.isNumeric) {
        // Converti in numero se è un campo select numerico e il valore non è vuoto
        if (value !== '') {
          processedValue = Number(value);
        }
      } else if (field.type === 'checkbox') {
        // Per i checkbox, usa il checked invece del value
        processedValue = e.target.checked;
      } else if (field.type === 'datetime-local') {
        // Assicurati che la data sia nel formato corretto
        if (value) {
          try {
            // Mantieni il valore come stringa ma assicurati che sia valido
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              // La data è valida, mantieni il valore originale
              processedValue = value;
            }
          } catch (error) {
            console.error(`Errore nella validazione della data per il campo ${name}:`, error);
          }
        }
      } else if (field.type === 'date') {
        // Assicurati che la data sia nel formato corretto
        if (value) {
          try {
            // Mantieni il valore come stringa ma assicurati che sia valido
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              // La data è valida, mantieni il valore originale
              processedValue = value;
            }
          } catch (error) {
            console.error(`Errore nella validazione della data per il campo ${name}:`, error);
          }
        }
      }
    }
    
    console.log(`Campo ${name} cambiato da ${formData[name]} a ${processedValue} (tipo: ${field?.type}, isNumeric: ${field?.isNumeric})`);
    
    // Aggiorna i dati del form
    setFormData(prev => {
      const newData = { ...prev, [name]: processedValue };
      
      // Se è cambiato il cliente, resetta la sede
      if (name === 'client_id') {
        newData.site_id = '';
      }
      
      return newData;
    });
    
    // Rimuovi l'errore quando l'utente inizia a digitare
    if (localErrors[name]) {
      setLocalErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Funzione di validazione pulita e robusta
  const validate = () => {
    const newErrors = {};
    fields.forEach(field => {
      const fieldName = field.name;
      const fieldLabel = field.label || fieldName;
      const fieldValue = formData[fieldName];

      // Campo obbligatorio
      if (field.required) {
        const isEmpty = fieldValue === undefined || fieldValue === null || fieldValue === '';
        if (isEmpty) {
          newErrors[fieldName] = `${fieldLabel} è obbligatorio`;
        }
      }

      // Validazione numeri
      if (field.type === 'number' && fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
        if (isNaN(Number(fieldValue))) {
          newErrors[fieldName] = `${fieldLabel} deve essere un numero`;
        }
      }

      // Validazione select numerici
      if (field.type === 'select' && field.isNumeric && fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
        if (isNaN(Number(fieldValue))) {
          newErrors[fieldName] = `${fieldLabel} deve essere un valore valido`;
        }
      }

      // Validazione date
      if (field.type === 'date' && fieldValue) {
        const date = new Date(fieldValue);
        if (isNaN(date.getTime())) {
          newErrors[fieldName] = `${fieldLabel} non è una data valida`;
        }
      }

      // Validazione datetime-local
      if (field.type === 'datetime-local' && fieldValue) {
        const date = new Date(fieldValue);
        if (isNaN(date.getTime())) {
          newErrors[fieldName] = `${fieldLabel} non è una data valida`;
        }
      }
    });
    console.log('Errori di validazione:', newErrors);
    setLocalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSaving || isLoading) return;
    if (onSave) {
      console.log('[DEBUG][EntityForm] handleSubmit formData.status:', formData.status);
      // Prepara i dati per l'invio, assicurandosi che i tipi siano corretti
      const preparedData = { ...formData };
      
      // Converti i campi in base al loro tipo
      fields.forEach(field => {
        const fieldName = field.name;
        const fieldValue = preparedData[fieldName];
        
        // Gestisci i campi vuoti o null
        if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
          // Se il campo è richiesto, mantieni il valore vuoto
          if (field.required) {
            preparedData[fieldName] = '';
          } 
          // Altrimenti, rimuovi il campo per evitare errori di validazione
          else {
            delete preparedData[fieldName];
          }
        }
        // Gestisci i campi numerici
        else if (field.type === 'number') {
          preparedData[fieldName] = Number(fieldValue);
        }
        // Gestisci i campi booleani (come checkbox)
        else if (field.type === 'checkbox') {
          preparedData[fieldName] = !!fieldValue;
        }
        // Gestisci i campi select che potrebbero essere numerici
        else if (field.type === 'select' && field.isNumeric) {
          preparedData[fieldName] = Number(fieldValue);
        }
        // Gestisci i campi datetime-local
        else if (field.type === 'datetime-local' && fieldValue) {
          // Assicurati che la data sia in formato ISO
          try {
            const date = new Date(fieldValue);
            if (!isNaN(date.getTime())) {
              // La data è valida, mantieni il valore originale
              // Non modificare il formato qui, potrebbe causare problemi con i fusi orari
              preparedData[fieldName] = fieldValue;
            }
          } catch (error) {
            console.error(`Errore nella formattazione della data per il campo ${fieldName}:`, error);
          }
        }
        // Gestisci i campi date
        else if (field.type === 'date' && fieldValue) {
          // Assicurati che la data sia in formato ISO
          try {
            const date = new Date(fieldValue);
            if (!isNaN(date.getTime())) {
              // La data è valida, mantieni il valore originale
              preparedData[fieldName] = fieldValue;
            }
          } catch (error) {
            console.error(`Errore nella formattazione della data per il campo ${fieldName}:`, error);
          }
        }
      });
      
      // Assicurati che i campi ID comuni siano numeri
      ['id', 'client_id', 'site_id', 'driver_id', 'vehicle_id', 'activity_type_id'].forEach(fieldName => {
        if (preparedData[fieldName] !== undefined && preparedData[fieldName] !== null && preparedData[fieldName] !== '') {
          preparedData[fieldName] = Number(preparedData[fieldName]);
          console.log(`Campo ${fieldName} convertito in numero:`, preparedData[fieldName]);
        }
      });
      
      // Log per debug
      console.log('Dati inviati:', preparedData);
      
      onSave(preparedData);
    }
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      onDelete(data.id);
    } else {
      setDeleteConfirm(true);
      // Reset dopo 3 secondi se non confermato
      setTimeout(() => setDeleteConfirm(false), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {fields.map((field) => (
        <div key={field.name} style={{ marginBottom: '1.2rem', opacity: field.disabled ? 0.6 : 1 }}>
          <label htmlFor={field.name} style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '0.9rem' }}>
            {field.label}:
          </label>

          {/* === Conditional Rendering Logic === */}
          {!isEditing ? (
            // === DISPLAY MODE (isEditing = false) ===
            <div style={{
              padding: '10px 12px',
              border: '1px solid #e5e5ea',
              borderRadius: '8px',
              backgroundColor: '#f2f2f7',
              minHeight: '44px', // Altezza minima per allineamento
              display: 'flex',
              alignItems: 'center',
              fontSize: '1rem',
              wordBreak: 'break-word', // Per testi lunghi
            }}>
              {(() => {
                let displayValue = formData[field.name] ?? 'N/D';

                // Handle specific display logic for read-only mode
                if (field.name === 'driver_id') {
                  // Directly use driver object if available
                  displayValue = formData.driver ? `${formData.driver.name} ${formData.driver.surname}` : 'Valore non trovato';
                } else if (field.name === 'vehicle_id') {
                  // Directly use vehicle object if available
                  displayValue = formData.vehicle ? `${formData.vehicle.marca} ${formData.vehicle.modello} (${formData.vehicle.targa})` : 'Valore non trovato';
                } else if (field.type === 'select') {
                  const selectedOption = field.options?.find(option => String(option.value) === String(formData[field.name]));
                  displayValue = selectedOption ? selectedOption.label : 'Valore non trovato';
                } else if (field.type === 'datetime-local' && displayValue !== 'N/D') {
                  try {
                    displayValue = new Date(displayValue).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
                  } catch { displayValue = 'Data non valida'; } // Fallback
                } else if (field.type === 'date' && displayValue !== 'N/D') {
                  try {
                    displayValue = new Date(displayValue).toLocaleDateString('it-IT'); // Formato data locale
                  } catch { displayValue = 'Data non valida'; } // Fallback
                }

                // Per altri tipi (text, textarea, number), mostra il valore
                return <span>{displayValue}</span>;
              })()}
            </div>
          ) : (
            // === EDIT MODE (isEditing = true) ===
            (() => {
              // Sposta la logica di rendering dell'input qui dentro
              if (field.type === 'textarea') {
                return (
                  <textarea
                    id={field.name}
                    name={field.name}
                    value={formData[field.name] !== undefined && formData[field.name] !== null ? formData[field.name] : ''}
                    onChange={handleChange}
                    disabled={isLoading || isSaving || field.disabled}
                    rows={field.rows || 3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: (allErrors[field.name]) ? '1px solid #ff3b30' : '1px solid #e5e5ea',
                      fontSize: '1rem',
                      resize: 'vertical',
                      backgroundColor: (isLoading || isSaving || field.disabled) ? '#f2f2f7' : '#fff',
                    }}
                  />
                );
              } else if (field.type === 'select') {
                // --- SELECT RICERCABILE CON REACT-SELECT ---
                const Select = require('react-select').default;
                const options = field.options?.map(option => ({ value: option.value, label: option.label, isDisabled: !!option.isDisabled })) || [];
                // Trova l'opzione selezionata
                const selectedOption = options.find(opt => String(opt.value) === String(formData[field.name]));
                return (
                  <div style={{ marginBottom: 8 }}>
                    <Select
                      id={field.name}
                      name={field.name}
                      isDisabled={isLoading || isSaving || field.disabled}
                      options={options}
                      placeholder={field.placeholder || 'Seleziona...'}
                      value={selectedOption || null}
                      onChange={selected => {
                        handleChange({
                          target: {
                            name: field.name,
                            value: selected ? selected.value : ''
                          }
                        });
                      }}
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          borderColor: allErrors[field.name] ? '#ff3b30' : '#e5e5ea',
                          borderRadius: 8,
                          minHeight: 44,
                          fontSize: '1rem',
                          backgroundColor: (isLoading || isSaving || field.disabled) ? '#f2f2f7' : '#fff',
                          boxShadow: 'none',
                        }),
                        option: (base, state) => ({
                          ...base,
                          fontSize: '1rem',
                          color: state.isDisabled ? '#aaa' : base.color,
                          backgroundColor: state.isDisabled ? '#f2f2f7' : base.backgroundColor,
                          cursor: state.isDisabled ? 'not-allowed' : base.cursor
                        }),
                        menu: base => ({ ...base, zIndex: 100 }),
                      }}
                      isOptionDisabled={option => !!option.isDisabled}
                      isClearable
                      isSearchable
                    />
                  </div>
                );
              } else if (field.type === 'checkbox') {
                return (
                  <input
                    type="checkbox"
                    id={field.name}
                    name={field.name}
                    checked={!!formData[field.name]}
                    onChange={handleChange}
                    disabled={isLoading || isSaving || field.disabled}
                    style={{ height: '20px', width: '20px' }}
                  />
                );
              } else if (field.type === 'hidden') {
                return (
                  <input
                    type="hidden"
                    id={field.name}
                    name={field.name}
                    value={formData[field.name] !== undefined && formData[field.name] !== null ? formData[field.name] : ''}
                  />
                );
              } else {
                // Default per input text, number, date, datetime-local, etc.
                return (
                  <input
                    type={field.type || 'text'}
                    id={field.name}
                    name={field.name}
                    value={formData[field.name] !== undefined && formData[field.name] !== null ? formData[field.name] : ''}
                    onChange={handleChange}
                    disabled={isLoading || isSaving || field.disabled}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: (allErrors[field.name]) ? '1px solid #ff3b30' : '1px solid #e5e5ea',
                      fontSize: '1rem',
                      backgroundColor: (isLoading || isSaving || field.disabled) ? '#f2f2f7' : '#fff',
                    }}
                  />
                );
              }
            })()
          )}
          {allErrors[field.name] && (
            <p style={{ color: '#ff3b30', fontSize: '0.8rem', marginTop: '4px' }}>{allErrors[field.name]}</p>
          )}
          {/* Inserisci qui il pulsante extra se richiesto e se il campo è site_id */}
          {field.name === 'site_id' && extraBelowSite}
        </div>
      ))}

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginTop: '20px',
        gap: '12px'
      }}>
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={onCancel || (() => {
                if (typeof setIsEditing === 'function') {
                  setIsEditing(false);
                } else {
                  console.warn('setIsEditing non è una funzione. Assicurati di passare la prop setIsEditing al componente EntityForm.');
                }
              })}
              disabled={isLoading || isSaving}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #e5e5ea',
                backgroundColor: '#f9f9fa',
                color: '#555',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'none'
              }}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isLoading || isSaving}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: (isLoading || isSaving) ? 'wait' : 'pointer'
              }}
            >
              {isLoading || isSaving ? 'Salvataggio...' : 'Salva'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                if (typeof setIsEditing === 'function') {
                  setIsEditing(true);
                } else {
                  console.warn('setIsEditing non è una funzione. Assicurati di passare la prop setIsEditing al componente EntityForm.');
                }
              }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Modifica
            </button>
            <button
              type="button"
              onClick={handleDelete}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: deleteConfirm ? '#ff3b30' : '#f9f9fa',
                color: deleteConfirm ? '#fff' : '#ff3b30',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: deleteConfirm ? 'none' : '1px solid #ff3b30',
                transition: 'all 0.2s ease'
              }}
            >
              {deleteConfirm ? 'Conferma eliminazione' : 'Elimina'}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
