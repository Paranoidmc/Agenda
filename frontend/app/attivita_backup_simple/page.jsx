"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

export default function AttivitaPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [attivita, setAttivita] = useState([]);
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
      const { data } = await api.get(`/activities?${params.toString()}`);
      if (Array.isArray(data)) {
        setAttivita(data);
        setTotal(data.length);
      } else if (data && Array.isArray(data.data)) {
        setAttivita(data.data);
        setTotal(data.total || data.data.length);
      } else {
        setAttivita([]);
        setTotal(0);
      }
    } catch (e) {
      setError("Errore nel caricamento delle attività");
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
      case "Completata": return "#28a745";
      case "In corso": return "#ffc107";
      case "Programmata": return "#007bff";
      case "Annullata": return "#dc3545";
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
            key: "stato", 
            label: "Stato",
            render: (item) => (
              <span style={{ 
                color: getStatusColor(item.stato),
                fontWeight: "bold"
              }}>
                {item.stato || "N/A"}
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
            key: "driver_name", 
            label: "Autista",
            render: (item) => {
              if (item.driver) {
                return `${item.driver.nome || ""} ${item.driver.cognome || ""}`.trim();
              }
              return item.driver_name || "N/A";
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
        defaultVisibleColumns={["descrizione", "data_inizio", "stato", "client_name", "site_name", "driver_name", "actions"]}
        defaultSortKey="data_inizio"
        defaultSortDirection="desc"
      />
    </div>
  );
}
