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
const api = axios.create({
  // Usa il proxy configurato in next.config.js
  baseURL: 'http://localhost:8000/api',
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

// Aggiungi i metodi di utilità all'oggetto API
Object.assign(api, apiUtils);

export default api;