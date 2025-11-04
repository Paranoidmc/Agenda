"use client";
import React, { useEffect, useState } from "react";
// ...altro codice

import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import WeeklyCalendar from "../../components/WeeklyCalendar";
import SidePanel from "../../components/SidePanel";
import EntityForm from "../../components/EntityForm";
import { exportCalendarToExcel } from "../../lib/excelExport";
import { exportCalendarToHTML } from "../../lib/htmlExport";
import "../pianificazione/page.css";
import "./page.css";


/**
 * Pagina dell'agenda giornaliera che mostra le attività di un singolo giorno
 */
// Funzione per generare dinamicamente i campi del form attività, come in /attivita/new
function getActivityFields(activityData, clients, sites, drivers, vehicles, activityTypes, handleClientChange) {
  // Filtra i cantieri in base al cliente selezionato
  let filteredSites = sites;
  if (activityData?.client_id) {
    filteredSites = sites.filter(s => String(s.client_id) === String(activityData.client_id));
  }
  return [
    { name: 'descrizione', label: 'Descrizione', type: 'textarea', required: true, value: activityData?.descrizione || '', onChange: handleClientChange },
    { name: 'data_inizio', label: 'Data/Ora Inizio', type: 'datetime-local', required: true, value: activityData?.data_inizio || '', onChange: handleClientChange },
    { name: 'data_fine', label: 'Data/Ora Fine', type: 'datetime-local', required: false, value: activityData?.data_fine || '', onChange: handleClientChange },
    {
      name: 'client_id',
      label: 'Cliente',
      type: 'select',
      isNumeric: true,
      required: true,
      options: Array.isArray(clients) ? clients.map(cliente => ({
        value: cliente.id,
        label: cliente.nome || cliente.name || ''
      })) : [],
      value: activityData?.client_id !== null && activityData?.client_id !== undefined ? activityData.client_id : '',
      onChange: handleClientChange
    },
    {
      name: 'site_id',
      label: 'Sede',
      type: 'select',
      isNumeric: true,
      required: true,
      options: Array.isArray(filteredSites) && filteredSites.length > 0 ? filteredSites.map(site => ({
        value: site.id,
        label: site.nome || site.name || ''
      })) : [{ value: '', label: activityData?.client_id ? 'Nessun cantiere per questo cliente' : 'Seleziona prima un cliente' }],
      disabled: !activityData?.client_id || filteredSites.length === 0,
      value: activityData?.site_id || '',
      onChange: handleClientChange
    },
    {
      name: 'driver_id',
      label: 'Autista',
      type: 'select',
      isNumeric: true,
      required: false,
      options: Array.isArray(drivers) ? drivers.map(driver => ({
        value: driver.id,
        label: `${driver.nome || ''} ${driver.cognome || ''}`.trim()
      })) : [],
      value: activityData?.driver_id || '',
      onChange: handleClientChange
    },
    {
      name: 'vehicle_id',
      label: 'Veicolo',
      type: 'select',
      isNumeric: true,
      required: false,
      options: Array.isArray(vehicles) ? vehicles.map(vehicle => ({
        value: vehicle.id,
        label: `${vehicle.targa || ''} - ${vehicle.marca || ''} ${vehicle.modello || ''}`.trim()
      })) : [],
      value: activityData?.vehicle_id || '',
      onChange: handleClientChange
    },
    {
      name: 'activity_type_id',
      label: 'Tipo Attività',
      type: 'select',
      isNumeric: true,
      required: true,
      options: Array.isArray(activityTypes) ? activityTypes.map(tipo => ({
        value: tipo.id,
        label: tipo.nome || tipo.name || ''
      })) : [],
      value: activityData?.activity_type_id || '',
      onChange: handleClientChange
    },
    {
      name: 'status',
      label: 'Stato',
      type: 'select',
      required: true,
      options: [
        { value: 'non assegnato', label: 'Non assegnato' },
        { value: 'assegnato', label: 'Assegnato' },
        { value: 'doc emesso', label: 'Doc emesso' },
        { value: 'programmato', label: 'Programmato' },
        { value: 'in corso', label: 'In corso' },
        { value: 'completato', label: 'Completato' },
        { value: 'annullato', label: 'Annullato' }
      ],
      value: activityData?.status || '',
      onChange: handleClientChange
    },
    { name: 'note', label: 'Note', type: 'textarea', required: false, value: activityData?.note || '', onChange: handleClientChange }
  ];
}


