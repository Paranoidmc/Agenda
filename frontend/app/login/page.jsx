"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, loading, user, sessionExpired } = useAuth();
  const router = useRouter();

  // ✅ FIX: Redirect automatico se utente già autenticato
  useEffect(() => {
    if (user && !loading && !sessionExpired) {
      console.log("[LOGIN-PAGE] Utente già autenticato, redirect a dashboard");
      router.push("/dashboard");
    }
  }, [user, loading, sessionExpired, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    console.group("[LOGIN-PAGE] Processo di login");
    
    // Pulisci eventuali token residui e dati non validi
    if (typeof window !== 'undefined') {
      try {
        // Salva temporaneamente i valori per il debug
        const oldToken = localStorage.getItem("token");
        const oldUser = localStorage.getItem("user");
        
        // Rimuovi i dati
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        
        // Pulisci anche eventuali valori non validi
        if (localStorage.getItem("user") === "undefined" || localStorage.getItem("user") === "null") {
          localStorage.removeItem("user");
        }
        
        // Forza la pulizia di localStorage se ci sono problemi
        if (localStorage.getItem("user")) {
          console.warn("[LOGIN-PAGE] Pulizia forzata dei dati utente");
          localStorage.clear();
        }
        
        // Verifica che i dati siano stati rimossi
        const tokenAfter = localStorage.getItem("token");
        const userAfter = localStorage.getItem("user");
      } catch (storageError) {
        console.error("[LOGIN-PAGE] Errore nella pulizia dello storage:", storageError);
      }
    }
    
    try {
      
      // Chiamata alla funzione login del contesto di autenticazione
      const loginResult = await login(email, password);
      
      
      // Attendi un momento per assicurarsi che i dati siano salvati
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verifica che l'utente sia stato impostato correttamente
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");
        
        
        if (token && userData) {
          // Reindirizza alla dashboard
          
          // Aggiungi un parametro per evitare la cache
          window.location.href = '/dashboard?t=' + new Date().getTime();
        } else {
          // Se mancano i dati, mostra un errore
          console.error("[LOGIN-PAGE] Dati mancanti dopo il login");
          setError("Errore durante il login: dati utente non salvati correttamente");
          
          // Pulisci i dati
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
    } catch (err) {
      console.error("[LOGIN-PAGE] Errore di login:", err);
      
      // Mostra un messaggio di errore più specifico se disponibile
      if (err.message) {
        setError(err.message);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Credenziali non valide o errore di connessione");
      }
    } finally {
      console.groupEnd();
    }
  };

  // Se già loggato, redirect
  if (user) {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
    return null;
  }

  return (
    <div className="centered">
      <form className="card" onSubmit={handleSubmit} style={{ minWidth: 320, maxWidth: 360 }}>
        <h2 style={{ textAlign: 'center', fontWeight: 600, marginBottom: 24 }}>Accedi</h2>
        <div style={{ marginBottom: 16 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75em', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)' }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75em', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)' }}
          />
        </div>
        {error && <div style={{ color: '#d32d2f', marginBottom: 16, textAlign: 'center' }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Accesso in corso...' : 'Accedi'}
        </button>
      </form>
    </div>
  );
}
