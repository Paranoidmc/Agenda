import './globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { AuthProvider } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import GlobalLoader from "../components/GlobalLoader";
import Header from "../components/Header";
import ToastProvider from "../components/ToastProvider";
import DeadlineNotifications from "../components/DeadlineNotifications";

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
  "/tipi-attivita",
  "/utenti"
];

export default function RootLayout({ children }) {
  // La sidebar sarà mostrata sempre, sarà Sidebar a gestire la visibilità interna
  return (
    <html lang="it" suppressHydrationWarning={true}>
      <body className={inter.className}>
        <AuthProvider>
          {/* Sistema di notifiche toast */}
          <ToastProvider />
          
          {/* Notifiche scadenze al login */}
          <DeadlineNotifications />
          
          {/* Indicatore di caricamento globale */}
          <GlobalLoader />
          
          <Header />
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar protectedPaths={protectedPaths} />
            <main style={{ flex: 1, marginLeft: 220 }}>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

