import api from '../../lib/api';

/**
 * Servizio legacy per la gestione dell'autenticazione
 * Ora la login/logout/checkUser va gestita tramite AuthContext/useAuth
 * Questo modulo va usato solo per utility o refactoring futuro
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
            // 1. Ottieni il token CSRF (senza usare la cache)
            await api.get('/sanctum/csrf-cookie', {
                useCache: false,
                retry: true,
                maxRetries: 3
            });

            // 2. Effettua il login
            const response = await api.post('/session-login-controller', {
                email,
                password
            });

            api.clearCache();

            // Login riuscito solo se arriva 'user'
            if (response.data && response.data.user) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }

            return response.data;
        } catch (error) {
            // Gestione errore CSRF (419)
            if (error.response && error.response.status === 419) {
                throw new Error('Sessione scaduta o token CSRF mancante. Riprova a effettuare il login.');
            }
            // Altri errori
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
            // Ora usa la route session-based
            const response = await api.get('/user', {
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
        // Considera autenticato solo se esiste 'user' in localStorage
        return !!localStorage.getItem('user');
    },

    /**
     * Aggiorna i dati dell'utente in localStorage
     * @param {Object} userData - Nuovi dati dell'utente
     */
    updateUserData: (userData) => {
        if (userData && typeof userData === 'object') {
            try {
                localStorage.setItem('user', JSON.stringify(userData));
            } catch (error) {
                console.error('Errore nel salvataggio dei dati utente:', error);
            }
        } else if (userData === null) {
            // Se userData è null, rimuovi i dati utente
            localStorage.removeItem('user');
        }
    },

    /**
     * Ottiene i dati dell'utente da localStorage
     * @returns {Object|null} Dati dell'utente o null
     */
    getUserData: () => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData || userData === 'undefined' || userData === 'null') {
                return null;
            }
            return JSON.parse(userData);
        } catch (error) {
            console.error('Errore nel parsing dei dati utente:', error);
            // Rimuovi i dati utente non validi
            localStorage.removeItem('user');
            return null;
        }
    }
};

export default authService;
