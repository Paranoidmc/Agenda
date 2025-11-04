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
  const [view, setView] = useState("grid"); // 'day' | 'week' | 'grid'
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
          const { data } = await api.get(`/activities?${params.toString()}`, { useCache: false, skipLoadingState: false });
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
      const dayStart = toDate(d);
      const dayEnd = toDate(d);
      if (dayStart && dayEnd) {
        dayStart.setHours(0, 0, 0, 0);
        dayEnd.setHours(23, 59, 59, 999);
      }
      for (const act of items) {
        const start = act.data_inizio || act.start_date || act.start;
        const end = act.data_fine || act.end_date || act.end;
        // Includi attività che si sovrappongono al giorno (non solo quelle che iniziano oggi)
        const s = toDate(start);
        const e = toDate(end) || (s ? new Date(s.getTime() + 60 * 60 * 1000) : null);
        if (!s || !dayStart || !dayEnd) continue;
        const overlaps = s.getTime() <= dayEnd.getTime() && (e ? e.getTime() : s.getTime()) >= dayStart.getTime();
        if (!overlaps) continue;
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

  // Costruisce gli slot orari dalle 06:00 alle 18:00, step 30 minuti
  const timeSlots = useMemo(() => {
    const startHour = 6;
    const endHour = 18;
    const slots = [];
    const base = toDate(date);
    if (!base) return slots;
    for (let h = startHour; h <= endHour; h++) {
      for (let m of [0, 30]) {
        if (h === endHour && m > 0) continue; // non superare 18:00
        const d = new Date(base);
        d.setHours(h, m, 0, 0);
        slots.push(d);
      }
    }
    return slots;
  }, [date]);

  // Helper: trova l'attività del driver che copre lo slot specifico
  const getActivityForSlot = (driverId, slotDate) => {
    const list = groupedByDriver[String(driverId)]?.perDay?.[date] || [];
    if (!list.length) return null;
    const t = slotDate.getTime();
    for (const a of list) {
      const s = toDate(a.start);
      const e = toDate(a.end) || new Date(s.getTime() + 60 * 60 * 1000); // default 1h se end mancante
      if (!s) continue;
      if (t >= s.getTime() && t < e.getTime()) {
        // Estrai la destinazione dalla descrizione dell'attività
        const descrizione = a.descrizione || '';
        // Se la descrizione contiene informazioni sulla destinazione, usala
        // Altrimenti usa la descrizione completa
        return {
          ...a,
          destinazione: descrizione.length > 20 ? descrizione.substring(0, 17) + '...' : descrizione
        };
      }
    }
    return null;
  };

  const driverList = useMemo(() => {
    const q = driverQuery.trim().toLowerCase();
    
    // PRIMA applica il filtro di ricerca a tutti gli autisti (se presente)
    let filteredDrivers = drivers;
    if (q) {
      filteredDrivers = drivers.filter(d => {
        const fullName = ((d.nome || d.name || d.first_name || '') + ' ' + (d.cognome || d.surname || d.last_name || '')).trim().toLowerCase();
        return fullName.includes(q);
      });
    }
    
    // Se c'è un filtro di ricerca, mostra anche gli autisti senza attività (per permettere la ricerca)
    if (q && filteredDrivers.length > 0) {
      // Verifica quali di questi autisti hanno attività
      const hasAssignments = new Set(Object.keys(groupedByDriver));
      const withActs = new Set();
      
      // Verifica anche direttamente nelle attività per sicurezza
      for (const day of weekDays) {
        const items = activitiesByDay[day] || [];
        const dayStart = toDate(day);
        const dayEnd = toDate(day);
        if (dayStart && dayEnd) {
          dayStart.setHours(0, 0, 0, 0);
          dayEnd.setHours(23, 59, 59, 999);
        }
        for (const act of items) {
          const start = act.data_inizio || act.start_date || act.start;
          const end = act.data_fine || act.end_date || act.end;
          const s = toDate(start);
          const e = toDate(end) || (s ? new Date(s.getTime() + 60 * 60 * 1000) : null);
          if (!s || !dayStart || !dayEnd) continue;
          const overlaps = s.getTime() <= dayEnd.getTime() && (e ? e.getTime() : s.getTime()) >= dayStart.getTime();
          if (!overlaps) continue;
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
      
      // Se c'è ricerca, mostra tutti gli autisti filtrati (anche senza attività)
      // altrimenti mostra solo quelli con attività
      return filteredDrivers.filter(d => {
        const hasInGrouped = hasAssignments.has(String(d.id));
        const hasInActivities = withActs.has(String(d.id));
        return hasInGrouped || hasInActivities || q; // Se c'è ricerca, mostra anche senza attività
      });
    }
    
    // Se non c'è ricerca, mostra solo autisti con impegni
    const hasAssignments = new Set(Object.keys(groupedByDriver));
    let list = drivers.filter(d => hasAssignments.has(String(d.id)));
    
    // Fallback: verifica direttamente nelle attività
    if (list.length === 0) {
      const withActs = new Set();
      for (const day of weekDays) {
        const items = activitiesByDay[day] || [];
        const dayStart = toDate(day);
        const dayEnd = toDate(day);
        if (dayStart && dayEnd) {
          dayStart.setHours(0, 0, 0, 0);
          dayEnd.setHours(23, 59, 59, 999);
        }
        for (const act of items) {
          const start = act.data_inizio || act.start_date || act.start;
          const end = act.data_fine || act.end_date || act.end;
          const s = toDate(start);
          const e = toDate(end) || (s ? new Date(s.getTime() + 60 * 60 * 1000) : null);
          if (!s || !dayStart || !dayEnd) continue;
          const overlaps = s.getTime() <= dayEnd.getTime() && (e ? e.getTime() : s.getTime()) >= dayStart.getTime();
          if (!overlaps) continue;
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
      list = drivers.filter(d => withActs.has(String(d.id)));
    }
    
    return list;
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
          <button onClick={() => setView('day')} style={view === 'day' ? btnPrimary : btnLight}>Lista</button>
          <button onClick={() => setView('grid')} style={view === 'grid' ? btnPrimary : btnLight}>Tabella Oraria</button>
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
      ) : view === 'grid' ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, position: 'sticky', left: 0, zIndex: 2, background: '#f8f9fb', minWidth: 80 }}>Ora</th>
                {drivers
                  .filter(d => {
                    const q = driverQuery.trim().toLowerCase();
                    if (!q) return true;
                    const full = ((d.nome || d.name || d.first_name || '') + ' ' + (d.cognome || d.surname || d.last_name || '')).toLowerCase();
                    return full.includes(q);
                  })
                  .map(d => (
                  <th key={d.id} style={{ ...thStyle, minWidth: 180, textAlign: 'center' }} title={String(d.id)}>
                    {(d.nome || d.name || d.first_name || '') + ' ' + (d.cognome || d.surname || d.last_name || '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingActs ? (
                <tr><td style={tdStyle} colSpan={1 + drivers.length}>Caricamento impegni...</td></tr>
              ) : timeSlots.length === 0 ? (
                <tr><td style={tdStyle} colSpan={1 + drivers.length}>Nessuno slot disponibile</td></tr>
              ) : (
                timeSlots.map((slot, idx) => (
                  <tr key={idx}>
                    <td style={{ ...tdStyle, position: 'sticky', left: 0, zIndex: 1, background: '#fff', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'center' }}>
                      {slot.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    {drivers
                      .filter(d => {
                        const q = driverQuery.trim().toLowerCase();
                        if (!q) return true;
                        const full = ((d.nome || d.name || d.first_name || '') + ' ' + (d.cognome || d.surname || d.last_name || '')).toLowerCase();
                        return full.includes(q);
                      })
                      .map(d => {
                        const act = getActivityForSlot(d.id, slot);
                        return (
                          <td key={d.id} style={{ ...tdStyle, minWidth: 180, textAlign: 'center' }}>
                            {act ? (
                              <div style={{ 
                                background: '#e3f2fd', 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                fontSize: '12px',
                                color: '#1976d2',
                                fontWeight: 500,
                                textAlign: 'center'
                              }}>
                                {act.destinazione || act.descrizione || 'Attività'}
                              </div>
                            ) : (
                              <span style={{ color: '#bbb' }}>—</span>
                            )}
                          </td>
                        );
                      })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
            Tabella oraria: vengono mostrati tutti gli autisti. Se hanno attività nell'orario, viene mostrata la destinazione.
          </div>
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
