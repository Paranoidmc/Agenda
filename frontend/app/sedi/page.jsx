"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

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