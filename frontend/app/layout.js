import './globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { AuthProvider } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Agenda Gestionale',
  description: 'Gestionale Agenda - stile Apple',
};

const protectedPaths = [
  "/dashboard",
  "/clienti",
  "/attivita",
  "/veicoli",
  "/scadenze",
  "/sedi",
  "/autisti",
  "/tipi-attivita"
];

export default function RootLayout({ children }) {
  // La sidebar sarà mostrata sempre, sarà Sidebar a gestire la visibilità interna
  return (
    <html lang="it">
      <body className={inter.className}>
        <AuthProvider>
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
              <Link 
                href="/logout" 
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#f44336', 
                  color: 'white', 
                  borderRadius: '4px', 
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Logout
              </Link>
            </div>
          </header>
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar protectedPaths={protectedPaths} />
            <main style={{ flex: 1, marginLeft: 220 }}>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

