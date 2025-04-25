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
    data_inizio: new Date().toISOString().slice(0, 16),
    data_fine: new Date().toISOString().slice(0, 16),
    time_slot: 'full_day',
    client_id: clientId || '',
    site_id: siteId || '',
    driver_id: '',
    vehicle_id: '',
    activity_type_id: '',
    stato: 'Programmata',
    note: ''
  });
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
    // Determina quali sedi mostrare in base al cliente selezionato
    let sediOptions = [];
    const clienteId = attivita?.client_id;
    
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
        onChange: handleDateOrTimeSlotChange
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
        onChange: handleDateOrTimeSlotChange
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
        
        console.log("Clienti caricati:", clientiData.length);
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
        
        console.log("Veicoli caricati:", veicoliData.length);
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
    api.get(`/clients/${numericClientId}/sites`, {
      params: { _t: new Date().getTime() },
      useCache: false
    })
      .then(res => {
        console.log("Sedi per cliente caricate:", res.data);
        
        // Estrai i dati dalla risposta
        let clientSites = [];
        if (Array.isArray(res.data)) {
          clientSites = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          clientSites = res.data.data;
        }
        
        console.log("Sedi per cliente:", numericClientId, clientSites);
        
        // Aggiorna lo stato
        setSediPerCliente(prev => ({
          ...prev,
          [numericClientId]: clientSites
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

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title="Nuova Attività" 
        buttonLabel="Torna alla lista" 
        onAddClick={handleBackToList} 
      />
      
      <div style={{ 
        background: '#fff', 
        borderRadius: 14, 
        boxShadow: 'var(--box-shadow)', 
        padding: 24
      }}>
        <EntityForm 
          fields={getAttivitaFields()}
          data={attivita}
          onSave={handleSaveAttivita}
          onCancel={handleBackToList}
          isSaving={isSaving}
          errors={validationErrors}
          isEditing={true}
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
