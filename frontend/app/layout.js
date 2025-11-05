import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from "../context/AuthContext";
import ConditionalLayout from "../components/ConditionalLayout";
import GlobalLoader from "../components/GlobalLoader";
import ToastProvider from "../components/ToastProvider";
import DeadlineNotifications from "../components/DeadlineNotifications";

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Agenda Gestionale',
  description: 'Gestionale Agenda - stile Apple',
};

export default function RootLayout({ children }) {
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
          
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </AuthProvider>
      </body>
    </html>
  );
}

