"use client";
import { useEffect, useRef } from 'react';

export default function SidePanel({ isOpen, onClose, title, children, width = '40%' }) {
  const panelRef = useRef(null);

  // Gestisce la chiusura con il tasto ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    
    // Blocca lo scroll del body quando il pannello è aperto
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Gestisce il click all'esterno per chiudere
  const handleOutsideClick = (e) => {
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="side-panel-overlay"
      onClick={handleOutsideClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        transition: 'all 0.3s ease-in-out',
        opacity: isOpen ? 1 : 0,
      }}
    >
      <div 
        ref={panelRef}
        className="side-panel"
        style={{
          width: width,
          height: '100%',
          backgroundColor: '#fff',
          boxShadow: '-5px 0 15px rgba(0, 0, 0, 0.1)',
          padding: '20px',
          overflowY: 'auto',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '14px 0 0 14px',
        }}
      >
        <div className="side-panel-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h2 style={{ fontWeight: 600, fontSize: '1.5rem', margin: 0 }}>{title}</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              boxShadow: 'none',
              padding: 0
            }}
            aria-label="Chiudi pannello"
          >
            ×
          </button>
        </div>
        <div className="side-panel-content" style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}