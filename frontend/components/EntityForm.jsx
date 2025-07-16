"use client";
import { useState, useEffect } from 'react';

export default function EntityForm({
  data,
  fields,
  onSave,
  onDelete,
  onCancel: parentOnCancel,
  isEditing,
  setIsEditing,
  isLoading = false,
  isSaving = false,
  errors = {},
  extraBelowSite,
  onFormChange
}) {
  const [formData, setFormData] = useState({});
  const [localErrors, setLocalErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Initialize or reset form data when `data` or `fields` change
  useEffect(() => {
    const initialData = {};
    fields.forEach(field => {
      const value = data?.[field.name];
      if (field.type === 'multiselect') {
        const relatedData = data?.[field.optionsKey] || [];
        initialData[field.name] = Array.isArray(relatedData) ? relatedData.map(item => item.id) : [];
      } else if (field.type === 'datetime-local' && value) {
        try {
          const date = new Date(value);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          initialData[field.name] = `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch {
          initialData[field.name] = '';
        }
      } else {
        initialData[field.name] = value ?? (field.type === 'multiselect' ? [] : '');
      }
    });
    
    // Includi sempre l'ID se presente nei dati originali
    if (data?.id) {
      initialData.id = data.id;
    }
    
    setFormData(initialData);
  }, [data, fields]);



  const handleSetIsEditing = (editingState) => {
    console.log('handleSetIsEditing called with:', editingState);
    if (setIsEditing) {
      setIsEditing(editingState);
    }
  };

  const onCancel = () => {
    handleSetIsEditing(false);
    if (parentOnCancel) {
        parentOnCancel();
    }
  };

  const allErrors = { ...localErrors, ...errors };

  const handleChange = (e) => {
    const { name, value, type, checked, selectedOptions } = e.target;
    const field = fields.find(f => f.name === name);

    let processedValue;
    if (type === 'checkbox') {
      processedValue = checked;
    } else if (type === 'select-multiple') {
      processedValue = Array.from(selectedOptions, option => option.value);
    } else if (field && (field.type === 'number' || (field.type === 'select' && field.isNumeric))) {
      processedValue = value === '' ? null : Number(value);
    } else {
      processedValue = value;
    }

    const updatedFormData = { ...formData, [name]: processedValue };
    setFormData(updatedFormData);

    if (onFormChange) {
      onFormChange(updatedFormData);
    }

    if (localErrors[name]) {
      setLocalErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    fields.forEach(field => {
      if (field.required && (formData[field.name] === null || formData[field.name] === '' || (Array.isArray(formData[field.name]) && !formData[field.name].length))) {
        newErrors[field.name] = `${field.label} è obbligatorio.`;
      }
    });
    setLocalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Non fare nulla se non siamo in modalità editing
    if (!isEditing) {
      return;
    }
    
    if (isSaving || isLoading) return;

    if (!validate()) {
      console.log('Validazione fallita.');
      return;
    }

    if (onSave) {
      const preparedData = { ...formData };

      Object.keys(preparedData).forEach(key => {
        const field = fields.find(f => f.name === key);
        const value = preparedData[key];

        if (value === null || value === '') {
          delete preparedData[key];
          return;
        }

        if (field?.type === 'multiselect') {
          if (Array.isArray(value) && value.length > 0) {
            preparedData[key] = value.map(Number).filter(id => !isNaN(id));
          } else {
            delete preparedData[key];
          }
        }
      });

      console.log('Dati inviati:', preparedData);
      onSave(preparedData);
    }
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      onDelete(data.id);
    } else {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {fields.map((field) => (
        <div key={field.name} style={{ marginBottom: '1rem', opacity: field.disabled ? 0.6 : 1 }}>
          <label htmlFor={field.name} style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '0.9rem' }}>
            {field.label}:
          </label>

          {isEditing && field.type === 'custom' && field.render ? (
            <div>
              {field.render(formData, handleChange)}
            </div>
          ) : !isEditing ? (
            <div style={{
              padding: '10px 12px',
              border: '1px solid #e5e5ea',
              borderRadius: '8px',
              backgroundColor: '#f2f2f7',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              fontSize: '1rem',
              wordBreak: 'break-word',
            }}>
              {(() => {
                const displayValue = data?.[field.name] ?? 'N/D';
                if (field.name === 'driver_ids') {
                  return data?.drivers && data.drivers.length > 0 ? data.drivers.map(d => `${d.name} ${d.surname}`).join(', ') : 'Nessun autista';
                }
                if (field.name === 'vehicle_ids') {
                  return data?.vehicles && data.vehicles.length > 0 ? data.vehicles.map(v => `${v.marca} ${v.modello} (${v.targa})`).join(', ') : 'Nessun veicolo';
                }
                if (field.render && typeof field.render === 'function') {
                  // This is a custom render case for view mode, but we need the form's value
                  return field.render(data, () => {}); // Pass a dummy function for onChange in view mode
                }
                if (field.type === 'select') {
                  const option = field.options?.find(o => String(o.value) === String(displayValue));
                  return option ? option.label : 'N/D';
                }
                if (field.type === 'datetime-local' || field.type === 'date') {
                  if (!displayValue || displayValue === 'N/D') return 'N/D';
                  try {
                    return new Intl.DateTimeFormat('it-IT', {
                      year: 'numeric', month: '2-digit', day: '2-digit',
                      hour: field.type === 'datetime-local' ? '2-digit' : undefined,
                      minute: field.type === 'datetime-local' ? '2-digit' : undefined,
                    }).format(new Date(displayValue));
                  } catch { return 'Data non valida'; }
                }
                if (field.type === 'checkbox') {
                  return displayValue ? 'Sì' : 'No';
                }
                return <span>{displayValue}</span>;
              })()}
            </div>
          ) : (
            (() => {
              const commonProps = {
                id: field.name,
                name: field.name,
                disabled: isLoading || isSaving || field.disabled,
                onChange: handleChange,
                style: {
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: allErrors[field.name] ? '1px solid #d32f2f' : '1px solid #e5e5ea',
                  fontSize: '1rem',
                  backgroundColor: (isLoading || isSaving || field.disabled) ? '#f2f2f7' : '#fff',
                }
              };

              switch (field.type) {
                case 'multiselect':
                  return <select {...commonProps} multiple value={formData[field.name] || []} size={5}>
                           {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                         </select>;
                case 'select':
                  return <select {...commonProps} value={formData[field.name] ?? ''}>
                           <option value="">Seleziona...</option>
                           {field.options?.map(opt => <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>)}
                         </select>;
                case 'textarea':
                  return <textarea {...commonProps} value={formData[field.name] ?? ''} rows={field.rows || 3} />;
                case 'checkbox':
                  return <input {...commonProps} type="checkbox" checked={!!formData[field.name]} style={{ ...commonProps.style, width: 'auto' }} />;
                default:
                  return <input {...commonProps} type={field.type || 'text'} value={formData[field.name] ?? ''} />;
              }
            })()
          )}

          {allErrors[field.name] && <p style={{ color: '#d32f2f', fontSize: '0.8rem', marginTop: '4px' }}>{allErrors[field.name]}</p>}
          {field.name === 'site_id' && extraBelowSite}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e5ea' }}>
        {isEditing ? (
          <>
            <button type="button" onClick={onCancel} disabled={isSaving} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e5ea', backgroundColor: '#fff', cursor: 'pointer' }}>Annulla</button>
            <button type="submit" disabled={isSaving || isLoading} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: '#fff', cursor: 'pointer', opacity: (isSaving || isLoading) ? 0.7 : 1 }}>{isSaving ? 'Salvataggio...' : 'Salva'}</button>
          </>
        ) : (
          <>
            {onDelete && <button type="button" onClick={handleDelete} disabled={isSaving || isLoading} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: deleteConfirm ? '#ff3b30' : '#f2f2f7', color: deleteConfirm ? '#fff' : '#333', cursor: 'pointer', transition: 'background-color 0.3s' }}>{deleteConfirm ? 'Conferma' : 'Elimina'}</button>}
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSetIsEditing(true); }} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: '#fff', cursor: 'pointer' }}>Modifica</button>
          </>
        )}
      </div>
    </form>
  );
}
