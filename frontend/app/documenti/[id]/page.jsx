"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { FiArrowLeft, FiFileText, FiDownload, FiLink } from "react-icons/fi";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";

export default function DocumentoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [documento, setDocumento] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const documentoId = params.id;
  const canEdit = user?.role === 'admin';

  // Carica documento
  const fetchDocumento = async () => {
    if (loading || !documentoId) return;
    
    setFetching(true);
    setError("");
    
    try {
      const response = await api.get(`/documenti/${documentoId}`);
      console.log('✅ Documento caricato con successo:', documentoId);
      
      // Estrai i dati corretti dalla struttura nested
      const documentoData = response.data?.data?.documento || response.data;
      const righeData = response.data?.data?.righe || [];
      
      console.log('✅ Documento e righe estratti:', {
        documento: documentoData?.id,
        righe: righeData?.length || 0
      });
      
      // DEBUG CRITICO: Verifica struttura righe
      console.log('🚨 DEBUG RIGHE - Struttura completa response.data.data:', response.data.data);
      console.log('🚨 DEBUG RIGHE - righeData raw:', righeData);
      console.log('🚨 DEBUG RIGHE - Array.isArray(righeData):', Array.isArray(righeData));
      console.log('🚨 DEBUG RIGHE - righeData.length:', righeData?.length);
      
      // DEBUG CRITICO: Verifica se documento ha dati
      console.log('🚨 DEBUG DOCUMENTO - documentoData:', documentoData);
      console.log('🚨 DEBUG DOCUMENTO - documentoData.id:', documentoData?.id);
      
      // Combina documento e righe in un oggetto unico
      const documentoCompleto = {
        ...documentoData,
        righe: righeData
      };
      
      setDocumento(documentoCompleto);
    } catch (err) {
      console.error("Errore nel caricamento documento:", err);
      setError("Errore nel caricamento del documento");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchDocumento();
  }, [documentoId, loading]);

  // Funzioni helper per formattazione
  const formatData = (data) => {
    if (!data) return 'N/A';
    try {
      return new Date(data).toLocaleDateString('it-IT');
    } catch {
      return data;
    }
  };

  const formatImporto = (importo) => {
    if (!importo || isNaN(importo)) return 'N/A';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(parseFloat(importo));
  };

  // Genera PDF
  const generaPDF = async (doc) => {
    if (!doc) return;
    
    setIsGeneratingPDF(true);
    try {
      console.log('🚀 Tentativo generazione PDF per documento:', doc.id);
      console.log('🚀 URL completo PDF:', `/documenti/${doc.id}/pdf`);
      console.log('🚀 Documento dati per PDF:', doc);
      
      const response = await api.get(`/documenti/${doc.id}/pdf`, {
        responseType: 'blob'
      });

      console.log('✅ PDF generato con successo');
      console.log('✅ PDF Response:', response);
      console.log('✅ PDF Response data type:', typeof response.data);
      console.log('✅ PDF Response data size:', response.data?.size);
      
      // Scarica il file PDF
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `documento_${doc.numero_doc?.trim() || doc.numeroDoc || doc.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      alert('PDF generato con successo!');
    } catch (err) {
      console.error('🚨 ERRORE PDF - Dettagli completi:', err);
      console.error('🚨 ERRORE PDF - Status:', err.response?.status);
      console.error('🚨 ERRORE PDF - Data:', err.response?.data);
      console.error('🚨 ERRORE PDF - Headers:', err.response?.headers);
      console.error('🚨 ERRORE PDF - URL tentato:', `/documenti/${doc.id}/pdf`);
      
      const errorMsg = err.response?.data?.message || err.message || 'Errore sconosciuto';
      alert(`Errore nella generazione del PDF: ${errorMsg}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Collega ad attività
  const collegaAttivita = async (documentoId) => {
    if (!documentoId) return;
    
    setIsLinking(true);
    try {
      // Qui implementeresti la logica per collegare il documento ad un'attività
      // Per ora mostra solo un alert
      alert('Funzionalità di collegamento ad attività in sviluppo');
    } catch (err) {
      console.error('Errore nel collegamento:', err);
      alert('Errore nel collegamento. Riprova più tardi.');
    } finally {
      setIsLinking(false);
    }
  };

  if (loading || fetching) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div>Caricamento documento...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>
        <div>{error}</div>
        <button 
          onClick={() => router.push('/documenti')}
          style={{
            marginTop: 10,
            padding: '8px 16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Torna ai Documenti
        </button>
      </div>
    );
  }

  if (!documento) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div>Documento non trovato</div>
        <button 
          onClick={() => router.push('/documenti')}
          style={{
            marginTop: 10,
            padding: '8px 16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Torna ai Documenti
        </button>
      </div>
    );
  }

  // DEBUG CRITICO: Stato prima del render
  console.log('🚨 DEBUG RENDER - documento:', documento);
  console.log('🚨 DEBUG RENDER - documento.id:', documento?.id);
  console.log('🚨 DEBUG RENDER - isGeneratingPDF:', isGeneratingPDF);
  console.log('🚨 DEBUG RENDER - isLinking:', isLinking);
  console.log('🚨 DEBUG RENDER - documento.righe:', documento?.righe);
  console.log('🚨 DEBUG RENDER - documento.righe.length:', documento?.righe?.length);

  return (
    <div style={{ padding: 20 }}>
      <PageHeader 
        title={`Documento ${documento.numero_doc || documento.numeroDoc || documento.numero_documento || `#${documento.id}`}`}
        subtitle={`${documento.codice_doc || documento.tipo_doc || documento.tipoDoc || 'Documento'} - ${formatData(documento.data_doc || documento.dataDoc)}`}
        icon={<FiFileText />}
        actions={[
          {
            label: "Torna ai Documenti",
            onClick: () => router.push('/documenti'),
            icon: <FiArrowLeft />,
            variant: "secondary"
          },
          {
            label: isGeneratingPDF ? "Generando..." : "Genera PDF",
            onClick: () => generaPDF(documento),
            icon: <FiDownload />,
            variant: "primary",
            disabled: isGeneratingPDF
          },
          {
            label: isLinking ? "Collegando..." : "Collega ad Attività",
            onClick: () => collegaAttivita(documento.id),
            icon: <FiLink />,
            variant: "success",
            disabled: isLinking
          }
        ]}
      />

      <div style={{ marginTop: 30 }}>
        {/* Sezione Informazioni Principali */}
        <div style={{ 
          background: '#fff', 
          borderRadius: 8, 
          padding: 20, 
          marginBottom: 20,
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 20, color: '#1f2937' }}>
            📄 Informazioni Documento
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <div>
              <h4 style={{ marginBottom: 10, color: '#374151' }}>Dati Principali</h4>
              <div style={{ display: 'grid', gap: 8 }}>
                <div><strong>Codice:</strong> {documento.codice_doc || documento.codiceDoc || 'N/A'}</div>
                <div><strong>Numero:</strong> {documento.numero_doc?.trim() || documento.numeroDoc || 'N/A'}</div>
                <div><strong>Tipo:</strong> {documento.tipo_doc || documento.codice_doc || documento.tipoDoc || 'N/A'}</div>
                <div><strong>Data:</strong> {formatData(documento.data_doc || documento.dataDoc)}</div>
                <div><strong>Data Consegna:</strong> {formatData(documento.data_consegna || documento.dataConsegna)}</div>
              </div>
            </div>

            <div>
              <h4 style={{ marginBottom: 10, color: '#374151' }}>Cliente e Destinazione</h4>
              <div style={{ display: 'grid', gap: 8 }}>
                <div><strong>Cliente:</strong> {documento?.cliente?.name || documento.nomeCliente || documento.nome_cliente || documento.descrizioneCliente || documento.descrizione_cliente || documento.client_name || documento.clientName || documento.nomeClienteDestinazione || documento.nome_destinazione || documento.codiceCliente || documento.codice_cliente || documento.codiceClienteDestinazione || documento.codice_cliente_destinazione || 'N/A'}</div>
                <div>
                  <strong>Destinazione:</strong>
                  <div style={{ marginTop: 4, fontSize: '0.9em', color: '#6b7280' }}>
                    {(() => {
                      const sede = documento?.sede || documento?.site || {};
                      const nomeSede = sede?.name || documento?.nomeSede || documento?.nome_sede || documento?.codiceDestinazione || documento?.codice_destinazione || '';
                      const indirizzo = sede?.address || '';
                      const citta = sede?.city || '';
                      const provincia = sede?.province || '';
                      const cap = sede?.postal_code || '';
                      
                      if (!nomeSede && !indirizzo) return 'N/A';
                      
                      let indirizzoCompleto = nomeSede;
                      if (indirizzo) indirizzoCompleto += `\n${indirizzo}`;
                      if (citta || provincia) {
                        const cittaProvincia = citta + (provincia ? ` (${provincia})` : '');
                        if (cittaProvincia) indirizzoCompleto += `\n${cittaProvincia}`;
                      }
                      if (cap) indirizzoCompleto += ` - ${cap}`;
                      
                      return indirizzoCompleto.split('\n').map((line, index) => (
                        <div key={index}>{line}</div>
                      ));
                    })()}
                  </div>
                </div>
                <div><strong>Agente 1:</strong> {documento.agente1 || 'N/A'}</div>
                <div><strong>Agente 2:</strong> {documento.agente2 || 'N/A'}</div>
              </div>
            </div>

            <div>
              <h4 style={{ marginBottom: 10, color: '#374151' }}>Importi</h4>
              <div style={{ display: 'grid', gap: 8 }}>
                <div><strong>Totale Imponibile:</strong> {formatImporto(documento.totale_imponibile || documento.totaleImponibileDoc)}</div>
                <div><strong>Totale Imposta:</strong> {formatImporto(documento.totale_imposta || documento.totaleImpostaDoc)}</div>
                <div><strong>Totale Sconto:</strong> {formatImporto(documento.totale_sconto || documento.totaleScontoDoc)}</div>
                <div style={{ 
                  fontSize: '1.1em', 
                  fontWeight: 'bold', 
                  color: '#059669',
                  paddingTop: 8,
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <strong>Totale:</strong> {formatImporto(documento.totale || documento.totale_doc || documento.totaleDoc)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sezione Righe Documento */}
        {documento.righe && documento.righe.length > 0 && (
          <div style={{ 
            background: '#fff', 
            borderRadius: 8, 
            padding: 20, 
            marginBottom: 20,
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: 20, color: '#1f2937' }}>
              📋 Righe Documento ({documento.righe.length} articoli)
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Riga</th>
                    <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Descrizione</th>
                    <th style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Quantità</th>
                    <th style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Prezzo</th>
                    <th style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {documento.righe.map((riga, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: 12 }}>{riga.riga}</td>
                      <td style={{ padding: 12 }}>
                        <div>{riga.descrizione || riga.articolo}</div>
                        {riga.unita && (
                          <div style={{ fontSize: '0.8em', color: '#6b7280' }}>
                            Unità: {riga.unita}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right' }}>{riga.quantita}</td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        {formatImporto(riga.prezzoScontato || riga.prezzo)}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontWeight: 'bold' }}>
                        {formatImporto(riga.totaleRiga)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Messaggio se non ci sono righe */}
        {(!documento.righe || documento.righe.length === 0) && (
          <div style={{ 
            background: '#f3f4f6', 
            border: '1px solid #d1d5db', 
            borderRadius: 8, 
            padding: 20,
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '2em', marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: 5 }}>Nessuna riga di dettaglio</div>
            <div>Questo documento non contiene articoli o servizi dettagliati</div>
          </div>
        )}
      </div>
    </div>
  );
}
