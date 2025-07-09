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
import DataTable from "../../components/DataTable";

export default function AutistiPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  // Stato principale (PRIMA di ogni useEffect!)
  const [autisti, setAutisti] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [selectedAutista, setSelectedAutista] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableWidth, setTableWidth] = useState('100%');
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  // Stato per pannello nuova attività
  const [isNewActivityPanelOpen, setIsNewActivityPanelOpen] = useState(false);
  const [newActivitySaving, setNewActivitySaving] = useState(false);
  const [newActivityValidationErrors, setNewActivityValidationErrors] = useState({});
  const [clienti, setClienti] = useState([]);
  const [veicoli, setVeicoli] = useState([]);
  const [autistiList, setAutistiList] = useState([]); // per il form attività
  const [tipiAttivita, setTipiAttivita] = useState([]);
  const [sedi, setSedi] = useState([]);
  const [sediPerCliente, setSediPerCliente] = useState({});
  const [newActivity, setNewActivity] = useState(null);

  // Caricamento risorse per il form attività (come in /attivita/new/page.jsx)
  useEffect(() => {
    if (isNewActivityPanelOpen && selectedAutista) {
      Promise.all([
        api.get('/clients', { params: { perPage: 20000 } }).then(res => setClienti(Array.isArray(res.data) ? res.data : res.data.data || [])),
        api.get('/vehicles').then(res => setVeicoli(Array.isArray(res.data) ? res.data : res.data.data || [])),
        api.get('/drivers').then(res => setAutistiList(Array.isArray(res.data) ? res.data : res.data.data || [])),
        api.get('/activity-types').then(res => setTipiAttivita(Array.isArray(res.data) ? res.data : res.data.data || [])),
        api.get('/sites').then(res => setSedi(Array.isArray(res.data) ? res.data : res.data.data || [])),
      ]);
      setNewActivity({
        descrizione: '',
        data_inizio: '',
        data_fine: '',
        client_id: '',
        site_id: '',
        driver_id: selectedAutista.id || '',
        vehicle_id: '',
        activity_type_id: '',
        stato: 'Programmata',
        note: ''
      });
    }
  }, [isNewActivityPanelOpen, selectedAutista]);

  // Gestore salvataggio nuova attività
  const handleSaveNewActivity = async (formData) => {
    setNewActivitySaving(true);
    setNewActivityValidationErrors({});
    try {
      const preparedData = { ...formData };
      // Assicura che il campo titolo sia sempre presente
      preparedData.titolo = formData.titolo || formData.descrizione || '';
      ['client_id', 'site_id', 'driver_id', 'vehicle_id', 'activity_type_id'].forEach(field => {
        if (preparedData[field]) preparedData[field] = Number(preparedData[field]);
      });
      await api.post('/activities', preparedData);
      setIsNewActivityPanelOpen(false);
      // Aggiorna lista attività per l'autista selezionato
      if (selectedAutista && selectedAutista.id) {
        loadActivities(selectedAutista.id);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.errors) {
        setNewActivityValidationErrors(err.response.data.errors);
      } else {
        alert('Errore durante il salvataggio della nuova attività');
      }
    } finally {
      setNewActivitySaving(false);
    }
  };

  // Campi form attività (dinamici come in AttivitaPage)
  const toInputDatetimeLocal = (dateString) => {
    if (!dateString) return '';
    const match = dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    return match ? match[0] : '';
  };

  const handleNewActivityFieldChange = (name, value) => {
    setNewActivity(prev => {
      let newState = { ...prev, [name]: value };
      if (name === 'client_id') newState.site_id = '';
      return newState;
    });
    if (name === 'client_id') {
      loadSediPerCliente(value);
    }
  };

  // Caricamento sedi per cliente (come AttivitaPage)
  const loadSediPerCliente = async (clientId) => {
    if (!clientId) return;
    try {
      const res = await api.get(`/clients/${clientId}/sites`);
      setSediPerCliente(prev => ({ ...prev, [clientId]: Array.isArray(res.data) ? res.data : res.data.data || [] }));
    } catch (err) {
      setSediPerCliente(prev => ({ ...prev, [clientId]: [] }));
    }
  };

  const getAttivitaFields = (activity) => {
    let sediOptions = [];
    const clienteId = activity?.client_id;
    const clientKey = String(clienteId);
    if (clientKey && sediPerCliente[clientKey]) {
      sediOptions = sediPerCliente[clientKey].map(sede => ({ value: sede.id, label: sede.nome || sede.name }));
    } else if (!clienteId) {
      sediOptions = [];
    } else {
      loadSediPerCliente(clienteId);
      sediOptions = [{ value: '', label: 'Caricamento sedi...' }];
    }
    return [
      { name: 'descrizione', label: 'Descrizione', type: 'textarea' },
      { name: 'data_inizio', label: 'Data/Ora Inizio', type: 'datetime-local', required: true, value: toInputDatetimeLocal(activity?.data_inizio), onChange: handleNewActivityFieldChange },
      { name: 'data_fine', label: 'Data/Ora Fine', type: 'datetime-local', value: toInputDatetimeLocal(activity?.data_fine), onChange: handleNewActivityFieldChange },
      { name: 'client_id', label: 'Cliente', type: 'select', required: true, options: clienti.map(c => ({ value: c.id, label: c.nome || c.name || '' })), value: activity?.client_id || '', onChange: handleNewActivityFieldChange },
      { name: 'site_id', label: 'Sede', type: 'select', required: true, options: sediOptions, value: activity?.site_id || '' },
      { name: 'driver_id', label: 'Autista', type: 'select', required: false, options: autistiList.map(a => ({ value: a.id, label: `${a.nome || ''} ${a.cognome || ''}`.trim() })), value: activity?.driver_id || '' },
      { name: 'vehicle_id', label: 'Veicolo', type: 'select', required: false, options: veicoli.map(v => ({ value: v.id, label: `${v.targa || ''} - ${v.marca || ''} ${v.modello || ''}`.trim() })), value: activity?.vehicle_id || '' },
      { name: 'activity_type_id', label: 'Tipo Attività', type: 'select', required: true, options: tipiAttivita.map(t => ({ value: t.id, label: t.nome || t.name || '' })), value: activity?.activity_type_id || '' },
      { name: 'stato', label: 'Stato', type: 'select', required: true, options: [
        { value: 'Programmata', label: 'Programmata' },
        { value: 'In corso', label: 'In corso' },
        { value: 'Completata', label: 'Completata' },
        { value: 'Annullata', label: 'Annullata' }
      ], value: activity?.stato || 'Programmata' },
      { name: 'note', label: 'Note', type: 'textarea', value: activity?.note || '' },
    ];
  };



  // Campi del form autista - informazioni personali
  const autistaFields = [
    { name: 'nome', label: 'Nome', required: true },
    { name: 'cognome', label: 'Cognome', required: true },
    { name: 'telefono', label: 'Telefono' },
    { name: 'email', label: 'Email' },
    { name: 'codice_fiscale', label: 'Codice Fiscale' },
    { name: 'data_nascita', label: 'Data di Nascita', type: 'date' },
    { name: 'indirizzo', label: 'Indirizzo' },
    { name: 'citta', label: 'Città' },
    { name: 'cap', label: 'CAP' },
    { name: 'provincia', label: 'Provincia' },
    { name: 'note', label: 'Note', type: 'textarea' }
  ];
  
  // Campi per la patente e informazioni lavorative
  const patenteFields = [
    { name: 'patente', label: 'Tipo Patente', type: 'select', options: [
      { value: 'B', label: 'B' },
      { value: 'C', label: 'C' },
      { value: 'D', label: 'D' },
      { value: 'CE', label: 'CE' },
      { value: 'DE', label: 'DE' },
    ]},
    { name: 'numero_patente', label: 'Numero Patente' },
    { name: 'scadenza_patente', label: 'Scadenza Patente', type: 'date' },
    { name: 'data_assunzione', label: 'Data Assunzione', type: 'date' },
    { name: 'tipo_contratto', label: 'Tipo Contratto', type: 'select', options: [
      { value: 'indeterminato', label: 'Tempo Indeterminato' },
      { value: 'determinato', label: 'Tempo Determinato' },
      { value: 'partita_iva', label: 'Partita IVA' },
      { value: 'occasionale', label: 'Occasionale' },
    ]},
    { name: 'scadenza_contratto', label: 'Scadenza Contratto', type: 'date' },
    { name: 'note_patente', label: 'Note Patente', type: 'textarea' }
  ];

  useEffect(() => {
    if (!loading && user) {
      loadAutisti();
    } else if (!loading && !user) {
      // Se non c'è un utente e non sta caricando, imposta fetching a false
      setFetching(false);
    }
  }, [user, loading]);

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

  const loadAutisti = () => {
    setFetching(true);
    api.get("/drivers?all=1&_=" + new Date().getTime()) // Cache-busting
      .then(res => {
        // Gestione robusta della risposta: ordina solo se array
        let autistiArr = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : []);
        if (Array.isArray(autistiArr)) {
          autistiArr = [...autistiArr].sort((a, b) => {
            const nomeA = (a.cognome || '') + (a.nome || '');
            const nomeB = (b.cognome || '') + (b.nome || '');
            return nomeA.localeCompare(nomeB);
          });
        }
        setAutisti(autistiArr);
      })
      .catch((err) => {
        console.error("Errore nel caricamento degli autisti:", err);
        if (err.response && err.response.status === 401) {
          setError("Sessione scaduta. Effettua nuovamente il login.");
        } else {
          setError("Errore nel caricamento degli autisti");
        }
      })
      .finally(() => setFetching(false));
  };

  const handleViewDetails = (autista) => {
    setSelectedAutista(autista);
    setIsEditing(false);
    setIsPanelOpen(true);
    
    // Carica le attività per questo autista
    loadActivities(autista.id);
  };
  
  const loadActivities = async (driverId) => {
    if (!driverId) return;
    
    setLoadingActivities(true);
setActivities([]);
    try {
      const response = await api.get(`/drivers/${driverId}/activities`);
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

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    // Reset dello stato dopo che l'animazione di chiusura è completata
    setTimeout(() => {
      setSelectedAutista(null);
      setIsEditing(false);
    }, 300);
  };

  const handleSaveAutista = async (formData) => {
    setIsSaving(true);
    try {
      let response;
      const dataToSend = { ...formData };

      if (dataToSend.id) {
        // Aggiornamento
        response = await api.put(`/drivers/${dataToSend.id}`, dataToSend);
      } else {
        response = await api.post('/drivers', dataToSend);
      }
      
      setIsEditing(false);
      await loadAutisti(); 
      handleClosePanel();
      
      const message = dataToSend.id ? 'Autista aggiornato con successo!' : 'Autista creato con successo!';
      if (typeof showToast === 'function') {
        showToast(message, 'success');
      } else {
        alert(message);
      }

    } catch (err) {
      console.error("Errore durante il salvataggio dell'autista:", err);
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

  const handleDeleteAutista = async (id) => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/drivers/${id}`);
      
      // Rimuovi l'autista dalla lista
      setAutisti(prev => prev.filter(a => a.id !== id));
      
      // Chiudi il pannello
      handleClosePanel();
    } catch (err) {
      console.error("Errore durante l'eliminazione:", err);
      alert("Si è verificato un errore durante l'eliminazione. Riprova più tardi.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedAutista({});
    setIsEditing(true);
    setIsPanelOpen(true);
  };

  // Funzione per formattare la data
  const formatDate = (dateString) => {
    if (!dateString) return 'N/D';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return (
  <div className="centered">
    {error}
    <br />
    <button onClick={loadAutisti} style={{marginTop: 12, padding: '8px 16px', borderRadius: 6, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer'}}>Riprova</button>
  </div>
);

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title="Autisti" 
        buttonLabel="Nuovo Autista" 
        onAddClick={handleCreateNew} 
      />
      <div style={{margin: '18px 0 12px 0'}}>
        <input
          type="text"
          placeholder="Cerca per nome o cognome..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{padding: 8, borderRadius: 6, border: '1px solid #ccc', width: 240}}
        />
      </div>
      <div 
        style={{ 
          transition: 'width 0.3s ease-in-out',
          width: tableWidth,
          overflow: 'hidden'
        }}
      >
        <DataTable 
          data={autisti.filter(a => {
            const testo = (a.nome || "") + " " + (a.cognome || "");
            return testo.toLowerCase().includes(searchText.toLowerCase());
          })}
          columns={[
            { 
              key: 'nome', 
              label: 'Nome'
            },
            { 
              key: 'cognome', 
              label: 'Cognome'
            },
            { 
              key: 'telefono', 
              label: 'Telefono'
            },
            { 
              key: 'email', 
              label: 'Email'
            },
            { 
              key: 'patente', 
              label: 'Patente'
            },
            { 
              key: 'scadenza_patente', 
              label: 'Scadenza Patente',
              render: (item) => formatDate(item.scadenza_patente)
            },
            { 
              key: 'tipo_contratto', 
              label: 'Tipo Contratto',
              render: (item) => {
                const tipiContratto = {
                  'indeterminato': 'Tempo Indeterminato',
                  'determinato': 'Tempo Determinato',
                  'partita_iva': 'Partita IVA',
                  'occasionale': 'Occasionale'
                };
                return tipiContratto[item.tipo_contratto] || item.tipo_contratto || 'N/D';
              }
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
          filterableColumns={[
            { 
              key: 'nome', 
              label: 'Nome',
              filterType: 'text'
            },
            { 
              key: 'cognome', 
              label: 'Cognome',
              filterType: 'text'
            },
            { 
              key: 'patente', 
              label: 'Patente',
              filterType: 'select',
              filterOptions: [
                { value: 'B', label: 'B' },
                { value: 'C', label: 'C' },
                { value: 'D', label: 'D' },
                { value: 'CE', label: 'CE' },
                { value: 'DE', label: 'DE' }
              ]
            },
            { 
              key: 'tipo_contratto', 
              label: 'Tipo Contratto',
              filterType: 'select',
              filterOptions: [
                { value: 'indeterminato', label: 'Tempo Indeterminato' },
                { value: 'determinato', label: 'Tempo Determinato' },
                { value: 'partita_iva', label: 'Partita IVA' },
                { value: 'occasionale', label: 'Occasionale' }
              ]
            }
          ]}
          onRowClick={handleViewDetails}
          selectedRow={selectedAutista}
          searchPlaceholder="Cerca autisti..."
          emptyMessage="Nessun autista trovato"
          defaultVisibleColumns={['nome', 'cognome', 'telefono', 'patente', 'scadenza_patente', 'actions']}
        />
      </div>

      {/* Pannello laterale per i dettagli */}
      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={handleClosePanel} 
        title={isEditing ? "Modifica Autista" : "Dettagli Autista"}
      >
        {selectedAutista && (
          <TabPanel 
            tabs={[
              {
                id: 'details',
                label: 'Anagrafica',
                content: (
                  <EntityForm
                    data={selectedAutista}
                    fields={autistaFields}
                    onSave={handleSaveAutista}
                    onDelete={handleDeleteAutista}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    isLoading={isSaving || isDeleting}
                  />
                )
              },
              {
                id: 'patente',
                label: 'Patente e Lavoro',
                content: (
                  <EntityForm
                    data={selectedAutista}
                    fields={patenteFields}
                    onSave={handleSaveAutista}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    isLoading={isSaving}
                  />
                )
              },
              {
                id: 'activities',
                label: 'Attività',
                count: activities.length,
                content: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ margin: 0 }}>Attività dell'autista</h3>
                      <button
                        onClick={() => setIsNewActivityPanelOpen(true)}
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
                        driverId={selectedAutista.id} 
                        onActivityClick={(activity) => router.push(`/attivita?open=${activity.id}`)}
                      />
                    )}
                  </div>
                )
              }
            ]}
            defaultTab="details"
          />
        )}
      </SidePanel>

      {/* SidePanel per NUOVA ATTIVITÀ */}
      <SidePanel
        isOpen={isNewActivityPanelOpen}
        onClose={() => setIsNewActivityPanelOpen(false)}
        title={selectedAutista ? `Nuova Attività per ${selectedAutista.nome || ''} ${selectedAutista.cognome || ''}` : 'Nuova Attività'}
      >
        <EntityForm
          data={newActivity}
          fields={getAttivitaFields(newActivity)}
          onSave={handleSaveNewActivity}
          onCancel={() => setIsNewActivityPanelOpen(false)}
          isSaving={newActivitySaving}
          isEditing={true}
          errors={newActivityValidationErrors}
        />
      </SidePanel>
    </div>
  );
}