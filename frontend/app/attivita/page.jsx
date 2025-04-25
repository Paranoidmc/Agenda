"use client";
import { useEffect, useState, useMemo } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import SidePanel from "../../components/SidePanel";
import EntityForm from "../../components/EntityForm";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

export default function AttivitaPage() {
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
    setSelectedAttivita(prev => {
      let newState = { ...prev, [name]: value };
      // Reset della sede se cambio cliente
      if (name === 'client_id') {
        newState.site_id = '';
      }
      return newState;
    });
    // Caricamento risorse disponibili su cambio data/fascia oraria
    if (name === 'data_inizio' || name === 'time_slot') {
      setTimeout(() => loadAvailableResources(), 100);
    }
    // Caricamento sedi per cliente
    if (name === 'client_id') {
      loadSediPerCliente(value);
    }
  };

  // Funzione per ottenere i campi del form attività
  const getAttivitaFields = (selectedAttivita) => {
    // Determina quali sedi mostrare in base al cliente selezionato
    let sediOptions = [];
    const clienteId = selectedAttivita?.client_id;
    
    console.log("getAttivitaFields - clienteId:", clienteId);
    console.log("getAttivitaFields - sediPerCliente:", sediPerCliente);
    
    if (clienteId && sediPerCliente[clienteId]) {
      // Se abbiamo le sedi per questo cliente, le utilizziamo
      sediOptions = sediPerCliente[clienteId].map(sede => ({ 
        value: sede.id, 
        label: sede.nome || sede.name 
      }));
      console.log("Usando sedi specifiche per il cliente:", sediOptions);
    } else if (!clienteId) {
      // Se non c'è un cliente selezionato, non mostriamo sedi
      sediOptions = [];
      console.log("Nessun cliente selezionato, nessuna sede disponibile");
    } else {
      // Se abbiamo un cliente ma non abbiamo ancora le sue sedi, carichiamole
      console.log("Cliente selezionato ma sedi non ancora caricate, caricamento in corso...");
      loadSediPerCliente(clienteId);
      // Mostriamo un messaggio di caricamento
      sediOptions = [{ value: "", label: "Caricamento sedi..." }];
    }
    
    return [
      { name: 'descrizione', label: 'Descrizione', type: 'textarea' },
      { 
        name: 'data_inizio', 
        label: 'Data Inizio', 
        type: 'datetime-local', 
        required: true,
        onChange: handleFieldChange
      },
      { 
        name: 'data_fine', 
        label: 'Data Fine', 
        type: 'datetime-local', 
        required: true 
      },
      { 
        name: 'time_slot', 
        label: 'Fascia Oraria', 
        type: 'select', 
        required: true,
        options: [
          { value: 'morning', label: 'Mattina' },
          { value: 'afternoon', label: 'Pomeriggio' },
          { value: 'full_day', label: 'Giornata intera' }
        ],
        onChange: handleFieldChange
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
        disabled: !clienteId || sediOptions.length === 0
      },
      { 
        name: 'driver_id', 
        label: 'Autista', 
        type: 'select', 
        isNumeric: true, 
        required: true,
        options: Array.isArray(autisti) ? autisti.map(autista => ({ 
          value: autista.id, 
          label: `${autista.nome || ''} ${autista.cognome || ''}`.trim() 
        })) : []
      },
      { 
        name: 'vehicle_id', 
        label: 'Veicolo', 
        type: 'select', 
        isNumeric: true, 
        required: true,
        options: Array.isArray(veicoli) ? veicoli.map(veicolo => ({ 
          value: veicolo.id, 
          label: `${veicolo.targa || ''} - ${veicolo.marca || ''} ${veicolo.modello || ''}`.trim() 
        })) : []
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
        })) : []
      },
      { 
        name: 'stato', 
        label: 'Stato', 
        type: 'select', 
        required: true,
        options: [
          { value: 'Programmata', label: 'Programmata' },
          { value: 'In corso', label: 'In corso' },
          { value: 'Completata', label: 'Completata' },
          { value: 'Annullata', label: 'Annullata' }
        ]
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
    return api.get("/clients")
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
    
    // Carica sempre le sedi per assicurarsi di avere i dati più aggiornati
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
          [numericClientId]: sediData
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
        } else if (err.request) {
          console.error("Nessuna risposta ricevuta:", err.request);
        } else {
          console.error("Errore di configurazione:", err.message);
        }
        
        // In caso di errore, imposta un array vuoto per evitare errori
        setSediPerCliente(prev => ({
          ...prev,
          [numericClientId]: []
        }));
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

  const handleViewDetails = (attivita) => {
    setSelectedAttivita(attivita);
    setIsEditing(false);
    setIsPanelOpen(true);
    setValidationErrors({});
    
    // Carica le sedi per il cliente selezionato
    if (attivita.client_id) {
      loadSediPerCliente(attivita.client_id);
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    // Reset dello stato dopo che l'animazione di chiusura è completata
    setTimeout(() => {
      setSelectedAttivita(null);
      setIsEditing(false);
      setValidationErrors({});
    }, 300);
  };

  const handleSaveAttivita = async (formData) => {
    setIsSaving(true);
    setValidationErrors({});
    
    try {
      // Assicuriamoci che i campi ID siano numeri
      const preparedData = { ...formData };
      
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
      
      // Assicurati che stato sia impostato
      if (!preparedData.stato) {
        preparedData.stato = 'Programmata';
        preparedData.status = 'planned';
      }
      
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
    setSelectedAttivita({
      data_inizio: new Date().toISOString().slice(0, 16),
      data_fine: new Date().toISOString().slice(0, 16),
      stato: 'Programmata'
    });
    setIsEditing(true);
    setIsPanelOpen(true);
    setValidationErrors({});
  };

  // Funzione per formattare la data
  const formatDate = (dateString) => {
    if (!dateString) return 'N/D';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Funzione per ottenere il colore dello stato
  const getStatusColor = (stato) => {
    switch (stato?.toLowerCase()) {
      case 'completata':
        return '#34c759'; // Verde
      case 'in corso':
        return '#007aff'; // Blu
      case 'programmata':
        return '#ff9500'; // Arancione
      case 'annullata':
        return '#ff3b30'; // Rosso
      default:
        return '#8e8e93'; // Grigio
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
              key: 'activityType',
              label: 'Tipo Attività',
              render: (item) => {
                // console.log("Rendering tipo attività per:", item);
                
                // Verifica se l'attività ha un tipo di attività
                if (!item.activityType && item.activity_type_id) {
                  // Se non ha un tipo ma ha un ID, cerchiamo di recuperarlo dai tipi caricati
                  const tipoAttivita = tipiAttivita.find(tipo => tipo.id === item.activity_type_id);
                  if (tipoAttivita) {
                    // Aggiorniamo l'attività con il tipo trovato
                    item.activityType = {
                      id: tipoAttivita.id,
                      name: tipoAttivita.name || tipoAttivita.nome,
                      color: tipoAttivita.color || tipoAttivita.colore,
                      nome: tipoAttivita.nome || tipoAttivita.name,
                      colore: tipoAttivita.colore || tipoAttivita.color
                    };
                    console.log("Tipo attività recuperato durante il rendering:", item.activityType);
                  } else {
                    console.warn(`Tipo attività con ID ${item.activity_type_id} non trovato durante il rendering`);
                    return `ID: ${item.activity_type_id}`;
                  }
                }
                
                const tipo = item.activityType;
                if (!tipo) {
                  console.warn("Nessun tipo attività trovato per:", item);
                  return 'N/D';
                }
                
                const color = tipo.colore || tipo.color || '#007aff';
                const nome = tipo.nome || tipo.name || 'N/D';
                
                // console.log(`Rendering tipo attività: ${nome} con colore ${color}`);
                
                return (
                  <span style={{ 
                    display: 'inline-block',
                    padding: '0.2em 0.6em',
                    borderRadius: '0.25em',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#fff',
                    backgroundColor: color.startsWith('#') ? color : '#007aff'
                  }}>
                    {nome}
                  </span>
                );
              }
            },
            { 
              key: 'data_inizio', 
              label: 'Data Inizio',
              render: (item) => formatDate(item.data_inizio)
            },
            { 
              key: 'data_fine', 
              label: 'Data Fine',
              render: (item) => formatDate(item.data_fine)
            },
            { 
              key: 'client.nome', 
              label: 'Cliente'
            },
            { 
              key: 'driver', 
              label: 'Autista',
              render: (item) => item.driver ? `${item.driver.nome} ${item.driver.cognome}` : 'N/D'
            },
            { 
              key: 'vehicle.targa', 
              label: 'Veicolo'
            },
            { 
              key: 'stato', 
              label: 'Stato',
              render: (item) => (
                <span style={{ 
                  display: 'inline-block',
                  padding: '0.2em 0.6em',
                  borderRadius: '0.25em',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#fff',
                  backgroundColor: getStatusColor(item.stato)
                }}>
                  {item.stato || 'N/D'}
                </span>
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
          filterableColumns={[
            { 
              key: 'titolo', 
              label: 'Titolo',
              filterType: 'text'
            },
            { 
              key: 'client.nome', 
              label: 'Cliente',
              filterType: 'text'
            },
            { 
              key: 'stato', 
              label: 'Stato',
              filterType: 'select',
              filterOptions: [
                { value: 'Programmata', label: 'Programmata' },
                { value: 'In corso', label: 'In corso' },
                { value: 'Completata', label: 'Completata' },
                { value: 'Annullata', label: 'Annullata' }
              ]
            }
          ]}
          onRowClick={handleViewDetails}
          selectedRow={selectedAttivita}
          searchPlaceholder="Cerca per cantiere..."
          emptyMessage="Nessuna attività trovata"
          filterFunction={(row, search) => {
            if (!search) return true;
            // Cerca solo per nome cantiere (sede)
            const sede = row.site?.nome || row.site?.name || '';
            return sede.toLowerCase().includes(search.toLowerCase());
          }}
        />
      </div>

      {/* Pannello laterale per i dettagli */}
      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={handleClosePanel} 
        title={isEditing ? "Modifica Attività" : "Dettagli Attività"}
      >
        {selectedAttivita && (
          <EntityForm
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
          />
        )}
      </SidePanel>
    </div>
  );
}
