"use client";
import React, { useState, useEffect } from "react";
import api from "../../lib/api";

import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

export default function MomapSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  if (!authLoading && (!user || user.role !== "admin")) {
    if (typeof window !== "undefined") router.replace("/dashboard");
    return null;
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get("/settings/momap")
      .then(res => {
        if (res.data && res.data.email) setEmail(res.data.email);
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
      await api.post("/settings/momap", { email, password });
      setSuccess("Credenziali MOMAP salvate con successo.");
    } catch (err) {
      setError("Errore nel salvataggio credenziali.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await api.post("/momap/test-login", { email, password });
      if (res.data && res.data.success) {
        setTestResult({ success: true, message: "Login MOMAP riuscito!" });
      } else {
        setTestResult({ success: false, message: res.data?.error || "Login fallito" });
      }
    } catch (err) {
      setTestResult({ success: false, message: "Errore nella chiamata login." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: "40px auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", padding: "2.5rem 2rem 2rem 2rem" }}>
      <h2 style={{ fontWeight: 700, fontSize: "1.35rem", marginBottom: 24 }}>Impostazioni integrazione MOMAP</h2>
      <form onSubmit={handleSave} className="settings-momap-form">
        <label>Email MOMAP
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>Password MOMAP
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <div className="settings-momap-actions">
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
        .settings-momap-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .settings-momap-form label {
          display: flex;
          flex-direction: column;
          font-weight: 500;
          color: #334155;
        }
        .settings-momap-form input {
          margin-top: 0.5rem;
          padding: 0.8em 1em;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: #f9fafb;
          font-size: 1rem;
        }
        .settings-momap-actions {
          display: flex;
          gap: 1.2rem;
        }
        .settings-momap-actions button {
          padding: 0.7em 1.7em;
          border-radius: 8px;
          border: none;
          background: #3b82f6;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .settings-momap-actions button:disabled {
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
}
