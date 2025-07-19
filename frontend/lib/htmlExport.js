// Funzione universale per ottenere il colore di un evento (usata sia in HTML che in Excel export)
const STATUS_COLOR_MAP = {
  'non assegnato': '#3b82f6',
  'assegnato': '#eab308',
  'doc emesso': '#ef4444',
  'programmato': '#8b5cf6',
  'programmata': '#8b5cf6',
  'in corso': '#f97316',
  'completato': '#22c55e',
  'completata': '#22c55e',
  'annullato': '#ec4899',
  'annullata': '#ec4899'
};

function getEventColor(event) {
  let color = null;
  // 1. Colore dallo status (se presente)
  let status = (event && event.status) || (event && event.data && event.data.status) || (event && event.stato) || (event && event.data && event.data.stato);
  if (status && typeof status === 'string') {
    const statusKey = status.toLowerCase();
    if (STATUS_COLOR_MAP[statusKey]) {
      color = STATUS_COLOR_MAP[statusKey];
    }
  }
  // 2. Colore principale dell'evento (come nel calendario)
  if (!color && event && event.color && event.color.startsWith('#')) {
    color = event.color;
  } else if (!color && event && event.backgroundColor && event.backgroundColor.startsWith('#')) {
    color = event.backgroundColor;
  } else if (!color && event && event.activityTypeColor && event.activityTypeColor.startsWith('#')) {
    color = event.activityTypeColor;
  } 
  // 3. Colore specifico activity_type (nuova struttura)
  else if (!color && event && event.data && event.data.activity_type && event.data.activity_type.color && event.data.activity_type.color.startsWith('#')) {
    color = event.data.activity_type.color;
  } else if (!color && event && event.data && event.data.activity_type && event.data.activity_type.colore && event.data.activity_type.colore.startsWith('#')) {
    color = event.data.activity_type.colore;
  }
  // 4. Colore activity_type (vecchia struttura)
  else if (!color && event && event.activity_type) {
    if (event.activity_type.color && event.activity_type.color.startsWith('#')) {
      color = event.activity_type.color;
    } else if (event.activity_type.colore && event.activity_type.colore.startsWith('#')) {
      color = event.activity_type.colore;
    }
  }
  // 5. Colore activityType (vecchia struttura)
  else if (!color && event && event.data && event.data.activityType) {
    if (event.data.activityType.color && event.data.activityType.color.startsWith('#')) {
      color = event.data.activityType.color;
    } else if (event.data.activityType.colore && event.data.activityType.colore.startsWith('#')) {
      color = event.data.activityType.colore;
    }
  }
  // 6. Fallback
  if (!color) {
    color = event && event.type === 'deadline' ? '#ff3b30' : '#007aff';
  }
  return color;
}

/**
 * Funzione per esportare il calendario in formato HTML
 * @param {Array} events - Eventi del calendario
 * @param {string} viewMode - Modalità di visualizzazione (driver, vehicle, activity)
 * @param {Array} rows - Righe del calendario
 * @param {Array} currentWeek - Giorni della settimana corrente
 * @param {Object} filters - Filtri applicati (opzionale)
 */
