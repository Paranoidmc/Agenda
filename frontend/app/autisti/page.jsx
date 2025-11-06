"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import FilterBar from "../../components/FilterBar";

export default function AutistiPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [autisti, setAutisti] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [filters, setFilters] = useState({});

  const canEdit = user?.role === "admin";

  // Stato per valori dropdown
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);

  // Carica valori unici per dropdown
  useEffect(() => {
    if (!loading && user) {
      // Carica province
      api.get('/drivers/filter-values', { params: { field: 'provincia' } })
        .then(res => {
          if (res.data?.data) {
            setProvinceOptions(res.data.data.map(v => ({ value: v, label: v })));
          }
        })
        .catch(err => console.error('Errore caricamento province:', err));
      
      // Carica città
      api.get('/drivers/filter-values', { params: { field: 'citta' } })
        .then(res => {
          if (res.data?.data) {
            setCityOptions(res.data.data.map(v => ({ value: v, label: v })));
          }
        })
        .catch(err => console.error('Errore caricamento città:', err));
    }
  }, [user, loading]);

  // Configurazione filtri per autisti
  const filterConfig = [
    { key: 'nome', label: 'Nome', type: 'text', placeholder: 'Cerca per nome' },
    { key: 'cognome', label: 'Cognome', type: 'text', placeholder: 'Cerca per cognome' },
    { key: 'codice_arca', label: 'Codice ARCA', type: 'text', placeholder: 'Cerca per codice Arca' },
    { key: 'telefono', label: 'Telefono', type: 'text', placeholder: 'Cerca per telefono' },
    { key: 'email', label: 'Email', type: 'text', placeholder: 'Cerca per email' },
    { key: 'patente', label: 'Tipo Patente', type: 'select', options: [
      { value: 'B', label: 'B' },
      { value: 'C', label: 'C' },
      { value: 'D', label: 'D' },
      { value: 'CE', label: 'CE' },
      { value: 'DE', label: 'DE' }
    ]},
    { key: 'citta', label: 'Città', type: cityOptions.length > 0 ? 'select' : 'text', options: cityOptions, placeholder: 'Cerca per città' },
    { key: 'provincia', label: 'Provincia', type: provinceOptions.length > 0 ? 'select' : 'text', options: provinceOptions, placeholder: 'Cerca per provincia' },
  ];

  // Sincronizzazione autisti
  const sincronizzaAutisti = async () => {
    try {
      setSyncing(true);
      setSyncMessage('🔄 Sincronizzazione autisti in corso...');
      
      const response = await api.autisti.sync();
      
      if (response.data.success) {
        setSyncMessage(`✅ Sincronizzazione completata! ${response.data.data?.autisti || 0} autisti sincronizzati`);
        
        // Emetti evento per notificare altre pagine
        const syncEvent = new CustomEvent('driversSync', {
          detail: {
            type: 'sync',
            autisti: response.data.data?.autisti || 0
          }
        });
        window.dispatchEvent(syncEvent);
        
        // Ricarica gli autisti
        load({ searchTerm: "", page: currentPage, take: perPage });
      } else {
        setSyncMessage('❌ Errore durante la sincronizzazione');
      }
    } catch (error) {
      console.error('Errore sincronizzazione autisti:', error);
      setSyncMessage('❌ Errore durante la sincronizzazione: ' + (error.response?.data?.message || error.message));
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const load = async (opts = {}) => {
    const { searchTerm = "", page = currentPage, take = perPage } = opts;
    setFetching(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(take) });
      if (searchTerm && searchTerm.trim()) params.append("search", searchTerm.trim());
      
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
      
      const { data } = await api.get(`/drivers?${params.toString()}`);
      if (Array.isArray(data)) {
        setAutisti(data);
        setTotal(data.length);
      } else if (data && Array.isArray(data.data)) {
        setAutisti(data.data);
        setTotal(data.total || data.data.length);
      } else {
        setAutisti([]);
        setTotal(0);
      }
    } catch (e) {
      setError("Errore nel caricamento degli autisti");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading && user) load({ page: currentPage, take: perPage });
    else if (!loading && !user) setFetching(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, currentPage, perPage, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    load({ searchTerm: "", page: 1, take: perPage });
  };

  const handleClearFilters = () => {
    setFilters({});
    setCurrentPage(1);
    load({ searchTerm: "", page: 1, take: perPage });
  };

  const handleRowClick = (item) => {
    if (item?.id) router.push(`/autisti/${item.id}`);
  };

  const handleCreateNew = () => {
    router.push("/autisti/new");
  };

  const handleSearchTermChange = (term) => {
    // Server-side search: riparte da pagina 1
    setCurrentPage(1);
    load({ searchTerm: term, page: 1, take: perPage });
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader
        title="Autisti"
        buttonLabel={canEdit ? "Nuovo Autista" : ""}
        onAddClick={canEdit ? handleCreateNew : null}
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
            Autisti Arca
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            Gestione autisti sincronizzati da Arca
          </p>
        </div>
        
        <button
          onClick={sincronizzaAutisti}
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
          {syncing ? '🔄 Sincronizzando...' : '🔄 Sincronizza Autisti'}
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
        currentFilters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      <DataTable
        data={autisti}
        columns={[
          { key: "codice_arca", label: "Codice Arca" },
          { key: "nome", label: "Cognome" },
          { key: "cognome", label: "Nome" },
          { key: "telefono", label: "Telefono" },
          { key: "email", label: "Email" },
          { key: "patente", label: "Patente" },
          {
            key: "actions",
            label: "Azioni",
            render: (item) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/autisti/${item.id}`);
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
        searchPlaceholder="Cerca autisti..."
        emptyMessage={fetching ? "Caricamento..." : "Nessun autista trovato"}
        defaultVisibleColumns={["codice_arca", "nome", "cognome", "telefono", "patente", "actions"]}
        defaultSortKey="nome"
        defaultSortDirection="asc"
      />
    </div>
  );
}