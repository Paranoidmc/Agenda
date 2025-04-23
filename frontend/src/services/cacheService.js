/**
 * Servizio di cache per le richieste API
 * Implementa un sistema di memorizzazione delle risposte API con TTL configurabile
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minuti in millisecondi
  }

  /**
   * Genera una chiave di cache basata su URL e parametri
   * @param {string} url - URL della richiesta
   * @param {Object} params - Parametri della richiesta
   * @returns {string} Chiave di cache
   */
  generateKey(url, params = {}) {
    return `${url}:${JSON.stringify(params)}`;
  }

  /**
   * Verifica se una chiave è presente in cache e non è scaduta
   * @param {string} key - Chiave di cache
   * @returns {boolean} True se la chiave è valida
   */
  has(key) {
    if (!this.cache.has(key)) return false;
    
    const { expiry } = this.cache.get(key);
    if (Date.now() > expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Ottiene un valore dalla cache
   * @param {string} key - Chiave di cache
   * @returns {any} Valore memorizzato o null
   */
  get(key) {
    if (!this.has(key)) return null;
    return this.cache.get(key).data;
  }

  /**
   * Memorizza un valore in cache
   * @param {string} key - Chiave di cache
   * @param {any} data - Dati da memorizzare
   * @param {number} ttl - Tempo di vita in millisecondi
   */
  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  /**
   * Rimuove una chiave dalla cache
   * @param {string} key - Chiave di cache
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Rimuove tutte le chiavi che contengono un pattern specifico
   * @param {string} pattern - Pattern da cercare nelle chiavi
   */
  invalidatePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Svuota completamente la cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Imposta il TTL predefinito
   * @param {number} ttl - Tempo di vita in millisecondi
   */
  setDefaultTTL(ttl) {
    this.defaultTTL = ttl;
  }
}

// Esporta un'istanza singleton
const cacheService = new CacheService();
export default cacheService;