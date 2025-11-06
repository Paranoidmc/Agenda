"use client";
import { useEffect, useState, useMemo, Suspense, useRef } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import ResourcePairing from "../../components/ResourcePairing";
import EntityForm from "../../components/EntityForm";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import { useRouter, useSearchParams } from "next/navigation";
import AddFacilityPopup from "../../components/AddFacilityPopup";
import dynamic from 'next/dynamic';
import { useVehicleTracking } from "../../hooks/useVehicleTracking";
import { showSuccessToast, showInfoToast } from "../../lib/toast";
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
  const { user, loading } = useAuth();
  const [attivita, setAttivita] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  
  // Ref per tracciare gli stati precedenti delle attività per rilevare cambiamenti
  const previousActivityStates = useRef(new Map());
  // Ref per tracciare i timestamp dell'ultimo aggiornamento delle attività
  const previousActivityTimestamps = useRef(new Map());
  
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

  const canEdit = user?.role === "admin";

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
    console.error('❌ attachDocumentToActivity chiamata nella lista - non dovrebbe succedere');
    return;
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

  const load = async (opts = {}) => {
    const { searchTerm = "", page = currentPage, take = perPage } = opts;
    setFetching(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(take) });
      if (searchTerm && searchTerm.trim()) params.append("search", searchTerm.trim());
      const url = `/activities?${params.toString()}`;
      console.log('🔍 [ATTIVITA PAGE] Richiesta API:', url);
      const { data } = await api.get(url);
      console.log('📥 [ATTIVITA PAGE] Risposta API:', {
        isArray: Array.isArray(data),
        hasData: !!data?.data,
        dataType: typeof data,
        keys: data ? Object.keys(data) : [],
        total: data?.total,
        count: data?.data?.length || (Array.isArray(data) ? data.length : 0),
        firstItem: data?.data?.[0] || (Array.isArray(data) ? data[0] : null),
        fullResponse: data
      });
      
      let activitiesData = [];
      if (Array.isArray(data)) {
        console.log('✅ [ATTIVITA PAGE] Dati come array, count:', data.length);
        activitiesData = data;
        setTotal(data.length);
      } else if (data && Array.isArray(data.data)) {
        console.log('✅ [ATTIVITA PAGE] Dati in data.data, count:', data.data.length, 'total:', data.total);
        activitiesData = data.data;
        setTotal(data.total || data.data.length);
      } else {
        console.warn('⚠️ [ATTIVITA PAGE] Formato dati non riconosciuto, imposto array vuoto');
        activitiesData = [];
        setTotal(0);
      }
      
      // Funzione per normalizzare lo stato
      const normalizeStatus = (status) => {
        if (!status) return 'non assegnato';
        const statusMap = {
          'planned': 'programmato',
          'in_progress': 'in corso',
          'in progress': 'in corso',
          'completed': 'completato',
          'cancelled': 'annullato',
          'doc_issued': 'doc emesso',
          'doc issued': 'doc emesso',
          'assigned': 'assegnato',
          'not assigned': 'non assegnato',
        };
        const normalized = String(status).toLowerCase().trim();
        return statusMap[normalized] || normalized;
      };
      
      // Controlla cambiamenti di stato e mostra notifiche
      activitiesData.forEach(activity => {
        if (!activity.id) return;
        
        const prevState = previousActivityStates.current.get(activity.id);
        const prevTimestamp = previousActivityTimestamps.current.get(activity.id);
        const rawState = activity.status || activity.stato || 'non assegnato';
        const currentState = normalizeStatus(rawState);
        
        // Ottieni il timestamp dell'attività (updated_at o completed_at se completata)
        const activityTimestamp = activity.updated_at || activity.completed_at || activity.created_at;
        const activityDate = activityTimestamp ? new Date(activityTimestamp).getTime() : Date.now();
        const now = Date.now();
        const timeSinceUpdate = now - activityDate;
        const recentlyUpdated = timeSinceUpdate < 60000; // Modificata negli ultimi 60 secondi
        
        console.log(`[ATTIVITA PAGE] Attività ${activity.id}:`, {
          prevState,
          rawState,
          currentState,
          hasPrevState: !!prevState,
          statesDiffer: prevState !== currentState,
          activityTimestamp,
          prevTimestamp,
          recentlyUpdated,
          timeSinceUpdate: Math.round(timeSinceUpdate / 1000) + 's'
        });
        
        // Se c'è uno stato precedente e è diverso da quello corrente
        if (prevState && prevState !== currentState) {
          const normalizedCurrent = String(currentState).toLowerCase();
          const normalizedPrev = String(prevState).toLowerCase();
          
          console.log(`[ATTIVITA PAGE] Rilevato cambiamento stato per attività ${activity.id}:`, {
            from: normalizedPrev,
            to: normalizedCurrent
          });
          
          // Notifica avvio attività (passaggio a "in corso")
          if (normalizedCurrent === 'in corso' && normalizedPrev !== 'in corso') {
            const activityDesc = activity.descrizione || `Attività #${activity.id}`;
            console.log(`[ATTIVITA PAGE] 🚀 Mostrando notifica avvio attività: ${activityDesc}`);
            showInfoToast(`🚀 Attività avviata: ${activityDesc}`);
          }
          
          // Notifica completamento attività
          if (normalizedCurrent === 'completato' && normalizedPrev !== 'completato') {
            const activityDesc = activity.descrizione || `Attività #${activity.id}`;
            console.log(`[ATTIVITA PAGE] ✅ Mostrando notifica completamento attività: ${activityDesc}`);
            showSuccessToast(`✅ Attività completata: ${activityDesc}`);
          }
        } 
        // Se lo stato è uguale ma l'attività è stata modificata di recente e lo stato è "in corso" o "completato"
        // e non abbiamo ancora tracciato questo timestamp, mostra la notifica
        // IMPORTANTE: controlla che ci sia già un timestamp tracciato per evitare notifiche al primo caricamento
        else if (prevState === currentState && recentlyUpdated && prevTimestamp && prevTimestamp !== activityTimestamp) {
          const normalizedCurrent = String(currentState).toLowerCase();
          
          // Notifica avvio attività se è stata modificata di recente e lo stato è "in corso"
          // (anche se lo stato era già "in corso", significa che è stata appena avviata/modificata)
          if (normalizedCurrent === 'in corso') {
            const activityDesc = activity.descrizione || `Attività #${activity.id}`;
            console.log(`[ATTIVITA PAGE] 🚀 Mostrando notifica avvio attività (modifica recente): ${activityDesc}`);
            showInfoToast(`🚀 Attività avviata: ${activityDesc}`);
          }
          
          // Notifica completamento attività se è stata modificata di recente e lo stato è "completato"
          // (anche se lo stato era già "completato", significa che è stata appena completata/modificata)
          if (normalizedCurrent === 'completato') {
            const activityDesc = activity.descrizione || `Attività #${activity.id}`;
            console.log(`[ATTIVITA PAGE] ✅ Mostrando notifica completamento attività (modifica recente): ${activityDesc}`);
            showSuccessToast(`✅ Attività completata: ${activityDesc}`);
          }
        }
        
        // Aggiorna lo stato tracciato (normalizzato) - SEMPRE, anche se non c'è prevState
        previousActivityStates.current.set(activity.id, currentState);
        // Aggiorna anche il timestamp tracciato
        previousActivityTimestamps.current.set(activity.id, activityTimestamp);
      });
      
      setAttivita(activitiesData);
    } catch (e) {
      console.error('❌ [ATTIVITA PAGE] Errore caricamento:', e);
      setError("Errore nel caricamento delle attività: " + (e?.message || e));
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading && user) load({ page: currentPage, take: perPage });
    else if (!loading && !user) setFetching(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, currentPage, perPage]);

  // Listener per eventi di sincronizzazione real-time
  useEffect(() => {
    const handleSyncEvent = (event) => {
      console.log('🔄 Ricevuto evento sincronizzazione in attività:', event.detail);
      // Ricarica le attività
      load({ page: currentPage, take: perPage });
    };

    const handleActivityEvent = (event) => {
      console.log('🔄 Ricevuto evento attività:', event.type, event.detail);
      // Ricarica le attività quando vengono create, modificate o eliminate
      // Piccolo delay per assicurarsi che il server abbia processato la richiesta
      setTimeout(() => {
        load({ page: currentPage, take: perPage });
      }, 500);
    };

    // Listener per sincronizzazione documenti, clienti, autisti, sedi
    window.addEventListener('documentsSync', handleSyncEvent);
    window.addEventListener('clientsSync', handleSyncEvent);
    window.addEventListener('driversSync', handleSyncEvent);
    window.addEventListener('sitesSync', handleSyncEvent);
    
    // Listener per eventi attività (create, update, delete)
    window.addEventListener('activityCreated', handleActivityEvent);
    window.addEventListener('activityUpdated', handleActivityEvent);
    window.addEventListener('activitySaved', handleActivityEvent);
    window.addEventListener('activityDeleted', handleActivityEvent);
    window.addEventListener('activityCompleted', handleActivityEvent);

    // Polling periodico per aggiornamenti automatici (ogni 30 secondi)
    const pollingInterval = setInterval(() => {
      if (!loading && user && !fetching) {
        load({ page: currentPage, take: perPage });
      }
    }, 30000); // 30 secondi

    return () => {
      window.removeEventListener('documentsSync', handleSyncEvent);
      window.removeEventListener('clientsSync', handleSyncEvent);
      window.removeEventListener('driversSync', handleSyncEvent);
      window.removeEventListener('sitesSync', handleSyncEvent);
      window.removeEventListener('activityCreated', handleActivityEvent);
      window.removeEventListener('activityUpdated', handleActivityEvent);
      window.removeEventListener('activitySaved', handleActivityEvent);
      window.removeEventListener('activityDeleted', handleActivityEvent);
      window.removeEventListener('activityCompleted', handleActivityEvent);
      clearInterval(pollingInterval);
    };
  }, [currentPage, perPage, loading, user, fetching]);

  const handleRowClick = (item) => {
    if (item?.id) router.push(`/attivita/${item.id}`);
  };

  const handleCreateNew = () => {
    router.push("/attivita/new");
  };

  const handleSearchTermChange = (term) => {
    // Server-side search: riparte da pagina 1
    setCurrentPage(1);
    load({ searchTerm: term, page: 1, take: perPage });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
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
    switch (stato) {
      case "completato": return "#28a745";
      case "in corso": return "#ffc107";
      case "programmato": return "#007bff";
      case "annullato": return "#dc3545";
      case "doc emesso": return "#17a2b8";
      case "assegnato": return "#6f42c1";
      default: return "#6c757d";
    }
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader
        title="Attività"
        buttonLabel={canEdit ? "Nuova Attività" : ""}
        onAddClick={canEdit ? handleCreateNew : null}
      />
      <DataTable
        data={attivita}
        columns={[
          { key: "descrizione", label: "Descrizione" },
          { 
            key: "data_inizio", 
            label: "Data Inizio",
            render: (item) => formatDate(item.data_inizio)
          },
          { 
            key: "data_fine", 
            label: "Data Fine",
            render: (item) => formatDate(item.data_fine)
          },
          { 
            key: "status", 
            label: "Stato",
            render: (item) => (
              <span style={{ 
                color: getStatusColor(item.status),
                fontWeight: "bold"
              }}>
                {item.status || "N/A"}
              </span>
            )
          },
          { 
            key: "client_name", 
            label: "Cliente",
            render: (item) => item.client?.nome || item.client_name || "N/A"
          },
          { 
            key: "site_name", 
            label: "Sede",
            render: (item) => item.site?.nome || item.site_name || "N/A"
          },
          { 
            key: "resources", 
            label: "Risorse",
            render: (item) => {
              const resources = item.resources || [];
              if (resources.length === 0) return "Nessuna";
              return `${resources.length} risorsa/e`;
            }
          },
          {
            key: "actions",
            label: "Azioni",
            render: (item) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/attivita/${item.id}`);
                }}
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  borderRadius: 6,
                  padding: "0.4em 1em",
                  fontSize: 14,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Dettagli
              </button>
            ),
          },
        ]}
        serverSide={true}
        currentPage={currentPage}
        totalItems={total}
        itemsPerPage={perPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setPerPage}
        onSearchTermChange={handleSearchTermChange}
        loading={fetching}
        filterableColumns={[]}
        onRowClick={handleRowClick}
        selectedRow={null}
        searchPlaceholder="Cerca attività..."
        emptyMessage={fetching ? "Caricamento..." : "Nessuna attività trovata"}
        defaultVisibleColumns={["descrizione", "data_inizio", "status", "client_name", "site_name", "resources", "actions"]}
        defaultSortKey="data_inizio"
        defaultSortDirection="desc"
      />
    </div>
  );
}

export default function AttivitaPage() {
  return (
    <Suspense fallback={<div className="centered">Caricamento...</div>}>
      <AttivitaContent />
    </Suspense>
  );
}
