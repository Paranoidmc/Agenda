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
      
      // Controlla se abbiamo un utente in localStorage
      let userFromStorage = null;
      
      if (typeof window !== 'undefined') {
        try {
          const userJson = localStorage.getItem('user');
          if (userJson) {
            userFromStorage = JSON.parse(userJson);
          }
          
          // Non usiamo Authorization Bearer con sessione Sanctum
        } catch (error) {
          console.error("[AUTH] Errore nel parsing dei dati utente da localStorage:", error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
      
      // ✅ FIX: NON impostare l'utente finché non è verificato dal server
      // Se non c'è un utente in localStorage, considera non autenticato
      if (!userFromStorage) {
        setUser(null);
        setSessionExpired(false);
        setLoading(false);
        return;
      }

      // ✅ FIX: Verifica PRIMA di impostare l'utente
      try {
        const res = await api.get("/user", { withCredentials: true });
        
        if (res.data) {
          // ✅ Solo ora imposta l'utente come loggato
          setUser(res.data);
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(res.data));
          }
          setSessionExpired(false);
        } else {
          // Sessione non valida
          setUser(null);
          setSessionExpired(true);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error("[AUTH] Errore nella verifica dell'autenticazione:", error);
        
        // ✅ FIX: Gestione errori più chiara
        if (error.response && [401, 419].includes(error.response.status)) {
          // Sessione scaduta o non autorizzato
          setUser(null);
          setSessionExpired(true);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        } else {
          // Altri errori (rete, server down, etc.)
          // In caso di errore di rete, mantieni l'utente ma segnala il problema
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
      // Ottieni sempre il CSRF cookie prima del login
      await api.get("/sanctum/csrf-cookie", {
        withCredentials: true,
        useCache: false,
        skipLoadingState: true,
      });
      // Login solo tramite sessione
      const res = await api.post("/session-login-controller", { email, password }, { withCredentials: true });
      if (res.data && res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        setSessionExpired(false);
        setLoading(false);
        return res.data.user;
      }
      // Se non abbiamo ricevuto l'utente nella risposta di login, proviamo a ottenerlo
      const userRes = await api.get("/user", { withCredentials: true });
      if (userRes.data) {
        localStorage.setItem('user', JSON.stringify(userRes.data));
        setUser(userRes.data);
        setSessionExpired(false);
        setLoading(false);
        return userRes.data;
      } else {
        localStorage.removeItem('user');
        setUser(null);
        setSessionExpired(true);
        setLoading(false);
        throw new Error("Login fallito: impossibile ottenere i dati utente");
      }
    } catch (err) {
      localStorage.removeItem('user');
      setUser(null);
      setSessionExpired(true);
      setLoading(false);
      throw err;
    }
  };


  const logout = async () => {
    setLoading(true);
    try {
      // Chiama il backend per invalidare la sessione
      await api.post("/logout", {}, { withCredentials: true });
    } catch (error) {
      console.error("[AUTH] Errore durante la chiamata di logout al backend:", error);
      // Non importa se fallisce, procediamo a pulire il frontend
    } finally {
      // Pulisce lo stato locale in ogni caso
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('token'); // Rimuoviamo anche il token per sicurezza
      }
      setUser(null);
      setSessionExpired(false);
      setLoading(false);

      // FORZA il reindirizzamento alla pagina di login.
      // Questa è la parte fondamentale che mancava.
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
