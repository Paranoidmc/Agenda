"use client";
import { useState, useEffect } from 'react';
import api from '../lib/api';

/**
 * Componente che mostra un indicatore di caricamento globale
 * quando ci sono richieste API attive
 */
export default function GlobalLoader() {
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Registra un listener per i cambiamenti di stato di caricamento
    const unsubscribe = api.onLoadingChange(setIsLoading);
    
    // Imposta lo stato iniziale
    setIsLoading(api.isLoading());
    
    // Rimuovi il listener quando il componente viene smontato
    return unsubscribe;
  }, []);
  
  // Se non ci sono richieste attive, non mostrare nulla
  if (!isLoading) return null;
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height: '3px',
        background: 'linear-gradient(to right, transparent, var(--primary), transparent)',
        backgroundSize: '200% 100%',
        animation: 'loading 1.5s infinite',
      }}
    />
  );
}

// Aggiungi lo stile dell'animazione al documento
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
}