export function exportCalendarToHTML(events, viewMode, rows, currentWeek, filename = 'Calendario', filters = {}) {
  if (!Array.isArray(events) || !Array.isArray(rows) || events.length === 0 || rows.length === 0) {
    alert('Nessun dato da esportare.');
    return;
  }
  if (!filename) filename = 'Calendario';
  filename = filename.replace(/[^a-zA-Z0-9_\-]/g, '_');
  if (!filename.endsWith('.html')) filename += '.html';

  // Funzione per trovare eventi per una risorsa e un giorno specifici
  const findEvents = (row, day) => {
    // Se la riga ha già gli eventi associati (come nella UI), usa quelli
    const sourceEvents = Array.isArray(row.events) ? row.events : events;
    return sourceEvents.filter(event => {
      // Se stiamo usando row.events, non filtrare per id
      if (!Array.isArray(row.events)) {
        if (viewMode === 'driver' && event.driverId !== row.id) return false;
        if (viewMode === 'vehicle' && event.vehicleId !== row.id) return false;
        if (viewMode === 'activity' && event.siteId !== row.id) return false;
        // Applica i filtri
        if (filters.driverId && event.driverId !== filters.driverId) return false;
        if (filters.vehicleId && event.vehicleId !== filters.vehicleId) return false;
        if (filters.siteId && event.siteId !== filters.siteId) return false;
      }
      // Verifica se l'evento è nel giorno corrente
      const eventDate = event.start instanceof Date ? event.start : new Date(event.start);
      return eventDate.getDate() === day.getDate() && 
             eventDate.getMonth() === day.getMonth() && 
             eventDate.getFullYear() === day.getFullYear();
    });
  };
  
  // Funzione per determinare il colore del testo in base al colore di sfondo
  const getContrastColor = (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? 'black' : 'white';
  };
  
  // Crea l'intestazione HTML
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${filename}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4472C4; color: white; text-align: center; }
        .resource-cell { font-weight: bold; background-color: #f5f5f7; }
        .event-cell { height: 80px; vertical-align: top; }
        .event { margin-bottom: 5px; padding: 5px; border-radius: 4px; font-weight: bold; }
        h1 { color: #333; }
        .filters { margin-bottom: 20px; background-color: #f5f5f7; padding: 10px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>${filename}</h1>
  `;
  
  // Aggiungi informazioni sui filtri
  if (Object.keys(filters).length > 0) {
    html += `
      <div class="filters">
        <h2>Filtri applicati</h2>
        <p><strong>Tipo di visualizzazione:</strong> ${viewMode === 'driver' ? 'Autisti' : viewMode === 'vehicle' ? 'Veicoli' : 'Cantieri'}</p>
        <p><strong>Periodo:</strong> Dal ${currentWeek[0].toLocaleDateString('it-IT')} al ${currentWeek[currentWeek.length-1].toLocaleDateString('it-IT')}</p>
        <p><strong>Filtro autista:</strong> ${filters.driverName || 'Tutti'}</p>
        <p><strong>Filtro veicolo:</strong> ${filters.vehicleName || 'Tutti'}</p>
        <p><strong>Filtro cantiere:</strong> ${filters.siteName || 'Tutti'}</p>
      </div>
    `;
  }
  
  // Inizia la tabella
  html += `<table>`;
  
  // Intestazioni della tabella
  html += `<tr><th>Risorsa</th>`;
  currentWeek.forEach(day => {
    const dayName = day.toLocaleDateString('it-IT', { weekday: 'short' }).replace(/^\w/, c => c.toUpperCase());
    const dayNumber = day.getDate();
    const month = day.toLocaleDateString('it-IT', { month: 'short' });
    html += `<th>${dayName} ${dayNumber} ${month}</th>`;
  });
  html += `</tr>`;
  
  // Righe della tabella
  rows.forEach(row => {
    html += `<tr><td class="resource-cell">${row.name || row.label || ''}</td>`;
    
    // Celle per ogni giorno
    currentWeek.forEach(day => {
      const dayEvents = findEvents(row, day);
      
      html += `<td class="event-cell">`;
      
      // Aggiungi gli eventi per questo giorno
      dayEvents.forEach(event => {
        const backgroundColor = getEventColor(event);
        const textColor = getContrastColor(backgroundColor);
        
        html += `
          <div class="event" style="background-color: ${backgroundColor}; color: ${textColor};">
            ${(() => {
              const start = event.start instanceof Date ? event.start : new Date(event.start);
              const end = event.end instanceof Date ? event.end : new Date(event.end);
              const formatTime = d => d && !isNaN(d.getTime()) ? d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
              const activityType = event.data?.activityType?.nome || event.data?.activityType?.name || event.activityTypeName || '';
              const descrizione = event.data?.descrizione || event.data?.description || event.description || '';
              const stato = event.data?.status || event.data?.stato || event.stato || '';
              const driver = event.data?.driver ? `${event.data.driver.nome || ''} ${event.data.driver.cognome || ''}`.trim() : event.driverName || '';
              const veicolo = event.data?.vehicle ? `${event.data.vehicle.targa || ''} ${event.data.vehicle.modello || ''}`.trim() : event.vehicleName || '';
              const cliente = event.data?.client?.nome || event.data?.client?.name || event.clientName || '';
              const cantiere = event.data?.site?.nome || event.data?.site?.name || event.siteName || '';
              return `
                <div><b>${formatTime(start)}${formatTime(end) ? '-' + formatTime(end) : ''}</b> ${activityType}</div>
                <div>${descrizione}</div>
                <div><b>Stato:</b> ${stato}</div>
                <div><b>Autista:</b> ${driver}</div>
                <div><b>Veicolo:</b> ${veicolo}</div>
                <div><b>Cliente:</b> ${cliente}</div>
                <div><b>Cantiere:</b> ${cantiere}</div>
              `;
            })()}
          </div>
        `;
      });
      
      html += `</td>`;
    });
    
    html += `</tr>`;
  });
  
  // Chiudi la tabella e il documento HTML
  html += `
      </table>
    </body>
    </html>
  `;
  
  // Crea un blob con il contenuto HTML
  const blob = new Blob([html], { type: 'text/html' });
  
  // Crea un URL per il blob
  const url = URL.createObjectURL(blob);
  
  // Crea un link per il download
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.html`;
  
  // Aggiungi il link al documento e fai clic su di esso
  document.body.appendChild(a);
  a.click();
  
  // Rimuovi il link e rilascia l'URL
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}