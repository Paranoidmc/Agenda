"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import SidePanel from "../../../components/SidePanel";
import EntityForm from "../../../components/EntityForm";
import PageHeader from "../../../components/PageHeader";

export default function AttivitaDetailPage({ params }) {
  // DEBUG LOG: solo questo log rimane
  if (typeof window !== 'undefined') {
    console.log('[DEBUG][COMPONENT] AttivitaDetailPage mount, params:', params);
  }
  const { id } = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [attivita, setAttivita] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clienti, setClienti] = useState([]);
  const [veicoli, setVeicoli] = useState([]);
  const [autisti, setAutisti] = useState([]);
  const [tipiAttivita, setTipiAttivita] = useState([]);
  const [sedi, setSedi] = useState([]);
  const [sediPerCliente, setSediPerCliente] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  // Handler unico per tutte le modifiche ai campi del form
  const handleFieldChange = (name, value) => {
    setAttivita(prev => {
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
    
    // // console.log("getAttivitaFields - clienteId:", clienteId);
    // // console.log("getAttivitaFields - sediPerCliente:", sediPerCliente);
    
    // // console.log('[DEBUG] getAttivitaFields - attivita.client_id:', clienteId);
    // // console.log('[DEBUG] getAttivitaFields - sediPerCliente:', sediPerCliente);
    if (clienteId && sediPerCliente[clienteId]) {
      // Se abbiamo le sedi per questo cliente, le utilizziamo
      sediOptions = sediPerCliente[clienteId].map(sede => ({ 
        value: String(sede.id), 
        label: sede.nome || sede.name 
      }));
      // // console.log('[DEBUG] Usando sedi specifiche per il cliente:', sediOptions);
    } else if (!clienteId) {
      // Se non c'è un cliente selezionato, non mostriamo sedi
      sediOptions = [];
      // // console.log('[DEBUG] Nessun cliente selezionato, nessuna sede disponibile');
    } else {
      // Se abbiamo un cliente ma non abbiamo ancora le sue sedi, carichiamole
      // // console.log('[DEBUG] Cliente selezionato ma sedi non ancora caricate, caricamento in corso...');
      loadSediPerCliente(clienteId);
      // Mostriamo un messaggio di caricamento
      sediOptions = [{ value: "", label: "Caricamento sedi..." }];
    }
    // // console.log('[DEBUG] attivita.site_id:', selectedAttivita?.site_id);
    // // console.log('[DEBUG] sediOptions:', sediOptions);
    
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
          value: String(cliente.id), 
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
          value: String(autista.id), 
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
          value: String(veicolo.id),
          label: `${veicolo.targa || ''} - ${veicolo.marca || ''} ${veicolo.modello || ''}`.trim()
        })) : [],
      },
      {
        name: 'activity_type_id',
        label: 'Tipo Attività',
        type: 'select', 
        isNumeric: true, 
        required: true,
        options: Array.isArray(tipiAttivita) ? tipiAttivita.map(tipo => ({ 
          value: String(tipo.id), 
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
      loadAttivita();
      loadClienti();
      loadVeicoli();
      loadAutisti();
      loadTipiAttivita();
      loadSedi();
    } else if (!loading && !user) {
      // Se non c'è un utente e non sta caricando, imposta fetching a false
      setFetching(false);
    }
  }, [user, loading, id]);

  // Reset degli errori di validazione quando si cambia modalità di editing
  useEffect(() => {
    setValidationErrors({});
  }, [isEditing]);
  
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
  
  // Handler specifici rimossi: ora si usa solo handleFieldChange

  const loadAttivita = async () => {
    setFetching(true);
    try {
      // Carica i tipi di attività prima di caricare l'attività
      let tipi = tipiAttivita;
      if (!tipi || tipi.length === 0) {
        const tipiRes = await api.get('/activity-types');
        tipi = tipiRes.data;
        setTipiAttivita(tipi);
      }
      // Carica l'attività
      const res = await api.get(`/activities/${id}`);
      let att = res.data;
      // Ricostruisci activityType se mancante
      if (!att.activityType && att.activity_type_id) {
        const tipo = tipi.find(t => t.id === att.activity_type_id);
        if (tipo) {
          att.activityType = {
            id: tipo.id,
            nome: tipo.nome || tipo.name,
            color: tipo.color || tipo.colore,
          };
        }
      }
      const attivitaObj = {
        ...att,
        client_id: att.client_id ? String(att.client_id) : '',
        site_id: att.site_id ? String(att.site_id) : '',
        driver_id: att.driver_id ? String(att.driver_id) : '',
        vehicle_id: att.vehicle_id ? String(att.vehicle_id) : '',
        activity_type_id: att.activity_type_id ? String(att.activity_type_id) : '',
        descrizione: att.descrizione ? String(att.descrizione) : '',
        note: att.note ? String(att.note) : '',
        driver: att.driver || null,
        vehicle: att.vehicle || null,
      };
      console.log('[DEBUG][loadAttivita] attivitaObj:', attivitaObj);
      setAttivita(attivitaObj);
    } catch (err) {
      console.error("Errore nel caricamento dell'attività:", err);
      if (err.response && err.response.status === 401) {
        setError("Sessione scaduta. Effettua nuovamente il login.");
      } else if (err.response && err.response.status === 404) {
        setError("Attività non trovata.");
      } else {
        setError("Errore nel caricamento dell'attività");
      }
    } finally {
      setFetching(false);
    }
  };


  const loadClienti = () => {
    // // console.log("Caricamento clienti...");
    api.get("/clients")
      .then(res => {
        // // console.log("Clienti caricati:", res.data);
        // Verifica che la risposta sia un array
        if (Array.isArray(res.data)) {
          setClienti(res.data);
        } else if (res.data && Array.isArray(res.data.data)) {
          // Alcuni endpoint potrebbero restituire i dati in un oggetto con una proprietà 'data'
          setClienti(res.data.data);
        } else {
          console.error("La risposta non è un array:", res.data);
          setClienti([]);
        }
      })
      .catch(err => {
        console.error("Errore nel caricamento dei clienti:", err);
        // In caso di errore, imposta un array vuoto per evitare errori
        setClienti([]);
      });
  };

  const loadVeicoli = () => {
    // // console.log("Caricamento veicoli...");
    api.get("/vehicles")
      .then(res => {
        // // console.log("Veicoli caricati:", res.data);
        if (Array.isArray(res.data)) {
          setVeicoli(res.data);
        } else if (res.data && Array.isArray(res.data.data)) {
          setVeicoli(res.data.data);
        } else {
          console.error("La risposta non è un array:", res.data);
          setVeicoli([]);
        }
      })
      .catch(err => {
        console.error("Errore nel caricamento dei veicoli:", err);
        setVeicoli([]);
      });
  };

  const loadAutisti = () => {
    // // console.log("Caricamento autisti...");
    api.get("/drivers")
      .then(res => {
        // // console.log("Autisti caricati:", res.data);
        if (Array.isArray(res.data)) {
          setAutisti(res.data);
        } else if (res.data && Array.isArray(res.data.data)) {
          setAutisti(res.data.data);
        } else {
          console.error("La risposta non è un array:", res.data);
          setAutisti([]);
        }
      })
      .catch(err => {
        console.error("Errore nel caricamento degli autisti:", err);
        setAutisti([]);
      });
  };

  const loadTipiAttivita = () => {
    // // console.log("Caricamento tipi attività...");
    api.get("/activity-types")
      .then(res => {
        // // console.log("Tipi attività caricati:", res.data);
        if (Array.isArray(res.data)) {
          setTipiAttivita(res.data);
        } else if (res.data && Array.isArray(res.data.data)) {
          setTipiAttivita(res.data.data);
        } else {
          console.error("La risposta non è un array:", res.data);
          setTipiAttivita([]);
        }
      })
      .catch(err => {
        console.error("Errore nel caricamento dei tipi di attività:", err);
        setTipiAttivita([]);
      });
  };
  
  const loadSedi = () => {
    // // console.log("Caricamento sedi...");
    api.get("/sites")
      .then(res => {
        // // console.log("Sedi caricate:", res.data);
        if (Array.isArray(res.data)) {
          setSedi(res.data);
        } else if (res.data && Array.isArray(res.data.data)) {
          setSedi(res.data.data);
        } else {
          console.error("La risposta non è un array:", res.data);
          setSedi([]);
        }
      })
      .catch(err => {
        console.error("Errore nel caricamento delle sedi:", err);
        setSedi([]);
      });
  };
  
  const loadSediPerCliente = (clientId) => {
    if (!clientId) {
      // // console.log("loadSediPerCliente: clientId non valido", clientId);
      return;
    }
    
    const clientKey = String(clientId);
    // // console.log("Caricamento sedi per cliente:", clientKey);
    // // console.log("Token di autenticazione presente:", localStorage.getItem('token') ? 'Sì' : 'No');
    api.get(`/clients/${clientKey}/sites`, {
      params: { _t: new Date().getTime() },
      useCache: false,
      headers: {
        'X-Debug-Client-Sites': 'true' // Header personalizzato per tracciare questa richiesta specifica
      }
    })
      .then(res => {
        // // console.log("Sedi per cliente - Risposta completa:", res);
        // // console.log("Sedi per cliente caricate:", res.data);
        
        // Estrai i dati dalla risposta
        let clientSites = [];
        if (Array.isArray(res.data)) {
          clientSites = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          // Se i dati sono annidati sotto 'data'
          clientSites = res.data.data;
        } else {
          console.error("Formato risposta sedi non valido:", res.data);
          clientSites = []; // Imposta un array vuoto se il formato non è riconosciuto
        }
        
        // Aggiorna lo stato con le sedi caricate
        setSediPerCliente(prev => ({
          ...prev,
          [clientKey]: clientSites
        }));
      })
      .catch(err => {
        console.error("Errore nel caricamento delle sedi per il cliente:", err);
        
        // Log dettagliato dell'errore
        if (err.response) {
          console.error("Dettagli errore:", {
            status: err.response.status,
            data: err.response.data,
            headers: err.response.headers,
            config: err.config
          });
        } else if (err.request) {
          console.error("Nessuna risposta ricevuta:", err.request);
        } else {
          console.error("Errore di configurazione:", err.message);
        }
        
        // In caso di errore, imposta un array vuoto per evitare errori
        setSediPerCliente(prev => ({
          ...prev,
          [clientKey]: []
        }));
      });
  };
  
  const loadAvailableResources = () => {
    if (!attivita?.data_inizio) return;
    
    // Estrai solo la data dalla data_inizio (formato ISO)
    const date = attivita.data_inizio.split('T')[0];
    const timeSlot = attivita.time_slot || 'full_day';
    
    // // console.log("Caricamento risorse disponibili per:", { date, timeSlot });
    
    api.get(`/available-resources?date=${date}&time_slot=${timeSlot}`)
      .then(res => {
        // // console.log("Risorse disponibili:", res.data);
        
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
      })
      .finally(() => {
        console.log('[DEBUG][loadAvailableResources] Autisti caricati:', autisti);
        console.log('[DEBUG][loadAvailableResources] Veicoli caricati:', veicoli);
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
      const clienteNome = clienti.find(c => c.id === Number(preparedData.client_id))?.nome || '';
      const dataFormattata = new Date(preparedData.data_inizio).toLocaleDateString();
      preparedData.titolo = `${clienteNome} - ${dataFormattata}`;
      // // console.log('Titolo generato automaticamente:', preparedData.titolo);
      
      // Log per debug
      // // console.log('Dati attività da salvare:', preparedData);
      
      // Aggiornamento
      // // console.log(`Invio richiesta PUT a /activities/${id}`);
      const response = await api.put(`/activities/${id}`, preparedData);
      // // console.log('Risposta aggiornamento attività:', response.data);
      
      // Aggiorna l'attività
      setAttivita(response.data);
      
      // Chiudi il pannello di modifica
      setIsEditing(false);
      
      // Mostra un messaggio di successo
      alert('Attività aggiornata con successo!');
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
              const fields = getAttivitaFields(attivita);
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

  const handleDeleteAttivita = async () => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/activities/${id}`);
      
      // Torna alla lista delle attività
      router.push('/attivita');
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

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;
  if (!attivita) return <div className="centered">Attività non trovata</div>;

  return (
    <div key={id} style={{ padding: 32 }}>
      <PageHeader
        title={`Attività: ${attivita.titolo}`}
        buttonLabel="Torna alla lista"
        onAddClick={() => router.push('/attivita')} 
      />
      
      <div className="activity-details">
        <h2>Dettaglio Attività</h2>
        {/* DEBUG VISIVO: mostra sempre lo stato attivita/driver/vehicle in UI */}
        <div style={{background:'#ffeeba',color:'#333',padding:'8px',fontSize:'0.85em',marginBottom:'10px'}}>
          <b>DEBUG attivita:</b> <pre>{JSON.stringify(attivita,null,2)}</pre>
          <b>DEBUG typeof attivita.driver:</b> <pre>{typeof attivita.driver}</pre>
          <b>DEBUG attivita.driver:</b> <pre>{JSON.stringify(attivita.driver,null,2)}</pre>
          <b>DEBUG typeof attivita.vehicle:</b> <pre>{typeof attivita.vehicle}</pre>
          <b>DEBUG attivita.vehicle:</b> <pre>{JSON.stringify(attivita.vehicle,null,2)}</pre>
        </div>
        <div className="detail-row">
          <div className="detail-label">Cliente:</div>
          <div className="detail-value">{attivita.client?.nome || 'N/D'}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Sede:</div>
          <div className="detail-value">{attivita.site?.nome || 'N/D'}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Data Inizio:</div>
          <div className="detail-value">{formatDate(attivita.data_inizio)}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Data Fine:</div>
          <div className="detail-value">{formatDate(attivita.data_fine)}</div>
        </div>
          <div className="detail-row">
            <div className="detail-label">Autista:</div>
            <div className="detail-value">
              {attivita.driver && (
                <div>
                  {attivita.driver.nome || attivita.driver.name || ''}
                  {' '}
                  {attivita.driver.cognome || attivita.driver.surname || ''}
                  {attivita.driver.id || attivita.driver_id ? ` (ID: ${attivita.driver.id || attivita.driver_id})` : ''}
                </div>
              )}
              {(!attivita.driver && attivita.driver_id) && `ID: ${attivita.driver_id}`}
              {(!attivita.driver && !attivita.driver_id) && 'N/D'}
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Veicolo:</div>
            <div className="detail-value">
              {attivita.vehicle && (
                <div>
                  {attivita.vehicle.targa || attivita.vehicle.plate || ''}
                  {' - '}
                  {attivita.vehicle.marca || attivita.vehicle.brand || ''}
                  {' '}
                  {attivita.vehicle.modello || attivita.vehicle.model || ''}
                  {attivita.vehicle.id || attivita.vehicle_id ? ` (ID: ${attivita.vehicle.id || attivita.vehicle_id})` : '')}
                </div>
              )}
              {(!attivita.vehicle && attivita.vehicle_id) && `ID: ${attivita.vehicle_id}`}
              {(!attivita.vehicle && !attivita.vehicle_id) && 'N/D'}
            </div>
          </div>
        <div className="detail-row">
          <div className="detail-label">Tipo Attività:</div>
          <div className="detail-value">{attivita.activityType?.nome || 'N/D'}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Stato:</div>
          <div className="detail-value">{attivita.stato || 'N/D'}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Descrizione:</div>
          <div className="detail-value">{attivita.descrizione || 'Nessuna descrizione'}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Note:</div>
          <div className="detail-value">{attivita.note || 'Nessuna nota'}</div>
        </div>
      </div>
      
      <div className="action-buttons">
        <button 
          className="edit-button"
          onClick={() => setIsEditing(true)}
        >
          Modifica
        </button>
        <button 
          className="delete-button"
          onClick={() => {
            if (window.confirm('Sei sicuro di voler eliminare questa attività?')) {
              handleDeleteAttivita();
            }
          }}
          disabled={isDeleting}
        >
          {isDeleting ? 'Eliminazione...' : 'Elimina'}
        </button>
      </div>
      
      {isEditing && (
        <SidePanel 
          title={`Modifica Attività: ${attivita.titolo}`}
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
        >
          
          
          <EntityForm
            fields={getAttivitaFields(attivita).map(field => ({
              ...field,
              onChange: handleFieldChange
            }))}
            data={attivita}
            onSave={handleSaveAttivita}
            onCancel={() => setIsEditing(false)}
            isSaving={isSaving}
            errors={validationErrors}
            key={attivita.updated_at} // Forza un nuovo rendering quando l'attività viene aggiornata
          />
        </SidePanel>
      )}
      
      <style jsx>{`
        .activity-details {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-top: 20px;
        }
        .detail-row {
          display: flex;
          margin-bottom: 12px;
          border-bottom: 1px solid #f0f0f0;
          padding-bottom: 8px;
        }
        .detail-label {
          font-weight: bold;
          width: 150px;
          flex-shrink: 0;
        }
        .detail-value {
          flex-grow: 1;
        }
        .action-buttons {
          margin-top: 20px;
          display: flex;
          gap: 10px;
        }
        .edit-button, .delete-button {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-weight: bold;
        }
        .edit-button {
          background-color: #007aff;
          color: white;
        }
        .delete-button {
          background-color: #ff3b30;
          color: white;
        }
        .edit-button:hover {
          background-color: #0062cc;
        }
        .delete-button:hover {
          background-color: #d9302c;
        }
        .centered {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 18px;
        }
      `}</style>
    </div>
  );
}
