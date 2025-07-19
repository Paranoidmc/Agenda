"use client";
import React, { useState, useEffect } from "react";
import WeeklyCalendar from "../../components/WeeklyCalendar";

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

export default function PianificazionePage() {
  const [viewMode, setViewMode] = useState("Cantiere");
  const [currentWeek, setCurrentWeek] = useState(getWeekArray(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  // Fetch dati reali
  useEffect(() => {
    setLoading(true);
    setError("");
    // Calcola range settimana
    const start = currentWeek[0].toISOString().split("T")[0];
    const end = currentWeek[6].toISOString().split("T")[0];
    // Carica attività
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
        console.log("DEBUG eventi RAW dal backend:", list);
        setEvents(list.map(normalizeEvent));
        // Carica righe secondo viewMode
        loadRows(viewMode, list);
      })
      .catch(err => {
        setError("Errore nel caricamento attività");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek, viewMode]);

  // Normalizza evento per WeeklyCalendar
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
    // aggiungi altri mapping se necessario
  };

  function normalizeEvent(ev) {
    // Gestione date solo YYYY-MM-DD
    function parseDateSafe(val) {
      if (!val) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return new Date(val + 'T00:00:00');
      return new Date(val);
    }
    // Autista
    let d = ev.driver || ev.autista;
    if (!d && Array.isArray(ev.drivers) && ev.drivers.length > 0) d = ev.drivers[0];
    let driverName = 'N/D';
    if (d && (d.nome || d.cognome || d.name || d.surname)) {
      driverName = `${d.nome || d.name || ''} ${d.cognome || d.surname || ''}`.trim() || 'N/D';
    }
    // Veicolo
    let v = ev.vehicle || ev.veicolo;
    if (!v && Array.isArray(ev.vehicles) && ev.vehicles.length > 0) v = ev.vehicles[0];
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
  }

  // Carica righe per la vista corrente
  function loadRows(mode, activities) {
    // Usa sempre gli eventi già normalizzati
    // Trova la lista normalizzata
    const normalizedEvents = activities.map(normalizeEvent);
console.log("DEBUG eventi normalizzati:", normalizedEvents.map(e => ({
  id: e.id,
  driverName: e.driverName,
  vehicleName: e.vehicleName,
  rawDriver: e.data.driver,
  rawVehicle: e.data.vehicle
})));

    if (mode === 'Cantiere') {
      const sitesMap = {};
      normalizedEvents.forEach(ev => {
        const site = ev.data.site || ev.data.cantiere;
        if (!site) return;
        if (!sitesMap[site.id]) sitesMap[site.id] = { id: site.id, name: site.nome || site.name, events: [] };
        sitesMap[site.id].events.push(ev);
      });
      setRows(Object.values(sitesMap));
    } else if (mode === 'Driver') {
      const driversMap = {};
      normalizedEvents.forEach(ev => {
        const driver = ev.data.driver || ev.data.autista;
        if (!driver) return;
        if (!driversMap[driver.id]) driversMap[driver.id] = { id: driver.id, name: (driver.nome || '') + ' ' + (driver.cognome || ''), events: [] };
        driversMap[driver.id].events.push(ev);
      });
      setRows(Object.values(driversMap));
    } else if (mode === 'Vehicle') {
      const vehiclesMap = {};
      normalizedEvents.forEach(ev => {
        const vehicle = ev.data.vehicle || ev.data.veicolo;
        if (!vehicle) return;
        if (!vehiclesMap[vehicle.id]) vehiclesMap[vehicle.id] = { id: vehicle.id, name: (vehicle.targa || vehicle.plate || '') + ' ' + (vehicle.modello || vehicle.model || ''), events: [] };
        vehiclesMap[vehicle.id].events.push(ev);
      });
      setRows(Object.values(vehiclesMap));
    }
  }

  // Format range settimana per header
  function formatWeekRange(weekArr) {
    if (!weekArr || weekArr.length !== 7) return '';
    const opts = { day: '2-digit', month: 'short' };
    const start = weekArr[0].toLocaleDateString('it-IT', opts);
    const end = weekArr[6].toLocaleDateString('it-IT', opts);
    return `${start} - ${end} ${weekArr[0].getFullYear()}`;
  }

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
      <div className="calendar-header">
        {/* Sinistra: Navigazione Settimana */}
        <div className="calendar-navigation">
          <button className="nav-button" onClick={handlePrevWeek} aria-label="Settimana precedente">&lt;</button>
          <button className="nav-button current" onClick={handleToday}>Questa settimana</button>
          <button className="nav-button" onClick={handleNextWeek} aria-label="Settimana successiva">&gt;</button>
        </div>
        {/* Centro: Range Date */}
        <div className="current-date">{formatWeekRange(currentWeek)}</div>
        {/* Destra: Selettori Vista */}
        <div className="view-selectors">
          <button className={"view-selector" + (viewMode === "Cantiere" ? " active" : "")} onClick={() => setViewMode("Cantiere")}>Cantiere</button>
          <button className={"view-selector" + (viewMode === "Driver" ? " active" : "")} onClick={() => setViewMode("Driver")}>Autista</button>
          <button className={"view-selector" + (viewMode === "Vehicle" ? " active" : "")} onClick={() => setViewMode("Vehicle")}>Veicolo</button>
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
            viewMode={viewMode}
            rows={rows}
            selectedDate={selectedDate}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
          />
        )}
      </div>
    </div>
  );
}
