"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiFileText } from "react-icons/fi";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import SidePanel from "../../components/SidePanel";
import EntityForm from "../../components/EntityForm";
import PageHeader from "../../components/PageHeader";
import TabPanel from "../../components/TabPanel";
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
  const [selectedDocumento, setSelectedDocumento] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
      setDocumenti(response.data.data || []);
      setTotal(response.data.total || 0);
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
    setSelectedDocumento(documento);
    setIsEditing(false);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => {
      setSelectedDocumento(null);
      setIsEditing(false);
    }, 300);
  };

  // Sincronizzazione documenti oggi
  const sincronizzaOggi = async () => {
    try {
      setSyncing(true);
      setSyncMessage('🔄 Sincronizzazione documenti di oggi in corso...');
      
      const response = await api.documenti.syncToday();
      
      if (response.success) {
        setSyncMessage(`✅ Sincronizzazione completata! ${response.data?.documenti || 0} documenti, ${response.data?.righe || 0} righe`);
        setDataVersion(v => v + 1); // Ricarica i dati
        
        // Emetti evento per notificare altre pagine della sincronizzazione
        const syncEvent = new CustomEvent('documentsSync', {
          detail: {
            type: 'daily',
            documenti: response.data?.documenti || 0,
            righe: response.data?.righe || 0
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

  // Generazione Documento (PDF)
  const generaPDF = async (documento) => {
    try {
      console.log('🚀 Tentativo generazione PDF per documento:', documento.id);
      
      const response = await api.get(`/documenti/${documento.id}/pdf`, {
        responseType: 'blob'
      });

      console.log('✅ PDF generato con successo');
      
      // Scarica il file PDF
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `documento_${documento.numero_doc?.trim() || documento.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // toast.success('Documento PDF generato con successo!');
    } catch (error) {
      console.error('Errore generazione PDF:', error);
      alert(error.message || 'Errore nella generazione del PDF');
    }
  };

  // Collegamento attività
  const collegaAttivita = (documentoId) => {
    // TODO: Implementare collegamento con attività
    alert(`Collegamento documento ${documentoId} con attività - Da implementare`);
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
          <DataTable
            data={documenti}
            columns={columns}
            onRowClick={handleViewDetails}
            selectedRow={selectedDocumento}
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

      {/* Pannello laterale per i dettagli */}
      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={handleClosePanel} 
        title={isEditing ? "Modifica Documento" : "Dettagli Documento"}
      >
        {selectedDocumento && (
          <TabPanel 
            tabs={[
              {
                id: 'details',
                label: 'Dettagli',
                content: (
                  <div>
                    <EntityForm
                      data={selectedDocumento}
                      fields={documentoFields}
                      onSave={null} // Solo visualizzazione per ora
                      onDelete={null}
                      isEditing={false}
                      setIsEditing={() => {}}
                      isLoading={false}
                    />
                    
                    {/* Sezione Righe Documento */}
                    {selectedDocumento.righe && selectedDocumento.righe.length > 0 ? (
                      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}>
                        <h4 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>Righe Documento ({selectedDocumento.righe.length} articoli)</h4>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                          {selectedDocumento.righe.map((riga, index) => (
                            <div key={index} style={{ 
                              padding: '0.75rem', 
                              marginBottom: '0.5rem', 
                              backgroundColor: '#f9fafb', 
                              border: '1px solid #f3f4f6', 
                              borderRadius: '0.25rem' 
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                <div><strong>Riga #{riga.riga}:</strong> {riga.descrizione || riga.articolo || 'N/A'}</div>
                                <div><strong>Quantità:</strong> {riga.quantita} {riga.unita || ''}</div>
                                <div><strong>Prezzo Unit.:</strong> {formatImporto(riga.prezzo || riga.prezzoScontato)}</div>
                                <div><strong>Totale Riga:</strong> {formatImporto(riga.totaleRiga)}</div>
                                {riga.sconto && <div><strong>Sconto:</strong> {riga.sconto}%</div>}
                                {riga.codiceIva && <div><strong>Codice IVA:</strong> {riga.codiceIva}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #fbbf24', borderRadius: '0.375rem', backgroundColor: '#fef3c7' }}>
                        <p><strong>Nessuna riga documento trovata</strong></p>
                        <p style={{ fontSize: '0.875rem', color: '#92400e' }}>Questo documento non contiene righe dettaglio.</p>
                      </div>
                    )}
                  </div>
                )
              },
              {
                id: 'info',
                label: 'Informazioni',
                content: (
                  <div style={{ padding: '1rem' }}>
                    <h3>Informazioni Documento</h3>
                    <div style={{ marginTop: '1rem' }}>
                      <p><strong>Codice:</strong> {selectedDocumento.codiceDoc || selectedDocumento.codice_doc || 'N/A'}</p>
                      <p><strong>Numero:</strong> {selectedDocumento.numeroDoc || selectedDocumento.numero_doc || 'N/A'}</p>
                      <p><strong>Cliente:</strong> {selectedDocumento.nomeCliente || selectedDocumento.codiceCliente || selectedDocumento.cliente?.name || 'N/A'}</p>
                      <p><strong>Destinazione:</strong> {(() => {
                        // Costruisci indirizzo completo della destinazione/cantiere per il side panel
                        const sede = selectedDocumento?.sede || {};
                        const nomeSede = sede?.name || selectedDocumento?.nomeSede || selectedDocumento?.codiceDestinazione || '';
                        const indirizzo = sede?.address || '';
                        const citta = sede?.city || '';
                        const provincia = sede?.province || '';
                        const cap = sede?.postal_code || '';
                        
                        if (!nomeSede && !indirizzo) return 'N/A';
                        
                        // Costruisci l'indirizzo formattato
                        let indirizzoCompleto = nomeSede;
                        if (indirizzo) {
                          indirizzoCompleto += `\n${indirizzo}`;
                        }
                        if (citta || provincia) {
                          const cittaProvincia = citta + (provincia ? ` (${provincia})` : '');
                          if (cittaProvincia) {
                            indirizzoCompleto += `\n${cittaProvincia}`;
                          }
                        }
                        if (cap) {
                          indirizzoCompleto += ` - ${cap}`;
                        }
                        
                        return indirizzoCompleto.split('\n').map((line, index) => (
                          <span key={index}>
                            {line}
                            {index < indirizzoCompleto.split('\n').length - 1 && <br />}
                          </span>
                        ));
                      })()}</p>
                      <p><strong>Agente 1:</strong> {selectedDocumento.agente1 || 'N/A'}</p>
                      <p><strong>Agente 2:</strong> {selectedDocumento.agente2 || 'N/A'}</p>
                      <p><strong>Data:</strong> {formatData(selectedDocumento.dataDoc || selectedDocumento.data_doc)}</p>
                      <p><strong>Data Consegna:</strong> {formatData(selectedDocumento.dataConsegna)}</p>
                      <p><strong>Totale Imponibile:</strong> {formatImporto(selectedDocumento.totaleImponibileDoc)}</p>
                      <p><strong>Totale Imposta:</strong> {formatImporto(selectedDocumento.totaleImpostaDoc)}</p>
                      <p><strong>Totale Sconto:</strong> {formatImporto(selectedDocumento.totaleScontoDoc)}</p>
                      <p><strong>Totale:</strong> {formatImporto(selectedDocumento.totaleDoc || selectedDocumento.totale_doc)}</p>
                      {selectedDocumento.righe && selectedDocumento.righe.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                          <p><strong>Righe:</strong> {selectedDocumento.righe.length} articoli</p>
                          <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.5rem' }}>
                            {selectedDocumento.righe.map((riga, index) => (
                              <div key={index} style={{ padding: '0.25rem 0', borderBottom: index < selectedDocumento.righe.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                <small>
                                  <strong>#{riga.riga}:</strong> {riga.descrizione || riga.articolo} - 
                                  Qta: {riga.quantita} {riga.unita} - 
                                  Prezzo: {formatImporto(riga.prezzoScontato || riga.prezzo)} - 
                                  Tot: {formatImporto(riga.totaleRiga)}
                                </small>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                      <button
                        onClick={() => generaPDF(selectedDocumento)}
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '0.375rem',
                          cursor: 'pointer'
                        }}
                      >
                        Genera PDF
                      </button>
                      <button
                        onClick={() => collegaAttivita(selectedDocumento.id)}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '0.375rem',
                          cursor: 'pointer'
                        }}
                      >
                        Collega ad Attività
                      </button>
                    </div>
                  </div>
                )
              }
            ]}
          />
        )}
      </SidePanel>
    </div>
  );
}
