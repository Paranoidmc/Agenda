"use client";
import { useEffect, useState, useMemo, Suspense } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import SidePanel from "../../components/SidePanel";
import EntityForm from "../../components/EntityForm";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import { useRouter, useSearchParams } from "next/navigation";
import AddFacilityPopup from "../../components/AddFacilityPopup"; // Import the AddFacilityPopup component

// Componente che utilizza useSearchParams
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
  const [isEditing, setIsEditing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Effetto: se openId cambia, carica l'attività giusta e apri il pannello
  useEffect(() => {
    if (isNew) {
      setIsPanelOpen(true);
      setIsEditing(true);
      setSelectedAttivita({
        descrizione: '',
        data_inizio: '',
        data_fine: '',
        client_id: null,
        site_id: '',
        driver_id: '',
        vehicle_id: '',
        activity_type_id: '',
        status: 'programmato',
        note: ''
      });
      setValidationErrors({});
      return;
    }
    if (openId) {
      // Se già caricata, seleziona direttamente
      const found = attivita.find(a => String(a.id) === String(openId));
      if (found) {
        // Patch: se manca status ma esiste stato, copia stato in status (minuscolo)
        let coerente = { ...found };
        if (!coerente.status && coerente.stato) {
          coerente.status = String(coerente.stato).toLowerCase();
        }
        setSelectedAttivita(coerente);
        setIsPanelOpen(true);
        setIsEditing(false);
        setValidationErrors({});
        if (coerente.client_id) loadSediPerCliente(coerente.client_id);
      } else {
        // Se non trovata, fetch singola attività (fallback)
        api.get(`/activities/${openId}`)
          .then(res => {
            let coerente = { ...res.data };
            if (!coerente.status && coerente.stato) {
              coerente.status = String(coerente.stato).toLowerCase();
            }
            setSelectedAttivita(coerente);
            setIsPanelOpen(true);
            setIsEditing(false);
            setValidationErrors({});
            if (coerente.client_id) loadSediPerCliente(coerente.client_id);
          })
          .catch(() => {
            setSelectedAttivita(null);
            setIsPanelOpen(false);
          });
      }
    } else {
      setIsPanelOpen(false);
      setSelectedAttivita(null);
      setIsEditing(false);
      setValidationErrors({});
    }
    // eslint-disable-next-line
  }, [openId, attivita, isNew]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableWidth, setTableWidth] = useState('100%');
  const [clienti, setClienti] = useState([]);
  const [veicoli, setVeicoli] = useState([]);
  const [autisti, setAutisti] = useState([]);
  const [tipiAttivita, setTipiAttivita] = useState([]);
  const [sedi, setSedi] = useState([]);
  const [sediPerCliente, setSediPerCliente] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  // Handler unico per tutte le modifiche ai campi del form
  const handleFieldChange = (name, value) => {
    console.log('[DEBUG][handleFieldChange] CAMPO CAMBIATO:', name, value);
    if (name === 'data_inizio' || name === 'data_fine') {
      console.log('[DEBUG][handleFieldChange] CAMPO DATA CAMBIATO', name, value);
    }
    setSelectedAttivita(prev => {
      let newState = { ...prev, [name]: value };
      // Reset della sede se cambio cliente
      if (name === 'client_id') {
        newState.site_id = '';
        console.log('[DEBUG][handleFieldChange] Reset site_id per cambio cliente');
      }
      return newState;
    });
    // Caricamento risorse disponibili su cambio data/fascia oraria
    if (name === 'data_inizio' || name === 'time_slot') {
      setTimeout(() => loadAvailableResources(), 100);
    }
    // Caricamento sedi per cliente
    if (name === 'client_id') {
      console.log('[DEBUG][handleFieldChange] Chiamo loadSediPerCliente con:', value);
      loadSediPerCliente(value);
    }
  };

  // Funzione per formattare la data in modo leggibile (it-IT)
  // Parsing manuale che ignora offset e secondi
  const formatDate = (dateString) => {
  if (!dateString) return 'N/D';
  // Usa direttamente la stringa ISO 8601 con offset (Europe/Rome)
  const d = new Date(dateString);
  // Ricava giorno/mese/anno/ora/minuto in locale Europe/Rome
  return d.toLocaleString('it-IT', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(',', '');
};

  // Per input type="datetime-local": estrae solo YYYY-MM-DDTHH:mm
  const toInputDatetimeLocal = (dateString) => {
    if (!dateString) return '';
    const match = dateString.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    return match ? match[1] : '';
  };


  // Funzione per ottenere i campi del form attività
  const getAttivitaFields = (selectedAttivita) => {
    // Determina quali sedi mostrare in base al cliente selezionato
    let sediOptions = [];
    const clienteId = selectedAttivita?.client_id;
    const clientKey = String(clienteId);
    // Debug log
    console.log('[DEBUG][getAttivitaFields] sediPerCliente keys:', Object.keys(sediPerCliente));
    console.log('[DEBUG][getAttivitaFields] clientKey:', clientKey, typeof clientKey);
    console.log('[DEBUG][getAttivitaFields] sedi trovate:', sediPerCliente[clientKey]);
    console.log('[DEBUG][getAttivitaFields] clienteId:', clienteId);

    if (clientKey && sediPerCliente[clientKey]) {
      // Se abbiamo le sedi per questo cliente, le utilizziamo
      sediOptions = sediPerCliente[clientKey].map(sede => ({
        value: sede.id,
        label: sede.nome || sede.name
      }));
    } else {
      sediOptions = [{ value: '', label: 'Seleziona prima un cliente' }];
    }

    return [
      { name: 'descrizione', label: 'Descrizione', type: 'textarea' },
      { 
        name: 'data_inizio', 
        label: 'Data/Ora Inizio', 
        type: 'datetime-local', 
        required: true,
        value: toInputDatetimeLocal(selectedAttivita?.data_inizio),
        onChange: handleFieldChange
      },
      { 
        name: 'data_fine', 
        label: 'Data/Ora Fine', 
        type: 'datetime-local', 
        required: false,
        value: toInputDatetimeLocal(selectedAttivita?.data_fine)
      },
      { 
        name: 'client_id', 
        label: 'Cliente', 
        type: 'select', 
        isNumeric: true, 
        required: true,
        options: Array.isArray(clienti) ? clienti.map(cliente => ({ 
          value: cliente.id, 
          label: cliente.nome || cliente.name || '' 
        })) : [],
        onChange: handleFieldChange
      },
      { 
        name: 'site_id', 
        label: 'Sede', 
        type: 'select', 
        isNumeric: true, 
        required: true,
        options: sediOptions,
        disabled: !clienteId || sediOptions.length === 0 || sediOptions[0]?.value === ''
      },
      { 
        name: 'driver_id', 
        label: 'Autista', 
        type: 'select', 
        isNumeric: true, 
        required: false,
        options: (() => {
          let opts = Array.isArray(autisti) ? autisti.map(autista => ({ 
            value: autista.id, 
            label: `${autista.nome || ''} ${autista.cognome || ''}`.trim() 
          })) : [];
          // Se il valore selezionato non è tra le opzioni, aggiungilo
          const selId = selectedAttivita?.driver_id;
          if (
            selId &&
            !opts.some(opt => String(opt.value) === String(selId)) &&
            selectedAttivita.driver
          ) {
            opts = [
              {
                value: selectedAttivita.driver.id,
                label: `${selectedAttivita.driver.nome || ''} ${selectedAttivita.driver.cognome || ''}`.trim() + ' (non disponibile)',
                isDisabled: true
              },
              ...opts
            ];
          }
          return opts;
        })()
      },
      { 
        name: 'vehicle_id', 
        label: 'Veicolo', 
        type: 'select', 
        isNumeric: true, 
        required: false,
        options: (() => {
          // Date selezionate per l'attività
          const attivitaInizio = selectedAttivita?.data_inizio ? new Date(selectedAttivita.data_inizio) : null;
          const attivitaFine = selectedAttivita?.data_fine ? new Date(selectedAttivita.data_fine) : attivitaInizio;
          // Funzione per verificare se un veicolo è impegnato in noleggio in quell'intervallo
          function isNoleggiato(v) {
            if (!v.contract_start_date || !v.contract_end_date) return false;
            const start = new Date(v.contract_start_date);
            const end = new Date(v.contract_end_date);
            if (!attivitaInizio) return false; // Se non c'è data attività, mostra tutto
            // Se l'intervallo attività si sovrappone al periodo di noleggio
            return (attivitaInizio <= end && attivitaFine >= start);
          }
          let opts = Array.isArray(veicoli) ? veicoli.map(veicolo => ({ 
            value: veicolo.id, 
            label: `${veicolo.targa || ''} - ${veicolo.marca || ''} ${veicolo.modello || ''}`.trim() + (isNoleggiato(veicolo) ? ' (noleggio attivo)' : ''),
            isDisabled: isNoleggiato(veicolo)
          })) : [];
          const selId = selectedAttivita?.vehicle_id;
          if (
            selId &&
            !opts.some(opt => String(opt.value) === String(selId)) &&
            selectedAttivita.vehicle
          ) {
            opts = [
              {
                value: selectedAttivita.vehicle.id,
                label: `${selectedAttivita.vehicle.targa || ''} - ${selectedAttivita.vehicle.marca || ''} ${selectedAttivita.vehicle.modello || ''}`.trim() + ' (non disponibile)',
                isDisabled: true
              },
              ...opts
            ];
          }
          return opts;
        })()
      },
      { 
        name: 'activity_type_id', 
        label: 'Tipo Attività', 
        type: 'select', 
        isNumeric: true, 
        required: true,
        options: Array.isArray(tipiAttivita) ? tipiAttivita.map(tipo => ({ 
          value: tipo.id, 
          label: tipo.nome || tipo.name || '' 
        })) : [],
      },
      { 
        name: 'status', 
        label: 'Stato', 
        type: 'select', 
        required: true,
        options: [
          { value: 'non assegnato', label: 'Non assegnato' },
          { value: 'assegnato', label: 'Assegnato' },
          { value: 'doc emesso', label: 'Doc emesso' },
          { value: 'programmato', label: 'Programmato' },
          { value: 'in corso', label: 'In corso' },
          { value: 'completato', label: 'Completato' },
          { value: 'annullato', label: 'Annullato' }
        ],
      },
      { name: 'note', label: 'Note', type: 'textarea' }
    ];
  };

  useEffect(() => {
    if (!loading && user) {
      Promise.all([
        loadClienti(),
        loadVeicoli(),
        loadAutisti(),
        loadSedi(),
        loadTipiAttivita()
      ]).then(() => {
        fetchAttivita();
      });
    } else if (!loading && !user) {
      setFetching(false);
    }
    // eslint-disable-next-line
  }, [user, loading, currentPage, perPage, searchTerm]);

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
  
  // Reset degli errori di validazione quando si cambia modalità di editing
  useEffect(() => {
    setValidationErrors({});
  }, [isEditing]);
  
  // Effetto per ricaricare le sedi quando cambia il cliente selezionato
  useEffect(() => {
    if (selectedAttivita?.client_id) {
      loadSediPerCliente(selectedAttivita.client_id);
    }
  }, [selectedAttivita?.client_id]);
  
  // Effetto per caricare autisti e veicoli disponibili quando cambiano data e fascia oraria
  useEffect(() => {
    if (selectedAttivita?.data_inizio && (selectedAttivita?.time_slot || selectedAttivita?.data_inizio)) {
      loadAvailableResources();
    }
  }, [selectedAttivita?.data_inizio, selectedAttivita?.time_slot]);
  
  // Handler specifici rimossi: ora si usa solo handleFieldChange

  const fetchAttivita = async () => {
    setFetching(true);
    try {
      let tipiAttivitaLocali = tipiAttivita;
      if (tipiAttivitaLocali.length === 0) {
        const tipiResponse = await api.get("/activity-types");
        tipiAttivitaLocali = tipiResponse.data;
        setTipiAttivita(tipiAttivitaLocali);
      }
      // Ora carichiamo le attività (paginata e ricercabile)
      const attivitaResponse = await api.get("/activities", {
        params: {
          page: currentPage,
          perPage: perPage,
          search: searchTerm
        }
      });
      setTotal(attivitaResponse.data.total || 0);
      const attivitaArr = Array.isArray(attivitaResponse.data.data) ? attivitaResponse.data.data : [];
      // Se vuoi ordinare le attività per data_inizio (opzionale):
      // attivitaArr.sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio));
      // Verifica che ogni attività abbia un tipo di attività
      const attivitaConTipi = attivitaArr.map(attivita => {
        if (!attivita.activityType && attivita.activity_type_id) {
          const tipoAttivita = tipiAttivitaLocali.find(tipo => tipo.id === attivita.activity_type_id);
          if (tipoAttivita) {
            attivita.activityType = {
              id: tipoAttivita.id,
              name: tipoAttivita.name || tipoAttivita.nome,
              color: tipoAttivita.color || tipoAttivita.colore,
              nome: tipoAttivita.nome || tipoAttivita.name,
              colore: tipoAttivita.colore || tipoAttivita.color
            };
          }
        }
        return attivita;
      });
      setAttivita(attivitaConTipi);
    } catch (err) {
      console.error("Errore durante il caricamento:", err);
      if (err.response && err.response.status === 401) {
        setError("Sessione scaduta. Effettua nuovamente il login.");
      } else {
        setError("Errore nel caricamento delle attività");
      }
    } finally {
      setFetching(false);
    }
  };

  const loadClienti = () => {
    return api.get("/clients", { params: { perPage: 20000 } })
      .then(res => {
        // Verifica che res.data sia un array o estrai l'array da res.data.data
        let clientiData = [];
        if (Array.isArray(res.data)) {
          clientiData = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          clientiData = res.data.data;
        } else {
          console.error("Formato dati clienti non valido:", res.data);
        }
        
        // console.log("Clienti caricati:", clientiData.length);
        setClienti(clientiData);
        return clientiData;
      })
      .catch(err => {
        console.error("Errore nel caricamento dei clienti:", err);
        return [];
      });
  };

  const loadVeicoli = () => {
    return api.get("/vehicles")
      .then(res => {
        // Verifica che res.data sia un array o estrai l'array da res.data.data
        let veicoliData = [];
        if (Array.isArray(res.data)) {
          veicoliData = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          veicoliData = res.data.data;
        } else {
          console.error("Formato dati veicoli non valido:", res.data);
        }
        
        // console.log("Veicoli caricati:", veicoliData.length);
        setVeicoli(veicoliData);
        return veicoliData;
      })
      .catch(err => {
        console.error("Errore nel caricamento dei veicoli:", err);
        return [];
      });
  };

  const loadAutisti = () => {
    return api.get("/drivers")
      .then(res => {
        // Verifica che res.data sia un array o estrai l'array da res.data.data
        let autistiData = [];
        if (Array.isArray(res.data)) {
          autistiData = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          autistiData = res.data.data;
        } else {
          console.error("Formato dati autisti non valido:", res.data);
        }
        
        // console.log("Autisti caricati:", autistiData.length);
        setAutisti(autistiData);
        return autistiData;
      })
      .catch(err => {
        console.error("Errore nel caricamento degli autisti:", err);
        return [];
      });
  };

  const loadTipiAttivita = () => {
    return api.get("/activity-types")
      .then(res => {
        // Verifica che res.data sia un array o estrai l'array da res.data.data
        let tipiData = [];
        if (Array.isArray(res.data)) {
          tipiData = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          tipiData = res.data.data;
        } else {
          console.error("Formato dati tipi attività non valido:", res.data);
        }
        
        // console.log("Tipi di attività caricati:", tipiData.length);
        setTipiAttivita(tipiData);
        return tipiData; // Restituisce i dati per poterli usare in una Promise chain
      })
      .catch(err => {
        console.error("Errore nel caricamento dei tipi di attività:", err);
        return []; // Restituisce un array vuoto in caso di errore
      });
  };
  
  const loadSedi = () => {
    return api.get("/sites")
      .then(res => {
        // Verifica che res.data sia un array o estrai l'array da res.data.data
        let sediData = [];
        if (Array.isArray(res.data)) {
          sediData = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          sediData = res.data.data;
        } else {
          console.error("Formato dati sedi non valido:", res.data);
        }
        
        // console.log("Sedi caricate:", sediData.length);
        setSedi(sediData);
        return sediData;
      })
      .catch(err => {
        console.error("Errore nel caricamento delle sedi:", err);
        return [];
      });
  };
  
  const loadSediPerCliente = (clientId) => {
    console.log('[DEBUG][loadSediPerCliente] chiamata con clientId:', clientId);
    if (!clientId) {
      console.log("loadSediPerCliente: clientId non valido", clientId);
      return;
    }
    
    // Assicurati che clientId sia un numero
    const numericClientId = Number(clientId);
    if (isNaN(numericClientId)) {
      console.error("loadSediPerCliente: clientId non è un numero valido", clientId);
      return;
    }
    
    console.log("Caricamento sedi per cliente:", numericClientId);
    
    // Carica sempre le sedi per assicurarti di avere i dati più aggiornati
    // Aggiungiamo un parametro per evitare la cache e impostiamo useCache a false
    api.get(`/clients/${numericClientId}/sites`, {
      params: { _t: new Date().getTime() },
      useCache: false
    })
      .then(res => {
        console.log("Risposta sedi per cliente:", numericClientId, res.data);
        
        // Verifica che res.data sia un array o estrai l'array da res.data.data
        let sediData = [];
        if (Array.isArray(res.data)) {
          sediData = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          sediData = res.data.data;
        } else {
          console.error("Formato dati sedi per cliente non valido:", res.data);
        }
        
        console.log("Sedi caricate per cliente:", numericClientId, sediData.length);
        setSediPerCliente(prev => ({
          ...prev,
          [String(clientId)]: sediData
        }));
      })
      .catch(err => {
        console.error(`Errore nel caricamento delle sedi per il cliente ${numericClientId}:`, err);
        
        // Log dettagliato dell'errore
        if (err.response) {
          console.error("Dettagli errore:", {
            status: err.response.status,
            data: err.response.data,
            headers: err.response.headers
          });
        
          // In caso di errore, imposta un array vuoto per evitare errori
          setSediPerCliente(prev => ({
            ...prev,
            [String(clientId)]: []
          }));
        } else if (err.request) {
          console.error("Nessuna risposta ricevuta:", err.request);
        } else {
          console.error("Errore di configurazione:", err.message);
        }
      });
  };
  
  const loadAvailableResources = () => {
    if (!selectedAttivita?.data_inizio) return;
    
    // Estrai solo la data dalla data_inizio (formato ISO)
    const date = selectedAttivita.data_inizio.split('T')[0];
    const timeSlot = selectedAttivita.time_slot || 'full_day';
    
    console.log("Caricamento risorse disponibili per:", { date, timeSlot });
    
    api.get(`/available-resources?date=${date}&time_slot=${timeSlot}`)
      .then(res => {
        console.log("Risorse disponibili:", res.data);
        
        // Aggiorna gli autisti e i veicoli disponibili
        if (res.data.drivers) {
          setAutisti(res.data.drivers);
        }
        
        if (res.data.vehicles) {
          setVeicoli(res.data.vehicles);
        }
      })
      .catch(err => {
        console.error("Errore nel caricamento delle risorse disponibili:", err);
        // In caso di errore, carica tutti gli autisti e veicoli
        loadAutisti();
        loadVeicoli();
      });
  };

  const handleViewDetails = (item) => {
    // Aggiorna la query string per aprire la SidePanel su quell'attività
    router.push(`/attivita?open=${item.id}`);
  };

  const handleClosePanel = () => {
    // Rimuovi il param "open" dalla query string
    const params = new URLSearchParams(searchParams.toString());
    params.delete('open');
    router.replace(`/attivita${params.toString() ? '?' + params.toString() : ''}`);
    setIsPanelOpen(false);
    setSelectedAttivita(null);
    setIsEditing(false);
    setValidationErrors({});
  };


  const handleSaveAttivita = async (formData) => {
    setIsSaving(true);
    setValidationErrors({});
    
    try {
      // Assicuriamoci che i campi ID siano numeri
      const preparedData = { ...formData };
      // Mappa i valori italiani di status verso quelli inglesi accettati dal backend
      const statusMap = {
        'non assegnato': 'unassigned',
        'assegnato': 'assigned',
        'doc emesso': 'doc_issued',
        'programmato': 'planned',
        'in corso': 'in_progress',
        'completato': 'completed',
        'annullato': 'cancelled'
      };
      if (preparedData.status) {
        preparedData.status = statusMap[preparedData.status.toLowerCase()] || 'planned';
      }

      // PATCH: non manipolare mai data_inizio/data_fine, invia esattamente il valore dell'input
      console.log('[DEBUG][handleSaveAttivita] preparedData.status dopo mappatura:', preparedData.status);
      if (formData.data_inizio) preparedData.data_inizio = formData.data_inizio;
      if (formData.data_fine) preparedData.data_fine = formData.data_fine;
      
      // Converti gli ID in numeri
      ['client_id', 'site_id', 'driver_id', 'vehicle_id', 'activity_type_id'].forEach(field => {
        if (preparedData[field]) {
          preparedData[field] = Number(preparedData[field]);
        }
      });
      
      // Assicurati che time_slot sia impostato
      if (!preparedData.time_slot) {
        preparedData.time_slot = 'full_day';
      }
      
      // Assicurati che le date siano nel formato corretto
      if (preparedData.data_inizio && typeof preparedData.data_inizio === 'string') {
        // Estrai solo la data se è in formato datetime-local
        if (preparedData.data_inizio.includes('T')) {
          const [date, time] = preparedData.data_inizio.split('T');
          preparedData.date = date; // Imposta anche il campo date per il backend
        }
      }
      
      // Se data_fine non è impostata, usa data_inizio
      if (!preparedData.data_fine && preparedData.data_inizio) {
        preparedData.data_fine = preparedData.data_inizio;
      }
      
      // Assicura che il campo status venga sempre inviato (NON sovrascrivere la mappatura inglese)
      // delete preparedData.stato; // Non inviare mai 'stato', solo 'status'
      if (!preparedData.status && preparedData.stato) {
        preparedData.status = String(preparedData.stato).toLowerCase();
      }
      delete preparedData.stato;
      
      // Genera automaticamente un titolo basato sulla data e sul cliente
      let clienteNome = '';
      if (Array.isArray(clienti)) {
        const cliente = clienti.find(c => c.id === Number(preparedData.client_id));
        clienteNome = cliente?.nome || '';
      } else {
        console.warn('clienti non è un array:', clienti);
      }
      const dataFormattata = new Date(preparedData.data_inizio).toLocaleDateString();
      preparedData.titolo = `${clienteNome} - ${dataFormattata}`;
      console.log('Titolo generato automaticamente:', preparedData.titolo);
      
      // Aggiungi informazioni sul tipo di attività
      if (preparedData.activity_type_id) {
        const tipoAttivita = tipiAttivita.find(tipo => tipo.id === Number(preparedData.activity_type_id));
        if (tipoAttivita) {
          console.log('Tipo attività trovato:', tipoAttivita);
          preparedData.activityType = {
            id: tipoAttivita.id,
            name: tipoAttivita.name || tipoAttivita.nome,
            color: tipoAttivita.color || tipoAttivita.colore,
            nome: tipoAttivita.nome || tipoAttivita.name,
            colore: tipoAttivita.colore || tipoAttivita.color
          };
        }
      }
      
      // Log per debug
      console.log('Dati attività da salvare:', preparedData);
      
      let response;
      if (preparedData.id) {
        // Aggiornamento
        console.log('[DEBUG][PUT] Payload inviato:', preparedData);
        console.log(`Invio richiesta PUT a /activities/${preparedData.id}`);
        response = await api.put(`/activities/${preparedData.id}`, preparedData);
        console.log('Risposta aggiornamento attività:', response.data);
        
        // Aggiorna la lista delle attività
        setAttivita(prev => 
          prev.map(a => a.id === preparedData.id ? response.data : a)
        );
        
        // Aggiorna l'attività selezionata
        setSelectedAttivita(response.data);
        
        // Mostra un messaggio di successo
        alert('Attività aggiornata con successo!');
      } else {
        // Creazione
        console.log('[DEBUG][POST] Payload inviato:', preparedData);
        console.log('Invio richiesta POST a /activities');
        response = await api.post('/activities', preparedData);
        console.log('Risposta creazione attività:', response.data);
        
        // Aggiorna la lista delle attività
        setAttivita(prev => [...prev, response.data]);
        
        // Seleziona la nuova attività
        setSelectedAttivita(response.data);
        
        // Mostra un messaggio di successo
        alert('Attività creata con successo!');
      }
      
      setIsEditing(false);
    } catch (err) {
      console.error("Errore durante il salvataggio:", err);
      
      // Gestione specifica degli errori di validazione (422)
      if (err.response && err.response.status === 422) {
        console.error("Errori di validazione:", err.response.data);
        
        // Se il backend restituisce errori di validazione in formato Laravel
        if (err.response.data.errors) {
          setValidationErrors(err.response.data.errors);
          
          // Crea un messaggio di errore leggibile
          const errorMessages = Object.entries(err.response.data.errors)
            .map(([field, messages]) => {
              // Trova il label del campo per un messaggio più user-friendly
              const fields = getAttivitaFields(selectedAttivita);
              const fieldConfig = fields.find(f => f.name === field);
              const fieldLabel = fieldConfig ? fieldConfig.label : field;
              return `${fieldLabel}: ${messages.join(', ')}`;
            })
            .join('\n');
          
          alert(`Errori di validazione:\n${errorMessages}`);
        } else {
          // Fallback se il formato è diverso
          alert("Si sono verificati errori di validazione. Controlla i dati inseriti.");
        }
      } else if (err.response) {
        // Altri errori HTTP
        console.error("Dettagli errore:", {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        
        // Mostra un messaggio più specifico se disponibile
        const errorMessage = err.response.data?.message || "Si è verificato un errore durante il salvataggio. Riprova più tardi.";
        alert(errorMessage);
      } else if (err.request) {
        // La richiesta è stata effettuata ma non è stata ricevuta alcuna risposta
        console.error("Nessuna risposta ricevuta:", err.request);
        alert("Nessuna risposta dal server. Verifica la connessione di rete.");
      } else {
        // Si è verificato un errore durante l'impostazione della richiesta
        alert("Si è verificato un errore durante il salvataggio. Riprova più tardi.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAttivita = async (id) => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/activities/${id}`);
      
      // Rimuovi l'attività dalla lista
      setAttivita(prev => prev.filter(a => a.id !== id));
      
      // Chiudi il pannello
      handleClosePanel();
    } catch (err) {
      console.error("Errore durante l'eliminazione:", err);
      
      // Mostra dettagli dell'errore per il debug
      if (err.response) {
        console.error("Dettagli errore:", {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        
        // Mostra un messaggio più specifico se disponibile
        const errorMessage = err.response.data?.message || "Si è verificato un errore durante l'eliminazione. Riprova più tardi.";
        alert(errorMessage);
      } else {
        alert("Si è verificato un errore durante l'eliminazione. Riprova più tardi.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  

const handleCreateNew = () => {
  const now = new Date();
  // Ottieni la data e ora locale Europe/Rome in formato YYYY-MM-DDTHH:mm
  const toDatetimeLocal = (date) => {
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
    const year = tzDate.getFullYear();
    const month = String(tzDate.getMonth() + 1).padStart(2, '0');
    const day = String(tzDate.getDate()).padStart(2, '0');
    const hour = String(tzDate.getHours()).padStart(2, '0');
    const minute = String(tzDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };
  const dataInizio = toDatetimeLocal(now);
  setSelectedAttivita({
    data_inizio: dataInizio,
    data_fine: dataInizio,
    status: 'programmato',
    client_id: '',
    site_id: ''
  });
  setIsEditing(true);
  setIsPanelOpen(true);
  setValidationErrors({});
};

// Funzione per ottenere il colore dello stato
const getStatusColor = (stato) => {
  switch (stato?.toLowerCase()) {
    case 'non assegnato':
      return '#3b82f6'; // Blu
    case 'assegnato':
      return '#eab308'; // Giallo
    case 'doc emesso':
      return '#ef4444'; // Rosso
    case 'programmato':
    case 'programmata':
      return '#8b5cf6'; // Viola
    case 'in corso':
      return '#f97316'; // Arancione
    case 'completato':
    case 'completata':
      return '#22c55e'; // Verde
    case 'annullato':
    case 'annullata':
      return '#ec4899'; // Rosa
    default:
      return '#6b7280'; // Grigio scuro
  }
};

if (loading || fetching) return <div className="centered">Caricamento...</div>;
if (error) return <div className="centered">{error}</div>;

return (
  <div style={{ padding: 32 }}>
    <PageHeader 
      title="Attività" 
      buttonLabel="Nuova Attività" 
      onAddClick={handleCreateNew} 
    />
      <div 
        style={{ 
          transition: 'width 0.3s ease-in-out',
          width: tableWidth,
          overflow: 'hidden'
        }}
      >
        <DataTable 
          data={Array.isArray(attivita) ? attivita : []}
          columns={[
            {
              key: 'client.nome',
              label: 'Cliente',
              render: (item) => item.client ? item.client.nome : 'N/D'
            },
            {
              key: 'site.nome',
              label: 'Sede',
              render: (item) => item.site ? item.site.nome : 'N/D'
            },
            {
              key: 'descrizione',
              label: 'Descrizione Attività',
              render: (item) => item.descrizione || item.titolo || 'N/D'
            },
            {
              key: 'orario',
              label: 'Orario',
              render: (item) => {
                const inizio = formatDate(item.data_inizio);
                const fine = formatDate(item.data_fine);
                return (
                  <span>{inizio}{fine && fine !== inizio ? ' → ' + fine : ''}</span>
                );
              }
            },
            {
              key: 'driver',
              label: 'Autista',
              render: (item) => item.driver ? `${item.driver.nome} ${item.driver.cognome}` : 'N/D'
            },
            {
              key: 'vehicle',
              label: 'Veicolo',
              render: (item) => item.vehicle ? (item.vehicle.targa ? `${item.vehicle.targa} (${item.vehicle.modello || ''})` : item.vehicle.modello || 'N/D') : 'N/D'
            },
            {
              key: 'activityType',
              label: 'Tipologia di Attività',
              render: (item) => {
                if (!item.activityType && item.activity_type_id) {
                  const tipoAttivita = tipiAttivita.find(tipo => tipo.id === item.activity_type_id);
                  if (tipoAttivita) {
                    item.activityType = {
                      id: tipoAttivita.id,
                      name: tipoAttivita.name || tipoAttivita.nome,
                      color: tipoAttivita.color || tipoAttivita.colore,
                      nome: tipoAttivita.nome || tipoAttivita.name,
                      colore: tipoAttivita.colore || tipoAttivita.color
                    };
                  } else {
                    return `ID: ${item.activity_type_id}`;
                  }
                }
                const tipo = item.activityType;
                if (!tipo) return 'N/D';
                const color = tipo.colore || tipo.color || '#007aff';
                const nome = tipo.nome || tipo.name || 'N/D';
                return (
                  <span style={{
                    display: 'inline-block',
                    padding: '0.2em 0.6em',
                    borderRadius: '0.25em',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#fff',
                    backgroundColor: color.startsWith('#') ? color : '#007aff'
                  }}>{nome}</span>
                );
              }
            },
            {
              key: 'status',
              label: 'Stato',
              render: (item) => (
                <span style={{
                  display: 'inline-block',
                  padding: '0.2em 0.6em',
                  borderRadius: '0.25em',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#fff',
                  backgroundColor: getStatusColor(item.status)
                }}>{item.status || 'N/D'}</span>
              )
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
        />

    {/* Pannello laterale per i dettagli */}
    <SidePanel 
      isOpen={isPanelOpen} 
      onClose={handleClosePanel} 
      title={isEditing ? "Modifica Attività" : "Dettagli Attività"}
    >
      {selectedAttivita && (
        <EntityForm
          key={`form-${selectedAttivita.client_id || ''}-${(sediPerCliente[selectedAttivita.client_id || ''] || []).length}`}
          data={selectedAttivita}
          fields={getAttivitaFields(selectedAttivita).map(field => ({
            ...field,
            onChange: handleFieldChange,
            error: validationErrors[field.name] ? validationErrors[field.name][0] : null
          }))}
          onSave={handleSaveAttivita}
          onDelete={handleDeleteAttivita}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          isLoading={isSaving || isDeleting}
          extraBelowSite={
            <button
              type="button"
              onClick={() => setIsPopupOpen(true)}
              style={{ marginTop: 8, width: '100%', background: '#e5e5ea', color: '#333', border: '1px solid #ccc', borderRadius: 8, padding: '8px', fontWeight: 500, fontSize: '1rem', cursor: 'pointer' }}
            >
              + Aggiungi Sede
            </button>
          }
        />
      )}
    </SidePanel>

    {/* Popup globale, sempre centrato sulla viewport */}
    <AddFacilityPopup
      isOpen={isPopupOpen}
      onClose={() => setIsPopupOpen(false)}
      onFacilityAdded={async (nuovaSede) => {
        if (!selectedAttivita?.client_id) return;
        try {
          const res = await api.get(`/clients/${selectedAttivita.client_id}/sites`);
          setSediPerCliente(prev => ({
            ...prev,
            [selectedAttivita.client_id]: Array.isArray(res.data) ? res.data : res.data.data || []
          }));
          // Seleziona automaticamente la nuova sede appena creata
          setSelectedAttivita(prev => ({
            ...prev,
            site_id: nuovaSede.id
          }));
        } catch (err) {
          setSediPerCliente(prev => ({ ...prev, [selectedAttivita.client_id]: [] }));
        }
        setIsPopupOpen(false);
      }}
      entityData={selectedAttivita}
      clienti={clienti}
    />
  </div>
</div>
);
}

// Componente principale che avvolge AttivitaContent in un Suspense
export default function AttivitaPage() {
  return (
    <Suspense fallback={<div className="centered">Caricamento...</div>}>
      <AttivitaContent />
    </Suspense>
  );
}
