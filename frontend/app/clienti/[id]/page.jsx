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
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = user?.role === "admin";

  // Campi del form cliente
  const clienteFields = [
    { name: 'nome', label: 'Nome', required: true },
    { name: 'email', label: 'Email', required: true, type: 'email' },
    { name: 'telefono', label: 'Telefono' },
    { name: 'indirizzo', label: 'Indirizzo' },
    { name: 'citta', label: 'Città' },
    { name: 'cap', label: 'CAP' },
    { name: 'provincia', label: 'Provincia' },
    { name: 'partita_iva', label: 'P. IVA' },
    { name: 'codice_fiscale', label: 'Codice Fiscale' },
    { name: 'codice_arca', label: 'Codice ARCA' },
    { name: 'note', label: 'Note', type: 'textarea' }
  ];

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

  const handleSaveCliente = async (formData) => {
    if (!canEdit) {
      alert('Non hai i permessi per modificare i clienti');
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      // Pulisci i dati: invia solo i campi previsti dal database
      const allowedFields = ['nome', 'email', 'telefono', 'indirizzo', 'citta', 'cap', 'provincia', 'partita_iva', 'codice_fiscale', 'codice_arca', 'note'];
      const cleanedData = {};
      for (const key of allowedFields) {
        if (formData[key] !== undefined && formData[key] !== '') {
          cleanedData[key] = formData[key];
        }
      }
      
      const response = await api.put(`/clients/${id}`, cleanedData);
      setCliente(response.data);
      setIsEditing(false);
      alert('Cliente aggiornato con successo!');
    } catch (err) {
      console.error("Errore durante il salvataggio:", err);
      
      if (err.response) {
        const errorData = err.response.data;
        if (errorData?.errors) {
          // Errori di validazione Laravel
          const errorMessages = Object.entries(errorData.errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          setError(`Errori di validazione:\n${errorMessages}`);
        } else {
          const errorMessage = errorData?.message || errorData?.error || "Si è verificato un errore durante il salvataggio. Riprova più tardi.";
          setError(errorMessage);
        }
      } else if (err.request) {
        setError("Nessuna risposta dal server. Verifica la connessione di rete.");
      } else {
        setError("Si è verificato un errore durante il salvataggio. Riprova più tardi.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCliente = async () => {
    if (!canEdit) {
      alert('Non hai i permessi per eliminare i clienti');
      return;
    }

    const confirmDelete = confirm(
      `Sei sicuro di voler eliminare il cliente "${cliente?.nome ?? cliente?.name}"?\n\nQuesta azione non può essere annullata.`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    setError("");

    try {
      await api.delete(`/clients/${id}`);
      alert('Cliente eliminato con successo!');
      router.push('/clienti');
    } catch (err) {
      console.error("Errore durante l'eliminazione:", err);
      
      const errorMsg = err.response?.data?.message || err.message || 'Errore durante l\'eliminazione del cliente';
      setError(errorMsg);
      alert(`Errore: ${errorMsg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError("");
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error && !cliente) return <div className="centered">{error}</div>;
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
        {error && (
          <div style={{ 
            background: '#ffeaea', 
            color: '#b91c1c', 
            borderRadius: 6, 
            padding: '12px 16px', 
            marginBottom: 20,
            whiteSpace: 'pre-line'
          }}>
            {error}
          </div>
        )}

        {activeTab === "details" && (
          <>
            {isEditing ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                handleSaveCliente(data);
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {clienteFields.map(field => (
                    <div key={field.name} style={{ marginBottom: 15 }}>
                      <label style={{ display: 'block', marginBottom: 5 }}>
                        {field.label}{field.required && <span style={{ color: 'red' }}>*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          name={field.name}
                          defaultValue={cliente[field.name] || ''}
                          required={field.required}
                          style={{ 
                            width: '100%', 
                            padding: 8, 
                            borderRadius: 4, 
                            border: '1px solid #ddd',
                            minHeight: 100
                          }}
                        />
                      ) : (
                        <input
                          type={field.type || 'text'}
                          name={field.name}
                          defaultValue={cliente[field.name] || ''}
                          required={field.required}
                          style={{ 
                            width: '100%', 
                            padding: 8, 
                            borderRadius: 4, 
                            border: '1px solid #ddd' 
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                
                <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{ 
                      background: 'var(--primary)', 
                      color: '#fff', 
                      borderRadius: 6, 
                      padding: '0.6em 1.2em', 
                      fontSize: 14,
                      border: 'none',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      opacity: isSaving ? 0.6 : 1
                    }}
                  >
                    {isSaving ? 'Salvataggio...' : 'Salva'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    style={{ 
                      background: '#f3f3f3', 
                      color: '#333', 
                      borderRadius: 6, 
                      padding: '0.6em 1.2em', 
                      fontSize: 14,
                      border: 'none',
                      cursor: isSaving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Annulla
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <h3>Dati Cliente</h3>
                    <p><strong>Nome:</strong> {cliente.nome || cliente.name || '—'}</p>
                    <p><strong>Indirizzo:</strong> {cliente.indirizzo || cliente.address || '—'}</p>
                    <p><strong>Città:</strong> {cliente.citta || cliente.city || '—'}</p>
                    <p><strong>CAP:</strong> {cliente.cap || cliente.postal_code || '—'}</p>
                    <p><strong>Provincia:</strong> {cliente.provincia || cliente.province || '—'}</p>
                    <p><strong>Telefono:</strong> {cliente.telefono || cliente.phone || '—'}</p>
                    <p><strong>Email:</strong> {cliente.email || '—'}</p>
                  </div>
                  <div>
                    <h3>Fiscale</h3>
                    <p><strong>P. IVA:</strong> {cliente.partita_iva || cliente.vat_number || '—'}</p>
                    <p><strong>Codice Fiscale:</strong> {cliente.codice_fiscale || cliente.fiscal_code || '—'}</p>
                    <p><strong>Codice ARCA:</strong> {cliente.codice_arca || '—'}</p>
                    <p><strong>Note:</strong> {cliente.note || cliente.notes || '—'}</p>
                  </div>
                </div>
                
                {canEdit && (
                  <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{ 
                        background: 'var(--primary)', 
                        color: '#fff', 
                        borderRadius: 6, 
                        padding: '0.6em 1.2em', 
                        fontSize: 14,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Modifica
                    </button>
                    <button
                      onClick={handleDeleteCliente}
                      disabled={isDeleting}
                      style={{ 
                        background: '#ff3b30', 
                        color: '#fff', 
                        borderRadius: 6, 
                        padding: '0.6em 1.2em', 
                        fontSize: 14,
                        border: 'none',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        opacity: isDeleting ? 0.6 : 1
                      }}
                    >
                      {isDeleting ? 'Eliminazione...' : 'Elimina'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
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
