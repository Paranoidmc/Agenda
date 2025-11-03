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
  // Patenti professionali
  const [profLicenses, setProfLicenses] = useState([]);
  const [loadingProf, setLoadingProf] = useState(false);
  const [savingProf, setSavingProf] = useState(false);
  const [editingLicenseId, setEditingLicenseId] = useState(null);
  const [newLicense, setNewLicense] = useState({ tipo: '', numero: '', ente_rilascio: '', rilasciata_il: '', scadenza: '', note: '' });

  const canEdit = user?.role === "admin";
  const autistaId = params?.id;

  // Campi del form autista - informazioni personali
  const autistaFields = [
    { name: "codice_arca", label: "Codice Arca" },
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

  const loadProfessionalLicenses = async () => {
    if (!autistaId) return;
    setLoadingProf(true);
    try {
      const { data } = await api.get(`/drivers/${autistaId}/professional-licenses`);
      const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setProfLicenses(items);
    } catch (e) {
      console.error('Errore nel caricamento patenti professionali:', e);
      setProfLicenses([]);
    } finally {
      setLoadingProf(false);
    }
  };

  useEffect(() => {
    if (autistaId) {
      loadProfessionalLicenses();
    }
  }, [autistaId]);

  const resetNewLicense = () => setNewLicense({ tipo: '', numero: '', ente_rilascio: '', rilasciata_il: '', scadenza: '', note: '' });

  const handleCreateLicense = async () => {
    if (!newLicense.tipo || !newLicense.scadenza) {
      alert('Compila almeno Tipo e Scadenza');
      return;
    }
    setSavingProf(true);
    try {
      await api.post(`/drivers/${autistaId}/professional-licenses`, newLicense);
      resetNewLicense();
      await loadProfessionalLicenses();
      alert('Patente professionale aggiunta');
    } catch (e) {
      console.error('Errore creazione patente professionale:', e);
      alert('Errore durante il salvataggio della patente professionale');
    } finally {
      setSavingProf(false);
    }
  };

  const handleUpdateLicense = async (licenseId, updates) => {
    setSavingProf(true);
    try {
      await api.put(`/drivers/${autistaId}/professional-licenses/${licenseId}`, updates);
      setEditingLicenseId(null);
      await loadProfessionalLicenses();
      alert('Patente professionale aggiornata');
    } catch (e) {
      console.error('Errore aggiornamento patente professionale:', e);
      alert('Errore durante l\'aggiornamento');
    } finally {
      setSavingProf(false);
    }
  };

  const handleDeleteLicense = async (licenseId) => {
    if (!confirm('Eliminare questa patente professionale?')) return;
    setSavingProf(true);
    try {
      await api.delete(`/drivers/${autistaId}/professional-licenses/${licenseId}`);
      await loadProfessionalLicenses();
    } catch (e) {
      console.error('Errore eliminazione patente professionale:', e);
      alert('Errore durante l\'eliminazione');
    } finally {
      setSavingProf(false);
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
            id: 'patente_professionale',
            label: 'Patente Professionale',
            count: profLicenses.length,
            content: (
              <div>
                {loadingProf ? (
                  <div>Caricamento...</div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {/* Lista patenti professionali esistenti */}
                    {profLicenses.length === 0 ? (
                      <div style={{ color: '#666' }}>Nessuna patente professionale registrata</div>
                    ) : (
                      <div style={{ border: '1px solid #e5e5ea', borderRadius: 8 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f8f9fa' }}>
                              <th style={{ textAlign: 'left', padding: 8 }}>Tipo</th>
                              <th style={{ textAlign: 'left', padding: 8 }}>Numero</th>
                              <th style={{ textAlign: 'left', padding: 8 }}>Ente rilascio</th>
                              <th style={{ textAlign: 'left', padding: 8 }}>Rilasciata il</th>
                              <th style={{ textAlign: 'left', padding: 8 }}>Scadenza</th>
                              <th style={{ textAlign: 'left', padding: 8 }}>Note</th>
                              {canEdit && <th style={{ textAlign: 'right', padding: 8 }}>Azioni</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {profLicenses.map(lic => (
                              <tr key={lic.id} style={{ borderTop: '1px solid #eee' }}>
                                <td style={{ padding: 8 }}>
                                  {editingLicenseId === lic.id ? (
                                    <input value={lic._edit_tipo ?? lic.tipo ?? ''} onChange={e => setProfLicenses(prev => prev.map(x => x.id === lic.id ? { ...x, _edit_tipo: e.target.value } : x))} />
                                  ) : lic.tipo || ''}
                                </td>
                                <td style={{ padding: 8 }}>
                                  {editingLicenseId === lic.id ? (
                                    <input value={lic._edit_numero ?? lic.numero ?? ''} onChange={e => setProfLicenses(prev => prev.map(x => x.id === lic.id ? { ...x, _edit_numero: e.target.value } : x))} />
                                  ) : lic.numero || ''}
                                </td>
                                <td style={{ padding: 8 }}>
                                  {editingLicenseId === lic.id ? (
                                    <input value={lic._edit_ente_rilascio ?? lic.ente_rilascio ?? ''} onChange={e => setProfLicenses(prev => prev.map(x => x.id === lic.id ? { ...x, _edit_ente_rilascio: e.target.value } : x))} />
                                  ) : lic.ente_rilascio || ''}
                                </td>
                                <td style={{ padding: 8 }}>
                                  {editingLicenseId === lic.id ? (
                                    <input type="date" value={(lic._edit_rilasciata_il ?? (lic.rilasciata_il ? String(lic.rilasciata_il).slice(0,10) : ''))} onChange={e => setProfLicenses(prev => prev.map(x => x.id === lic.id ? { ...x, _edit_rilasciata_il: e.target.value } : x))} />
                                  ) : (lic.rilasciata_il ? new Date(lic.rilasciata_il).toLocaleDateString('it-IT') : '')}
                                </td>
                                <td style={{ padding: 8 }}>
                                  {editingLicenseId === lic.id ? (
                                    <input type="date" value={(lic._edit_scadenza ?? (lic.scadenza ? String(lic.scadenza).slice(0,10) : ''))} onChange={e => setProfLicenses(prev => prev.map(x => x.id === lic.id ? { ...x, _edit_scadenza: e.target.value } : x))} />
                                  ) : (lic.scadenza ? new Date(lic.scadenza).toLocaleDateString('it-IT') : '')}
                                </td>
                                <td style={{ padding: 8 }}>
                                  {editingLicenseId === lic.id ? (
                                    <input value={lic._edit_note ?? lic.note ?? ''} onChange={e => setProfLicenses(prev => prev.map(x => x.id === lic.id ? { ...x, _edit_note: e.target.value } : x))} />
                                  ) : (lic.note || '')}
                                </td>
                                {canEdit && (
                                  <td style={{ padding: 8, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    {editingLicenseId === lic.id ? (
                                      <>
                                        <button onClick={() => setEditingLicenseId(null)} style={{ marginRight: 8 }}>Annulla</button>
                                        <button onClick={() => handleUpdateLicense(lic.id, {
                                          tipo: lic._edit_tipo ?? lic.tipo ?? '',
                                          numero: lic._edit_numero ?? lic.numero ?? '',
                                          ente_rilascio: lic._edit_ente_rilascio ?? lic.ente_rilascio ?? '',
                                          rilasciata_il: lic._edit_rilasciata_il ?? (lic.rilasciata_il ? String(lic.rilasciata_il).slice(0,10) : null),
                                          scadenza: lic._edit_scadenza ?? (lic.scadenza ? String(lic.scadenza).slice(0,10) : ''),
                                          note: lic._edit_note ?? lic.note ?? ''
                                        })} disabled={savingProf}>Salva</button>
                                      </>
                                    ) : (
                                      <>
                                        <button onClick={() => setEditingLicenseId(lic.id)} style={{ marginRight: 8 }}>Modifica</button>
                                        <button onClick={() => handleDeleteLicense(lic.id)} style={{ background: '#dc3545', color: '#fff' }}>Elimina</button>
                                      </>
                                    )}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {canEdit && (
                      <div style={{ marginTop: 12, borderTop: '1px dashed #e5e5ea', paddingTop: 12 }}>
                        <h4 style={{ margin: '8px 0' }}>Aggiungi patente professionale</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                          <input placeholder="Tipo" value={newLicense.tipo} onChange={e => setNewLicense({ ...newLicense, tipo: e.target.value })} />
                          <input placeholder="Numero" value={newLicense.numero} onChange={e => setNewLicense({ ...newLicense, numero: e.target.value })} />
                          <input placeholder="Ente rilascio" value={newLicense.ente_rilascio} onChange={e => setNewLicense({ ...newLicense, ente_rilascio: e.target.value })} />
                          <div>
                            <label style={{ fontSize: 12, color: '#666' }}>Rilasciata il</label>
                            <input type="date" value={newLicense.rilasciata_il} onChange={e => setNewLicense({ ...newLicense, rilasciata_il: e.target.value })} />
                          </div>
                          <div>
                            <label style={{ fontSize: 12, color: '#666' }}>Scadenza*</label>
                            <input type="date" value={newLicense.scadenza} onChange={e => setNewLicense({ ...newLicense, scadenza: e.target.value })} />
                          </div>
                          <input placeholder="Note" value={newLicense.note} onChange={e => setNewLicense({ ...newLicense, note: e.target.value })} />
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <button onClick={handleCreateLicense} disabled={savingProf}>Salva patente professionale</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
