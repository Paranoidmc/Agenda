import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
export async function exportCalendarToExcel(events, viewMode, rows, currentWeek, filename = 'Calendario', filters = {}) {
  if (!Array.isArray(events) || !Array.isArray(rows) || events.length === 0 || rows.length === 0) {
    alert('Nessun dato da esportare.');
    return;
  }
  if (!filename) filename = 'Calendario';
  filename = filename.replace(/[^a-zA-Z0-9_\-]/g, '_');
  if (!filename.endsWith('.xlsx')) filename += '.xlsx';

  // Crea un nuovo workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Calendario');

  // Crea un array di intestazioni con i giorni della settimana
  const headers = ['Risorsa', ...currentWeek.map(day => {
    const dayName = day.toLocaleDateString('it-IT', { weekday: 'short' }).replace(/^[a-z]/, c => c.toUpperCase());
    const dayNumber = day.getDate();
    const month = day.toLocaleDateString('it-IT', { month: 'short' });
    return `${dayName} ${dayNumber} ${month}`;
  })];
  worksheet.addRow(headers);

  // Nuova logica: ogni riga = un singolo evento della settimana
  const eventRows = [];
  rows.forEach(row => {
    (row.events || []).forEach(event => {
      // Crea una riga con tutte le colonne vuote
      const rowCells = Array(headers.length).fill('');
      rowCells[0] = row.name || 'Risorsa';
      // Per ogni giorno della settimana, se l'evento cade in quel giorno metti descrizione
      currentWeek.forEach((day, dayIdx) => {
        const eventDate = event.start instanceof Date ? event.start : new Date(event.start);
        if (
          eventDate.getDate() === day.getDate() &&
          eventDate.getMonth() === day.getMonth() &&
          eventDate.getFullYear() === day.getFullYear()
        ) {
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
          rowCells[dayIdx + 1] = `${formatTime(start)}${formatTime(end) ? '-' + formatTime(end) : ''} ${activityType} ${descrizione} Stato: ${stato} Autista: ${driver} Veicolo: ${veicolo} Cliente: ${cliente} Cantiere: ${cantiere}`.trim();
        }
      });
      // Salva anche riferimento all'evento per colorazione
      eventRows.push({ rowCells, event });
    });
  });
  // Aggiungi tutte le righe
  eventRows.forEach(({ rowCells }) => worksheet.addRow(rowCells));

  // Larghezza colonne
  worksheet.columns = headers.map(() => ({ width: 32 }));

  // Stile intestazione
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'CCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
      left: { style: 'thin', color: { argb: 'CCCCCC' } },
      right: { style: 'thin', color: { argb: 'CCCCCC' } }
    };
  });

  // Stile prima colonna (risorsa)
  for (let r = 2; r <= worksheet.rowCount; r++) {
    const cell = worksheet.getCell(r, 1);
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F5F7' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'CCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
      left: { style: 'thin', color: { argb: 'CCCCCC' } },
      right: { style: 'thin', color: { argb: 'CCCCCC' } }
    };
  }

  // Celle eventi: colore di sfondo e testo
  for (let r = 2; r <= worksheet.rowCount; r++) {
    for (let c = 2; c <= headers.length; c++) {
      const cell = worksheet.getCell(r, c);
      // Applica stile solo se la cella contiene un evento (testo non vuoto)
      if (cell.value && typeof cell.value === 'string' && cell.value.trim() !== '') {
        // Recupera l'evento associato SOLO se la cella corrente è quella dell'evento
        const event = eventRows[r-2]?.event;
        // L'evento deve essere effettivamente in questo giorno/colonna
        const eventDate = event.start instanceof Date ? event.start : new Date(event.start);
        const dayIdx = c - 1;
        const colDay = headers[dayIdx];
        const cellHasEvent = (() => {
          const day = currentWeek[dayIdx-1];
          return day && eventDate.getDate() === day.getDate() && eventDate.getMonth() === day.getMonth() && eventDate.getFullYear() === day.getFullYear();
        })();
        if (cellHasEvent) {
          let color = getEventColor(event);
          if (color.startsWith('#')) color = 'FF' + color.slice(1);
          else if (/^[0-9A-Fa-f]{6}$/.test(color)) color = 'FF' + color;
          let textColor = 'FFFFFFFF';
          if (color.length === 8) {
            const rVal = parseInt(color.substring(2,4),16);
            const gVal = parseInt(color.substring(4,6),16);
            const bVal = parseInt(color.substring(6,8),16);
            const yiq = ((rVal*299)+(gVal*587)+(bVal*114))/1000;
            textColor = yiq >= 128 ? 'FF000000' : 'FFFFFFFF';
          }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
          cell.font = { color: { argb: textColor }, bold: true };
        }
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
          left: { style: 'thin', color: { argb: 'CCCCCC' } },
          right: { style: 'thin', color: { argb: 'CCCCCC' } }
        };
      }
      if (!cell.value || (typeof cell.value === 'string' && cell.value.trim() === '')) {
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
          left: { style: 'thin', color: { argb: 'CCCCCC' } },
          right: { style: 'thin', color: { argb: 'CCCCCC' } }
        };
      }
    }
  }

  // Imposta altezza righe
  worksheet.getRow(1).height = 32;
  for (let r = 2; r <= worksheet.rowCount; r++) {
    worksheet.getRow(r).height = 64;
  }

  // Se ci sono filtri, aggiungi un secondo foglio con i filtri applicati
  if (filters && Object.keys(filters).length > 0) {
    const filterSheet = workbook.addWorksheet('Filtri');
    filterSheet.addRow(['Filtri applicati']);
    filterSheet.addRow(['Tipo di visualizzazione', viewMode === 'driver' ? 'Autisti' : viewMode === 'vehicle' ? 'Veicoli' : 'Cantieri']);
    filterSheet.addRow(['Periodo', `Dal ${currentWeek[0].toLocaleDateString('it-IT')} al ${currentWeek[currentWeek.length-1].toLocaleDateString('it-IT')}`]);
    Object.entries(filters).forEach(([k, v]) => filterSheet.addRow([k, v]));
    filterSheet.columns = [{ width: 25 }, { width: 40 }];
  }

  // Crea il file Excel e avvia il download
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}