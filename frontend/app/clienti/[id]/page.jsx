"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";

export default function ClienteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [cliente, setCliente] = useState(null);
  const [sites, setSites] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState("details");
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const canEdit = user?.role === "admin";

  useEffect(() => {
    if (!loading && user) {
      loadCliente();
      loadSites();
      loadActivities();
    } else if (!loading && !user) {
      setFetching(false);
    }
  }, [user, loading, id]);

  const loadCliente = async () => {
    setFetching(true);
    try {
      const res = await api.get(`/clients/${id}`);
      setCliente(res.data);
    } catch (err) {
      setError("Errore nel caricamento del cliente");
    } finally {
      setFetching(false);
    }
  };

  const loadSites = async () => {
    try {
      const res = await api.get(`/clients/${id}/sites`);
      setSites(Array.isArray(res.data?.data) ? res.data.data : res.data);
    } catch (err) {
      // silenzioso
    }
  };

  const loadActivities = async () => {
    try {
      const res = await api.get(`/clients/${id}/activities`);
      setActivities(Array.isArray(res.data?.data) ? res.data.data : res.data);
    } catch (err) {
      // silenzioso
    }
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;
  if (!cliente) return <div className="centered">Cliente non trovato</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader
        title={`Cliente: ${cliente.nome ?? cliente.name}`}
        buttonLabel="Torna alla lista"
        onAddClick={() => router.push("/clienti")}
      />

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #eee", marginBottom: 20 }}>
        <div
          onClick={() => setActiveTab("details")}
          style={{
            padding: "10px 20px",
            cursor: "pointer",
            borderBottom: activeTab === "details" ? "2px solid var(--primary)" : "none",
            fontWeight: activeTab === "details" ? "bold" : "normal",
            color: activeTab === "details" ? "var(--primary)" : "inherit",
          }}
        >
          Dettagli
        </div>
        <div
          onClick={() => setActiveTab("sites")}
          style={{
            padding: "10px 20px",
            cursor: "pointer",
            borderBottom: activeTab === "sites" ? "2px solid var(--primary)" : "none",
            fontWeight: activeTab === "sites" ? "bold" : "normal",
            color: activeTab === "sites" ? "var(--primary)" : "inherit",
          }}
        >
          Cantieri ({sites?.length || 0})
        </div>
        <div
          onClick={() => setActiveTab("activities")}
          style={{
            padding: "10px 20px",
            cursor: "pointer",
            borderBottom: activeTab === "activities" ? "2px solid var(--primary)" : "none",
            fontWeight: activeTab === "activities" ? "bold" : "normal",
            color: activeTab === "activities" ? "var(--primary)" : "inherit",
          }}
        >
          Attività ({activities?.length || 0})
        </div>
      </div>

      {/* Contenuto */}
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "var(--box-shadow)", padding: 24 }}>
        {activeTab === "details" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <h3>Dati Cliente</h3>
              <p><strong>Nome:</strong> {cliente.nome}</p>
              <p><strong>Indirizzo:</strong> {cliente.indirizzo}</p>
              <p><strong>Città:</strong> {cliente.citta}</p>
              <p><strong>CAP:</strong> {cliente.cap}</p>
              <p><strong>Provincia:</strong> {cliente.provincia}</p>
              <p><strong>Telefono:</strong> {cliente.telefono}</p>
              <p><strong>Email:</strong> {cliente.email}</p>
            </div>
            <div>
              <h3>Fiscale</h3>
              <p><strong>P. IVA:</strong> {cliente.partita_iva}</p>
              <p><strong>Codice Fiscale:</strong> {cliente.codice_fiscale}</p>
              <p><strong>Codice ARCA:</strong> {cliente.codice_arca}</p>
              <p><strong>Note:</strong> {cliente.note}</p>
            </div>
          </div>
        )}

        {activeTab === "sites" && (
          <div>
            {(!sites || sites.length === 0) ? (
              <div>Nessun cantiere disponibile.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {sites.map((s) => (
                  <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 16, cursor: "pointer" }}
                       onClick={() => router.push(`/sedi/${s.id}`)}>
                    <div style={{ fontWeight: 600 }}>{s.nome ?? s.name}</div>
                    <div style={{ color: "#666" }}>{s.indirizzo ?? s.address}{s.citta ? `, ${s.citta}` : ""}</div>
                    <div style={{ color: "#999", fontSize: 12 }}>Codice ARCA: {s.codice_arca || "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "activities" && (
          <div>
            {(!activities || activities.length === 0) ? (
              <div>Nessuna attività disponibile.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                {activities.map((a) => (
                  <div key={a.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{a.titolo || a.title || `Attività #${a.id}`}</div>
                        <div style={{ color: "#666" }}>{a.descrizione || a.description || ""}</div>
                      </div>
                      <button onClick={() => router.push(`/attivita/${a.id}`)}
                              style={{ background: 'var(--primary)', color: '#fff', borderRadius: 6, padding: '0.4em 1em', fontSize: 14, border: 'none', cursor: 'pointer', height: 36 }}>
                        Dettaglio
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
