"use client";

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
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
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Durante SSR, mostra sempre il layout completo per evitare errori
  if (!mounted) {
    return <>{children}</>;
  }
  
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

