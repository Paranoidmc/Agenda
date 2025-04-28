// Funzione universale per ottenere il colore di un evento (usata sia in HTML che in Excel export)
// Mappa status -> colore (come getStatusColor in AttivitaPage)
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

export function getEventColor(event) {
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




export default getEventColor;
