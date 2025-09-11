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
import SiteList from "../../components/SiteList";
import DataTable from "../../components/DataTable";

export default function ClientiPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [clienti, setClienti] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20000);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableWidth, setTableWidth] = useState('100%');
  const [sites, setSites] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const canEdit = user?.role === 'admin';

  // Campi del form cliente
  const clienteFields = [
    { name: 'nome', label: 'Nome', required: true },
    { name: 'indirizzo', label: 'Indirizzo' },
    { name: 'citta', label: 'Città' },
    { name: 'cap', label: 'CAP' },
    { name: 'provincia', label: 'Provincia' },
    { name: 'telefono', label: 'Telefono' },
    { name: 'email', label: 'Email' },
    { name: 'partita_iva', label: 'Partita IVA' },
    { name: 'codice_fiscale', label: 'Codice Fiscale' },
    { name: 'codice_arca', label: 'Codice Arca' },
    { name: 'note', label: 'Note', type: 'textarea' }
  ];

  useEffect(() => {
    if (!loading && user) {
      fetchClienti();
    } else if (!loading && !user) {
      setFetching(false);
    }
  }, [user, loading, dataVersion]);
  
  // Effetto per ricaricare i dati quando cambiano pagina o elementi per pagina
  useEffect(() => {
    if (!loading && user) {
      fetchClientiWithSearch(searchTerm);
    }
  }, [currentPage, perPage]);

  useEffect(() => {
    if (isPanelOpen) {
      setTimeout(() => {
        setTableWidth('60%');
      }, 50);
    } else {
      setTableWidth('100%');
    }
  }, [isPanelOpen]);

  const fetchClienti = async () => {
    await fetchClientiWithSearch(searchTerm);
  };
  
  const fetchClientiWithSearch = async (searchTermParam = '', resetPage = false) => {
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
      
      console.log('🔍 Caricamento clienti:', {
        page: pageToUse,
        perPage,
        search: searchTermParam,
        resetPage,
        url: `/clients?${params.toString()}`
      });
      
      const response = await api.get(`/clients?${params.toString()}`);
      
      console.log('📄 Risposta API clienti:', response.data);
      
      if (Array.isArray(response.data)) {
        setClienti(response.data);
        setTotal(response.data.length);
      } else if (response.data && Array.isArray(response.data.data)) {
        setClienti(response.data.data);
        setTotal(response.data.total || response.data.data.length);
      } else {
        console.warn('⚠️ Struttura risposta inaspettata:', response.data);
        setClienti([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("❌ Errore nel caricamento dei clienti:", err);
      if (err.response && err.response.status === 401) {
        setError("Sessione scaduta. Effettua nuovamente il login.");
      } else {
        setError("Errore nel caricamento dei clienti.");
      }
      setClienti([]);
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
    
    // Chiama fetchClienti direttamente con il nuovo termine e reset pagina
    if (!loading && user) {
      fetchClientiWithSearch(newTerm, true); // true = reset pagina
    }
  };

  const handleViewDetails = (cliente) => {
    setSelectedCliente(cliente);
    setIsEditing(false);
    setIsPanelOpen(true);
    
    // Carica le sedi e le attività per questo cliente
    loadSites(cliente.id);
    loadActivities(cliente.id);
  };
  
  const loadSites = async (clientId) => {
    if (!clientId) return;
    
    setLoadingSites(true);
    try {
      const response = await api.get(`/clients/${clientId}/sites`);
      setSites(response.data);
    } catch (err) {
      console.error("Errore nel caricamento dei cantieri:", err);
    } finally {
      setLoadingSites(false);
    }
  };
  
  const loadActivities = async (clientId) => {
    if (!clientId) return;
    
    setLoadingActivities(true);
    try {
      const response = await api.get(`/clients/${clientId}/activities`);
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
      setSelectedCliente(null);
      setIsEditing(false);
    }, 300);
  };

  const handleSaveCliente = async (formData) => {
    setIsSaving(true);
    try {
      let response;
      const dataToSend = { ...formData };

      if (dataToSend.id) {
        // Aggiornamento
        response = await api.put(`/clients/${dataToSend.id}`, dataToSend);
      } else {
        response = await api.post('/clients', dataToSend);
      }
      
      setDataVersion(v => v + 1);
      setIsEditing(false);
      handleClosePanel();
      
      const message = dataToSend.id ? 'Cliente aggiornato con successo!' : 'Cliente creato con successo!';
      if (typeof showToast === 'function') {
        showToast(message, 'success');
      } else {
        alert(message);
      }

    } catch (err) {
      console.error("Errore durante il salvataggio del cliente:", err);
      setIsEditing(true); // Mantiene il form aperto per correzioni
      let errorMessage = "Si è verificato un errore durante il salvataggio. Riprova più tardi.";
      if (err.response && err.response.data && err.response.data.errors) {
          const validationErrors = Object.values(err.response.data.errors).flat().join('\n');
          errorMessage = `Errori di validazione:\n${validationErrors}`;
      } else if (err.response && err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
      }
      
      if (typeof showToast === 'function') {
        showToast(errorMessage, 'error');
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCliente = async (id) => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/clients/${id}`);
      
      setDataVersion(v => v + 1);
      handleClosePanel();
    } catch (err) {
      console.error("Errore durante l'eliminazione:", err);
      alert("Si è verificato un errore durante l'eliminazione. Riprova più tardi.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;

  const handleCreateNew = () => {
    setSelectedCliente({});
    setIsEditing(true);
    setIsPanelOpen(true);
  };

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title="Clienti" 
        buttonLabel={canEdit ? "Nuovo Cliente" : ""} 
        onAddClick={canEdit ? handleCreateNew : null} 
      />
      <div 
        style={{ 
          transition: 'width 0.3s ease-in-out',
          width: tableWidth,
          overflow: 'hidden'
        }}
      >
        <DataTable
          data={clienti}
          columns={[
            { 
              key: 'nome', 
              label: 'Nome'
            },
            { 
              key: 'citta', 
              label: 'Città'
            },
            { 
              key: 'indirizzo', 
              label: 'Indirizzo'
            },
            { 
              key: 'telefono', 
              label: 'Telefono'
            },
            { 
              key: 'email', 
              label: 'Email'
            },
            { 
              key: 'partita_iva', 
              label: 'Partita IVA'
            },
            { 
              key: 'codice_fiscale', 
              label: 'Codice Fiscale'
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
          selectedRow={selectedCliente}
          searchPlaceholder="Cerca clienti..."
          emptyMessage={fetching ? "Caricamento..." : "Nessun cliente trovato"}
          defaultVisibleColumns={['nome', 'citta', 'telefono', 'partita_iva', 'actions']}
          defaultSortKey="nome"
          defaultSortDirection="asc"
        />
      </div>

      {/* Pannello laterale per i dettagli */}
      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={handleClosePanel} 
        title={isEditing ? "Modifica Cliente" : "Dettagli Cliente"}
      >
        {selectedCliente && (
          <TabPanel 
            tabs={[
              {
                id: 'details',
                label: 'Dettagli',
                content: (
                  <EntityForm
                    data={selectedCliente}
                    fields={clienteFields}
                    onSave={canEdit ? handleSaveCliente : null}
                    onDelete={canEdit ? handleDeleteCliente : null}
                    isEditing={isEditing}
                    setIsEditing={canEdit ? setIsEditing : () => {}}
                    isLoading={isSaving || isDeleting}
                  />
                )
              },
              {
                id: 'sites',
                label: 'Cantieri',
                count: sites.length,
                content: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ margin: 0 }}>Cantieri del cliente</h3>
                      <button
                        onClick={() => router.push(`/sedi/new?client_id=${selectedCliente.id}`)}
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
                        Nuovo Cantiere
                      </button>
                    </div>
                    
                    {loadingSites ? (
                      <div>Caricamento cantieri...</div>
                    ) : (
                      <SiteList 
                        clientId={selectedCliente.id} 
                        onSiteClick={(site) => router.push(`/sedi/${site.id}`)}
                      />
                    )}
                  </div>
                )
              },
              {
                id: 'activities',
                label: 'Attività',
                count: activities.length,
                content: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ margin: 0 }}>Attività del cliente</h3>
                      <button
                        onClick={() => router.push(`/attivita/new?client_id=${selectedCliente.id}`)}
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
                        clientId={selectedCliente.id} 
                        onActivityClick={(activity) => router.push(`/attivita?open=${activity.id}`)}
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
