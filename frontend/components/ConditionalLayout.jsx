"use client";

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Header from "./Header";
import Sidebar from "./Sidebar";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";

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

function ConditionalLayoutContent({ children }) {
  const pathname = usePathname();
  const { isOpen } = useSidebar();
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
  
  // Pagine normali: sidebar sopra e header sotto che continua per tutta la larghezza
  return (
    <>
      <Sidebar protectedPaths={protectedPaths} />
      <Header />
      <main style={{ 
        flex: 1, 
        marginLeft: isOpen ? '220px' : '0',
        padding: '1em 2em',
        transition: 'margin-left 0.3s ease'
      }}>
        {children}
      </main>
    </>
  );
}

export default function ConditionalLayout({ children }) {
  return (
    <SidebarProvider>
      <ConditionalLayoutContent>{children}</ConditionalLayoutContent>
    </SidebarProvider>
  );
}

