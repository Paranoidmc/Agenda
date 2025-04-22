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
    setFormData(data || {});
  }, [data]);
  const [localErrors, setLocalErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  // Combina gli errori locali con quelli passati come props
  const allErrors = { ...localErrors, ...errors };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Aggiorna i dati del form
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
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
    const field = fields.find(f => f.name === name);
    if (field && field.onChange) {
      console.log(`Chiamata onChange per il campo ${name} con valore ${value}`);
      field.onChange(name, value);
    }
  };

  const validate = () => {
    const newErrors = {};
    
    fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} è obbligatorio`;
      }
    });
    
    setLocalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validate()) {
      // Prepara i dati per l'invio, assicurandosi che i tipi siano corretti
      const preparedData = { ...formData };
      
      // Converti i campi numerici in numeri
      fields.forEach(field => {
        if (field.type === 'number' && preparedData[field.name]) {
          preparedData[field.name] = Number(preparedData[field.name]);
        }
        
        // Gestisci i campi booleani (come checkbox)
        if (field.type === 'checkbox') {
          preparedData[field.name] = !!preparedData[field.name];
        }
        
        // Gestisci i campi select che potrebbero essere numerici
        if (field.type === 'select' && field.isNumeric && preparedData[field.name]) {
          preparedData[field.name] = Number(preparedData[field.name]);
        }
        
        // Rimuovi i campi vuoti per evitare errori di validazione
        if (preparedData[field.name] === '' && !field.required) {
          delete preparedData[field.name];
        }
      });
      
      // Assicurati che i campi ID siano numeri
      ['client_id', 'site_id', 'driver_id', 'vehicle_id', 'activity_type_id'].forEach(field => {
        if (preparedData[field]) {
          preparedData[field] = Number(preparedData[field]);
          console.log(`Campo ${field} convertito in numero:`, preparedData[field]);
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
              value={formData[field.name] || ''}
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
              value={formData[field.name] || ''}
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
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type || 'text'}
              id={field.name}
              name={field.name}
              value={formData[field.name] || ''}
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