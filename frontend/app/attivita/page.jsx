"use client";
import { useEffect, useState, useMemo, Suspense } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import SidePanel from "../../components/SidePanel";
import ResourcePairing from "../../components/ResourcePairing";
import EntityForm from "../../components/EntityForm";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import { useRouter, useSearchParams } from "next/navigation";
import AddFacilityPopup from "../../components/AddFacilityPopup";
import dynamic from 'next/dynamic';
import { useVehicleTracking } from "../../hooks/useVehicleTracking";
import "../../styles/map.css";

// CSS per l'animazione del loading spinner
const spinKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Aggiungi i keyframes al documento se non esistono già
if (typeof document !== 'undefined' && !document.querySelector('#spin-keyframes-attivita')) {
  const style = document.createElement('style');
  style.id = 'spin-keyframes-attivita';
  style.textContent = spinKeyframes;
  document.head.appendChild(style);
}

// Importa VehicleMap solo lato client per evitare errori SSR
const VehicleMap = dynamic(() => import("../../components/VehicleMap"), {
  ssr: false,
  loading: () => (
    <div style={{ 
      height: '350px', 
      backgroundColor: '#f5f5f5', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      border: '1px solid #e5e5ea',
      borderRadius: '8px'
    }}>
      <div style={{ textAlign: 'center', color: '#666' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🗺️</div>
        <div>Caricamento mappa...</div>
      </div>
    </div>
  )
});

function AttivitaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get('open');
  const isNew = searchParams.get('new') === '1';
  const { user, loading } = useAuth();
  const [attivita, setAttivita] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [selectedAttivita, setSelectedAttivita] = useState(null);
  
  // Stato per documenti suggeriti
  const [suggestedDocuments, setSuggestedDocuments] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  // Stato per documenti allegati
  const [attachedDocuments, setAttachedDocuments] = useState([]);
  const [loadingAttached, setLoadingAttached] = useState(false);
  
  // Stato per documenti pre-selezionati (prima del salvataggio)
  const [preSelectedDocuments, setPreSelectedDocuments] = useState([]);
  
  // Versione documenti per refresh automatico dopo sync
  const [documentsVersion, setDocumentsVersion] = useState(0);

  // Funzione per recuperare documenti allegati all'attività
  const fetchAttachedDocuments = async (activityId) => {
    if (!activityId) {
      setAttachedDocuments([]);
      return;
    }

    setLoadingAttached(true);
    try {
      console.log('🔍 Caricamento documenti allegati per attività:', activityId);
      const response = await api.get(`/activities/${activityId}/documents`);
      
      if (response.data.success) {
        const documents = response.data.data || [];
        console.log(`✅ ${documents.length} documenti allegati caricati:`, documents);
        setAttachedDocuments(documents);
      } else {
        console.warn('⚠️ Nessun documento allegato trovato:', response.data.message);
        setAttachedDocuments([]);
      }
    } catch (error) {
      console.error('❌ Errore nel caricamento documenti allegati:', error);
      setAttachedDocuments([]);
    } finally {
      setLoadingAttached(false);
    }
  };

  // Funzione per pre-selezionare un documento (prima del salvataggio)
  const preSelectDocument = (document) => {
    setPreSelectedDocuments(prev => {
      const isAlreadySelected = prev.some(doc => doc.id === document.id);
      if (isAlreadySelected) {
        // Rimuovi se già selezionato
        return prev.filter(doc => doc.id !== document.id);
      } else {
        // Aggiungi se non selezionato
        return [...prev, document];
      }
    });
    
    // Rimuovi dai suggerimenti quando viene pre-selezionato
    setSuggestedDocuments(prev => prev.filter(doc => doc.id !== document.id));
  };

  // Funzione per allegare un documento a un'attività
  const attachDocumentToActivity = async (documentId) => {
    if (!selectedAttivita?.id) {
      console.error('❌ Nessuna attività selezionata per allegare documento');
      return;
    }

    try {
      const response = await api.post('/activities/attach-document', {
        activity_id: selectedAttivita.id,
        document_id: documentId
      });

      if (response.data.success) {
        console.log('✅ Documento allegato con successo');
        // Rimuovi il documento dai suggerimenti
        setSuggestedDocuments(prev => prev.filter(doc => doc.id !== documentId));
        // Ricarica i documenti allegati
        fetchAttachedDocuments(selectedAttivita.id);
      }
    } catch (error) {
      console.error('❌ Errore nell\'allegare documento:', error);
      alert('❌ Errore nell\'allegare il documento. Riprova.');
    }
  };

  // Funzione per suggerire documenti allegabili (solo cliente e data)
  const suggestDocuments = async (clientId, dataInizio) => {
    console.log('🔍 suggestDocuments chiamata con:', { clientId, dataInizio });
    
    if (!clientId || !dataInizio) {
      console.log('❌ Parametri mancanti (cliente o data), pulisco suggerimenti');
      setSuggestedDocuments([]);
      return;
    }

    setLoadingSuggestions(true);
    try {
      console.log('📡 Chiamata API suggestForActivity...');
      const response = await api.documenti.suggestForActivity({
        client_id: clientId,
        site_id: null, // Non più richiesto
        data_inizio: dataInizio
      });
      
      console.log('📨 Risposta API:', response.data);
      
      if (response.data.success) {
        const documents = response.data.data || [];
        console.log(`✅ ${documents.length} documenti suggeriti:`, documents);
        setSuggestedDocuments(documents);
      } else {
        console.warn('⚠️ Nessun documento suggerito:', response.data.message);
        setSuggestedDocuments([]);
      }
    } catch (error) {
      console.error('❌ Errore nel suggerimento documenti:', error);
      setSuggestedDocuments([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Funzione wrapper per suggerire documenti basata sull'attività selezionata
  const fetchSuggestedDocuments = () => {
    if (!selectedAttivita) {
      console.log('⚠️ fetchSuggestedDocuments: Nessuna attività selezionata');
      setSuggestedDocuments([]);
      return;
    }
    
    console.log('🔍 fetchSuggestedDocuments: Attività completa:', selectedAttivita);
    
    // Estrai client_id con diversi possibili formati
    let clientId = selectedAttivita.client_id;
    
    // Se client_id non è presente, prova con altri campi
    if (!clientId && selectedAttivita.cliente) {
      clientId = selectedAttivita.cliente.id || selectedAttivita.cliente;
    }
    
    // Se ancora non trovato, prova con il campo client
    if (!clientId && selectedAttivita.client) {
      clientId = selectedAttivita.client.id || selectedAttivita.client;
    }
    
    const dataInizio = selectedAttivita.date || selectedAttivita.data_inizio || selectedAttivita.start_date;
    
    console.log('🔍 fetchSuggestedDocuments estratti:', { 
      clientId, 
      dataInizio,
      campiDisponibili: Object.keys(selectedAttivita),
      cliente_object: selectedAttivita.cliente,
      client_object: selectedAttivita.client,
      raw_client_id: selectedAttivita.client_id,
      isEditing
    });
    
    if (!clientId) {
      console.warn('⚠️ fetchSuggestedDocuments: client_id mancante!');
      setSuggestedDocuments([]);
      return;
    }
    
    if (!dataInizio) {
      console.warn('⚠️ fetchSuggestedDocuments: data mancante!');
      setSuggestedDocuments([]);
      return;
    }
    
    suggestDocuments(clientId, dataInizio);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableWidth, setTableWidth] = useState('100%');
  const [clienti, setClienti] = useState([]);
  const [veicoli, setVeicoli] = useState([]);
  const [autisti, setAutisti] = useState([]);
  const [tipiAttivita, setTipiAttivita] = useState([]);
  const [sediPerCliente, setSediPerCliente] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);

  const isEditMode = selectedAttivita && selectedAttivita.id;
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  // Estrai i veicoli dall'attività selezionata per il tracking
  const activityVehicles = useMemo(() => {
    // Usa le risorse originali per la mappa, non quelle trasformate per il form
    const resources = selectedAttivita?.originalResources || selectedAttivita?.resources;
    
    if (!resources || !Array.isArray(resources)) {
      return [];
    }
    
    const vehicles = resources
      .map(resource => {
        return resource.vehicle;
      })
      .filter(Boolean)
      .map(vehicle => ({
        ...vehicle,
        driver: resources.find(r => r.vehicle?.id === vehicle.id)?.driver
      }));
      
    return vehicles;
  }, [selectedAttivita?.originalResources, selectedAttivita?.resources]);

  // Hook per il tracking dei veicoli - riabilitato con valori sicuri
  const { 
    vehiclePositions, 
    isTracking, 
    lastUpdate, 
    refreshPositions 
  } = useVehicleTracking(
    selectedAttivita?.id || null, 
    Array.isArray(activityVehicles) ? activityVehicles : [],
    10000
  );

  useEffect(() => {
    if (isNew) {
      handleCreateNew();
    } else if (openId) {
      const found = attivita.find(a => String(a.id) === String(openId));
      if (found) {
        handleViewDetails(found);
      } else {
        api.get(`/activities/${openId}`).then(res => handleViewDetails(res.data)).catch(handleClosePanel);
      }
    } else {
      handleClosePanel();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, isNew, attivita]);

  const handleSedeAdded = (newSede) => {
    setIsPopupOpen(false);
    const clienteId = selectedAttivita?.client_id;
    if (!clienteId) return;
    
    console.log('🏢 Aggiungendo nuova sede:', newSede);
    
    // Aggiorna immediatamente la lista delle sedi con la nuova sede
    const newSedeFormatted = {
      id: newSede.id,
      nome: newSede.name || newSede.nome,
      name: newSede.name || newSede.nome,
      indirizzo: newSede.address || newSede.indirizzo,
      citta: newSede.city || newSede.citta,
      cap: newSede.postal_code || newSede.cap,
      provincia: newSede.province || newSede.provincia,
      note: newSede.notes || newSede.note
    };
    
    // Prima aggiorna le sedi
    setSediPerCliente(prev => {
      const currentSedi = prev[String(clienteId)] || [];
      const updated = {
        ...prev,
        [String(clienteId)]: [...currentSedi, newSedeFormatted]
      };
      console.log('🔄 Sedi aggiornate:', updated[String(clienteId)]);
      return updated;
    });
    
    // Forza re-render immediato del form
    setFormRenderKey(prev => prev + 1);
    
    // Poi seleziona la nuova sede e forza re-render
    setTimeout(() => {
      setSelectedAttivita(prev => {
        const updated = { ...prev, site_id: newSede.id };
        console.log('✅ Sede selezionata:', updated.site_id);
        return updated;
      });
      
      // Forza un altro re-render del form
      setFormRenderKey(prev => prev + 1);
      
      // Ricarica anche dal server per sicurezza
      loadSediPerCliente(clienteId).then(() => {
        console.log('🔄 Sedi ricaricate dal server');
        // Forza un ultimo re-render dopo il caricamento
        setFormRenderKey(prev => prev + 1);
        
        // Mostra feedback all'utente
        alert(`✅ Sede "${newSede.name || newSede.nome}" aggiunta e selezionata con successo!`);
      });
    }, 100);
  };

  const handleFormChange = (updatedData) => {
    const oldClientId = selectedAttivita?.client_id;
    const oldSiteId = selectedAttivita?.site_id;
    const oldDataInizio = selectedAttivita?.data_inizio;
    
    // Preserva l'ID originale quando aggiorniamo i dati del form
    const dataWithId = { ...updatedData };
    if (selectedAttivita?.id && !dataWithId.id) {
      dataWithId.id = selectedAttivita.id;
    }
    setSelectedAttivita(dataWithId);

    if (dataWithId.client_id !== oldClientId) {
      if (dataWithId.client_id) {
        loadSediPerCliente(dataWithId.client_id);
        // Resetta la selezione della sede quando il cliente cambia SOLO se non è già impostata
        if (oldSiteId && oldClientId !== dataWithId.client_id) {
          setSelectedAttivita(prev => ({ ...prev, site_id: '' }));
        }
      } else {
        // Pulisci le sedi se il cliente viene deselezionato
        setSediPerCliente(prev => ({ ...prev, [String(oldClientId)]: [] }));
        setSelectedAttivita(prev => ({ ...prev, site_id: '' }));
      }
    }

    // Suggerisci documenti quando cambiano cliente o data (non più destinazione)
    const clientChanged = dataWithId.client_id !== oldClientId;
    const dateChanged = dataWithId.data_inizio !== oldDataInizio;
    
    console.log('🔄 handleFormChange - Check suggerimenti:', {
      clientChanged, dateChanged,
      clientId: dataWithId.client_id,
      dataInizio: dataWithId.data_inizio,
      hasRequiredData: !!(dataWithId.client_id && dataWithId.data_inizio)
    });
    
    if ((clientChanged || dateChanged) && dataWithId.client_id && dataWithId.data_inizio) {
      // Estrai solo la data (YYYY-MM-DD) dal datetime
      const dateOnly = dataWithId.data_inizio.split('T')[0];
      console.log('✅ Trigger suggerimenti documenti con dateOnly:', dateOnly);
      suggestDocuments(dataWithId.client_id, dateOnly);
    } else if (!dataWithId.client_id || !dataWithId.data_inizio) {
      // Pulisci i suggerimenti se mancano cliente o data
      console.log('🧹 Pulisco suggerimenti - cliente o data mancanti');
      setSuggestedDocuments([]);
    }
  };

  useEffect(() => {
    // Suggerisci documenti sia in editing che in creazione (isNew)
    if (selectedAttivita && (isEditing || isNew)) {
      fetchSuggestedDocuments();
    } else {
      setSuggestedDocuments([]);
    }
  }, [selectedAttivita?.client_id, selectedAttivita?.date, isEditing, isNew, documentsVersion]);

  // Listener per eventi di sincronizzazione documenti da altre pagine
  useEffect(() => {
    const handleDocumentsSync = (event) => {
      console.log('🔄 Ricevuto evento sincronizzazione documenti:', event.detail);
      setDocumentsVersion(v => v + 1);
      
      // Se c'è un'attività selezionata in modalità modifica, ricarica i suggerimenti
      if (selectedAttivita && isEditing) {
        console.log('🔄 Ricaricando suggerimenti dopo sync documenti...');
        setTimeout(() => {
          fetchSuggestedDocuments();
        }, 1000); // Piccolo delay per assicurarsi che i dati siano pronti
      }
    };

    // Ascolta eventi custom di sincronizzazione documenti
    window.addEventListener('documentsSync', handleDocumentsSync);
    
    return () => {
      window.removeEventListener('documentsSync', handleDocumentsSync);
    };
  }, [selectedAttivita, isEditing]);

  useEffect(() => {
    if (selectedAttivita?.id) {
      fetchAttachedDocuments(selectedAttivita.id);
    } else {
      setAttachedDocuments([]);
    }
  }, [selectedAttivita?.id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/D';
    const d = new Date(dateString);
    return d.toLocaleString('it-IT', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '');
  };

  const toInputDatetimeLocal = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Definisci extraBelowSite prima del useMemo
  const extraBelowSite = (
    <button type="button" onClick={() => setIsPopupOpen(true)} disabled={!selectedAttivita?.client_id} className="btn-add-facility" style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '12px' }}>
      Aggiungi
    </button>
  );

  // Stato per forzare re-render del form
  const [formRenderKey, setFormRenderKey] = useState(0);
  
  // Funzione per ottenere i campi del form (sempre aggiornata)
  const getAttivitaFields = () => {
    if (isInitialLoading) return [];

    const selectedClientId = selectedAttivita?.client_id;
    const sediOptions = (sediPerCliente[String(selectedClientId)] || []).map(s => ({ value: s.id, label: s.nome || s.name || '' }));
    
    console.log('📋 Campi form aggiornati:', {
      selectedClientId,
      sediDisponibili: sediPerCliente[String(selectedClientId)]?.length || 0,
      sediOptions: sediOptions.length
    });

    return [
      { name: 'descrizione', label: 'Descrizione', type: 'textarea' },
      { name: 'data_inizio', label: 'Data/Ora Inizio', type: 'datetime-local', required: true },
      { name: 'data_fine', label: 'Data/Ora Fine', type: 'datetime-local' },
      { name: 'client_id', label: 'Cliente', type: 'select', isNumeric: true, required: true, options: clienti.map(c => ({ value: c.id, label: c.nome || c.name || '' })), placeholder: 'Seleziona Cliente' },
      { name: 'site_id', label: <>Sede {extraBelowSite}</>, type: 'select', isNumeric: true, required: true, options: sediOptions, disabled: !selectedClientId, placeholder: selectedClientId ? 'Seleziona Sede' : 'Prima seleziona un cliente' },
      { name: 'resources', label: 'Risorse abbinate', type: 'custom', render: (formData, handleChange) => <ResourcePairing value={formData.resources || []} onChange={(newValue) => handleChange({ target: { name: 'resources', value: newValue }})} drivers={autisti} vehicles={veicoli} />, required: false },
      { name: 'activity_type_id', label: 'Tipo Attività', type: 'select', isNumeric: true, required: true, options: tipiAttivita.map(t => ({ value: t.id, label: t.nome || t.name || '' })), placeholder: 'Seleziona Tipo Attività' },
      { name: 'status', label: 'Stato', type: 'select', required: true, options: [{ value: 'non assegnato', label: 'Non assegnato' }, { value: 'assegnato', label: 'Assegnato' }, { value: 'doc emesso', label: 'Doc emesso' }, { value: 'programmato', label: 'Programmato' }, { value: 'in corso', label: 'In corso' }, { value: 'completato', label: 'Completato' }, { value: 'annullato', label: 'Annullato' }], placeholder: 'Seleziona Stato' },
      { name: 'note', label: 'Note', type: 'textarea' },
    ];
  };

  // Effetto per caricare i dati della tabella (attività) che dipendono dalla paginazione e ricerca
  useEffect(() => {
    const fetchActivities = async () => {
      if (loading || !user) return;
      setFetching(true);
      try {
        const activitiesParams = { page: currentPage, per_page: perPage, search: searchTerm };
        const activitiesRes = await api.get('/activities', { params: activitiesParams });
        const attivitaData = Array.isArray(activitiesRes.data.data) ? activitiesRes.data.data : [];
        setAttivita(attivitaData);
        setTotal(activitiesRes.data.total || activitiesRes.data.meta?.total || 0);
      } catch (err) {
        console.error("Errore nel caricamento delle attività", err);
        setError("Impossibile caricare la lista delle attività.");
      } finally {
        setFetching(false);
      }
    };

    if (!isInitialLoading) { // Esegui solo dopo che i dati iniziali del form sono stati caricati
        fetchActivities();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, currentPage, perPage, searchTerm, isInitialLoading, dataVersion]);

  // Effetto per caricare i dati di supporto per il form (clienti, tipi, etc.) UNA SOLA VOLTA
  useEffect(() => {
    const fetchFormData = async () => {
      if (loading || !user) return;
      setIsInitialLoading(true);
      try {
        const params = { perPage: 9999 };
        const [clientsRes, typesRes, driversRes, vehiclesRes] = await Promise.all([
          api.get('/clients', { params }),
          api.get('/activity-types', { params }),
          api.get('/drivers', { params }),
          api.get('/vehicles', { params })
        ]);

        setClienti(Array.isArray(clientsRes.data.data) ? clientsRes.data.data : []);
        setTipiAttivita(Array.isArray(typesRes.data.data) ? typesRes.data.data : []);
        setAutisti(Array.isArray(driversRes.data.data) ? driversRes.data.data : []);
        setVeicoli(Array.isArray(vehiclesRes.data.data) ? vehiclesRes.data.data : []);

      } catch (err) {
        console.error("Errore nel caricamento dei dati del form", err);
        setError("Impossibile caricare i dati necessari per il form.");
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchFormData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    setTableWidth(isPanelOpen ? '60%' : '100%');
  }, [isPanelOpen]);

  useEffect(() => {
    if (selectedAttivita?.client_id) {
      loadSediPerCliente(selectedAttivita.client_id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAttivita?.client_id]);

  const loadSediPerCliente = (clientId) => {
    if (!clientId) {
       setSediPerCliente(prev => ({ ...prev, [String(selectedAttivita.client_id)]: [] }));
       return Promise.resolve();
    }
    return api.get(`/clients/${clientId}/sites`)
      .then(res => {
        setSediPerCliente(prev => ({ ...prev, [String(clientId)]: res.data.data || [] }));
      })
      .catch(() => {
        setSediPerCliente(prev => ({ ...prev, [String(clientId)]: [] }));
      });
  };

  const handleViewDetails = (item) => {
    const newItem = JSON.parse(JSON.stringify(item)); // Deep copy

    // Preserva le risorse originali per la mappa
    newItem.originalResources = newItem.resources;

    if (newItem.resources && Array.isArray(newItem.resources)) {
      const resourcesByVehicle = newItem.resources.reduce((acc, resource) => {
        if (!resource.vehicle) return acc;
        const vehicleId = resource.vehicle.id;
        if (!acc[vehicleId]) {
          acc[vehicleId] = {
            vehicle_id: String(vehicleId),
            driver_ids: [],
          };
        }
        if (resource.driver) {
          acc[vehicleId].driver_ids.push(String(resource.driver.id));
        }
        return acc;
      }, {});
      newItem.resources = Object.values(resourcesByVehicle);
    }

    if (!newItem.status && newItem.stato) {
      newItem.status = String(newItem.stato).toLowerCase().replace(/_/g, ' ');
    } else if (newItem.status) {
      const statusReverseMap = { 'planned': 'programmato', 'in_progress': 'in corso', 'completed': 'completato', 'cancelled': 'annullato', 'doc_issued': 'doc emesso', 'assigned': 'assegnato', 'unassigned': 'non assegnato' };
      newItem.status = statusReverseMap[newItem.status] || newItem.status.replace(/_/g, ' ');
    }
    setSelectedAttivita(newItem);
    setIsPanelOpen(true);
    setIsEditing(false);
    setValidationErrors({});
    if (newItem.client_id) loadSediPerCliente(newItem.client_id);
    
    // Carica i documenti allegati per questa attività
    if (newItem.id) {
      fetchAttachedDocuments(newItem.id);
    }
    
    router.push(`/attivita?open=${item.id}`, { scroll: false });
  };

  const handleClosePanel = () => {
    router.push('/attivita', { scroll: false });
    setIsPanelOpen(false);
    setSelectedAttivita(null);
    // Pulisci i documenti pre-selezionati quando si chiude il panel
    setPreSelectedDocuments([]);
    setSuggestedDocuments([]);
  };

  const handleCreateNew = () => {
    const now = new Date();
    const dataInizio = toInputDatetimeLocal(now.toISOString());
    setSelectedAttivita({ data_inizio: dataInizio, data_fine: dataInizio, status: 'non assegnato', resources: [] });
    setIsEditing(true);
    setIsPanelOpen(true);
    setValidationErrors({});
    router.push('/attivita?new=1', { scroll: false });
  };

  const handleSaveAttivita = async (formData) => {
    setIsSaving(true);
    setValidationErrors({});
    const dataToSave = { ...formData };

    if (dataToSave.resources) {
      const flattenedResources = dataToSave.resources.flatMap(pair => 
        (pair.driver_ids && pair.driver_ids.length > 0) ? pair.driver_ids.map(driverId => ({
          vehicle_id: pair.vehicle_id,
          driver_id: driverId
        })) : (pair.vehicle_id ? [{ vehicle_id: pair.vehicle_id, driver_id: null }] : [])
      );
      dataToSave.resources = flattenedResources.filter(r => r.vehicle_id);
    }

    const statusMap = { 'programmato': 'planned', 'in corso': 'in_progress', 'completato': 'completed', 'annullato': 'cancelled', 'doc emesso': 'doc_issued', 'assegnato': 'assigned', 'non assegnato': 'unassigned' };
    dataToSave.status = statusMap[dataToSave.status] || 'planned';
    delete dataToSave.stato;


    try {
      const response = isEditMode ? await api.put(`/activities/${selectedAttivita.id}`, dataToSave) : await api.post('/activities', dataToSave);
      
      if (isEditMode) {
        // Per attività esistenti, chiudi il sidepanel come prima
        setDataVersion(v => v + 1); // Trigger re-fetch
        handleClosePanel();
        setIsEditing(false);
      } else {
        // Per nuove attività, mantieni il sidepanel aperto in modalità modifica
        const newActivity = response.data;
        setSelectedAttivita(newActivity); // Aggiorna con i dati salvati (incluso ID)
        setIsEditing(true); // Mantieni in modalità modifica
        setDataVersion(v => v + 1); // Trigger re-fetch della lista
        
        // Allega automaticamente i documenti pre-selezionati
        if (preSelectedDocuments.length > 0) {
          console.log(`🔗 Allegando ${preSelectedDocuments.length} documenti pre-selezionati...`);
          for (const doc of preSelectedDocuments) {
            try {
              await api.post('/activities/attach-document', {
                activity_id: newActivity.id,
                document_id: doc.id
              });
              console.log(`✅ Documento ${doc.numero_documento} allegato con successo`);
            } catch (error) {
              console.error(`❌ Errore nell'allegare documento ${doc.numero_documento}:`, error);
            }
          }
          // Pulisci i documenti pre-selezionati
          setPreSelectedDocuments([]);
          // Ricarica i documenti allegati
          fetchAttachedDocuments(newActivity.id);
        }
        
        // Non chiamare handleClosePanel() per mantenere il sidepanel aperto
        // Aggiorna URL per riflettere che ora è un'attività esistente
        router.push(`/attivita?open=${newActivity.id}`, { scroll: false });
      }
    } catch (err) {
      console.error('Errore nel salvataggio:', err);
      if (err.response && err.response.data && err.response.data.errors) {
        setValidationErrors(err.response.data.errors);
      } else {
        setError('Si è verificato un errore durante il salvataggio.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAttivita = async (id) => {
    setIsDeleting(true);
    try {
      await api.delete(`/activities/${id}`);
      setDataVersion(v => v + 1); // Trigger re-fetch
      handleClosePanel();
    } catch (err) {
      console.error('Errore nell\'eliminazione:', err);
      setError('Impossibile eliminare l\'attività.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (stato) => {
    const colors = { 'non assegnato': '#3b82f6', 'assegnato': '#eab308', 'doc emesso': '#ef4444', 'programmato': '#8b5cf6', 'programmata': '#8b5cf6', 'in corso': '#f97316', 'completato': '#22c55e', 'completata': '#22c55e', 'annullato': '#ec4899', 'annullata': '#ec4899' };
    return colors[String(stato)?.toLowerCase()] || '#6b7280';
  };

  const columns = useMemo(() => [
    { key: 'client.nome', label: 'Cliente', render: (item) => item.client?.nome || 'N/D' },
    { key: 'site.nome', label: 'Sede', render: (item) => item.site?.nome || 'N/D' },
    { key: 'orario', label: 'Orario', render: (item) => <span>{formatDate(item.data_inizio)}{item.data_fine && item.data_fine !== item.data_inizio ? ' → ' + formatDate(item.data_fine) : ''}</span> },
    { key: 'resources', label: 'Risorse', render: (item) => {
        if (!item.resources || item.resources.length === 0) return 'N/D';
        
        const resourcesByVehicle = item.resources.reduce((acc, resource) => {
          if (!resource.vehicle) return acc;
          const vehicleKey = `${resource.vehicle.targa || resource.vehicle.modello || resource.vehicle.marca || 'Veicolo'}`;
          if (!acc[vehicleKey]) {
            acc[vehicleKey] = [];
          }
          if (resource.driver) {
            acc[vehicleKey].push(`${resource.driver.nome} ${resource.driver.cognome}`);
          }
          return acc;
        }, {});

        return (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {Object.entries(resourcesByVehicle).map(([vehicle, drivers], index) => (
              <li key={index}>
                <strong>{vehicle}:</strong> {drivers.join(', ') || 'Nessun autista'}
              </li>
            ))}
          </ul>
        );
      }
    },
    { key: 'activityType', label: 'Tipologia', render: (item) => {
        const tipo = item.activityType || tipiAttivita.find(t => t.id === item.activity_type_id);
        if (!tipo) return 'N/D';
        return <span className='badge' style={{ backgroundColor: tipo.color || tipo.colore || 'grey' }}>{tipo.name || tipo.nome}</span>;
      }
    },
    { key: 'status', label: 'Stato', render: (item) => <span className='badge' style={{ backgroundColor: getStatusColor(item.status || item.stato) }}>{(item.status || item.stato || 'N/D').replace(/_/g, ' ')}</span> },
    { key: 'actions', label: 'Azioni', render: (item) => <button data-id={item.id} className='btn-secondary btn-details'>Dettagli</button> }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [tipiAttivita]);

  useEffect(() => {
    const clickHandler = (e) => {
      if (e.target.matches('.btn-details')) {
        const id = e.target.dataset.id;
        const item = attivita.find(a => String(a.id) === id);
        if (item) handleViewDetails(item);
      }
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [attivita]);

  if (loading) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title="Attività" 
        buttonLabel={canEdit ? "Nuova Attività" : ""}
        onAddClick={canEdit ? handleCreateNew : null} 
      />
      <div style={{ transition: 'width 0.3s ease-in-out', width: tableWidth, overflow: 'hidden' }}>
        {isPopupOpen && selectedAttivita?.client_id && <AddFacilityPopup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} onFacilityAdded={handleSedeAdded} entityData={{client_id: selectedAttivita.client_id, client_name: clienti.find(c => c.id === selectedAttivita.client_id)?.nome || clienti.find(c => c.id === selectedAttivita.client_id)?.name || ''}} clienti={clienti} />}
        <DataTable
          data={Array.isArray(attivita) ? attivita : []}
          columns={columns}
          onRowClick={handleViewDetails}
          pagination={{ total, currentPage, perPage, onPageChange: setCurrentPage, onPerPageChange: setPerPage }}
          search={{ value: searchTerm, onSearch: setSearchTerm }}
          isStriped={true}
          isHoverable={true}
          isLoading={fetching}
        />
      </div>
      {isPanelOpen && selectedAttivita && (
        <SidePanel isOpen={isPanelOpen} onClose={handleClosePanel} title={isNew ? 'Nuova Attività' : (isEditing ? 'Modifica Attività' : 'Dettagli Attività')}>
          <EntityForm
            key={formRenderKey}
            fields={getAttivitaFields()}
            data={selectedAttivita}
            onFormChange={handleFormChange}
            onSave={canEdit ? handleSaveAttivita : undefined}
            onDelete={canEdit ? () => handleDeleteAttivita(selectedAttivita.id) : undefined}
            onEdit={canEdit ? () => setIsEditing(true) : undefined}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            isSaving={isSaving}
            isDeleting={isDeleting}
            validationErrors={validationErrors}
          />
          
          {/* Sezione Documenti Suggeriti */}
          {(isNew || isEditing) && (suggestedDocuments.length > 0 || loadingSuggestions) && (
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e5ea' }}>
              <h3 style={{ margin: 0, marginBottom: '16px', fontSize: '18px', fontWeight: '600', color: '#333' }}>
                📄 Documenti Allegabili Suggeriti
              </h3>
              
              {!selectedAttivita?.id && (
                <div style={{ 
                  backgroundColor: '#fff3cd', 
                  border: '1px solid #ffeaa7', 
                  borderRadius: '6px', 
                  padding: '12px', 
                  marginBottom: '16px',
                  fontSize: '14px',
                  color: '#856404'
                }}>
                  💾 <strong>Salva prima l'attività</strong> per poter allegare i documenti suggeriti.
                </div>
              )}
              
              {loadingSuggestions ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ 
                    display: 'inline-block', 
                    width: '20px', 
                    height: '20px', 
                    border: '2px solid #f3f3f3', 
                    borderTop: '2px solid #007bff', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                  }}></div>
                  <p style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>Ricerca documenti in corso...</p>
                </div>
              ) : (
                <div>
                  {suggestedDocuments.length === 0 ? (
                    <p style={{ color: '#666', fontStyle: 'italic', fontSize: '14px' }}>Nessun documento trovato per i criteri selezionati.</p>
                  ) : (
                    <div>
                      <p style={{ marginBottom: '12px', color: '#495057', fontSize: '14px' }}>
                        Trovati {suggestedDocuments.length} documenti che potrebbero essere collegati a questa attività:
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {suggestedDocuments.map((doc, index) => (
                          <div key={doc.id} style={{ 
                            padding: '12px', 
                            backgroundColor: '#f8f9fa', 
                            border: '1px solid #dee2e6', 
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div>
                                <strong style={{ color: '#007bff' }}>
                                  {doc.codice_doc} #{doc.numero_doc}
                                </strong>
                                <span style={{ marginLeft: '8px', fontSize: '13px', color: '#6c757d' }}>
                                  {doc.data_doc}
                                </span>
                              </div>
                              {doc.giorni_differenza === 0 && (
                                <span style={{ 
                                  fontSize: '11px', 
                                  backgroundColor: '#28a745', 
                                  color: 'white', 
                                  padding: '2px 6px', 
                                  borderRadius: '3px' 
                                }}>
                                  Stessa data
                                </span>
                              )}
                            </div>
                            
                            <div style={{ fontSize: '13px', color: '#495057', marginBottom: '4px' }}>
                              <strong>Cliente:</strong> {doc.cliente?.name || 'N/A'}
                            </div>
                            
                            <div style={{ fontSize: '13px', color: '#495057', marginBottom: '4px' }}>
                              <strong>Destinazione:</strong> {doc.destinazione?.name || 'N/A'}
                              {doc.destinazione?.city && (
                                <span style={{ color: '#6c757d' }}> - {doc.destinazione.city}</span>
                              )}
                            </div>
                            
                            <div style={{ fontSize: '13px', color: '#495057', marginBottom: '8px' }}>
                              <strong>Totale:</strong> €{doc.totale_doc || '0,00'}
                            </div>
                            
                            {selectedAttivita?.id ? (
                              // Attività salvata - allega direttamente
                              <button
                                onClick={() => attachDocumentToActivity(doc.id)}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  backgroundColor: '#007bff',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: '500'
                                }}
                              >
                                📎 Allega Documento
                              </button>
                            ) : (
                              // Attività non salvata - pre-seleziona
                              <button
                                onClick={() => preSelectDocument(doc)}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: '500'
                                }}
                              >
                                ✅ Seleziona per Allegare
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Documenti pre-selezionati (prima del salvataggio) */}
          {!selectedAttivita?.id && preSelectedDocuments.length > 0 && (
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e5ea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  📋 Documenti Selezionati
                </h3>
                <span style={{ 
                  fontSize: '12px', 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px' 
                }}>
                  {preSelectedDocuments.length}
                </span>
              </div>
              
              <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '12px' }}>
                💡 Questi documenti verranno allegati automaticamente dopo il salvataggio dell'attività
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {preSelectedDocuments.map(doc => (
                  <div key={doc.id} style={{
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: '#007bff' }}>
                          {doc.codice_doc} #{doc.numero_doc}
                        </strong>
                        <div style={{ color: '#6c757d', marginTop: '4px' }}>
                          {doc.cliente?.name} - €{doc.totale_doc || '0,00'}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // Rimuovi dalla pre-selezione e rimetti nei suggerimenti
                          setPreSelectedDocuments(prev => prev.filter(d => d.id !== doc.id));
                          setSuggestedDocuments(prev => [...prev, doc]);
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ❌ Rimuovi
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Documenti allegati */}
          {selectedAttivita?.id && (
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e5ea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  📄 Documenti Allegati
                </h3>
                <span style={{ 
                  fontSize: '12px', 
                  backgroundColor: attachedDocuments.length > 0 ? '#28a745' : '#6c757d', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px' 
                }}>
                  {attachedDocuments.length}
                </span>
              </div>
              
              {loadingAttached ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ 
                    display: 'inline-block', 
                    width: '20px', 
                    height: '20px', 
                    border: '2px solid #f3f3f3', 
                    borderTop: '2px solid #007bff', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                  }}></div>
                  <p style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>Caricamento documenti allegati...</p>
                </div>
              ) : (
                <div>
                  {attachedDocuments.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px', 
                      backgroundColor: '#f8f9fa', 
                      border: '1px solid #dee2e6', 
                      borderRadius: '6px',
                      color: '#6c757d'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>📎</div>
                      <p style={{ margin: 0, fontSize: '14px' }}>Nessun documento allegato</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>I documenti allegati appariranno qui</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {attachedDocuments.map((doc, index) => (
                        <div key={`attached-${doc.id}`} style={{ 
                          padding: '12px', 
                          backgroundColor: '#e8f5e8', 
                          border: '1px solid #c3e6c3', 
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <strong style={{ color: '#28a745' }}>
                                {doc.codice_doc} #{doc.numero_doc}
                              </strong>
                              <span style={{ marginLeft: '8px', fontSize: '13px', color: '#6c757d' }}>
                                {doc.data_doc}
                              </span>
                            </div>
                            <span style={{ 
                              fontSize: '11px', 
                              backgroundColor: '#28a745', 
                              color: 'white', 
                              padding: '2px 6px', 
                              borderRadius: '3px' 
                            }}>
                              Allegato
                            </span>
                          </div>
                          
                          <div style={{ fontSize: '13px', color: '#495057', marginBottom: '4px' }}>
                            <strong>Cliente:</strong> {doc.cliente_name || 'N/A'}
                          </div>
                          
                          <div style={{ fontSize: '13px', color: '#495057', marginBottom: '4px' }}>
                            <strong>Destinazione:</strong> {doc.sede_name || 'N/A'}
                            {doc.sede_city && (
                              <span style={{ color: '#6c757d' }}> - {doc.sede_city}</span>
                            )}
                          </div>
                          
                          <div style={{ fontSize: '13px', color: '#495057', marginBottom: '8px' }}>
                            <strong>Totale:</strong> €{doc.totale_doc || '0,00'}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                            <div>
                              {doc.attached_at && (
                                <div style={{ fontSize: '12px', color: '#6c757d', fontStyle: 'italic' }}>
                                  Allegato il: {new Date(doc.attached_at).toLocaleString('it-IT')}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  // Usa l'endpoint corretto per generare e scaricare il PDF
                                  const response = await fetch(`/api/documenti/${doc.id}/pdf`, {
                                    method: 'GET',
                                    credentials: 'include'
                                  });
                                  
                                  if (!response.ok) {
                                    throw new Error(`Errore HTTP: ${response.status}`);
                                  }
                                  
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `${doc.codice_doc}_${doc.numero_doc}.pdf`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(url);
                                } catch (error) {
                                  console.error('Errore nel download PDF:', error);
                                  alert('Errore nel download del PDF. Riprova.');
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              📥 Scarica PDF
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Mappa dei veicoli */}
          {(() => {
            return selectedAttivita && activityVehicles.length > 0;
          })() && (
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e5ea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#333' }}>
                  Posizione Veicoli
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isTracking && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#666' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        backgroundColor: '#22c55e', 
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite'
                      }}></div>
                      Tracking attivo
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={refreshPositions}
                    style={{
                      padding: '6px 12px',
                      fontSize: '14px',
                      border: '1px solid #e5e5ea',
                      borderRadius: '6px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    🔄 Aggiorna
                  </button>
                </div>
              </div>
              
              {lastUpdate && (
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                  Ultimo aggiornamento: {lastUpdate.toLocaleTimeString('it-IT')}
                </div>
              )}
              
              <VehicleMap
                vehicles={vehiclePositions}
                height="350px"
                onVehicleClick={(vehicle) => {
                }}
              />
              
              {vehiclePositions.length === 0 && (
                <div style={{
                  height: '350px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f9f9f9',
                  border: '1px solid #e5e5ea',
                  borderRadius: '8px',
                  color: '#666',
                  textAlign: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📍</div>
                    <div>Nessuna posizione disponibile</div>
                    <div style={{ fontSize: '14px', marginTop: '4px' }}>
                      I veicoli appariranno qui quando saranno disponibili i dati GPS
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </SidePanel>
      )}
    </div>
  );
}

export default function AttivitaPage() {
  return (
    <Suspense fallback={<div className="centered">Caricamento attività...</div>}>
      <AttivitaContent />
    </Suspense>
  );
}
