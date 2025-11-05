"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import FilterBar from "../../components/FilterBar";

export default function ClientiPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [clienti, setClienti] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [filters, setFilters] = useState({});

  const canEdit = user?.role === 'admin';

  // Configurazione filtri per clienti
  const filterConfig = [
    { key: 'nome', label: 'Nome', type: 'text', placeholder: 'Cerca per nome' },
    { key: 'citta', label: 'Città', type: 'text', placeholder: 'Cerca per città' },
    { key: 'provincia', label: 'Provincia', type: 'text', placeholder: 'Cerca per provincia' },
    { key: 'partita_iva', label: 'Partita IVA', type: 'text', placeholder: 'Cerca per P. IVA' },
    { key: 'codice_fiscale', label: 'Codice Fiscale', type: 'text', placeholder: 'Cerca per codice fiscale' },
    { key: 'codice_arca', label: 'Codice ARCA', type: 'text', placeholder: 'Cerca per codice Arca' },
    { key: 'email', label: 'Email', type: 'text', placeholder: 'Cerca per email' },
    { key: 'telefono', label: 'Telefono', type: 'text', placeholder: 'Cerca per telefono' },
  ];

  // Sincronizzazione clienti
  const sincronizzaClienti = async () => {
    try {
      setSyncing(true);
      setSyncMessage('🔄 Sincronizzazione clienti in corso...');
      
      const response = await api.clienti.sync();
      
      if (response.data.success) {
        setSyncMessage(`✅ Sincronizzazione completata! ${response.data.data?.clienti || 0} clienti sincronizzati`);
        
        // Emetti evento per notificare altre pagine
        const syncEvent = new CustomEvent('clientsSync', {
          detail: {
            type: 'sync',
            clienti: response.data.data?.clienti || 0
          }
        });
        window.dispatchEvent(syncEvent);
        
        // Ricarica i clienti
        const params = new URLSearchParams({
          page: String(currentPage),
          perPage: String(perPage),
        });
        const { data } = await api.get(`/clients?${params.toString()}`);
        if (Array.isArray(data)) {
          setClienti(data);
          setTotal(data.length);
        } else if (data && Array.isArray(data.data)) {
          setClienti(data.data);
          setTotal(data.total || data.data.length);
        }
      } else {
        setSyncMessage('❌ Errore durante la sincronizzazione');
      }
    } catch (error) {
      console.error('Errore sincronizzazione clienti:', error);
      setSyncMessage('❌ Errore durante la sincronizzazione: ' + (error.response?.data?.message || error.message));
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  useEffect(() => {
    const loadPage = async () => {
      setFetching(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          perPage: String(perPage),
        });
        
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
        
        const { data } = await api.get(`/clients?${params.toString()}`);
        if (Array.isArray(data)) {
          setClienti(data);
          setTotal(data.length);
        } else if (data && Array.isArray(data.data)) {
          setClienti(data.data);
          setTotal(data.total || data.data.length);
        } else {
          setClienti([]);
          setTotal(0);
        }
      } catch (e) {
        setError('Errore nel caricamento dei clienti');
      } finally {
        setFetching(false);
      }
    };

    if (!loading && user) {
      loadPage();
    } else if (!loading && !user) {
      setFetching(false);
    }
  }, [user, loading, currentPage, perPage, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset alla prima pagina quando cambiano i filtri
  };

  const handleClearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const handleRowClick = (item) => {
    if (item?.id) router.push(`/clienti/${item.id}`);
  };

  const handleCreateNew = () => {
    router.push('/clienti/new');
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader
        title="Clienti"
        buttonLabel={canEdit ? "Nuovo Cliente" : ""}
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
            Clienti Arca
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            Gestione clienti sincronizzati da Arca
          </p>
        </div>
        
        <button
          onClick={sincronizzaClienti}
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
          {syncing ? '🔄 Sincronizzando...' : '🔄 Sincronizza Clienti'}
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

      <DataTable
        data={clienti}
        columns={[
          { key: 'nome', label: 'Nome' },
          { key: 'citta', label: 'Città' },
          { key: 'indirizzo', label: 'Indirizzo' },
          { key: 'telefono', label: 'Telefono' },
          { key: 'email', label: 'Email' },
          { key: 'partita_iva', label: 'Partita IVA' },
          { key: 'codice_fiscale', label: 'Codice Fiscale' },
          {
            key: 'actions',
            label: 'Azioni',
            render: (item) => (
              <button
                onClick={(e) => { e.stopPropagation(); handleRowClick(item); }}
                style={{ background: 'var(--primary)', color: '#fff', borderRadius: 6, padding: '0.4em 1em', fontSize: 14, border: 'none', cursor: 'pointer' }}
              >
                Dettagli
              </button>
            )
          },
        ]}
        serverSide={true}
        currentPage={currentPage}
        totalItems={total}
        itemsPerPage={perPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setPerPage}
        onRowClick={handleRowClick}
        selectedRow={null}
        searchPlaceholder="Cerca clienti..."
        emptyMessage={fetching ? "Caricamento..." : "Nessun cliente trovato"}
        defaultVisibleColumns={['nome', 'citta', 'telefono', 'partita_iva', 'actions']}
        defaultSortKey="nome"
        defaultSortDirection="asc"
      />
    </div>
  );
}
