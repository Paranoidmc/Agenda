import axios from 'axios';

// Funzione per leggere il valore di un cookie
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  timeout: 10000 // Timeout di 10 secondi
});

// Interceptor per aggiungere i token di autenticazione a ogni richiesta
api.interceptors.request.use(config => {
  // Aggiungi il token CSRF
  const xsrfToken = getCookie('XSRF-TOKEN');
  if (xsrfToken) {
    config.headers['X-XSRF-TOKEN'] = xsrfToken;
    console.log('Aggiunto CSRF token alla richiesta:', config.url);
  } else {
    console.log('Nessun CSRF token trovato per la richiesta:', config.url);
  }
  
  // Aggiungi il token Bearer per l'autenticazione
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
    console.log('Aggiunto token di autenticazione alla richiesta:', config.url);
  }
  
  // Log per debug
  console.log('Richiesta in uscita:', {
    url: config.url,
    method: config.method,
    headers: config.headers,
    withCredentials: config.withCredentials
  });
  
  return config;
});

// Interceptor per gestire gli errori di autenticazione e altri errori comuni
api.interceptors.response.use(
  response => response,
  error => {
    // Gestione degli errori di rete
    if (!error.response) {
      console.error('Errore di rete o timeout:', error.message);
      return Promise.reject(error);
    }
    
    // Gestione degli errori in base allo status code
    switch (error.response.status) {
      case 401: // Unauthorized
        console.error('Sessione scaduta o non autenticata');
        // Pulisci localStorage e reindirizza al login
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
    
    // Log dettagliato per il debug
    if (process.env.NODE_ENV === 'development') {
      console.group('Dettagli errore API');
      console.log('URL:', error.config?.url);
      console.log('Metodo:', error.config?.method?.toUpperCase());
      console.log('Status:', error.response?.status);
      console.log('Dati inviati:', error.config?.data ? JSON.parse(error.config.data) : 'Nessun dato');
      console.log('Risposta:', error.response?.data);
      console.groupEnd();
    }
    
    return Promise.reject(error);
  }
);

export default api;
