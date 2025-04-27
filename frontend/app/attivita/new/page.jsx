"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import SidePanel from "../../../components/SidePanel";
import EntityForm from "../../../components/EntityForm";
import PageHeader from "../../../components/PageHeader";

// Client component that uses searchParams
function NewActivityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');
  const siteId = searchParams.get('site_id');
  const { user, loading } = useAuth();
  const [attivita, setAttivita] = useState({
    titolo: '',
    descrizione: '',
    data_inizio: '',
    data_fine: '',
    time_slot: 'full_day',
    client_id: clientId || '',
    site_id: siteId || '',
    driver_id: '',
    vehicle_id: '',
    activity_type_id: '',
    stato: 'programmato',
    note: ''
  });

  // Funzione per formattare la data (parsing manuale, senza new Date)
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

  // DEBUG: log ad ogni render
  console.log('[DEBUG] Render NewActivityContent', attivita);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [clienti, setClienti] = useState([]);
  const [veicoli, setVeicoli] = useState([]);
  const [autisti, setAutisti] = useState([]);
  const [tipiAttivita, setTipiAttivita] = useState([]);
  const [sedi, setSedi] = useState([]);
  const [sediPerCliente, setSediPerCliente] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  // Forza il caricamento sedi ogni volta che cambia il cliente selezionato
  useEffect(() => {
    if (attivita.client_id) {
      console.log('[DEBUG][useEffect] Cambio cliente, carico sedi per:', attivita.client_id);
      loadSediPerCliente(attivita.client_id);
    }
  }, [attivita.client_id]);

  // Gestisce il cambio di data o fascia oraria
  const handleDateOrTimeSlotChange = (name, value) => {
    console.log(`Campo ${name} cambiato a ${value}`);
    
    // Aggiorna l'attività selezionata
    setAttivita(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Se è cambiata la data o la fascia oraria, carica le risorse disponibili
    if (name === 'data_inizio' || name === 'time_slot') {
      // Aspetta che lo stato sia aggiornato prima di caricare le risorse
      setTimeout(() => {
        loadAvailableResources();
      }, 100);
    }
  };

  // Funzione per ottenere i campi del form attività
  const getAttivitaFields = () => {
    let sediOptions = [];
    const clienteId = attivita?.client_id;
    const clientKey = clienteId ? String(clienteId) : null;

    if (!clienteId) {
      // Nessun cliente selezionato
      sediOptions = [{ value: '', label: 'Seleziona prima un cliente' }];
      console.log('[DEBUG][getAttivitaFields] Nessun cliente selezionato');
    } else if (clientKey && sediPerCliente[clientKey]) {
      // Sedi caricate per il cliente
      sediOptions = sediPerCliente[clientKey].map(sede => ({
        value: sede.id,
        label: sede.nome || sede.name
      }));
      console.log('[DEBUG] Usando sedi specifiche per il cliente:', sediOptions);
    } else {
      // Cliente selezionato ma sedi non ancora caricate
      sediOptions = [{ value: '', label: 'Caricamento sedi...' }];
      console.log('[DEBUG][getAttivitaFields] Sedi non ancora caricate per clientKey:', clientKey);
    }
    
    console.log('[DEBUG][getAttivitaFields] clienteId:', clienteId);
    console.log('[DEBUG][getAttivitaFields] clientKey:', clientKey);

    return [
      { name: 'descrizione', label: 'Descrizione', type: 'textarea' },
      { 
        name: 'data_inizio', 
        label: 'Data/Ora Inizio', 
        type: 'datetime-local', 
        required: true 
      },
      { 
        name: 'data_fine', 
        label: 'Data/Ora Fine', 
        type: 'datetime-local', 
        required: false 
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
        onChange: handleClienteChange
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
        required: false,
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
          { value: 'non assegnato', label: 'Non assegnato' },
          { value: 'assegnato', label: 'Assegnato' },
          { value: 'doc emesso', label: 'Doc emesso' },
          { value: 'programmato', label: 'Programmato' },
          { value: 'in corso', label: 'In corso' },
          { value: 'completato', label: 'Completato' },
          { value: 'annullato', label: 'Annullato' }
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
        setFetching(false);
      });
    } else if (!loading && !user) {
      setFetching(false);
    }
  }, [user, loading]);

  // Effetto per ricaricare le sedi quando cambia il cliente selezionato
  useEffect(() => {
    if (attivita?.client_id) {
      loadSediPerCliente(attivita.client_id);
    }
  }, [attivita?.client_id]);
  
  // Effetto per caricare autisti e veicoli disponibili quando cambiano data e fascia oraria
  useEffect(() => {
    if (attivita?.data_inizio && (attivita?.time_slot || attivita?.data_inizio)) {
      loadAvailableResources();
    }
  }, [attivita?.data_inizio, attivita?.time_slot]);
  
  // Carica le sedi quando cambia il cliente selezionato
  const handleClienteChange = (name, value) => {
  console.log('[DEBUG] handleClienteChange - name:', name, 'value:', value, 'typeof value:', typeof value);
    console.log("Cliente cambiato:", value, typeof value);
    // Assicurati che il valore sia un numero
    const clientId = value ? Number(value) : null;
    console.log("Cliente ID convertito:", clientId, typeof clientId);
    if (clientId) {
      // Aggiorna il cliente nell'attività selezionata
      setAttivita(prev => ({
        ...prev,
        client_id: clientId,
        // Reset della sede quando cambia il cliente
        site_id: ""
      }));
      // Carica le sedi per questo cliente
      loadSediPerCliente(clientId);
    }
  };

  // Carica tutti i clienti (fino a 1000)
  const loadClienti = () => {
    return api.get("/clients", { params: { perPage: 20000 } })
      .then(res => {
        let clientiData = [];
        if (Array.isArray(res.data)) {
          clientiData = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          clientiData = res.data.data;
        } else {
          console.error("Formato dati clienti non valido:", res.data);
        }
        console.log("Clienti caricati:", clientiData.length);
        setClienti(clientiData);
        return clientiData;
      })
      .catch(err => {
        console.error("Errore nel caricamento dei clienti:", err);
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
        
        console.log("Autisti caricati:", autistiData.length);
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
        
        console.log("Tipi di attività caricati:", tipiData.length);
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
        
        console.log("Sedi caricate:", sediData.length);
        setSedi(sediData);
        return sediData;
      })
      .catch(err => {
        console.error("Errore nel caricamento delle sedi:", err);
        return [];
      });
  };
  
  const loadSediPerCliente = (clientId) => {
  // Forza la chiave a stringa ovunque
  const clientKey = String(clientId);
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
    
    // Usa l'endpoint specifico per caricare le sedi di un cliente
    // Aggiungiamo un parametro per evitare la cache e impostiamo useCache a false
    return api.get(`/clients/${numericClientId}/sites`, { params: { _t: new Date().getTime() }, useCache: false })
      .then(res => {
        let sediData = [];
        if (Array.isArray(res.data)) {
          sediData = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          sediData = res.data.data;
        } else if (res.data && typeof res.data === 'object') {
          sediData = Object.values(res.data);
        } else {
          console.error("Formato dati sedi per cliente non valido:", res.data);
        }
        
        console.log("Sedi per cliente:", numericClientId, sediData);
        
        // Aggiorna lo stato
        setSediPerCliente(prev => ({ ...prev, [String(clientId)]: sediData }));
      })
      .catch(err => {
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
          [String(clientId)]: []
        }));
      });
  };
  
  const loadAvailableResources = () => {
    if (!attivita?.data_inizio) return;
    // Estrai solo la data dalla data_inizio (formato ISO)
    const date = attivita.data_inizio.split('T')[0];
    const timeSlot = attivita.time_slot || 'full_day';
    
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

  const handleSaveAttivita = async (formData) => {
    setIsSaving(true);
    setValidationErrors({});
    try {
      // Assicuriamoci che i campi ID siano numeri
      const preparedData = { ...formData };
      // PATCH: non manipolare mai data_inizio/data_fine, invia esattamente il valore dell'input
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
      
      // Assicurati che stato sia impostato
      if (!preparedData.stato) {
        preparedData.stato = 'programmato';
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
      
      // Log per debug
      console.log('Dati attività da salvare:', preparedData);
      
      // Creazione
      console.log('Invio richiesta POST a /activities');
      const response = await api.post('/activities', preparedData);
      console.log('Risposta creazione attività:', response.data);
      
      // Reindirizza alla pagina dell'attività appena creata
      router.push(`/attivita/${response.data.id}`);
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
              const fields = getAttivitaFields();
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

  const handleBackToList = () => {
    router.push("/attivita");
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;

  // Campi dinamici generati ad ogni render
  const dynamicFields = getAttivitaFields();
  console.log('[DEBUG] Render EntityForm con fields:', dynamicFields);

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Nuova Attività" />
      <div style={{
        background: '#fff',
        borderRadius: 14,
        boxShadow: 'var(--box-shadow)',
        padding: 24
      }}>
        <EntityForm
          data={attivita}
          fields={dynamicFields}
          onSave={handleSaveAttivita}
          onCancel={handleBackToList}
          isSaving={isSaving}
          errors={validationErrors}
          isEditing={true}
          key={attivita.client_id || 'no-client'}
          // customHandlers o altre prop possono essere aggiunte qui se servono
        />
      </div>
    </div>
  );
}


// Main page component with Suspense
export default function NewActivityPage() {
  return (
    <Suspense fallback={<div className="centered">Caricamento...</div>}>
      <NewActivityContent />
    </Suspense>
  );
}
