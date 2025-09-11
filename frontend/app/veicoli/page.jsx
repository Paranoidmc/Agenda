"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import SidePanel from "../../components/SidePanel";
import EntityForm from "../../components/EntityForm";
import PageHeader from "../../components/PageHeader";
import TabPanel from "../../components/TabPanel";
import ActivityList from "../../components/ActivityList";
import DeadlineList from "../../components/DeadlineList";
import DataTable from "../../components/DataTable";
import VehicleDocumentSection from "../../components/VehicleDocumentSection";

export default function VeicoliPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [veicoli, setVeicoli] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [selectedVeicolo, setSelectedVeicolo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableWidth, setTableWidth] = useState('100%');
  const [activities, setActivities] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingDeadlines, setLoadingDeadlines] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const canEdit = user?.role === 'admin';

  // Campi del form veicolo - allineati alla migration e al model
  const veicoloFields = [
    { name: 'plate', label: 'Targa', required: true },
    { name: 'imei', label: 'IMEI dispositivo MOMAP', placeholder: 'Inserisci IMEI (opzionale)' },
    { name: 'nome', label: 'Nome veicolo' }, // Modificato da 'name' a 'nome'
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
    { name: 'gruppi', label: 'Gruppi' }, // Modificato da 'groups' a 'gruppi'
    { name: 'autista_assegnato', label: 'Autista assegnato' }, // Modificato da 'assigned_driver' a 'autista_assegnato'
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

  useEffect(() => {
    if (!loading && user) {
      loadVeicoli();
    } else if (!loading && !user) {
      // Se non c'è un utente e non sta caricando, imposta fetching a false
      setFetching(false);
    }
  }, [user, loading, dataVersion]);
  
  // Effetto per ricaricare i dati quando cambiano pagina o elementi per pagina
  useEffect(() => {
    if (!loading && user) {
      loadVeicoliWithSearch(searchTerm);
    }
  }, [currentPage, perPage]);

  // Effetto per animare la tabella quando il pannello si apre/chiude
  useEffect(() => {
    if (isPanelOpen) {
      // Riduci la larghezza della tabella con un ritardo per l'animazione
      setTimeout(() => {
        setTableWidth('60%');
      }, 50);
    } else {
      // Ripristina la larghezza della tabella
      setTableWidth('100%');
    }
  }, [isPanelOpen]);

  const loadVeicoli = async () => {
    await loadVeicoliWithSearch(searchTerm);
  };
  
  const loadVeicoliWithSearch = async (searchTermParam = '', resetPage = false) => {
    setFetching(true);
    setError("");
    
    // Se è una nuova ricerca, reset alla pagina 1
    const pageToUse = resetPage ? 1 : currentPage;
    if (resetPage && currentPage !== 1) {
      setCurrentPage(1);
    }
    
    try {
      const params = new URLSearchParams({
        page: pageToUse.toString(),
        perPage: perPage.toString()
      });
      
      if (searchTermParam && searchTermParam.trim()) {
        params.append('search', searchTermParam.trim());
      }
      
      console.log('🔍 Caricamento veicoli:', {
        page: pageToUse,
        perPage,
        search: searchTermParam,
        resetPage,
        url: `/vehicles?${params.toString()}`
      });
      
      const response = await api.get(`/vehicles?${params.toString()}`);
      
      console.log('📄 Risposta API veicoli:', response.data);
      
      if (response.data && response.data.data) {
        setVeicoli(response.data.data);
        setTotal(response.data.total || 0);
      } else {
        console.warn('⚠️ Struttura risposta inaspettata:', response.data);
        setVeicoli([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("❌ Errore nel caricamento dei veicoli:", err);
      if (err.response && err.response.status === 401) {
        setError("Sessione scaduta. Effettua nuovamente il login.");
      } else {
        setError("Errore nel caricamento dei veicoli.");
      }
      setVeicoli([]);
      setTotal(0);
    } finally {
      setFetching(false);
    }
  };
  
  // Funzione per gestire la ricerca con debounce (chiamata dal DataTable)
  const handleSearchChange = (newTerm) => {
    // NON aggiornare searchTerm o currentPage qui per evitare re-render
    // setSearchTerm(newTerm);
    // setCurrentPage(1);
    
    // Chiama loadVeicoli direttamente con il nuovo termine e reset pagina
    if (!loading && user) {
      loadVeicoliWithSearch(newTerm, true); // true = reset pagina
    }
  };

  const handleViewDetails = (veicolo) => {
    setSelectedVeicolo(veicolo);
    setIsEditing(false);
    setIsPanelOpen(true);
    
    // Carica le attività e le scadenze per questo veicolo
    loadActivities(veicolo.id);
    loadDeadlines(veicolo.id);
  };
  
  const loadActivities = async (vehicleId) => {
    if (!vehicleId) return;
    
    setLoadingActivities(true);
    try {
      // Ottieni il token da localStorage se disponibile
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      // Usa la rotta standard
      const response = await api.get(`/vehicles/${vehicleId}/activities`, {
        withCredentials: true,
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      // Gestione robusta della risposta: ordina solo se array
      let activitiesArr = Array.isArray(response.data) ? response.data : (Array.isArray(response.data.data) ? response.data.data : []);
      if (Array.isArray(activitiesArr)) {
        activitiesArr = [...activitiesArr].sort((a, b) => (a.data_inizio && b.data_inizio ? new Date(b.data_inizio) - new Date(a.data_inizio) : 0));
      }
      setActivities(activitiesArr);
    } catch (err) {
      console.error("Errore nel caricamento delle attività:", err);
    } finally {
      setLoadingActivities(false);
    }
  };
  
  const loadDeadlines = async (vehicleId) => {
    if (!vehicleId) return;
    
    setLoadingDeadlines(true);
    try {
      // Ottieni il token da localStorage se disponibile
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      // Usa la rotta standard
      const response = await api.get(`/vehicles/${vehicleId}/deadlines`, {
        withCredentials: true,
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      // Gestione robusta della risposta: ordina solo se array
      let deadlinesArr = Array.isArray(response.data) ? response.data : (Array.isArray(response.data.data) ? response.data.data : []);
      if (Array.isArray(deadlinesArr)) {
        deadlinesArr = [...deadlinesArr].sort((a, b) => {
          if (a.scadenza && b.scadenza) {
            return new Date(a.scadenza) - new Date(b.scadenza);
          }
          return 0;
        });
      }
      setDeadlines(deadlinesArr);
    } catch (err) {
      console.error("Errore nel caricamento delle scadenze:", err);
    } finally {
      setLoadingDeadlines(false);
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    // Reset dello stato dopo che l'animazione di chiusura è completata
    setTimeout(() => {
      setSelectedVeicolo(null);
      setIsEditing(false);
    }, 300);
  };

  const handleSaveVeicolo = async (formData) => {
    setIsSaving(true);
    try {
      // Ottieni il token da localStorage se disponibile
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      let response;
      if (formData.id) {
        response = await api.put(`/vehicles/${formData.id}`, formData, {
          withCredentials: true
        });
      } else {
        response = await api.post('/vehicles', formData, {
          withCredentials: true
        });
      }
      
      setDataVersion(v => v + 1);
      setIsEditing(false);
      handleClosePanel();
      
      const message = formData.id ? 'Veicolo aggiornato con successo!' : 'Veicolo creato con successo!';
      if (typeof showToast === 'function') {
        showToast(message, 'success');
      } else {
        alert(message);
      }

    } catch (err) {
      console.error("Errore durante il salvataggio del veicolo:", err);
      setIsEditing(true); // Mantiene il form aperto per correzioni
      let errorMessage = "Si è verificato un errore durante il salvataggio. Riprova più tardi.";
      if (err.response && err.response.data && err.response.data.errors) {
          const validationErrors = Object.values(err.response.data.errors).flat().join('\n');
          errorMessage = `Errori di validazione:\n${validationErrors}`;
      } else if (err.response && err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
      }
      
      if (typeof showToast === 'function') {
        showToast(errorMessage, 'error');
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVeicolo = async (id) => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/vehicles/${id}`, {
        withCredentials: true
      });
      
      setDataVersion(v => v + 1);
      handleClosePanel();
    } catch (err) {
      console.error("Errore durante l'eliminazione:", err);
      alert("Si è verificato un errore durante l'eliminazione. Riprova più tardi.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedVeicolo({});
    setIsEditing(true);
    setIsPanelOpen(true);
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title="Veicoli" 
        buttonLabel={canEdit ? "Nuovo Veicolo" : ""}
        onAddClick={canEdit ? handleCreateNew : null} 
      />
      <div 
        style={{ 
          transition: 'width 0.3s ease-in-out',
          width: tableWidth,
          overflow: 'hidden'
        }}
      >
        <DataTable 
          data={veicoli}
          columns={[
            { 
              key: 'plate', 
              label: 'Targa'
            },
            { 
              key: 'brand', 
              label: 'Marca'
            },
            { 
              key: 'model', 
              label: 'Modello'
            },
            { 
              key: 'year', 
              label: 'Anno'
            },
            {
              key: 'imei',
              label: 'IMEI MOMAP',
              render: (item) => item.imei || <span style={{color:'#bbb'}}>—</span>
            },
            { 
              key: 'type', 
              label: 'Tipo'
            },
            { 
              key: 'fuel_type', 
              label: 'Carburante'
            },
            { 
              key: 'odometer', 
              label: 'KM'
            },
            {
              key: 'actions', 
              label: 'Azioni',
              render: (item) => (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(item);
                  }}
                  style={{ 
                    background: 'var(--primary)', 
                    color: '#fff', 
                    borderRadius: 6, 
                    padding: '0.4em 1em', 
                    fontSize: 14,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Dettagli
                </button>
              )
            }
          ]}
          // Server-side search e paginazione
          serverSide={true}
          currentPage={currentPage}
          totalItems={total}
          itemsPerPage={perPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPerPage}
          onSearchTermChange={handleSearchChange}
          loading={fetching}
          // Props per filtri client-side (disabilitati per server-side)
          filterableColumns={[]}
          onRowClick={handleViewDetails}
          selectedRow={selectedVeicolo}
          searchPlaceholder="Cerca veicoli..."
          emptyMessage="Nessun veicolo trovato"
          defaultVisibleColumns={['plate', 'brand', 'model', 'year', 'imei', 'fuel_type', 'actions']}
        />
      </div>

      {/* Pannello laterale per i dettagli */}
      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={handleClosePanel} 
        title={isEditing ? "Modifica Veicolo" : "Dettagli Veicolo"}
      >
        {selectedVeicolo && (
          <TabPanel 
            tabs={[
              ...tabGroups.map((tab, idx) => ({
                id: `tab-${idx}`,
                label: tab.label,
                content: (
                  <EntityForm
                    data={selectedVeicolo}
                    fields={tab.fields}
                    onSave={canEdit ? handleSaveVeicolo : null}
                    onDelete={idx === 0 && canEdit ? handleDeleteVeicolo : undefined}
                    isEditing={isEditing}
                    setIsEditing={canEdit ? setIsEditing : () => {}}
                    isLoading={isSaving || isDeleting}
                  />
                )
              })),
              {
                id: 'activities',
                label: 'Attività',
                content: <ActivityList activities={activities} isLoading={loadingActivities} />
              },
              {
                id: 'deadlines',
                label: 'Scadenze',
                content: <DeadlineList deadlines={deadlines} isLoading={loadingDeadlines} />
              },
              {
                id: 'documents',
                label: 'Documenti',
                content: (
                  <div>
                    <VehicleDocumentSection veicoloId={selectedVeicolo.id} categoria="bollo" />
                    <VehicleDocumentSection veicoloId={selectedVeicolo.id} categoria="assicurazione" />
                    <VehicleDocumentSection veicoloId={selectedVeicolo.id} categoria="manutenzione" />
                  </div>
                )

              },
              {
                id: 'deadlines',
                label: 'Scadenze',
                count: deadlines.length,
                content: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ margin: 0 }}>Scadenze del veicolo</h3>
                      <button
                        onClick={() => router.push(`/scadenze/new?vehicle_id=${selectedVeicolo.id}`)}
                        style={{ 
                          background: 'var(--primary)', 
                          color: '#fff', 
                          borderRadius: 6, 
                          padding: '0.4em 1em', 
                          fontSize: 14,
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Nuova Scadenza
                      </button>
                    </div>
                    
                    {loadingDeadlines ? (
                      <div>Caricamento scadenze...</div>
                    ) : (
                      <DeadlineList 
                        deadlines={deadlines} 
                        onDeadlineClick={(deadline) => router.push(`/scadenze/${deadline.id}`)}
                      />
                    )}
                  </div>
                )
              },
              {
                id: 'activities',
                label: 'Attività',
                count: activities.length,
                content: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ margin: 0 }}>Attività del veicolo</h3>
                      <button
                        onClick={() => router.push(`/attivita/new?vehicle_id=${selectedVeicolo.id}`)}
                        style={{ 
                          background: 'var(--primary)', 
                          color: '#fff', 
                          borderRadius: 6, 
                          padding: '0.4em 1em', 
                          fontSize: 14,
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Nuova Attività
                      </button>
                    </div>
                    
                    {loadingActivities ? (
                      <div>Caricamento attività...</div>
                    ) : (
                      <ActivityList 
                        vehicleId={selectedVeicolo.id} 
                        onActivityClick={(activity) => router.push(`/attivita?open=${activity.id}`)}
                      />
                    )}
                  </div>
                )
              }
            ]}
            defaultTab="tab-0"
          />
        )}
      </SidePanel>
    </div>
  );
}