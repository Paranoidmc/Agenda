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
  const [perPage, setPerPage] = useState(25);
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

  const fetchSedi = () => {
    setFetching(true);
    api.get(`/sites`, {
      params: {
        page: currentPage,
        perPage: perPage,
        search: searchTerm
      }
    })
      .then(res => {
        setSedi(res.data.data || []);
        setTotal(res.data.total || 0);
      })
      .catch((err) => {
        console.error("Errore nel caricamento delle sedi:", err);
        if (err.response && err.response.status === 401) {
          setError("Sessione scaduta. Effettua nuovamente il login.");
        } else {
          setError("Errore nel caricamento delle sedi");
        }
      })
      .finally(() => setFetching(false));
  };

  const loadClienti = () => {
    api.get("/clients")
      .then(res => setClienti(res.data.data || []))
      .catch(err => console.error("Errore nel caricamento dei clienti:", err));
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
      console.log('Dati sede da salvare:', cleanedData);
      let response;
      if (cleanedData.id) {
        // Aggiornamento
        response = await api.put(`/sites/${cleanedData.id}`, cleanedData);
        console.log('Risposta aggiornamento sede:', response.data);
        // Aggiorna la lista delle sedi
        setSedi(prev => 
          prev.map(s => s.id === cleanedData.id ? response.data : s)
        );
        // Aggiorna la sede selezionata
        setSelectedSede(response.data);
      } else {
        // Creazione
        response = await api.post('/sites', cleanedData);
        console.log('Risposta creazione sede:', response.data);
        // Aggiorna la lista delle sedi
        setSedi(prev => [...prev, response.data]);
        
        // Seleziona la nuova sede
        setSelectedSede(response.data);
      }
      
      setIsEditing(false);
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

  const handleDeleteSede = async (id) => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/sites/${id}`);
      
      // Rimuovi la sede dalla lista
      setSedi(prev => prev.filter(s => s.id !== id));
      
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
          filterableColumns={[
            { 
              key: 'nome', 
              label: 'Nome',
              filterType: 'text'
            },
            { 
              key: 'citta', 
              label: 'Città',
              filterType: 'text'
            },
            { 
              key: 'client.nome', 
              label: 'Cliente',
              filterType: 'text'
            }
          ]}
          onRowClick={handleViewDetails}
          selectedRow={selectedSede}
          searchPlaceholder="Cerca sedi..."
          emptyMessage={fetching ? "Caricamento..." : "Nessuna sede trovata"}
          defaultVisibleColumns={['nome', 'indirizzo', 'citta', 'provincia', 'client.nome', 'actions']}
          totalItems={total}
          itemsPerPage={perPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPerPage}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          isLoading={fetching}
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