import axios from 'axios';

const API_URL = 'http://localhost:8000';

const authService = {
    login: async (email, password) => {
        try {
            // Ottieni il token CSRF
            await axios.get(`${API_URL}/sanctum/csrf-cookie`, {
                withCredentials: true
            });

            // Effettua il login
            const response = await axios.post(`${API_URL}/login`, {
                email,
                password
            }, {
                withCredentials: true,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getUser: async () => {
        try {
            const response = await axios.get(`${API_URL}/api/user`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    logout: async () => {
        try {
            await axios.post(`${API_URL}/logout`, {}, {
                withCredentials: true
            });
            localStorage.removeItem('token');
        } catch (error) {
            throw error;
        }
    }
};

export default authService;
