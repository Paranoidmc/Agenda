"use client";

import { usePathname } from 'next/navigation';
import Header from "./Header";
import Sidebar from "./Sidebar";

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

export default function ConditionalLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  
  if (isLoginPage) {
    // Pagina di login: nessun header, nessuna sidebar
    return <>{children}</>;
  }
  
  // Pagine normali: header e sidebar
  return (
    <>
      <Header />
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar protectedPaths={protectedPaths} />
        <main style={{ flex: 1, marginLeft: 220 }}>{children}</main>
      </div>
    </>
  );
}

