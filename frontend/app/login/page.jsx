"use client";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, loading, user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Pulisci eventuali token residui
    if (typeof window !== 'undefined') {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    
    try {
      console.log("Tentativo di login con email:", email);
      await login(email, password);
      
      console.log("Login riuscito, reindirizzamento alla dashboard...");
      
      // Forza un reload della pagina dopo il login
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error("Errore di login:", err);
      
      // Mostra un messaggio di errore più specifico se disponibile
      if (err.message) {
        setError(err.message);
      } else {
        setError("Credenziali non valide o errore di connessione");
      }
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
