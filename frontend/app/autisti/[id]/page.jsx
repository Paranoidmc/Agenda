"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";
import TabPanel from "../../../components/TabPanel";
import EntityForm from "../../../components/EntityForm";
import ActivityList from "../../../components/ActivityList";

export default function AutistaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [autista, setAutista] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const canEdit = user?.role === "admin";
  const autistaId = params?.id;

  // Campi del form autista - informazioni personali
  const autistaFields = [
    { name: "nome", label: "Nome", required: true },
    { name: "cognome", label: "Cognome", required: true },
    { name: "telefono", label: "Telefono" },
    { name: "email", label: "Email" },
    { name: "codice_fiscale", label: "Codice Fiscale" },
    { name: "data_nascita", label: "Data di Nascita", type: "date" },
    { name: "indirizzo", label: "Indirizzo" },
    { name: "citta", label: "Città" },
    { name: "cap", label: "CAP" },
    { name: "provincia", label: "Provincia" },
    { name: "note", label: "Note", type: "textarea" }
  ];

  // Campi per la patente e informazioni lavorative
  const patenteFields = [
    {
      name: "patente",
      label: "Tipo Patente",
      type: "select",
      options: [
        { value: "B", label: "B" },
        { value: "C", label: "C" },
        { value: "D", label: "D" },
        { value: "CE", label: "CE" },
        { value: "DE", label: "DE" }
      ]
    },
    { name: "numero_patente", label: "Numero Patente" },
    { name: "scadenza_patente", label: "Scadenza Patente", type: "date" },
    { name: "data_assunzione", label: "Data Assunzione", type: "date" },
    {
      name: "tipo_contratto",
      label: "Tipo Contratto",
      type: "select",
      options: [
        { value: "indeterminato", label: "Tempo Indeterminato" },
        { value: "determinato", label: "Tempo Determinato" },
        { value: "partita_iva", label: "Partita IVA" },
        { value: "occasionale", label: "Occasionale" }
      ]
    },
    { name: "scadenza_contratto", label: "Scadenza Contratto", type: "date" },
    { name: "note_patente", label: "Note Patente", type: "textarea" }
  ];

  useEffect(() => {
    if (!loading && user && autistaId) {
      loadAutista();
      loadActivities();
    } else if (!loading && !user) {
      setFetching(false);
    }
  }, [user, loading, autistaId]);

  const loadAutista = async () => {
    setFetching(true);
    setError("");
    try {
      const { data } = await api.get(`/drivers/${autistaId}`);
      setAutista(data);
    } catch (e) {
      setError("Errore nel caricamento dell'autista");
    } finally {
      setFetching(false);
    }
  };

  const loadActivities = async () => {
    setLoadingActivities(true);
    try {
      const { data } = await api.get(`/drivers/${autistaId}/activities`);
      const activitiesArr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setActivities(activitiesArr.sort((a, b) => 
        new Date(b.data_inizio || 0) - new Date(a.data_inizio || 0)
      ));
    } catch (e) {
      console.error("Errore nel caricamento delle attività:", e);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      const { data } = await api.put(`/drivers/${autistaId}`, formData);
      setAutista(data);
      setIsEditing(false);
      alert("Autista aggiornato con successo!");
    } catch (e) {
      console.error("Errore durante il salvataggio:", e);
      alert("Errore durante il salvataggio. Riprova più tardi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Sei sicuro di voler eliminare questo autista?")) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/drivers/${autistaId}`);
      alert("Autista eliminato con successo!");
      router.push("/autisti");
    } catch (e) {
      console.error("Errore durante l'eliminazione:", e);
      alert("Errore durante l'eliminazione. Riprova più tardi.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;
  if (!autista) return <div className="centered">Autista non trovato</div>;

  const autistaName = `${autista.nome || ""} ${autista.cognome || ""}`.trim();

  return (
    <div style={{ padding: 32 }}>
      <PageHeader
        title={`Autista: ${autistaName}`}
        buttonLabel={canEdit ? (isEditing ? "Annulla" : "Modifica") : ""}
        onAddClick={canEdit ? () => setIsEditing(!isEditing) : null}
        showBackButton={true}
        onBackClick={() => router.push("/autisti")}
      />

      <TabPanel
        tabs={[
          {
            id: "details",
            label: "Anagrafica",
            content: (
              <EntityForm
                data={autista}
                fields={autistaFields}
                onSave={canEdit ? handleSave : null}
                onDelete={canEdit ? handleDelete : null}
                isEditing={isEditing}
                setIsEditing={canEdit ? setIsEditing : () => {}}
                isLoading={isSaving || isDeleting}
              />
            )
          },
          {
            id: "patente",
            label: "Patente e Lavoro",
            content: (
              <EntityForm
                data={autista}
                fields={patenteFields}
                onSave={canEdit ? handleSave : null}
                isEditing={isEditing}
                setIsEditing={canEdit ? setIsEditing : () => {}}
                isLoading={isSaving}
              />
            )
          },
          {
            id: "activities",
            label: "Attività",
            count: activities.length,
            content: (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>Attività dell'autista</h3>
                  {canEdit && (
                    <button
                      onClick={() => router.push(`/attivita/new?driver_id=${autistaId}`)}
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
                      Nuova Attività
                    </button>
                  )}
                </div>
                {loadingActivities ? (
                  <div>Caricamento attività...</div>
                ) : (
                  <ActivityList
                    activities={activities}
                    onActivityClick={(activity) => router.push(`/attivita/${activity.id}`)}
                  />
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
