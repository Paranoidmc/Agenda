"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

export default function ClientiPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [clienti, setClienti] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [error, setError] = useState("");

  const canEdit = user?.role === 'admin';

  useEffect(() => {
    const loadPage = async () => {
      setFetching(true);
      setError("");
      try {
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
  }, [user, loading, currentPage, perPage]);

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
