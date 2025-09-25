"use client";
import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import PageHeader from "../../components/PageHeader";

function toDate(val) {
  if (!val) return null;
  if (typeof val === "string" && val.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return new Date(val + "T00:00:00");
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function formatTime(val) {
  const d = toDate(val);
  if (!d) return "";
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function AgendaAutistiPage() {
  const [date, setDate] = useState(todayISO());
  const [view, setView] = useState("day"); // 'day' | 'week'
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingActs, setLoadingActs] = useState(false);
  const [error, setError] = useState("");
  const [activitiesByDay, setActivitiesByDay] = useState({}); // { 'YYYY-MM-DD': activities[] }
  const [includeAllStatuses, setIncludeAllStatuses] = useState(false);
  const [driverQuery, setDriverQuery] = useState("");

  // Carica anagrafica autisti
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/drivers", { params: { perPage: 9999 } });
        const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        if (mounted) setDrivers(arr);
      } catch (e) {
        console.error("Errore caricamento autisti:", e);
        if (mounted) setDrivers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const weekDays = useMemo(() => {
    if (view !== "week") return [date];
    const center = toDate(date);
    if (!center) return [date];
    // settimana lun-dom contenente la data
    const dayIdx = (center.getDay() + 6) % 7; // lun=0
    const monday = new Date(center);
    monday.setDate(center.getDate() - dayIdx);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, [date, view]);

  // Carica attività per giorno o settimana
  useEffect(() => {
    let mounted = true;
    const fetchForDays = async (days) => {
      setLoadingActs(true);
      setError("");
      try {
        const results = await Promise.all(days.map(async (d) => {
          const params = new URLSearchParams({ perPage: "500", date: String(d) });
          params.append("include", "resources");
          const { data } = await api.get(`/activities?${params.toString()}`);
          const items = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
          return [d, items];
        }));
        if (!mounted) return;
        const map = {};
        for (const [d, items] of results) map[d] = items;
        setActivitiesByDay(map);
      } catch (e) {
        console.error("Errore caricamento attività:", e);
        if (mounted) {
          setError("Impossibile caricare le attività");
          setActivitiesByDay({});
        }
      } finally {
        if (mounted) setLoadingActs(false);
      }
    };
    fetchForDays(weekDays);
    return () => { mounted = false; };
  }, [weekDays]);

  const groupedByDriver = useMemo(() => {
    // Restituisce { driverId: { driver, perDay: { date: [acts] } } }
    const acc = {};
    const allowedStatuses = includeAllStatuses ? null : new Set(['in corso','programmato','assegnato','doc emesso','planned','scheduled','assigned']);
    for (const d of weekDays) {
      const items = activitiesByDay[d] || [];
      for (const act of items) {
        const start = act.data_inizio || act.start_date || act.start;
        const end = act.data_fine || act.end_date || act.end;
        // Filtra per data esatta del giorno d per evitare "corse passate" di altri giorni
        const startDate = toDate(start);
        if (!startDate || startDate.toISOString().slice(0,10) !== d) continue;
        // Filtra per stato se richiesto
        const status = String(act.status || act.stato || '').toLowerCase();
        if (allowedStatuses && status && !allowedStatuses.has(status)) continue;
        const resources = Array.isArray(act.resources) ? act.resources : [];
        for (const r of resources) {
          const drv = r.driver || (r.driver_id && drivers.find(x => String(x.id) === String(r.driver_id)));
          if (!drv) continue;
          const key = String(drv.id);
          if (!acc[key]) acc[key] = { driver: drv, perDay: {} };
          if (!acc[key].perDay[d]) acc[key].perDay[d] = [];
          acc[key].perDay[d].push({
            id: act.id,
            descrizione: act.descrizione || act.titolo || "",
            start,
            end,
          });
        }
      }
    }
    return acc;
  }, [activitiesByDay, weekDays, drivers, includeAllStatuses]);

  const driverList = useMemo(() => {
    // Mostra solo autisti con impegni in periodo selezionato (giorno o settimana)
    const hasAssignments = new Set(Object.keys(groupedByDriver));
    let list = drivers.filter(d => hasAssignments.has(String(d.id)));
    // Applica filtro ricerca autista se presente
    const q = driverQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(d => (
        ((d.nome || d.name || d.first_name || '') + ' ' + (d.cognome || d.surname || d.last_name || '')).toLowerCase().includes(q)
      ));
    }
    if (list.length > 0) return list;
    // Fallback robusto: verifica direttamente nelle attività per sicurezza
    const withActs = new Set();
    for (const day of weekDays) {
      const items = activitiesByDay[day] || [];
      for (const act of items) {
        // data esatta e stato
        const start = act.data_inizio || act.start_date || act.start;
        const sd = toDate(start); if (!sd || sd.toISOString().slice(0,10) !== day) continue;
        const status = String(act.status || act.stato || '').toLowerCase();
        const allowedStatuses = includeAllStatuses ? null : new Set(['in corso','programmato','assegnato','doc emesso','planned','scheduled','assigned']);
        if (allowedStatuses && status && !allowedStatuses.has(status)) continue;
        const resources = Array.isArray(act.resources) ? act.resources : [];
        for (const r of resources) {
          const drvId = r.driver?.id || r.driver_id;
          if (drvId != null) withActs.add(String(drvId));
        }
      }
    }
    let res = drivers.filter(d => withActs.has(String(d.id)));
    if (q) {
      res = res.filter(d => (
        ((d.nome || d.name || d.first_name || '') + ' ' + (d.cognome || d.surname || d.last_name || '')).toLowerCase().includes(q)
      ));
    }
    return res;
  }, [drivers, groupedByDriver, activitiesByDay, weekDays, driverQuery, includeAllStatuses]);

  const goPrev = () => {
    const base = toDate(date);
    if (!base) return;
    if (view === "day") {
      const d = new Date(base); d.setDate(base.getDate() - 1); setDate(d.toISOString().slice(0,10));
    } else {
      const d = new Date(base); d.setDate(base.getDate() - 7); setDate(d.toISOString().slice(0,10));
    }
  };
  const goNext = () => {
    const base = toDate(date);
    if (!base) return;
    if (view === "day") {
      const d = new Date(base); d.setDate(base.getDate() + 1); setDate(d.toISOString().slice(0,10));
    } else {
      const d = new Date(base); d.setDate(base.getDate() + 7); setDate(d.toISOString().slice(0,10));
    }
  };

  if (loading) return <div className="centered">Caricamento...</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Agenda Autisti" showBackButton onBackClick={() => history.back()} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={goPrev} style={btnLight}>{view === 'day' ? '← Giorno prec.' : '← Settimana prec.'}</button>
          <button onClick={goNext} style={btnLight}>{view === 'day' ? 'Giorno succ. →' : 'Settimana succ. →'}</button>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={dateInputStyle} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setView('day')} style={view === 'day' ? btnPrimary : btnLight}>Giorno</button>
          <button onClick={() => setView('week')} style={view === 'week' ? btnPrimary : btnLight}>Settimana</button>
        </div>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
          <input type="checkbox" checked={includeAllStatuses} onChange={e => setIncludeAllStatuses(e.target.checked)} />
          Includi completate/annullate
        </label>
        <input
          type="text"
          placeholder="Cerca autista..."
          value={driverQuery}
          onChange={e => setDriverQuery(e.target.value)}
          style={{ ...dateInputStyle, minWidth: 220 }}
        />
      </div>

      {error && <div style={{ color: '#d32f2f', marginBottom: 12 }}>{error}</div>}

      {view === 'day' ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {loadingActs ? (
            <div style={{ color: '#666' }}>Caricamento impegni...</div>
          ) : driverList.length === 0 ? (
            <div style={{ color: '#666' }}>Nessun autista risulta impegnato per il giorno selezionato.</div>
          ) : (
            driverList.map(d => (
              <div key={d.id} style={cardStyle}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {(d.nome || d.name || d.first_name || '') + ' ' + (d.cognome || d.surname || d.last_name || '')}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {(groupedByDriver[String(d.id)]?.perDay?.[date] || []).map(a => (
                    <li key={a.id}>
                      <a href={`/attivita/${a.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#0b5ed7' }}>
                        {a.descrizione || 'Attività'}
                      </a>
                      {` — ${formatTime(a.start)}${a.end ? ` - ${formatTime(a.end)}` : ''}`}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Autista</th>
                {weekDays.map(d => (
                  <th key={d} style={thStyle}>{new Date(d).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {driverList.length === 0 ? (
                <tr><td style={tdStyle} colSpan={1 + weekDays.length}>Nessun autista impegnato nella settimana.</td></tr>
              ) : (
                driverList.map(d => (
                  <tr key={d.id}>
                    <td style={tdStyle}>
                      {(d.nome || d.name || d.first_name || '') + ' ' + (d.cognome || d.surname || d.last_name || '')}
                    </td>
                    {weekDays.map(day => {
                      const list = (groupedByDriver[String(d.id)]?.perDay?.[day] || []);
                      return (
                        <td key={day} style={tdStyle}>
                          {list.length === 0 ? (
                            <span style={{ color: '#999' }}>—</span>
                          ) : (
                            <ul style={{ margin: 0, paddingLeft: 16 }}>
                              {list.map(a => (
                                <li key={a.id}>
                                  {formatTime(a.start)}{a.end ? `-${formatTime(a.end)}` : ''} ·
                                  {' '}
                                  <a href={`/attivita/${a.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#0b5ed7' }}>
                                    {a.descrizione || 'Attività'}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e5ea',
  borderRadius: 8,
  padding: 12,
};

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
  whiteSpace: 'nowrap',
};
const tdStyle = {
  padding: "8px 10px",
  borderBottom: "1px solid #f0f0f0",
  verticalAlign: 'top',
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
const dateInputStyle = {
  padding: "8px 10px",
  border: "1px solid #e5e5ea",
  borderRadius: 6,
};
