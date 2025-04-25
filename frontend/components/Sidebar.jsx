"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { 
    label: "Pianificazione",
    submenu: [
      { href: "/pianificazione", label: "Agenda Settimanale" },
      { href: "/agenda-giornaliera", label: "Agenda Giornaliera" },
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
  "/tipi-attivita",
  "/pianificazione",
  "/agenda-giornaliera"
];

export default function Sidebar() {
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
      {navItems.map((item, index) => {
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
    </aside>
  );
}
