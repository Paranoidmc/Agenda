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
  errors = {}
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
            // Assicurati che la data sia nel formato corretto per l'input datetime-local
            // Il formato richiesto è: YYYY-MM-DDThh:mm
            if (typeof fieldValue === 'string') {
              // Se la data non contiene già la T, formattala correttamente
              if (!fieldValue.includes('T')) {
                const date = new Date(fieldValue);
                if (!isNaN(date.getTime())) {
                  formattedData[fieldName] = date.toISOString().slice(0, 16);
                }
              } else if (fieldValue.length > 16) {
                // Se la data è già in formato ISO, taglia i secondi e millisecondi
                formattedData[fieldName] = fieldValue.slice(0, 16);
              }
            } else if (fieldValue instanceof Date) {
              // Se è un oggetto Date, convertilo in stringa ISO
              formattedData[fieldName] = fieldValue.toISOString().slice(0, 16);
            }
          } catch (error) {
            console.error(`Errore nella formattazione della data per il campo ${fieldName}:`, error);
            formattedData[fieldName] = '';
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
        // Gestisci i campi select
        else if (field.type === 'select') {
          // Assicurati che il valore sia una stringa
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
    
    // Gestisci il cambiamento del campo con callback onChange
    if (field && field.onChange) {
      console.log(`Chiamata onChange per il campo ${name} con valore ${processedValue}`);
      field.onChange(name, processedValue);
    }
  };

  const validate = () => {
    const newErrors = {};
    
    fields.forEach(field => {
      const fieldName = field.name;
      const fieldValue = formData[fieldName];
      const fieldLabel = field.label;
      
      // Controlla se il campo è richiesto e se è vuoto
      if (field.required) {
        // Considera i valori 0 come validi per i campi numerici
        const isEmptyNumeric = field.type === 'number' && (fieldValue === undefined || fieldValue === null || fieldValue === '');
        const isEmptyString = typeof fieldValue === 'string' && fieldValue.trim() === '';
        const isEmptySelect = field.type === 'select' && (fieldValue === undefined || fieldValue === null || fieldValue === '');
        const isEmptyOther = fieldValue === undefined || fieldValue === null || (field.type !== 'number' && fieldValue === 0);
        
        if (isEmptyNumeric || isEmptyString || isEmptySelect || isEmptyOther) {
          newErrors[fieldName] = `${fieldLabel} è obbligatorio`;
        }
      }
      
      // Validazione specifica per i campi datetime-local
      if (field.type === 'datetime-local' && fieldValue) {
        try {
          const date = new Date(fieldValue);
          if (isNaN(date.getTime())) {
            newErrors[fieldName] = `${fieldLabel} non è una data valida`;
          }
        } catch (error) {
          newErrors[fieldName] = `${fieldLabel} non è una data valida`;
        }
      }
      
      // Validazione specifica per i campi date
      if (field.type === 'date' && fieldValue) {
        try {
          const date = new Date(fieldValue);
          if (isNaN(date.getTime())) {
            newErrors[fieldName] = `${fieldLabel} non è una data valida`;
          }
        } catch (error) {
          newErrors[fieldName] = `${fieldLabel} non è una data valida`;
        }
      }
      
      // Validazione specifica per i campi numerici
      if (field.type === 'number' && fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
        if (isNaN(Number(fieldValue))) {
          newErrors[fieldName] = `${fieldLabel} deve essere un numero`;
        }
      }
      
      // Validazione specifica per i campi select numerici
      if (field.type === 'select' && field.isNumeric && fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
        if (isNaN(Number(fieldValue))) {
          newErrors[fieldName] = `${fieldLabel} deve essere un valore valido`;
        }
      }
    });
    
    console.log('Errori di validazione:', newErrors);
    setLocalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validate()) {
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
        <div key={field.name} style={{ marginBottom: '16px' }}>
          <label 
            htmlFor={field.name}
            style={{ 
              display: 'block', 
              marginBottom: '6px', 
              fontWeight: 500,
              fontSize: '0.9rem',
              color: '#555'
            }}
          >
            {field.label}
            {field.required && <span style={{ color: 'var(--primary)', marginLeft: '4px' }}>*</span>}
          </label>
          
          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              name={field.name}
              value={formData[field.name] !== undefined && formData[field.name] !== null ? formData[field.name] : ''}
              onChange={handleChange}
              disabled={!isEditing || isLoading || isSaving || field.disabled}
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: (allErrors[field.name]) ? '1px solid #ff3b30' : '1px solid #e5e5ea',
                fontSize: '1rem',
                backgroundColor: isEditing ? '#fff' : '#f9f9fa',
                resize: 'vertical'
              }}
            />
          ) : field.type === 'select' ? (
            <select
              id={field.name}
              name={field.name}
              value={formData[field.name] !== undefined ? String(formData[field.name]) : ''}
              onChange={handleChange}
              disabled={!isEditing || isLoading || isSaving || field.disabled}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: (allErrors[field.name]) ? '1px solid #ff3b30' : '1px solid #e5e5ea',
                fontSize: '1rem',
                backgroundColor: isEditing ? '#fff' : '#f9f9fa',
                appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007aff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px top 50%',
                backgroundSize: '12px auto',
                paddingRight: '30px'
              }}
            >
              <option value="">Seleziona...</option>
              {field.options?.map(option => {
                // Converti sia il valore dell'opzione che il valore del form in stringhe per il confronto
                const optionValue = String(option.value);
                return (
                  <option key={optionValue} value={optionValue}>
                    {option.label}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              type={field.type || 'text'}
              id={field.name}
              name={field.name}
              value={formData[field.name] !== undefined && formData[field.name] !== null ? formData[field.name] : ''}
              onChange={handleChange}
              disabled={!isEditing || isLoading || isSaving || field.disabled}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: (allErrors[field.name]) ? '1px solid #ff3b30' : '1px solid #e5e5ea',
                fontSize: '1rem',
                backgroundColor: isEditing ? '#fff' : '#f9f9fa'
              }}
            />
          )}
          
          {allErrors[field.name] && (
            <p style={{ color: '#ff3b30', fontSize: '0.8rem', marginTop: '4px', marginBottom: 0 }}>
              {allErrors[field.name]}
            </p>
          )}
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