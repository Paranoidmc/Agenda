import * as XLSX from 'xlsx';

/**
 * Esporta i dati in formato Excel con supporto per i colori
 * @param {Array} data - Array di oggetti da esportare
 * @param {Array} columns - Array di configurazione delle colonne
 * @param {string} filename - Nome del file da scaricare
 * @param {string} sheetName - Nome del foglio Excel
 */
export function exportToExcel(data, columns, filename, sheetName = 'Dati') {
  // Crea un array di intestazioni
  const headers = columns.map(col => col.label || col.key);
  
  // Crea un array di righe
  const rows = data.map(item => {
    return columns.map(col => {
      // Se c'è una funzione di rendering, usala per ottenere il valore formattato
      if (col.renderExcel) {
        return col.renderExcel(item);
      }
      
      // Altrimenti, usa il valore diretto o una funzione getter
      if (typeof col.key === 'function') {
        return col.key(item);
      }
      
      // Gestisci chiavi nidificate come 'user.name'
      if (col.key.includes('.')) {
        const keys = col.key.split('.');
        let value = item;
        for (const key of keys) {
          value = value?.[key];
          if (value === undefined) break;
        }
        return value || '';
      }
      
      return item[col.key] || '';
    });
  });
  
  // Crea un array con intestazioni e righe
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Aggiungi stili alle celle
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Imposta la larghezza delle colonne
  const colWidths = columns.map(col => ({ wch: col.width || 15 }));
  worksheet['!cols'] = colWidths;
  
  // Crea il file Excel e avvia il download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Versione avanzata che supporta colori e formattazione
 * @param {Array} data - Array di oggetti da esportare
 * @param {Array} columns - Array di configurazione delle colonne con stili
 * @param {string} filename - Nome del file da scaricare
 * @param {string} sheetName - Nome del foglio Excel
 * @param {Object} options - Opzioni aggiuntive
 */
export function exportToExcelAdvanced(data, columns, filename, sheetName = 'Dati', options = {}) {
  // Crea un array di intestazioni
  const headers = columns.map(col => col.label || col.key);
  
  // Prepara i dati per l'esportazione
  const excelData = [headers];
  
  // Aggiungi le righe di dati
  data.forEach(item => {
    const row = columns.map(col => {
      if (col.renderExcel) {
        return col.renderExcel(item);
      }
      
      if (typeof col.key === 'function') {
        return col.key(item);
      }
      
      if (col.key.includes('.')) {
        const keys = col.key.split('.');
        let value = item;
        for (const key of keys) {
          value = value?.[key];
          if (value === undefined) break;
        }
        return value || '';
      }
      
      return item[col.key] || '';
    });
    
    excelData.push(row);
  });
  
  // Crea il foglio di lavoro
  const worksheet = XLSX.utils.aoa_to_sheet(excelData);
  
  // Imposta gli stili per le intestazioni
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "4472C4" } },
    alignment: { horizontal: "center" }
  };
  
  // Applica stili alle intestazioni
  for (let i = 0; i < headers.length; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!worksheet[cellRef]) worksheet[cellRef] = {};
    worksheet[cellRef].s = headerStyle;
  }
  
  // Applica stili alle righe di dati
  data.forEach((item, rowIndex) => {
    columns.forEach((col, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
      
      // Inizializza lo stile della cella se non esiste
      if (!worksheet[cellRef]) worksheet[cellRef] = {};
      if (!worksheet[cellRef].s) worksheet[cellRef].s = {};
      
      // Applica stili personalizzati se definiti
      if (col.getCellStyle) {
        const customStyle = col.getCellStyle(item);
        if (customStyle) {
          worksheet[cellRef].s = { ...worksheet[cellRef].s, ...customStyle };
        }
      }
      
      // Applica stili per tipi specifici
      if (col.type === 'date') {
        worksheet[cellRef].s = { 
          ...worksheet[cellRef].s,
          numFmt: 'dd/mm/yyyy'
        };
      } else if (col.type === 'currency') {
        worksheet[cellRef].s = { 
          ...worksheet[cellRef].s,
          numFmt: '€#,##0.00'
        };
      }
    });
  });
  
  // Imposta la larghezza delle colonne
  const colWidths = columns.map(col => ({ wch: col.width || 15 }));
  worksheet['!cols'] = colWidths;
  
  // Crea il workbook e aggiungi il foglio
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Crea il file Excel e avvia il download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Funzione per esportare i dati del calendario in Excel
 * @param {Array} events - Eventi del calendario
 * @param {string} viewMode - Modalità di visualizzazione (driver, vehicle, activity)
 * @param {Array} rows - Righe del calendario
 * @param {Array} currentWeek - Giorni della settimana corrente
 * @param {Object} filters - Filtri applicati (opzionale)
 */
