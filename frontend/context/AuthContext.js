"use client";
import { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/api"; // Importa l'istanza API configurata

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Inizia con loading=true

  useEffect(() => {
    // Controlla se c'è un utente salvato
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error("Errore nel recupero dell'utente:", error);
    } finally {
      // Imposta loading a false quando il controllo è completato
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      console.log("[LOGIN] Avvio login...");

      // 1. Ottieni il token CSRF
      await api.get("/sanctum/csrf-cookie");
      console.log("[LOGIN] CSRF token ottenuto");

      // 2. Prova login
      const loginResponse = await api.post(
        "/login",
        {
          email,
          password,
        }
      );

      console.log("[LOGIN] Risposta login:", loginResponse.data);

      // Salva il token e i dati utente
      localStorage.setItem("token", loginResponse.data.token);
      localStorage.setItem("user", JSON.stringify(loginResponse.data.user));

      // Aggiorna lo stato
      setUser(loginResponse.data.user);
    } catch (error) {
      console.error("[LOGIN] Errore:", error.response?.data || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Usa l'istanza API configurata
      await api.post("/logout", {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }
      });
    } catch (error) {
      console.error("[LOGOUT] Errore:", error);
    }

    // Rimuovi i dati salvati
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);

    // Redirect alla pagina di login
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
