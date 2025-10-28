"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true);
      
      // Controlla se abbiamo un token e utente in localStorage
      let userFromStorage = null;
      let tokenFromStorage = null;
      
      if (typeof window !== 'undefined') {
        try {
          const userJson = localStorage.getItem('user');
          const token = localStorage.getItem('token');
          if (userJson) {
            userFromStorage = JSON.parse(userJson);
          }
          if (token) {
            tokenFromStorage = token;
            // Imposta il token nell'header delle richieste
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
        } catch (error) {
          console.error("[AUTH] Errore nel parsing dei dati utente da localStorage:", error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
      
      // Se non c'è un token, considera non autenticato
      if (!tokenFromStorage || !userFromStorage) {
        setUser(null);
        setSessionExpired(false);
        setLoading(false);
        return;
      }

      // Verifica il token con il server
      try {
        const res = await api.get("/user");
        
        if (res.data) {
          // Token valido, aggiorna i dati utente
          setUser(res.data);
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(res.data));
          }
          setSessionExpired(false);
        } else {
          // Token non valido
          setUser(null);
          setSessionExpired(true);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error("[AUTH] Errore nella verifica dell'autenticazione:", error);
        
        if (error.response && [401, 403].includes(error.response.status)) {
          // Token scaduto o non autorizzato
          setUser(null);
          setSessionExpired(true);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        } else {
          // Altri errori (rete, server down, etc.)
          console.warn("[AUTH] Errore di rete, mantengo utente locale ma potrebbe essere necessario ri-autenticarsi");
          setUser(userFromStorage);
          setSessionExpired(false);
        }
      }
      
      setLoading(false);
    };
    
    checkUser();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      if (process.env.NODE_ENV === 'production') {
        // Flow session-based via Sanctum + proxy (cookie-based)
        await api.get('/sanctum/csrf-cookie', { withCredentials: true });
        const res = await api.post('/session-login-controller', { email, password }, { withCredentials: true });
        if (!res || res.status >= 400) throw new Error('Login fallito');
        // Recupera dati utente autenticato tramite cookie di sessione
        const me = await api.get('/user', { withCredentials: true, useCache: false, skipLoadingState: false });
        if (me?.data) {
          setUser(me.data);
          localStorage.setItem('user', JSON.stringify(me.data));
          // Rimuovi eventuale token precedente
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          setSessionExpired(false);
          setLoading(false);
          return me.data;
        }
        throw new Error('Impossibile ottenere i dati utente');
      } else {
        // Flow token-based in sviluppo
        const res = await api.post('/login', { email, password });
        if (res.data && res.data.token) {
          const token = res.data.token;
          const user = res.data.user;
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setUser(user);
          setSessionExpired(false);
          setLoading(false);
          return user;
        }
        throw new Error('Login fallito');
      }
    } catch (err) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setSessionExpired(true);
      setLoading(false);
      throw err;
    }
  };


  const logout = async () => {
    setLoading(true);
    try {
      // Chiama il backend per invalidare il token
      await api.post("/logout");
    } catch (error) {
      console.error("[AUTH] Errore durante la chiamata di logout al backend:", error);
      // Non importa se fallisce, procediamo a pulire il frontend
    } finally {
      // Pulisce lo stato locale in ogni caso
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
      
      // Rimuove il token dall'header delle richieste
      delete api.defaults.headers.common['Authorization'];
      
      setUser(null);
      setSessionExpired(false);
      setLoading(false);

      // FORZA il reindirizzamento alla pagina di login.
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, sessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve essere usato dentro AuthProvider");
  return context;
};
