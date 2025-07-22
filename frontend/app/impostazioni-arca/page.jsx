"use client";
import React, { useState, useEffect } from "react";
import api from "../../lib/api";

const ArcaSettingsPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    // Carica credenziali salvate
    setLoading(true);
    api.get("/settings/arca")
      .then(res => {
        if (res.data && res.data.username) setUsername(res.data.username);
        if (res.data && res.data.password) setPassword(res.data.password);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      await api.post("/settings/arca", { username, password });
      setSuccess("Credenziali salvate correttamente.");
    } catch (err) {
      setError("Errore nel salvataggio delle credenziali.");
    }
    setLoading(false);
  };

  const handleTestLogin = async () => {
    setTestResult(null);
    setLoading(true);
    try {
      const res = await api.post("/arca/test-login", { username, password });
      if (res.data && res.data.success) {
        setTestResult({ success: true, message: "Login Arca OK" });
      } else {
        setTestResult({ success: false, message: res.data.message || "Login fallito" });
      }
    } catch (err) {
      setTestResult({ success: false, message: "Errore di connessione o credenziali non valide." });
    }
    setLoading(false);
  };

  return (
    <div className="settings-arca-container">
      <h2>Impostazioni integrazione Arca</h2>
      <form onSubmit={handleSave} className="settings-arca-form">
        <label>Username Arca
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>Password Arca
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <div className="settings-arca-actions">
          <button type="submit" disabled={loading}>Salva credenziali</button>
          <button type="button" onClick={handleTestLogin} disabled={loading}>Test login</button>
        </div>
        {success && <div className="success-msg">{success}</div>}
        {error && <div className="error-msg">{error}</div>}
        {testResult && (
          <div className={testResult.success ? "test-ok" : "test-fail"}>
            {testResult.message}
          </div>
        )}
      </form>
      <style jsx>{`
        .settings-arca-container {
          max-width: 420px;
          margin: 40px auto;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.07);
          padding: 2.5rem 2rem 2rem 2rem;
        }
        .settings-arca-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .settings-arca-form label {
          display: flex;
          flex-direction: column;
          font-weight: 500;
          color: #334155;
        }
        .settings-arca-form input {
          margin-top: 0.5rem;
          padding: 0.7rem 1rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          font-size: 1rem;
        }
        .settings-arca-actions {
          display: flex;
          gap: 1rem;
        }
        .settings-arca-actions button {
          padding: 0.7rem 1.4rem;
          border-radius: 8px;
          border: none;
          background: #3b82f6;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .settings-arca-actions button:disabled {
          background: #a5b4fc;
          cursor: not-allowed;
        }
        .success-msg {
          color: #22c55e;
          font-weight: 500;
        }
        .error-msg {
          color: #ef4444;
          font-weight: 500;
        }
        .test-ok {
          color: #22c55e;
        }
        .test-fail {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
};

export default ArcaSettingsPage;
