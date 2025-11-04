"use client";
import { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import Sidebar from "../../components/Sidebar";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import itLocale from '@fullcalendar/core/locales/it';
import "@fullcalendar/common/main.css";

export default function CalendarioScadenzePage() {
  const [scadenze, setScadenze] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    const loadData = async () => {
      const { default: api } = await import('../../lib/api');
      
      try {
        // Carica scadenze (include sia vehicle_deadlines che documenti veicolo)
        const res = await api.get('/vehicle-deadlines', { useCache: false });
        let arr = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : []);
        setScadenze(arr);
      } catch (error) {
        console.error('Errore caricamento scadenze:', error);
        setScadenze([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // Listener per eventi di creazione/modifica/cancellazione scadenze
    const handleDeadlineEvent = () => {
      console.log('🔄 Evento scadenza ricevuto, ricarico dati...');
      setTimeout(() => loadData(), 300);
    };
    
    window.addEventListener('vehicleDeadlineCreated', handleDeadlineEvent);
    window.addEventListener('vehicleDeadlineUpdated', handleDeadlineEvent);
    window.addEventListener('vehicleDeadlineDeleted', handleDeadlineEvent);
    window.addEventListener('vehicleDocumentCreated', handleDeadlineEvent);
    window.addEventListener('vehicleDocumentUpdated', handleDeadlineEvent);
    window.addEventListener('vehicleDocumentDeleted', handleDeadlineEvent);
    
    return () => {
      window.removeEventListener('vehicleDeadlineCreated', handleDeadlineEvent);
      window.removeEventListener('vehicleDeadlineUpdated', handleDeadlineEvent);
      window.removeEventListener('vehicleDeadlineDeleted', handleDeadlineEvent);
      window.removeEventListener('vehicleDocumentCreated', handleDeadlineEvent);
      window.removeEventListener('vehicleDocumentUpdated', handleDeadlineEvent);
      window.removeEventListener('vehicleDocumentDeleted', handleDeadlineEvent);
    };
  }, []);

  // Genera eventi scadenze con titolo completo
  // Mappa tipo -> colore
  // Funzione helper per normalizzare tipo in italiano
  function tipoScadenzaIT(tipo) {
    switch ((tipo||'').toLowerCase()) {
      case 'assicurazione':
      case 'insurance':
        return 'Assicurazione';
      case 'bollo':
      case 'tax':
        return 'Bollo';
      case 'revisione':
      case 'inspection':
        return 'Revisione';
      case 'tagliando':
      case 'service':
      case 'manutenzione':
        return 'Manutenzione';
      case 'libretto_circolazione':
        return 'Libretto di Circolazione';
      case 'autorizzazione_albo':
        return 'Autorizzazione Albo';
      case 'altro':
      case 'other':
      case 'altri_documenti':
        return 'Altro';
      default:
        return tipo || 'Scadenza';
    }
  }
  const tipoToColor = {
    'Assicurazione': '#2563eb', // blu
    'Bollo': '#22c55e', // verde
    'Revisione': '#f59e42', // arancione
    'Tagliando': '#a21caf', // viola
    'Manutenzione': '#a21caf', // viola
    'Libretto di Circolazione': '#8b5cf6', // viola chiaro
    'Autorizzazione Albo': '#ec4899', // rosa
    'Altro': '#64748b', // grigio
  };
  // Eventi scadenze
  const eventiScadenze = Array.isArray(scadenze)
    ? scadenze.map(s => {
        const tipo = tipoScadenzaIT(s.tipo || s.type || '');
        const colore = tipoToColor[tipo] || '#ef4444';
        // Cerca veicolo: preferisci s.veicolo, poi s.vehicle, poi fallback a targa/marca/modello
        const v = s.veicolo || s.vehicle || {};
        const veicolo = (v.targa || v.plate || s.targa || '') +
          (v.marca || v.brand ? ' ' + (v.marca || v.brand) : '') +
          (v.modello || v.model ? ' ' + (v.modello || v.model) : '') || 'Nessun veicolo';
        // Tooltip HTML
        const tooltip = `
          <div style='font-weight:bold;'>${tipo}</div>
          <div><b>Veicolo:</b> ${veicolo.trim() || 'Nessun veicolo'}</div>
          <div><b>Importo:</b> ${s.importo ? '€ ' + s.importo : 'N/D'}</div>
          <div><b>Pagato:</b> ${s.pagato === 1 || s.pagato === '1' ? 'Sì' : 'No'}</div>
          <div><b>Data Scadenza:</b> ${s.data_scadenza ? new Date(s.data_scadenza).toLocaleDateString('it-IT') : 'N/D'}</div>
          <div><b>Note:</b> ${s.note || 'Nessuna nota'}</div>
        `;
        return {
          id: 'scadenza-' + s.id,
          title: `${tipo}${veicolo.trim() ? ' - ' + veicolo.trim() : ''}${s.nome ? ' - ' + s.nome : ''}`.trim(),
          start: s.data_scadenza || s.data || s.expiry_date,
          color: colore,
          extendedProps: { ...s, tooltip },
        };
      })
    : [];

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: 24, background: "#f6f6f6" }}>
        <PageHeader title="Calendario Scadenze" />
        {loading ? (
          <div style={{ textAlign: "center", marginTop: 40 }}>Caricamento calendario...</div>
        ) : (
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            boxShadow: '0 2px 16px #0001',
            padding: 24,
            maxWidth: 1200,
            margin: '0 auto',
            marginTop: 24,
            marginBottom: 24,
            minHeight: 480,
            overflow: 'auto',
          }}>
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={itLocale}
              height="auto"
              events={eventiScadenze}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,dayGridWeek,dayGridDay"
              }}
              eventDisplay="auto"
              eventClick={(info) => {
                const id = info.event.id;
                if (id) {
                  window.location.href = `/scadenze?open=${id}`;
                } else {
                  alert('Impossibile trovare la scadenza corrispondente!');
                }
              }}
              eventDidMount={(info) => {
                // Tooltip HTML
                if (info.event.extendedProps && info.event.extendedProps.tooltip) {
                  info.el.setAttribute('title', ''); // rimuovi tooltip nativo
                  info.el.onmouseenter = (e) => {
                    let div = document.createElement('div');
                    div.innerHTML = info.event.extendedProps.tooltip;
                    div.style.position = 'fixed';
                    div.style.zIndex = 10000;
                    div.style.background = '#fff';
                    div.style.border = '1px solid #ddd';
                    div.style.boxShadow = '0 2px 8px #0001';
                    div.style.padding = '10px 16px';
                    div.style.borderRadius = '8px';
                    div.style.pointerEvents = 'none';
                    div.style.fontSize = '13px';
                    div.className = 'fc-tooltip-custom';
                    document.body.appendChild(div);
                    function moveTooltip(ev) {
                      div.style.left = (ev.clientX + 12) + 'px';
                      div.style.top = (ev.clientY + 12) + 'px';
                    }
                    moveTooltip(e);
                    window.addEventListener('mousemove', moveTooltip);
                    info.el.onmouseleave = () => {
                      div.remove();
                      window.removeEventListener('mousemove', moveTooltip);
                    };
                  };
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
