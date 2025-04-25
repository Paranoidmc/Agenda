"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import WeeklyCalendar from "../../components/WeeklyCalendar";
import DailyActivitiesModal from "../../components/DailyActivitiesModal";
import { exportCalendarToExcel } from "../../lib/excelExport";
import { exportCalendarToHTML } from "../../lib/htmlExport";
import "../pianificazione/page.css";
import "./page.css";

/**
 * Pagina dell'agenda giornaliera che mostra le attività di un singolo giorno
 */
export default function AgendaGiornalieraPage() {
  const [showDailyModal, setShowDailyModal] = useState(false);
  const router = useRouter();
  const { user, loading } = useAuth();
  const [events, setEvents] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("day"); // Sempre in modalità giorno
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [sites, setSites] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedActivityTypeId, setSelectedActivityTypeId] = useState(null);
  const [driversLoading, setDriversLoading] = useState(true);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [activityTypes, setActivityTypes] = useState([]);
  const [activityTypesLoading, setActivityTypesLoading] = useState(true);

  // --- Utility Functions ---
  const activityStates = ["non assegnato", "assegnato", "doc emesso", "completato", "annullato"];

  // Restituisce solo le attività del giorno selezionato
  const getDailyActivities = () => {
    const formattedDate = formatDateISO(currentDate);
    return events.filter(e => e.type === 'activity' && e.data?.data_inizio?.startsWith(formattedDate));
  };

  // Salva attività (creazione o update)
  const handleSaveActivity = async (activityData) => {
    try {
      // Se esiste un id, aggiorna, altrimenti crea
      if (activityData.id) {
        await api.put(`/activities/${activityData.id}`, activityData, { withCredentials: true });
      } else {
        await api.post('/activities', activityData, { withCredentials: true });
      }
      // Refresca eventi dopo salvataggio
      setFetching(true);
    } catch (e) {
      alert('Errore nel salvataggio attività: ' + (e?.message || e));
    }
  };

  function formatDateISO(date) {
    return date.toISOString().split('T')[0];
  }

  // Funzione per ottenere il colore della scadenza
  function getDeadlineColor(deadline) {
    if (deadline.stato === 'non assegnato') return '#e0f2fe';
    if (deadline.stato === 'assegnato') return '#fef9c3';
    if (deadline.stato === 'doc emesso') return '#fee2e2';
    if (deadline.stato === 'completato') return '#bbf7d0';
    if (deadline.stato === 'annullato') return '#fbcfe8';
    return '#d1d5db';
  }

  // Funzione per andare al giorno precedente
  function goToPreviousDay() {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  }

  // Funzione per andare al giorno successivo
  function goToNextDay() {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  }

  // Funzione per andare al giorno corrente
  function goToCurrentDay() {
    setCurrentDate(new Date());
  }

  // Gestisce il click su un evento
  function handleEventClick(event) {
    console.log("Click su evento:", event);
    
    if (event.type === 'activity' && event.data && event.data.id) {
      console.log(`Navigazione a /attivita/${event.data.id}`);
      router.push(`/attivita/${event.data.id}`);
    } else if (event.type === 'deadline' && event.data && event.data.id) {
      console.log(`Navigazione a /scadenze?id=${event.data.id}`);
      router.push(`/scadenze?id=${event.data.id}`);
    } else {
      console.error("Impossibile navigare: dati evento non validi", event);
    }
  }

  // Funzione per ottenere il contenuto dell'evento in base alla vista
  const getEventContent = (event) => {
    // Ottieni il nome completo dell'autista
    const driverFullName = event.data?.driver ? 
      `${event.data.driver.nome || ''} ${event.data.driver.cognome || ''}`.trim() : 
      event.driverName || 'N/D';
    
    // Ottieni la descrizione dell'attività
    const description = event.data?.descrizione || event.data?.description || event.description || '';
    
    // Ottieni il tipo di attività
    const activityType = event.data?.activityType?.nome || 
                         event.data?.activityType?.name || 
                         event.activityTypeName || 
                         '';
    
    // Crea una stringa con tipo di attività e descrizione se disponibili
    const activityInfo = [
      activityType ? `[${activityType}]` : '',
      description ? description : ''
    ].filter(Boolean).join(' ');
    
    // Contenuto base: mostra autista e veicolo
    const baseContent = `${driverFullName} - ${event.vehicleName || 'N/D'}`;
    
    // Aggiungi le informazioni sull'attività se disponibili
    return activityInfo ? `${baseContent}\n${activityInfo}` : baseContent;
  };
  
  // Stato per il menu di esportazione
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Funzione per preparare i dati di esportazione
  const prepareExportData = () => {
    // Nome del file
    let filename = 'Agenda_Giornaliera';
    
    // Aggiungi la data corrente al nome del file
    const dateStr = formatDateISO(currentDate);
    filename = `${filename}_${dateStr}`;
    
    // Prepara i filtri applicati
    const filters = {
      driverId: selectedDriverId,
      vehicleId: selectedVehicleId,
      siteId: selectedSiteId,
      activityTypeId: selectedActivityTypeId,
      date: dateStr
    };
    
    // Aggiungi i nomi dei filtri per la visualizzazione
    if (selectedDriverId) {
      const driver = drivers.find(d => d.id === selectedDriverId);
      if (driver) {
        filters.driverName = `${driver.nome || ''} ${driver.cognome || ''}`.trim();
      }
    }
    
    if (selectedVehicleId) {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (vehicle) {
        filters.vehicleName = vehicle.targa || vehicle.modello;
      }
    }
    
    if (selectedSiteId) {
      const site = sites.find(s => s.id === selectedSiteId);
      if (site) {
        filters.siteName = site.nome;
      }
    }
    
    // Aggiungi al nome del file le informazioni sui filtri
    if (selectedDriverId || selectedVehicleId || selectedSiteId || selectedActivityTypeId) {
      filename += '_Filtrato';
    }
    
    return { filename, filters };
  };
  
  // Funzione per esportare il calendario in Excel
  const handleExportToExcel = () => {
    try {
      const { filename, filters } = prepareExportData();
      console.log('Esportazione agenda giornaliera in Excel con filtri:', filters);
      
      // Crea un array con solo il giorno corrente per l'esportazione
      const singleDayArray = [currentDate];
      
      // Esporta il calendario con i filtri
      exportCalendarToExcel(events, viewMode, getRows(), singleDayArray, filename, filters);
    } catch (error) {
      console.error('Errore durante l\'esportazione in Excel:', error);
      alert('Si è verificato un errore durante l\'esportazione in Excel. Riprova più tardi.');
    }
  };
  
  // Funzione per esportare il calendario in HTML
  const handleExportToHTML = () => {
    try {
      const { filename, filters } = prepareExportData();
      console.log('Esportazione agenda giornaliera in HTML con filtri:', filters);
      
      // Crea un array con solo il giorno corrente per l'esportazione
      const singleDayArray = [currentDate];
      
      // Esporta il calendario con i filtri
      exportCalendarToHTML(events, viewMode, getRows(), singleDayArray, filename, filters);
    } catch (error) {
      console.error('Errore durante l\'esportazione in HTML:', error);
      alert('Si è verificato un errore durante l\'esportazione in HTML. Riprova più tardi.');
    }
  };
  
  // Funzione per gestire il menu di esportazione
  const handleExportClick = () => {
    setShowExportMenu(!showExportMenu);
  };
  
  // Riferimento al menu di esportazione
  const exportMenuRef = React.useRef(null);
  
  // Effetto per chiudere il menu quando si fa clic all'esterno
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }
    
    // Aggiungi l'event listener quando il menu è aperto
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Rimuovi l'event listener quando il componente viene smontato o il menu viene chiuso
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const getRows = () => {
    // Filtra solo gli eventi di tipo 'activity' per il giorno corrente
    const formattedDate = formatDateISO(currentDate);
    let activityEvents = events.filter(e => 
      e.type === 'activity' && 
      e.data?.data_inizio?.startsWith(formattedDate)
    );
    
    // Applica i filtri in base alle selezioni
    if (selectedSiteId) {
      activityEvents = activityEvents.filter(e => e.siteId === selectedSiteId || e.data?.site?.id === selectedSiteId);
    }
    
    if (selectedDriverId) {
      activityEvents = activityEvents.filter(e => e.driverId === selectedDriverId || e.data?.driver?.id === selectedDriverId);
    }
    
    if (selectedVehicleId) {
      activityEvents = activityEvents.filter(e => e.vehicleId === selectedVehicleId || e.data?.vehicle?.id === selectedVehicleId);
    }
    
    if (selectedActivityTypeId) {
      activityEvents = activityEvents.filter(e => 
        e.data?.activity_type_id === selectedActivityTypeId || 
        e.data?.activityType?.id === selectedActivityTypeId
      );
    }
    
    // Determina quali righe mostrare in base alla modalità di visualizzazione
    switch (viewMode) {
      case 'driver':
        // Se c'è un filtro per autista, mostra solo quell'autista
        if (selectedDriverId) {
          const driver = drivers.find(d => d.id === selectedDriverId);
          if (driver) {
            return [{
              id: driver.id,
              name: `${driver.nome || ''} ${driver.cognome || ''}`.trim(),
              events: activityEvents
            }];
          }
        }
        
        // Altrimenti mostra tutti gli autisti con attività
        if (Array.isArray(drivers)) {
          return drivers
            .filter(driver => {
              // Mostra solo gli autisti con attività per questo giorno
              return activityEvents.some(e => e.driverId === driver.id || e.data?.driver?.id === driver.id);
            })
            .map(driver => ({
              id: driver.id,
              name: `${driver.nome || ''} ${driver.cognome || ''}`.trim(),
              events: activityEvents.filter(e => e.driverId === driver.id || e.data?.driver?.id === driver.id)
            }));
        }
        break;
        
      case 'vehicle':
        // Se c'è un filtro per veicolo, mostra solo quel veicolo
        if (selectedVehicleId) {
          const vehicle = vehicles.find(v => v.id === selectedVehicleId);
          if (vehicle) {
            return [{
              id: vehicle.id,
              name: vehicle.targa || vehicle.modello,
              events: activityEvents
            }];
          }
        }
        
        // Altrimenti mostra tutti i veicoli con attività
        if (Array.isArray(vehicles)) {
          return vehicles
            .filter(vehicle => {
              // Mostra solo i veicoli con attività per questo giorno
              return activityEvents.some(e => e.vehicleId === vehicle.id || e.data?.vehicle?.id === vehicle.id);
            })
            .map(vehicle => ({
              id: vehicle.id,
              name: vehicle.targa || vehicle.modello,
              events: activityEvents.filter(e => e.vehicleId === vehicle.id || e.data?.vehicle?.id === vehicle.id)
            }));
        }
        break;
        
      case 'day':
      default:
        // Una sola riga che contiene tutte le attività del giorno selezionato
        return [{
          id: 'attivita-giornaliere',
          name: 'Attività del giorno',
          events: activityEvents
        }];
    }
    
    // Fallback nel caso in cui non ci siano dati validi
    return [{
      id: 'attivita-giornaliere',
      name: 'Attività del giorno',
      events: activityEvents
    }];
  };

  // Carica i dati delle attività
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    async function fetchData() {
      if (!fetching) return;
      
      try {
        setFetching(true);
        
        // Ottieni la data formattata per il filtro
        const formattedDate = formatDateISO(currentDate);
        
        // Carica le attività per il giorno corrente
        const activitiesResponse = await api.get(`/activities?date=${formattedDate}`, { withCredentials: true });
        
        // Trasforma le attività in eventi per il calendario
        const activitiesRaw = Array.isArray(activitiesResponse.data)
  ? activitiesResponse.data
  : (activitiesResponse.data && Array.isArray(activitiesResponse.data.data)
    ? activitiesResponse.data.data
    : []);
const activityEvents = activitiesRaw.map(activity => {
  // Assicuriamoci che le date siano valide
  let startDate = new Date(activity.data_inizio);
  let endDate = new Date(activity.data_fine || activity.data_inizio);

  // Se le date non sono valide, usa dei valori predefiniti
  if (isNaN(startDate.getTime())) {
    startDate = new Date();
    startDate.setHours(9, 0, 0);
  }

  if (isNaN(endDate.getTime())) {
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 ora
  }

  // Se non abbiamo un'ora specifica, impostiamo un'ora predefinita
  if (startDate.getHours() === 0 && startDate.getMinutes() === 0) {
    startDate.setHours(9, 0, 0); // Imposta alle 9:00
  }

  // Se la data di fine è uguale alla data di inizio, aggiungiamo un'ora
  if (endDate.getTime() === startDate.getTime()) {
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 ora
  }

  // Assicuriamoci di avere il colore corretto
  let activityColor = '#007aff'; // Colore predefinito
  let activityTypeName = 'Attività';

  // Verifica se l'attività ha un tipo di attività
  if (!activity.activityType && activity.activity_type_id && Array.isArray(window.activityTypes)) {
    const tipoAttivita = window.activityTypes.find(tipo => tipo.id === activity.activity_type_id);
    if (tipoAttivita) {
      activity.activityType = {
        id: tipoAttivita.id,
        name: tipoAttivita.name || tipoAttivita.nome,
        color: tipoAttivita.color || tipoAttivita.colore,
        nome: tipoAttivita.nome || tipoAttivita.name,
        colore: tipoAttivita.colore || tipoAttivita.color
      };
    }
  }

  if (activity.activityType) {
    if (activity.activityType.colore && activity.activityType.colore.startsWith('#')) {
      activityColor = activity.activityType.colore;
    } else if (activity.activityType.color && activity.activityType.color.startsWith('#')) {
      activityColor = activity.activityType.color;
    }
    if (activity.activityType.nome || activity.activityType.name) {
      activityTypeName = activity.activityType.nome || activity.activityType.name;
    }
  }

  return {
    id: `activity-${activity.id}`,
    title: activity.descrizione || activity.description || activityTypeName,
    start: startDate,
    end: endDate,
    type: 'activity',
    color: activityColor,
    backgroundColor: activityColor,
    activityTypeColor: activityColor,
    driverId: activity.driver?.id,
    driverName: `${activity.driver?.nome || activity.driver?.name || ''} ${activity.driver?.cognome || activity.driver?.surname || ''}`.trim(),
    vehicleId: activity.vehicle?.id,
    vehicleName: activity.vehicle?.targa || activity.vehicle?.plate || activity.vehicle?.modello || activity.vehicle?.model || 'N/D',
    siteId: activity.site?.id,
    siteName: activity.site?.nome || activity.site?.name || 'N/D',
    clientId: activity.site?.client?.id,
    clientName: activity.site?.client?.nome || activity.site?.client?.name || 'N/D',
    data: activity
  };
});
        
        // Carica le scadenze per il giorno corrente
        const deadlinesResponse = await api.get(`/vehicle-deadlines?date=${formattedDate}`, { withCredentials: true });
        
        // Trasforma le scadenze in eventi per il calendario
        const deadlineEvents = deadlinesResponse.data.map(deadline => {
          // Crea la data di scadenza
          const deadlineDate = new Date(deadline.data_scadenza);
          
          return {
            id: `deadline-${deadline.id}`,
            title: deadline.descrizione || 'Scadenza',
            start: deadlineDate,
            end: deadlineDate,
            type: 'deadline',
            color: getDeadlineColor(deadline),
            backgroundColor: getDeadlineColor(deadline),
            vehicleId: deadline.vehicle?.id,
            vehicleName: deadline.vehicle?.targa || deadline.vehicle?.modello || 'N/D',
            data: deadline
          };
        });
        
        // Combina gli eventi
        setEvents([...activityEvents, ...deadlineEvents]);
        setFetching(false);
      } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        setError('Errore nel caricamento dei dati. Riprova più tardi.');
        setFetching(false);
      }
    }

    // Carica i dati degli autisti
    async function fetchDrivers() {
      if (!driversLoading) return;
      try {
        const response = await api.get('/drivers', { withCredentials: true });
        console.log('API /drivers response', response.data);
        const normalized = Array.isArray(response.data) ? response.data : (response.data && Array.isArray(response.data.data) ? response.data.data : []);
        console.log('Normalized drivers:', normalized);
        setDrivers(normalized);
        setDriversLoading(false);
      } catch (error) {
        console.error('Errore nel caricamento degli autisti:', error);
        setDriversLoading(false);
      }
    }

    // Carica i dati dei veicoli
    async function fetchVehicles() {
      if (!vehiclesLoading) return;
      
      try {
        const response = await api.get('/vehicles', { withCredentials: true });
        setVehicles(response.data);
        setVehiclesLoading(false);
      } catch (error) {
        console.error('Errore nel caricamento dei veicoli:', error);
        setVehiclesLoading(false);
      }
    }

    // Carica i dati dei cantieri
    async function fetchSites() {
      if (!sitesLoading) return;
      try {
        const response = await api.get('/sites', { withCredentials: true });
        console.log('API /sites response', response.data);
        const normalized = Array.isArray(response.data) ? response.data : (response.data && Array.isArray(response.data.data) ? response.data.data : []);
        console.log('Normalized sites:', normalized);
        setSites(normalized);
        setSitesLoading(false);
      } catch (error) {
        console.error('Errore nel caricamento dei cantieri:', error);
        setSitesLoading(false);
      }
    }

    // Carica i tipi di attività
    async function fetchActivityTypes() {
      if (!activityTypesLoading) return;
      
      try {
        const response = await api.get('/activity-types', { withCredentials: true });
        setActivityTypes(response.data);
        setActivityTypesLoading(false);
      } catch (error) {
        console.error('Errore nel caricamento dei tipi di attività:', error);
        setActivityTypesLoading(false);
      }
    }

    fetchData();
    fetchDrivers();
    fetchVehicles();
    fetchSites();
    fetchActivityTypes();
    // Carica i clienti
    async function fetchClients() {
      try {
        const response = await api.get('/clients', { withCredentials: true });
        console.log('API /clients response', response.data);
        const normalized = Array.isArray(response.data) ? response.data : (response.data && Array.isArray(response.data.data) ? response.data.data : []);
        console.log('Normalized clients:', normalized);
        setClients(normalized);
      } catch (error) {
        console.error('Errore nel caricamento dei clienti:', error);
      }
    }
    fetchClients();
  }, [user, loading, router, fetching, currentDate, driversLoading, vehiclesLoading, sitesLoading, activityTypesLoading]);

  // Formatta la data in formato leggibile
  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('it-IT', options);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="page-header">
        <h1 className="page-title">Agenda Giornaliera</h1>
        
        <div className="nav-buttons">
          <button
            onClick={() => setViewMode('driver')}
            className={`nav-button ${viewMode === 'driver' ? 'active' : ''}`}
          >
            Autisti
          </button>
          <button
            onClick={() => setViewMode('vehicle')}
            className={`nav-button ${viewMode === 'vehicle' ? 'active' : ''}`}
          >
            Veicoli
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`nav-button ${viewMode === 'day' ? 'active' : ''}`}
          >
            Cantieri
          </button>
          <div style={{ position: 'relative' }} ref={exportMenuRef}>
            <button 
              onClick={handleExportClick} 
              className="nav-button"
            >
              Esporta
            </button>
            {showExportMenu && (
              <div className="export-menu" style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'white',
                borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                padding: '8px 0',
                zIndex: 100,
                minWidth: '150px'
              }}>
                <button 
                  onClick={handleExportToExcel}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Esporta in Excel
                </button>
                <button 
                  onClick={handleExportToHTML}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Esporta in HTML
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}

      {/* Pulsante Attività giornaliere */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          style={{ background: '#007aff', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}
          onClick={() => setShowDailyModal(true)}
        >
          Attività giornaliere
        </button>
      </div>

      {/* Modale attività giornaliere */}
      <DailyActivitiesModal
        isOpen={showDailyModal}
        onClose={() => setShowDailyModal(false)}
        date={formatDateISO(currentDate)}
        drivers={drivers}
        vehicles={vehicles}
        sites={sites}
        clients={clients}
        activityTypes={activityTypes}
        activityStates={activityStates}
        onSaveActivity={handleSaveActivity}
        initialRows={getDailyActivities()}
      />
      
      <div className="calendar-container">
        <div className="calendar-header">
          <div className="calendar-navigation">
            <button onClick={goToCurrentDay} className="nav-button current">
              Oggi
            </button>
          </div>
          
          <div className="current-date">
            {formatDate(currentDate)}
          </div>
        </div>
        
        <div className="filters-container">
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Filtra per Cantiere
            </label>
            <select 
              value={selectedSiteId || ''} 
              onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : null)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                fontSize: '0.9rem'
              }}
            >
              <option value="">Tutti i cantieri</option>
              {Array.isArray(sites) && sites.map(site => (
                <option key={site.id} value={site.id}>
                  {site.nome}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Filtra per Autista
            </label>
            <select 
              value={selectedDriverId || ''} 
              onChange={(e) => setSelectedDriverId(e.target.value ? Number(e.target.value) : null)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                fontSize: '0.9rem'
              }}
            >
              <option value="">Tutti gli autisti</option>
              {Array.isArray(drivers) && drivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {`${driver.nome || ''} ${driver.cognome || ''}`.trim()}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Filtra per Veicolo
            </label>
            <select 
              value={selectedVehicleId || ''} 
              onChange={(e) => setSelectedVehicleId(e.target.value ? Number(e.target.value) : null)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                fontSize: '0.9rem'
              }}
            >
              <option value="">Tutti i veicoli</option>
              {Array.isArray(vehicles) && vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.targa || vehicle.modello}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Filtra per Tipo Attività
            </label>
            <select 
              value={selectedActivityTypeId || ''} 
              onChange={(e) => setSelectedActivityTypeId(e.target.value ? Number(e.target.value) : null)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                fontSize: '0.9rem'
              }}
            >
              <option value="">Tutti i tipi</option>
              {Array.isArray(activityTypes) && activityTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.nome || type.name}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-end', 
            paddingBottom: '8px'
          }}>
            <button 
              onClick={() => {
                setSelectedSiteId(null);
                setSelectedDriverId(null);
                setSelectedVehicleId(null);
                setSelectedActivityTypeId(null);
              }}
              style={{ 
                background: '#ff3b30', 
                color: '#fff', 
                borderRadius: '6px', 
                padding: '8px 16px', 
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Resetta Filtri
            </button>
          </div>
        </div>
        
        {fetching ? (
          <div className="loading">Caricamento in corso...</div>
        ) : (
          <WeeklyCalendar
            events={events}
            currentWeek={[currentDate]} // Passa solo il giorno corrente
            onEventClick={handleEventClick}
            onPrevWeek={goToPreviousDay}
            onNextWeek={goToNextDay}
            viewMode={viewMode}
            getEventContent={getEventContent}
            rows={getRows()}
            selectedDate={formatDateISO(currentDate)}
          />
        )}
      </div>
    </div>
  );
}