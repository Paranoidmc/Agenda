"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiSave, FiTruck } from "react-icons/fi";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";

export default function NewVeicoloPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [formData, setFormData] = useState({
    plate: '',
    imei: '',
    nome: '',
    brand: '',
    model: '',
    year: '',
    type: 'Auto',
    fuel_type: 'Benzina',
    color: '',
    odometer: '',
    engine_hours: '',
    max_load: '',
    notes: ''
  });
  const [activeTab, setActiveTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const canEdit = user?.role === 'admin';

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
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!canEdit) {
      alert('Non hai i permessi per creare veicoli');
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
      console.log('🚗 Creazione nuovo veicolo:', formData);
      
      const response = await api.post('/vehicles', formData);
      
      console.log('✅ Veicolo creato con successo:', response.data);
      
      alert('Veicolo creato con successo!');
      router.push('/veicoli');
      
    } catch (err) {
      console.error('❌ Errore creazione veicolo:', err);
      
      const errorMsg = err.response?.data?.message || err.message || 'Errore durante la creazione del veicolo';
      setError(errorMsg);
      alert(`Errore: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div>Caricamento...</div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>
        <div>Non hai i permessi per creare veicoli</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <PageHeader 
        title="Nuovo Veicolo"
        subtitle="Aggiungi un nuovo veicolo alla flotta"
        icon={<FiTruck />}
        actions={[
          {
            label: "Torna ai Veicoli",
            onClick: () => router.push('/veicoli'),
            icon: <FiArrowLeft />,
            variant: "secondary"
          },
          {
            label: isSaving ? "Salvando..." : "Salva Veicolo",
            onClick: handleSave,
            icon: <FiSave />,
            variant: "primary",
            disabled: isSaving
          }
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
            🚗 {tabGroups[activeTab]?.label}
          </h3>
          
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

          <div style={{ 
            marginTop: 30, 
            paddingTop: 20, 
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: 15,
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => router.push('/veicoli')}
              style={{
                padding: '12px 24px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: '#fff',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                background: isSaving ? '#9ca3af' : '#059669',
                color: '#fff',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <FiSave />
              {isSaving ? 'Salvando...' : 'Salva Veicolo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
