"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { FiArrowLeft, FiEdit, FiTrash2, FiSave, FiX, FiTruck, FiFileText } from "react-icons/fi";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";
import VehicleDocumentSection from "../../../components/VehicleDocumentSection";

export default function VeicoloDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [veicolo, setVeicolo] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState(0);

  const veicoloId = params.id;
  const canEdit = true; // Permetti modifica a tutti gli utenti autenticati

  // Campi completi del form veicolo
  const veicoloFields = [
    { name: 'plate', label: 'Targa', required: true },
    { name: 'imei', label: 'IMEI dispositivo MOMAP', placeholder: 'Inserisci IMEI (opzionale)' },
    { name: 'nome', label: 'Nome veicolo' },
    { name: 'brand', label: 'Marca', required: true },
    { name: 'model', label: 'Modello', required: true },
    { name: 'year', label: 'Anno', type: 'number' },
    { name: 'type', label: 'Tipo Veicolo', type: 'select', options: [
      { value: 'Auto', label: 'Auto' },
      { value: 'Furgone', label: 'Furgone' },
      { value: 'Camion', label: 'Camion' },
      { value: 'Moto', label: 'Moto' },
      { value: 'Altro', label: 'Altro' }
    ]},
    { name: 'fuel_type', label: 'Carburante', type: 'select', options: [
      { value: 'Benzina', label: 'Benzina' },
      { value: 'Diesel', label: 'Diesel' },
      { value: 'GPL', label: 'GPL' },
      { value: 'Metano', label: 'Metano' },
      { value: 'Elettrico', label: 'Elettrico' },
      { value: 'Ibrido', label: 'Ibrido' }
    ]},
    { name: 'color', label: 'Colore' },
    { name: 'odometer', label: 'Chilometraggio', type: 'number' },
    { name: 'engine_hours', label: 'Ore motore', type: 'number' },
    { name: 'max_load', label: 'Portata max', type: 'number' },
    { name: 'chassis_number', label: 'Numero telaio' },
    { name: 'vin_code', label: 'VIN' },
    { name: 'engine_capacity', label: 'Cilindrata' },
    { name: 'engine_code', label: 'Codice motore' },
    { name: 'engine_serial_number', label: 'Matricola motore' },
    { name: 'fiscal_horsepower', label: 'Cavalli fiscali' },
    { name: 'power_kw', label: 'Potenza kW', type: 'number' },
    { name: 'registration_number', label: 'Numero immatricolazione' },
    { name: 'euro_classification', label: 'Classe Euro' },
    { name: 'gruppi', label: 'Gruppi' },
    { name: 'autista_assegnato', label: 'Autista assegnato' },
    { name: 'first_registration_date', label: 'Data prima immatricolazione', type: 'date' },
    { name: 'ownership', label: 'Proprietà' },
    { name: 'current_profitability', label: 'Redditività attuale' },
    { name: 'contract_holder', label: 'Intestatario contratto' },
    { name: 'ownership_type', label: 'Tipo proprietà' },
    { name: 'rental_type', label: 'Tipo noleggio' },
    { name: 'advance_paid', label: 'Anticipo pagato', type: 'number' },
    { name: 'final_installment', label: 'Maxi rata', type: 'number' },
    { name: 'monthly_fee', label: 'Canone mensile', type: 'number' },
    { name: 'contract_start_date', label: 'Inizio contratto', type: 'date' },
    { name: 'contract_end_date', label: 'Fine contratto', type: 'date' },
    { name: 'monthly_alert', label: 'Allerta mensile' },
    { name: 'end_alert', label: 'Allerta fine' },
    { name: 'installment_payment_day', label: 'Giorno rata' },
    { name: 'supplier', label: 'Fornitore' },
    { name: 'collection_date', label: 'Data ritiro', type: 'date' },
    { name: 'contract_duration_months', label: 'Durata contratto (mesi)', type: 'number' },
    { name: 'contract_kilometers', label: 'Km contratto', type: 'number' },
    { name: 'invoice_amount_excl_vat', label: 'Fattura (IVA escl.)', type: 'number' },
    { name: 'invoice_amount_incl_vat', label: 'Fattura (IVA incl.)', type: 'number' },
    { name: 'contract_equipment', label: 'Dotazioni contratto', type: 'textarea' },
    { name: 'front_tire_size', label: 'Misura gomme anteriori' },
    { name: 'rear_tire_size', label: 'Misura gomme posteriori' },
    { name: 'tomtom', label: 'TomTom' },
    { name: 'tires', label: 'Gomme' },
    { name: 'returned_or_redeemed', label: 'Restituito/Riscattato' },
    { name: 'link', label: 'Link esterno', type: 'textarea' },
    { name: 'status', label: 'Stato', type: 'select', options: [
      { value: 'operational', label: 'Operativo' },
      { value: 'maintenance', label: 'In manutenzione' },
      { value: 'decommissioned', label: 'Disattivato' },
    ]},
    { name: 'notes', label: 'Note', type: 'textarea' },
    { name: 'purchase_date', label: 'Data Acquisto', type: 'date' },
    { name: 'purchase_price', label: 'Prezzo Acquisto', type: 'number' },
  ];

  // Suddivisione tab logiche per i dettagli veicolo
  const tabGroups = [
    {
      label: 'Generale',
      fields: veicoloFields.filter(f => [
        'plate','imei','nome','brand','model','year','type','fuel_type','status','color','gruppi','autista_assegnato','notes'
      ].includes(f.name))
    },
    {
      label: 'Motore/Telaio',
      fields: veicoloFields.filter(f => [
        'vin_code','engine_capacity','engine_code','engine_serial_number','fiscal_horsepower','power_kw','chassis_number','odometer','engine_hours','max_load','front_tire_size','rear_tire_size','tomtom','tires'
      ].includes(f.name))
    },
    {
      label: 'Amministrativi',
      fields: veicoloFields.filter(f => [
        'registration_number','euro_classification','ownership','current_profitability','supplier','collection_date','first_registration_date','purchase_date','purchase_price','link'
      ].includes(f.name))
    },
    {
      label: 'Contratto/Noleggio',
      fields: veicoloFields.filter(f => [
        'contract_holder','ownership_type','rental_type','advance_paid','final_installment','monthly_fee','contract_start_date','contract_end_date','contract_duration_months','contract_kilometers','invoice_amount_excl_vat','invoice_amount_incl_vat','contract_equipment','returned_or_redeemed'
      ].includes(f.name))
    },
    {
      label: 'Documenti',
      fields: [], // Tab speciale per documenti
      isDocuments: true
    }
  ];

  useEffect(() => {
    if (veicoloId) {
      fetchVeicolo();
    }
  }, [veicoloId]);

  const fetchVeicolo = async () => {
    setFetching(true);
    setError("");
    
    try {
      console.log('🚗 Caricamento veicolo:', veicoloId);
      
      const response = await api.get(`/vehicles/${veicoloId}`);
      const veicoloData = response.data;
      
      console.log('✅ Veicolo caricato:', veicoloData);
      
      setVeicolo(veicoloData);
      setFormData(veicoloData);
      
    } catch (err) {
      console.error('❌ Errore caricamento veicolo:', err);
      
      const errorMsg = err.response?.data?.message || err.message || 'Errore durante il caricamento del veicolo';
      setError(errorMsg);
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!canEdit) {
      alert('Non hai i permessi per modificare veicoli');
      return;
    }

    // Validazione campi obbligatori
    if (!formData.plate?.trim()) {
      alert('La targa è obbligatoria');
      return;
    }
    if (!formData.brand?.trim()) {
      alert('La marca è obbligatoria');
      return;
    }
    if (!formData.model?.trim()) {
      alert('Il modello è obbligatorio');
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      console.log('🚗 Aggiornamento veicolo:', veicoloId, formData);
      
      // IMPORTANTE: Non aggiungere Authorization header per sessione Sanctum
      const response = await api.put(`/vehicles/${veicoloId}`, formData);
      
      console.log('✅ Veicolo aggiornato:', response.data);
      
      setVeicolo(response.data);
      setIsEditing(false);
      alert('Veicolo aggiornato con successo!');
      
    } catch (err) {
      console.error('❌ Errore aggiornamento veicolo:', err);
      
      const errorMsg = err.response?.data?.message || err.message || 'Errore durante l\'aggiornamento del veicolo';
      setError(errorMsg);
      alert(`Errore: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit) {
      alert('Non hai i permessi per eliminare veicoli');
      return;
    }

    const confirmDelete = confirm(
      `Sei sicuro di voler eliminare il veicolo "${veicolo?.plate || veicolo?.nome}"?\n\nQuesta azione non può essere annullata.`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    setError("");

    try {
      console.log('🗑️ Eliminazione veicolo:', veicoloId);
      
      // IMPORTANTE: Non aggiungere Authorization header per sessione Sanctum
      await api.delete(`/vehicles/${veicoloId}`);
      
      console.log('✅ Veicolo eliminato con successo');
      
      alert('Veicolo eliminato con successo!');
      router.push('/veicoli');
      
    } catch (err) {
      console.error('❌ Errore eliminazione veicolo:', err);
      
      const errorMsg = err.response?.data?.message || err.message || 'Errore durante l\'eliminazione del veicolo';
      setError(errorMsg);
      alert(`Errore: ${errorMsg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData(veicolo);
    setIsEditing(false);
    setError("");
  };

  if (loading || fetching) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div>Caricamento veicolo...</div>
      </div>
    );
  }

  if (error && !veicolo) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>
        <div>Errore: {error}</div>
        <button 
          onClick={() => router.push('/veicoli')}
          style={{ marginTop: 20, padding: '10px 20px' }}
        >
          Torna ai Veicoli
        </button>
      </div>
    );
  }

  if (!veicolo) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div>Veicolo non trovato</div>
        <button 
          onClick={() => router.push('/veicoli')}
          style={{ marginTop: 20, padding: '10px 20px' }}
        >
          Torna ai Veicoli
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <PageHeader 
        title={`Veicolo ${veicolo.plate || veicolo.nome || `#${veicolo.id}`}`}
        subtitle={`${veicolo.brand || ''} ${veicolo.model || ''} ${veicolo.year ? `(${veicolo.year})` : ''}`.trim()}
        icon={<FiTruck />}
        actions={[
          {
            label: "Torna ai Veicoli",
            onClick: () => router.push('/veicoli'),
            icon: <FiArrowLeft />,
            variant: "secondary"
          },
          ...(canEdit ? [
            ...(isEditing ? [
              {
                label: "Annulla",
                onClick: handleCancelEdit,
                icon: <FiX />,
                variant: "secondary"
              },
              {
                label: isSaving ? "Salvando..." : "Salva",
                onClick: handleSave,
                icon: <FiSave />,
                variant: "primary",
                disabled: isSaving
              }
            ] : [
              {
                label: "Modifica",
                onClick: () => setIsEditing(true),
                icon: <FiEdit />,
                variant: "primary"
              },
              {
                label: isDeleting ? "Eliminando..." : "Elimina",
                onClick: handleDelete,
                icon: <FiTrash2 />,
                variant: "danger",
                disabled: isDeleting
              }
            ])
          ] : [])
        ]}
      />

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: 15,
          marginTop: 20,
          color: '#dc2626'
        }}>
          <strong>Errore:</strong> {error}
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        {/* Tab Navigation */}
        <div style={{
          background: '#fff',
          borderRadius: '8px 8px 0 0',
          border: '1px solid #e5e7eb',
          borderBottom: 'none'
        }}>
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e5e7eb'
          }}>
            {tabGroups.map((tab, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                style={{
                  padding: '15px 25px',
                  border: 'none',
                  background: activeTab === index ? '#f3f4f6' : 'transparent',
                  borderBottom: activeTab === index ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  fontWeight: activeTab === index ? 'bold' : 'normal',
                  color: activeTab === index ? '#1f2937' : '#6b7280',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ 
          background: '#fff', 
          borderRadius: '0 0 8px 8px', 
          padding: 30, 
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 25, color: '#1f2937' }}>
            {tabGroups[activeTab]?.isDocuments ? '📄' : '🚗'} {tabGroups[activeTab]?.label}
          </h3>
          
          {tabGroups[activeTab]?.isDocuments ? (
            // Tab Documenti
            <div>
              <VehicleDocumentSection veicoloId={veicoloId} categoria="assicurazione" />
              <VehicleDocumentSection veicoloId={veicoloId} categoria="bollo" />
              <VehicleDocumentSection veicoloId={veicoloId} categoria="manutenzione" />
            </div>
          ) : isEditing ? (
            // Modalità modifica
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: 20 
            }}>
              {tabGroups[activeTab]?.fields.map((field) => (
                <div key={field.name} style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ 
                    marginBottom: 8, 
                    fontWeight: 'bold', 
                    color: '#374151',
                    fontSize: '14px'
                  }}>
                    {field.label}
                    {field.required && <span style={{ color: '#dc2626' }}>*</span>}
                  </label>
                  
                  {field.type === 'select' ? (
                    <select
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleInputChange}
                      style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: '#fff'
                      }}
                    >
                      <option value="">Seleziona...</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleInputChange}
                      placeholder={field.placeholder}
                      rows={4}
                      style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleInputChange}
                      placeholder={field.placeholder}
                      style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Modalità visualizzazione
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: 20 
            }}>
              {tabGroups[activeTab]?.fields.map((field) => {
                const value = veicolo[field.name];
                const displayValue = field.type === 'select' 
                  ? field.options?.find(opt => opt.value === value)?.label || value
                  : field.type === 'date' && value
                  ? new Date(value).toLocaleDateString('it-IT')
                  : field.type === 'number' && value
                  ? Number(value).toLocaleString('it-IT')
                  : value;
                
                return (
                  <div key={field.name}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      color: '#374151', 
                      marginBottom: 4,
                      fontSize: '14px'
                    }}>
                      {field.label}
                    </div>
                    <div style={{ 
                      color: '#6b7280', 
                      fontSize: '14px',
                      minHeight: '20px',
                      whiteSpace: field.type === 'textarea' ? 'pre-wrap' : 'normal'
                    }}>
                      {displayValue || 'N/A'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
