"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import WeeklyCalendar from "../../components/WeeklyCalendar";
import AgendaGiornalieraPage from "../agenda-giornaliera/page";
import { useSearchParams, useRouter } from "next/navigation";
export const dynamic = 'force-dynamic';

// Mappa colori stati (coerente con Agenda Giornaliera)
const statusColorMap = {
  "non assegnato": "#3b82f6", // Blu
  "assegnato": "#eab308",     // Giallo
  "doc emesso": "#ef4444",    // Rosso
  "programmato": "#8b5cf6",   // Viola
  "in corso": "#f97316",      // Arancione
  "completato": "#22c55e",    // Verde
  "annullato": "#ec4899"      // Rosa
};
const statusLabels = {
  "non assegnato": "Non assegnato",
  "assegnato": "Assegnato",
  "doc emesso": "Doc emesso",
  "programmato": "Programmato",
  "in corso": "In corso",
  "completato": "Completato",
  "annullato": "Annullato"
};
import api from "../../lib/api";
import "./page.css";

function PianificazioneInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [viewMode, setViewMode] = useState("Cantiere");
  // Nuova modalità calendario: settimana o giorno
  const [calendarMode, setCalendarMode] = useState('week'); // 'week' | 'day'
  const [currentWeek, setCurrentWeek] = useState(getWeekArray(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Normalizza evento per WeeklyCalendar - definita prima di loadRows
  // Mappa stato inglese → italiano
  const statoMap = {
    'planned': 'Programmato',
    'in_progress': 'In corso',
    'completed': 'Completato',
    'cancelled': 'Annullato',
    'assigned': 'Assegnato',
    'not_assigned': 'Non assegnato',
    'doc_issued': 'Doc emesso',
    'pending': 'In attesa',
    'overdue': 'Scaduta',
    'done': 'Completato',
  };

  const normalizeEvent = useCallback((ev) => {
    // Gestione date solo YYYY-MM-DD
    function parseDateSafe(val) {
      if (!val) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return new Date(val + 'T00:00:00');
      return new Date(val);
    }
    // Autista: supporta molteplici shape (singolo o multiplo)
    let driverName = 'N/D';
    const toFullName = (p) => {
      if (!p) return '';
      const first = p.nome || p.name || '';
      const last = p.cognome || p.surname || '';
      return `${first} ${last}`.trim() || (p.full_name || p.fullName || p.display_name || p.displayName || p.name || '');
    };
    
    // Prima controlla resources (nuovo formato dall'API)
    let driversArray = null;
    if (Array.isArray(ev.resources) && ev.resources.length > 0) {
      driversArray = ev.resources
        .map(r => r.driver)
        .filter(Boolean);
    }
    
    // Se non trovato in resources, controlla i formati vecchi
    if (!driversArray || driversArray.length === 0) {
      driversArray = (
        (Array.isArray(ev.drivers) && ev.drivers)
        || (Array.isArray(ev.assigned_drivers) && ev.assigned_drivers)
        || (Array.isArray(ev.driverList) && ev.driverList)
        || (Array.isArray(ev.assignees) && ev.assignees)
      );
    }
    
    if (Array.isArray(driversArray) && driversArray.length > 0) {
      const names = driversArray.map(d => typeof d === 'string' ? d : toFullName(d)).filter(Boolean);
      if (names.length > 0) driverName = names.join(', ');
    } else {
      // Fallback singolo
      const d = ev.driver || ev.autista || ev.assigned_driver || ev.primary_driver;
      const name = typeof d === 'string' ? d : toFullName(d);
      if (name) driverName = name;
    }
    
    // Veicolo: prima controlla resources
    let v = null;
    if (Array.isArray(ev.resources) && ev.resources.length > 0) {
      v = ev.resources
        .map(r => r.vehicle)
        .filter(Boolean)[0]; // Prendi il primo veicolo
    }
    
    // Fallback ai formati vecchi
    if (!v) {
      v = ev.vehicle || ev.veicolo;
      if (!v && Array.isArray(ev.vehicles) && ev.vehicles.length > 0) v = ev.vehicles[0];
    }
    
    let vehicleName = 'N/D';
    if (v && (v.targa || v.plate || v.modello || v.model || v.name)) {
      vehicleName = `${v.targa || v.plate || ''} ${v.modello || v.model || ''}`.trim() || v.name || 'N/D';
    }
    // Stato
    let stato = ev.stato || ev.status || '';
    if (stato && statoMap[stato]) stato = statoMap[stato];
    else if (!stato) stato = 'N/D';
    // status normalizzato per la mappa colori
    let status = (stato || '').toLowerCase().trim();
    return {
      id: ev.id,
      start: parseDateSafe(ev.data_inizio),
      end: parseDateSafe(ev.data_fine),
      type: 'activity',
      data: ev,
      driverName,
      vehicleName,
      stato,
      status
    };
  }, []);

  // Carica righe per la vista corrente - definita prima di fetchActivities
  const loadRows = useCallback((mode, activities) => {
    // Usa sempre gli eventi già normalizzati
    // Trova la lista normalizzata
    const normalizedEvents = activities.map(normalizeEvent);
    console.log("DEBUG eventi normalizzati:", normalizedEvents.map(e => ({
      id: e.id,
      driverName: e.driverName,
      vehicleName: e.vehicleName,
      rawDriver: e.data.driver,
      rawVehicle: e.data.vehicle,
      hasResources: !!e.data.resources,
      resourcesCount: e.data.resources?.length || 0
    })));

    if (mode === 'Cantiere') {
      const sitesMap = {};
      normalizedEvents.forEach(ev => {
        const site = ev.data.site || ev.data.cantiere;
        if (!site) {
          console.warn('⚠️ Evento senza sito:', ev.id);
          return;
        }
        if (!sitesMap[site.id]) sitesMap[site.id] = { id: site.id, name: site.nome || site.name, events: [] };
        sitesMap[site.id].events.push(ev);
      });
      console.log('📊 Righe Cantiere:', Object.keys(sitesMap).length);
      setRows(Object.values(sitesMap));
    } else if (mode === 'Driver') {
      const driversMap = {};
      normalizedEvents.forEach(ev => {
        // Supporta più autisti per evento - controlla resources prima
        let list = [];
        
        // Prima controlla resources (nuovo formato)
        if (Array.isArray(ev.data?.resources) && ev.data.resources.length > 0) {
          list = ev.data.resources
            .map(r => r.driver)
            .filter(Boolean);
        }
        
        // Fallback ai formati vecchi
        if (list.length === 0) {
          if (Array.isArray(ev.data?.drivers) && ev.data.drivers.length > 0) {
            list = ev.data.drivers;
          } else if (Array.isArray(ev.data?.assigned_drivers) && ev.data.assigned_drivers.length > 0) {
            list = ev.data.assigned_drivers;
          } else if (Array.isArray(ev.data?.assignees) && ev.data.assignees.length > 0) {
            list = ev.data.assignees;
          } else if (ev.data?.driver || ev.data?.autista) {
            list = [ev.data.driver || ev.data.autista];
          }
        }
        
        if (list.length === 0) {
          console.warn('⚠️ Evento senza autisti:', ev.id);
          // Aggiungi una riga per "Nessun autista" se necessario
          const key = 'no-driver';
          if (!driversMap[key]) driversMap[key] = { id: key, name: 'Nessun autista', events: [] };
          driversMap[key].events.push(ev);
          return;
        }
        
        list.forEach(driver => {
          const id = driver?.id || driver?.driver_id || (typeof driver === 'string' ? driver : undefined);
          const name = (driver && (driver.nome || driver.name) ? `${driver.nome || driver.name} ${driver.cognome || driver.surname || ''}`.trim() : (typeof driver === 'string' ? driver : 'Senza nome'));
          if (!id && typeof driver !== 'string') return; // evita righe senza id quando non stringa
          const key = id || name;
          if (!driversMap[key]) driversMap[key] = { id: key, name, events: [] };
          driversMap[key].events.push(ev);
        });
      });
      console.log('📊 Righe Driver:', Object.keys(driversMap).length);
      setRows(Object.values(driversMap));
    } else if (mode === 'Vehicle') {
      const vehiclesMap = {};
      normalizedEvents.forEach(ev => {
        // Controlla resources prima (nuovo formato)
        let vehicle = null;
        if (Array.isArray(ev.data?.resources) && ev.data.resources.length > 0) {
          vehicle = ev.data.resources
            .map(r => r.vehicle)
            .filter(Boolean)[0]; // Prendi il primo veicolo
        }
        
        // Fallback al formato vecchio
        if (!vehicle) {
          vehicle = ev.data.vehicle || ev.data.veicolo;
        }
        
        if (!vehicle) {
          console.warn('⚠️ Evento senza veicolo:', ev.id);
          return;
        }
        
        const vehicleId = vehicle.id;
        const vehicleName = (vehicle.targa || vehicle.plate || '') + ' ' + (vehicle.modello || vehicle.model || vehicle.name || '');
        if (!vehiclesMap[vehicleId]) vehiclesMap[vehicleId] = { id: vehicleId, name: vehicleName.trim(), events: [] };
        vehiclesMap[vehicleId].events.push(ev);
      });
      console.log('📊 Righe Vehicle:', Object.keys(vehiclesMap).length);
      setRows(Object.values(vehiclesMap));
    }
  }, []);

  // Fetch attività - definito prima degli useEffect che lo usano
  const fetchActivities = useCallback(() => {
    setLoading(true);
    setError("");
    const start = currentWeek[0].toISOString().split("T")[0];
    const end = currentWeek[6].toISOString().split("T")[0];
    api.get('/activities', {
      params: {
        start_date: start,
        end_date: end,
        per_page: 2000,
        sort: 'data_inizio',
        order: 'asc',
      }
    })
      .then(res => {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        console.log('📅 Attività caricate:', list.length, 'per settimana', start, '-', end);
        setEvents(list.map(normalizeEvent));
        loadRows(viewMode, list);
      })
      .catch(err => {
        console.error('❌ Errore caricamento attività:', err);
        setError("Errore nel caricamento attività");
      })
      .finally(() => setLoading(false));
  }, [currentWeek, viewMode, loadRows, normalizeEvent]);

  // Listener per eventi di sincronizzazione real-time
  useEffect(() => {
    const handleSyncEvent = (event) => {
      console.log('🔄 Ricevuto evento sincronizzazione in pianificazione:', event.detail);
      // Ricarica le attività
      fetchActivities();
    };

    const handleActivityEvent = (event) => {
      console.log('🔄 Ricevuto evento attività creata/modificata:', event.detail);
      // Ricarica le attività quando ne viene creata/modificata una
      fetchActivities();
    };

    window.addEventListener('documentsSync', handleSyncEvent);
    window.addEventListener('clientsSync', handleSyncEvent);
    window.addEventListener('driversSync', handleSyncEvent);
    window.addEventListener('sitesSync', handleSyncEvent);
    window.addEventListener('activityCreated', handleActivityEvent);
    window.addEventListener('activityUpdated', handleActivityEvent);
    window.addEventListener('activitySaved', handleActivityEvent);

    return () => {
      window.removeEventListener('documentsSync', handleSyncEvent);
      window.removeEventListener('clientsSync', handleSyncEvent);
      window.removeEventListener('driversSync', handleSyncEvent);
      window.removeEventListener('sitesSync', handleSyncEvent);
      window.removeEventListener('activityCreated', handleActivityEvent);
      window.removeEventListener('activityUpdated', handleActivityEvent);
      window.removeEventListener('activitySaved', handleActivityEvent);
    };
  }, [fetchActivities]);

  // Calcola array settimana (lun-dom)
  function getWeekArray(date) {
    const d = new Date(date);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      return dt;
    });
  }

  // Navigazione settimana
  function handlePrevWeek() {
    const prev = new Date(currentWeek[0]);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeek(getWeekArray(prev));
    setSelectedDate(prev);
  }
  function handleNextWeek() {
    const next = new Date(currentWeek[0]);
    next.setDate(next.getDate() + 7);
    setCurrentWeek(getWeekArray(next));
    setSelectedDate(next);
  }
  function handleToday() {
    const today = new Date();
    setCurrentWeek(getWeekArray(today));
    setSelectedDate(today);
  }

  // Navigazione giornaliera quando in modalità "day"
  function handlePrevDay() {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setSelectedDate(prevDay);
    // Se usciamo dalla settimana corrente, ricalcola la settimana
    if (prevDay < currentWeek[0] || prevDay > currentWeek[6]) {
      setCurrentWeek(getWeekArray(prevDay));
    }
  }
  function handleNextDay() {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
    if (nextDay < currentWeek[0] || nextDay > currentWeek[6]) {
      setCurrentWeek(getWeekArray(nextDay));
    }
  }
  function handleTodayDay() {
    const today = new Date();
    setSelectedDate(today);
    if (today < currentWeek[0] || today > currentWeek[6]) {
      setCurrentWeek(getWeekArray(today));
    }
  }

  // Inizializza da query params (mode, date) e localStorage
  useEffect(() => {
    // URL params
    const mode = searchParams?.get('mode');
    if (mode === 'day' || mode === 'week') {
      setCalendarMode(mode);
    } else {
      // fallback: preferenza da localStorage
      const saved = typeof window !== 'undefined' ? localStorage.getItem('calendarMode') : null;
      if (saved === 'day' || saved === 'week') setCalendarMode(saved);
    }

    const date = searchParams?.get('date');
    if (date) {
      const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T00:00:00') : new Date(date);
      if (!isNaN(parsed)) {
        setSelectedDate(parsed);
        if (parsed < currentWeek[0] || parsed > currentWeek[6]) {
          setCurrentWeek(getWeekArray(parsed));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persiste preferenza modalità calendario
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendarMode', calendarMode);
    }
  }, [calendarMode]);

  // Fetch dati reali quando cambiano settimana o viewMode
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Handler per click su evento attività
  const handleEventClick = (event) => {
    console.log('🎯 Click su attività:', event);
    if (event.data?.id || event.id) {
      router.push(`/attivita/${event.data?.id || event.id}`);
    }
  };

  // Handler per aggiunta nuova attività
  const handleAddActivity = () => {
    router.push('/attivita/new');
  };

  // Format range settimana per header
  function formatWeekRange(weekArr) {
    if (!weekArr || weekArr.length !== 7) return '';
    const opts = { day: '2-digit', month: 'short' };
    const start = weekArr[0].toLocaleDateString('it-IT', opts);
    const end = weekArr[6].toLocaleDateString('it-IT', opts);
    return `${start} - ${end} ${weekArr[0].getFullYear()}`;
  }

  // Formattazione data singolo giorno
  function formatDay(date) {
    if (!date) return '';
    const dayName = date.toLocaleDateString('it-IT', { weekday: 'long' });
    const day = date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${dayName.charAt(0).toUpperCase()}${dayName.slice(1)} — ${day}`;
  }

  // Mappa viewMode verso i valori attesi da WeeklyCalendar
  const mappedViewMode = calendarMode === 'day'
    ? 'day'
    : (viewMode === 'Driver' ? 'driver' : (viewMode === 'Vehicle' ? 'vehicle' : 'site'));

  return (
    <div className="page-container">
      {/* Legenda colori stati attività */}
      <div className="legend-container" style={{ marginBottom: 16 }}>
        <div className="legend-title">Legenda stati attività</div>
        <div className="legend-items">
          {Object.entries(statusColorMap).map(([key, color]) => (
            <div key={key} className="legend-item">
              <span className="legend-color" style={{ backgroundColor: color }}></span>
              <span className="legend-label">{statusLabels[key] || key}</span>
            </div>
          ))}
        </div>
      </div>
      {calendarMode === 'week' ? (
        <>
          <div className="calendar-header">
            {/* Sinistra: Navigazione Settimana */}
            <div className="calendar-navigation">
              <button className="nav-button" onClick={handlePrevWeek} aria-label="Settimana precedente">&lt;</button>
              <button className="nav-button current" onClick={handleToday}>Questa settimana</button>
              <button className="nav-button" onClick={handleNextWeek} aria-label="Settimana successiva">&gt;</button>
            </div>
            {/* Centro: Range Date */}
            <div className="current-date">{formatWeekRange(currentWeek)}</div>
            {/* Destra: Selettori Vista + Toggle modalità + Aggiungi */}
            <div className="view-selectors" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className={"view-selector" + (viewMode === "Cantiere" ? " active" : "")} onClick={() => setViewMode("Cantiere")}>Cantiere</button>
                <button className={"view-selector" + (viewMode === "Driver" ? " active" : "")} onClick={() => setViewMode("Driver")}>Autista</button>
                <button className={"view-selector" + (viewMode === "Vehicle" ? " active" : "")} onClick={() => setViewMode("Vehicle")}>Veicolo</button>
              </div>
              <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
              <div style={{ display: 'flex', gap: 4 }}>
                <button className={"view-selector" + (calendarMode === "week" ? " active" : "")} onClick={() => setCalendarMode('week')}>Settimana</button>
                <button className={"view-selector" + (calendarMode === "day" ? " active" : "")} onClick={() => setCalendarMode('day')}>Giorno</button>
              </div>
              <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
              <button 
                onClick={handleAddActivity}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#10b981';
                }}
              >
                ➕ Aggiungi Attività
              </button>
            </div>
          </div>
          <div className="calendar-container">
            {/* Loading/Error */}
            {loading && <div style={{ padding: 24, textAlign: 'center' }}>Caricamento dati...</div>}
            {error && <div style={{ padding: 24, color: 'red', textAlign: 'center' }}>{error}</div>}
            {/* Calendario */}
            {!loading && !error && (
              <WeeklyCalendar
                events={events}
                currentWeek={currentWeek}
                viewMode={mappedViewMode}
                rows={rows}
                selectedDate={selectedDate}
                onPrevWeek={handlePrevWeek}
                onNextWeek={handleNextWeek}
                onEventClick={handleEventClick}
              />
            )}
          </div>
        </>
      ) : (
        <>
          {/* Header con navigazione giornaliera */}
          <div className="calendar-header">
            {/* Navigazione Giornaliera */}
            <div className="calendar-navigation">
              <button className="nav-button" onClick={handlePrevDay} aria-label="Giorno precedente">&lt;</button>
              <button className="nav-button current" onClick={handleTodayDay}>Oggi</button>
              <button className="nav-button" onClick={handleNextDay} aria-label="Giorno successivo">&gt;</button>
            </div>
            <div className="current-date">{formatDay(selectedDate)}</div>
            <div className="view-selectors" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className={"view-selector"} onClick={() => setCalendarMode('week')}>Torna a Settimana</button>
            </div>
          </div>
          {/* Render esatto della pagina agenda giornaliera */}
          <AgendaGiornalieraPage initialDate={selectedDate} />
        </>
      )}
    </div>
  );
}

export default function PianificazionePage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>Caricamento…</div>}>
      <PianificazioneInner />
    </Suspense>
  );
}
