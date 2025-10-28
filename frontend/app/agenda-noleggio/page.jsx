"use client";
import { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import Sidebar from "../../components/Sidebar";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import itLocale from '@fullcalendar/core/locales/it';
import "@fullcalendar/common/main.css";

export default function AgendaNoleggioPage() {
  const [veicoli, setVeicoli] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  useEffect(() => {
    setLoading(true);
    import('../../lib/api').then(({ default: api }) => {
      // Carica veicoli noleggiati
      api.get('/rental-vehicles')
        .then(res => {
          let arr = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : []);
          setVeicoli(arr);
        })
        .catch(() => {
          setVeicoli([]);
        });

      // Carica statistiche
      api.get('/rental-vehicles/statistics')
        .then(res => {
          setStatistics(res.data);
        })
        .catch(() => {
          setStatistics(null);
        })
        .finally(() => {
          setLoading(false);
        });
    });
  }, []);

  // Helper per normalizzare date: se formato YYYY-MM-DD, aggiungi T00:00:00
  function normalizeDateStr(str) {
    if (!str) return str;
    // Se è solo YYYY-MM-DD, aggiungi orario
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str + 'T00:00:00';
    }
    return str;
  }

  // Determina il colore in base allo stato del contratto
  function getContractColor(startDate, endDate) {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < now) {
      return '#ef4444'; // Rosso - scaduto
    } else if (start > now) {
      return '#3b82f6'; // Blu - futuro
    } else {
      // Attivo - calcola quanti giorni mancano alla scadenza
      const daysToExpiry = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      if (daysToExpiry <= 30) {
        return '#f59e0b'; // Giallo/Arancione - in scadenza
      }
      return '#22c55e'; // Verde - attivo
    }
  }

  // Genera eventi noleggio
  const eventiNoleggio = Array.isArray(veicoli)
    ? veicoli.map(v => {
        const color = getContractColor(v.contract_start_date, v.contract_end_date);
        const now = new Date();
        const end = new Date(v.contract_end_date);
        const daysToExpiry = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        
        let statusLabel = '';
        if (end < now) {
          statusLabel = '(Scaduto)';
        } else if (new Date(v.contract_start_date) > now) {
          statusLabel = '(Futuro)';
        } else if (daysToExpiry <= 30) {
          statusLabel = `(Scade tra ${daysToExpiry} giorni)`;
        } else {
          statusLabel = '(Attivo)';
        }

        const plate = v.plate || v.targa || '';
        const brand = v.brand || v.marca || '';
        const model = v.model || v.modello || '';
        const titolo = `${plate} ${brand} ${model} ${statusLabel}`.trim();

        // Tooltip con informazioni dettagliate
        const tooltip = `
          <div style='font-weight:bold; font-size: 14px; margin-bottom: 8px;'>Noleggio Veicolo</div>
          <div style='margin-bottom: 4px;'><b>Veicolo:</b> ${plate} ${brand} ${model}</div>
          <div style='margin-bottom: 4px;'><b>Dal:</b> ${new Date(v.contract_start_date).toLocaleDateString('it-IT')}</div>
          <div style='margin-bottom: 4px;'><b>Al:</b> ${new Date(v.contract_end_date).toLocaleDateString('it-IT')}</div>
          ${v.rental_type ? `<div style='margin-bottom: 4px;'><b>Tipo:</b> ${v.rental_type}</div>` : ''}
          ${v.contract_holder ? `<div style='margin-bottom: 4px;'><b>Intestatario:</b> ${v.contract_holder}</div>` : ''}
          ${v.monthly_fee ? `<div style='margin-bottom: 4px;'><b>Canone Mensile:</b> € ${parseFloat(v.monthly_fee).toFixed(2)}</div>` : ''}
          ${v.contract_duration_months ? `<div style='margin-bottom: 4px;'><b>Durata:</b> ${v.contract_duration_months} mesi</div>` : ''}
          ${v.contract_kilometers ? `<div style='margin-bottom: 4px;'><b>Km Contrattuali:</b> ${v.contract_kilometers.toLocaleString('it-IT')}</div>` : ''}
          ${v.supplier ? `<div style='margin-bottom: 4px;'><b>Fornitore:</b> ${v.supplier}</div>` : ''}
          ${v.notes || v.note ? `<div style='margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;'><b>Note:</b> ${v.notes || v.note}</div>` : ''}
        `;

        return {
          id: 'noleggio-' + v.id,
          title: titolo,
          start: normalizeDateStr(v.contract_start_date),
          end: normalizeDateStr(v.contract_end_date),
          color: color,
          textColor: '#fff',
          extendedProps: { 
            ...v, 
            tooltip,
            vehicleId: v.id 
          },
        };
      })
    : [];

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: 24, background: "#f6f6f6", overflow: "auto" }}>
        <PageHeader title="Agenda Noleggio Veicoli" />

        {/* Statistiche */}
        {!loading && statistics && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginTop: 24,
            marginBottom: 24,
          }}>
            <div style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Totale Noleggi</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#111827' }}>{statistics.total}</div>
            </div>
            <div style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Contratti Attivi</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#22c55e' }}>{statistics.active}</div>
            </div>
            <div style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>In Scadenza (30gg)</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#f59e0b' }}>{statistics.expiring_soon}</div>
            </div>
            <div style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Scaduti</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ef4444' }}>{statistics.expired}</div>
            </div>
            <div style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Futuri</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#3b82f6' }}>{statistics.upcoming}</div>
            </div>
            <div style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Canoni Mensili Totali</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#111827' }}>
                € {statistics.total_monthly_fees ? parseFloat(statistics.total_monthly_fees).toFixed(2) : '0.00'}
              </div>
            </div>
          </div>
        )}

        {/* Legenda */}
        {showLegend && (
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 12
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Legenda Colori</h3>
              <button
                onClick={() => setShowLegend(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: 20,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 20, height: 20, background: '#22c55e', borderRadius: 4 }}></div>
                <span style={{ fontSize: 13 }}>Attivo (oltre 30 giorni)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 20, height: 20, background: '#f59e0b', borderRadius: 4 }}></div>
                <span style={{ fontSize: 13 }}>In scadenza (entro 30 giorni)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 20, height: 20, background: '#ef4444', borderRadius: 4 }}></div>
                <span style={{ fontSize: 13 }}>Scaduto</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 20, height: 20, background: '#3b82f6', borderRadius: 4 }}></div>
                <span style={{ fontSize: 13 }}>Futuro (non ancora iniziato)</span>
              </div>
            </div>
          </div>
        )}

        {!showLegend && (
          <button
            onClick={() => setShowLegend(true)}
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '8px 16px',
              marginBottom: 24,
              cursor: 'pointer',
              fontSize: 13,
              color: '#374151',
            }}
          >
            Mostra Legenda
          </button>
        )}

        {/* Calendario */}
        {loading ? (
          <div style={{ textAlign: "center", marginTop: 40 }}>Caricamento calendario...</div>
        ) : (
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
            padding: 24,
            maxWidth: 1400,
            margin: '0 auto',
            minHeight: 600,
            overflow: 'auto',
          }}>
            {eventiNoleggio.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: 60,
                color: '#6b7280',
                fontSize: 16,
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <div>Nessun veicolo noleggiato trovato</div>
                <div style={{ fontSize: 14, marginTop: 8 }}>
                  Aggiungi date di inizio e fine contratto ai veicoli per visualizzarli qui
                </div>
              </div>
            ) : (
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale={itLocale}
                height="auto"
                events={eventiNoleggio}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,dayGridWeek,dayGridDay"
                }}
                eventDisplay="auto"
                eventClick={(info) => {
                  const vehicleId = info.event.extendedProps.vehicleId;
                  if (vehicleId) {
                    window.location.href = `/veicoli/${vehicleId}`;
                  }
                }}
                eventDidMount={(info) => {
                  // Tooltip HTML
                  if (info.event.extendedProps && info.event.extendedProps.tooltip) {
                    info.el.setAttribute('title', ''); // rimuovi tooltip nativo
                    info.el.style.cursor = 'pointer';
                    
                    let tooltipDiv = null;
                    
                    info.el.onmouseenter = (e) => {
                      tooltipDiv = document.createElement('div');
                      tooltipDiv.innerHTML = info.event.extendedProps.tooltip;
                      tooltipDiv.style.position = 'fixed';
                      tooltipDiv.style.zIndex = '10000';
                      tooltipDiv.style.background = '#fff';
                      tooltipDiv.style.border = '1px solid #e5e7eb';
                      tooltipDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      tooltipDiv.style.padding = '12px 16px';
                      tooltipDiv.style.borderRadius = '8px';
                      tooltipDiv.style.pointerEvents = 'none';
                      tooltipDiv.style.fontSize = '13px';
                      tooltipDiv.style.lineHeight = '1.5';
                      tooltipDiv.style.maxWidth = '350px';
                      tooltipDiv.className = 'fc-tooltip-custom';
                      document.body.appendChild(tooltipDiv);
                      
                      function moveTooltip(ev) {
                        tooltipDiv.style.left = (ev.clientX + 15) + 'px';
                        tooltipDiv.style.top = (ev.clientY + 15) + 'px';
                      }
                      moveTooltip(e);
                      window.addEventListener('mousemove', moveTooltip);
                      
                      info.el.onmouseleave = () => {
                        if (tooltipDiv) {
                          tooltipDiv.remove();
                          tooltipDiv = null;
                        }
                        window.removeEventListener('mousemove', moveTooltip);
                      };
                    };
                  }
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}







