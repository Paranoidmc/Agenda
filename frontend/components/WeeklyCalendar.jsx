import React, { useState, useEffect } from 'react';
import './WeeklyCalendar.css';

const WEEKLY_ORDER_STORAGE_KEY = 'weeklyCalendarOrders';

const getEventStorageId = (event) => {
  if (!event) return '';
  return String(event?.data?.id ?? event?.id ?? event?.uuid ?? event?.title ?? '');
};

const formatStorageDate = (dateInput) => {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

// Mappa stato attività → colore (come nella giornaliera)
const statusColorMap = {
  "non assegnato": "#3b82f6", // Blu
  "assegnato": "#eab308",     // Giallo
  "doc emesso": "#ef4444",    // Rosso
  "programmato": "#8b5cf6",   // Viola
  "in corso": "#f97316",      // Arancione
  "completato": "#22c55e",    // Verde
  "annullato": "#ec4899"      // Rosa
};

export default function WeeklyCalendar({ 
  events, 
  currentWeek, 
  onEventClick, 
  onPrevWeek,
  onNextWeek,
  viewMode = 'activity',
  onChangeViewMode,
  rows,
  selectedDate
}) {
  const cellHeight = 48; // Altezza in pixel per ogni cella oraria

  const [weeklyOrders, setWeeklyOrders] = useState({});
  const [draggedMeta, setDraggedMeta] = useState(null);
  const [dragOverEventId, setDragOverEventId] = useState(null);
  const [orderUpdateTrigger, setOrderUpdateTrigger] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(WEEKLY_ORDER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          setWeeklyOrders(parsed);
        }
      }
    } catch (error) {
      console.error('Impossibile caricare l\'ordinamento personalizzato del calendario settimanale:', error);
    }
  }, []);

  const persistWeeklyOrders = (updater) => {
    setWeeklyOrders((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater || {};
      if (typeof window !== 'undefined') {
        localStorage.setItem(WEEKLY_ORDER_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };


  // Funzione per trovare attività per cella
  function getCellEvents(row, day) {
    const events = row.events.filter(event => sameDay(event.start, day));
    return events;
  }
  function sameDay(date1, date2) {
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    
    // Verifica se le date sono valide
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      console.warn("ATTENZIONE: Data non valida nel confronto sameDay", { date1, date2 });
      return false;
    }
    
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  }

  const getCellStorageKey = (row, day) => {
    const rowIdentifier = row?.id ?? row?.name ?? row?.label ?? 'row';
    const dayKey = formatStorageDate(day);
    return `${viewMode}-${rowIdentifier}-${dayKey}`;
  };

  const buildBaseCellOrder = (cellKey, currentEvents) => {
    if (!Array.isArray(currentEvents)) return [];
    const currentIds = currentEvents.map((event) => getEventStorageId(event)).filter(Boolean);
    const savedOrder = Array.isArray(weeklyOrders[cellKey]) ? weeklyOrders[cellKey] : [];
    const sanitizedOrder = savedOrder.filter((id) => currentIds.includes(id));
    const missing = currentIds.filter((id) => !sanitizedOrder.includes(id));
    return [...sanitizedOrder, ...missing];
  };

  const orderEventsForCell = React.useCallback((cellEvents, cellKey) => {
    if (!cellEvents || cellEvents.length === 0) return cellEvents;

    const savedOrder = weeklyOrders[cellKey];
    if (!savedOrder || savedOrder.length === 0) {
      return cellEvents;
    }

    const orderedIds = buildBaseCellOrder(cellKey, cellEvents);
    const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]));

    const fallbackSort = (a, b) => {
      const startA = new Date(a.start).getTime() || 0;
      const startB = new Date(b.start).getTime() || 0;
      return startA - startB;
    };

    return [...cellEvents].sort((a, b) => {
      const idA = getEventStorageId(a);
      const idB = getEventStorageId(b);
      const idxA = orderMap.has(idA) ? orderMap.get(idA) : null;
      const idxB = orderMap.has(idB) ? orderMap.get(idB) : null;

      if (idxA !== null && idxB !== null) return idxA - idxB;
      if (idxA !== null) return -1;
      if (idxB !== null) return 1;
      return fallbackSort(a, b);
    });
  }, [weeklyOrders, orderUpdateTrigger]);

  const reorderCellEvents = (currentEvents, cellKey, draggedId, targetId = null, insertAfter = false) => {
    if (!draggedId || !cellKey || !Array.isArray(currentEvents) || currentEvents.length === 0) return;
    
    persistWeeklyOrders((prev) => {
      const baseOrder = buildBaseCellOrder(cellKey, currentEvents);
      const draggedIndex = baseOrder.indexOf(draggedId);
      
      if (draggedIndex === -1) {
        // Se l'elemento trascinato non è nell'ordine, aggiungilo
        baseOrder.push(draggedId);
      } else {
        // Rimuovi l'elemento dalla posizione corrente
        baseOrder.splice(draggedIndex, 1);
      }

      if (targetId) {
        const targetIndex = baseOrder.indexOf(targetId);
        if (targetIndex === -1) {
          baseOrder.push(draggedId);
        } else {
          // Inserisci nella posizione corretta
          const insertIndex = insertAfter ? targetIndex + 1 : targetIndex;
          baseOrder.splice(insertIndex, 0, draggedId);
        }
      } else {
        baseOrder.push(draggedId);
      }

      const newOrders = {
        ...prev,
        [cellKey]: baseOrder
      };
      
      // Forza aggiornamento
      setOrderUpdateTrigger(prev => prev + 1);
      
      return newOrders;
    });
  };

  const handleWeeklyDragStart = (eventObj, row, day) => (e) => {
    const cellKey = getCellStorageKey(row, day);
    const eventId = getEventStorageId(eventObj);
    setDraggedMeta({
      eventId,
      cellKey
    });
    setDragOverEventId(null);
    if (e?.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', eventId);
    }
    // Feedback visivo
    if (e.target) {
      e.target.style.opacity = '0.5';
    }
  };

  const handleWeeklyDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleWeeklyDragEnter = (eventId) => {
    if (draggedMeta) {
      setDragOverEventId(eventId);
    }
  };

  const handleWeeklyDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverEventId(null);
    }
  };

  const handleWeeklyDropOnEvent = (eventObj, row, day, orderedEvents) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedMeta) {
      setDragOverEventId(null);
      return;
    }
    
    const cellKey = getCellStorageKey(row, day);
    if (cellKey !== draggedMeta.cellKey) {
      setDraggedMeta(null);
      setDragOverEventId(null);
      return;
    }
    
    const targetId = getEventStorageId(eventObj);
    if (draggedMeta.eventId === targetId) {
      setDraggedMeta(null);
      setDragOverEventId(null);
      return;
    }
    
    // Determina se inserire prima o dopo in base alla posizione del mouse
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const insertAfter = e.clientY > midpoint;
    
    reorderCellEvents(orderedEvents, cellKey, draggedMeta.eventId, targetId, insertAfter);
    setDraggedMeta(null);
    setDragOverEventId(null);
  };

  const handleWeeklyDropOnCellEnd = (row, day, orderedEvents) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedMeta) {
      setDragOverEventId(null);
      return;
    }
    
    const cellKey = getCellStorageKey(row, day);
    if (cellKey !== draggedMeta.cellKey) {
      setDraggedMeta(null);
      setDragOverEventId(null);
      return;
    }
    
    // Se il drop è su un evento, non fare nulla (gestito da handleWeeklyDropOnEvent)
    if (e.target && e.target.closest && e.target.closest('.event-card')) {
      return;
    }
    
    reorderCellEvents(orderedEvents, cellKey, draggedMeta.eventId, null);
    setDraggedMeta(null);
    setDragOverEventId(null);
  };

  const handleWeeklyDragEnd = (e) => {
    // Ripristina opacità
    if (e.target) {
      e.target.style.opacity = '1';
    }
    setDraggedMeta(null);
    setDragOverEventId(null);
  };

  const [timeSlots, setTimeSlots] = useState([]);
  const [visibleHours, setVisibleHours] = useState({ start: 8, end: 18 });
  const [calendarWidth, setCalendarWidth] = useState('100%');
  
  // Data corrente per evidenziare il giorno attuale
  const today = new Date();
  
  // --- PULSANTI CAMBIO VISTA ---
  const viewButtons = [
    { mode: 'driver', label: 'Autista' },
    { mode: 'vehicle', label: 'Veicolo' },
  ];

  // Genera gli slot orari per la visualizzazione
  useEffect(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(hour);
    }
    setTimeSlots(slots);
  }, []);

  // Funzione robusta per formattare una data stringa o oggetto Date
  const formatDateSafe = (dateInput) => {
    if (!dateInput) return '-';
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return isNaN(d) ? '-' : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Funzione per mostrare i dettagli veicolo in modo robusto
  const formatVehicle = (vehicle) => {
    if (!vehicle || (!vehicle.plate && !vehicle.targa && !vehicle.brand && !vehicle.marca)) return '-';
    const targa = vehicle.plate || vehicle.targa || '';
    const marca = vehicle.brand || vehicle.marca || '';
    const modello = vehicle.model || vehicle.modello || '';
    return `${targa}${marca || modello ? ' - ' : ''}${marca} ${modello}`.trim();
  };

  // Formatta la data in formato leggibile per intestazioni calendario
  const formatDate = (date) => {
    const dayName = date.toLocaleDateString('it-IT', { weekday: 'short' }).replace(/^/, c => c.toUpperCase());
    const dayNumber = date.getDate();
    const month = date.toLocaleDateString('it-IT', { month: 'short' });
    return {
      dayName,
      dayNumber,
      month
    };
  };

  // Formatta l'ora in formato 24h
  const formatHour = (hour) => {
    return hour.toString().padStart(2, '0') + ':00';
  };

  // Calcola il colore di contrasto per il testo
  const getContrastColor = (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? 'black' : 'white';
  };

  // Determina se un evento deve essere visualizzato in un determinato giorno e ora
  const shouldShowEvent = (event, day, hour) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    const isSameDay = eventStart.getFullYear() === day.getFullYear() &&
                    eventStart.getMonth() === day.getMonth() &&
                    eventStart.getDate() === day.getDate();

    if (!isSameDay) {
      return false;
    }

    const startHour = eventStart.getHours();
    const endHour = eventEnd.getHours();
    
    const effectiveEndHour = (endHour === 0 && eventEnd.getMinutes() === 0) ? 24 : endHour;

    return hour >= startHour && hour < effectiveEndHour;
  };

  const getEventsForTimeSlot = (day, hour) => {
    if (!events) {
      return [];
    }
    return events.filter(event => shouldShowEvent(event, day, hour));
  };



  return (
    <div className="weekly-calendar">


      <div className="calendar-grid">
        {/* Header delle colonne */}
        <div className="time-column header">
          {viewMode === 'driver' ? 'Autista' : viewMode === 'vehicle' ? 'Veicolo' : viewMode === 'day' ? 'Attività' : 'Cantiere'}
        </div>
        {viewMode === 'day'
          ? [<div key={selectedDate} className="day-header">
              <span className="day-name">{formatDate(new Date(selectedDate)).dayName}</span>
              <span className="day-number">{formatDate(new Date(selectedDate)).dayNumber}</span>
              <span className="month">{formatDate(new Date(selectedDate)).month}</span>
            </div>]
          : currentWeek.map((day, index) => (
              <div 
                key={index} 
                className="day-header"
              >
                <span className="day-name">{formatDate(day).dayName}</span>
                <span className="day-number">{formatDate(day).dayNumber}</span>
                <span className="month">{formatDate(day).month}</span>
              </div>
            ))}

        {/* Righe per ogni elemento */}
        {rows.map((row, rowIndex) => (
          <React.Fragment key={row.id || rowIndex}>
            {/* Colonna del nome */}
            <div className="time-column">
              {row.name || row.label}
            </div>

            {/* Celle per ogni giorno o solo per il giorno selezionato */}
            {viewMode === 'day'
              ? (() => {
                  const day = new Date(selectedDate);
                  const cellEvents = getCellEvents(row, day);
                  const cellKey = getCellStorageKey(row, day);
                  const orderedEvents = orderEventsForCell(cellEvents, cellKey);
                  return (
                    <div
                      key={`${rowIndex}-selected`}
                      className="calendar-cell"
                      style={{ display: 'flex', flexDirection: 'column', minHeight: 60 }}
                      onDragOver={handleWeeklyDragOver}
                      onDrop={handleWeeklyDropOnCellEnd(row, day, orderedEvents)}
                    >
                      {orderedEvents.length === 0 ? (
                        <span className="no-activity-text">Nessuna attività</span>
                      ) : (
                        orderedEvents.map((event, eventIndex) => {
                          let statusKey = event.status || event.stato || event.data?.status || event.data?.stato;
                          let backgroundColor = statusColorMap[statusKey] || '#6b7280'; // Grigio scuro fallback
                          const textColor = getContrastColor(backgroundColor);
                          const eventId = getEventStorageId(event);
                          const isDragging = draggedMeta?.eventId === eventId && draggedMeta?.cellKey === getCellStorageKey(row, day);
                          const isDragOver = dragOverEventId === eventId && draggedMeta && draggedMeta.eventId !== eventId;
                          
                          return (
                            <div
                              key={`${event.id}-${eventIndex}`}
                              className="event-card"
                              style={{
                                backgroundColor: backgroundColor,
                                color: textColor,
                                borderLeft: `4px solid ${backgroundColor}`,
                                cursor: isDragging ? 'grabbing' : 'grab',
                                opacity: isDragging ? 0.5 : 1,
                                border: isDragOver ? '2px dashed #007aff' : 'none',
                                transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
                                transition: 'all 0.2s ease',
                                boxShadow: isDragOver ? '0 4px 8px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                              draggable
                              onDragStart={handleWeeklyDragStart(event, row, day)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                handleWeeklyDragOver(e);
                                handleWeeklyDragEnter(eventId);
                              }}
                              onDragEnter={() => handleWeeklyDragEnter(eventId)}
                              onDragLeave={handleWeeklyDragLeave}
                              onDrop={handleWeeklyDropOnEvent(event, row, day, orderedEvents)}
                              onDragEnd={handleWeeklyDragEnd}
                              onClick={() => onEventClick?.(event)}
                              title={event.data?.descrizione || event.data?.description || event.description || ''}
                            >
                              <div className="event-header">
                                {(() => {
                                  const startDate = event.start instanceof Date ? event.start : new Date(event.start);
                                  const endDate = event.end instanceof Date ? event.end : new Date(event.end);
                                  const formatTime = d => d && !isNaN(d.getTime()) ? d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
                                  const activityType = event.data?.activityType?.nome || event.data?.activityType?.name || event.activityTypeName || '';
                                  return `${formatTime(startDate)}${formatTime(endDate) ? ' - ' + formatTime(endDate) : ''} ${activityType ? '[' + activityType + ']' : ''}`;
                                })()}
                              </div>
                              <div className="event-title">{event.data?.descrizione || event.data?.description || event.description || ''}</div>
                              <div className="event-details">
                                <span><b>Cliente:</b> {event.data?.client?.nome || event.data?.client?.name || event.clientName || 'N/D'}</span><br/>
                                <span><b>Cantiere:</b> {event.data?.site?.nome || event.data?.site?.name || event.siteName || 'N/D'}</span><br/>
                                <span><b>Autista:</b> {event.driverName || 'N/D'}</span><br/>
                                <span><b>Veicolo:</b> {event.vehicleName || 'N/D'}</span><br/>
                                <span><b>Stato:</b> {event.stato || event.data?.stato || event.data?.status || 'N/D'}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })()
              : currentWeek.map((day, dayIndex) => {
                  // IMPORTANTE: Ottieni tutti gli eventi per questo giorno, non solo quelli che corrispondono all'ora
                  const cellEvents = row.events.filter(event => {
                    // Converti le date in oggetti Date
                    const eventDate = event.start instanceof Date ? event.start : new Date(event.start);
                    
                    // Verifica se la data è valida
                    if (isNaN(eventDate.getTime())) {
                      console.warn(`ATTENZIONE: Data non valida per evento ${event.id}:`, event.start);
                      return false;
                    }
                    
                    // Verifica se l'evento è nello stesso giorno
                    return eventDate.getFullYear() === day.getFullYear() && 
                           eventDate.getMonth() === day.getMonth() && 
                           eventDate.getDate() === day.getDate();
                  });
                  const cellKey = getCellStorageKey(row, day);
                  const orderedEvents = orderEventsForCell(cellEvents, cellKey);
                  
                  
                  return (
                    <div
                      key={`${rowIndex}-${dayIndex}`}
                      className="calendar-cell"
                      style={{ display: 'flex', flexDirection: 'column', minHeight: 60 }}
                      onDragOver={handleWeeklyDragOver}
                      onDrop={handleWeeklyDropOnCellEnd(row, day, orderedEvents)}
                    >
                      {orderedEvents.length === 0 ? (
                        <span className="no-activity-text">Nessuna attività</span>
                      ) : (
                        orderedEvents.map((event, eventIndex) => {
                          let statusKey = event.status || event.stato || event.data?.status || event.data?.stato;
                          let backgroundColor = statusColorMap[statusKey] || '#6b7280'; // Grigio scuro fallback
                          const textColor = getContrastColor(backgroundColor);
                          const eventId = getEventStorageId(event);
                          const isDragging = draggedMeta?.eventId === eventId && draggedMeta?.cellKey === getCellStorageKey(row, day);
                          const isDragOver = dragOverEventId === eventId && draggedMeta && draggedMeta.eventId !== eventId;
                          
                          return (
                            <div
                              key={`${event.id}-${eventIndex}`}
                              className="event-card"
                              style={{
                                backgroundColor: backgroundColor,
                                color: textColor,
                                borderLeft: `4px solid ${backgroundColor}`,
                                cursor: isDragging ? 'grabbing' : 'grab',
                                opacity: isDragging ? 0.5 : 1,
                                border: isDragOver ? '2px dashed #007aff' : 'none',
                                transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
                                transition: 'all 0.2s ease',
                                boxShadow: isDragOver ? '0 4px 8px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                              draggable
                              onDragStart={handleWeeklyDragStart(event, row, day)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                handleWeeklyDragOver(e);
                                handleWeeklyDragEnter(eventId);
                              }}
                              onDragEnter={() => handleWeeklyDragEnter(eventId)}
                              onDragLeave={handleWeeklyDragLeave}
                              onDrop={handleWeeklyDropOnEvent(event, row, day, orderedEvents)}
                              onDragEnd={handleWeeklyDragEnd}
                              onClick={() => onEventClick?.(event)}
                              title={event.data?.descrizione || event.data?.description || event.description || ''}
                            >
                              <div className="event-header">
                                {(() => {
                                  const startDate = event.start instanceof Date ? event.start : new Date(event.start);
                                  const endDate = event.end instanceof Date ? event.end : new Date(event.end);
                                  const formatTime = d => d && !isNaN(d.getTime()) ? d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
                                  const activityType = event.data?.activityType?.nome || event.data?.activityType?.name || event.activityTypeName || '';
                                  return `${formatTime(startDate)}${formatTime(endDate) ? ' - ' + formatTime(endDate) : ''} ${activityType ? '[' + activityType + ']' : ''}`;
                                })()}
                              </div>
                              <div className="event-title">{event.data?.descrizione || event.data?.description || event.description || ''}</div>
                              <div className="event-details">
                                <span><b>Cliente:</b> {event.data?.client?.nome || event.data?.client?.name || event.clientName || 'N/D'}</span><br/>
                                <span><b>Cantiere:</b> {event.data?.site?.nome || event.data?.site?.name || event.siteName || 'N/D'}</span><br/>
                                <span><b>Autista:</b> {event.driverName || 'N/D'}</span><br/>
                                <span><b>Veicolo:</b> {event.vehicleName || 'N/D'}</span><br/>
                                <span><b>Stato:</b> {event.stato || event.data?.stato || event.data?.status || 'N/D'}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })
            }
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
