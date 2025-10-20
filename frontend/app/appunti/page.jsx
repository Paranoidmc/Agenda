"use client";
import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import PageHeader from "../../components/PageHeader";

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyRow = () => ({
  cliente: "",
  luogo: "",
  ora: "",
  autista1: "",
  autista2: "",
  consegna: "",
});

export default function AppuntiPage() {
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState([emptyRow()]);
  const [clients, setClients] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteRowModal, setShowDeleteRowModal] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  // Carica anagrafiche base per suggerimenti
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const params = { perPage: 9999 };
        const [cRes, dRes] = await Promise.all([
          api.get("/clients", { params }),
          api.get("/drivers", { params }),
        ]);
        const cData = cRes.data?.data || cRes.data || [];
        const dData = dRes.data?.data || dRes.data || [];
        if (mounted) {
          setClients(Array.isArray(cData) ? cData : []);
          setDrivers(Array.isArray(dData) ? dData : []);
        }
      } catch (e) {
        console.error("Errore caricamento anagrafiche:", e);
        if (mounted) {
          setClients([]);
          setDrivers([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Persistenza locale per giorno
  const storageKey = useMemo(() => `appunti:${date}`, [date]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) setRows(parsed);
        else setRows([emptyRow()]);
      } else {
        setRows([emptyRow()]);
      }
    } catch {
      setRows([emptyRow()]);
    }
  }, [storageKey]);

  const saveLocal = () => {
    setSaving(true);
    try {
      const cleaned = rows.filter(r => Object.values(r).some(v => String(v || "").trim() !== ""));
      localStorage.setItem(storageKey, JSON.stringify(cleaned.length ? cleaned : [emptyRow()]));
      setLastSavedAt(new Date());
    } catch (e) {
      console.error("Errore salvataggio appunti:", e);
    } finally {
      setSaving(false);
    }
  };

  // Autosave con debounce ad ogni modifica
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      saveLocal();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, date]);

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const clearRows = () => setRows([emptyRow()]);
  const deleteRow = (idx) => {
    setRows(prev => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [emptyRow()];
    });
  };

  const handleDeleteRowClick = (idx) => {
    setRowToDelete(idx);
    setShowDeleteRowModal(true);
  };

  const confirmDeleteRow = () => {
    if (rowToDelete !== null) {
      deleteRow(rowToDelete);
    }
    setShowDeleteRowModal(false);
    setRowToDelete(null);
  };

  const cancelDeleteRow = () => {
    setShowDeleteRowModal(false);
    setRowToDelete(null);
  };
  
  const handleClearClick = () => {
    setShowConfirmModal(true);
  };

  const confirmClear = () => {
    clearRows();
    setShowConfirmModal(false);
  };

  const cancelClear = () => {
    setShowConfirmModal(false);
  };

  const updateCell = (idx, key, value) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  const suggestionsClients = useMemo(
    () => clients.map(c => c.nome || c.name || "").filter(Boolean),
    [clients]
  );
  const suggestionsDrivers = useMemo(
    () => drivers.map(d => {
      const n = d.nome || d.name || d.first_name || "";
      const s = d.cognome || d.surname || d.last_name || "";
      return `${n} ${s}`.trim();
    }).filter(Boolean),
    [drivers]
  );

  const renderAutocomplete = (value, onChange, list, listId) => (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        list={listId}
        style={cellInputStyle}
      />
      {/* Datalist dinamico per ogni campo - evita id duplicati usando il list inline */}
      <datalist id={listId}>
        {list.map((opt, i) => (
          <option key={i} value={opt} />
        ))}
      </datalist>
    </div>
  );

  if (loading) return <div className="centered">Caricamento...</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Appunti" showBackButton={true} onBackClick={() => history.back()} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <label style={{ fontWeight: 600 }}>Giorno:</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={dateInputStyle} />
        <button onClick={saveLocal} disabled={saving} style={btnPrimary}>
          {saving ? "Salvataggio..." : "Salva ora"}
        </button>
        <button onClick={addRow} style={btnLight}>+ Riga</button>
        <button onClick={handleClearClick} style={btnLight}>Svuota</button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Cliente</th>
              <th style={thStyle}>Luogo</th>
              <th style={thStyle}>Ora</th>
              <th style={thStyle}>Autista 1</th>
              <th style={thStyle}>Autista 2</th>
              <th style={thStyle}>Consegna da fare</th>
              <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td style={tdStyle}>
                  {renderAutocomplete(row.cliente, v => updateCell(idx, "cliente", v), suggestionsClients, `client-list-${idx}`)}
                </td>
                <td style={tdStyle}>
                  <input
                    value={row.luogo}
                    onChange={e => updateCell(idx, "luogo", e.target.value)}
                    placeholder="Indirizzo / Sede"
                    style={cellInputStyle}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="time"
                    value={row.ora}
                    onChange={e => updateCell(idx, "ora", e.target.value)}
                    style={cellInputStyle}
                  />
                </td>
                <td style={tdStyle}>
                  {renderAutocomplete(row.autista1, v => updateCell(idx, "autista1", v), suggestionsDrivers, `driver1-list-${idx}`)}
                </td>
                <td style={tdStyle}>
                  {renderAutocomplete(row.autista2, v => updateCell(idx, "autista2", v), suggestionsDrivers, `driver2-list-${idx}`)}
                </td>
                <td style={tdStyle}>
                  <input
                    value={row.consegna}
                    onChange={e => updateCell(idx, "consegna", e.target.value)}
                    placeholder="Note / Dettagli"
                    style={cellInputStyle}
                  />
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <button
                    onClick={() => handleDeleteRowClick(idx)}
                    title="Elimina riga"
                    style={btnDeleteSmall}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, color: "#666", fontSize: 13, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span>Suggerimenti disponibili per Cliente e Autisti. I dati sono salvati localmente per giorno.</span>
        {lastSavedAt && (
          <span style={{ color: '#4caf50' }}>Salvato automaticamente: {lastSavedAt.toLocaleTimeString()}</span>
        )}
      </div>

      {/* Modal di conferma */}
      {showConfirmModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
              Conferma cancellazione
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: 14 }}>
              Sei sicuro di voler cancellare tutto?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={cancelClear} style={btnSecondary}>
                Annulla
              </button>
              <button onClick={confirmClear} style={btnDanger}>
                Sì, cancella tutto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal di conferma per eliminazione singola riga */}
      {showDeleteRowModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
              Conferma eliminazione riga
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: 14 }}>
              Sei sicuro di voler eliminare questa riga?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={cancelDeleteRow} style={btnSecondary}>
                Annulla
              </button>
              <button onClick={confirmDeleteRow} style={btnDanger}>
                Sì, elimina riga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  background: "#fff",
  border: "1px solid #e5e5ea",
  borderRadius: 8,
};

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #e5e5ea",
  background: "#f8f9fb",
  fontWeight: 600,
  fontSize: 13,
  color: "#333",
};

const tdStyle = {
  padding: "8px 10px",
  borderBottom: "1px solid #f0f0f0",
};

const cellInputStyle = {
  width: "100%",
  padding: "9px 10px",
  border: "1px solid #e5e5ea",
  borderRadius: 6,
  fontSize: 14,
  background: "#fff",
};

const dateInputStyle = {
  padding: "8px 10px",
  border: "1px solid #e5e5ea",
  borderRadius: 6,
};

const btnPrimary = {
  padding: "8px 12px",
  background: "var(--primary)",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const btnLight = {
  padding: "8px 12px",
  background: "#f2f2f7",
  color: "#333",
  border: "1px solid #e5e5ea",
  borderRadius: 6,
  cursor: "pointer",
};

const btnSecondary = {
  padding: "10px 16px",
  background: "#f2f2f7",
  color: "#333",
  border: "1px solid #e5e5ea",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
};

const btnDanger = {
  padding: "10px 16px",
  background: "#ff3b30",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
};

const btnDeleteSmall = {
  padding: "6px 10px",
  background: "#ffecec",
  color: "#d32f2f",
  border: "1px solid #f4c7c7",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalContentStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: 24,
  maxWidth: 400,
  width: "90%",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
};
