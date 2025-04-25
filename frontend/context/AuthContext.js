"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true);
      // console.log("[AUTH] Verificando stato autenticazione...");
      
      // Controlla se abbiamo un utente in localStorage
      let userFromStorage = null;
      let tokenFromStorage = null;
      
      if (typeof window !== 'undefined') {
        try {
          const userJson = localStorage.getItem('user');
          if (userJson) {
            userFromStorage = JSON.parse(userJson);
            // console.log("[AUTH] Utente trovato in localStorage");
          }
          
          tokenFromStorage = localStorage.getItem('token');
          if (tokenFromStorage) {
            // console.log("[AUTH] Token trovato in localStorage");
          }
        } catch (error) {
          console.error("[AUTH] Errore nel parsing dei dati utente da localStorage:", error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
      
      // Se abbiamo un utente in localStorage, lo usiamo temporaneamente
      if (userFromStorage) {
        setUser(userFromStorage);
      }
      
      // Verifica con il server se l'utente è ancora autenticato
      try {
        const res = await api.get("/user", { 
          withCredentials: true,
          headers: {
            ...(tokenFromStorage ? { 'Authorization': `Bearer ${tokenFromStorage}` } : {})
          }
        });
        
        if (res.data) {
          // console.log("[AUTH] Utente autenticato confermato dal server");
          setUser(res.data);
          
          // Aggiorna i dati utente in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        } else {
          console.log("[AUTH] Utente non autenticato secondo il server");
          setUser(null);
          
          // Pulisci localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error("[AUTH] Errore nella verifica dell'autenticazione:", error);
        
        // Se abbiamo un errore ma avevamo un utente in localStorage, manteniamo l'utente
        // per evitare logout improvvisi in caso di problemi di rete temporanei
        if (!userFromStorage) {
          setUser(null);
          
          // Pulisci localStorage solo se non avevamo un utente
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
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
      await api.get("/sanctum/csrf-cookie", { withCredentials: true });
      
      // Prova prima il login con token
      let res;
      try {
        console.log("[AUTH] Tentativo di login con token...");
        res = await api.post("/token-login", { email, password }, { withCredentials: true });
        console.log("[AUTH] Login con token riuscito");
      } catch (tokenLoginError) {
        console.log("[AUTH] Login con token fallito, provo con sessione...", tokenLoginError);
        // Se fallisce, prova il login con sessione
        res = await api.post("/login", { email, password }, { withCredentials: true });
        console.log("[AUTH] Login con sessione riuscito");
      }
      
      // Salva il token se presente nella risposta
      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        console.log("[AUTH] Token salvato in localStorage");
      }
      
      // Salva i dati utente se presenti nella risposta
      if (res.data && res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        setLoading(false);
        return res.data.user;
      }
      
      // Se non abbiamo ricevuto l'utente nella risposta di login, proviamo a ottenerlo
      const userRes = await api.get("/user", { 
        withCredentials: true,
        headers: {
          ...(res.data?.token ? { 'Authorization': `Bearer ${res.data.token}` } : {})
        }
      });
      
      if (userRes.data) {
        localStorage.setItem('user', JSON.stringify(userRes.data));
        setUser(userRes.data);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setLoading(false);
        throw new Error("Login fallito: impossibile ottenere i dati utente");
      }
      
      setLoading(false);
      return userRes.data;
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
      throw err;
    }
  };


  const logout = async () => {
    try {
      // Ottieni il token da localStorage se disponibile
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      // Esegui il logout
      await api.post("/logout", {}, { 
        withCredentials: true,
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
    } catch (error) {
      console.error("[AUTH] Errore durante il logout:", error);
    } finally {
      // Pulisci localStorage e stato anche se la richiesta fallisce
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve essere usato dentro AuthProvider");
  return context;
};
