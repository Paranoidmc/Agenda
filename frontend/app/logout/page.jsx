"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Pulisci localStorage prima di chiamare il logout
        if (typeof window !== 'undefined') {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
        
        // Esegui il logout
        await logout();
      } catch (error) {
        console.error('Errore durante il logout:', error);
        // In caso di errore, forza comunque il redirect
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        } else {
          router.push('/login');
        }
      }
    };

    performLogout();
  }, [logout, router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <h1>Logout in corso...</h1>
      <div className="spinner" style={{
        width: '40px',
        height: '40px',
        border: '4px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '50%',
        borderTop: '4px solid #007aff',
        animation: 'spin 1s linear infinite'
      }}></div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}