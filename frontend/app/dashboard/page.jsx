"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [deadlines, setDeadlines] = useState([]);
  const [activities, setActivities] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  
  // Carica i dati quando la pagina viene caricata
  useEffect(() => {
    console.group("[DASHBOARD] Inizializzazione dashboard");
    
    if (loading) {
      console.log("[DASHBOARD] Autenticazione in corso, attesa...");
      console.groupEnd();
      return; // Attendi che l'autenticazione sia verificata
    }
    
    console.log("[DASHBOARD] Stato autenticazione:", { user: !!user, loading });
    
    // Verifica che l'utente sia autenticato
    if (loading) {
      // Attendi che l'autenticazione sia verificata
      return;
    }
    if (!user) {
      console.log("[DASHBOARD] Utente non autenticato, reindirizzamento al login");
      setFetching(false);
      router.replace("/login");
      return;
    }
    // Carica i dati
    console.log("[DASHBOARD] Utente autenticato:", user);
    loadData();
    
    console.groupEnd();
  }, [user, loading, router]);
  
  // Funzione per caricare i dati
  const loadData = async () => {
    console.group("[DASHBOARD] Caricamento dati");
    try {
      console.log("[DASHBOARD] Inizio caricamento dati");
      setFetching(true);
      setError("");
      
      // Ottieni la data corrente e la data tra 30 giorni
      const today = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(today.getDate() + 30);
      
      // Formatta le date in formato ISO (YYYY-MM-DD)
      const startDate = today.toISOString().split('T')[0];
      const endDate = thirtyDaysLater.toISOString().split('T')[0];
      console.log("[DASHBOARD] Intervallo date:", { startDate, endDate });
      
      // Carica i veicoli e poi le scadenze per ogni veicolo
      console.log("[DASHBOARD] Caricamento veicoli...");
      try {
        // Ottieni il token da localStorage se disponibile
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        console.log("[DASHBOARD] Token di autenticazione:", token ? "Presente" : "Non presente");
        
        // Carica tutti i veicoli
        const vehiclesResponse = await api.get('/vehicles', {
          withCredentials: true,
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        console.log("[DASHBOARD] Veicoli caricati:", vehiclesResponse.status);
        console.log("[DASHBOARD] Numero veicoli:", vehiclesResponse.data.length);
        
        // Array per raccogliere tutte le scadenze
        let allDeadlines = [];
        
        // Per ogni veicolo, carica le scadenze
        console.log("[DASHBOARD] Caricamento scadenze per ogni veicolo...");
        for (const vehicle of vehiclesResponse.data) {
          try {
            const vehicleDeadlinesResponse = await api.get(`/vehicles/${vehicle.id}/deadlines`, {
              withCredentials: true,
              headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
              }
            });
            
            console.log(`[DASHBOARD] Scadenze per veicolo ${vehicle.id} caricate:`, vehicleDeadlinesResponse.status);
            console.log(`[DASHBOARD] Numero scadenze per veicolo ${vehicle.id}:`, vehicleDeadlinesResponse.data.length);
            
            // Aggiungi le scadenze di questo veicolo all'array di tutte le scadenze
            if (Array.isArray(vehicleDeadlinesResponse.data)) {
              allDeadlines = [...allDeadlines, ...vehicleDeadlinesResponse.data];
            }
          } catch (vehicleDeadlinesError) {
            console.error(`[DASHBOARD] Errore nel caricamento delle scadenze per il veicolo ${vehicle.id}:`, vehicleDeadlinesError);
          }
        }
        
        console.log("[DASHBOARD] Tutte le scadenze caricate:", allDeadlines.length);
        
        // Filtra le scadenze per il periodo specificato
        const filteredDeadlines = allDeadlines.filter(deadline => {
          const deadlineDate = new Date(deadline.data_scadenza || deadline.expiry_date);
          const endDateObj = new Date(endDate);
          return deadlineDate <= endDateObj;
        });
        
        console.log("[DASHBOARD] Scadenze filtrate per periodo:", filteredDeadlines.length);
        
        // Ordina le scadenze per data
        const sortedDeadlines = filteredDeadlines.sort((a, b) => {
          const dateA = new Date(a.data_scadenza || a.expiry_date);
          const dateB = new Date(b.data_scadenza || b.expiry_date);
          return dateA - dateB;
        });
        
        setDeadlines(sortedDeadlines);
      } catch (deadlinesError) {
        console.error("[DASHBOARD] Errore nel caricamento delle scadenze:", deadlinesError);
        if (deadlinesError.response && deadlinesError.response.status === 401) {
          setError("Sessione scaduta. Effettua nuovamente il login.");
        } else {
          setError("Errore nel caricamento delle scadenze. " + (deadlinesError.response?.data?.message || deadlinesError.message));
        }
        setFetching(false);
        console.groupEnd();
        return;
      }
      
      // Carica i tipi di attività prima delle attività
      console.log("[DASHBOARD] Caricamento tipi di attività...");
      let activityTypes = [];
      try {
        const activityTypesResponse = await api.get('/activity-types', {
          withCredentials: true,
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        console.log("[DASHBOARD] Tipi di attività caricati:", activityTypesResponse.status);
        console.log("[DASHBOARD] Numero tipi di attività:", activityTypesResponse.data.length);
        
        activityTypes = activityTypesResponse.data;
      } catch (typesError) {
        console.error("[DASHBOARD] Errore nel caricamento dei tipi di attività:", typesError);
        // Continuiamo comunque con il caricamento delle attività
      }
      
      // Carica le attività recenti
      console.log("[DASHBOARD] Caricamento attività recenti...");
      try {
        // Ottieni il token da localStorage se disponibile
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        const activitiesResponse = await api.get(`/activities?start_date=${startDate}&end_date=${endDate}`, {
          withCredentials: true,
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        console.log("[DASHBOARD] Attività caricate:", activitiesResponse.status);
        console.log("[DASHBOARD] Numero attività:", activitiesResponse.data.length);
        
        // Ordina le attività per data
        // Controllo robusto per array paginato o array diretto
        let activitiesArr = [];
        if (Array.isArray(activitiesResponse.data.data)) {
          activitiesArr = activitiesResponse.data.data;
        } else if (Array.isArray(activitiesResponse.data)) {
          activitiesArr = activitiesResponse.data;
        } else {
          activitiesArr = [];
        }
        const sortedActivities = activitiesArr.sort((a, b) => {
          return new Date(a.data_inizio) - new Date(b.data_inizio);
        });
        
        // Ricostruisci activityType se mancante
        console.log("[DASHBOARD] Elaborazione dati attività...");
        const activitiesWithType = sortedActivities.map(activity => {
          if (!activity.activityType && activity.activity_type_id) {
            const tipo = activityTypes.find(t => t.id === activity.activity_type_id);
            if (tipo) {
              activity.activityType = {
                id: tipo.id,
                nome: tipo.nome || tipo.name,
                color: tipo.color || tipo.colore,
              };
            }
          }
          return activity;
        });
        
        // Prendi solo le prime 5 attività
        setActivities(activitiesWithType.slice(0, 5));
        console.log("[DASHBOARD] Attività elaborate e salvate nello stato");
      } catch (activitiesError) {
        console.error("[DASHBOARD] Errore nel caricamento delle attività:", activitiesError);
        if (activitiesError.response && activitiesError.response.status === 401) {
          setError("Sessione scaduta. Effettua nuovamente il login.");
        } else {
          setError("Errore nel caricamento delle attività. " + (activitiesError.response?.data?.message || activitiesError.message));
        }
      }
      
      console.log("[DASHBOARD] Caricamento dati completato con successo");
    } catch (err) {
      console.error("[DASHBOARD] Errore generale nel caricamento dei dati:", err);
      if (err.response && err.response.status === 401) {
        setError("Sessione scaduta. Effettua nuovamente il login.");
      } else {
        setError("Si è verificato un errore durante il caricamento dei dati. Riprova più tardi.");
      }
    } finally {
      setFetching(false);
      console.log("[DASHBOARD] Stato fetching impostato a:", false);
      console.groupEnd();
    }
  };
  
  // Funzione per formattare la data
  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('it-IT', options);
  };
  
  // Funzione per ottenere il colore della scadenza in base alla vicinanza
  const getDeadlineColor = (deadline) => {
    const deadlineDate = new Date(deadline.data_scadenza);
    const today = new Date();
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return '#ff3b30'; // Rosso per scadenze passate
    } else if (diffDays <= 7) {
      return '#ff9500'; // Arancione per scadenze entro 7 giorni
    } else if (diffDays <= 15) {
      return '#ffcc00'; // Giallo per scadenze entro 15 giorni
    } else {
      return '#34c759'; // Verde per scadenze oltre 15 giorni
    }
  };
  
  // Funzione per ottenere il colore dell'attività in base al tipo
  const getActivityColor = (activity) => {
    if (activity.activityType && activity.activityType.color) {
      return activity.activityType.color;
    } else if (activity.activityType && activity.activityType.colore) {
      return activity.activityType.colore;
    }
    return '#007aff'; // Blu predefinito
  };
  
  if (loading || fetching) {
    return (
      <div className="centered">
        <div className="card">
          <h2>Caricamento...</h2>
          <p>Attendere il caricamento dei dati</p>
          <div className="loader"></div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return null; // Non mostrare nulla se l'utente non è autenticato
  }
  
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Dashboard</h1>
        <button 
          onClick={logout} 
          style={{ 
            background: '#eee', 
            color: '#1a1a1a', 
            fontWeight: 600, 
            borderRadius: 8, 
            padding: '0.5em 1em', 
            boxShadow: 'none' 
          }}
        >
          Logout
        </button>
      </div>
      
      <p style={{ marginBottom: '24px', color: '#666' }}>
        Benvenuto, <b>{user.nome || user.email}</b>! Ecco il riepilogo delle scadenze e delle attività recenti.
      </p>
      
      {error && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#ffeeee', 
          border: '1px solid #ffcccc', 
          borderRadius: '8px', 
          color: '#cc0000', 
          marginBottom: '24px' 
        }}>
          {error}
          <br />
          <button onClick={loadData} style={{marginTop: 12, padding: '8px 16px', borderRadius: 6, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer'}}>Riprova</button>
        </div>
      )}
      
      <div style={{margin: '18px 0 12px 0'}}>
        <input
          type="text"
          placeholder="Cerca attività per descrizione o tipo..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{padding: 8, borderRadius: 6, border: '1px solid #ccc', width: 300}}
        />
      </div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '24px', 
        marginBottom: '24px' 
      }}>
        {/* Statistiche */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '16px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
          textAlign: 'center' 
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Scadenze Imminenti</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff9500' }}>
            {deadlines.filter(d => {
              const deadlineDate = new Date(d.data_scadenza);
              const today = new Date();
              const diffTime = deadlineDate - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= 7 && diffDays >= 0;
            }).length}
          </p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>nei prossimi 7 giorni</p>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '16px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
          textAlign: 'center' 
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Scadenze</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff3b30' }}>
            {deadlines.filter(d => {
              const deadlineDate = new Date(d.data_scadenza);
              const today = new Date();
              return deadlineDate < today;
            }).length}
          </p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>da rinnovare immediatamente</p>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '16px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
          textAlign: 'center' 
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Totale Scadenze</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#007aff' }}>{deadlines.length}</p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>nei prossimi 30 giorni</p>
        </div>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', 
        gap: '24px' 
      }}>
        {/* Sezione scadenze */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '16px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Scadenze Veicoli</h2>
          
          {deadlines.length === 0 ? (
            <p style={{ color: '#666' }}>Nessuna scadenza nei prossimi 30 giorni.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f7' }}>
                    <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Veicolo</th>
                    <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Tipo</th>
                    <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Scadenza</th>
                  </tr>
                </thead>
                <tbody>
                  {deadlines.map((deadline) => (
                    <tr 
                      key={deadline.id} 
                      style={{ 
                        borderBottom: '1px solid #ddd', 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onClick={() => router.push(`/scadenze/${deadline.id}`)}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f7'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '8px 16px' }}>{deadline.vehicle?.targa || 'N/D'}</td>
                      <td style={{ padding: '8px 16px' }}>{deadline.tipo}</td>
                      <td style={{ padding: '8px 16px' }}>
                        <span 
                          style={{ 
                            display: 'inline-block', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            backgroundColor: getDeadlineColor(deadline),
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}
                        >
                          {formatDate(deadline.data_scadenza)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Sezione attività recenti */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '16px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Attività Recenti</h2>
          {activities.length === 0 ? (
            <p style={{ color: '#888' }}>Nessuna attività recente trovata.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {activities.filter(activity => {
                const testo = (activity.descrizione || "") + " " + (activity.activityType?.nome || activity.activityType?.name || "");
                return testo.toLowerCase().includes(searchText.toLowerCase());
              }).map((activity, idx) => (
                <li key={activity.id || idx} style={{ 
                  marginBottom: '12px', 
                  padding: '8px', 
                  borderRadius: '6px', 
                  background: '#f8fafc', 
                  borderLeft: `6px solid ${getActivityColor(activity)}` 
                }}>
                  <div style={{ fontWeight: 600, color: '#222' }}>{activity.descrizione || activity.titolo || 'Attività senza descrizione'}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    {formatDate(activity.data_inizio)} - {activity.activityType?.nome || activity.activityType?.name || 'Tipo sconosciuto'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
