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
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  timeout: 30000 // Timeout di 30 secondi
});

// Interceptor per aggiungere i token di autenticazione a ogni richiesta
api.interceptors.request.use(config => {
  // Incrementa il contatore di richieste attive
  if (!config.skipLoadingState) {
    loadingState.increment();
  }
  
  // Verifica se la richiesta può essere servita dalla cache
  if (config.method === 'get' && config.useCache !== false) {
    const cacheKey = cacheService.generateKey(config.url, config.params);
    const cachedData = cacheService.get(cacheKey);
    
    if (cachedData) {
      // Se abbiamo dati in cache, annulla la richiesta e restituisci i dati dalla cache
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
  
  // Aggiungi il token CSRF
  const xsrfToken = getCookie('XSRF-TOKEN');
  if (xsrfToken) {
    config.headers['X-XSRF-TOKEN'] = xsrfToken;
  }
  
  // Aggiungi il token di autenticazione se disponibile
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  // Aggiungi header Accept per JSON
  config.headers['Accept'] = 'application/json';
  
  // Log per debug solo in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Richiesta in uscita:', {
      url: config.url,
      method: config.method,
      params: config.params,
      headers: config.headers
    });
  }
  
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
      console.log('Risposta ricevuta:', {
        url: response.config.url,
        method: response.config.method,
        status: response.status,
        data: response.data
      });
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
      console.log('URL:', error.config?.url);
      console.log('Metodo:', error.config?.method?.toUpperCase());
      console.log('Status:', error.response?.status);
      console.log('Headers inviati:', error.config?.headers);
      console.log('Dati inviati:', error.config?.data ? JSON.parse(error.config.data) : 'Nessun dato');
      console.log('Risposta:', error.response?.data);
      console.log('Errore completo:', error);
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
        
        console.log(`Riprovo richiesta (${retryConfig.retryCount}/${maxRetries}):`, retryConfig.url);
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
        
        // Prova a ottenere un nuovo CSRF token e riprova la richiesta
        if (error.config && !error.config._retry) {
          error.config._retry = true;
          
          try {
            // Ottieni un nuovo CSRF token
            await api.get('/sanctum/csrf-cookie');
            
            // Verifica se abbiamo un token in localStorage
            const token = localStorage.getItem('token');
            if (token) {
              // Riprova la richiesta originale
              return api(error.config);
            }
          } catch (retryError) {
            console.error('Errore nel tentativo di refresh:', retryError);
          }
        }
        
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
        console.error('Errore del server:', error.response.data);
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