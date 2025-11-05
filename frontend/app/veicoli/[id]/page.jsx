"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiEdit, FiTrash2, FiSave, FiX, FiTruck, FiFileText, FiMapPin } from "react-icons/fi";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";
import VehicleDocumentSection from "../../../components/VehicleDocumentSection";
import VehicleRentalsSection from "../../../components/VehicleRentalsSection";
import VehiclePhotoSection from "../../../components/VehiclePhotoSection";
import VehicleMomapMap from "../../../components/VehicleMomapMap";

export default function VeicoloDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
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
      fields: [], // Tab speciale per storico contratti
      isRentals: true
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

  // Gestisci il parametro tab dall'URL
  useEffect(() => {
    if (searchParams) {
      const tabParam = searchParams.get('tab');
      if (tabParam === 'documenti') {
        const documentiTabIndex = tabGroups.findIndex(tab => tab.isDocuments);
        if (documentiTabIndex !== -1) {
          setActiveTab(documentiTabIndex);
        }
      } else if (tabParam === 'noleggi' || tabParam === 'rentals') {
        const rentalsTabIndex = tabGroups.findIndex(tab => tab.isRentals);
        if (rentalsTabIndex !== -1) {
          setActiveTab(rentalsTabIndex);
        }
      }
    }
  }, [searchParams]);

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

  const handlePhotoUpdate = (newPhoto) => {
    setVeicolo(prev => ({ ...prev, photo: newPhoto }));
    setFormData(prev => ({ ...prev, photo: newPhoto }));
  };

  if (loading || fetching) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          width: 40,
          height: 40,
          border: '4px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ marginTop: 16, color: '#6b7280' }}>Caricamento veicolo...</div>
      </div>
    );
  }

  if (error && !veicolo) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: '#dc2626', fontSize: 18, marginBottom: 20 }}>Errore: {error}</div>
        <button 
          onClick={() => router.push('/veicoli')}
          style={{
            padding: '12px 24px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500
          }}
        >
          Torna ai Veicoli
        </button>
      </div>
    );
  }

  if (!veicolo) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 18, marginBottom: 20 }}>Veicolo non trovato</div>
        <button 
          onClick={() => router.push('/veicoli')}
          style={{
            padding: '12px 24px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500
          }}
        >
          Torna ai Veicoli
        </button>
      </div>
    );
  }

  const statusColors = {
    operational: { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
    maintenance: { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
    decommissioned: { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' }
  };

  const statusLabels = {
    operational: 'Operativo',
    maintenance: 'In manutenzione',
    decommissioned: 'Disattivato'
  };

  const statusColor = statusColors[veicolo.status] || statusColors.operational;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header con card migliorata */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 16,
        padding: 32,
        marginBottom: 24,
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        color: '#fff'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 24
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12
            }}>
              <FiTruck style={{ fontSize: 32 }} />
              <h1 style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 700
              }}>
                {veicolo.plate || veicolo.nome || `Veicolo #${veicolo.id}`}
              </h1>
              <span style={{
                padding: '6px 12px',
                background: statusColor.bg,
                color: statusColor.text,
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${statusColor.border}`
              }}>
                {statusLabels[veicolo.status] || veicolo.status}
              </span>
            </div>
            <p style={{
              margin: 0,
              fontSize: 18,
              opacity: 0.9
            }}>
              {veicolo.brand || ''} {veicolo.model || ''} {veicolo.year ? `(${veicolo.year})` : ''}
            </p>
            {veicolo.color && (
              <p style={{
                margin: '8px 0 0 0',
                fontSize: 14,
                opacity: 0.8
              }}>
                Colore: {veicolo.color}
              </p>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => router.push('/veicoli')}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <FiArrowLeft /> Torna ai Veicoli
            </button>
            {canEdit && (
              <>
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      style={{
                        padding: '10px 20px',
                        background: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <FiX /> Annulla
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      style={{
                        padding: '10px 20px',
                        background: '#fff',
                        color: '#667eea',
                        border: 'none',
                        borderRadius: 8,
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        opacity: isSaving ? 0.6 : 1
                      }}
                    >
                      <FiSave /> {isSaving ? 'Salvando...' : 'Salva'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        padding: '10px 20px',
                        background: '#fff',
                        color: '#667eea',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <FiEdit /> Modifica
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      style={{
                        padding: '10px 20px',
                        background: 'rgba(220, 38, 38, 0.9)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        opacity: isDeleting ? 0.6 : 1
                      }}
                    >
                      <FiTrash2 /> {isDeleting ? 'Eliminando...' : 'Elimina'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          color: '#dc2626',
          fontSize: 14
        }}>
          <strong>Errore:</strong> {error}
        </div>
      )}

      {/* Sezione Foto e Mappa */}
      {!isEditing && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 24,
          marginBottom: 24
        }}>
          <VehiclePhotoSection
            vehicleId={veicoloId}
            currentPhoto={veicolo.photo}
            onPhotoUpdate={handlePhotoUpdate}
          />
          
          {veicolo.imei && veicolo.imei.length >= 5 && (
            <VehicleMomapMap
              vehicleId={veicoloId}
              imei={veicolo.imei}
            />
          )}
        </div>
      )}

      {/* Tab Navigation migliorata */}
      <div style={{
        background: '#fff',
        borderRadius: '12px 12px 0 0',
        border: '1px solid #e5e7eb',
        borderBottom: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #e5e7eb',
          overflowX: 'auto'
        }}>
          {tabGroups.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              style={{
                padding: '16px 28px',
                border: 'none',
                background: activeTab === index ? '#f8fafc' : 'transparent',
                borderBottom: activeTab === index ? '3px solid #3b82f6' : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === index ? 600 : 500,
                color: activeTab === index ? '#1f2937' : '#6b7280',
                fontSize: '15px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                position: 'relative'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content migliorata */}
      <div style={{ 
        background: '#fff', 
        borderRadius: '0 0 12px 12px', 
        padding: 32, 
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        minHeight: '400px'
      }}>
        {tabGroups[activeTab]?.isRentals ? (
          <VehicleRentalsSection veicoloId={veicoloId} canEdit={canEdit} />
        ) : tabGroups[activeTab]?.isDocuments ? (
          <div>
            <VehicleDocumentSection veicoloId={veicoloId} categoria="assicurazione" />
            <VehicleDocumentSection veicoloId={veicoloId} categoria="bollo" />
            <VehicleDocumentSection veicoloId={veicoloId} categoria="manutenzione" />
            <VehicleDocumentSection veicoloId={veicoloId} categoria="libretto_circolazione" />
            <VehicleDocumentSection veicoloId={veicoloId} categoria="autorizzazione_albo" />
            <VehicleDocumentSection veicoloId={veicoloId} categoria="altri_documenti" />
          </div>
        ) : isEditing ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: 24 
          }}>
            {tabGroups[activeTab]?.fields.map((field) => (
              <div key={field.name} style={{
                display: 'flex',
                flexDirection: 'column'
              }}>
                <label style={{ 
                  marginBottom: 8, 
                  fontWeight: 600, 
                  color: '#374151',
                  fontSize: '14px'
                }}>
                  {field.label}
                  {field.required && <span style={{ color: '#dc2626', marginLeft: 4 }}>*</span>}
                </label>
                
                {field.type === 'select' ? (
                  <select
                    name={field.name}
                    value={formData[field.name] || ''}
                    onChange={handleInputChange}
                    style={{
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#fff',
                      transition: 'border-color 0.2s'
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
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical',
                      fontFamily: 'inherit'
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
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'border-color 0.2s'
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: 24 
          }}>
            {tabGroups[activeTab]?.fields.map((field) => {
              const value = veicolo[field.name];
              const displayValue = field.type === 'select' 
                ? field.options?.find(opt => opt.value === value)?.label || value
                : field.type === 'date' && value
                ? new Date(value).toLocaleDateString('it-IT')
                : field.type === 'number' && value !== null && value !== undefined
                ? Number(value).toLocaleString('it-IT')
                : value;
              
              return (
                <div key={field.name} style={{
                  padding: '16px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ 
                    fontWeight: 600, 
                    color: '#374151', 
                    marginBottom: 8,
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {field.label}
                  </div>
                  <div style={{ 
                    color: '#1f2937', 
                    fontSize: '15px',
                    minHeight: '24px',
                    whiteSpace: field.type === 'textarea' ? 'pre-wrap' : 'normal',
                    fontWeight: 500
                  }}>
                    {displayValue || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
