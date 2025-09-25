"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

export default function AutistiPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [autisti, setAutisti] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [error, setError] = useState("");

  const canEdit = user?.role === "admin";

  const load = async (opts = {}) => {
    const { searchTerm = "", page = currentPage, take = perPage } = opts;
    setFetching(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(take) });
      if (searchTerm && searchTerm.trim()) params.append("search", searchTerm.trim());
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
  }, [user, loading, currentPage, perPage]);

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
      <DataTable
        data={autisti}
        columns={[
          { key: "nome", label: "Nome" },
          { key: "cognome", label: "Cognome" },
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
        defaultVisibleColumns={["nome", "cognome", "telefono", "patente", "actions"]}
        defaultSortKey="nome"
        defaultSortDirection="asc"
      />
    </div>
  );
}