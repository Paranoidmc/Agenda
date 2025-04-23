import api from '../../lib/api';

/**
 * Servizio per la gestione dell'autenticazione
 * Utilizza l'istanza API configurata con cache e gestione degli errori
 */
const authService = {
    /**
     * Effettua il login dell'utente
     * @param {string} email - Email dell'utente
     * @param {string} password - Password dell'utente
     * @returns {Promise<Object>} Dati dell'utente e token
     */
    login: async (email, password) => {
        try {
            // Ottieni il token CSRF (senza usare la cache)
            await api.get('/sanctum/csrf-cookie', { 
                useCache: false,
                retry: true,
                maxRetries: 3
            });

            // Effettua il login
            const response = await api.post('/login', {
                email,
                password
            });

            // Dopo un login riuscito, invalida la cache per garantire dati freschi
            api.clearCache();

            return response.data;
        } catch (error) {
            console.error('Errore durante il login:', error.message);
            throw error;
        }
    },

    /**
     * Ottiene i dati dell'utente corrente
     * @param {Object} options - Opzioni per la richiesta
     * @param {boolean} options.useCache - Se usare la cache (default: true)
     * @param {number} options.cacheTTL - TTL personalizzato per la cache in ms
     * @returns {Promise<Object>} Dati dell'utente
     */
    getUser: async (options = {}) => {
        try {
            const response = await api.get('/api/user', {
                useCache: options.useCache !== false,
                cacheTTL: options.cacheTTL || 5 * 60 * 1000, // 5 minuti di default
                retry: true
            });
            return response.data;
        } catch (error) {
            console.error('Errore durante il recupero dei dati utente:', error.message);
            throw error;
        }
    },

    /**
     * Effettua il logout dell'utente
     * @returns {Promise<void>}
     */
    logout: async () => {
        try {
            await api.post('/logout', {}, {
                useCache: false,
                retry: true
            });
            
            // Pulisci la cache dopo il logout
            api.clearCache();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } catch (error) {
            console.error('Errore durante il logout:', error.message);
            // Anche in caso di errore, pulisci i dati locali
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            throw error;
        }
    },

    /**
     * Verifica se l'utente è autenticato
     * @returns {boolean} True se l'utente è autenticato
     */
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    /**
     * Aggiorna i dati dell'utente in localStorage
     * @param {Object} userData - Nuovi dati dell'utente
     */
    updateUserData: (userData) => {
        if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
        }
    },

    /**
     * Ottiene i dati dell'utente da localStorage
     * @returns {Object|null} Dati dell'utente o null
     */
    getUserData: () => {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Errore nel parsing dei dati utente:', error);
            return null;
        }
    }
};

export default authService;
