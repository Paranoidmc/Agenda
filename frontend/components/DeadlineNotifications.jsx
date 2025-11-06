"use client";
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { showWarningToast, showInfoToast } from '../lib/toast';

/**
 * Componente che mostra notifiche toast per le scadenze nei prossimi 7 giorni
 * quando l'utente accede alla piattaforma
 */
export default function DeadlineNotifications() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Attendi che l'utente sia autenticato
    if (loading || !user) return;

    // Carica le scadenze dei prossimi 7 giorni
    const checkDeadlines = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(today.getDate() + 7);
        
        const startDate = today.toISOString().split('T')[0];
        const endDate = sevenDaysLater.toISOString().split('T')[0];
        
        // Mantieni riferimento a today per il calcolo dei giorni
        const todayForCalculation = new Date(today);

        const response = await api.get('/vehicle-deadlines/all', {
          params: {
            start_date: startDate,
            end_date: endDate
          },
          useCache: false
        });

        const allDeadlines = response.data || [];
        
        // Filtra solo le scadenze non pagate nei prossimi 7 giorni
        const todayStr = today.toISOString().split('T')[0];
        const upcomingDeadlines = allDeadlines.filter(deadline => {
          if (deadline.pagato === 1 || deadline.pagato === true) return false;
          
          const deadlineDate = deadline.expiry_date || deadline.data_scadenza;
          if (!deadlineDate) return false;
          
          const deadlineDateStr = deadlineDate.substring(0, 10);
          
          return deadlineDateStr >= todayStr && deadlineDateStr <= endDate;
        });

        // Ordina per data di scadenza
        upcomingDeadlines.sort((a, b) => {
          const dateA = new Date(a.expiry_date || a.data_scadenza);
          const dateB = new Date(b.expiry_date || b.data_scadenza);
          return dateA - dateB;
        });

        // Mostra toast per ogni scadenza
        if (upcomingDeadlines.length > 0) {
          // Mostra prima un toast generale
          showInfoToast(`Hai ${upcomingDeadlines.length} scadenza${upcomingDeadlines.length > 1 ? 'e' : ''} nei prossimi 7 giorni`);
          
          // Poi mostra un toast per ogni scadenza (con delay per non sovraccaricare)
          upcomingDeadlines.forEach((deadline, index) => {
            setTimeout(() => {
              const deadlineDate = new Date(deadline.expiry_date || deadline.data_scadenza);
              deadlineDate.setHours(0, 0, 0, 0); // Imposta le ore a 0 per confronto corretto
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const diffTime = deadlineDate - today;
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Usa Math.floor invece di Math.ceil
              
              const vehicleName = deadline.vehicle?.targa || deadline.vehicle?.plate || 
                                 deadline.targa || `Veicolo ${deadline.vehicle_id || 'N/D'}`;
              const tipo = deadline.tipo || deadline.type || 'Scadenza';
              const dateStr = deadlineDate.toLocaleDateString('it-IT', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
              });
              
              let message = `${tipo} - ${vehicleName}`;
              if (diffDays === 0) {
                message += ` scade oggi (${dateStr})`;
              } else if (diffDays === 1) {
                message += ` scade domani (${dateStr})`;
              } else {
                message += ` scade tra ${diffDays} giorni (${dateStr})`;
              }

              if (diffDays <= 3) {
                showWarningToast(message);
              } else {
                showInfoToast(message);
              }
            }, 1000 + (index * 500)); // Delay tra i toast
          });
        }
      } catch (error) {
        console.error('Errore nel caricamento delle scadenze per notifiche:', error);
      }
    };

    // Attendi un po' prima di mostrare le notifiche per non interferire con il caricamento iniziale
    const timeoutId = setTimeout(() => {
      checkDeadlines();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [user, loading]);

  return null; // Questo componente non renderizza nulla
}

