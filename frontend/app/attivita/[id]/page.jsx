"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";
import { showSuccessToast, showErrorToast } from "../../../lib/toast";
import TabPanel from "../../../components/TabPanel";
import EntityForm from "../../../components/EntityForm";
import ResourcePairing from "../../../components/ResourcePairing";
import AddFacilityPopup from "../../../components/AddFacilityPopup";
import SearchableSelect from "../../../components/SearchableSelect";
import dynamic from 'next/dynamic';
import { useVehicleTracking } from "../../../hooks/useVehicleTracking";
import "../../../styles/map.css";

// Importa VehicleMap solo lato client per evitare errori SSR
const VehicleMap = dynamic(() => import("../../../components/VehicleMap"), {
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

export default function AttivitaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [attivita, setAttivita] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clienti, setClienti] = useState([]);
  const [sedi, setSedi] = useState([]);
  const [sediPerCliente, setSediPerCliente] = useState({});
  const [autisti, setAutisti] = useState([]);
  const [veicoli, setVeicoli] = useState([]);
  const [tipiAttivita, setTipiAttivita] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [formRenderKey, setFormRenderKey] = useState(0);
  // Stato autisti impegnati nel giorno selezionato
  const [busyDrivers, setBusyDrivers] = useState([]);
  const [loadingBusy, setLoadingBusy] = useState(false);
  const [busyError, setBusyError] = useState("");
  const [busyVehicles, setBusyVehicles] = useState([]);
  const [windowMinutes, setWindowMinutes] = useState(90); // ± minutes around start
  const [includeAllStatuses, setIncludeAllStatuses] = useState(false);
  
  // Stato per documenti suggeriti
  const [suggestedDocuments, setSuggestedDocuments] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsFetched, setSuggestionsFetched] = useState(false);
  
  // Stato per documenti allegati
  const [attachedDocuments, setAttachedDocuments] = useState([]);
  const [loadingAttached, setLoadingAttached] = useState(false);
  
  // Stato per documenti pre-selezionati (prima del salvataggio)
  const [preSelectedDocuments, setPreSelectedDocuments] = useState([]);
  
  // Versione documenti per refresh automatico dopo sync
  const [documentsVersion, setDocumentsVersion] = useState(0);

  const canEdit = user?.role === "admin";
  const attivitaId = params?.id;
  const isNew = attivitaId === "new";

  // Estrai i veicoli dall'attività selezionata per il tracking
  const activityVehicles = useMemo(() => {
    // Usa le risorse originali per la mappa, non quelle trasformate per il form
    const resources = attivita?.originalResources || attivita?.resources;
    
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
  }, [attivita?.originalResources, attivita?.resources]);

  // Hook per il tracking dei veicoli - riabilitato con valori sicuri
  const { 
    vehiclePositions, 
    isTracking, 
    lastUpdate, 
    refreshPositions 
  } = useVehicleTracking(
    attivita?.id || null, 
    Array.isArray(activityVehicles) ? activityVehicles : [],
    10000
  );

  const toInputDatetimeLocal = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Rimuove un documento allegato dall'attività
  const detachDocumentFromActivity = async (documentId) => {
    if (!attivita?.id) return;
    try {
      const res = await api.delete(`/activities/${attivita.id}/documents/${documentId}`);
      if (res.data?.success) {
        console.log('🗑️ Documento rimosso con successo');
        fetchAttachedDocuments(attivita.id);
      } else {
        console.warn('⚠️ Rimozione non confermata:', res.data);
      }
    } catch (e) {
      console.error('❌ Errore nella rimozione allegato:', e);
      alert('Errore nella rimozione del documento.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (stato) => {
    const colors = { 
      'non assegnato': '#3b82f6', 
      'assegnato': '#eab308', 
      'doc emesso': '#ef4444', 
      'programmato': '#8b5cf6', 
      'in corso': '#f97316', 
      'completato': '#22c55e', 
      'annullato': '#ec4899' 
    };
    return colors[String(stato)?.toLowerCase()] || '#6b7280';
  };

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
      const payload = response?.data ?? {};
      if (payload.success) {
        const documents = Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : []);
        console.log(`✅ Documenti allegati caricati (${documents.length}):`, documents);
        setAttachedDocuments(documents);
      } else {
        console.warn('⚠️ Nessun documento allegato trovato:', payload.message);
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
    if (!attivita?.id) {
      console.error('❌ Nessuna attività selezionata per allegare documento');
      return;
    }

    try {
      const response = await api.post('/activities/attach-document', {
        activity_id: attivita.id,
        document_id: documentId
      });

      if (response.data.success) {
        console.log('✅ Documento allegato con successo');
        // Rimuovi il documento dai suggerimenti
        setSuggestedDocuments(prev => prev.filter(doc => doc.id !== documentId));
        // Ricarica i documenti allegati
        fetchAttachedDocuments(attivita.id);
      } else {
        console.warn('⚠️ Allegamento documento non confermato:', response.data);
      }
    } catch (error) {
      console.error('❌ Errore nell\'allegare documento:', error);
      alert('❌ Errore nell\'allegare il documento. Riprova.');
    }
  };

  // Restituisce il giorno lavorativo precedente (salta sabato e domenica).
  // Esempi: lunedì -> venerdì (−3), domenica -> venerdì (−2), martedì->lunedì (−1)
  const previousWorkingDay = (dateOnly) => {
    try {
      if (!dateOnly) return null;
      const [y, m, d] = String(dateOnly).split('-').map(Number);
      const dt = new Date(y, (m - 1), d);
      // sposta indietro di un giorno finché non è lun-ven
      do {
        dt.setDate(dt.getDate() - 1);
      } while ([0, 6].includes(dt.getDay())); // 0=dom, 6=sab
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return dateOnly;
    }
  };

  // Funzione per suggerire documenti allegabili (match su cliente+Sede e data = giorno lavorativo precedente)
  const suggestDocuments = async (clientId, dataInizio) => {
    console.log('🔍 suggestDocuments chiamata con:', { clientId, dataInizio, siteId: attivita?.site_id });
    
    // Devono combaciare sia cliente che sede: se manca la sede, non suggeriamo nulla
    if (!clientId || !dataInizio || !attivita?.site_id) {
      console.log('❌ Parametri mancanti (cliente, data o sede), pulisco suggerimenti');
      setSuggestedDocuments([]);
      setSuggestionsFetched(false);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const effectiveDate = previousWorkingDay(dataInizio);
      console.log('📡 Chiamata API GET /documenti (cliente+sede), filtro data SOLO lato client su giorno precedente:', { effectiveDate, cliente: clientId, sede: attivita?.site_id || null });
      const response = await api.get('/documenti', {
        params: {
          cliente: clientId, // nome parametro backend
          sede: attivita?.site_id || null, // nome parametro backend
          per_page: 100
        }
      });
      
      console.log('📨 Risposta API:', response.data);
      
      if (response.data.success) {
        const raw = Array.isArray(response.data.data) ? response.data.data : [];
        // Alcuni endpoint ritornano oggetti avvolti: { documento: {..}, match_score, match_reason }
        const documents = raw.map(item => (item && item.documento) ? { ...item.documento, _match: { score: item.match_score, reason: item.match_reason } } : item);

        // Helper: normalizza la data del documento su YYYY-MM-DD
        const pickDocDate = (doc) => {
          const candidates = [
            doc.data_doc,
            doc.dataDoc,
            doc.data_consegna,
            doc.dataConsegna,
            doc.data,
            doc.date,
            doc.emission_date,
            doc.created_at,
            doc.updated_at,
          ].filter(Boolean);
          for (const c of candidates) {
            try {
              if (typeof c === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c)) return c;
              const d = new Date(c);
              if (!isNaN(d)) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
              }
            } catch {}
          }
          return null;
        };

        // Enforce match su cliente+sede+data (giorno lavorativo precedente) lato frontend
        const targetSiteId = String(attivita.site_id);
        const filtered = documents.filter(doc => {
          const candidateClientIds = [doc.client_id, doc?.client?.id, doc?.cliente?.id].filter(v => v !== undefined && v !== null).map(v => String(v));
          const okClient = candidateClientIds.includes(String(clientId));
          const candidateSiteIds = [
            doc.site_id,
            doc.sede_id,
            doc.destination_id,
            doc.destinazione_id,
            doc?.site?.id,
            doc?.sede?.id,
            doc?.destination?.id,
          ].filter(v => v !== undefined && v !== null).map(v => String(v));
          const okSite = candidateSiteIds.includes(targetSiteId);
          const docDate = pickDocDate(doc);
          const okDate = docDate === String(effectiveDate);
          if (!(okClient && okSite && okDate)) {
            console.log('🔎 Documento scartato per mismatch (API):', {
              docId: doc.id,
              client: { candidates: candidateClientIds, required: String(clientId), ok: okClient },
              site: { candidates: candidateSiteIds, required: targetSiteId, ok: okSite },
              date: { doc: docDate, required: String(effectiveDate), ok: okDate },
              match: doc._match || null
            });
          }
          return okClient && okSite && okDate;
        });
        console.log(`✅ ${filtered.length}/${documents.length} documenti suggeriti (solo GIORNO LAVORATIVO PRECEDENTE):`, filtered);
        setSuggestedDocuments(filtered);
      } else {
        console.warn('⚠️ Nessun documento suggerito (API non success). Niente fallback: regola stretta sul giorno precedente.');
        setSuggestedDocuments([]);
      }
    } catch (error) {
      console.error('❌ Errore nel suggerimento documenti:', error);
      console.log('ℹ️ Niente fallback: regola stretta sul giorno precedente.');
      setSuggestedDocuments([]);
    } finally {
      setLoadingSuggestions(false);
      setSuggestionsFetched(true);
    }
  };

  // Fallback: carica tutti i documenti e filtra lato client per cliente+sede e data effettiva
  const fallbackSuggestFromAllDocuments = async ({ clientId, siteId, effectiveDate }) => {
    try {
      // Prendi una pagina ampia per ridurre il rischio di tagli
      const { data } = await api.get('/documenti', { params: { perPage: 500 } });
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      console.log(`📚 Fallback: caricati ${list.length} documenti totali`, { clientId: String(clientId), siteId: String(siteId), effectiveDate: String(effectiveDate) });

      // Funzione per normalizzare la data del documento: prova vari campi comuni
      const getDocDateOnly = (doc) => {
        const candidates = [
          doc.data_documento,
          doc.data,
          doc.date,
          doc.emission_date,
          doc.created_at,
          doc.updated_at,
        ].filter(Boolean);
        for (const c of candidates) {
          try {
            if (typeof c === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c)) return c;
            const d = new Date(c);
            if (!isNaN(d)) {
              // Usa data locale per evitare shift di fuso verso il giorno precedente/successivo
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              return `${yyyy}-${mm}-${dd}`;
            }
          } catch {}
        }
        return null;
      };

      const targetSiteId = String(siteId);
      const runFilter = (targetDate) => list.filter(doc => {
        const candidateClientIds = [doc.client_id, doc?.client?.id].filter(v => v !== undefined && v !== null).map(v => String(v));
        const okClient = candidateClientIds.includes(String(clientId));
        const candidateSiteIds = [
          doc.site_id,
          doc.sede_id,
          doc.destination_id,
          doc.destinazione_id,
          doc?.site?.id,
          doc?.sede?.id,
          doc?.destination?.id,
        ].filter(v => v !== undefined && v !== null).map(v => String(v));
        const okSite = candidateSiteIds.includes(targetSiteId);
        const docDate = getDocDateOnly(doc);
        const okDate = docDate === String(targetDate);
        if (!(okClient && okSite && okDate)) {
          console.log('🔎 [Fallback] Documento scartato:', {
            docId: doc.id,
            client: { candidates: candidateClientIds, required: String(clientId), ok: okClient },
            site: { candidates: candidateSiteIds, required: targetSiteId, ok: okSite },
            date: { doc: docDate, required: String(targetDate), ok: okDate }
          });
        }
        return okClient && okSite && okDate;
      });

      const filtered = runFilter(effectiveDate);
      console.log(`✅ [Strict] Trovati ${filtered.length} documenti (solo giorno lavorativo precedente)`);
      setSuggestedDocuments(filtered);
    } catch (e) {
      console.error('❌ Fallback fallito:', e);
      setSuggestedDocuments([]);
    }
  };

  const loadSediPerCliente = (clientId) => {
    if (!clientId) {
       console.log('🏢 loadSediPerCliente: clientId vuoto, resetto sedi');
       setSediPerCliente(prev => ({ ...prev, [String(clientId)]: [] }));
       return Promise.resolve();
    }
    
    console.log(`🏢 Caricamento sedi per cliente ${clientId}...`);
    
    return api.get(`/clients/${clientId}/sites`)
      .then(res => {
        console.log(`📊 Risposta API sedi per cliente ${clientId}:`, res.data);
        
        // Gestisci diverse strutture di risposta
        const sediData = res.data?.data || res.data || [];
        
        console.log(`✅ Sedi caricate per cliente ${clientId}:`, {
          count: sediData.length,
          sedi: sediData.map(s => ({ id: s.id, nome: s.nome || s.name }))
        });
        
        setSediPerCliente(prev => ({ ...prev, [String(clientId)]: sediData }));
      })
      .catch(error => {
        console.error(`❌ Errore caricamento sedi per cliente ${clientId}:`, error);
        setSediPerCliente(prev => ({ ...prev, [String(clientId)]: [] }));
      });
  };

  const handleSedeAdded = (newSede) => {
    setIsPopupOpen(false);
    const clienteId = attivita?.client_id;
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
      setAttivita(prev => {
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
    const oldClientId = attivita?.client_id;
    const oldSiteId = attivita?.site_id;
    const oldDataInizio = attivita?.data_inizio;
    
    console.log('🔄 handleFormChange chiamato:', {
      oldClientId,
      newClientId: updatedData.client_id,
      clientChanged: updatedData.client_id !== oldClientId,
      updatedData
    });
    
    // Preserva l'ID originale quando aggiorniamo i dati del form
    const dataWithId = { ...updatedData };
    if (attivita?.id && !dataWithId.id) {
      dataWithId.id = attivita.id;
    }
    setAttivita(dataWithId);

    if (dataWithId.client_id !== oldClientId) {
      console.log('🏢 Cliente cambiato! Caricamento sedi...');
      if (dataWithId.client_id) {
        console.log(`🚀 Chiamando loadSediPerCliente(${dataWithId.client_id})`);
        loadSediPerCliente(dataWithId.client_id);
        // Resetta la selezione della sede quando il cliente cambia SOLO se non è già impostata
        if (oldSiteId && oldClientId !== dataWithId.client_id) {
          console.log('🧹 Resetto selezione sede precedente');
          setAttivita(prev => ({ ...prev, site_id: '' }));
        }
      } else {
        console.log('🧹 Cliente deselezionato, pulisco sedi');
        // Pulisci le sedi se il cliente viene deselezionato
        setSediPerCliente(prev => ({ ...prev, [String(oldClientId)]: [] }));
        setAttivita(prev => ({ ...prev, site_id: '' }));
      }
    } else {
      console.log('ℹ️ Cliente non cambiato, nessun caricamento sedi necessario');
    }

    // Suggerisci documenti quando cambiano cliente, data o sede (fallback a oggi se manca la data)
    const clientChanged = dataWithId.client_id !== oldClientId;
    const dateChanged = dataWithId.data_inizio !== oldDataInizio;
    const siteChanged = dataWithId.site_id !== oldSiteId;
    
    console.log('🔄 handleFormChange - Check suggerimenti:', {
      clientChanged, dateChanged, siteChanged,
      clientId: dataWithId.client_id,
      dataInizio: dataWithId.data_inizio,
      hasRequiredData: !!(dataWithId.client_id)
    });
    
    if (dataWithId.client_id && (clientChanged || dateChanged || siteChanged)) {
      // Usa la data selezionata, altrimenti fallback a oggi
      const dateOnly = dataWithId.data_inizio
        ? String(dataWithId.data_inizio).split('T')[0]
        : new Date().toISOString().slice(0, 10);
      console.log('✅ Trigger suggerimenti documenti con dateOnly:', dateOnly);
      suggestDocuments(dataWithId.client_id, dateOnly);
    } else if (!dataWithId.client_id) {
      console.log('🧹 Pulisco suggerimenti - cliente mancante');
      setSuggestedDocuments([]);
      setSuggestionsFetched(false);
    }
  };

  // Utils parsing date/time robusto
  const toDate = (val) => {
    if (!val) return null;
    try {
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        // Solo data: interpreta come mezzanotte locale
        return new Date(`${val}T00:00:00`);
      }
      return new Date(val);
    } catch {
      return null;
    }
  };

  const intervalsOverlap = (aStart, aEnd, bStart, bEnd) => {
    const s1 = toDate(aStart);
    const e1 = toDate(aEnd) || toDate(aStart); // se manca end, istantaneo
    const s2 = toDate(bStart);
    const e2 = toDate(bEnd) || toDate(bStart);
    if (!s1 || !s2) return false;
    const start = Math.max(s1.getTime(), s2.getTime());
    const end = Math.min(e1.getTime(), e2.getTime());
    return start <= end;
  };

  // Carica risorse impegnate (autisti e veicoli) nel range di 3 ore (±1h30) attorno all'orario di inizio selezionato
  const fetchBusyResources = async (dateOnly) => {
    if (!dateOnly) {
      setBusyDrivers([]);
      return;
    }
    setLoadingBusy(true);
    setBusyError("");
    try {
      const params = new URLSearchParams({ perPage: '500', date: String(dateOnly) });
      params.append('include', 'resources');
      const { data } = await api.get(`/activities?${params.toString()}`);

      const items = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

      // Calcola finestra attorno a data_inizio (±windowMinutes)
      const center = attivita?.data_inizio || `${dateOnly}T00:00:00`;
      const centerDate = toDate(center);
      const wm = Number(windowMinutes) || 90;
      const windowStart = centerDate ? new Date(centerDate.getTime() - wm * 60 * 1000) : toDate(`${dateOnly}T00:00:00`);
      const windowEnd = centerDate ? new Date(centerDate.getTime() + wm * 60 * 1000) : toDate(`${dateOnly}T03:00:00`);

      // Filtra stati salvo toggle "includi tutti"
      const allowedStatuses = includeAllStatuses ? null : new Set(['in corso','programmato','assegnato','doc emesso']);

      const driversTmp = [];
      const vehiclesTmp = [];

      items.forEach(act => {
        const status = String(act.status || act.stato || '').toLowerCase();
        if (allowedStatuses && status && !allowedStatuses.has(status)) return;

        const aStart = act.data_inizio || act.start_date || act.start;
        const aEnd = act.data_fine || act.end_date || act.end;
        if (!intervalsOverlap(aStart, aEnd, windowStart, windowEnd)) return;
        const cInRange = (() => {
          if (!centerDate) return false;
          const s = toDate(aStart);
          const e = toDate(aEnd) || s;
          if (!s) return false;
          const c = centerDate.getTime();
          return c >= s.getTime() && c <= e.getTime();
        })();

        const resources = Array.isArray(act.resources) ? act.resources : [];
        resources.forEach(r => {
          // Driver
          let driverObj = r.driver;
          if (!driverObj && r.driver_id) {
            driverObj = autisti.find(a => String(a.id) === String(r.driver_id));
          }
          if (driverObj) {
            driversTmp.push({
              driver_id: driverObj.id,
              name: driverObj.nome || driverObj.name || driverObj.first_name || '',
              surname: driverObj.cognome || driverObj.surname || driverObj.last_name || '',
              activity_id: act.id,
              descrizione: act.descrizione || act.titolo || '',
              start: aStart,
              end: aEnd,
              conflict: cInRange,
            });
          }

          // Vehicle
          let vehicleObj = r.vehicle;
          if (!vehicleObj && r.vehicle_id) {
            vehicleObj = veicoli.find(v => String(v.id) === String(r.vehicle_id));
          }
          if (vehicleObj) {
            const targa = vehicleObj.targa || vehicleObj.plate || '';
            const label = `${targa} ${(vehicleObj.marca || vehicleObj.brand || '')} ${(vehicleObj.modello || vehicleObj.model || '')}`.trim();
            vehiclesTmp.push({
              vehicle_id: vehicleObj.id,
              label,
              activity_id: act.id,
              descrizione: act.descrizione || act.titolo || '',
              start: aStart,
              end: aEnd,
              conflict: cInRange,
            });
          }
        });
      });

      // Deduplica per risorsa
      const seenD = new Set();
      const uniqueDrivers = driversTmp.filter(b => {
        const key = String(b.driver_id);
        if (seenD.has(key)) return false;
        seenD.add(key);
        return true;
      });

      const seenV = new Set();
      const uniqueVehicles = vehiclesTmp.filter(b => {
        const key = String(b.vehicle_id);
        if (seenV.has(key)) return false;
        seenV.add(key);
        return true;
      });

      setBusyDrivers(uniqueDrivers);
      setBusyVehicles(uniqueVehicles);
    } catch (e) {
      console.error('❌ Errore nel caricamento risorse impegnate:', e);
      setBusyError('Impossibile caricare le risorse impegnate per l\'orario selezionato.');
      setBusyDrivers([]);
      setBusyVehicles([]);
    } finally {
      setLoadingBusy(false);
    }
  };

  // Debounce sul cambio data_inizio/data_fine per caricare risorse impegnate
  useEffect(() => {
    const di = attivita?.data_inizio;
    if (!di) {
      setBusyDrivers([]);
      return;
    }
    const dateOnly = String(di).includes('T') ? String(di).split('T')[0] : String(di);
    const t = setTimeout(() => fetchBusyResources(dateOnly), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attivita?.data_inizio, attivita?.data_fine, windowMinutes, includeAllStatuses]);

  // Definisci extraBelowSite prima del useMemo
  const extraBelowSite = (
    <button type="button" onClick={() => setIsPopupOpen(true)} disabled={!attivita?.client_id} className="btn-add-facility" style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '12px' }}>
      Aggiungi
    </button>
  );

  // Funzione per ottenere i campi del form (sempre aggiornata)
  const getAttivitaFields = () => {
    const selectedClientId = attivita?.client_id;
    const sediOptions = (sediPerCliente[String(selectedClientId)] || []).map(s => {
      const nome = s.nome || s.name || '';
      const indirizzo = s.indirizzo || s.address || '';
      const cap = s.cap || '';
      const citta = s.citta || s.city || '';
      
      // Costruisci l'etichetta completa con nome e indirizzo
      let label = nome;
      if (indirizzo) {
        label += ` - ${indirizzo}`;
        if (cap) label += `, ${cap}`;
        if (citta) label += ` ${citta}`;
      }
      
      return { value: s.id, label };
    });
    
    console.log('📋 Campi form aggiornati:', {
      selectedClientId,
      sediDisponibili: sediPerCliente[String(selectedClientId)]?.length || 0,
      sediOptions: sediOptions.length
    });

    return [
      { name: 'descrizione', label: 'Descrizione', type: 'textarea' },
      { name: 'data_inizio', label: 'Data/Ora Inizio', type: 'datetime-local', required: true },
      { name: 'data_fine', label: 'Data/Ora Fine', type: 'datetime-local' },
      {
        name: 'client_id',
        label: 'Cliente',
        type: 'custom',
        required: true,
        render: (formData, handleChange) => (
          <SearchableSelect
            name="client_id"
            value={formData.client_id ?? ''}
            options={clienti.map(c => ({ value: c.id, label: c.nome || c.name || '' }))}
            placeholder="Cerca o seleziona cliente..."
            disabled={false}
            onChange={(e) => {
              // Assicura valore numerico o stringa vuota
              const v = e.target.value === '' ? '' : Number(e.target.value);
              handleChange({ target: { name: 'client_id', value: v } });
            }}
          />
        ),
      },
      {
        name: 'site_id',
        label: <>Sede {extraBelowSite}</>,
        type: 'custom',
        required: true,
        render: (formData, handleChange) => (
          <SearchableSelect
            name="site_id"
            value={formData.site_id ?? ''}
            options={sediOptions}
            placeholder={selectedClientId ? 'Cerca o seleziona sede...' : 'Prima seleziona un cliente'}
            disabled={!selectedClientId}
            onChange={(e) => {
              // Assicura valore numerico o stringa vuota
              const v = e.target.value === '' ? '' : Number(e.target.value);
              handleChange({ target: { name: 'site_id', value: v } });
            }}
          />
        ),
      },
      { name: 'resources', label: 'Risorse abbinate', type: 'custom', render: (formData, handleChange) => <ResourcePairing value={formData.resources || []} onChange={(newValue) => handleChange({ target: { name: 'resources', value: newValue }})} drivers={autisti} vehicles={veicoli} />, required: false },
      { name: 'activity_type_id', label: 'Tipo Attività', type: 'select', isNumeric: true, required: true, options: tipiAttivita.map(t => ({ value: t.id, label: t.nome || t.name || '' })), placeholder: 'Seleziona Tipo Attività' },
      { name: 'status', label: 'Stato', type: 'select', required: true, options: [{ value: 'non assegnato', label: 'Non assegnato' }, { value: 'assegnato', label: 'Assegnato' }, { value: 'doc emesso', label: 'Doc emesso' }, { value: 'programmato', label: 'Programmato' }, { value: 'in corso', label: 'In corso' }, { value: 'completato', label: 'Completato' }, { value: 'annullato', label: 'Annullato' }], placeholder: 'Seleziona Stato' },
      { name: 'note', label: 'Note', type: 'textarea' },
    ];
  };

  // Effetti per caricare i dati
  useEffect(() => {
    if (!loading && user) {
      if (isNew) {
        // Nuova attività - inizializza con dati vuoti
        setAttivita({
          descrizione: '',
          data_inizio: '',
          data_fine: '',
          client_id: '',
          site_id: '',
          resources: [],
          activity_type_id: '',
          status: 'non assegnato',
          note: ''
        });
        loadRelatedData();
        setFetching(false);
      } else {
        // Attività esistente - carica i dati
        loadAttivita();
        loadRelatedData();
      }
    } else if (!loading && !user) {
      setFetching(false);
    }
  }, [user, loading, attivitaId, isNew]);

  useEffect(() => {
    if (attivita?.client_id) {
      loadSediPerCliente(attivita.client_id);
    }
  }, [attivita?.client_id]);

  useEffect(() => {
    if (attivita?.id) {
      fetchAttachedDocuments(attivita.id);
    } else {
      setAttachedDocuments([]);
    }
  }, [attivita?.id]);

  // Quando apro in MODIFICA, se ci sono già cliente+sede+data, carico subito i suggerimenti
  useEffect(() => {
    if (isEditing && attivita?.client_id && attivita?.site_id && attivita?.data_inizio) {
      const dateOnly = String(attivita.data_inizio).includes('T')
        ? String(attivita.data_inizio).split('T')[0]
        : String(attivita.data_inizio);
      console.log('🚀 Edit mode: caricamento automatico suggerimenti', {
        client_id: attivita.client_id,
        site_id: attivita.site_id,
        dateOnly
      });
      suggestDocuments(attivita.client_id, dateOnly);
      // Rinfresca anche gli allegati per sicurezza
      fetchAttachedDocuments(attivita.id);
    }
  }, [isEditing, attivita?.client_id, attivita?.site_id, attivita?.data_inizio]);

  // Listener per eventi di sincronizzazione documenti da altre pagine
  useEffect(() => {
    const handleDocumentsSync = (event) => {
      console.log('🔄 Ricevuto evento sincronizzazione documenti:', event.detail);
      setDocumentsVersion(v => v + 1);
      
      // Se c'è un'attività selezionata in modalità modifica, ricarica i suggerimenti
      if (attivita && isEditing) {
        console.log('🔄 Ricaricando suggerimenti dopo sync documenti...');
        setTimeout(() => {
          if (attivita.client_id && attivita.data_inizio) {
            const dateOnly = attivita.data_inizio.split('T')[0];
            suggestDocuments(attivita.client_id, dateOnly);
          }
        }, 1000); // Piccolo delay per assicurarsi che i dati siano pronti
      }
    };

    // Ascolta eventi custom di sincronizzazione documenti
    window.addEventListener('documentsSync', handleDocumentsSync);
    
    return () => {
      window.removeEventListener('documentsSync', handleDocumentsSync);
    };
  }, [attivita, isEditing]);

  const loadAttivita = async () => {
    setFetching(true);
    setError("");
    try {
      const { data } = await api.get(`/activities/${attivitaId}`);
      
      // Preserva le risorse originali per la mappa
      const attivitaWithOriginal = { ...data };
      attivitaWithOriginal.originalResources = data.resources;
      
      console.log('🔍 Risorse caricate dal server:', {
        count: data.resources?.length || 0,
        resources: data.resources?.map(r => ({
          id: r.id,
          vehicle_id: r.vehicle_id,
          driver_id: r.driver_id,
          hasVehicleRelation: !!r.vehicle,
          hasDriverRelation: !!r.driver,
          vehicleData: r.vehicle,
          driverData: r.driver
        }))
      });
      
      // Trasforma le risorse per il form ResourcePairing
      if (data.resources && Array.isArray(data.resources)) {
        const resourcesByVehicle = data.resources.reduce((acc, resource) => {
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
        
        attivitaWithOriginal.resources = Object.values(resourcesByVehicle);
      }
      
      setAttivita(attivitaWithOriginal);
    } catch (e) {
      setError("Errore nel caricamento dell'attività");
    } finally {
      setFetching(false);
    }
  };

  const loadRelatedData = async () => {
    try {
      console.log('🔄 Caricamento dati correlati...');
      const params = { perPage: 9999 };
      
      const [clientiRes, autistiRes, veicoliRes, tipiRes] = await Promise.all([
        api.get("/clients", { params }),
        api.get("/drivers", { params }),
        api.get("/vehicles", { params }),
        api.get("/activity-types", { params })
      ]);

      console.log('📊 Risposte API:', {
        clienti: clientiRes.data,
        autisti: autistiRes.data,
        veicoli: veicoliRes.data,
        tipi: tipiRes.data
      });

      // Gestisci diverse strutture di risposta API
      const clientiData = clientiRes.data?.data || clientiRes.data || [];
      const autistiData = autistiRes.data?.data || autistiRes.data || [];
      const veicoliData = veicoliRes.data?.data || veicoliRes.data || [];
      const tipiData = tipiRes.data?.data || tipiRes.data || [];

      setClienti(Array.isArray(clientiData) ? clientiData : []);
      setAutisti(Array.isArray(autistiData) ? autistiData : []);
      setVeicoli(Array.isArray(veicoliData) ? veicoliData : []);
      setTipiAttivita(Array.isArray(tipiData) ? tipiData : []);

      console.log('✅ Dati correlati caricati:', {
        clienti: clientiData.length,
        autisti: autistiData.length,
        veicoli: veicoliData.length,
        tipi: tipiData.length
      });
    } catch (e) {
      console.error("❌ Errore nel caricamento dei dati correlati:", e);
      // Imposta array vuoti in caso di errore
      setClienti([]);
      setAutisti([]);
      setVeicoli([]);
      setTipiAttivita([]);
    }
  };

  const handleSave = async (formData) => {
    setIsSaving(true);
    setValidationErrors({});
    try {
      // Trasforma le risorse dal formato ResourcePairing al formato API
      const dataToSend = { ...formData };
      
      if (dataToSend.resources && Array.isArray(dataToSend.resources)) {
        const transformedResources = [];
        dataToSend.resources.forEach(resource => {
          if (resource.vehicle_id && resource.driver_ids && resource.driver_ids.length > 0) {
            resource.driver_ids.forEach(driverId => {
              transformedResources.push({
                vehicle_id: Number(resource.vehicle_id),
                driver_id: Number(driverId)
              });
            });
          }
        });
        dataToSend.resources = transformedResources;
      }
      
      // Aggiungi documenti pre-selezionati se presenti
      if (preSelectedDocuments.length > 0) {
        dataToSend.document_ids = preSelectedDocuments.map(doc => doc.id);
      }
      
      let response;
      let createdActivityId = attivitaId;
      if (isNew) {
        response = await api.post('/activities', dataToSend);
        createdActivityId = response?.data?.id || response?.data?.data?.id;
        // Auto-allega eventuali documenti pre-selezionati dopo la creazione
        if (createdActivityId && Array.isArray(preSelectedDocuments) && preSelectedDocuments.length > 0) {
          for (const doc of preSelectedDocuments) {
            try {
              await api.post('/activities/attach-document', { activity_id: createdActivityId, document_id: doc.id });
            } catch (e) {
              console.warn('⚠️ Impossibile allegare doc post-creazione', doc?.id, e);
            }
          }
        }
        // Emetti evento PRIMA della navigazione per assicurarsi che venga catturato
        const activityEvent = new CustomEvent('activityCreated', {
          detail: { activity_id: createdActivityId, type: 'create', activity: response.data }
        });
        window.dispatchEvent(activityEvent);
        
        // Emetti anche un evento generico per compatibilità
        const genericEvent = new CustomEvent('activitySaved', {
          detail: { activity_id: createdActivityId, type: 'create', activity: response.data }
        });
        window.dispatchEvent(genericEvent);
        
        // Naviga alla pagina dettaglio della nuova attività dopo un piccolo delay
        setTimeout(() => {
          router.push(`/attivita/${createdActivityId}`);
        }, 100);
      } else {
        response = await api.put(`/activities/${attivitaId}`, dataToSend);
        // Auto-allega eventuali documenti pre-selezionati anche in update
        if (attivitaId && Array.isArray(preSelectedDocuments) && preSelectedDocuments.length > 0) {
          for (const doc of preSelectedDocuments) {
            try {
              await api.post('/activities/attach-document', { activity_id: attivitaId, document_id: doc.id });
            } catch (e) {
              console.warn('⚠️ Impossibile allegare doc post-update', doc?.id, e);
            }
          }
        }
        // Ricarica i dati aggiornati
        await loadAttivita();
        if (attivitaId) fetchAttachedDocuments(attivitaId);
        
        // Emetti evento per notificare altre pagine
        const activityEvent = new CustomEvent('activityUpdated', {
          detail: { activity_id: attivitaId, type: 'update', activity: response.data }
        });
        window.dispatchEvent(activityEvent);
        
        // Emetti anche un evento generico per compatibilità
        const genericEvent = new CustomEvent('activitySaved', {
          detail: { activity_id: attivitaId, type: 'update', activity: response.data }
        });
        window.dispatchEvent(genericEvent);
      }
      
      // Se l'attività è stata completata, mostra una notifica toast
      const activityStatus = dataToSend.status || dataToSend.stato || attivita?.status || attivita?.stato;
      if (activityStatus && String(activityStatus).toLowerCase() === 'completato') {
        const activityDesc = dataToSend.descrizione || attivita?.descrizione || 'Attività';
        showSuccessToast(`✅ Attività completata: ${activityDesc}`);
        
        // Emetti anche un evento specifico per attività completata
        const completedEvent = new CustomEvent('activityCompleted', {
          detail: { 
            activity_id: isNew ? createdActivityId : attivitaId, 
            activity: response.data 
          }
        });
        window.dispatchEvent(completedEvent);
      }
      
      setIsEditing(false);
      setPreSelectedDocuments([]);
      
      const message = isNew ? 'Attività creata con successo!' : 'Attività aggiornata con successo!';
      showSuccessToast(message);
    } catch (e) {
      console.error("Errore durante il salvataggio:", e);
      if (e.response && e.response.data && e.response.data.errors) {
        setValidationErrors(e.response.data.errors);
      } else {
        setError('Si è verificato un errore durante il salvataggio.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questa attività?')) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/activities/${attivitaId}`);
      
      // Emetti evento per notificare altre pagine
      const activityEvent = new CustomEvent('activityDeleted', {
        detail: { activity_id: attivitaId, type: 'delete' }
      });
      window.dispatchEvent(activityEvent);
      
      showSuccessToast('Attività eliminata con successo!');
      router.push('/attivita');
    } catch (e) {
      console.error('Errore durante l\'eliminazione:', e);
      showErrorToast('Impossibile eliminare l\'attività.');
    } finally {
      setIsDeleting(false);
    }
  };



  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;
  if (!attivita) return <div className="centered">Attività non trovata</div>;

  const attivitaTitle = isNew ? "Nuova Attività" : (attivita.descrizione || `Attività #${attivita.id}`);

  return (
    <div style={{ padding: '32px 32px 32px 48px', maxWidth: '1400px', margin: '0 auto' }}>
      <PageHeader
        title={attivitaTitle}
        buttonLabel={canEdit ? (isEditing ? "Annulla" : isNew ? "" : "Modifica") : ""}
        onAddClick={canEdit && !isNew ? () => setIsEditing(!isEditing) : null}
        showBackButton={true}
        onBackClick={() => {
          // Torna sempre all'agenda (pianificazione)
          router.push("/pianificazione");
        }}
      />

      {canEdit && !isNew && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              background: '#dc3545',
              color: '#fff',
              borderRadius: 6,
              padding: '0.5em 1em',
              fontSize: 14,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {isDeleting ? 'Eliminazione…' : 'Elimina attività'}
          </button>
        </div>
      )}

      {isNew || isEditing ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>
            <div>
              <EntityForm
                key={formRenderKey}
                data={attivita}
                fields={getAttivitaFields()}
                onSave={canEdit ? handleSave : null}
                onDelete={canEdit && !isNew ? handleDelete : null}
                isEditing={true}
                setIsEditing={() => {}}
                isLoading={isSaving || isDeleting}
                validationErrors={validationErrors}
                onFormChange={handleFormChange}
              />
            </div>
            <div>
              {attivita?.data_inizio && (
                <div style={{ background: '#fff', border: '1px solid #e5e5ea', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  {/* Controls */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Finestra ±
                      <select
                        value={windowMinutes}
                        onChange={(e) => setWindowMinutes(Number(e.target.value))}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e5ea' }}
                      >
                        <option value={60}>1h</option>
                        <option value={90}>1h30</option>
                        <option value={120}>2h</option>
                        <option value={180}>3h</option>
                      </select>
                      min
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" checked={includeAllStatuses} onChange={(e) => setIncludeAllStatuses(e.target.checked)} />
                      Includi completate/annullate
                    </label>
                  </div>
                  <h3 style={{ marginTop: 0, marginBottom: 8 }}>👷‍♂️ Autisti impegnati
                    <span style={{ fontWeight: 400, color: '#666' }}> ({String(attivita.data_inizio).split('T')[0]} · ±{windowMinutes}m)</span>
                  </h3>
                  {loadingBusy ? (
                    <div style={{ color: '#666' }}>Caricamento...</div>
                  ) : busyError ? (
                    <div style={{ color: '#d32f2f' }}>{busyError}</div>
                  ) : busyDrivers.length === 0 ? (
                    <div style={{ color: '#666' }}>Nessun autista risulta impegnato per l'orario selezionato.</div>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {busyDrivers.map(b => (
                        <li key={b.driver_id} style={{ marginBottom: 6, color: b.conflict ? '#d32f2f' : undefined }}>
                          <span style={{ fontWeight: 600 }}>
                            {(b.name + ' ' + b.surname).trim()}
                          </span>
                          {" – "}
                          <span style={{ color: '#555' }}>
                            {b.descrizione || 'Attività'} ({b.start ? new Date(b.start).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'N/D'}
                            {b.end ? ` - ${new Date(b.end).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : ''})
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {attivita?.data_inizio && (
                <div style={{ background: '#fff', border: '1px solid #e5e5ea', borderRadius: 8, padding: 16 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 8 }}>🚚 Veicoli impegnati
                    <span style={{ fontWeight: 400, color: '#666' }}> ({String(attivita.data_inizio).split('T')[0]} · ±{windowMinutes}m)</span>
                  </h3>
                  {loadingBusy ? (
                    <div style={{ color: '#666' }}>Caricamento...</div>
                  ) : busyError ? (
                    <div style={{ color: '#d32f2f' }}>{busyError}</div>
                  ) : busyVehicles.length === 0 ? (
                    <div style={{ color: '#666' }}>Nessun veicolo risulta impegnato per l'orario selezionato.</div>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {busyVehicles.map(v => (
                        <li key={v.vehicle_id} style={{ marginBottom: 6, color: v.conflict ? '#d32f2f' : undefined }}>
                          <span style={{ fontWeight: 600 }}>{v.label}</span>
                          {" – "}
                          <span style={{ color: '#555' }}>
                            {v.descrizione || 'Attività'} ({v.start ? new Date(v.start).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'N/D'}
                            {v.end ? ` - ${new Date(v.end).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : ''})
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {(loadingSuggestions || suggestionsFetched) && (
                <div style={{ marginTop: 16, padding: 16, background: '#f8f9fa', borderRadius: 8, border: '1px solid #e5e5ea' }}>
                  <h3 style={{ marginTop: 0 }}>📄 Documenti suggeriti</h3>
                  {loadingSuggestions ? (
                    <div style={{ textAlign: 'center', padding: 12 }}>Caricamento suggerimenti...</div>
                  ) : suggestedDocuments.length > 0 ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {suggestedDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          style={{
                            padding: 12,
                            border: '1px solid #dee2e6',
                            borderRadius: 6,
                            background: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 'bold' }}>
                              {doc.tipo_documento ? `${doc.tipo_documento} ` : ''}
                              {doc.numero_documento || doc.numero || `Doc #${doc.id}`}
                              {doc.codice_documento ? ` • ${doc.codice_documento}` : ''}
                            </div>
                            <div style={{ fontSize: 13, color: '#666' }}>
                              {doc.data_documento ? new Date(doc.data_documento).toLocaleDateString('it-IT') : ''}
                              {doc.importo ? ` • €${parseFloat(doc.importo).toFixed(2)}` : ''}
                            </div>
                            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                              {(() => {
                                const cliente = doc?.cliente?.name || doc.nome_cliente || doc.nomeCliente || doc.descrizioneCliente || doc.client_name;
                                const sede = doc.nome_sede || doc.site_name || doc.sede?.name || doc.site?.name;
                                if (cliente && sede) return `Cliente: ${cliente} • Sede: ${sede}`;
                                if (cliente) return `Cliente: ${cliente}`;
                                if (sede) return `Sede: ${sede}`;
                                return null;
                              })()}
                            </div>
                            {(doc.stato || doc.status || doc.note) && (
                              <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>
                                {doc.stato || doc.status ? `Stato: ${doc.stato || doc.status}` : ''}
                                {doc.note ? `${doc.stato || doc.status ? ' • ' : ''}Note: ${doc.note}` : ''}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => preSelectDocument(doc)}
                            style={{
                              background: preSelectedDocuments.some(d => d.id === doc.id) ? '#28a745' : '#007bff',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '6px 12px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                          >
                            {preSelectedDocuments.some(d => d.id === doc.id) ? '✓ Selezionato' : 'Seleziona'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 12, color: '#666' }}>Nessun documento suggerito per i filtri selezionati.</div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Mostra documenti pre-selezionati */}
          {preSelectedDocuments.length > 0 && (
            <div style={{ marginTop: 20, padding: 15, background: '#e7f3ff', borderRadius: 6 }}>
              <h4 style={{ marginTop: 0, color: '#0066cc' }}>📎 Documenti da collegare ({preSelectedDocuments.length})</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {preSelectedDocuments.map((doc) => (
                  <span
                    key={doc.id}
                    style={{
                      background: '#0066cc',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {doc.numero_documento || `Doc #${doc.id}`}
                    <button
                      type="button"
                      onClick={() => preSelectDocument(doc)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: 0,
                        marginLeft: 4
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          {/* Layout unificato senza tab - tutto in una pagina */}
          
          {/* Sezione Dettagli */}
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e5e5ea' }}>
            <h2 style={{ marginTop: 0, marginBottom: 20, color: '#1d1d1f' }}>📋 Dettagli Attività</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <h3>Informazioni Generali</h3>
                <p><strong>Descrizione:</strong> {attivita.descrizione || "N/A"}</p>
                <p><strong>Data Inizio:</strong> {formatDate(attivita.data_inizio)}</p>
                <p><strong>Data Fine:</strong> {formatDate(attivita.data_fine)}</p>
                <p>
                  <strong>Stato:</strong>{" "}
                  <span style={{ color: getStatusColor(attivita.status), fontWeight: "bold" }}>
                    {attivita.status || "N/A"}
                  </span>
                </p>
                <p><strong>Tipo:</strong> {(() => {
                  if (attivita.activityType?.nome || attivita.activityType?.name) {
                    return attivita.activityType.nome || attivita.activityType.name;
                  }
                  if (attivita.activity_type_id) {
                    const tipo = tipiAttivita.find(t => t.id === attivita.activity_type_id);
                    return tipo ? (tipo.nome || tipo.name) : "N/A";
                  }
                  return "N/A";
                })()}</p>
              </div>
              <div>
                <h3>Assegnazioni</h3>
                <p><strong>Cliente:</strong> {(() => {
                  if (attivita.client?.nome) return attivita.client.nome;
                  if (attivita.client_id) {
                    const cliente = clienti.find(c => c.id === attivita.client_id);
                    return cliente ? (cliente.nome || cliente.name) : "N/A";
                  }
                  return "N/A";
                })()}</p>
                <p><strong>Sede:</strong> {(() => {
                  if (attivita.site?.nome) return attivita.site.nome;
                  if (attivita.site_id) {
                    const sediCliente = sediPerCliente[String(attivita.client_id)] || [];
                    const sede = sediCliente.find(s => s.id === attivita.site_id);
                    if (sede) {
                      const nome = sede.nome || sede.name || '';
                      const indirizzo = sede.indirizzo || sede.address || '';
                      return indirizzo ? `${nome} - ${indirizzo}` : nome;
                    }
                  }
                  return "N/A";
                })()}</p>
                
                <div>
                  <strong>Risorse assegnate:</strong>
                  {attivita.originalResources && attivita.originalResources.length > 0 ? (
                    <div style={{ marginTop: 8 }}>
                      {attivita.originalResources.map((resource, index) => {
                        let veicoloInfo = "N/A";
                        if (resource.vehicle) {
                          const targa = resource.vehicle.targa || resource.vehicle.plate;
                          const marca = resource.vehicle.marca || resource.vehicle.brand;
                          const modello = resource.vehicle.modello || resource.vehicle.model;
                          veicoloInfo = `${targa} - ${marca} ${modello}`;
                        } else if (resource.vehicle_id) {
                          const veicolo = veicoli.find(v => v.id == resource.vehicle_id);
                          if (veicolo) {
                            const targa = veicolo.targa || veicolo.plate;
                            const marca = veicolo.marca || veicolo.brand;
                            const modello = veicolo.modello || veicolo.model;
                            veicoloInfo = `${targa} - ${marca} ${modello}`;
                          }
                        }
                        
                        let autistaInfo = "N/A";
                        if (resource.driver) {
                          const nome = resource.driver.nome || resource.driver.name || resource.driver.first_name;
                          const cognome = resource.driver.cognome || resource.driver.surname || resource.driver.last_name;
                          autistaInfo = `${nome} ${cognome}`;
                        } else if (resource.driver_id) {
                          const autista = autisti.find(a => a.id == resource.driver_id);
                          if (autista) {
                            const nome = autista.nome || autista.name || autista.first_name;
                            const cognome = autista.cognome || autista.surname || autista.last_name;
                            autistaInfo = `${nome} ${cognome}`;
                          }
                        }
                        
                        return (
                          <div key={index} style={{ marginBottom: 8, padding: 8, background: '#f8f9fa', borderRadius: 4 }}>
                            <div><strong>Veicolo:</strong> {veicoloInfo}</div>
                            <div><strong>Autista:</strong> {autistaInfo}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ color: '#666', fontStyle: 'italic' }}>Nessuna risorsa assegnata</div>
                  )}
                </div>
              </div>
            </div>
            {attivita.note && (
              <div>
                <h3>Note</h3>
                <p style={{ background: "#f8f9fa", padding: 15, borderRadius: 6 }}>{attivita.note}</p>
              </div>
            )}
          </div>

          {/* Sezione Mappa Veicoli */}
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e5e5ea' }}>
            <div className="vehicle-map-header" style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: '#1d1d1f' }}>🗺️ Posizione Veicoli in Tempo Reale</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
                {isTracking && (
                  <div className="tracking-indicator">
                    <div className="tracking-dot"></div>
                    <span>Tracking attivo</span>
                  </div>
                )}
                <button 
                  onClick={refreshPositions}
                  className="refresh-button"
                  disabled={!activityVehicles || activityVehicles.length === 0}
                >
                  🔄 Aggiorna Posizioni
                </button>
                {lastUpdate && (
                  <span className="last-update">
                    Ultimo aggiornamento: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
            
            {activityVehicles && activityVehicles.length > 0 ? (
              <VehicleMap 
                vehicles={activityVehicles}
                positions={vehiclePositions}
                height="400px"
              />
            ) : (
              <div style={{ 
                height: '400px', 
                backgroundColor: '#f5f5f5', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px solid #e5e5ea',
                borderRadius: '8px',
                flexDirection: 'column',
                gap: 16
              }}>
                <div style={{ fontSize: '48px' }}>🗺️</div>
                <div style={{ textAlign: 'center', color: '#666' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: 8 }}>Nessun veicolo assegnato</div>
                  <div>Assegna dei veicoli a questa attività per visualizzare le posizioni sulla mappa</div>
                </div>
              </div>
            )}
          </div>

          {/* Sezione Documenti */}
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e5e5ea' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, color: '#1d1d1f' }}>📄 Documenti Allegati {attachedDocuments?.length ? `(${attachedDocuments.length})` : ''}</h2>
              <button
                onClick={() => attivita?.id && fetchAttachedDocuments(attivita.id)}
                disabled={loadingAttached || !attivita?.id}
                style={{
                  background: '#0d6efd',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 13,
                  border: 'none',
                  cursor: loadingAttached ? 'not-allowed' : 'pointer'
                }}
              >
                {loadingAttached ? 'Aggiorno…' : 'Ricarica'}
              </button>
            </div>
            {loadingAttached ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
                <div style={{ fontSize: '24px', marginBottom: 8 }}>📄</div>
                <div>Caricamento documenti...</div>
              </div>
            ) : attachedDocuments.length > 0 ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {attachedDocuments.map((doc, index) => (
                  <div key={doc.id ?? index} style={{ 
                    padding: 12, 
                    background: '#f8f9fa', 
                    borderRadius: 6,
                    border: '1px solid #e9ecef',
                    position: 'relative'
                  }}>
                    <button
                      onClick={() => detachDocumentFromActivity(doc.id)}
                      title="Rimuovi allegato"
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 6px',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      Rimuovi
                    </button>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      {(doc.codice_doc || doc.codiceDoc || '')}
                      {((doc.codice_doc || doc.codiceDoc) && (doc.numero_doc || doc.numero)) ? ' • ' : ''}
                      {(doc.numero_doc || doc.numero || '')}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {(() => {
                        const rawDate = doc.data_doc || doc.data_documento || doc.dataDoc || doc.date || doc.created_at;
                        return rawDate ? `Data: ${formatDate(rawDate)}` : '';
                      })()}
                    </div>
                    {doc.descrizione && (
                      <div style={{ fontSize: '14px', marginTop: 8, color: '#555' }}>
                        {doc.descrizione}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>
                      {doc.cliente_name && <span>Cliente: {doc.cliente_name}</span>}
                      {(doc.cliente_name && doc.sede_name) ? ' • ' : ''}
                      {doc.sede_name && <span>Sede: {doc.sede_name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                <div style={{ fontSize: '48px', marginBottom: 16 }}>📄</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: 8 }}>Nessun documento allegato</div>
                <div>I documenti collegati a questa attività appariranno qui</div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Popup per aggiungere nuova sede */}
      {isPopupOpen && (
        <AddFacilityPopup
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          onFacilityAdded={handleSedeAdded}
          entityData={{
            client_id: attivita?.client_id,
            client_name: clienti.find(c => c.id === attivita?.client_id)?.nome
          }}
          clienti={clienti}
        />
      )}
    </div>
  );
}
