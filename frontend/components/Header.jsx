"use client";

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { logout, user, loading, sessionExpired } = useAuth();

  // ✅ FIX: Mostra logout solo se utente autenticato e sessione valida
  const showLogout = user && !loading && !sessionExpired;

  return (
    <header style={{
      background: '#fff',
      borderBottom: '1px solid #e5e5ea',
      padding: '1em 2em',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
      position: 'relative',
      zIndex: 20
    }}>
      <Link href="/" style={{ fontWeight: 700, fontSize: 20, color: '#1a1a1a', textDecoration: 'none', letterSpacing: 1 }}>
        Agenda
      </Link>
      <div>
        {showLogout && (
          <button 
            onClick={logout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f44336', 
              color: 'white', 
              borderRadius: '4px', 
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
