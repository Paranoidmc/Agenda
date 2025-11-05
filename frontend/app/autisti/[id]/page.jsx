"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";

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
  const [activeTab, setActiveTab] = useState("details");

  const handleSaveAutista = async (formData) => {
    if (!canEdit) {
      alert('Non hai i permessi per modificare gli autisti');
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      // Pulisci i dati: invia solo i campi previsti dal database
      const allowedFields = [
        'codice_arca', 'nome', 'cognome', 'telefono', 'email', 'codice_fiscale',
        'data_nascita', 'indirizzo', 'citta', 'cap', 'provincia',
        'patente', 'numero_patente', 'scadenza_patente', 'data_assunzione',
        'tipo_contratto', 'scadenza_contratto', 'note'
      ];
      const cleanedData = {};
      for (const key of allowedFields) {
        if (formData[key] !== undefined && formData[key] !== '') {
          cleanedData[key] = formData[key];
        }
      }
      
      const response = await api.put(`/drivers/${autistaId}`, cleanedData);
      setAutista(response.data);
      setIsEditing(false);
      alert('Autista aggiornato con successo!');
    } catch (err) {
      console.error("Errore durante il salvataggio:", err);
      
      if (err.response) {
        const errorData = err.response.data;
        if (errorData?.errors) {
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

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError("");
  };

  return (
    <div style={{ padding: 32 }}>
      <PageHeader
        title={`Autista: ${autistaName}`}
        buttonLabel="Torna alla lista"
        onAddClick={() => router.push("/autisti")}
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
          Anagrafica
        </div>
        <div
          onClick={() => setActiveTab("patente")}
          style={{
            padding: "10px 20px",
            cursor: "pointer",
            borderBottom: activeTab === "patente" ? "2px solid var(--primary)" : "none",
            fontWeight: activeTab === "patente" ? "bold" : "normal",
            color: activeTab === "patente" ? "var(--primary)" : "inherit",
          }}
        >
          Patente e Lavoro
        </div>
        <div
          onClick={() => setActiveTab("patente_professionale")}
          style={{
            padding: "10px 20px",
            cursor: "pointer",
            borderBottom: activeTab === "patente_professionale" ? "2px solid var(--primary)" : "none",
            fontWeight: activeTab === "patente_professionale" ? "bold" : "normal",
            color: activeTab === "patente_professionale" ? "var(--primary)" : "inherit",
          }}
        >
          Patente Professionale ({profLicenses.length})
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
          Attività ({activities.length})
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
                handleSaveAutista(data);
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {autistaFields.map(field => (
                    <div key={field.name} style={{ marginBottom: 15 }}>
                      <label style={{ display: 'block', marginBottom: 5 }}>
                        {field.label}{field.required && <span style={{ color: 'red' }}>*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          name={field.name}
                          defaultValue={autista[field.name] || ''}
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
                          defaultValue={autista[field.name] || ''}
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
                    <h3>Informazioni Personali</h3>
                    <p><strong>Codice Arca:</strong> {autista.codice_arca || '—'}</p>
                    <p><strong>Nome:</strong> {autista.nome || autista.name || '—'}</p>
                    <p><strong>Cognome:</strong> {autista.cognome || autista.surname || '—'}</p>
                    <p><strong>Telefono:</strong> {autista.telefono || autista.phone || '—'}</p>
                    <p><strong>Email:</strong> {autista.email || '—'}</p>
                    <p><strong>Codice Fiscale:</strong> {autista.codice_fiscale || autista.fiscal_code || '—'}</p>
                    <p><strong>Data di Nascita:</strong> {autista.data_nascita ? new Date(autista.data_nascita).toLocaleDateString('it-IT') : '—'}</p>
                  </div>
                  <div>
                    <h3>Indirizzo</h3>
                    <p><strong>Indirizzo:</strong> {autista.indirizzo || autista.address || '—'}</p>
                    <p><strong>Città:</strong> {autista.citta || autista.city || '—'}</p>
                    <p><strong>CAP:</strong> {autista.cap || autista.postal_code || '—'}</p>
                    <p><strong>Provincia:</strong> {autista.provincia || autista.province || '—'}</p>
                    <p><strong>Note:</strong> {autista.note || autista.notes || '—'}</p>
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
                      onClick={handleDelete}
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

        {activeTab === "patente" && (
          <>
            {isEditing ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                handleSaveAutista(data);
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {patenteFields.map(field => (
                    <div key={field.name} style={{ marginBottom: 15 }}>
                      <label style={{ display: 'block', marginBottom: 5 }}>
                        {field.label}{field.required && <span style={{ color: 'red' }}>*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          name={field.name}
                          defaultValue={autista[field.name] || ''}
                          required={field.required}
                          style={{ 
                            width: '100%', 
                            padding: 8, 
                            borderRadius: 4, 
                            border: '1px solid #ddd' 
                          }}
                        >
                          <option value="">Seleziona...</option>
                          {field.options?.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          name={field.name}
                          defaultValue={autista[field.name] || ''}
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
                          defaultValue={autista[field.name] || ''}
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
                    <h3>Patente</h3>
                    <p><strong>Tipo Patente:</strong> {autista.patente || '—'}</p>
                    <p><strong>Numero Patente:</strong> {autista.numero_patente || autista.license_number || '—'}</p>
                    <p><strong>Scadenza Patente:</strong> {autista.scadenza_patente ? new Date(autista.scadenza_patente).toLocaleDateString('it-IT') : (autista.license_expiry ? new Date(autista.license_expiry).toLocaleDateString('it-IT') : '—')}</p>
                  </div>
                  <div>
                    <h3>Informazioni Lavorative</h3>
                    <p><strong>Data Assunzione:</strong> {autista.data_assunzione ? new Date(autista.data_assunzione).toLocaleDateString('it-IT') : '—'}</p>
                    <p><strong>Tipo Contratto:</strong> {autista.tipo_contratto || '—'}</p>
                    <p><strong>Scadenza Contratto:</strong> {autista.scadenza_contratto ? new Date(autista.scadenza_contratto).toLocaleDateString('it-IT') : '—'}</p>
                    <p><strong>Note Patente:</strong> {autista.note_patente || '—'}</p>
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
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === "patente_professionale" && (
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
                                <input value={lic._edit_tipo ?? lic.tipo ?? ''} onChange={e => setProfLicenses(prev => prev.map(x => x.id === lic.id ? { ...x, _edit_tipo: e.target.value } : x))} style={{ width: '100%', padding: 4, border: '1px solid #ddd', borderRadius: 4 }} />
                              ) : lic.tipo || ''}
                            </td>
                            <td style={{ padding: 8 }}>
                              {editingLicenseId === lic.id ? (
                                <input value={lic._edit_numero ?? lic.numero ?? ''} onChange={e => setProfLicenses(prev => prev.map(x => x.id === lic.id ? { ...x, _edit_numero: e.target.value } : x))} style={{ width: '100%', padding: 4, border: '1px solid #ddd', borderRadius: 4 }} />
                              ) : lic.numero || ''}
                            </td>
                            <td style={{ padding: 8 }}>
                              {editingLicenseId === lic.id ? (
                                <input value={lic._edit_ente_rilascio ?? lic.ente_rilascio ?? ''} onChange={e => setProfLicenses(prev => prev.map(x => x.id === lic.id ? { ...x, _edit_ente_rilascio: e.target.value } : x))} style={{ width: '100%', padding: 4, border: '1px solid #ddd', borderRadius: 4 }} />
                              ) : lic.ente_rilascio || ''}
                            </td>
                            <td style={{ padding: 8 }}>
                              {editingLicenseId === lic.id ? (
                                <input type="date" value={(lic._edit_rilasciata_il ?? (lic.rilasciata_il ? String(lic.rilasciata_il).slice(0,10) : ''))} onChange={e => setProfLicenses(prev => prev.map(x => x.id === lic.id ? { ...x, _edit_rilasciata_il: e.target.value } : x))} style={{ width: '100%', padding: 4, border: '1px solid #ddd', borderRadius: 4 }} />
                              ) : (lic.rilasciata_il ? new Date(lic.rilasciata_il).toLocaleDateString('it-IT') : '')}
                            </td>
                            <td style={{ padding: 8 }}>
                              {editingLicenseId === lic.id ? (
                                <input type="date" value={(lic._edit_scadenza ?? (lic.scadenza ? String(lic.scadenza).slice(0,10) : ''))} onChange={e => setProfLicenses(prev => prev.map(x => x.id === lic.id ? { ...x, _edit_scadenza: e.target.value } : x))} style={{ width: '100%', padding: 4, border: '1px solid #ddd', borderRadius: 4 }} />
                              ) : (lic.scadenza ? new Date(lic.scadenza).toLocaleDateString('it-IT') : '')}
                            </td>
                            <td style={{ padding: 8 }}>
                              {editingLicenseId === lic.id ? (
                                <input value={lic._edit_note ?? lic.note ?? ''} onChange={e => setProfLicenses(prev => prev.map(x => x.id === lic.id ? { ...x, _edit_note: e.target.value } : x))} style={{ width: '100%', padding: 4, border: '1px solid #ddd', borderRadius: 4 }} />
                              ) : (lic.note || '')}
                            </td>
                            {canEdit && (
                              <td style={{ padding: 8, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {editingLicenseId === lic.id ? (
                                  <>
                                    <button onClick={() => setEditingLicenseId(null)} style={{ marginRight: 8, background: '#f3f3f3', color: '#333', borderRadius: 4, padding: '4px 8px', border: 'none', cursor: 'pointer' }}>Annulla</button>
                                    <button onClick={() => handleUpdateLicense(lic.id, {
                                      tipo: lic._edit_tipo ?? lic.tipo ?? '',
                                      numero: lic._edit_numero ?? lic.numero ?? '',
                                      ente_rilascio: lic._edit_ente_rilascio ?? lic.ente_rilascio ?? '',
                                      rilasciata_il: lic._edit_rilasciata_il ?? (lic.rilasciata_il ? String(lic.rilasciata_il).slice(0,10) : null),
                                      scadenza: lic._edit_scadenza ?? (lic.scadenza ? String(lic.scadenza).slice(0,10) : ''),
                                      note: lic._edit_note ?? lic.note ?? ''
                                    })} disabled={savingProf} style={{ background: 'var(--primary)', color: '#fff', borderRadius: 4, padding: '4px 8px', border: 'none', cursor: 'pointer' }}>Salva</button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => setEditingLicenseId(lic.id)} style={{ marginRight: 8, background: 'var(--primary)', color: '#fff', borderRadius: 4, padding: '4px 8px', border: 'none', cursor: 'pointer' }}>Modifica</button>
                                    <button onClick={() => handleDeleteLicense(lic.id)} style={{ background: '#ff3b30', color: '#fff', borderRadius: 4, padding: '4px 8px', border: 'none', cursor: 'pointer' }}>Elimina</button>
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
                      <input placeholder="Tipo" value={newLicense.tipo} onChange={e => setNewLicense({ ...newLicense, tipo: e.target.value })} style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
                      <input placeholder="Numero" value={newLicense.numero} onChange={e => setNewLicense({ ...newLicense, numero: e.target.value })} style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
                      <input placeholder="Ente rilascio" value={newLicense.ente_rilascio} onChange={e => setNewLicense({ ...newLicense, ente_rilascio: e.target.value })} style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
                      <div>
                        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Rilasciata il</label>
                        <input type="date" value={newLicense.rilasciata_il} onChange={e => setNewLicense({ ...newLicense, rilasciata_il: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Scadenza*</label>
                        <input type="date" value={newLicense.scadenza} onChange={e => setNewLicense({ ...newLicense, scadenza: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
                      </div>
                      <input placeholder="Note" value={newLicense.note} onChange={e => setNewLicense({ ...newLicense, note: e.target.value })} style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <button onClick={handleCreateLicense} disabled={savingProf} style={{ background: 'var(--primary)', color: '#fff', borderRadius: 6, padding: '0.6em 1.2em', fontSize: 14, border: 'none', cursor: 'pointer' }}>Salva patente professionale</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "activities" && (
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
                    padding: "0.6em 1.2em",
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
            ) : activities.length === 0 ? (
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
