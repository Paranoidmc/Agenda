"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";

export default function SedeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sede, setSede] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState("details");
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clienti, setClienti] = useState([]);

  // Campi del form sede
  const sedeFields = [
    { name: 'nome', label: 'Nome', required: true },
    { name: 'indirizzo', label: 'Indirizzo', required: true },
    { name: 'citta', label: 'Città', required: true },
    { name: 'cap', label: 'CAP' },
    { name: 'provincia', label: 'Provincia' },
    { name: 'telefono', label: 'Telefono' },
    { name: 'email', label: 'Email' },
    { name: 'client_id', label: 'Cliente', type: 'select', options: 
      (Array.isArray(clienti?.data) ? clienti.data : (Array.isArray(clienti) ? clienti : [])).map(cliente => ({ value: cliente.id, label: cliente.nome }))
    },
    { name: 'note', label: 'Note', type: 'textarea' }
  ];

  useEffect(() => {
    if (!loading && user) {
      loadSede();
      loadClienti();
    } else if (!loading && !user) {
      setFetching(false);
    }
  }, [user, loading, id]);

  const loadSede = async () => {
    setFetching(true);
    try {
      const response = await api.get(`/sites/${id}`);
      setSede(response.data);
      
      // Carica le attività della sede
      loadActivities();
    } catch (err) {
      console.error("Errore nel caricamento della sede:", err);
      if (err.response && err.response.status === 401) {
        setError("Sessione scaduta. Effettua nuovamente il login.");
      } else if (err.response && err.response.status === 404) {
        setError("Sede non trovata");
      } else {
        setError("Errore nel caricamento della sede");
      }
    } finally {
      setFetching(false);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await api.get(`/sites/${id}/activities`);
      setActivities(response.data);
    } catch (err) {
      console.error("Errore nel caricamento delle attività:", err);
    }
  };

  const loadClienti = async () => {
    try {
      const response = await api.get("/clients", { params: { perPage: 20000 } });
      setClienti(response.data);
    } catch (err) {
      console.error("Errore nel caricamento dei clienti:", err);
    }
  };

  const handleSaveSede = async (formData) => {
    setIsSaving(true);
    try {
      // Assicuriamoci che client_id sia un numero se presente
      if (formData.client_id) {
        formData.client_id = Number(formData.client_id);
      }
      
      const response = await api.put(`/sites/${id}`, formData);
      setSede(response.data);
      setIsEditing(false);
    } catch (err) {
      console.error("Errore durante il salvataggio:", err);
      
      if (err.response) {
        const errorMessage = err.response.data?.message || "Si è verificato un errore durante il salvataggio. Riprova più tardi.";
        alert(errorMessage);
      } else if (err.request) {
        alert("Nessuna risposta dal server. Verifica la connessione di rete.");
      } else {
        alert("Si è verificato un errore durante il salvataggio. Riprova più tardi.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSede = async () => {
    if (!confirm("Sei sicuro di voler eliminare questa sede?")) return;
    
    try {
      await api.delete(`/sites/${id}`);
      router.push("/sedi");
    } catch (err) {
      console.error("Errore durante l'eliminazione:", err);
      alert("Si è verificato un errore durante l'eliminazione. Riprova più tardi.");
    }
  };

  const handleBackToList = () => {
    router.push("/sedi");
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;
  if (!sede) return <div className="centered">Sede non trovata</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title={`Cantiere: ${sede.nome}`} 
        buttonLabel="Torna alla lista" 
        onAddClick={handleBackToList} 
      />
      
      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #eee', 
        marginBottom: 20 
      }}>
        <div 
          onClick={() => setActiveTab("details")}
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer',
            borderBottom: activeTab === "details" ? '2px solid var(--primary)' : 'none',
            fontWeight: activeTab === "details" ? 'bold' : 'normal',
            color: activeTab === "details" ? 'var(--primary)' : 'inherit'
          }}
        >
          Dettagli Cantiere
        </div>
        <div 
          onClick={() => setActiveTab("activities")}
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer',
            borderBottom: activeTab === "activities" ? '2px solid var(--primary)' : 'none',
            fontWeight: activeTab === "activities" ? 'bold' : 'normal',
            color: activeTab === "activities" ? 'var(--primary)' : 'inherit'
          }}
        >
          Attività ({activities.length})
        </div>
      </div>
      
      {/* Contenuto del tab */}
      <div style={{ 
        background: '#fff', 
        borderRadius: 14, 
        boxShadow: 'var(--box-shadow)', 
        padding: 24
      }}>
        {activeTab === "details" && (
          <div>
            {isEditing ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                handleSaveSede({...sede, ...data});
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {sedeFields.map(field => (
                    <div key={field.name} style={{ marginBottom: 15 }}>
                      <label style={{ display: 'block', marginBottom: 5 }}>
                        {field.label}{field.required && <span style={{ color: 'red' }}>*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          name={field.name}
                          defaultValue={sede[field.name]}
                          required={field.required}
                          style={{ 
                            width: '100%', 
                            padding: 8, 
                            borderRadius: 4, 
                            border: '1px solid #ddd',
                            minHeight: 100
                          }}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          name={field.name}
                          defaultValue={sede[field.name]}
                          required={field.required}
                          style={{ 
                            width: '100%', 
                            padding: 8, 
                            borderRadius: 4, 
                            border: '1px solid #ddd' 
                          }}
                        >
                          <option value="">Seleziona...</option>
                          {clienti.map(cliente => (
                            <option key={cliente.id} value={cliente.id}>
                              {cliente.nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name={field.name}
                          defaultValue={sede[field.name]}
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
                      cursor: 'pointer'
                    }}
                  >
                    {isSaving ? 'Salvataggio...' : 'Salva'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{ 
                      background: '#f3f3f3', 
                      color: '#333', 
                      borderRadius: 6, 
                      padding: '0.6em 1.2em', 
                      fontSize: 14,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Annulla
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <h3>Informazioni Cantiere</h3>
                    <p><strong>Nome:</strong> {sede.nome}</p>
                    <p><strong>Indirizzo:</strong> {sede.indirizzo}</p>
                    <p><strong>Città:</strong> {sede.citta}</p>
                    <p><strong>CAP:</strong> {sede.cap}</p>
                    <p><strong>Provincia:</strong> {sede.provincia}</p>
                  </div>
                  <div>
                    <h3>Contatti</h3>
                    <p><strong>Telefono:</strong> {sede.telefono}</p>
                    <p><strong>Email:</strong> {sede.email}</p>
                    <p><strong>Cliente:</strong> {sede.client?.nome}</p>
                    <p><strong>Note:</strong> {sede.note}</p>
                  </div>
                </div>
                
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
                    onClick={handleDeleteSede}
                    style={{ 
                      background: '#ff3b30', 
                      color: '#fff', 
                      borderRadius: 6, 
                      padding: '0.6em 1.2em', 
                      fontSize: 14,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Elimina
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === "activities" && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3>Attività del Cantiere</h3>
              <button
                onClick={() => router.push(`/attivita/new?site_id=${id}`)}
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
                Nuova Attività
              </button>
            </div>
            
            {activities.length === 0 ? (
              <div>Nessuna attività trovata per questo cantiere.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>Data</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Fascia Oraria</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Autista</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Veicolo</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Tipo</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Stato</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map(activity => (
                    <tr key={activity.id} style={{ borderBottom: '1px solid #f3f3f3' }}>
                      <td style={{ padding: 8 }}>
                        {new Date(activity.data_inizio).toLocaleDateString('it-IT')}
                      </td>
                      <td style={{ padding: 8 }}>
                        {activity.time_slot === 'morning' ? 'Mattina' : 
                         activity.time_slot === 'afternoon' ? 'Pomeriggio' : 
                         activity.time_slot === 'full_day' ? 'Giornata Intera' : 
                         activity.time_slot}
                      </td>
                      <td style={{ padding: 8 }}>{activity.driver?.nome} {activity.driver?.cognome}</td>
                      <td style={{ padding: 8 }}>{activity.vehicle?.targa}</td>
                      <td style={{ padding: 8 }}>{activity.activityType?.nome}</td>
                      <td style={{ padding: 8 }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          backgroundColor: 
                            activity.stato === 'planned' ? '#007aff' : 
                            activity.stato === 'in_progress' ? '#ff9500' :
                            activity.stato === 'completed' ? '#4cd964' :
                            activity.stato === 'cancelled' ? '#ff3b30' : '#8e8e93',
                          color: '#fff'
                        }}>
                          {activity.stato === 'planned' ? 'Pianificata' : 
                           activity.stato === 'in_progress' ? 'In Corso' :
                           activity.stato === 'completed' ? 'Completata' :
                           activity.stato === 'cancelled' ? 'Annullata' : 
                           activity.stato}
                        </span>
                      </td>
                      <td style={{ padding: 8 }}>
                        <button 
                          onClick={() => router.push(`/attivita/${activity.id}`)}
                          style={{ 
                            background: 'var(--primary)', 
                            color: '#fff', 
                            borderRadius: 6, 
                            padding: '0.4em 1em', 
                            fontSize: 14,
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Dettagli
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}