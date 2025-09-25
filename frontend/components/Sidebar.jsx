"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { 
    label: "Pianificazione",
    submenu: [
      { href: "/appunti", label: "Appunti" },
      { href: "/agenda-autisti", label: "Agenda Autisti" },
      { href: "/calendario-scadenze", label: "Calendario Scadenze" },
      { href: "/pianificazione", label: "Agenda" },
      { href: "/attivita", label: "Attività" },
      { href: "/scadenze", label: "Scadenze" },
    ]
  },
  { 
    label: "Anagrafiche",
    submenu: [
      { href: "/clienti", label: "Clienti" },
      { href: "/sedi", label: "Cantieri" },
      { href: "/veicoli", label: "Veicoli" },
      { href: "/autisti", label: "Autisti" },
      { href: "/documenti", label: "Documenti" },
      { href: "/tipi-attivita", label: "Tipi Attività" },
    ]
  },
];

const protectedPaths = [
  "/dashboard",
  "/clienti",
  "/attivita",
  "/veicoli",
  "/scadenze",
  "/sedi",
  "/autisti",
  "/documenti",
  "/tipi-attivita",
  "/pianificazione",
  "/appunti",
  "/agenda-autisti",
  "/calendario-scadenze",
  "/utenti",
  "/impostazioni-arca",
  "/impostazioni-momap"
];

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  // Mostra solo su pagine protette
  if (!protectedPaths.some(p => pathname.startsWith(p))) return null;

  return (
    <aside style={{
      minWidth: 220,
      background: '#fff',
      borderRight: '1px solid #e5e5ea',
      padding: '2em 0.5em',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      overflowY: 'auto',
      paddingTop: '80px' // Aggiunto padding-top per spostare il menu più in basso
    }}>
      {/* NavItems principali */}
      {navItems.map((item, index) => {
        // Nasconde 'Anagrafiche' per gli utenti non-admin
        if (item.label === "Anagrafiche" && user?.role !== 'admin') {
          return null;
        }

        // Se l'elemento ha un sottomenu
        if (item.submenu) {
          // Verifica se qualche elemento del sottomenu è attivo
          const isSubmenuActive = item.submenu.some(subItem => pathname === subItem.href);
          
          return (
            <div key={index} style={{ marginBottom: '10px' }}>
              {/* Titolo del sottomenu */}
              <div style={{
                padding: '0.5em 1.5em',
                fontWeight: 600,
                color: isSubmenuActive ? 'var(--primary)' : '#555',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '5px'
              }}>
                {item.label}
              </div>
              
              {/* Elementi del sottomenu */}
              <div style={{ marginLeft: '10px' }}>
                {item.submenu.map(subItem => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    style={{
                      display: 'block',
                      padding: '0.6em 1.5em',
                      borderRadius: 8,
                      fontWeight: pathname === subItem.href ? 600 : 400,
                      color: pathname === subItem.href ? 'var(--primary)' : '#333',
                      background: pathname === subItem.href ? 'rgba(0,122,255,0.08)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                      marginBottom: '2px',
                      fontSize: '0.95rem'
                    }}
                  >
                    {subItem.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        } 
        // Elemento normale senza sottomenu (es. Dashboard)
        else {
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '0.75em 1.5em',
                borderRadius: 8,
                fontWeight: pathname === item.href ? 700 : 500,
                color: pathname === item.href ? 'var(--primary)' : '#222',
                background: pathname === item.href ? 'rgba(0,122,255,0.08)' : 'transparent',
                textDecoration: 'none',
                transition: 'background 0.15s',
                marginBottom: '10px'
              }}
            >
              {item.label}
            </Link>
          );
        }
      })}
      {/* Voce menu Gestione Utenti solo per admin, in fondo */}
      {user?.role === 'admin' && (
  <>
    <Link href="/utenti" style={{
      display: 'block',
      padding: '0.7em 1.5em',
      fontWeight: 600,
      color: pathname === '/utenti' ? 'var(--primary)' : '#555',
      fontSize: '1rem',
      borderRadius: 6,
      background: pathname === '/utenti' ? '#f0f0f0' : 'none',
      marginTop: 36,
      marginBottom: 10,
      textDecoration: 'none',
      letterSpacing: 0.5
    }}>
      Gestione Utenti
    </Link>
    <Link href="/impostazioni-arca" style={{
      display: 'block',
      padding: '0.7em 1.5em',
      fontWeight: 600,
      color: pathname === '/impostazioni-arca' ? 'var(--primary)' : '#555',
      fontSize: '1rem',
      borderRadius: 6,
      background: pathname === '/impostazioni-arca' ? '#f0f0f0' : 'none',
      marginBottom: 10,
      textDecoration: 'none',
      letterSpacing: 0.5
    }}>
      Impostazioni Arca
    </Link>
  </>
)}
      {/* Voce menu MOMAP solo admin */}
      {user?.role === 'admin' && (
        <Link href="/impostazioni-momap" style={{
          display: 'block',
          color: '#333',
          padding: '12px 16px',
          fontSize: 14,
          fontWeight: 500,
          borderRadius: 6,
          background: pathname === '/impostazioni-momap' ? '#f0f0f0' : 'none',
          marginBottom: 10,
          textDecoration: 'none',
          letterSpacing: 0.5
        }}>
          Integrazione MOMAP
        </Link>
      )}
    </aside>
  );
}
