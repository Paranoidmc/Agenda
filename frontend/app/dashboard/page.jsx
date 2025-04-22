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
  
  // Carica i dati quando la pagina viene caricata
  useEffect(() => {
    if (loading) return; // Attendi che l'autenticazione sia verificata
    
    if (user) {
      loadData();
    } else {
      setFetching(false);
      router.replace("/login");
    }
  }, [user, loading, router]);
  
  // Funzione per caricare i dati
  const loadData = async () => {
    try {
      setFetching(true);
      setError("");
      
      // Ottieni la data corrente e la data tra 30 giorni
      const today = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(today.getDate() + 30);
      
      // Formatta le date in formato ISO (YYYY-MM-DD)
      const startDate = today.toISOString().split('T')[0];
      const endDate = thirtyDaysLater.toISOString().split('T')[0];
      
      // Carica le scadenze dei veicoli
      const deadlinesResponse = await api.get(`/vehicle-deadlines?start_date=${startDate}&end_date=${endDate}`);
      
      // Ordina le scadenze per data
      const sortedDeadlines = deadlinesResponse.data.sort((a, b) => {
        return new Date(a.data_scadenza) - new Date(b.data_scadenza);
      });
      
      setDeadlines(sortedDeadlines);
      
      // Carica i tipi di attività prima delle attività
      const activityTypesResponse = await api.get('/activity-types');
      const activityTypes = activityTypesResponse.data;
      // Carica le attività recenti
      const activitiesResponse = await api.get(`/activities?start_date=${startDate}&end_date=${endDate}`);
      // Ordina le attività per data
      const sortedActivities = activitiesResponse.data.sort((a, b) => {
        return new Date(a.data_inizio) - new Date(b.data_inizio);
      });
      // Ricostruisci activityType se mancante
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
      setActivities(activitiesWithType.slice(0, 5)); // Prendi solo le prime 5 attività
    } catch (err) {
      console.error("Errore nel caricamento dei dati:", err);
      setError("Si è verificato un errore durante il caricamento dei dati. Riprova più tardi.");
    } finally {
      setFetching(false);
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
        </div>
      )}
      
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
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Scadenze Scadute</h3>
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
            <p style={{ color: '#666' }}>Nessuna attività recente.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f7' }}>
                    <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Cantiere</th>
                    <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Data</th>
                    <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <tr 
                      key={activity.id} 
                      style={{ 
                        borderBottom: '1px solid #ddd', 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onClick={() => router.push(`/attivita/${activity.id}`)}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f7'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '8px 16px' }}>{activity.site?.nome || activity.site?.name || 'N/D'}</td>
                      <td style={{ padding: '8px 16px' }}>{formatDate(activity.data_inizio)}</td>
                      <td style={{ padding: '8px 16px' }}>
                        <span 
                          style={{ 
                            display: 'inline-block', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            backgroundColor: getActivityColor(activity),
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}
                        >
                          {activity.activityType?.nome || activity.activityType?.name || 'N/D'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
