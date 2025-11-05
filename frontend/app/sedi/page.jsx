"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import FilterBar from "../../components/FilterBar";

export default function SediPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sedi, setSedi] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [clienti, setClienti] = useState([]);
  const [dataVersion, setDataVersion] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [filters, setFilters] = useState({});

  // Configurazione filtri per sedi
  const filterConfig = [
    { key: 'nome', label: 'Nome', type: 'text', placeholder: 'Cerca per nome' },
    { key: 'citta', label: 'Città', type: 'text', placeholder: 'Cerca per città' },
    { key: 'provincia', label: 'Provincia', type: 'text', placeholder: 'Cerca per provincia' },
    { key: 'cap', label: 'CAP', type: 'text', placeholder: 'Cerca per CAP' },
    { key: 'indirizzo', label: 'Indirizzo', type: 'text', placeholder: 'Cerca per indirizzo' },
    { key: 'client_id', label: 'Cliente', type: 'select', options: Array.isArray(clienti) ? clienti.map(c => ({ value: c.id, label: c.nome || c.name })) : [] },
  ];

  // Sincronizzazione cantieri
  const sincronizzaCantieri = async () => {
    try {
      setSyncing(true);
      setSyncMessage('🔄 Sincronizzazione cantieri in corso...');
      
      const response = await api.cantieri.sync();
      
      if (response.data.success) {
        setSyncMessage(`✅ Sincronizzazione completata! ${response.data.data?.cantieri || 0} cantieri sincronizzati`);
        
        // Emetti evento per notificare altre pagine
        const syncEvent = new CustomEvent('sitesSync', {
          detail: {
            type: 'sync',
            cantieri: response.data.data?.cantieri || 0
          }
        });
        window.dispatchEvent(syncEvent);
        
        // Ricarica i cantieri
        fetchSediWithSearch(searchTerm, false);
      } else {
        setSyncMessage('❌ Errore durante la sincronizzazione');
      }
    } catch (error) {
      console.error('Errore sincronizzazione cantieri:', error);
      setSyncMessage('❌ Errore durante la sincronizzazione: ' + (error.response?.data?.message || error.message));
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

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

  // Nessun sidepanel: tabella sempre full width

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
      
      // Aggiungi i filtri come parametri
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          if (typeof value === 'object' && value.from) {
            if (value.from) params.append(`${key}_from`, value.from);
            if (value.to) params.append(`${key}_to`, value.to);
          } else {
            params.append(`filter[${key}]`, value);
          }
        }
      });
      
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

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    fetchSediWithSearch(searchTerm, true);
  };

  const handleClearFilters = () => {
    setFilters({});
    setCurrentPage(1);
    fetchSediWithSearch(searchTerm, true);
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
    if (sede?.id) router.push(`/sedi/${sede.id}`);
  };
  
  // Creazione su pagina dedicata
  const handleCreateNew = () => {
    router.push('/sedi/new');
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
      
      {/* Pulsante di sincronizzazione */}
      <div style={{ 
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h2 style={{ 
            fontWeight: 600, 
            margin: 0,
            fontSize: '1.5rem',
            color: '#1a1a1a'
          }}>
            Cantieri Arca
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            Gestione cantieri sincronizzati da Arca
          </p>
        </div>
        
        <button
          onClick={sincronizzaCantieri}
          disabled={syncing}
          style={{
            backgroundColor: syncing ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: syncing ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!syncing) e.target.style.backgroundColor = '#059669';
          }}
          onMouseLeave={(e) => {
            if (!syncing) e.target.style.backgroundColor = '#10b981';
          }}
        >
          {syncing ? '🔄 Sincronizzando...' : '🔄 Sincronizza Cantieri'}
        </button>
      </div>

      {/* Messaggio di sincronizzazione */}
      {syncMessage && (
        <div className={`mx-4 mb-4 p-3 rounded ${
          syncMessage.includes('✅') 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : syncMessage.includes('❌')
            ? 'bg-red-100 text-red-800 border border-red-200'
            : 'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          {syncMessage}
        </div>
      )}

      {/* Filtri avanzati */}
      <FilterBar 
        filters={filterConfig}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      <div>
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
                    onClick={(e) => { e.stopPropagation(); router.push(`/sedi/${item.id}`); }}
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
          selectedRow={null}
          searchPlaceholder="Cerca sedi..."
          emptyMessage={fetching ? "Caricamento..." : "Nessuna sede trovata"}
          defaultVisibleColumns={['nome', 'indirizzo', 'citta', 'provincia', 'client.nome', 'actions']}
        />
      </div>
      {/* Dettaglio spostato su pagina dedicata /sedi/[id] */}
    </div>
  );
}