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

export default function SediPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sedi, setSedi] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20000);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [selectedSede, setSelectedSede] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableWidth, setTableWidth] = useState('100%');
  const [clienti, setClienti] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  // Campi del form sede
  const sedeFields = [
    { name: 'nome', label: 'Nome', required: true },
    { name: 'indirizzo', label: 'Indirizzo', required: true },
    { name: 'citta', label: 'Città', required: true },
    { name: 'cap', label: 'CAP' },
    { name: 'provincia', label: 'Provincia' },
    { name: 'client_id', label: 'Cliente', type: 'select', options: 
      clienti.map(cliente => ({ value: cliente.id, label: cliente.nome }))
    },
    { name: 'note', label: 'Note', type: 'textarea' }
  ];

  useEffect(() => {
    if (!loading && user) {
      fetchSedi();
      loadClienti();
    } else if (!loading && !user) {
      setFetching(false);
    }
  }, [user, loading, dataVersion]);
  
  // Effetto per ricaricare i dati quando cambiano pagina o elementi per pagina
  useEffect(() => {
    if (!loading && user) {
      fetchSediWithSearch(searchTerm);
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

  const fetchSedi = async () => {
    await fetchSediWithSearch(searchTerm);
  };
  
  const fetchSediWithSearch = async (searchTermParam = '', resetPage = false) => {
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
      
      console.log('🔍 Caricamento sedi:', {
        page: pageToUse,
        perPage,
        search: searchTermParam,
        resetPage,
        url: `/sites?${params.toString()}`
      });
      
      const response = await api.get(`/sites?${params.toString()}`);
      
      console.log('📄 Risposta API sedi:', response.data);
      
      if (response.data && response.data.data) {
        setSedi(response.data.data);
        setTotal(response.data.total || 0);
      } else {
        console.warn('⚠️ Struttura risposta inaspettata:', response.data);
        setSedi([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("❌ Errore nel caricamento delle sedi:", err);
      if (err.response && err.response.status === 401) {
        setError("Sessione scaduta. Effettua nuovamente il login.");
      } else {
        setError("Errore nel caricamento delle sedi.");
      }
      setSedi([]);
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
    
    // Chiama fetchSedi direttamente con il nuovo termine e reset pagina
    if (!loading && user) {
      fetchSediWithSearch(newTerm, true); // true = reset pagina
    }
  };

  const loadClienti = () => {
    api.get("/clients", { params: { perPage: 20000 } })
      .then(res => {
        if (Array.isArray(res.data)) {
          setClienti(res.data);
        } else if (res.data && Array.isArray(res.data.data)) {
          setClienti(res.data.data);
        } else {
          setClienti([]);
          console.warn('[DEBUG] Nessun cliente trovato o formato dati inatteso:', res.data);
        }
      })
      .catch(err => {
        console.error("[DEBUG] Errore nel caricamento dei clienti:", err);
        setClienti([]);
      });
  };

  const handleViewDetails = (sede) => {
    setSelectedSede(sede);
    setIsEditing(false);
    setIsPanelOpen(true);
    
    // Carica le attività per questa sede
    loadActivities(sede.id);
  };
  
  const loadActivities = async (siteId) => {
    if (!siteId) return;
    
    setLoadingActivities(true);
    try {
      const response = await api.get(`/sites/${siteId}/activities`);
      setActivities(response.data);
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
      setSelectedSede(null);
      setIsEditing(false);
    }, 300);
  };

  const handleSaveSede = async (formData) => {
    setIsSaving(true);
    try {
      // Filtra solo i campi permessi dal database
      const allowedFields = ['id','nome','indirizzo','citta','cap','provincia','client_id','note','status'];
      const cleanedData = {};
      for (const key of allowedFields) {
        if (formData[key] !== undefined) cleanedData[key] = formData[key];
      }
      // Assicuriamoci che client_id sia un numero se presente
      if (cleanedData.client_id) {
        cleanedData.client_id = Number(cleanedData.client_id);
      }
      // Log per debug
      let response;
      if (cleanedData.id) {
        response = await api.put(`/sites/${cleanedData.id}`, cleanedData);
      } else {
        response = await api.post('/sites', cleanedData);
      }
      
      setIsEditing(false);
      setDataVersion(v => v + 1); 
      handleClosePanel();
      
      const message = cleanedData.id ? 'Sede aggiornata con successo!' : 'Sede creata con successo!';
      if (typeof showToast === 'function') {
        showToast(message, 'success');
      } else {
        alert(message);
      }

    } catch (err) {
      console.error("Errore durante il salvataggio:", err);
      
      // Mostra dettagli dell'errore per il debug
      if (err.response) {
        console.error("Dettagli errore:", {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        
        // Mostra un messaggio più specifico se disponibile
        const errorMessage = err.response.data?.message || "Si è verificato un errore durante il salvataggio. Riprova più tardi.";
        if (typeof showToast === 'function') {
          showToast(errorMessage, 'error');
        } else {
          alert(errorMessage);
        }
        setIsEditing(true); // Mantiene il form aperto
      } else if (err.request) {
        // La richiesta è stata effettuata ma non è stata ricevuta alcuna risposta
        console.error("Nessuna risposta ricevuta:", err.request);
        const noResponseError = "Nessuna risposta dal server. Controlla la tua connessione o contatta l'assistenza.";
        if (typeof showToast === 'function') {
          showToast(noResponseError, 'error');
        } else {
          alert(noResponseError);
        }
        setIsEditing(true); // Mantiene il form aperto
      } else {
        // Si è verificato un errore durante l'impostazione della richiesta
        const setupError = "Errore imprevisto durante la configurazione della richiesta.";
        if (typeof showToast === 'function') {
          showToast(setupError, 'error');
        } else {
          alert(setupError);
        }
        setIsEditing(true); // Mantiene il form aperto
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSede = async (id) => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/sites/${id}`);
      
      // Aggiorna la lista dei dati
      setDataVersion(v => v + 1);
      
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
    setSelectedSede({});
    setIsEditing(true);
    setIsPanelOpen(true);
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title="Cantieri" 
        buttonLabel="Nuovo Cantiere" 
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
          data={sedi}
          columns={[
            { 
              key: 'nome', 
              label: 'Nome'
            },
            { 
              key: 'indirizzo', 
              label: 'Indirizzo'
            },
            { 
              key: 'citta', 
              label: 'Città'
            },
            { 
              key: 'cap', 
              label: 'CAP'
            },
            { 
              key: 'provincia', 
              label: 'Provincia'
            },

            { 
              key: 'client.nome', 
              label: 'Cliente'
            },
            { 
              key: 'actions', 
              label: 'Azioni',
              render: (item) => (
                <div style={{ display: 'flex', gap: 8 }}>
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
                    Modifica
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/sedi/${item.id}`);
                    }}
                    style={{ 
                      background: '#f3f3f3', 
                      color: '#333', 
                      borderRadius: 6, 
                      padding: '0.4em 1em', 
                      fontSize: 14,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Visualizza
                  </button>
                </div>
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
          selectedRow={selectedSede}
          searchPlaceholder="Cerca sedi..."
          emptyMessage={fetching ? "Caricamento..." : "Nessuna sede trovata"}
          defaultVisibleColumns={['nome', 'indirizzo', 'citta', 'provincia', 'client.nome', 'actions']}
        />
      </div>

      {/* Pannello laterale per i dettagli */}
      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={handleClosePanel} 
        title={isEditing ? "Modifica Cantiere" : "Dettagli Cantiere"}
      >
        {selectedSede && (
          <TabPanel 
            tabs={[
              {
                id: 'details',
                label: 'Dettagli',
                content: (
                  <EntityForm
                    data={selectedSede}
                    fields={sedeFields}
                    onSave={handleSaveSede}
                    onDelete={handleDeleteSede}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    isLoading={isSaving || isDeleting}
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
                      <h3 style={{ margin: 0 }}>Attività del cantiere</h3>
                      <button
                        onClick={() => router.push(`/attivita/new?site_id=${selectedSede.id}`)}
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
                        siteId={selectedSede.id} 
                        onActivityClick={(activity) => router.push(`/attivita/${activity.id}`)}
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
    </div>
  );
}