import React, { useState, useEffect } from 'react';
import './WeeklyCalendar.css';

export default function WeeklyCalendar({ 
  events, 
  currentWeek, 
  onEventClick, 
  onPrevWeek,
  onNextWeek,
  viewMode = 'activity',
  onChangeViewMode,
  getEventContent,
  rows,
  selectedDate
}) {
  const cellHeight = 48; // Altezza in pixel per ogni cella oraria


  // Funzione per trovare attività per cella
  function getCellEvents(row, day) {
    const events = row.events.filter(event => sameDay(event.start, day));
    console.log(`DIAGNOSTICA - Eventi per cella (${day.toISOString().split('T')[0]}):`, events.length);
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

  // Formatta la data in formato leggibile
  const formatDate = (date) => {
    const dayName = date.toLocaleDateString('it-IT', { weekday: 'short' }).replace(/^\w/, c => c.toUpperCase());
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
    // Assicuriamoci che event.start e event.end siano oggetti Date validi
    const eventDate = event.start instanceof Date ? event.start : new Date(event.start);
    const eventEndDate = event.end instanceof Date ? event.end : new Date(event.end);
    
    // Debug
    console.log(`Checking event: ${event.title}`, {
      eventDate,
      eventEndDate,
      day,
      hour,
      eventType: event.type
    });
    
    // Verifica se l'evento è nello stesso giorno
    const isSameDay = 
      eventDate.getDate() === day.getDate() && 
      eventDate.getMonth() === day.getMonth() && 
      eventDate.getFullYear() === day.getFullYear();
    
    if (!isSameDay) {
      console.log(`Event ${event.title} is not on the same day`);
      return false;
    }
    
    // Per le scadenze, mostra sempre nella prima riga visibile
    if (event.type === 'deadline') {
      console.log(`Deadline ${event.title} shown at hour ${visibleHours.start}`);
      return hour === visibleHours.start;
    }
    
    // Per le attività, verifica se l'ora corrisponde
    const eventHour = eventDate.getHours();
    // IMPORTANTE: Per la vista settimanale, mostriamo sempre l'evento nella prima ora visibile
    // Questo assicura che tutti gli eventi siano visibili
    if (viewMode === 'activity' || viewMode === 'driver' || viewMode === 'vehicle') {
      return hour === visibleHours.start;
    }
    
    const eventEndHour = eventEndDate.getHours() || eventHour + 1; // Default 1 ora se non specificato
    
    const shouldShow = hour >= eventHour && hour < eventEndHour;
    console.log(`Activity ${event.title} at hour ${hour}: ${shouldShow ? 'SHOWN' : 'HIDDEN'} (${eventHour}-${eventEndHour})`);
    
    return shouldShow;
  };

  // Calcola l'altezza dell'evento in base alla durata
  const getEventHeight = (event) => {
    if (event.type === 'deadline') return `${cellHeight}px`;
    
    // Assicuriamoci che event.start e event.end siano oggetti Date validi
    const eventStart = event.start instanceof Date ? event.start : new Date(event.start);
    const eventEnd = event.end instanceof Date ? event.end : new Date(event.end);
    
    const startHour = eventStart.getHours();
    const endHour = eventEnd.getHours() || startHour + 1;
    const durationHours = endHour - startHour;
    
    // Assicuriamoci che l'altezza sia almeno di 60px (1 ora)
    return `${Math.max(1, durationHours) * 60}px`; // 60px per ora
  };

  // Raggruppa gli eventi per tipo di vista
  const getEventsByView = () => {
    switch (viewMode) {
      case 'driver':
        const driverMap = new Map();
        events.forEach(event => {
          if (event.driverId && event.driverName) {
            if (!driverMap.has(event.driverId)) {
              driverMap.set(event.driverId, {
                id: event.driverId,
                name: event.driverName,
                events: []
              });
            }
            driverMap.get(event.driverId).events.push(event);
          }
        });
        return Array.from(driverMap.values());

      case 'vehicle':
        const vehicleMap = new Map();
        events.forEach(event => {
          if (event.vehicleId && event.vehicleName) {
            if (!vehicleMap.has(event.vehicleId)) {
              vehicleMap.set(event.vehicleId, {
                id: event.vehicleId,
                name: event.vehicleName,
                events: []
              });
            }
            vehicleMap.get(event.vehicleId).events.push(event);
          }
        });
        return Array.from(vehicleMap.values());

      case 'activity':
      default:
        return events.map(event => ({
          id: event.id,
          name: event.title,
          events: [event]
        }));
    }
  };

  // Ottiene gli eventi per un determinato giorno
  const getEventsForDay = (row, day) => {
    const events = row.events.filter(event => sameDay(event.start, day));
    console.log(`DIAGNOSTICA - getEventsForDay (${day.toISOString().split('T')[0]}, ${row.name}):`, events.length);
    return events;
  };

  // Ottiene gli eventi per un determinato giorno e ora
  const getEventsForTimeSlot = (day, hour) => {
    // Aggiungiamo un log per vedere quanti eventi ci sono in totale
    if (hour === 8) {
      console.log(`Totale eventi disponibili per ${day.toDateString()}: ${events.length}`);
      
      // Log degli eventi per questo giorno
      const eventsForDay = events.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate.getDate() === day.getDate() && 
               eventDate.getMonth() === day.getMonth() && 
               eventDate.getFullYear() === day.getFullYear();
      });
      
      console.log(`Eventi per ${day.toDateString()}: ${eventsForDay.length}`, 
        eventsForDay.map(e => ({
          id: e.id,
          title: e.title,
          start: e.start instanceof Date ? e.start.toISOString() : e.start,
          type: e.type
        }))
      );
    }
    
      // IMPORTANTE: Per la vista settimanale, mostriamo sempre l'evento nella prima ora visibile
      // Questo assicura che tutti gli eventi siano visibili
      if (viewMode === 'activity' || viewMode === 'driver' || viewMode === 'vehicle') {
        return hour === visibleHours.start;
      }
      
    // Applica la vista selezionata
    let filteredEvents = events;
    if (viewMode === 'driver') {
      filteredEvents = events.filter(event => event.driverId);
    } else if (viewMode === 'vehicle') {
      filteredEvents = events.filter(event => event.vehicleId);
    } // Altrimenti mostra tutte le attività (activity)
    return filteredEvents.filter(event => {
      const eventStart = event.start instanceof Date ? event.start : new Date(event.start);
      const eventEnd = event.end instanceof Date ? event.end : new Date(event.end);
      // Show event if it covers this hour (start <= hour < end)
      const eventStartHour = eventStart.getHours();
      const eventEndHour = eventEnd.getHours();
      const isSameDay = eventStart.getFullYear() === day.getFullYear() && eventStart.getMonth() === day.getMonth() && eventStart.getDate() === day.getDate();
      const coversHour = isSameDay && hour >= eventStartHour && hour < (eventEndHour === eventStartHour ? eventStartHour + 1 : eventEndHour);
      if (coversHour) {
        console.log(`[DEBUG] Event shown in cell`, {
          eventId: event.id,
          eventTitle: event.title,
          eventStart: eventStart.toISOString(),
          eventEnd: eventEnd.toISOString(),
          cellDay: day.toISOString(),
          cellHour: hour
        });
      }
      return coversHour;
    });
    
    console.log(`DIAGNOSTICA - getEventsForTimeSlot (${day.toISOString().split('T')[0]}, ora ${hour}): eventi filtrati = ${result.length}`);
    return result;
  };



  return (
    <div className="weekly-calendar">
      <div className="calendar-header">
        <button onClick={onPrevWeek}>
          ← Giornata Precedente
        </button>
        <button onClick={onNextWeek}>
          Giornata Successiva →
        </button>
      </div>

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
                  return (
                    <div
                      key={`${rowIndex}-selected`}
                      className="calendar-cell"
                      style={{ display: 'flex', flexDirection: 'column', minHeight: 60 }}
                    >
                      {cellEvents.length === 0 ? (
                        <span style={{ color: '#bbb', fontSize: '0.95em', padding: 8 }}>Nessuna attività</span>
                      ) : (
                        cellEvents.map((event, eventIndex) => {
                          let backgroundColor = '#007aff';
                          if (event.type === 'activity') {
                            if (event.color && event.color.startsWith('#')) backgroundColor = event.color;
                            else if (event.backgroundColor && event.backgroundColor.startsWith('#')) backgroundColor = event.backgroundColor;
                            else if (event.activityTypeColor && event.activityTypeColor.startsWith('#')) backgroundColor = event.activityTypeColor;
                            else if (event.data && event.data.activityType && event.data.activityType.colore && event.data.activityType.colore.startsWith('#')) backgroundColor = event.data.activityType.colore;
                          } else if (event.type === 'deadline') {
                            backgroundColor = event.color || '#ff3b30';
                          }
                          if (!backgroundColor || !backgroundColor.startsWith('#')) backgroundColor = '#007aff';
                          const textColor = getContrastColor(backgroundColor);
                          return (
                            <div
                              key={`${event.id}-${eventIndex}`}
                              className={`event`}
                              style={{
                                backgroundColor: backgroundColor,
                                color: textColor,
                                borderLeft: `3px solid ${backgroundColor}`,
                                borderColor: backgroundColor,
                                borderWidth: '2px',
                                borderStyle: 'solid',
                                whiteSpace: 'pre-line',
                                fontSize: '0.85rem',
                                lineHeight: '1.2',
                                overflow: 'hidden',
                                marginBottom: 6
                              }}
                              onClick={() => onEventClick?.(event)}
                              title={getEventContent(event).replace('\n', ' - ')}
                            >
                              {getEventContent(event)}
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
                  
                  console.log(`DIAGNOSTICA - Cella (${day.toISOString().split('T')[0]}, ${row.name}): ${cellEvents.length} eventi`);
                  
                  return (
                    <div
                      key={`${rowIndex}-${dayIndex}`}
                      className="calendar-cell"
                      style={{ display: 'flex', flexDirection: 'column', minHeight: 60 }}
                    >
                      {cellEvents.length === 0 ? (
                        <span style={{ color: '#bbb', fontSize: '0.95em', padding: 8 }}>Nessuna attività</span>
                      ) : (
                        cellEvents.map((event, eventIndex) => {
                          let backgroundColor = '#007aff';
                          if (event.type === 'activity') {
                            if (event.color && event.color.startsWith('#')) backgroundColor = event.color;
                            else if (event.backgroundColor && event.backgroundColor.startsWith('#')) backgroundColor = event.backgroundColor;
                            else if (event.activityTypeColor && event.activityTypeColor.startsWith('#')) backgroundColor = event.activityTypeColor;
                            else if (event.data && event.data.activityType && event.data.activityType.colore && event.data.activityType.colore.startsWith('#')) backgroundColor = event.data.activityType.colore;
                          } else if (event.type === 'deadline') {
                            backgroundColor = event.color || '#ff3b30';
                          }
                          if (!backgroundColor || !backgroundColor.startsWith('#')) backgroundColor = '#007aff';
                          const textColor = getContrastColor(backgroundColor);
                          return (
                            <div
                              key={`${event.id}-${eventIndex}`}
                              className={`event`}
                              style={{
                                backgroundColor: backgroundColor,
                                color: textColor,
                                borderLeft: `3px solid ${backgroundColor}`,
                                borderColor: backgroundColor,
                                borderWidth: '2px',
                                borderStyle: 'solid',
                                whiteSpace: 'pre-line',
                                fontSize: '0.85rem',
                                lineHeight: '1.2',
                                overflow: 'hidden',
                                marginBottom: 6
                              }}
                              onClick={() => onEventClick?.(event)}
                              title={getEventContent(event).replace('\n', ' - ')}
                            >
                              {getEventContent(event)}
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
