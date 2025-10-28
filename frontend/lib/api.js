import axios from 'axios';
import cacheService from '../src/services/cacheService';

// Stato globale di caricamento
export const loadingState = {
  activeRequests: 0,
  listeners: new Set(),
  
  // Incrementa il contatore di richieste attive
  increment() {
    this.activeRequests++;
    this.notifyListeners();
  },
  
  // Decrementa il contatore di richieste attive
  decrement() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.notifyListeners();
  },
  
  // Verifica se ci sono richieste attive
  isLoading() {
    return this.activeRequests > 0;
  },
  
  // Aggiunge un listener per i cambiamenti di stato
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },
  
  // Notifica tutti i listener
  notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.isLoading());
    }
  }
};

// Funzione per leggere il valore di un cookie
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}

// Configurazione di base per axios
// Usiamo l'URL del backend in base all'ambiente
const resolvedBaseURL = process.env.NODE_ENV === 'production' 
  ? 'https://api.edilcipriano.peels.it/api'
  : 'http://localhost:8000/api';

const api = axios.create({
  baseURL: resolvedBaseURL,
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  timeout: 30000 // Timeout di 30 secondi
});

api.interceptors.request.use(config => {
  if (!config.skipLoadingState) {
    loadingState.increment();
  }
  
  // Aggiungi il token di autenticazione se disponibile
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  if (config.method === 'get' && config.useCache !== false) {
    const cacheKey = cacheService.generateKey(config.url, config.params);
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      config.adapter = () => {
        loadingState.decrement();
        return Promise.resolve({
          data: cachedData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          request: {}
        });
      };
      return config;
    }
  }
  config.withCredentials = true;
  return config;
});

