"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiFileText } from "react-icons/fi";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

export default function DocumentiPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [documenti, setDocumenti] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [dataVersion, setDataVersion] = useState(0);

  const canEdit = user?.role === 'admin';

  // Carica documenti
  const fetchDocumenti = async () => {
    if (loading) return;
    
    setFetching(true);
    setError("");
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        search: searchTerm
      });
      
      const response = await api.get(`/documenti?${params.toString()}`);
      console.log('🔍 DEBUG PAGINAZIONE:');
      console.log('📄 Documenti ricevuti:', response.data.data?.length || 0);
      console.log('📊 Total dall\'API:', response.data.total);
      console.log('📄 Current page:', response.data.current_page);
      console.log('📄 Last page:', response.data.last_page);
      console.log('📄 Per page:', response.data.per_page);
      console.log('🔍 Response completa:', response.data);
      
      setDocumenti(response.data.data || []);
      setTotal(response.data.total || 0);
      
      console.log('📊 State dopo setTotal:', response.data.total);
      console.log('📄 State documenti length:', response.data.data?.length);
    } catch (err) {
      console.error("Errore nel caricamento documenti:", err);
      setError("Errore nel caricamento dei documenti");
    } finally {
      setFetching(false);
    }
  };

  // Effetto per caricare i documenti
  useEffect(() => {
    if (!loading) {
      fetchDocumenti();
    }
  }, [loading, currentPage, perPage, searchTerm, dataVersion]);

  // Gestione visualizzazione dettagli
  const handleViewDetails = (documento) => {
    router.push(`/documenti/${documento.id}`);
  };

  // Sincronizzazione documenti oggi
  const sincronizzaOggi = async () => {
    try {
      setSyncing(true);
      setSyncMessage('🔄 Sincronizzazione documenti di oggi in corso...');
      
      const response = await api.documenti.syncToday();
      
      if (response.data.success) {
        setSyncMessage(`✅ Sincronizzazione completata! ${response.data.data?.documenti || 0} documenti, ${response.data.data?.righe || 0} righe`);
        setDataVersion(v => v + 1); // Ricarica i dati
        
        // Emetti evento per notificare altre pagine della sincronizzazione
        const syncEvent = new CustomEvent('documentsSync', {
          detail: {
            type: 'daily',
            documenti: response.data.data?.documenti || 0,
            righe: response.data.data?.righe || 0
          }
        });
        window.dispatchEvent(syncEvent);
        console.log('📡 Evento documentsSync emesso per sincronizzazione giornaliera');
      } else {
        setSyncMessage('❌ Errore durante la sincronizzazione');
      }
    } catch (error) {
      console.error('Errore sincronizzazione oggi:', error);
      setSyncMessage('❌ Errore durante la sincronizzazione: ' + (error.response?.data?.message || error.message));
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  // Sincronizzazione documenti settimanale
  const sincronizzaSettimanale = async () => {
    try {
      setSyncing(true);
      setSyncMessage('🔄 Sincronizzazione documenti ultimi 7 giorni in corso...');
      
      const response = await api.documenti.sync({ giorni: 7 });
      
      if (response.success) {
        setSyncMessage(`✅ Sincronizzazione settimanale completata! ${response.data?.documenti || 0} documenti, ${response.data?.righe || 0} righe`);
        setDataVersion(v => v + 1); // Ricarica i dati
        
        // Emetti evento per notificare altre pagine della sincronizzazione
        const syncEvent = new CustomEvent('documentsSync', {
          detail: {
            type: 'weekly',
            documenti: response.data?.documenti || 0,
            righe: response.data?.righe || 0
          }
        });
        window.dispatchEvent(syncEvent);
        console.log('📡 Evento documentsSync emesso per sincronizzazione settimanale');
      } else {
        setSyncMessage('❌ Errore durante la sincronizzazione settimanale');
      }
    } catch (error) {
      console.error('Errore sincronizzazione settimanale:', error);
      setSyncMessage('❌ Errore durante la sincronizzazione: ' + (error.response?.data?.message || error.message));
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };



  // Formattazione data
  const formatData = (dataString) => {
    if (!dataString) return '-';
    try {
      const data = new Date(dataString);
      if (isNaN(data.getTime())) return '-';
      return data.toLocaleDateString('it-IT');
    } catch (e) {
      return '-';
    }
  };

  // Formattazione importo
  const formatImporto = (importo) => {
    if (!importo || importo === null || importo === undefined) return '-';
    const num = parseFloat(importo);
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(num);
  };

  // Campi del documento per il form (aggiornati per specifica API Arca)
  const documentoFields = [
    { name: 'codiceDoc', label: 'Codice Documento', required: true },
    { name: 'numeroDoc', label: 'Numero Documento', required: true },
    { name: 'dataDoc', label: 'Data Documento', type: 'date' },
    { name: 'nomeCliente', label: 'Cliente', type: 'text' },
    { name: 'nomeSede', label: 'Sede', type: 'text' },
    { name: 'nomeAgente1', label: 'Agente 1', type: 'text' },
    { name: 'nomeAgente2', label: 'Agente 2', type: 'text' },
    { name: 'dataConsegna', label: 'Data Consegna', type: 'date' },
    { name: 'totaleImponibileDoc', label: 'Totale Imponibile', type: 'number' },
    { name: 'totaleImpostaDoc', label: 'Totale Imposta', type: 'number' },
    { name: 'totaleScontoDoc', label: 'Totale Sconto', type: 'number' },
    { name: 'totaleDoc', label: 'Totale', type: 'number' }
  ];

  // Configurazione colonne tabella (aggiornata per specifica API Arca)
  const columns = [
    { 
      key: 'codiceDoc', 
      label: 'Codice',
      filterType: 'text',
      render: (item) => String(item?.codiceDoc || item?.codice_doc || '-')
    },
    { 
      key: 'numeroDoc',
      label: 'Numero',
      filterType: 'text',
      render: (item) => String(item?.numeroDoc || item?.numero_doc || '-')
    },
    { 
      key: 'dataDoc', 
      label: 'Data',
      filterType: 'date',
      render: (item) => formatData(item?.dataDoc || item?.data_doc)
    },
    { 
      key: 'nomeCliente', 
      label: 'Cliente',
      filterType: 'text',
      render: (item) => {
        // Usa prima il nome del cliente, poi fallback ai codici e vecchi campi
        const cliente = item?.nomeCliente || item?.codiceCliente || item?.cliente?.name || item?.client?.name || item?.client_name || '-';
        return String(cliente);
      }
    },
    { 
      key: 'nomeSede', 
      label: 'Destinazione',
      filterType: 'text',
      render: (item) => {
        // Costruisci indirizzo completo della destinazione/cantiere
        const sede = item?.sede || {};
        // Priorità: usa sempre i dati della relazione destinazione se disponibili
        const nomeSede = sede?.name || item?.nomeSede || item?.site?.name || item?.site_name || '';
        const indirizzo = sede?.address || '';
        const citta = sede?.city || '';
        const provincia = sede?.province || '';
        const cap = sede?.postal_code || '';
        
        // Se abbiamo i dati della sede completi, mostra indirizzo formattato
        if (nomeSede && (indirizzo || citta)) {
          const parts = [nomeSede];
          if (indirizzo) parts.push(indirizzo);
          if (citta || provincia) {
            const cittaProvincia = [citta, provincia].filter(Boolean).join(' (') + (provincia ? ')' : '');
            if (cittaProvincia) parts.push(cittaProvincia);
          }
          // Restituisci JSX con <br> per le interruzioni di riga
          return (
            <div className="text-sm">
              {parts.map((part, index) => (
                <div key={index} className={index === 0 ? 'font-medium' : 'text-gray-600'}>
                  {part}
                </div>
              ))}
            </div>
          );
        }
        
        // Fallback ai vecchi campi se non abbiamo dati completi
        const sedeBasic = nomeSede || item?.codiceDestinazione || '-';
        return String(sedeBasic);
      }
    },
    { 
      key: 'totaleDoc', 
      label: 'Totale',
      filterType: 'number',
      render: (item) => formatImporto(item?.totaleDoc || item?.totale_doc)
    }
  ];

  // Azioni personalizzate per ogni riga
  const customActions = [
    {
      label: 'PDF',
      onClick: (documento) => generaPDF(documento),
      className: 'bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm'
    },
    {
      label: 'Collega',
      onClick: (documento) => collegaAttivita(documento.id),
      className: 'bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm ml-2'
    }
  ];

  if (loading) {
    return <div>Caricamento...</div>;
  }

  return (
    <div style={{ padding: '32px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '100%', margin: '0 auto' }}>
        {/* Header con pulsanti di sincronizzazione */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px'
        }}>
          <div>
            <h2 style={{ 
              fontWeight: 600, 
              margin: 0,
              fontSize: '1.5rem',
              color: '#1a1a1a'
            }}>
              Documenti Arca
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              Gestione documenti sincronizzati da Arca
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={sincronizzaOggi}
              disabled={syncing}
              style={{
                backgroundColor: syncing ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: syncing ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!syncing) e.target.style.backgroundColor = '#059669';
              }}
              onMouseLeave={(e) => {
                if (!syncing) e.target.style.backgroundColor = '#10b981';
              }}
            >
              {syncing ? '🔄 Sincronizzando...' : '📅 Sincronizza Oggi'}
            </button>
            
            <button
              onClick={sincronizzaSettimanale}
              disabled={syncing}
              style={{
                backgroundColor: syncing ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: syncing ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!syncing) e.target.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                if (!syncing) e.target.style.backgroundColor = '#3b82f6';
              }}
            >
              {syncing ? '🔄 Sincronizzando...' : '📊 Sincronizza Settimana'}
            </button>
          </div>
        </div>

        {/* Messaggio di sincronizzazione */}
        {syncMessage && (
          <div className={`mx-4 mb-4 p-3 rounded ${
            syncMessage.includes('✅') 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : syncMessage.includes('❌')
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
            {syncMessage}
          </div>
        )}

        {/* Tabella documenti */}
        <div style={{ marginTop: '20px' }}>
          {console.log('📋 DEBUG DATATABLE PROPS:')}
          {console.log('📄 documenti.length:', documenti.length)}
          {console.log('📊 total:', total)}
          {console.log('📄 currentPage:', currentPage)}
          {console.log('📄 perPage:', perPage)}
          <DataTable
            data={documenti}
            columns={columns}
            onRowClick={handleViewDetails}
            selectedRow={null}
            searchPlaceholder="Cerca documenti..."
            emptyMessage={fetching ? "Caricamento..." : "Nessun documento trovato"}
            defaultVisibleColumns={['codiceDoc', 'numeroDoc', 'dataDoc', 'nomeCliente', 'nomeSede', 'totaleDoc', 'actions']}
            defaultSortKey="dataDoc"
            defaultSortDirection="desc"
            totalItems={total}
            itemsPerPage={perPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setPerPage}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            isLoading={fetching}
            customActions={customActions}
          />
        </div>
      </div>


    </div>
  );
}
