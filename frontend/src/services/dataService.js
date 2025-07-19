import api from '../../lib/api';

/**
 * Servizio per la gestione ottimizzata dei dati
 * Fornisce metodi per caricare e manipolare i dati dell'applicazione
 * con supporto per cache, paginazione e filtri
 */
class DataService {
  /**
   * Carica le attività con supporto per cache e paginazione
   * @param {Object} options - Opzioni per la richiesta
   * @param {string} options.endpoint - Endpoint API (default: '/activities')
   * @param {boolean} options.useCache - Se usare la cache (default: true)
   * @param {number} options.cacheTTL - TTL personalizzato per la cache in ms
   * @param {number} options.page - Numero di pagina per la paginazione
   * @param {number} options.perPage - Elementi per pagina
   * @param {Object} options.filters - Filtri da applicare
   * @returns {Promise<Object>} Dati paginati
   */
  async getActivities(options = {}) {
    const endpoint = options.endpoint || '/activities';
    const params = {};
    
    // Aggiungi parametri di paginazione se specificati
    if (options.page) {
      params.page = options.page;
    }
    
    if (options.perPage) {
      params.per_page = options.perPage;
    }
    
    // Aggiungi filtri se specificati
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params[key] = value;
        }
      });
    }
    
    try {
      const response = await api.get(endpoint, {
        params,
        useCache: options.useCache !== false,
        cacheTTL: options.cacheTTL,
        retry: true
      });
      
      return response.data;
    } catch (error) {
      console.error(`Errore nel caricamento delle attività da ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Carica i dettagli di un'attività specifica
   * @param {number} id - ID dell'attività
   * @param {Object} options - Opzioni per la richiesta
   * @returns {Promise<Object>} Dettagli dell'attività
   */
  async getActivity(id, options = {}) {
    try {
      const response = await api.get(`/activities/${id}`, {
        useCache: options.useCache !== false,
        cacheTTL: options.cacheTTL,
        retry: true
      });
      
      return response.data;
    } catch (error) {
      console.error(`Errore nel caricamento dell'attività ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Carica i clienti con supporto per cache e paginazione
   * @param {Object} options - Opzioni per la richiesta
   * @returns {Promise<Object>} Dati paginati
   */
  async getClients(options = {}) {
    const params = {};
    
    if (options.page) {
      params.page = options.page;
    }
    
    if (options.perPage) {
      params.per_page = options.perPage;
    }
    
    if (options.search) {
      params.search = options.search;
    }
    
    try {
      const response = await api.get('/clients', {
        params,
        useCache: options.useCache !== false,
        cacheTTL: options.cacheTTL || 10 * 60 * 1000, // 10 minuti di default
        retry: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Errore nel caricamento dei clienti:', error);
      throw error;
    }
  }
  
  /**
   * Carica i cantieri con supporto per cache e paginazione
   * @param {Object} options - Opzioni per la richiesta
   * @returns {Promise<Object>} Dati paginati
   */
  async getSites(options = {}) {
    const params = {};
    
    if (options.page) {
      params.page = options.page;
    }
    
    if (options.perPage) {
      params.per_page = options.perPage;
    }
    
    if (options.clientId) {
      params.client_id = options.clientId;
    }
    
    if (options.search) {
      params.search = options.search;
    }
    
    try {
      const response = await api.get('/sites', {
        params,
        useCache: options.useCache !== false,
        cacheTTL: options.cacheTTL || 10 * 60 * 1000, // 10 minuti di default
        retry: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Errore nel caricamento dei cantieri:', error);
      throw error;
    }
  }
  
  /**
   * Carica gli autisti con supporto per cache e paginazione
   * @param {Object} options - Opzioni per la richiesta
   * @returns {Promise<Object>} Dati paginati
   */
  async getDrivers(options = {}) {
    const params = {};
    
    if (options.page) {
      params.page = options.page;
    }
    
    if (options.perPage) {
      params.per_page = options.perPage;
    }
    
    if (options.search) {
      params.search = options.search;
    }
    
    try {
      const response = await api.get('/drivers', {
        params,
        useCache: options.useCache !== false,
        cacheTTL: options.cacheTTL || 10 * 60 * 1000, // 10 minuti di default
        retry: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Errore nel caricamento degli autisti:', error);
      throw error;
    }
  }
  
  /**
   * Carica i veicoli con supporto per cache e paginazione
   * @param {Object} options - Opzioni per la richiesta
   * @returns {Promise<Object>} Dati paginati
   */
  async getVehicles(options = {}) {
    const params = {};
    
    if (options.page) {
      params.page = options.page;
    }
    
    if (options.perPage) {
      params.per_page = options.perPage;
    }
    
    if (options.search) {
      params.search = options.search;
    }
    
    try {
      const response = await api.get('/vehicles', {
        params,
        useCache: options.useCache !== false,
        cacheTTL: options.cacheTTL || 10 * 60 * 1000, // 10 minuti di default
        retry: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Errore nel caricamento dei veicoli:', error);
      throw error;
    }
  }
  
  /**
   * Carica i tipi di attività con supporto per cache
   * @param {Object} options - Opzioni per la richiesta
   * @returns {Promise<Array>} Lista dei tipi di attività
   */
  async getActivityTypes(options = {}) {
    try {
      const response = await api.get('/activity-types', {
        useCache: options.useCache !== false,
        cacheTTL: options.cacheTTL || 30 * 60 * 1000, // 30 minuti di default
        retry: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Errore nel caricamento dei tipi di attività:', error);
      throw error;
    }
  }
  
  /**
   * Crea una nuova attività
   * @param {Object} activityData - Dati dell'attività
   * @returns {Promise<Object>} Attività creata
   */
  async createActivity(activityData) {
    try {
      const response = await api.post('/activities', activityData);
      
      // Invalida la cache delle attività dopo la creazione
      api.invalidateCache('/activities');
      
      return response.data;
    } catch (error) {
      console.error('Errore nella creazione dell\'attività:', error);
      throw error;
    }
  }
  
  /**
   * Aggiorna un'attività esistente
   * @param {number} id - ID dell'attività
   * @param {Object} activityData - Dati aggiornati
   * @returns {Promise<Object>} Attività aggiornata
   */
  async updateActivity(id, activityData) {
    try {
      const response = await api.put(`/activities/${id}`, activityData);
      
      // Invalida la cache delle attività e dell'attività specifica
      api.invalidateCache('/activities');
      api.invalidateCache(`/activities/${id}`);
      
      return response.data;
    } catch (error) {
      console.error(`Errore nell'aggiornamento dell'attività ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Elimina un'attività
   * @param {number} id - ID dell'attività
   * @returns {Promise<void>}
   */
  async deleteActivity(id) {
    try {
      await api.delete(`/activities/${id}`);
      
      // Invalida la cache delle attività dopo l'eliminazione
      api.invalidateCache('/activities');
    } catch (error) {
      console.error(`Errore nell'eliminazione dell'attività ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Carica le scadenze dei veicoli con supporto per cache e paginazione
   * @param {Object} options - Opzioni per la richiesta
   * @returns {Promise<Object>} Dati paginati
   */
  async getVehicleDeadlines(options = {}) {
    const params = {};
    
    if (options.page) {
      params.page = options.page;
    }
    
    if (options.perPage) {
      params.per_page = options.perPage;
    }
    
    if (options.vehicleId) {
      params.vehicle_id = options.vehicleId;
    }
    
    if (options.upcoming) {
      params.upcoming = options.upcoming;
    }
    
    try {
      const response = await api.get('/vehicle-deadlines', {
        params,
        useCache: options.useCache !== false,
        cacheTTL: options.cacheTTL || 5 * 60 * 1000, // 5 minuti di default
        retry: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Errore nel caricamento delle scadenze dei veicoli:', error);
      throw error;
    }
  }
  
  /**
   * Invalida la cache per un tipo di dati specifico
   * @param {string} dataType - Tipo di dati (es. 'activities', 'clients', ecc.)
   */
  invalidateCache(dataType) {
    api.invalidateCache(`/${dataType}`);
  }
}

// Esporta un'istanza singleton
const dataService = new DataService();
export default dataService;