export function exportCalendarToExcel(events, viewMode, rows, currentWeek, filename = 'Calendario', filters = {}) {
  // Crea un array di intestazioni con i giorni della settimana
  const headers = ['Risorsa', ...currentWeek.map(day => {
    const dayName = day.toLocaleDateString('it-IT', { weekday: 'short' }).replace(/^\w/, c => c.toUpperCase());
    const dayNumber = day.getDate();
    const month = day.toLocaleDateString('it-IT', { month: 'short' });
    return `${dayName} ${dayNumber} ${month}`;
  })];
  
  // Funzione per trovare eventi per una risorsa e un giorno specifici
  const findEvents = (row, day) => {
    return events.filter(event => {
      // Verifica se l'evento appartiene alla risorsa corrente
      if (viewMode === 'driver' && event.driverId !== row.id) return false;
      if (viewMode === 'vehicle' && event.vehicleId !== row.id) return false;
      if (viewMode === 'activity' && event.siteId !== row.id) return false;
      
      // Applica i filtri
      if (filters.driverId && event.driverId !== filters.driverId) return false;
      if (filters.vehicleId && event.vehicleId !== filters.vehicleId) return false;
      if (filters.siteId && event.siteId !== filters.siteId) return false;
      
      // Verifica se l'evento è nel giorno corrente
      const eventDate = event.start instanceof Date ? event.start : new Date(event.start);
      return eventDate.getDate() === day.getDate() && 
             eventDate.getMonth() === day.getMonth() && 
             eventDate.getFullYear() === day.getFullYear();
    });
  };
  
  // Funzione per ottenere il colore di un evento
  const getEventColor = (event) => {
    // Controlla tutte le possibili proprietà di colore
    let color = null;
    
    // Controlla le proprietà dirette
    if (event.color && event.color.startsWith('#')) {
      color = event.color;
    } else if (event.backgroundColor && event.backgroundColor.startsWith('#')) {
      color = event.backgroundColor;
    } else if (event.activityTypeColor && event.activityTypeColor.startsWith('#')) {
      color = event.activityTypeColor;
    }
    
    // Controlla le proprietà nidificate
    else if (event.data) {
      if (event.data.color && event.data.color.startsWith('#')) {
        color = event.data.color;
      } else if (event.data.backgroundColor && event.data.backgroundColor.startsWith('#')) {
        color = event.data.backgroundColor;
      } else if (event.data.activityType) {
        if (event.data.activityType.color && event.data.activityType.color.startsWith('#')) {
          color = event.data.activityType.color;
        } else if (event.data.activityType.colore && event.data.activityType.colore.startsWith('#')) {
          color = event.data.activityType.colore;
        }
      }
    }
    
    // Usa un colore predefinito se non è stato trovato un colore valido
    if (!color) {
      color = event.type === 'deadline' ? '#ff3b30' : '#007aff';
    }
    
    // Rimuovi il carattere # e restituisci il colore
    return color.replace('#', '');
  };
  
  // Prepara i dati per l'esportazione
  const excelData = [headers];
  
  // Aggiungi le righe di dati
  rows.forEach(row => {
    const rowData = [row.name];
    
    // Aggiungi una cella per ogni giorno della settimana
    currentWeek.forEach(day => {
      const dayEvents = findEvents(row, day);
      if (dayEvents.length === 0) {
        rowData.push('');
      } else {
        // Concatena i titoli degli eventi
        rowData.push(dayEvents.map(event => event.title).join('\n'));
      }
    });
    
    excelData.push(rowData);
  });
  
  // Crea il foglio di lavoro
  const worksheet = XLSX.utils.aoa_to_sheet(excelData);
  
  // Imposta gli stili per le intestazioni
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { patternType: 'solid', fgColor: { rgb: "4472C4" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: "CCCCCC" } },
      bottom: { style: 'thin', color: { rgb: "CCCCCC" } },
      left: { style: 'thin', color: { rgb: "CCCCCC" } },
      right: { style: 'thin', color: { rgb: "CCCCCC" } }
    }
  };
  
  // Applica stili alle intestazioni
  for (let i = 0; i < headers.length; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!worksheet[cellRef]) worksheet[cellRef] = {};
    worksheet[cellRef].s = headerStyle;
  }
  
  // Applica stili alle celle con eventi
  rows.forEach((row, rowIndex) => {
    // Stile per la colonna delle risorse
    const resourceCellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: 0 });
    if (!worksheet[resourceCellRef]) worksheet[resourceCellRef] = {};
    worksheet[resourceCellRef].s = {
      font: { bold: true },
      alignment: { vertical: "center" },
      border: {
        top: { style: 'thin', color: { rgb: "CCCCCC" } },
        bottom: { style: 'thin', color: { rgb: "CCCCCC" } },
        left: { style: 'thin', color: { rgb: "CCCCCC" } },
        right: { style: 'thin', color: { rgb: "CCCCCC" } }
      },
      fill: { patternType: 'solid', fgColor: { rgb: "F5F5F7" } }
    };
    
    // Stile per le celle dei giorni
    currentWeek.forEach((day, dayIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: dayIndex + 1 });
      if (!worksheet[cellRef]) worksheet[cellRef] = {};
      
      // Imposta lo stile di base
      worksheet[cellRef].s = {
        alignment: { vertical: "center", wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: "CCCCCC" } },
          bottom: { style: 'thin', color: { rgb: "CCCCCC" } },
          left: { style: 'thin', color: { rgb: "CCCCCC" } },
          right: { style: 'thin', color: { rgb: "CCCCCC" } }
        }
      };
      
      // Aggiungi colore di sfondo se ci sono eventi
      const dayEvents = findEvents(row, day);
      if (dayEvents.length > 0) {
        // Ottieni il colore del primo evento
        const rgbColor = getEventColor(dayEvents[0]);
        
        // Verifica che il colore sia un valore esadecimale valido
        if (/^[0-9A-F]{6}$/i.test(rgbColor)) {
          // Imposta il colore di sfondo
          worksheet[cellRef].s.fill = { 
            patternType: 'solid', 
            fgColor: { rgb: rgbColor } 
          };
          
          // Determina il colore del testo in base al colore di sfondo
          const r = parseInt(rgbColor.substring(0, 2), 16);
          const g = parseInt(rgbColor.substring(2, 4), 16);
          const b = parseInt(rgbColor.substring(4, 6), 16);
          const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
          
          worksheet[cellRef].s.font = { 
            color: { rgb: yiq >= 128 ? "000000" : "FFFFFF" },
            bold: true
          };
        } else {
          console.warn(`Colore non valido: ${rgbColor}, usando predefinito`);
          worksheet[cellRef].s.fill = { 
            patternType: 'solid', 
            fgColor: { rgb: "007AFF" } 
          };
          worksheet[cellRef].s.font = { 
            color: { rgb: "FFFFFF" },
            bold: true
          };
        }
      }
    });
  });
  
  // Imposta la larghezza delle colonne
  const colWidths = [
    { wch: 25 }, // Colonna delle risorse
    ...currentWeek.map(() => ({ wch: 30 })) // Colonne dei giorni
  ];
  worksheet['!cols'] = colWidths;
  
  // Imposta l'altezza delle righe
  const rowHeights = [
    { hpt: 40 }, // Intestazione
    ...rows.map(() => ({ hpt: 80 })) // Righe di dati
  ];
  worksheet['!rows'] = rowHeights;
  
  // Crea il workbook e aggiungi il foglio
  const workbook = XLSX.utils.book_new();
  
  // Aggiungi una pagina con le informazioni sui filtri
  if (Object.keys(filters).length > 0) {
    const filterSheet = XLSX.utils.aoa_to_sheet([
      ['Filtri applicati'],
      ['Tipo di visualizzazione', viewMode === 'driver' ? 'Autisti' : viewMode === 'vehicle' ? 'Veicoli' : 'Cantieri'],
      ['Periodo', `Dal ${currentWeek[0].toLocaleDateString('it-IT')} al ${currentWeek[currentWeek.length-1].toLocaleDateString('it-IT')}`],
      ['Filtro autista', filters.driverName || 'Tutti'],
      ['Filtro veicolo', filters.vehicleName || 'Tutti'],
      ['Filtro cantiere', filters.siteName || 'Tutti']
    ]);
    
    // Stile per il foglio dei filtri
    const filterHeaderStyle = {
      font: { bold: true, size: 14 },
      fill: { patternType: 'solid', fgColor: { rgb: "E0E0E0" } }
    };
    
    // Applica stile all'intestazione
    const filterHeaderRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (!filterSheet[filterHeaderRef]) filterSheet[filterHeaderRef] = {};
    filterSheet[filterHeaderRef].s = filterHeaderStyle;
    
    // Imposta larghezza colonne
    filterSheet['!cols'] = [{ wch: 25 }, { wch: 40 }];
    
    XLSX.utils.book_append_sheet(workbook, filterSheet, 'Filtri');
  }
  
  // Aggiungi il foglio principale
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Calendario');
  
  // Crea il file Excel e avvia il download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}