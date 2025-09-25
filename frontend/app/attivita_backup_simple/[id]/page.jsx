"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";
import TabPanel from "../../../components/TabPanel";
import EntityForm from "../../../components/EntityForm";

export default function AttivitaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [attivita, setAttivita] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clienti, setClienti] = useState([]);
  const [sedi, setSedi] = useState([]);
  const [autisti, setAutisti] = useState([]);
  const [veicoli, setVeicoli] = useState([]);
  const [tipiAttivita, setTipiAttivita] = useState([]);
  const [documenti, setDocumenti] = useState([]);
  const [loadingDocumenti, setLoadingDocumenti] = useState(false);

  const canEdit = user?.role === "admin";
  const attivitaId = params?.id;

  const toInputDatetimeLocal = (dateString) => {
    if (!dateString) return "";
    const match = dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    return match ? match[0] : "";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
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

  // Campi del form attività
  const attivitaFields = [
    { name: "descrizione", label: "Descrizione", type: "textarea", required: true },
    { 
      name: "data_inizio", 
      label: "Data/Ora Inizio", 
      type: "datetime-local", 
      required: true,
      value: toInputDatetimeLocal(attivita?.data_inizio)
    },
    { 
      name: "data_fine", 
      label: "Data/Ora Fine", 
      type: "datetime-local",
      value: toInputDatetimeLocal(attivita?.data_fine)
    },
    {
      name: "client_id",
      label: "Cliente",
      type: "select",
      required: true,
      options: clienti.map(c => ({ value: c.id, label: c.nome || c.name || "" })),
      value: attivita?.client_id || ""
    },
    {
      name: "site_id",
      label: "Sede",
      type: "select",
      required: true,
      options: sedi.map(s => ({ value: s.id, label: s.nome || s.name || "" })),
      value: attivita?.site_id || ""
    },
    {
      name: "driver_id",
      label: "Autista",
      type: "select",
      options: autisti.map(a => ({ value: a.id, label: `${a.nome || ""} ${a.cognome || ""}`.trim() })),
      value: attivita?.driver_id || ""
    },
    {
      name: "vehicle_id",
      label: "Veicolo",
      type: "select",
      options: veicoli.map(v => ({ value: v.id, label: `${v.targa || ""} - ${v.marca || ""} ${v.modello || ""}`.trim() })),
      value: attivita?.vehicle_id || ""
    },
    {
      name: "activity_type_id",
      label: "Tipo Attività",
      type: "select",
      required: true,
      options: tipiAttivita.map(t => ({ value: t.id, label: t.nome || t.name || "" })),
      value: attivita?.activity_type_id || ""
    },
    {
      name: "stato",
      label: "Stato",
      type: "select",
      required: true,
      options: [
        { value: "Programmata", label: "Programmata" },
        { value: "In corso", label: "In corso" },
        { value: "Completata", label: "Completata" },
        { value: "Annullata", label: "Annullata" }
      ],
      value: attivita?.stato || "Programmata"
    },
    { name: "note", label: "Note", type: "textarea", value: attivita?.note || "" }
  ];

  useEffect(() => {
    if (!loading && user && attivitaId) {
      loadAttivita();
      loadRelatedData();
    } else if (!loading && !user) {
      setFetching(false);
    }
  }, [user, loading, attivitaId]);

  const loadAttivita = async () => {
    setFetching(true);
    setError("");
    try {
      const { data } = await api.get(`/activities/${attivitaId}`);
      setAttivita(data);
      loadDocumenti(data.id);
    } catch (e) {
      setError("Errore nel caricamento dell'attività");
    } finally {
      setFetching(false);
    }
  };

  const loadRelatedData = async () => {
    try {
      const [clientiRes, sediRes, autistiRes, veicoliRes, tipiRes] = await Promise.all([
        api.get("/clients"),
        api.get("/sites"),
        api.get("/drivers"),
        api.get("/vehicles"),
        api.get("/activity-types")
      ]);

      setClienti(Array.isArray(clientiRes.data) ? clientiRes.data : clientiRes.data?.data || []);
      setSedi(Array.isArray(sediRes.data) ? sediRes.data : sediRes.data?.data || []);
      setAutisti(Array.isArray(autistiRes.data) ? autistiRes.data : autistiRes.data?.data || []);
      setVeicoli(Array.isArray(veicoliRes.data) ? veicoliRes.data : veicoliRes.data?.data || []);
      setTipiAttivita(Array.isArray(tipiRes.data) ? tipiRes.data : tipiRes.data?.data || []);
    } catch (e) {
      console.error("Errore nel caricamento dei dati correlati:", e);
    }
  };

  const loadDocumenti = async (activityId) => {
    setLoadingDocumenti(true);
    try {
      const { data } = await api.get(`/activities/${activityId}/documents`);
      const docs = data?.success ? (data.data || []) : [];
      setDocumenti(docs);
    } catch (e) {
      console.error("Errore nel caricamento dei documenti:", e);
      setDocumenti([]);
    } finally {
      setLoadingDocumenti(false);
    }
  };

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      const { data } = await api.put(`/activities/${attivitaId}`, formData);
      setAttivita(data);
      setIsEditing(false);
      alert("Attività aggiornata con successo!");
    } catch (e) {
      console.error("Errore durante il salvataggio:", e);
      alert("Errore durante il salvataggio. Riprova più tardi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Sei sicuro di voler eliminare questa attività?")) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/activities/${attivitaId}`);
      alert("Attività eliminata con successo!");
      router.push("/attivita");
    } catch (e) {
      console.error("Errore durante l'eliminazione:", e);
      alert("Errore durante l'eliminazione. Riprova più tardi.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;
  if (!attivita) return <div className="centered">Attività non trovata</div>;

  const attivitaTitle = attivita.descrizione || `Attività #${attivita.id}`;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader
        title={`Attività: ${attivitaTitle}`}
        buttonLabel={canEdit ? (isEditing ? "Annulla" : "Modifica") : ""}
        onAddClick={canEdit ? () => setIsEditing(!isEditing) : null}
        showBackButton={true}
        onBackClick={() => router.push("/attivita")}
      />

      <TabPanel
        tabs={[
          {
            id: "details",
            label: "Dettagli",
            content: (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  <div>
                    <h3>Informazioni Generali</h3>
                    <p><strong>Descrizione:</strong> {attivita.descrizione || "N/A"}</p>
                    <p><strong>Data Inizio:</strong> {formatDate(attivita.data_inizio)}</p>
                    <p><strong>Data Fine:</strong> {formatDate(attivita.data_fine)}</p>
                    <p>
                      <strong>Stato:</strong>{" "}
                      <span style={{ color: getStatusColor(attivita.stato), fontWeight: "bold" }}>
                        {attivita.stato || "N/A"}
                      </span>
                    </p>
                  </div>
                  <div>
                    <h3>Assegnazioni</h3>
                    <p><strong>Cliente:</strong> {attivita.client?.nome || "N/A"}</p>
                    <p><strong>Sede:</strong> {attivita.site?.nome || "N/A"}</p>
                    <p><strong>Autista:</strong> {attivita.driver ? `${attivita.driver.nome} ${attivita.driver.cognome}` : "N/A"}</p>
                    <p><strong>Veicolo:</strong> {attivita.vehicle ? `${attivita.vehicle.targa} - ${attivita.vehicle.marca} ${attivita.vehicle.modello}` : "N/A"}</p>
                  </div>
                </div>
                {attivita.note && (
                  <div>
                    <h3>Note</h3>
                    <p style={{ background: "#f8f9fa", padding: 15, borderRadius: 6 }}>{attivita.note}</p>
                  </div>
                )}
              </div>
            )
          },
          {
            id: "edit",
            label: "Modifica",
            content: (
              <EntityForm
                data={attivita}
                fields={attivitaFields}
                onSave={canEdit ? handleSave : null}
                onDelete={canEdit ? handleDelete : null}
                isEditing={isEditing}
                setIsEditing={canEdit ? setIsEditing : () => {}}
                isLoading={isSaving || isDeleting}
              />
            )
          },
          {
            id: "documents",
            label: "Documenti",
            count: documenti.length,
            content: (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>Documenti collegati</h3>
                  {canEdit && (
                    <button
                      onClick={() => router.push(`/documenti?activity_id=${attivitaId}`)}
                      style={{
                        background: "var(--primary)",
                        color: "#fff",
                        borderRadius: 6,
                        padding: "0.4em 1em",
                        fontSize: 14,
                        border: "none",
                        cursor: "pointer"
                      }}
                    >
                      Gestisci Documenti
                    </button>
                  )}
                </div>
                {loadingDocumenti ? (
                  <div>Caricamento documenti...</div>
                ) : documenti.length > 0 ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {documenti.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          padding: 15,
                          border: "1px solid #e5e5ea",
                          borderRadius: 6,
                          cursor: "pointer"
                        }}
                        onClick={() => router.push(`/documenti/${doc.id}`)}
                      >
                        <div style={{ fontWeight: "bold" }}>{doc.numero_documento || `Documento #${doc.id}`}</div>
                        <div style={{ fontSize: 14, color: "#666" }}>
                          {doc.tipo_documento} - {formatDate(doc.data_documento)}
                        </div>
                        {doc.importo && (
                          <div style={{ fontSize: 14, color: "#666" }}>
                            Importo: €{parseFloat(doc.importo).toFixed(2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: "#666", padding: 20 }}>
                    Nessun documento collegato
                  </div>
                )}
              </div>
            )
          }
        ]}
        defaultTab="details"
      />
    </div>
  );
}
