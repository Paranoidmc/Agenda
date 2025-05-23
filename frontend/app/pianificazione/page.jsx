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
import "./page.css";

/**
 * Apple-style planning page replicating Filament's core concepts and data, but with a modern, minimal UI.
 */
export default function PianificazionePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [events, setEvents] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [currentWeek, setCurrentWeek] = useState(getWeekDates(new Date()));
  const [viewMode, setViewMode] = useState("activity"); // 'driver', 'vehicle', 'activity', 'day'
  const [drivers, setDrivers] = useState([]);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyModalDate, setDailyModalDate] = useState(() => {
    // Di default oggi (locale, non UTC)
    const today = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const yyyy = today.getFullYear();
    const mm = pad(today.getMonth() + 1);
    const dd = pad(today.getDate());
    return `${yyyy}-${mm}-${dd}`;
  });
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

  // --- Utility Functions ---
  const activityStates = ["non assegnato", "assegnato", "doc emesso", "programmato", "in corso", "programmato", "in corso", "completato", "annullato"];

  // Restituisce solo le attività del giorno selezionato
  const getDailyActivities = (date) => {
    return events.filter(e => e.type === 'activity' && e.data?.data_inizio?.startsWith(date));
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

  function getWeekDates(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(monday);
      nextDate.setDate(monday.getDate() + i);
      weekDates.push(nextDate);
    }
    return weekDates;
  }

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

  // Funzione per andare alla settimana precedente
  function goToPreviousWeek() {
    const prev = new Date(currentWeek[0]);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeek(getWeekDates(prev));
  }

  // Funzione per andare alla settimana successiva
  function goToNextWeek() {
    const next = new Date(currentWeek[0]);
    next.setDate(next.getDate() + 7);
    setCurrentWeek(getWeekDates(next));
  }

  // Funzione per andare alla settimana corrente
  function goToCurrentWeek() {
    setCurrentWeek(getWeekDates(new Date()));
  }

  // Gestisce il click su un evento
  function handleEventClick(event) {
    console.log("Click su evento:", event);
    
    if (event.type === 'activity' && event.data && event.data.id) {
      console.log(`Navigazione a /attivita/${event.data.id}`);
      router.push(`/attivita?open=${event.data.id}`);
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
    
    // Contenuto base in base alla vista
    let baseContent = '';
    switch (viewMode) {
      case 'driver':
        // Quando visualizziamo per autista, mostriamo cantiere e veicolo
        baseContent = `${event.siteName || 'N/D'} - ${event.vehicleName || 'N/D'}`;
        break;
      
      case 'vehicle':
        // Quando visualizziamo per veicolo, mostriamo autista e cantiere
        baseContent = `${driverFullName} - ${event.siteName || 'N/D'}`;
        break;
      
      case 'activity':
        // Quando visualizziamo per cantiere, mostriamo autista e veicolo
        baseContent = `${driverFullName} - ${event.vehicleName || 'N/D'}`;
        break;
      
      default:
        baseContent = `${driverFullName} - ${event.vehicleName || 'N/D'}`;
    }
    
    // Aggiungi le informazioni sull'attività se disponibili
    return activityInfo ? `${baseContent}\n${activityInfo}` : baseContent;
  };
  
  // Stato per il menu di esportazione
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Funzione per preparare i dati di esportazione
  const prepareExportData = () => {
    // Ottieni il nome del file in base alla modalità di visualizzazione
    let filename = 'Calendario';
    if (viewMode === 'driver') {
      filename = 'Calendario_Autisti';
    } else if (viewMode === 'vehicle') {
      filename = 'Calendario_Veicoli';
    } else {
      filename = 'Calendario_Cantieri';
    }
    
    // Aggiungi la data corrente al nome del file
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // formato YYYY-MM-DD
    filename = `${filename}_${dateStr}`;
    
    // Prepara i filtri applicati
    const filters = {
      driverId: selectedDriverId,
      vehicleId: selectedVehicleId,
      siteId: selectedSiteId,
      activityTypeId: selectedActivityTypeId
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
    
    if (selectedActivityTypeId) {
      const activityType = activityTypes.find(t => t.id === selectedActivityTypeId);
      if (activityType) {
        filters.activityTypeName = activityType.nome || activityType.name;
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
      console.log('Esportazione calendario in Excel con filtri:', filters);
      
      // Esporta il calendario con i filtri
      exportCalendarToExcel(events, viewMode, getRows(), currentWeek, filename, filters);
    } catch (error) {
      console.error('Errore durante l\'esportazione in Excel:', error);
      alert('Si è verificato un errore durante l\'esportazione in Excel. Riprova più tardi.');
    }
  };
  
  // Funzione per esportare il calendario in HTML
  const handleExportToHTML = () => {
    try {
      const { filename, filters } = prepareExportData();
      console.log('Esportazione calendario in HTML con filtri:', filters);
      
      // Esporta il calendario con i filtri
      exportCalendarToHTML(events, viewMode, getRows(), currentWeek, filename, filters);
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
    console.log("DIAGNOSTICA - Totale eventi:", events.length);
    console.log("DIAGNOSTICA - Eventi di tipo activity:", events.filter(e => e.type === 'activity').length);
    console.log("DIAGNOSTICA - Eventi di tipo deadline:", events.filter(e => e.type === 'deadline').length);
    
    if (viewMode === 'day') {
      // Una sola riga che contiene tutte le attività del giorno selezionato
      const dayEvents = events.filter(e => e.type === 'activity' && e.data?.data_inizio?.startsWith(dailyModalDate));
      console.log(`DIAGNOSTICA - Eventi per il giorno ${dailyModalDate}:`, dayEvents.length);
      return [{
        id: 'attivita-giornaliere',
        name: 'Attività del giorno',
        events: dayEvents
      }];
    }
    // Filtra solo gli eventi di tipo 'activity'
    let activityEvents = events.filter(e => e.type === 'activity');
    console.log("DIAGNOSTICA - Activity events dopo il filtro iniziale:", activityEvents.length);
    
    // Applica i filtri in base alle selezioni
    if (selectedSiteId) {
      activityEvents = activityEvents.filter(e => e.siteId === selectedSiteId || e.data?.site?.id === selectedSiteId);
      console.log("DIAGNOSTICA - Activity events dopo filtro per cantiere:", activityEvents.length);
    }
    
    if (selectedDriverId) {
      activityEvents = activityEvents.filter(e => e.driverId === selectedDriverId || e.data?.driver?.id === selectedDriverId);
      console.log("DIAGNOSTICA - Activity events dopo filtro per autista:", activityEvents.length);
    }
    
    if (selectedVehicleId) {
      activityEvents = activityEvents.filter(e => e.vehicleId === selectedVehicleId || e.data?.vehicle?.id === selectedVehicleId);
      console.log("DIAGNOSTICA - Activity events dopo filtro per veicolo:", activityEvents.length);
    }
    
    if (selectedActivityTypeId) {
      activityEvents = activityEvents.filter(e => 
        e.data?.activity_type_id === selectedActivityTypeId || 
        e.data?.activityType?.id === selectedActivityTypeId
      );
      console.log("DIAGNOSTICA - Activity events dopo filtro per tipo attività:", activityEvents.length);
    }
    
    // Determina quali righe mostrare in base alla modalità di visualizzazione e ai filtri
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
        return drivers
          .filter(driver => {
            // Se ci sono filtri per veicolo o cantiere, mostra solo gli autisti con attività che soddisfano i filtri
            if (selectedVehicleId || selectedSiteId) {
              return activityEvents.some(e => e.driverId === driver.id || e.data?.driver?.id === driver.id);
            }
            return true; // Senza filtri, mostra tutti gli autisti
          })
          .map(driver => ({
            id: driver.id,
            name: `${driver.nome || ''} ${driver.cognome || ''}`.trim(),
            events: activityEvents.filter(e => e.driverId === driver.id || e.data?.driver?.id === driver.id)
          }));
      
      case 'vehicle':
        // Se c'è un filtro per veicolo, mostra solo quel veicolo
        if (selectedVehicleId) {
          const vehicle = vehicles.find(v => v.id === selectedVehicleId);
          if (vehicle) {
            return [{
              id: vehicle.id,
              name: vehicle.targa || vehicle.modello || 'Veicolo',
              events: activityEvents
            }];
          }
        }
        
        // Altrimenti mostra tutti i veicoli con attività
        return vehicles
          .filter(vehicle => {
            // Se ci sono filtri per autista o cantiere, mostra solo i veicoli con attività che soddisfano i filtri
            if (selectedDriverId || selectedSiteId) {
              return activityEvents.some(e => e.vehicleId === vehicle.id || e.data?.vehicle?.id === vehicle.id);
            }
            return true; // Senza filtri, mostra tutti i veicoli
          })
          .map(vehicle => ({
            id: vehicle.id,
            name: vehicle.targa || vehicle.modello || 'Veicolo',
            events: activityEvents.filter(e => e.vehicleId === vehicle.id || e.data?.vehicle?.id === vehicle.id)
          }));
      
      case 'activity':
        // IMPORTANTE: Mostra tutte le attività in un'unica riga
        // Questo assicura che tutte le attività siano visibili
        console.log(`DIAGNOSTICA - Mostrando tutte le attività (${activityEvents.length}) in un'unica riga`);
        return [{
          id: 'all-activities',
          name: 'Tutte le attività',
          events: activityEvents
        }];
      
      default:
        return [];
    }
  };

  // Carica gli eventi dal server
  const loadEvents = async () => {
    if (!user) {
      setError("Devi essere autenticato per visualizzare i dati");
      setFetching(false);
      return;
    }
    
    try {
      setFetching(true);
      setError(null);

      // Calcola l'intervallo di date per la richiesta
      const startDate = formatDateISO(currentWeek[0]);
      const endDate = formatDateISO(currentWeek[6]);

      // Carica autisti, veicoli, cantieri e tipi di attività
      const [driversResponse, vehiclesResponse, sitesResponse, activityTypesResponse, clientsResponse] = await Promise.all([
        api.get('/drivers?all=1'),
        api.get('/vehicles'),
        api.get('/sites'),
        api.get('/activity-types'),
        api.get('/clients?all=1'),
      ]);

      // DEBUG: Logga la risposta dei clienti
      console.log('[DEBUG] Risposta API /clients?all=1:', clientsResponse.data);
      let clientsData = [];
      if (Array.isArray(clientsResponse.data)) {
        clientsData = clientsResponse.data;
      } else if (clientsResponse.data && Array.isArray(clientsResponse.data.data)) {
        clientsData = clientsResponse.data.data;
      } else {
        clientsData = [];
        console.warn('[DEBUG] Nessun cliente trovato o struttura inattesa:', clientsResponse.data);
      }
      setClients(clientsData);
      // DEBUG: Logga i dati clienti dopo il set
      setTimeout(() => {
        console.log('[DEBUG] Stato clients dopo setClients:', clientsData);
      }, 0);
      
      console.log('Risposta API /drivers?all=1:', driversResponse.data);
      const driversData = Array.isArray(driversResponse.data) ? driversResponse.data : driversResponse.data?.data || [];
      setDrivers(driversData);
      setDriversLoading(false);
      
      const vehiclesData = Array.isArray(vehiclesResponse.data) ? vehiclesResponse.data : vehiclesResponse.data?.data || [];
      setVehicles(vehiclesData);
      setVehiclesLoading(false);
      
      if (Array.isArray(sitesResponse.data)) {
        setSites(sitesResponse.data);
      } else if (sitesResponse.data && Array.isArray(sitesResponse.data.data)) {
        setSites(sitesResponse.data.data);
      } else {
        setSites([]);
      }
      setSitesLoading(false);
      
      // Imposta i tipi di attività
      setActivityTypes(activityTypesResponse.data);
      setActivityTypesError(null);

      // Carica le attività - richiediamo TUTTE le attività senza paginazione e senza filtri di data
      // IMPORTANTE: Rimuoviamo i filtri di data per assicurarci di ottenere tutte le attività
      const activitiesResponse = await api.get(`/activities?per_page=1000&all=1`);
      
      // Log completo della risposta per debug
      console.log("Risposta completa delle attività:", JSON.stringify(activitiesResponse.data, null, 2));
      
      // DEBUG: logga tutti gli ID attività ricevuti e cerca la 910
      const activitiesRawDebug = Array.isArray(activitiesResponse.data)
        ? activitiesResponse.data
        : (activitiesResponse.data && Array.isArray(activitiesResponse.data.data)
          ? activitiesResponse.data.data
          : []);
      console.log('DEBUG: Tutti gli ID attività ricevuti:', activitiesRawDebug.map(a => a.id));
      const activity910 = activitiesRawDebug.find(a => a.id === 910);
      if (activity910) {
        console.log('DEBUG: Attività 910 trovata:', activity910);
        console.log('DEBUG: data_inizio 910:', activity910.data_inizio);
        console.log('DEBUG: data_fine 910:', activity910.data_fine);
      } else {
        console.warn('DEBUG: Attività 910 NON trovata nella fetch!');
      }
      // Log dei tipi di attività caricati
      console.log("Tipi di attività caricati:", JSON.stringify(activityTypesResponse.data, null, 2));
      
      const activitiesRaw = Array.isArray(activitiesResponse.data)
        ? activitiesResponse.data
        : (activitiesResponse.data && Array.isArray(activitiesResponse.data.data)
          ? activitiesResponse.data.data
          : []);
      
      console.log("DIAGNOSTICA - Numero totale di attività ricevute:", activitiesRaw.length);
      console.log("DIAGNOSTICA - ID delle attività:", activitiesRaw.map(a => a.id).join(", "));
      
      const activities = activitiesRaw.map(activity => {
        console.log(`DIAGNOSTICA - Processando attività ID ${activity.id}:`, {
          data_inizio: activity.data_inizio,
          data_fine: activity.data_fine,
          titolo: activity.titolo,
          stato: activity.stato
        });
        
        // Assicuriamoci che le date siano valide
        let startDate = new Date(activity.data_inizio);
        let endDate = new Date(activity.data_fine || activity.data_inizio);
        
        console.log(`DIAGNOSTICA - Date convertite per attività ${activity.id}:`, {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          startValid: !isNaN(startDate.getTime()),
          endValid: !isNaN(endDate.getTime())
        });
        
        // Se le date non sono valide, usa dei valori predefiniti
        if (isNaN(startDate.getTime())) {
          console.warn(`ATTENZIONE: Data inizio non valida per attività ${activity.id}: ${activity.data_inizio}`);
          startDate = new Date();
          startDate.setHours(9, 0, 0);
        }
        
        if (isNaN(endDate.getTime())) {
          console.warn(`ATTENZIONE: Data fine non valida per attività ${activity.id}: ${activity.data_fine}`);
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
        
        // Inizializza le variabili per il tipo di attività e il colore
        let activityTypeName = 'Attività';
        let activityColor = '#007aff'; // Colore predefinito
        
        // Log dell'attività per debug
        console.log(`Elaborazione attività ${activity.id}:`, JSON.stringify(activity, null, 2));
        
        // Determina il tipo di attività per la visualizzazione
        if (activity.activityType) {
          activityTypeName = activity.activityType.nome || activity.activityType.name || 'Attività';
        } else if (activity.activity_type_id) {
          const tipoAttivita = activityTypesResponse.data.find(tipo => tipo.id === activity.activity_type_id);
          if (tipoAttivita) {
            activityTypeName = tipoAttivita.nome || tipoAttivita.name || 'Attività';
          }
        }
        
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
        
        console.log(`Attività ${activity.id} (${activity.titolo}): tipo = ${activityTypeName}, stato = ${activity.stato}, colore = ${activityColor}`);
        
        console.log(`Creazione evento per attività ${activity.id} con colore ${activityColor}`);
        
        // Mappa colori uniforme con la giornaliera
        const statusColorMap = {
          "non assegnato": "#3b82f6",
          "assegnato": "#eab308",
          "doc emesso": "#ef4444",
          "programmato": "#8b5cf6",
          "in corso": "#f97316",
          "completato": "#22c55e",
          "annullato": "#ec4899"
        };
        const statoNorm = (activity.stato || '').toLowerCase();
        const color = statusColorMap[statoNorm] || '#007aff';
        return {
          id: `activity-${activity.id}`,
          // Visualizzazione compatta come la giornaliera
          title: `${startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} | ${activity.descrizione || activity.titolo || ''} | ${activityTypeName} | ${(activity.client?.nome || activity.client?.name || activity.client_id || '')} | ${(activity.site?.nome || activity.site_id || '')} | ${(activity.driver ? `${activity.driver.nome || ''} ${activity.driver.cognome || ''}`.trim() : 'N/D')} | ${(activity.vehicle?.targa || activity.vehicle_id || 'N/D')} | ${activity.stato || ''}`,
          start: startDate,
          end: endDate,
          type: 'activity',
          color: color,
          backgroundColor: color,
          borderColor: color,
          driverId: activity.driver?.id,
          driverName: activity.driver ? `${activity.driver.nome || ''} ${activity.driver.cognome || ''}`.trim() : 'N/D',
          vehicleId: activity.vehicle?.id,
          vehicleName: activity.vehicle?.targa || 'N/D',
          siteId: activity.site?.id,
          siteName: activity.site?.nome || 'Cantiere non specificato',
          data: activity,
          activityTypeName: activityTypeName,
          activityTypeColor: color
        };

      });
      
      // Carica le scadenze
      const deadlinesResponse = await api.get(`/vehicle-deadlines?start_date=${startDate}&end_date=${endDate}`);
      const deadlines = deadlinesResponse.data.map(deadline => {
        const deadlineDate = new Date(deadline.data_scadenza);
        return {
          id: `deadline-${deadline.id}`,
          title: `${deadline.tipo} - ${deadline.vehicle?.targa || 'Veicolo'}`,
          start: deadlineDate,
          end: deadlineDate,
          type: 'deadline',
          color: getDeadlineColor(deadline),
          data: deadline
        };
      });

      // Combina attività e scadenze
      const allEvents = [...activities, ...deadlines];
      console.log("DIAGNOSTICA - Totale eventi combinati:", allEvents.length);
      console.log("DIAGNOSTICA - Attività dopo la trasformazione:", activities.length);
      console.log("DIAGNOSTICA - Scadenze dopo la trasformazione:", deadlines.length);
      
      // Verifica se ci sono attività per la settimana corrente
      const startOfWeek = currentWeek[0];
      const endOfWeek = currentWeek[6];
      const activitiesInCurrentWeek = activities.filter(activity => {
        const activityDate = new Date(activity.start);
        return activityDate >= startOfWeek && activityDate <= endOfWeek;
      });
      
      console.log("DIAGNOSTICA - Attività nella settimana corrente:", activitiesInCurrentWeek.length);
      console.log("DIAGNOSTICA - Date della settimana:", currentWeek.map(d => d.toISOString().split('T')[0]).join(", "));
      
      if (activitiesInCurrentWeek.length === 0) {
        console.warn("ATTENZIONE: Nessuna attività trovata per la settimana corrente!");
      }
      
      setEvents(allEvents);
    } catch (err) {
      console.error("Errore nel caricamento dati:", err);
      setError(`Errore nel caricamento dati: ${err.message || err}`);
    }
    setFetching(false);
  };

  // Stato per i tipi di attività
  const [activityTypes, setActivityTypes] = useState([]);
  const [activityTypesError, setActivityTypesError] = useState(null);

  // Reset dei filtri quando cambia la modalità di visualizzazione
  useEffect(() => {
    setSelectedSiteId(null);
    setSelectedDriverId(null);
    setSelectedVehicleId(null);
    setSelectedActivityTypeId(null);
  }, [viewMode]);

  // Carica i dati quando cambia la settimana o i filtri
  useEffect(() => {
    if (loading) return; // Wait for auth to be checked
    
    // Debug: check if user is authenticated
    console.log("Auth state:", { user, loading });
    
    if (user) {
      loadEvents();
    } else {
      setActivityTypesError("Devi essere autenticato per visualizzare i dati");
    }
  }, [currentWeek, user, loading, selectedSiteId, selectedDriverId, selectedVehicleId, selectedActivityTypeId]);

  // Componente per la legenda
  function LegendItem({ color, label }) {
    return (
      <div className="legend-item">
        <div className="legend-color" style={{ background: color }}></div>
        <span className="legend-label">{label}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="page-header">
        <h1 className="page-title">Pianificazione</h1>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          
        </div>
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
            onClick={() => setViewMode('activity')}
            className={`nav-button ${viewMode === 'activity' ? 'active' : ''}`}
          >
            Cantieri
          </button>
          <div style={{ position: 'relative', marginLeft: '10px' }} ref={exportMenuRef}>
            <button
              onClick={handleExportClick}
              className="export-button"
              title="Esporta calendario"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: '#34c759',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 12px',
                cursor: 'pointer'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Esporta
            </button>
            
            {showExportMenu && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  backgroundColor: 'white',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  borderRadius: '4px',
                  zIndex: 100,
                  minWidth: '150px',
                  marginTop: '5px'
                }}
              >
                <button
                  onClick={() => {
                    handleExportToExcel();
                    setShowExportMenu(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f7'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#333333', fontWeight: 500 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#217346" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    Excel (.xlsx)
                  </span>
                </button>
                <button
                  onClick={() => {
                    handleExportToHTML();
                    setShowExportMenu(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f7'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#333333', fontWeight: 500 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E44D26" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    HTML (.html)
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Filtri */}
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
              border: '1px solid #ddd' 
            }}
          >
            <option value="">
              {sitesLoading ? 'Caricamento cantieri...' : 'Tutti i cantieri'}
            </option>
            {!sitesLoading && (Array.isArray(sites?.data) ? sites.data : (Array.isArray(sites) ? sites : [])).map(site => (
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
              border: '1px solid #ddd' 
            }}
          >
            <option value="">
              {driversLoading ? 'Caricamento autisti...' : 'Tutti gli autisti'}
            </option>
            {!driversLoading && drivers.map(driver => (
              <option key={driver.id} value={driver.id}>
                {driver.nome} {driver.cognome}
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
              border: '1px solid #ddd' 
            }}
          >
            <option value="">
              {vehiclesLoading ? 'Caricamento veicoli...' : 'Tutti i veicoli'}
            </option>
            {!vehiclesLoading && vehicles.map(vehicle => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.targa} - {vehicle.marca} {vehicle.modello}
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
              border: '1px solid #ddd' 
            }}
          >
            <option value="">
              Tutti i tipi di attività
            </option>
            {activityTypes.map(type => (
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

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : !user ? (
        <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          Devi essere autenticato per visualizzare la pianificazione.
          <button 
            onClick={() => router.push('/login')}
            className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Accedi
          </button>
        </div>
      ) : (
        <div>

          {/* Log per debug */}
      {console.log("DIAGNOSTICA - Rendering WeeklyCalendar con:", {
        totalEvents: events.length,
        activityEvents: events.filter(e => e.type === 'activity').length,
        deadlineEvents: events.filter(e => e.type === 'deadline').length,
        rows: getRows().length,
        rowsWithEvents: getRows().filter(row => row.events.length > 0).length,
        totalEventsInRows: getRows().reduce((sum, row) => sum + row.events.length, 0)
      })}
      
      <WeeklyCalendar
        events={events}
        currentWeek={currentWeek}
        onPrevWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        prevLabel="Settimana Precedente"
        nextLabel="Settimana Successiva"
        viewMode={viewMode}
        onEventClick={event => {
          if (event && event.data && event.data.data_inizio) {
            const dateStr = event.data.data_inizio.substring(0, 10);
            setDailyModalDate(dateStr);
          }
          handleEventClick(event);
        }}
        getEventContent={getEventContent}
        rows={getRows()}
        onDayClick={dateStr => setDailyModalDate(dateStr)}
        selectedDate={dailyModalDate}
      />
        </div>
      )}
      
      {error && !loading && user && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Legenda degli stati delle attività */}
      <div className="legend-container" style={{ marginTop: '20px' }}>
        <h3 className="legend-title" style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '10px' }}>Legenda Stati Attività</h3>
        <div className="legend-items" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
          <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="legend-color" style={{ width: '20px', height: '20px', background: '#3b82f6', borderRadius: '4px' }}></div>
            <span className="legend-label" style={{ fontSize: '0.9rem' }}>Non assegnato</span>
          </div>
          <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="legend-color" style={{ width: '20px', height: '20px', background: '#eab308', borderRadius: '4px' }}></div>
            <span className="legend-label" style={{ fontSize: '0.9rem' }}>Assegnato</span>
          </div>
          <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="legend-color" style={{ width: '20px', height: '20px', background: '#ef4444', borderRadius: '4px' }}></div>
            <span className="legend-label" style={{ fontSize: '0.9rem' }}>Doc emesso</span>
          </div>
          <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="legend-color" style={{ width: '20px', height: '20px', background: '#8b5cf6', borderRadius: '4px' }}></div>
            <span className="legend-label" style={{ fontSize: '0.9rem' }}>Programmato</span>
          </div>
          <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="legend-color" style={{ width: '20px', height: '20px', background: '#f97316', borderRadius: '4px' }}></div>
            <span className="legend-label" style={{ fontSize: '0.9rem' }}>In corso</span>
          </div>
          <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="legend-color" style={{ width: '20px', height: '20px', background: '#22c55e', borderRadius: '4px' }}></div>
            <span className="legend-label" style={{ fontSize: '0.9rem' }}>Completato</span>
          </div>
          <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="legend-color" style={{ width: '20px', height: '20px', background: '#ec4899', borderRadius: '4px' }}></div>
            <span className="legend-label" style={{ fontSize: '0.9rem' }}>Annullato</span>
          </div>
        </div>
      </div>
      <DailyActivitiesModal
        isOpen={showDailyModal}
        onClose={() => setShowDailyModal(false)}
        date={dailyModalDate}
        onChangeDate={setDailyModalDate}
        sites={sites}
        drivers={drivers}
        vehicles={vehicles}
        clients={clients}
        activityTypes={activityTypes || []}
        activityStates={activityStates}
        onSaveActivity={handleSaveActivity}
        initialRows={getDailyActivities(dailyModalDate).map(e => ({
          id: e.data?.id || e.id,
          titolo: e.data?.titolo || '',
          descrizione: e.data?.descrizione || '',
          client_id: e.data?.client_id || e.data?.cliente_id || e.data?.client?.id || '',
          site_id: e.data?.site?.id || e.data?.site_id || '',
          ora: e.data?.data_inizio ? e.data.data_inizio.substring(11,16) : '',
          data_fine: e.data?.data_fine ? e.data.data_fine.substring(11,16) : '',
          driver_id: e.data?.driver?.id || e.data?.driver_id || '',
          vehicle_id: e.data?.vehicle?.id || e.data?.vehicle_id || '',
          stato: e.data?.stato || '',
          activity_type_id: e.data?.activityType?.id || e.data?.activity_type_id || '',
        }))}
      />
    </div>
  );
}
