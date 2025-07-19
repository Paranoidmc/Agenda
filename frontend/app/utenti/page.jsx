"use client";
import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function UtentiPage() {
  const { user } = useAuth();
  const [utenti, setUtenti] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", role: "user", password: "" });
  const [editingId, setEditingId] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);

  const [erroreUtenti, setErroreUtenti] = useState("");
  useEffect(() => {
    if (user?.role === "admin") loadUtenti();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dataVersion]);

  const loadUtenti = async () => {
    try {
      const res = await api.get("/users");
      if (Array.isArray(res.data) && res.data.length === 0) {
        console.warn("La lista utenti è vuota!", res.data);
      }
      setUtenti(res.data);
      setErroreUtenti("");
    } catch (error) {
      if (error.response?.status === 403) {
        setErroreUtenti("Accesso negato alla lista utenti (permessi insufficienti)");
        setUtenti([]);
      } else if ([401, 419].includes(error.response?.status)) {
        setErroreUtenti("Sessione scaduta o non autenticato. Per favore, effettua nuovamente il login per gestire gli utenti.");
        setUtenti([]);
      } else {
        setErroreUtenti("Errore caricamento utenti: " + (error.message || "Errore sconosciuto"));
        setUtenti([]);
      }
    }
  };

  if (!user || user.role !== "admin") return <div>Accesso negato</div>;

  const handleSave = async (e) => {
    e.preventDefault();
    if (editingId) {
      await api.put(`/users/${editingId}`, form);
    } else {
      await api.post("/users", form);
    }
    setForm({ name: "", email: "", role: "user", password: "" });
    setEditingId(null);
    setDataVersion(v => v + 1);
  };

  const handleEdit = (u) => setForm({ ...u, password: "" }) || setEditingId(u.id);
  const handleDelete = async (id) => { if(window.confirm("Eliminare utente?")) { await api.delete(`/users/${id}`); setDataVersion(v => v + 1); } };

  return (
    <div style={{
      background: '#fafbfc',
      minHeight: '100vh',
      padding: '40px 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        padding: '32px 36px',
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 24,
          textAlign: 'center',
          letterSpacing: 0.5,
          color: '#1a1a1a',
        }}>Gestione Utenti</h1>
        {erroreUtenti && (
          <div style={{ color: 'red', marginBottom: 16, textAlign: 'center', fontWeight: 500 }}>
            {erroreUtenti}
          </div>
        )}
        <form onSubmit={handleSave} style={{
          display: 'flex',
          gap: 12,
          marginBottom: 28,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome" required style={{ flex: '1 1 180px', padding: 10, borderRadius: 6, border: '1px solid #ddd', fontSize: 15 }} />
          <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" required type="email" style={{ flex: '1 1 220px', padding: 10, borderRadius: 6, border: '1px solid #ddd', fontSize: 15 }} />
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ flex: '1 1 160px', padding: 10, borderRadius: 6, border: '1px solid #ddd', fontSize: 15 }}>
            <option value="admin">Amministratore</option>
            <option value="manager">Manager</option>
            <option value="user">Utente semplice</option>
          </select>
          <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" type="password" required={!editingId} style={{ flex: '1 1 180px', padding: 10, borderRadius: 6, border: '1px solid #ddd', fontSize: 15 }} />
          <button type="submit" style={{ padding: '10px 18px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600 }}>{editingId ? "Aggiorna" : "Crea"}</button>
          {editingId && <button type="button" style={{ padding: '10px 18px', background: '#eee', color: '#333', border: 'none', borderRadius: 6, fontWeight: 600 }} onClick={() => { setForm({ name: "", email: "", role: "user", password: "" }); setEditingId(null); }}>Annulla</button>}
        </form>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <thead>
              <tr style={{ background: '#f5f6fa' }}>
                <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 600, color: '#333' }}>Nome</th>
                <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 600, color: '#333' }}>Email</th>
                <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 600, color: '#333' }}>Ruolo</th>
                <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600, color: '#333' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {utenti.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: '10px 8px' }}>{u.name}</td>
                  <td style={{ padding: '10px 8px' }}>{u.email}</td>
                  <td style={{ padding: '10px 8px', textTransform: 'capitalize' }}>{u.role}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <button onClick={() => handleEdit(u)} style={{ marginRight: 8, padding: '6px 14px', background: '#fff', border: '1px solid #1976d2', color: '#1976d2', borderRadius: 6, fontWeight: 500, cursor: 'pointer' }}>Modifica</button>
                    <button onClick={() => handleDelete(u.id)} style={{ padding: '6px 14px', background: '#f44336', border: 'none', color: '#fff', borderRadius: 6, fontWeight: 500, cursor: 'pointer' }}>Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