export default function AgendaGiornalieraPage({ initialDate = null }) {
  // LOG globale: il componente viene renderizzato
  // ...
  // Funzione per gestire il cambio cliente nel form attività
  function handleClientChange(name, value) {
    if (value) {
      setNewActivityData(prev => ({
        ...prev,
        client_id: Number(value),
        site_id: '' // resetta la sede quando cambia cliente
      }));
    } else {
      // Non aggiornare client_id se value è vuoto, lascia quello precedente
      setNewActivityData(prev => ({
        ...prev,
        site_id: ''
      }));
    }
  }
  const [showPanel, setShowPanel] = useState(false);
  const [newActivityData, setNewActivityData] = useState(null);
  const router = useRouter();
  const { user, loading } = useAuth();
  const [events, setEvents] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [viewMode, setViewMode] = useState("day"); // Sempre in modalità giorno
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [sites, setSites] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedActivityTypeId, setSelectedActivityTypeId] = useState(null);
  const [sortBy, setSortBy] = useState('time'); // 'time', 'site', 'activityType'
  const [driversLoading, setDriversLoading] = useState(true);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [activityTypes, setActivityTypes] = useState([]);
  const [activityTypesLoading, setActivityTypesLoading] = useState(true);

  // --- Utility Functions ---
  // Mappa stato attività → colore
  const statusColorMap = {
    "non assegnato": "#3b82f6", // Blu
    "assegnato": "#eab308",     // Giallo
    "doc emesso": "#ef4444",    // Rosso
    "programmato": "#8b5cf6",   // Viola
    "in corso": "#f97316",      // Arancione
    "completato": "#22c55e",    // Verde
    "annullato": "#ec4899"      // Rosa
  };

  const statusTranslationMap = {
    'not assigned': 'non assegnato',
    'assigned': 'assegnato',
    'document issued': 'doc emesso',
    'planned': 'programmato',
    'in progress': 'in corso',
    'in_progress': 'in corso',
    'completed': 'completato',
    'cancelled': 'annullato'
  };

  const normalizeStatus = (status) => {
    if (!status) return 'non assegnato';
    const lowerCaseStatus = status.toLowerCase().replace('_', ' ');
    return statusTranslationMap[lowerCaseStatus] || lowerCaseStatus;
  };
  const activityStates = Object.keys(statusColorMap);

  // Restituisce solo le attività del giorno selezionato
  // Restituisce solo le attività del giorno selezionato - confronta le parti locali della data
  const getDailyActivities = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const d = currentDate.getDate();
    const filtered = events.filter(e => {
      if (e.type !== 'activity' || !e.data?.data_inizio) return false;
      const eventDate = new Date(e.data.data_inizio);
      return (
        eventDate.getFullYear() === y &&
        eventDate.getMonth() === m &&
        eventDate.getDate() === d
      );
    });
    return filtered;
  };

  // Salva attività (creazione o update)
  const handleSaveActivity = async (activityData) => {
    try {
      let activityId;
      // Se esiste un id, aggiorna, altrimenti crea
      if (activityData.id) {
        const response = await api.put(`/activities/${activityData.id}`, activityData, { withCredentials: true });
        activityId = activityData.id;
        
        // Emetti evento per notificare altre pagine
        const activityEvent = new CustomEvent('activityUpdated', {
          detail: { activity_id: activityId, type: 'update' }
        });
        window.dispatchEvent(activityEvent);
      } else {
        const response = await api.post('/activities', activityData, { withCredentials: true });
        activityId = response?.data?.id || response?.data?.data?.id;
        
        // Emetti evento per notificare altre pagine
        const activityEvent = new CustomEvent('activityCreated', {
          detail: { activity_id: activityId, type: 'create' }
        });
        window.dispatchEvent(activityEvent);
      }
      
      // Emetti anche un evento generico per compatibilità
      const genericEvent = new CustomEvent('activitySaved', {
        detail: { activity_id: activityId, type: activityData.id ? 'update' : 'create' }
      });
      window.dispatchEvent(genericEvent);
      
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
    if (deadline.stato === 'non assegnato') return '#3b82f6'; // Blu
    if (deadline.stato === 'assegnato') return '#eab308';     // Giallo
    if (deadline.stato === 'doc emesso') return '#ef4444';    // Rosso
    if (deadline.stato === 'programmato') return '#8b5cf6';   // Viola
    if (deadline.stato === 'in corso') return '#f97316';      // Arancione
    if (deadline.stato === 'programmato') return '#8b5cf6';   // Viola
    if (deadline.stato === 'in corso') return '#f97316';      // Arancione
    if (deadline.stato === 'completato') return '#22c55e';    // Verde
    if (deadline.stato === 'annullato') return '#ec4899';     // Rosa
    return '#6b7280'; // Grigio scuro per default
  }

  // Aggiorna currentDate quando initialDate cambia
  useEffect(() => {
    if (initialDate) {
      setCurrentDate(initialDate);
    }
  }, [initialDate]);

  // Forza il refetch ogni volta che cambia la data selezionata
  useEffect(() => {
    setFetching(true);
  }, [currentDate]);

  // Listener per eventi di attività create/modificate
  useEffect(() => {
    const handleActivityEvent = (event) => {
      console.log('🔄 Ricevuto evento attività in agenda giornaliera:', event.detail);
      // Forza il refetch delle attività
      setFetching(true);
    };

    window.addEventListener('activityCreated', handleActivityEvent);
    window.addEventListener('activityUpdated', handleActivityEvent);
    window.addEventListener('activityDeleted', handleActivityEvent);
    window.addEventListener('activitySaved', handleActivityEvent);

    return () => {
      window.removeEventListener('activityCreated', handleActivityEvent);
      window.removeEventListener('activityUpdated', handleActivityEvent);
      window.removeEventListener('activityDeleted', handleActivityEvent);
      window.removeEventListener('activitySaved', handleActivityEvent);
    };
  }, []);

  // Funzione per andare al giorno precedente
  function goToPreviousDay() {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1, 0, 0, 0, 0));
  }

  function goToNextDay() {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1, 0, 0, 0, 0));
  }

  function goToCurrentDay() {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  }

  // Gestisce il click su un evento
  function handleEventClick(event) {
    
    if (event.type === 'activity' && event.data && event.data.id) {
      router.push(`/attivita?open=${event.data.id}`);
    } else if (event.type === 'deadline' && event.data && event.data.id) {
      router.push(`/scadenze?id=${event.data.id}`);
    } else {
      console.error("Impossibile navigare: dati evento non validi", event);
    }
  }

  // Funzione per ottenere il contenuto dell'evento in base alla vista
  const getEventContent = (event) => {
    // Mostra tutti gli autisti e veicoli associati
    const drivers = Array.isArray(event.driverList) && event.driverList.length > 0
      ? event.driverList.join(', ')
      : (event.driverName || 'N/D');
    const vehicles = Array.isArray(event.vehicleList) && event.vehicleList.length > 0
      ? event.vehicleList.join(', ')
      : (event.vehicleName || 'N/D');

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

    // Contenuto base: mostra TUTTI gli autisti e veicoli
    const baseContent = `${drivers} - ${vehicles}`;

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

  // Filtra solo gli eventi di tipo 'activity' per il giorno corrente usando confronto locale
  const getRows = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const d = currentDate.getDate();
    let activityEvents = events.filter(e => {
      if (e.type !== 'activity' || !e.data?.data_inizio) return false;
      const eventDate = new Date(e.data.data_inizio);
      return (
        eventDate.getFullYear() === y &&
        eventDate.getMonth() === m &&
        eventDate.getDate() === d
      );
    });
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
      activityEvents = activityEvents.filter(e => e.activityTypeId === selectedActivityTypeId || e.data?.activityType?.id === selectedActivityTypeId);
    }
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
  // Estrai tutti gli autisti associati
  let driverList = [];
  if (Array.isArray(activity.drivers)) {
    driverList = activity.drivers.map(d => `${d.nome || d.name || ''} ${d.cognome || d.surname || ''}`.trim());
  } else if (Array.isArray(activity.resources)) {
    driverList = activity.resources.filter(r => r.driver).map(r => `${r.driver.nome || r.driver.name || ''} ${r.driver.cognome || r.driver.surname || ''}`.trim());
  } else if (activity.driver) {
    driverList = [`${activity.driver.nome || activity.driver.name || ''} ${activity.driver.cognome || activity.driver.surname || ''}`.trim()];
  }
  // Estrai tutti i veicoli associati
  let vehicleList = [];
  if (Array.isArray(activity.vehicles)) {
    vehicleList = activity.vehicles.map(v => v.targa || v.plate || v.modello || v.model || 'N/D');
  } else if (Array.isArray(activity.resources)) {
    vehicleList = activity.resources.filter(r => r.vehicle).map(r => r.vehicle.targa || r.vehicle.plate || r.vehicle.modello || r.vehicle.model || 'N/D');
  } else if (activity.vehicle) {
    vehicleList = [activity.vehicle.targa || activity.vehicle.plate || activity.vehicle.modello || activity.vehicle.model || 'N/D'];
  }
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

  // IMPORTANTE: Determina il colore SOLO in base allo stato dell'attività
  if (activity.stato) {
    const stato = activity.stato.toLowerCase();
    if (stato === 'non assegnato') {
      activityColor = '#3b82f6'; // Blu
    } else if (stato === 'assegnato') {
      activityColor = '#eab308'; // Giallo
    } else if (stato === 'doc emesso') {
      activityColor = '#ef4444'; // Rosso
    } else if (stato === 'programmato') {
      activityColor = '#8b5cf6'; // Viola
    } else if (stato === 'in corso') {
      activityColor = '#f97316'; // Arancione
    } else if (stato === 'programmato') {
      activityColor = '#8b5cf6'; // Viola
    } else if (stato === 'in corso') {
      activityColor = '#f97316'; // Arancione
    } else if (stato === 'completato') {
      activityColor = '#22c55e'; // Verde
    } else if (stato === 'annullato') {
      activityColor = '#ec4899'; // Rosa
    }
  }

  // Verifica se l'attività ha un tipo di attività (solo per il nome, non per il colore)
  if (!activity.activityType && activity.activity_type_id && Array.isArray(window.activityTypes)) {
    const tipoAttivita = window.activityTypes.find(tipo => tipo.id === activity.activity_type_id);
    if (tipoAttivita) {
      activity.activityType = {
        id: tipoAttivita.id,
        name: tipoAttivita.name || tipoAttivita.nome,
        nome: tipoAttivita.nome || tipoAttivita.name
      };
    }
  }

  // Ottieni solo il nome del tipo di attività
  if (activity.activityType && (activity.activityType.nome || activity.activityType.name)) {
    activityTypeName = activity.activityType.nome || activity.activityType.name;
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
    driverList,
    vehicleList,
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
        const normalized = Array.isArray(response.data) ? response.data : (response.data && Array.isArray(response.data.data) ? response.data.data : []);
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
        const normalized = Array.isArray(response.data) ? response.data : (response.data && Array.isArray(response.data.data) ? response.data.data : []);
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
        const response = await api.get('/clients', { params: { perPage: 20000 }, withCredentials: true });
        const normalized = Array.isArray(response.data) ? response.data : (response.data && Array.isArray(response.data.data) ? response.data.data : []);
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
          <div style={{ flex: 1 }} />
          <button
            style={{
              background: '#007aff',
              color: '#fff',
              borderRadius: 6,
              padding: '8px 18px',
              fontWeight: 600,
              fontSize: '1rem',
              border: 'none',
              cursor: 'pointer',
              marginLeft: 16
            }}
            onClick={() => {
              router.push('/attivita?new=1');
            }}
          >
            + Nuova Attività
          </button>
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

          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Ordina per
            </label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                fontSize: '0.9rem'
              }}
            >
              <option value="time">Ora</option>
              <option value="site">Cantiere</option>
              <option value="activityType">Tipo Attività</option>
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
           <div className="daily-events">
             {getRows()[0]?.events
  ?.slice()
  .sort((a, b) => {
    switch (sortBy) {
      case 'site':
        const siteA = a.data?.site?.nome || a.siteName || '';
        const siteB = b.data?.site?.nome || b.siteName || '';
        return siteA.localeCompare(siteB);
      case 'activityType':
        const typeA = a.data?.activityType?.nome || a.activityTypeName || '';
        const typeB = b.data?.activityType?.nome || b.activityTypeName || '';
        return typeA.localeCompare(typeB);
      case 'time':
      default:
        const timeA = a.data?.data_inizio || '';
        const timeB = b.data?.data_inizio || '';
        return timeA.localeCompare(timeB);
    }
  })
  .map(event => {
    // Orario compatto (inizio - fine)
    const orario = event.data?.data_inizio
      ? `${new Date(event.data.data_inizio).toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Rome'})}
          ${event.data?.data_fine ? ' - ' + new Date(event.data.data_fine).toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Rome'}) : ''}`.replace(/\s+/g,' ')
      : '';

    const descrizione = event.data?.descrizione || event.data?.description || event.description || '';
    const cliente = event.data?.client?.nome || event.data?.client?.name || event.data?.cliente_nome || 'N/D';
        const nomeSede = event.data?.site?.nome || event.data?.site?.name || event.data?.cantiere_nome;
        const indirizzo = event.data?.site?.address;
    const cantiere = nomeSede ? `${nomeSede}${indirizzo ? `, ${indirizzo}` : ''}` : 'N/D';
    const autisti = Array.isArray(event.driverList) && event.driverList.length > 0 ? event.driverList.join(', ') : 'N/D';
    const veicoli = Array.isArray(event.vehicleList) && event.vehicleList.length > 0 ? event.vehicleList.join(', ') : 'N/D';
    const tipologia = event.data?.activity_type?.name || 'N/D';
    const stato = normalizeStatus(event.data?.status || event.data?.stato);
    return (
      <div
        key={event.id}
        className="daily-event"
        style={(() => {
          const normalizedStatus = normalizeStatus(event.data?.status || event.data?.stato);
          const backgroundColor = statusColorMap[normalizedStatus] || '#f3f4f6'; // Grigio chiaro di default

          // Sfondi scuri che necessitano di testo bianco
          const darkBackgrounds = [
            statusColorMap['non assegnato'],
            statusColorMap['doc emesso'],
            statusColorMap['programmato'],
            statusColorMap['in corso'],
            statusColorMap['completato'],
            statusColorMap['annullato']
          ];

          const color = darkBackgrounds.includes(backgroundColor) ? '#ffffff' : '#111827';

          return {
            background: backgroundColor,
            color: color,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '8px',
            display: 'flex',
            flexDirection: 'column',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          };
        })()}
        onClick={() => handleEventClick(event)}
      >
        <div style={{display:'flex',flexWrap:'wrap',gap:'12px',alignItems:'center'}}>
          <span><strong>Cliente:</strong> {cliente}</span>
          <span><strong>Sede:</strong> {cantiere}</span>
          <span><strong>Descrizione:</strong> {descrizione}</span>
          <span><strong>Orario:</strong> {orario}</span>
          <span><strong>Autisti:</strong> {autisti}</span>
          <span><strong>Veicoli:</strong> {veicoli}</span>
          <span><strong>Tipologia di Attività:</strong> {tipologia}</span>
          <span><strong>Stato:</strong> {stato.charAt(0).toUpperCase()+stato.slice(1)}</span>
        </div>
      </div>
    );
  })}
           </div>
        )}
        {/* SidePanel per nuova attività */}
        <SidePanel isOpen={showPanel} onClose={() => setShowPanel(false)} title="Nuova Attività">
          <EntityForm
            entityType="activity"
            fields={getActivityFields(newActivityData, clients, sites, drivers, vehicles, activityTypes, handleClientChange)}
            initialData={newActivityData}
            isEditing={true}
            onSave={async (data) => {
              await handleSaveActivity(data);
              setShowPanel(false);
            }}
            onCancel={() => setShowPanel(false)}
          />
        </SidePanel>
        
        {/* Legenda degli stati delle attività */}
        <div className="legend-container" style={{ marginTop: '20px' }}>
          <h3 className="legend-title" style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '10px' }}>Legenda Stati Attività</h3>
          <div className="legend-items" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
            {Object.entries(statusColorMap).map(([status, color]) => (
              <div key={status} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="legend-color" style={{ width: '20px', height: '20px', background: color, borderRadius: '4px' }}></div>
                <span className="legend-label" style={{ fontSize: '0.9rem' }}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}