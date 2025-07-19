import api from './api';

/**
 * Funzioni di utilità per il tracking dei veicoli
 */

/**
 * Aggiorna la posizione di un veicolo
 * @param {number} vehicleId - ID del veicolo
 * @param {object} position - Dati della posizione
 * @param {number} position.latitude - Latitudine
 * @param {number} position.longitude - Longitudine
 * @param {number} [position.speed] - Velocità in km/h
 * @param {number} [position.heading] - Direzione in gradi (0-360)
 * @param {string} [position.timestamp] - Timestamp ISO della posizione
 * @returns {Promise<object>} Risposta dell'API
 */
export async function updateVehiclePosition(vehicleId, position) {
  try {
    const response = await api.post(`/vehicles/${vehicleId}/position`, {
      latitude: position.latitude,
      longitude: position.longitude,
      speed: position.speed,
      heading: position.heading,
      timestamp: position.timestamp || new Date().toISOString(),
    });
    
    return response.data;
  } catch (error) {
    console.error(`Errore nell'aggiornamento posizione veicolo ${vehicleId}:`, error);
    throw error;
  }
}

/**
 * Ottieni la posizione di un singolo veicolo
 * @param {number} vehicleId - ID del veicolo
 * @returns {Promise<object>} Dati della posizione
 */
export async function getVehiclePosition(vehicleId) {
  try {
    const response = await api.get(`/vehicles/${vehicleId}/position`);
    return response.data;
  } catch (error) {
    console.error(`Errore nel recupero posizione veicolo ${vehicleId}:`, error);
    throw error;
  }
}

/**
 * Ottieni le posizioni di più veicoli
 * @param {number[]} vehicleIds - Array di ID dei veicoli
 * @returns {Promise<object[]>} Array di dati delle posizioni
 */
export async function getMultipleVehiclePositions(vehicleIds) {
  try {
    const response = await api.post('/vehicles/positions', {
      vehicle_ids: vehicleIds
    });
    return response.data;
  } catch (error) {
    console.error('Errore nel recupero posizioni veicoli:', error);
    throw error;
  }
}

/**
 * Simula l'invio di dati GPS (per test)
 * Questa funzione simula quello che farebbe un dispositivo GPS reale
 * @param {number} vehicleId - ID del veicolo
 * @param {object} [options] - Opzioni per la simulazione
 * @param {number} [options.intervalMs=5000] - Intervallo in millisecondi
 * @param {number} [options.maxUpdates=10] - Numero massimo di aggiornamenti
 * @returns {function} Funzione per fermare la simulazione
 */
export function simulateGPSUpdates(vehicleId, options = {}) {
  const { intervalMs = 5000, maxUpdates = 10 } = options;
  let updateCount = 0;
  
  // Posizione iniziale casuale (Roma)
  let currentLat = 41.9028 + (Math.random() - 0.5) * 0.01;
  let currentLng = 12.4964 + (Math.random() - 0.5) * 0.01;
  let currentHeading = Math.random() * 360;
  
  const interval = setInterval(async () => {
    try {
      // Simula movimento
      const moveDistance = 0.001; // ~100m
      const headingChange = (Math.random() - 0.5) * 30; // ±15 gradi
      
      currentHeading = (currentHeading + headingChange) % 360;
      const radians = (currentHeading * Math.PI) / 180;
      
      currentLat += Math.cos(radians) * moveDistance;
      currentLng += Math.sin(radians) * moveDistance;
      
      const position = {
        latitude: currentLat,
        longitude: currentLng,
        speed: Math.floor(Math.random() * 60) + 20, // 20-80 km/h
        heading: Math.floor(currentHeading),
        timestamp: new Date().toISOString(),
      };
      
      await updateVehiclePosition(vehicleId, position);
      
      updateCount++;
      if (updateCount >= maxUpdates) {
        clearInterval(interval);
      }
    } catch (error) {
      console.error(`Errore nella simulazione GPS per veicolo ${vehicleId}:`, error);
    }
  }, intervalMs);
  
  // Restituisce una funzione per fermare la simulazione
  return () => {
    clearInterval(interval);
  };
}

/**
 * Valida i dati di posizione GPS
 * @param {object} position - Dati della posizione
 * @returns {boolean} True se i dati sono validi
 */
export function validateGPSPosition(position) {
  if (!position || typeof position !== 'object') {
    return false;
  }
  
  const { latitude, longitude } = position;
  
  // Verifica che latitudine e longitudine siano numeri validi
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  
  // Verifica i range validi
  if (latitude < -90 || latitude > 90) {
    return false;
  }
  
  if (longitude < -180 || longitude > 180) {
    return false;
  }
  
  // Verifica velocità se presente
  if (position.speed !== undefined && (typeof position.speed !== 'number' || position.speed < 0)) {
    return false;
  }
  
  // Verifica direzione se presente
  if (position.heading !== undefined && (typeof position.heading !== 'number' || position.heading < 0 || position.heading > 360)) {
    return false;
  }
  
  return true;
}

/**
 * Calcola la distanza tra due punti GPS (in km)
 * @param {object} pos1 - Prima posizione {lat, lng}
 * @param {object} pos2 - Seconda posizione {lat, lng}
 * @returns {number} Distanza in chilometri
 */
export function calculateDistance(pos1, pos2) {
  const R = 6371; // Raggio della Terra in km
  const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
  const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}