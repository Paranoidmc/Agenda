"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";

function toDate(val) {
  if (!val) return null;
  if (typeof val === "string" && val.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return new Date(val + "T00:00:00");
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function formatTime(val) {
  const d = toDate(val);
  if (!d) return "";
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function AgendaAutistiPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [date, setDate] = useState(todayISO());
  const [view, setView] = useState("grid"); // 'day' | 'week' | 'grid'
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingActs, setLoadingActs] = useState(false);
  const [error, setError] = useState("");
  const [activitiesByDay, setActivitiesByDay] = useState({}); // { 'YYYY-MM-DD': activities[] }
  const [includeAllStatuses, setIncludeAllStatuses] = useState(false);
  const [driverQuery, setDriverQuery] = useState("");
  const [onlyWithActivities, setOnlyWithActivities] = useState(false); // Cambiato a false per vedere tutti gli autisti di default
  const [loadAllActivities, setLoadAllActivities] = useState(false); // Flag per caricare tutte le attività senza filtro data
  const [driverOrder, setDriverOrder] = useState([]);
  const [hiddenDrivers, setHiddenDrivers] = useState(new Set());
  const [draggedDriverId, setDraggedDriverId] = useState(null);
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Carica anagrafica autisti
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/drivers", { params: { perPage: 9999 } });
        const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        if (mounted) setDrivers(arr);
      } catch (e) {
        console.error("Errore caricamento autisti:", e);
        if (mounted) setDrivers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const weekDays = useMemo(() => {
    if (view !== "week") return [date];
    const center = toDate(date);
    if (!center) return [date];
    // settimana lun-dom contenente la data
    const dayIdx = (center.getDay() + 6) % 7; // lun=0
    const monday = new Date(center);
    monday.setDate(center.getDate() - dayIdx);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, [date, view]);

  // Carica attività per giorno o settimana
  useEffect(() => {
    let mounted = true;
    const fetchForDays = async (days) => {
      setLoadingActs(true);
      setError("");
      try {
        const results = await Promise.all(days.map(async (d) => {
          try {
            const params = new URLSearchParams({ perPage: "500" });
            // Se loadAllActivities è false, aggiungi il filtro per data
            if (!loadAllActivities) {
              params.append("date", String(d));
            }
          params.append("include", "resources,client");
            const url = `/activities?${params.toString()}`;
            console.log(`🔍 Richiesta attività per ${d}:`, url, loadAllActivities ? '(senza filtro data)' : '(con filtro data)');
            const response = await api.get(url, { 
              useCache: false, 
              skipLoadingState: false,
              timeout: 30000 
            });
            console.log(`📥 Risposta API per ${d}:`, {
              status: response.status,
              hasData: !!response.data,
              dataType: typeof response.data,
              isArray: Array.isArray(response.data),
              dataKeys: response.data ? Object.keys(response.data) : [],
              fullResponse: response.data
            });
            
            // Gestisci risposta paginata Laravel
            let items = [];
            if (Array.isArray(response.data)) {
              items = response.data;
            } else if (response.data?.data && Array.isArray(response.data.data)) {
              items = response.data.data;
            } else if (response.data?.items && Array.isArray(response.data.items)) {
              items = response.data.items;
            } else if (response.data?.results && Array.isArray(response.data.results)) {
              items = response.data.results;
            }
            
            console.log(`📅 Caricate ${items.length} attività per ${d}`, items.length > 0 ? items[0] : 'nessuna attività');
            if (items.length > 0) {
              console.log(`📋 Prima attività per ${d}:`, {
                id: items[0].id,
                descrizione: items[0].descrizione,
                data_inizio: items[0].data_inizio,
                data_fine: items[0].data_fine,
                status: items[0].status,
                hasResources: !!items[0].resources,
                resourcesCount: items[0].resources ? items[0].resources.length : 0
              });
            }
          return [d, items];
          } catch (err) {
            console.error(`❌ Errore caricamento attività per ${d}:`, err);
            console.error(`❌ Dettagli errore:`, {
              message: err.message,
              response: err.response?.data,
              status: err.response?.status
            });
            return [d, []]; // Ritorna array vuoto invece di fallire tutto
          }
        }));
        if (!mounted) return;
        const map = {};
        let totalActivities = 0;
        for (const [d, items] of results) {
          map[d] = items;
          totalActivities += items.length;
          console.log(`📊 Giorno ${d}: ${items.length} attività caricate`);
        }
        console.log(`📊 TOTALE attività caricate da API: ${totalActivities}`);
        console.log(`📊 Mappa attività per giorno:`, map);
        setActivitiesByDay(map);
      } catch (e) {
        console.error("Errore generale caricamento attività:", e);
        if (mounted) {
          setError("Impossibile caricare le attività: " + (e?.message || e));
          setActivitiesByDay({});
        }
      } finally {
        if (mounted) setLoadingActs(false);
      }
    };
    fetchForDays(weekDays);
    return () => { mounted = false; };
  }, [weekDays, loadAllActivities]);

  // Listener per eventi di creazione/modifica/cancellazione attività (real-time updates)
  useEffect(() => {
    const handleActivityEvent = () => {
      console.log('🔄 Evento attività ricevuto, ricarico attività...');
      // Ricarica le attività quando cambiano
      const fetchForDays = async (days) => {
        setLoadingActs(true);
        setError("");
        try {
          const results = await Promise.all(days.map(async (d) => {
            try {
              const params = new URLSearchParams({ perPage: "500" });
              if (!loadAllActivities) {
                params.append("date", String(d));
              }
              params.append("include", "resources,client");
              const url = `/activities?${params.toString()}`;
              const response = await api.get(url, { 
                useCache: false, 
                skipLoadingState: false,
                timeout: 30000 
              });
              
              let items = [];
              if (Array.isArray(response.data)) {
                items = response.data;
              } else if (response.data?.data && Array.isArray(response.data.data)) {
                items = response.data.data;
              } else if (response.data?.items && Array.isArray(response.data.items)) {
                items = response.data.items;
              } else if (response.data?.results && Array.isArray(response.data.results)) {
                items = response.data.results;
              }
              
              return [d, items];
            } catch (err) {
              console.error(`❌ Errore caricamento attività per ${d}:`, err);
              return [d, []];
            }
          }));
          
          const map = {};
          for (const [d, items] of results) {
            map[d] = items;
          }
          setActivitiesByDay(map);
        } catch (e) {
          console.error("Errore ricaricamento attività:", e);
          setError("Impossibile ricaricare le attività: " + (e?.message || e));
        } finally {
          setLoadingActs(false);
        }
      };
      
      fetchForDays(weekDays);
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
  }, [weekDays, loadAllActivities]);

  const groupedByDriver = useMemo(() => {
    // Restituisce { driverId: { driver, perDay: { date: [acts] } } }
    const acc = {};
    const allowedStatuses = includeAllStatuses ? null : new Set(['in corso','programmato','assegnato','doc emesso','planned','scheduled','assigned','non assegnato']);
    console.log('🔄 Elaborazione attività per autisti, giorni:', weekDays);
    console.log('📊 Attività per giorno:', Object.keys(activitiesByDay).map(d => `${d}: ${activitiesByDay[d]?.length || 0}`));
    console.log('👥 Totale autisti nel sistema:', drivers.length);
    
    let totalActivitiesProcessed = 0;
    let totalActivitiesWithDrivers = 0;
    
    for (const d of weekDays) {
      const items = activitiesByDay[d] || [];
      const dayStart = toDate(d);
      const dayEnd = toDate(d);
      if (dayStart && dayEnd) {
        dayStart.setHours(0, 0, 0, 0);
        dayEnd.setHours(23, 59, 59, 999);
      }
      
      for (const act of items) {
        totalActivitiesProcessed++;
        const start = act.data_inizio || act.start_date || act.start;
        const end = act.data_fine || act.end_date || act.end;
        // Includi attività che si sovrappongono al giorno (non solo quelle che iniziano oggi)
        const s = toDate(start);
        const e = toDate(end) || (s ? new Date(s.getTime() + 60 * 60 * 1000) : null);
        if (!s || !dayStart || !dayEnd) continue;
        const overlaps = s.getTime() <= dayEnd.getTime() && (e ? e.getTime() : s.getTime()) >= dayStart.getTime();
        if (!overlaps) continue;
        // Filtra per stato se richiesto
        const status = String(act.status || act.stato || '').toLowerCase();
        if (allowedStatuses && status && !allowedStatuses.has(status)) continue;
        
        // DEBUG: Log struttura attività per capire il formato
        if (items.indexOf(act) === 0) {
          console.log('🔍 DEBUG Prima attività:', {
            id: act.id,
            descrizione: act.descrizione,
            hasResources: Array.isArray(act.resources),
            resourcesCount: Array.isArray(act.resources) ? act.resources.length : 0,
            resources: act.resources,
            hasDrivers: Array.isArray(act.drivers),
            driversCount: Array.isArray(act.drivers) ? act.drivers.length : 0,
            drivers: act.drivers,
            driver_id: act.driver_id,
            driver: act.driver,
            totalDrivers: drivers.length
          });
        }
        
        // Supporta multiple fonti di dati driver
        let driverIds = [];
        
        // 1. Prima controlla resources (formato nuovo)
        if (Array.isArray(act.resources) && act.resources.length > 0) {
          console.log(`🔍 Attività ${act.id} ha ${act.resources.length} resources`);
          for (const r of act.resources) {
          const drv = r.driver || (r.driver_id && drivers.find(x => String(x.id) === String(r.driver_id)));
            if (drv) {
              driverIds.push(drv);
              console.log(`✅ Driver trovato in resources: ${drv.nome || drv.name} ${drv.cognome || drv.surname} (ID: ${drv.id})`);
            } else {
              console.warn(`⚠️ Resource senza driver valido:`, r);
            }
          }
        }
        
        // 2. Fallback: controlla drivers array (formato alternativo dal backend)
        if (driverIds.length === 0 && Array.isArray(act.drivers) && act.drivers.length > 0) {
          console.log(`🔍 Attività ${act.id} ha drivers array con ${act.drivers.length} elementi`);
          driverIds = act.drivers.filter(drv => {
            if (!drv || !drv.id) return false;
            // Verifica che il driver esista nella lista
            const found = drivers.find(x => String(x.id) === String(drv.id));
            if (!found) {
              console.warn(`⚠️ Driver ${drv.id} non trovato nella lista autisti`);
              return false;
            }
            return true;
          });
          if (driverIds.length > 0) {
            console.log(`✅ Trovati ${driverIds.length} driver dal drivers array`);
          }
        }
        
        // 3. Fallback: controlla driver_id diretto
        if (driverIds.length === 0 && act.driver_id) {
          console.log(`🔍 Attività ${act.id} ha driver_id diretto: ${act.driver_id}`);
          const drv = drivers.find(x => String(x.id) === String(act.driver_id));
          if (drv) {
            driverIds.push(drv);
            console.log(`✅ Driver trovato da driver_id: ${drv.nome || drv.name} ${drv.cognome || drv.surname}`);
          } else {
            console.warn(`⚠️ Driver con ID ${act.driver_id} non trovato nella lista autisti`);
          }
        }
        
        // 4. Fallback: controlla driver object diretto
        if (driverIds.length === 0 && act.driver && act.driver.id) {
          console.log(`🔍 Attività ${act.id} ha driver object diretto`);
          const drv = drivers.find(x => String(x.id) === String(act.driver.id));
          if (drv) {
            driverIds.push(drv);
            console.log(`✅ Driver trovato da driver object`);
          } else {
            driverIds.push(act.driver); // Aggiungi comunque se ha struttura driver
            console.log(`⚠️ Driver object non trovato nella lista, aggiunto comunque`);
          }
        }
        
        // Aggiungi attività a tutti i driver trovati
        if (driverIds.length > 0) {
          totalActivitiesWithDrivers += driverIds.length;
        }
        for (const drv of driverIds) {
          const key = String(drv.id);
          if (!acc[key]) acc[key] = { driver: drv, perDay: {} };
          // Usa sempre la data formattata come YYYY-MM-DD per la chiave
          const dayKey = d; // d è già in formato YYYY-MM-DD da weekDays
          if (!acc[key].perDay[dayKey]) acc[key].perDay[dayKey] = [];
          // Estrai il nome del cliente
          const clientName = act.client?.nome || act.client?.name || act.cliente?.nome || act.cliente?.name || '';
          acc[key].perDay[dayKey].push({
            id: act.id,
            descrizione: act.descrizione || act.titolo || "",
            clientName: clientName,
            start,
            end,
          });
          console.log(`✅ Attività ${act.id} aggiunta a driver ${key} per giorno ${dayKey} (start: ${start}, end: ${end})`);
          console.log(`   Chiavi perDay disponibili dopo aggiunta:`, Object.keys(acc[key].perDay));
        }
        
        if (driverIds.length === 0) {
          console.warn('⚠️ Attività senza driver assegnato:', {
            id: act.id,
            descrizione: act.descrizione,
            resources: act.resources,
            drivers: act.drivers,
            driver_id: act.driver_id,
            driver: act.driver
          });
        }
      }
    }
    
    console.log('👥 Autisti con attività:', Object.keys(acc).length);
    console.log('📊 Statistiche:', {
      totalActivitiesProcessed,
      totalActivitiesWithDrivers,
      activitiesWithoutDrivers: totalActivitiesProcessed - totalActivitiesWithDrivers
    });
    console.log('📋 Riepilogo:', Object.entries(acc).map(([id, data]) => {
      const name = `${data.driver.nome || data.driver.name || ''} ${data.driver.cognome || data.driver.surname || ''}`.trim();
      const totalActs = Object.values(data.perDay).reduce((sum, acts) => sum + acts.length, 0);
      const perDayDetails = Object.entries(data.perDay).map(([day, acts]) => `${day}: ${acts.length}`).join(', ');
      return `${name}: ${totalActs} attività (${perDayDetails})`;
    }));
    console.log('📋 Dettaglio completo groupedByDriver:', JSON.stringify(acc, null, 2));
    
    return acc;
  }, [activitiesByDay, weekDays, drivers, includeAllStatuses, view]);

  // Costruisce gli slot orari dalle 06:00 alle 18:00, step 30 minuti
  const timeSlots = useMemo(() => {
    const startHour = 6;
    const endHour = 18;
    const slots = [];
    const base = toDate(date);
    if (!base) return slots;
    for (let h = startHour; h <= endHour; h++) {
      for (let m of [0, 30]) {
        if (h === endHour && m > 0) continue; // non superare 18:00
        const d = new Date(base);
        d.setHours(h, m, 0, 0);
        slots.push(d);
      }
    }
    return slots;
  }, [date]);

  // Helper: trova l'attività del driver che copre lo slot specifico
  const getActivityForSlot = useCallback((driverId, slotDate) => {
    // Determina il giorno da cercare: per la vista grid usa il giorno dello slot, per week cerca in tutti i giorni
    const slotDateStr = slotDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const driverIdStr = String(driverId);
    
    // Cerca in tutti i giorni disponibili per questo driver
    const driverData = groupedByDriver[driverIdStr];
    if (!driverData || !driverData.perDay) {
      return null;
    }
    
    // Prova prima con la data dello slot, poi con la data corrente
    let list = driverData.perDay[slotDateStr] || [];
    if (!list.length && slotDateStr !== date) {
      list = driverData.perDay[date] || [];
    }
    
    // Se ancora non trova nulla, prova con tutte le chiavi disponibili
    if (!list.length) {
      const availableDays = Object.keys(driverData.perDay);
      console.log(`🔍 [getActivityForSlot] Driver ${driverIdStr}: cercando slot ${slotDateStr}, date corrente ${date}, giorni disponibili:`, availableDays);
      if (availableDays.length > 0) {
        // Prova a trovare il giorno più vicino o usa il primo disponibile
        // Se lo slot è nello stesso giorno di uno dei giorni disponibili, usa quello
        for (const dayKey of availableDays) {
          const dayKeyDate = toDate(dayKey);
          const slotDateOnly = slotDate.toISOString().slice(0, 10);
          if (dayKeyDate && dayKeyDate.toISOString().slice(0, 10) === slotDateOnly) {
            list = driverData.perDay[dayKey] || [];
            console.log(`✅ [getActivityForSlot] Trovata attività usando chiave ${dayKey} per slot ${slotDateStr}`);
            break;
          }
        }
        // Se ancora non trova, usa il primo giorno disponibile (per ora)
        if (!list.length && availableDays.length > 0) {
          list = driverData.perDay[availableDays[0]] || [];
          console.log(`⚠️ [getActivityForSlot] Usando primo giorno disponibile ${availableDays[0]} per slot ${slotDateStr}`);
        }
      }
    }
    
    // DEBUG: log solo per il primo slot (evita spam)
    const isFirstCheck = slotDate.getHours() === 6 && slotDate.getMinutes() === 0;
    if (isFirstCheck && !getActivityForSlot._logged) {
      const driverData = groupedByDriver[String(driverId)]?.driver;
      console.log('🔍 DEBUG getActivityForSlot chiamata:', {
        driverId,
        driverName: driverData ? `${driverData.nome || driverData.name || ''} ${driverData.cognome || driverData.surname || ''}`.trim() : 'N/A',
        slotDate: slotDate.toISOString(),
        slotDateStr,
        date,
        listLength: list.length,
        hasGroupedDriver: !!groupedByDriver[String(driverId)],
        perDayKeys: groupedByDriver[String(driverId)]?.perDay ? Object.keys(groupedByDriver[String(driverId)].perDay) : [],
        perDayData: groupedByDriver[String(driverId)]?.perDay ? groupedByDriver[String(driverId)].perDay : null,
        fullGroupedByDriver: groupedByDriver
      });
      if (list.length > 0) {
        console.log('📋 Attività trovate per questo driver:', list.map(a => ({
          id: a.id,
          start: a.start,
          end: a.end,
          descrizione: a.descrizione
        })));
      } else {
        console.log('⚠️ Nessuna attività trovata per questo driver in questa data');
        // Verifica tutte le chiavi disponibili
        if (groupedByDriver[String(driverId)]) {
          console.log('🔍 Chiavi disponibili in perDay:', Object.keys(groupedByDriver[String(driverId)].perDay || {}));
          console.log('🔍 Contenuto perDay:', groupedByDriver[String(driverId)].perDay);
        }
      }
      getActivityForSlot._logged = true;
      setTimeout(() => { getActivityForSlot._logged = false; }, 2000);
    }
    
    if (!list.length) return null;
    
    const t = slotDate.getTime();
    const slotDateOnly = slotDate.toISOString().slice(0, 10); // YYYY-MM-DD
    
    for (const a of list) {
      const s = toDate(a.start);
      const e = toDate(a.end) || (s ? new Date(s.getTime() + 60 * 60 * 1000) : null); // default 1h se end mancante
      if (!s) {
        if (isFirstCheck) console.warn('⚠️ Attività senza data_inizio valida:', a);
        continue;
      }
      
      // Verifica che l'attività sia nello stesso giorno dello slot
      const activityDateOnly = s.toISOString().slice(0, 10);
      if (activityDateOnly !== slotDateOnly) {
        if (isFirstCheck) {
          console.log(`⚠️ Data attività (${activityDateOnly}) ≠ slot (${slotDateOnly})`);
        }
        continue;
      }
      
      // Verifica che lo slot si sovrapponga all'attività
      // Lo slot copre 30 minuti, quindi controlliamo se lo slot si sovrappone all'attività
      const startTime = s.getTime();
      // Se data_fine è uguale a data_inizio o mancante, considera l'attività come durata 1 ora
      let endTime = e ? e.getTime() : startTime + 60 * 60 * 1000;
      if (endTime <= startTime) {
        endTime = startTime + 60 * 60 * 1000; // Default 1 ora se fine <= inizio
      }
      
      const slotStartTime = slotDate.getTime();
      const slotEndTime = slotStartTime + (30 * 60 * 1000); // 30 minuti
      
      // Lo slot si sovrappone se: slotStartTime < endTime && slotEndTime > startTime
      // Oppure se lo slot contiene completamente l'attività (per attività istantanee)
      const overlaps = (slotStartTime < endTime && slotEndTime > startTime) || 
                       (slotStartTime <= startTime && slotEndTime >= endTime);
      
      if (isFirstCheck) {
        console.log(`🔍 Verifica slot ${slotDate.toLocaleTimeString()} (${slotStartTime} - ${slotEndTime}) vs attività ${s.toLocaleTimeString()} (${startTime}) - ${e ? e.toLocaleTimeString() : 'N/A'} (${endTime})`);
        console.log(`   Overlap: ${overlaps}`);
      }
      
      if (overlaps) {
        // Usa il nome del cliente invece della descrizione
        const clientName = a.clientName || '';
        if (isFirstCheck) {
          console.log('✅ Attività trovata per questo slot!', { id: a.id, clientName });
        }
        return {
          ...a,
          destinazione: clientName || 'Nessun cliente'
        };
      }
    }
    return null;
  }, [groupedByDriver, date]);

  // Funzione per salvare preferenze globali (solo admin)
  const saveGlobalPreferences = async (order, hidden) => {
    if (!isAdmin) return;
    setSavingPreferences(true);
    try {
      const response = await api.post('/driver-preferences/global', {
        driver_order: order,
        hidden_drivers: Array.from(hidden)
      });
      console.log('✅ Preferenze globali salvate:', response.data);
    } catch (error) {
      console.error('❌ Errore salvataggio preferenze globali:', error);
      // Non bloccare l'operazione se il salvataggio fallisce
    } finally {
      setSavingPreferences(false);
    }
  };

  // Funzione per nascondere/mostrare un autista
  const toggleDriverVisibility = (driverId) => {
    const newHidden = new Set(hiddenDrivers);
    if (newHidden.has(String(driverId))) {
      newHidden.delete(String(driverId));
    } else {
      newHidden.add(String(driverId));
    }
    setHiddenDrivers(newHidden);
    // Salva preferenze globali se admin, altrimenti solo localStorage
    if (isAdmin) {
      saveGlobalPreferences(driverOrder, newHidden);
    } else if (typeof window !== 'undefined') {
      localStorage.setItem('agendaAutistiHidden', JSON.stringify(Array.from(newHidden)));
    }
  };

  // Funzione per ripristinare tutti gli autisti nascosti
  const restoreAllHiddenDrivers = () => {
    const newHidden = new Set();
    setHiddenDrivers(newHidden);
    if (isAdmin) {
      saveGlobalPreferences(driverOrder, newHidden);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('agendaAutistiHidden');
    }
  };

  // Funzioni per drag & drop
  const handleDragStart = (e, driverId) => {
    setDraggedDriverId(String(driverId));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetDriverId) => {
    try {
      e.preventDefault();
      if (!draggedDriverId || draggedDriverId === String(targetDriverId)) {
        setDraggedDriverId(null);
        return;
      }
      
      // Usa l'ordine corrente o costruiscilo dalla lista filtrata corrente
      setDriverOrder(prevOrder => {
        try {
          // Se non c'è ordine salvato, costruiscilo dalla lista attuale
          const currentOrder = prevOrder.length > 0 ? [...prevOrder] : [];
          
          // Se l'ordine non contiene i driver, aggiungili
          const draggedIdStr = String(draggedDriverId);
          const targetIdStr = String(targetDriverId);
          
          if (currentOrder.length === 0) {
            // Costruisci ordine iniziale da tutti i driver (non filtrati)
            currentOrder.push(...drivers.map(d => String(d.id)));
          }
          
          const draggedIndex = currentOrder.findIndex(id => id === draggedIdStr);
          const targetIndex = currentOrder.findIndex(id => id === targetIdStr);
          
          if (draggedIndex === -1 || targetIndex === -1) {
            console.warn('⚠️ Driver non trovato nell\'ordine:', { draggedIdStr, targetIdStr, currentOrder });
            return prevOrder;
          }
          
          // Rimuovi elemento dalla posizione corrente
          const [dragged] = currentOrder.splice(draggedIndex, 1);
          // Inserisci nella nuova posizione
          currentOrder.splice(targetIndex, 0, dragged);
          
          // Salva preferenze globali se admin, altrimenti solo localStorage
          if (isAdmin) {
            saveGlobalPreferences(currentOrder, hiddenDrivers);
          } else if (typeof window !== 'undefined') {
            localStorage.setItem('agendaAutistiOrder', JSON.stringify(currentOrder));
          }
          
          return currentOrder;
        } catch (error) {
          console.error('❌ Errore durante il riordinamento:', error);
          return prevOrder;
        }
      });
      
      setDraggedDriverId(null);
    } catch (error) {
      console.error('❌ Errore durante il drag & drop:', error);
      setDraggedDriverId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedDriverId(null);
  };

  const driverList = useMemo(() => {
    const q = driverQuery.trim().toLowerCase();
    
    // PRIMA applica il filtro di ricerca a tutti gli autisti (se presente)
    let filteredDrivers = drivers;
    if (q) {
      filteredDrivers = drivers.filter(d => {
        const fullName = ((d.nome || d.name || d.first_name || '') + ' ' + (d.cognome || d.surname || d.last_name || '')).trim().toLowerCase();
        return fullName.includes(q);
      });
    }
    
    // Verifica quali autisti hanno attività
    const hasAssignments = new Set(Object.keys(groupedByDriver));
    const withActs = new Set();
    
    console.log('🔍 [driverList] hasAssignments:', Array.from(hasAssignments));
    console.log('🔍 [driverList] groupedByDriver keys:', Object.keys(groupedByDriver));
    console.log('🔍 [driverList] drivers count:', drivers.length);
    
    // Verifica anche direttamente nelle attività per sicurezza
    for (const day of weekDays) {
      const items = activitiesByDay[day] || [];
      const dayStart = toDate(day);
      const dayEnd = toDate(day);
      if (dayStart && dayEnd) {
        dayStart.setHours(0, 0, 0, 0);
        dayEnd.setHours(23, 59, 59, 999);
      }
      for (const act of items) {
        const start = act.data_inizio || act.start_date || act.start;
        const end = act.data_fine || act.end_date || act.end;
        const s = toDate(start);
        const e = toDate(end) || (s ? new Date(s.getTime() + 60 * 60 * 1000) : null);
        if (!s || !dayStart || !dayEnd) continue;
        const overlaps = s.getTime() <= dayEnd.getTime() && (e ? e.getTime() : s.getTime()) >= dayStart.getTime();
        if (!overlaps) continue;
        const status = String(act.status || act.stato || '').toLowerCase();
        const allowedStatuses = includeAllStatuses ? null : new Set(['in corso','programmato','assegnato','doc emesso','planned','scheduled','assigned','non assegnato']);
        if (allowedStatuses && status && !allowedStatuses.has(status)) {
          console.log(`⚠️ Attività ${act.id} esclusa per stato: "${status}"`);
          continue;
        }
        
        // Estrai tutti i driver dalle attività (supporta tutti i formati)
        let driverIds = [];
        if (Array.isArray(act.resources) && act.resources.length > 0) {
          for (const r of act.resources) {
          const drvId = r.driver?.id || r.driver_id;
            if (drvId != null) driverIds.push(String(drvId));
          }
        }
        if (driverIds.length === 0 && Array.isArray(act.drivers) && act.drivers.length > 0) {
          driverIds = act.drivers.map(drv => String(drv?.id || drv)).filter(Boolean);
        }
        if (driverIds.length === 0 && act.driver_id) {
          driverIds.push(String(act.driver_id));
        }
        if (driverIds.length === 0 && act.driver?.id) {
          driverIds.push(String(act.driver.id));
        }
        
        for (const drvId of driverIds) {
          withActs.add(drvId);
        }
      }
    }
    
    // Filtra per attività (se richiesto)
    let list = [];
    console.log('🔍 [driverList] onlyWithActivities:', onlyWithActivities);
    console.log('🔍 [driverList] hasAssignments:', Array.from(hasAssignments));
    console.log('🔍 [driverList] withActs:', Array.from(withActs));
    
    if (q) {
      // Se c'è ricerca, mostra tutti gli autisti filtrati (anche senza attività)
      list = filteredDrivers.filter(d => {
        const hasInGrouped = hasAssignments.has(String(d.id));
        const hasInActivities = withActs.has(String(d.id));
        const hasActivity = hasInGrouped || hasInActivities;
        console.log(`🔍 [driverList] Driver ${d.id} (${d.nome || d.name}): hasInGrouped=${hasInGrouped}, hasInActivities=${hasInActivities}, hasActivity=${hasActivity}`);
        // Se solo con attività è attivo, mostra solo quelli con attività
        if (onlyWithActivities) {
          return hasActivity;
        }
        // Altrimenti mostra tutti (con o senza attività)
        return true;
      });
    } else if (onlyWithActivities) {
      // Mostra solo autisti con attività
      list = filteredDrivers.filter(d => {
        const hasInGrouped = hasAssignments.has(String(d.id));
        const hasInActivities = withActs.has(String(d.id));
        const result = hasInGrouped || hasInActivities;
        console.log(`🔍 [driverList] Driver ${d.id} (${d.nome || d.name}): hasInGrouped=${hasInGrouped}, hasInActivities=${hasInActivities}, result=${result}`);
        return result;
      });
    } else {
      // Mostra tutti gli autisti
      list = filteredDrivers;
    }
    
    console.log('🔍 [driverList] Lista dopo filtro attività:', list.length, 'autisti');
    
    // IMPORTANTE: Se un autista ha attività in groupedByDriver ma non è nella lista drivers,
    // aggiungilo comunque dalla struttura groupedByDriver
    const missingDriversWithActivities = [];
    for (const driverId of hasAssignments) {
      const driverInList = list.find(d => String(d.id) === driverId);
      if (!driverInList) {
        const driverData = groupedByDriver[driverId];
        if (driverData && driverData.driver) {
          missingDriversWithActivities.push(driverData.driver);
          console.log(`✅ [driverList] Aggiunto driver mancante ${driverId} (${driverData.driver.nome || driverData.driver.name}) da groupedByDriver`);
        }
      }
    }
    if (missingDriversWithActivities.length > 0) {
      console.log(`✅ [driverList] Aggiunti ${missingDriversWithActivities.length} autisti con attività non presenti nella lista drivers`);
      list = [...list, ...missingDriversWithActivities];
    }
    
    console.log('🔍 [driverList] Lista dopo aggiunta driver mancanti:', list.length, 'autisti');
    
    // Filtra autisti nascosti
    // IMPORTANTE: Se il filtro "Solo autisti con attività" è attivo, NON filtrare i driver nascosti
    // che hanno attività, perché l'utente vuole vedere i driver con attività anche se erano nascosti
    if (onlyWithActivities) {
      // Se il filtro è attivo, mostra solo i driver con attività (anche se nascosti)
      list = list.filter(d => {
        const hasInGrouped = hasAssignments.has(String(d.id));
        const hasInActivities = withActs.has(String(d.id));
        return hasInGrouped || hasInActivities;
      });
      console.log('🔍 [driverList] Lista dopo filtro attività (con filtro attivo, ignorando nascosti):', list.length, 'autisti');
    } else {
      // Se il filtro NON è attivo, applica il filtro nascosti normalmente
      list = list.filter(d => !hiddenDrivers.has(String(d.id)));
      console.log('🔍 [driverList] Lista dopo filtro nascosti:', list.length, 'autisti');
    }
    console.log('🔍 [driverList] hiddenDrivers:', Array.from(hiddenDrivers));
    
    // Applica ordinamento custom (drag & drop) se presente
    if (driverOrder.length > 0) {
      const orderMap = new Map(driverOrder.map((id, idx) => [String(id), idx]));
      list = [...list].sort((a, b) => {
        const idxA = orderMap.has(String(a.id)) ? orderMap.get(String(a.id)) : Infinity;
        const idxB = orderMap.has(String(b.id)) ? orderMap.get(String(b.id)) : Infinity;
        if (idxA !== Infinity || idxB !== Infinity) {
          return idxA - idxB;
        }
        // Se non in ordine custom, mantieni ordine originale
        return 0;
      });
    }
    
    return list;
  }, [drivers, groupedByDriver, activitiesByDay, weekDays, driverQuery, includeAllStatuses, onlyWithActivities, driverOrder, hiddenDrivers]);
  
  // Aggiorna driverOrder quando cambiano i driver (aggiungi nuovi driver alla fine)
  useEffect(() => {
    if (driverOrder.length === 0 && drivers.length > 0) {
      // Se non c'è ordine salvato e ci sono driver, non fare nulla (mantieni ordine originale)
      return;
    }
    // Se ci sono nuovi driver non nell'ordine, aggiungili alla fine
    const driverIds = new Set(drivers.map(d => String(d.id)));
    const orderSet = new Set(driverOrder);
    const missing = drivers
      .map(d => String(d.id))
      .filter(id => !orderSet.has(id));
    
    if (missing.length > 0) {
      setDriverOrder(prev => [...prev, ...missing]);
    }
  }, [drivers, driverOrder]);

  const goPrev = () => {
    const base = toDate(date);
    if (!base) return;
    if (view === "day") {
      const d = new Date(base); d.setDate(base.getDate() - 1); setDate(d.toISOString().slice(0,10));
    } else {
      const d = new Date(base); d.setDate(base.getDate() - 7); setDate(d.toISOString().slice(0,10));
    }
  };
  const goNext = () => {
    const base = toDate(date);
    if (!base) return;
    if (view === "day") {
      const d = new Date(base); d.setDate(base.getDate() + 1); setDate(d.toISOString().slice(0,10));
    } else {
      const d = new Date(base); d.setDate(base.getDate() + 7); setDate(d.toISOString().slice(0,10));
    }
  };

  if (loading) return <div className="centered">Caricamento...</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Agenda Autisti" showBackButton onBackClick={() => history.back()} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={goPrev} style={btnLight}>{view === 'day' ? '← Giorno prec.' : '← Settimana prec.'}</button>
          <button onClick={goNext} style={btnLight}>{view === 'day' ? 'Giorno succ. →' : 'Settimana succ. →'}</button>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={dateInputStyle} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setView('day')} style={view === 'day' ? btnPrimary : btnLight}>Lista</button>
          <button onClick={() => setView('grid')} style={view === 'grid' ? btnPrimary : btnLight}>Tabella Oraria</button>
          <button onClick={() => setView('week')} style={view === 'week' ? btnPrimary : btnLight}>Settimana</button>
        </div>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
          <input type="checkbox" checked={includeAllStatuses} onChange={e => setIncludeAllStatuses(e.target.checked)} />
          Includi completate/annullate
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
          <input type="checkbox" checked={onlyWithActivities} onChange={e => setOnlyWithActivities(e.target.checked)} />
          Solo autisti con attività
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
          <input type="checkbox" checked={loadAllActivities} onChange={e => setLoadAllActivities(e.target.checked)} />
          Carica tutte le attività (senza filtro data)
        </label>
        {driverOrder.length > 0 && (
          <button
            onClick={() => {
              setDriverOrder([]);
              if (isAdmin) {
                saveGlobalPreferences([], hiddenDrivers);
              } else if (typeof window !== 'undefined') {
                localStorage.removeItem('agendaAutistiOrder');
              }
            }}
            style={{ ...btnLight, fontSize: '12px', padding: '6px 10px' }}
            title="Ripristina ordinamento originale"
            disabled={savingPreferences}
          >
            Reset ordinamento
          </button>
        )}
        {isAdmin && (
          <span style={{ fontSize: '12px', color: '#666', marginLeft: 8 }}>
            {savingPreferences ? '💾 Salvataggio...' : '⚙️ Configurazione globale'}
          </span>
        )}
        {hiddenDrivers.size > 0 && (
          <button
            onClick={restoreAllHiddenDrivers}
            style={{ ...btnLight, fontSize: '12px', padding: '6px 10px' }}
            title={`Ripristina ${hiddenDrivers.size} autista/i nascosto/i`}
          >
            Ripristina nascosti ({hiddenDrivers.size})
          </button>
        )}
        <input
          type="text"
          placeholder="Cerca autista..."
          value={driverQuery}
          onChange={e => setDriverQuery(e.target.value)}
          style={{ ...dateInputStyle, minWidth: 220 }}
        />
      </div>

      {error && <div style={{ color: '#d32f2f', marginBottom: 12 }}>{error}</div>}
      
      {/* Debug info */}
      {!loadingActs && Object.keys(activitiesByDay).length > 0 && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0f0f0', borderRadius: 6, fontSize: '12px' }}>
          <strong>Debug:</strong> Attività caricate: {Object.values(activitiesByDay).reduce((sum, acts) => sum + acts.length, 0)} | 
          Autisti con attività: {Object.keys(groupedByDriver).length} | 
          Autisti visibili: {driverList.length} | 
          Autisti nascosti: {hiddenDrivers.size} {hiddenDrivers.size > 0 && `(${Array.from(hiddenDrivers).join(', ')})`} | 
          Filtro "Solo con attività": {onlyWithActivities ? 'ON' : 'OFF'}
          {hiddenDrivers.size > 0 && (
            <button 
              onClick={restoreAllHiddenDrivers}
              style={{ marginLeft: 8, padding: '4px 8px', fontSize: '11px', background: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              Ripristina tutti
            </button>
          )}
        </div>
      )}

      {view === 'day' ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {loadingActs ? (
            <div style={{ color: '#666' }}>Caricamento impegni...</div>
          ) : driverList.length === 0 ? (
            <div style={{ color: '#666' }}>Nessun autista risulta impegnato per il giorno selezionato.</div>
          ) : (
            driverList.map(d => (
              <div
                key={d.id}
                style={{
                  ...cardStyle,
                  cursor: 'move',
                  opacity: draggedDriverId === String(d.id) ? 0.5 : 1
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, d.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, d.id)}
                onDragEnd={handleDragEnd}
              >
                <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{(d.nome || d.name || d.first_name || '') + ' ' + (d.cognome || d.surname || d.last_name || '')}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDriverVisibility(d.id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      fontSize: '14px',
                      color: '#666',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Nascondi autista"
                  >
                    👁️
                  </button>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {(groupedByDriver[String(d.id)]?.perDay?.[date] || []).map(a => (
                    <li key={a.id}>
                      <a href={`/attivita/${a.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#0b5ed7' }}>
                        {a.clientName || 'Nessun cliente'}
                      </a>
                      {` — ${formatTime(a.start)}${a.end ? ` - ${formatTime(a.end)}` : ''}`}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : view === 'grid' ? (
        <div style={{ 
          overflowX: 'scroll', 
          overflowY: 'scroll', 
          maxHeight: 'calc(100vh - 300px)', 
          position: 'relative',
          direction: 'rtl',
          // Scrollbar sempre visibile e posizionata sopra (a sinistra con rtl)
          scrollbarWidth: 'thin',
          scrollbarColor: '#888 #f1f1f1'
        }} className="custom-scrollbar">
          <style jsx>{`
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: #888 #f1f1f1;
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 12px;
              height: 12px;
              display: block !important;
            }
            .custom-scrollbar::-webkit-scrollbar:vertical {
              display: block !important;
            }
            .custom-scrollbar::-webkit-scrollbar:horizontal {
              display: block !important;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: #f1f1f1;
              display: block !important;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #888;
              border-radius: 6px;
              display: block !important;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #555;
            }
            .custom-scrollbar::-webkit-scrollbar-corner {
              background: #f1f1f1;
              display: block !important;
            }
          `}</style>
          <div style={{ direction: 'ltr', minWidth: `${80 + (driverList.length * 180)}px` }}>
            <table style={{ ...tableStyle, width: 'auto', minWidth: `${80 + (driverList.length * 180)}px` }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, position: 'sticky', left: 0, zIndex: 2, background: '#f8f9fb', minWidth: 80 }}>Ora</th>
                {driverList.map(d => (
                  <th
                    key={d.id}
                    style={{
                      ...thStyle,
                      minWidth: 180,
                      textAlign: 'center',
                      cursor: 'move',
                      opacity: draggedDriverId === String(d.id) ? 0.5 : 1
                    }}
                    title={String(d.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, d.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, d.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <span>{(d.nome || d.name || d.first_name || '') + ' ' + (d.cognome || d.surname || d.last_name || '')}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDriverVisibility(d.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          fontSize: '14px',
                          color: '#666',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Nascondi autista"
                      >
                        👁️
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingActs ? (
                <tr><td style={tdStyle} colSpan={1 + driverList.length}>Caricamento impegni...</td></tr>
              ) : timeSlots.length === 0 ? (
                <tr><td style={tdStyle} colSpan={1 + driverList.length}>Nessuno slot disponibile</td></tr>
              ) : (
                timeSlots.map((slot, idx) => (
                  <tr key={idx}>
                    <td style={{ ...tdStyle, position: 'sticky', left: 0, zIndex: 1, background: '#fff', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'center' }}>
                      {slot.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    {driverList.map(d => {
                        const act = getActivityForSlot(d.id, slot);
                        return (
                          <td key={d.id} style={{ ...tdStyle, minWidth: 180, textAlign: 'center' }}>
                            {act ? (
                              <div style={{ 
                                background: '#e3f2fd', 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                fontSize: '12px',
                                color: '#1976d2',
                                fontWeight: 500,
                                textAlign: 'center'
                              }}>
                                {act.destinazione || act.descrizione || 'Attività'}
                              </div>
                            ) : (
                              <span style={{ color: '#bbb' }}>—</span>
                            )}
                          </td>
                        );
                      })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          <div style={{ marginTop: 8, color: '#666', fontSize: 12, direction: 'ltr' }}>
            Tabella oraria: vengono mostrati tutti gli autisti. Se hanno attività nell'orario, viene mostrata la destinazione.
          </div>
        </div>
      ) : (
        <div style={{ 
          overflowX: 'scroll', 
          overflowY: 'scroll', 
          maxHeight: 'calc(100vh - 300px)', 
          position: 'relative',
          direction: 'rtl',
          // Scrollbar sempre visibile e posizionata sopra (a sinistra con rtl)
          scrollbarWidth: 'thin',
          scrollbarColor: '#888 #f1f1f1'
        }} className="custom-scrollbar">
          <style jsx>{`
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: #888 #f1f1f1;
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 12px;
              height: 12px;
              display: block !important;
            }
            .custom-scrollbar::-webkit-scrollbar:vertical {
              display: block !important;
            }
            .custom-scrollbar::-webkit-scrollbar:horizontal {
              display: block !important;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: #f1f1f1;
              display: block !important;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #888;
              border-radius: 6px;
              display: block !important;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #555;
            }
            .custom-scrollbar::-webkit-scrollbar-corner {
              background: #f1f1f1;
              display: block !important;
            }
          `}</style>
          <div style={{ direction: 'ltr', minWidth: `${80 + (driverList.length * 180)}px` }}>
            <table style={{ ...tableStyle, width: 'auto', minWidth: `${80 + (driverList.length * 180)}px` }}>
            <thead>
              <tr>
                <th style={thStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Autista
                  </div>
                </th>
                {weekDays.map(d => (
                  <th key={d} style={thStyle}>{new Date(d).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {driverList.length === 0 ? (
                <tr><td style={tdStyle} colSpan={1 + weekDays.length}>Nessun autista impegnato nella settimana.</td></tr>
              ) : (
                driverList.map(d => (
                  <tr
                    key={d.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, d.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, d.id)}
                    onDragEnd={handleDragEnd}
                    style={{
                      cursor: 'move',
                      opacity: draggedDriverId === String(d.id) ? 0.5 : 1
                    }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{(d.nome || d.name || d.first_name || '') + ' ' + (d.cognome || d.surname || d.last_name || '')}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDriverVisibility(d.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            fontSize: '14px',
                            color: '#666',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Nascondi autista"
                        >
                          👁️
                        </button>
                      </div>
                    </td>
                    {weekDays.map(day => {
                      const list = (groupedByDriver[String(d.id)]?.perDay?.[day] || []);
                      return (
                        <td key={day} style={tdStyle}>
                          {list.length === 0 ? (
                            <span style={{ color: '#999' }}>—</span>
                          ) : (
                            <ul style={{ margin: 0, paddingLeft: 16 }}>
                              {list.map(a => (
                                <li key={a.id}>
                                  {formatTime(a.start)}{a.end ? `-${formatTime(a.end)}` : ''} ·
                                  {' '}
                                  <a href={`/attivita/${a.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#0b5ed7' }}>
                                    {a.clientName || 'Nessun cliente'}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e5ea',
  borderRadius: 8,
  padding: 12,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  background: "#fff",
  border: "1px solid #e5e5ea",
  borderRadius: 8,
};
const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #e5e5ea",
  background: "#f8f9fb",
  fontWeight: 600,
  fontSize: 13,
  color: "#333",
  whiteSpace: 'nowrap',
};
const tdStyle = {
  padding: "8px 10px",
  borderBottom: "1px solid #f0f0f0",
  verticalAlign: 'top',
};
const btnPrimary = {
  padding: "8px 12px",
  background: "var(--primary)",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};
const btnLight = {
  padding: "8px 12px",
  background: "#f2f2f7",
  color: "#333",
  border: "1px solid #e5e5ea",
  borderRadius: 6,
  cursor: "pointer",
};
const dateInputStyle = {
  padding: "8px 10px",
  border: "1px solid #e5e5ea",
  borderRadius: 6,
};
