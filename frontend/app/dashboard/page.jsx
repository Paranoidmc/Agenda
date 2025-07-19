"use client";
import React, { useEffect, useState, forwardRef } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { it } from 'date-fns/locale';

// Componente CustomDateInput per DatePicker
const CustomDateInput = forwardRef(({ value, onClick, onChange, placeholder }, ref) => (
  <button 
    className="custom-date-input-button" // Puoi aggiungere stili CSS specifici qui
    onClick={onClick} 
    ref={ref}
    style={{
      padding: '8px 12px',
      fontSize: '14px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      backgroundColor: 'white',
      cursor: 'pointer',
      minWidth: '240px', // Adatta la larghezza se necessario
      textAlign: 'left'
    }}
  >
    {value || placeholder || "Seleziona intervallo date"} 
  </button>
));
CustomDateInput.displayName = 'CustomDateInput';


export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [deadlines, setDeadlines] = useState({ paid: [], unpaid: [] });
  const [activities, setActivities] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [currentDateRange, setCurrentDateRange] = useState(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29); // Copre 30 giorni incluso oggi
    return { startDate, endDate };
  });
  
  const [activityTypes, setActivityTypes] = useState([]);
  // Carica i dati quando la pagina viene caricata
  useEffect(() => {
    console.group("[DASHBOARD] Inizializzazione dashboard");
    
    if (loading) {
      console.groupEnd();
      return; // Attendi che l'autenticazione sia verificata
    }
    
    
    // Verifica che l'utente sia autenticato
    if (loading) {
      // Attendi che l'autenticazione sia verificata
      return;
    }
    if (!user) {
      setFetching(false);
      router.replace("/login");
      return;
    }
    // Carica i dati
    loadData();
    
    console.groupEnd();
  }, [user, loading, router]);
  
  const handleDateChange = (dates) => {
    const [start, end] = dates;
    // Aggiorna lo stato solo se entrambe le date sono presenti
    // o se entrambe sono null (se il DatePicker permette la deselezione completa)
    if ((start && end) || (!start && !end)) {
      setCurrentDateRange({ startDate: start, endDate: end });
      // Se l'utente ha selezionato un range valido, ricarica i dati
      if (start && end) {
        loadData(); // Assumendo che loadData usi lo stato aggiornato
      }
    } else {
      // Caso intermedio: l'utente ha selezionato solo la data di inizio
      // Aggiorniamo solo lo stato, senza ricaricare i dati finché il range non è completo
      setCurrentDateRange(prevRange => ({ ...prevRange, startDate: start, endDate: null }));
    }
  };

  // Funzione per caricare i dati
  const loadData = async () => {
    console.group("[DASHBOARD] Caricamento dati");
    try {
      setFetching(true);
      setError("");

      // Utilizza le date da currentDateRange (stato)
      let effectiveStartDate;
      let effectiveEndDate;

      if (currentDateRange && currentDateRange.startDate && currentDateRange.endDate) {
        effectiveStartDate = new Date(currentDateRange.startDate).toISOString().split('T')[0];
        effectiveEndDate = new Date(currentDateRange.endDate).toISOString().split('T')[0];
      } else {
        // Fallback se currentDateRange non è completamente definito
        console.warn("[DASHBOARD] currentDateRange non definito o incompleto, usando default 30 giorni da oggi.");
        const today = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(today.getDate() + 30);
        effectiveStartDate = today.toISOString().split('T')[0];
        effectiveEndDate = thirtyDaysLater.toISOString().split('T')[0];
      }
      
      
      // Carica i veicoli e poi le scadenze per ogni veicolo
      try {
        // Ottieni il token da localStorage se disponibile
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        // Carica tutti i veicoli
        const vehiclesResponse = await api.get('/vehicles', {
          withCredentials: true,
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        
        // Array per raccogliere tutte le scadenze
        
        
        // Per ogni veicolo, carica le scadenze
        // Carica tutte le scadenze in un'unica chiamata ottimizzata
        const deadlinesResponse = await api.get('/vehicle-deadlines/all', {
          withCredentials: true,
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          params: {
            start_date: effectiveStartDate,
            end_date: effectiveEndDate
          }
        });
        let allDeadlines = deadlinesResponse.data || [];
if (allDeadlines.length > 0) {
}
        
        
        // Filtra le scadenze per il periodo specificato
        const { paidDeadlines, unpaidDeadlines } = allDeadlines.reduce((acc, deadline) => {
          const dateStringToParse = deadline.expiry_date || deadline.data_scadenza;
          if (!dateStringToParse) return acc;

          try {
            const deadlineDateString = dateStringToParse.substring(0, 10);
            const isInDateRange = deadlineDateString >= effectiveStartDate && deadlineDateString <= effectiveEndDate;

            if (isInDateRange) {
              if (deadline.pagato === 1 || deadline.pagato === true) {
                acc.paidDeadlines.push(deadline);
              } else {
                acc.unpaidDeadlines.push(deadline);
              }
            }
          } catch (error) {
            console.error('[DASHBOARD] Errore nell\'elaborazione della scadenza:', error, deadline);
          }
          return acc;
        }, { paidDeadlines: [], unpaidDeadlines: [] });

        const sortByDate = (a, b) => {
          const dateA = new Date(a.expiry_date || a.data_scadenza);
          const dateB = new Date(b.expiry_date || b.data_scadenza);
          return dateA - dateB;
        };

        paidDeadlines.sort(sortByDate);
        unpaidDeadlines.sort(sortByDate);

        setDeadlines({ paid: paidDeadlines, unpaid: unpaidDeadlines });

      } catch (deadlinesError) {
        console.error("[DASHBOARD] Errore nel caricamento delle scadenze:", deadlinesError);
        setError("Errore nel caricamento delle scadenze.");
      }

      try {
        const activitiesResponse = await api.get('/activities', {
          params: {
            start_date: effectiveStartDate,
            end_date: effectiveEndDate,
            per_page: 5,
            sort: 'data_inizio',
            order: 'desc'
          }
        });
        setActivities(activitiesResponse.data.data || []);
      } catch (activitiesError) {
        console.error("[DASHBOARD] Errore nel caricamento delle attività:", activitiesError);
        setError("Errore nel caricamento delle attività.");
      }

    } catch (err) {
      console.error("[DASHBOARD] Errore generale nel caricamento dei dati:", err);
      setError("Si è verificato un errore generale.");
    } finally {
      setFetching(false);
      console.groupEnd();
    }
  };
  
  // Funzione per formattare la data
  const formatDate = (dateString) => {
    if (!dateString) return 'N/D';
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return dateObj.toLocaleDateString('it-IT', options);
  };
  
  // Funzione per ottenere il colore della scadenza in base alla vicinanza
  const getDeadlineColor = (deadline) => {
    const dateStringToParse = deadline.expiry_date || deadline.data_scadenza;
    if (!dateStringToParse) return '#888'; // Grigio per data non disponibile
    const deadlineDate = new Date(dateStringToParse);
    if (isNaN(deadlineDate.getTime())) return '#888'; // Grigio per data invalida

    const today = new Date();
    today.setHours(0, 0, 0, 0);
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

      {/* Controlli Dashboard */} 
      {!loading && !error && (
        <div style={{
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          margin: '18px 0 12px 0',
          flexWrap: 'wrap' 
        }}>
          <DatePicker
            selected={currentDateRange.startDate}
            onChange={handleDateChange}
            startDate={currentDateRange.startDate}
            endDate={currentDateRange.endDate}
            selectsRange
            dateFormat="dd/MM/yyyy"
            locale={it}
            customInput={<CustomDateInput />}
            popperPlacement="bottom-start"
            className="date-picker-custom"
            calendarClassName="custom-calendar"
            wrapperClassName="date-picker-wrapper"
          />
          <button 
            onClick={() => {
              fetchDashboardData(currentDateRange.startDate, currentDateRange.endDate);
              fetchRecentActivities();
            }}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'white',
              backgroundColor: '#007bff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
          >
            Aggiorna Dati
          </button>
          <input
            type="text"
            placeholder="Cerca attività per descrizione o tipo..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{padding: 8, borderRadius: 6, border: '1px solid #ccc', width: 300, marginLeft: 'auto'}}
          />
        </div>
      )}
      
      <div style={{
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
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
            {Array.isArray(deadlines.unpaid) ? deadlines.unpaid.filter(d => {
              const dateStringToParse = d.expiry_date || d.data_scadenza;
              if (!dateStringToParse) return false;
              const deadlineDate = new Date(dateStringToParse);
              if (isNaN(deadlineDate.getTime())) return false;

              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const diffTime = deadlineDate - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= 7 && diffDays >= 0;
            }).length : 0}
          </p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>non pagate, nei prossimi 7 giorni</p>
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
            {Array.isArray(deadlines.unpaid) ? deadlines.unpaid.filter(d => {
              const dateStringToParse = d.expiry_date || d.data_scadenza;
              if (!dateStringToParse) return false;
              const deadlineDate = new Date(dateStringToParse);
              if (isNaN(deadlineDate.getTime())) return false;

              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const diffTime = deadlineDate - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays < 0;
            }).length : 0}
          </p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>non pagate, già scadute</p>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '16px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
          textAlign: 'center' 
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Scadenze Pagate</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#34c759' }}>
            {Array.isArray(deadlines.paid) ? deadlines.paid.length : 0}
          </p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>già saldate (nel periodo)</p>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '16px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
          textAlign: 'center' 
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Totale Da Pagare</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#007aff' }}>
            {Array.isArray(deadlines.unpaid) ? deadlines.unpaid.length : 0}
          </p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>non pagate (nel periodo)</p>
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
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Scadenze da Pagare</h2>
          
          {!Array.isArray(deadlines.unpaid) || deadlines.unpaid.length === 0 ? (
            <p style={{ color: '#666', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              Nessuna scadenza da pagare nel periodo selezionato.
            </p>
          ) : (
            <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f7' }}>
                    <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Veicolo</th>
                    <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Tipo</th>
                    <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Scadenza</th>
                    <th style={{ padding: '8px 16px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {deadlines.unpaid.map((deadline) => (
                    <tr 
                      key={deadline.id} 
                      style={{ 
                        borderBottom: '1px solid #eee', 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        backgroundColor: getDeadlineColor(deadline, 0.1)
                      }}
                      onClick={() => router.push(`/scadenze/${deadline.id}`)}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = getDeadlineColor(deadline, 0.1)}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        {(() => {
                          if (deadline.vehicle?.targa) {
                            return `${deadline.vehicle.targa}${deadline.vehicle.nome ? ` (${deadline.vehicle.nome})` : ''}`;
                          } else if (deadline.targa) {
                            return `${deadline.targa}${deadline.veicolo_nome ? ` (${deadline.veicolo_nome})` : ''}`;
                          } else if (deadline.vehicle?.nome) {
                            return deadline.vehicle.nome;
                          } else if (deadline.veicolo_nome) {
                            return deadline.veicolo_nome;
                          } else if (deadline.vehicle_name) {
                            return deadline.vehicle_name;
                          } else if (deadline.vehicle_id) {
                            return `ID: ${deadline.vehicle_id}`;
                          }
                          return 'N/D';
                        })()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>{deadline.tipo || 'N/D'}</td>
                      <td style={{ padding: '12px 16px' }}>
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
                          {formatDate(deadline.expiry_date || deadline.data_scadenza)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold' }}>
                        {typeof deadline.importo === 'number' 
                          ? `${deadline.importo.toFixed(2)} €` 
                          : (deadline.importo ? `${deadline.importo} €` : 'N/D')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '24px 0 16px 0' }}>Scadenze Pagate</h2>
          
          {!Array.isArray(deadlines.paid) || deadlines.paid.length === 0 ? (
            <p style={{ color: '#666', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              Nessuna scadenza pagata nel periodo selezionato.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f7' }}>
                    <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Veicolo</th>
                    <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Tipo</th>
                    <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Scadenza</th>
                    <th style={{ padding: '8px 16px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Importo</th>
                    <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Pagato il</th>
                  </tr>
                </thead>
                <tbody>
                  {deadlines.paid.map((deadline) => (
                    <tr 
                      key={`paid-${deadline.id}`} 
                      style={{ 
                        borderBottom: '1px solid #eee', 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        backgroundColor: '#f8fff8'
                      }}
                      onClick={() => router.push(`/scadenze/${deadline.id}`)}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0fdf0'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fff8'}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        {(() => {
                          if (deadline.vehicle?.targa) {
                            return `${deadline.vehicle.targa}${deadline.vehicle.nome ? ` (${deadline.vehicle.nome})` : ''}`;
                          } else if (deadline.targa) {
                            return `${deadline.targa}${deadline.veicolo_nome ? ` (${deadline.veicolo_nome})` : ''}`;
                          } else if (deadline.vehicle?.nome) {
                            return deadline.vehicle.nome;
                          } else if (deadline.veicolo_nome) {
                            return deadline.veicolo_nome;
                          } else if (deadline.vehicle_name) {
                            return deadline.vehicle_name;
                          } else if (deadline.vehicle_id) {
                            return `ID: ${deadline.vehicle_id}`;
                          }
                          return 'N/D';
                        })()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>{deadline.tipo || 'N/D'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {formatDate(deadline.expiry_date || deadline.data_scadenza)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>
                        {typeof deadline.importo === 'number' 
                          ? `${deadline.importo.toFixed(2)} €` 
                          : (deadline.importo ? `${deadline.importo} €` : 'N/D')}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#34c759', fontWeight: '500' }}>
                        {deadline.data_pagamento ? formatDate(deadline.data_pagamento) : 'N/D'}
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