// Interceptor per gestire le risposte e gli errori
api.interceptors.response.use(
  response => {
    // Decrementa il contatore di richieste attive
    if (!response.config.skipLoadingState) {
      loadingState.decrement();
    }
    
    // Log per debug solo in development
    if (process.env.NODE_ENV === 'development') {
      /*
  url: response.config.url,
  method: response.config.method,
  status: response.status,
  data: response.data
});
*/
    }
    
    // Memorizza la risposta nella cache se è una GET
    if (response.config.method === 'get' && response.config.useCache !== false) {
      const cacheKey = cacheService.generateKey(response.config.url, response.config.params);
      const ttl = response.config.cacheTTL || undefined; // Usa il TTL predefinito se non specificato
      cacheService.set(cacheKey, response.data, ttl);
    }
    
    return response;
  },
  async error => {
    // Decrementa il contatore di richieste attive
    if (error.config && !error.config.skipLoadingState) {
      loadingState.decrement();
    }
    
    // Log dettagliato per il debug
    if (process.env.NODE_ENV === 'development') {
      console.group('Dettagli errore API');
      console.groupEnd();
    }
    
    // Gestione dei retry per errori di rete o timeout
    if (error.config && !error.response && error.config.retry !== false) {
      const retryConfig = error.config;
      retryConfig.retryCount = retryConfig.retryCount || 0;
      const maxRetries = retryConfig.maxRetries || 2;
      
      if (retryConfig.retryCount < maxRetries) {
        retryConfig.retryCount++;
        
        // Attendi prima di riprovare (backoff esponenziale)
        const delay = Math.pow(2, retryConfig.retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return api(retryConfig);
      }
    }
    
    // Gestione degli errori di rete
    if (!error.response) {
      console.error('Errore di rete o timeout:', error.message);
      return Promise.reject(error);
    }
    
    // Gestione degli errori in base allo status code
    switch (error.response.status) {
      case 401: // Unauthorized
        console.error('Sessione scaduta o non autenticata');
        
        // Se il retry fallisce o non è possibile, reindirizza al login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.setItem('redirectAfterLogin', window.location.pathname);
          
          // Reindirizza alla pagina di login solo se non siamo già sulla pagina di login
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        break;
        
      case 403: // Forbidden
        console.error('Accesso negato:', error.response.data);
        break;
        
      case 404: // Not Found
        console.error('Risorsa non trovata:', error.response.config.url);
        break;
        
      case 422: // Validation Error (Laravel)
        console.error('Errore di validazione:', error.response.data);
        break;
        
      case 500: // Server Error
        const serverErrorData = error.response.data;
        const serverErrorUrl = error.response.config?.url;
        if (!serverErrorData || (typeof serverErrorData === 'object' && Object.keys(serverErrorData).length === 0)) {
          console.error(`Errore del server (500) su ${serverErrorUrl}: Nessun dettaglio restituito dal backend.`);
        } else {
          console.error(`Errore del server (500) su ${serverErrorUrl}:`, serverErrorData);
        }
        break;
        
      default:
        console.error(`Errore HTTP ${error.response.status}:`, error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// Metodi di utilità per l'API
const apiUtils = {
  /**
   * Invalida la cache per un endpoint specifico
   * @param {string} endpoint - Endpoint da invalidare
   */
  invalidateCache(endpoint) {
    cacheService.invalidatePattern(endpoint);
  },
  
  /**
   * Svuota completamente la cache
   */
  clearCache() {
    cacheService.clear();
  },
  
  /**
   * Imposta il TTL predefinito per la cache
   * @param {number} ttl - Tempo di vita in millisecondi
   */
  setDefaultCacheTTL(ttl) {
    cacheService.setDefaultTTL(ttl);
  },
  
  /**
   * Ottiene lo stato di caricamento globale
   * @returns {boolean} True se ci sono richieste attive
   */
  isLoading() {
    return loadingState.isLoading();
  },
  
  /**
   * Aggiunge un listener per i cambiamenti di stato di caricamento
   * @param {Function} callback - Funzione da chiamare quando lo stato cambia
   * @returns {Function} Funzione per rimuovere il listener
   */
  onLoadingChange(callback) {
    return loadingState.addListener(callback);
  }
};

// API Documenti
api.documenti = {
  /**
   * Ottiene la lista dei documenti
   * @param {Object} params - Parametri di filtro
   * @returns {Promise} Lista documenti
   */
  async getAll(params = {}) {
    const response = await api.get('/documenti', { params });
    return response.data;
  },

  /**
   * Ottiene un documento specifico
   * @param {number} id - ID del documento
   * @returns {Promise} Dettagli documento
   */
  async getById(id) {
    const response = await api.get(`/documenti/${id}`);
    return response.data;
  },

  /**
   * Genera PDF per un documento
   * @param {number} id - ID del documento
   * @returns {Promise} Blob PDF
   */
  async generatePdf(id) {
    const response = await api.get(`/documenti/${id}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Sincronizza documenti manualmente
   * @param {Object} options - Opzioni sincronizzazione
   * @param {number} options.giorni - Giorni da sincronizzare (default: 7)
   * @returns {Promise} Risultato sincronizzazione
   */
  async sync(options = {}) {
    console.log('🔄 DEBUG: Chiamando sync settimanale...');
    console.log('🔄 DEBUG: Opzioni:', options);
    console.log('🔄 DEBUG: Giorni:', options.giorni || 7);
    
    try {
      const response = await api.post('/documenti/sync', {
        giorni: options.giorni || 7
      }, {
        timeout: 300000 // ✅ FIX: 5 minuti per sincronizzazioni
      });
      
      console.log('✅ DEBUG: Risposta sync settimanale:', response);
      console.log('✅ DEBUG: Dati risposta settimanale:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ DEBUG: Errore in sync settimanale:', error);
      console.error('❌ DEBUG: Dettagli errore settimanale:', error.response?.data);
      throw error;
    }
  },

  /**
   * Sincronizza documenti di oggi
   * @returns {Promise} Risultato sincronizzazione
   */
  async syncToday() {
    console.log('🔄 DEBUG: Chiamando syncToday...');
    console.log('🔄 DEBUG: URL base:', process.env.NEXT_PUBLIC_API_URL);
    console.log('🔄 DEBUG: Endpoint completo:', process.env.NEXT_PUBLIC_API_URL + '/documenti/sincronizza-oggi');
    
    try {
      const response = await api.post('/documenti/sincronizza-oggi', {}, {
        timeout: 300000 // ✅ FIX: 5 minuti per sincronizzazioni
      });
      
      console.log('✅ DEBUG: Risposta ricevuta:', response);
      console.log('✅ DEBUG: Dati risposta:', response.data);
      
      return response;
    } catch (error) {
      console.error('❌ DEBUG: Errore in syncToday:', error);
      console.error('❌ DEBUG: Dettagli errore:', error.response?.data);
      throw error;
    }
  },

  /**
   * Allega un documento a un'attività
   * @param {Object} params - Parametri allegamento
   * @param {number} params.activity_id - ID dell'attività
   * @param {number} params.document_id - ID del documento
   * @returns {Promise} Risultato allegamento
   */
  attachToActivity(params) {
    return api.post('/activities/attach-document', params);
  },

  /**
   * Recupera documenti allegati a un'attività
   * @param {number} activityId - ID dell'attività
   * @returns {Promise} Lista documenti allegati
   */
  getAttachedToActivity(activityId) {
    return api.get(`/activities/${activityId}/documents`);
  },

  /**
   * Suggerisce documenti allegabili per un'attività
   * @param {Object} params - Parametri attività
   * @param {number} params.client_id - ID del cliente
   * @param {number} params.site_id - ID della destinazione/sede
   * @param {string} params.data_inizio - Data inizio attività (YYYY-MM-DD)
   * @returns {Promise} Lista documenti suggeriti
   */
  suggestForActivity(params) {
    return api.post('/documenti/suggest-for-activity', params);
  }
};

// API Clienti
api.clienti = {
  /**
   * Sincronizza clienti da Arca
   * @returns {Promise} Risultato sincronizzazione
   */
  async sync() {
    try {
      const response = await api.post('/clients/sync', {}, {
        timeout: 300000 // 5 minuti per sincronizzazioni
      });
      return response;
    } catch (error) {
      console.error('❌ Errore in sincronizzazione clienti:', error);
      throw error;
    }
  }
};

// API Autisti
api.autisti = {
  /**
   * Sincronizza autisti da Arca
   * @returns {Promise} Risultato sincronizzazione
   */
  async sync() {
    try {
      const response = await api.post('/drivers/sync', {}, {
        timeout: 300000 // 5 minuti per sincronizzazioni
      });
      return response;
    } catch (error) {
      console.error('❌ Errore in sincronizzazione autisti:', error);
      throw error;
    }
  }
};

// API Cantieri (Siti)
api.cantieri = {
  /**
   * Sincronizza cantieri da Arca
   * @returns {Promise} Risultato sincronizzazione
   */
  async sync() {
    try {
      const response = await api.post('/sites/sync', {}, {
        timeout: 300000 // 5 minuti per sincronizzazioni
      });
      return response;
    } catch (error) {
      console.error('❌ Errore in sincronizzazione cantieri:', error);
      throw error;
    }
  }
};

// Aggiungi i metodi di utilità all'oggetto API
Object.assign(api, apiUtils);

export default api;
