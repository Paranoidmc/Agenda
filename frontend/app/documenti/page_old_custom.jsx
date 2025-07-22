"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [perPage, setPerPage] = useState(20000);
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

  // Sincronizzazione documenti
  const sincronizzaOggi = async () => {
    try {
      setSyncing(true);
      setSyncMessage('Sincronizzazione in corso...');
      
      const response = await api.post('/documenti/sincronizza-oggi');
      
      if (response.data.success) {
        setSyncMessage('✅ Sincronizzazione completata!');
        setDataVersion(v => v + 1); // Ricarica i dati
      } else {
        setSyncMessage('❌ Errore durante la sincronizzazione');
      }
    } catch (error) {
      console.error('Errore sincronizzazione:', error);
      setSyncMessage('❌ Errore durante la sincronizzazione');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 3000);
    }
  };

    const handleFiltroChange = (campo, valore) => {
        setFiltri(prev => ({
            ...prev,
            [campo]: valore
        }));
    };

    const applicaFiltri = () => {
        caricaDocumenti();
    };

    const resetFiltri = () => {
        setFiltri({
            cliente: '',
            sede: '',
            codice_documento: '',
            data_inizio: '',
            data_fine: ''
        });
        setTimeout(() => caricaDocumenti(), 100);
    };

    const generaPDF = async (documentoId) => {
        try {
            const response = await api.get(`/documenti/${documentoId}/pdf`, {
                responseType: 'blob'
            });
            
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `documento_${documentoId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Errore nella generazione PDF:', error);
            alert('Errore nella generazione del PDF');
        }
    };

    const collegaAttivita = (documentoId) => {
        // TODO: Implementare collegamento con attività
        alert(`Collegamento documento ${documentoId} con attività - Da implementare`);
    };

    const formatData = (dataString) => {
        if (!dataString) return '-';
        const data = new Date(dataString);
        return data.toLocaleDateString('it-IT');
    };

    const formatImporto = (importo) => {
        if (!importo) return '-';
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(importo);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Centrato */}
            <div className="bg-white shadow-lg border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-6 py-8">
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="bg-blue-100 p-3 rounded-full">
                                <FiFileText className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            Documenti Arca
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Gestione completa dei documenti sincronizzati da Arca con filtri avanzati e generazione PDF
                        </p>
                    </div>
                    
                    {/* Azioni Principali */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                        <button
                            onClick={sincronizzaOggi}
                            disabled={syncing}
                            className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-base font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            <FiRefreshCw className={`mr-3 h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Sincronizzando...' : 'Sincronizza Oggi'}
                        </button>
                        
                        <button
                            onClick={() => setShowFiltri(!showFiltri)}
                            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-xl shadow-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                        >
                            <FiFilter className="mr-3 h-5 w-5" />
                            Filtri Avanzati
                        </button>
                    </div>
                    
                    {/* Statistiche Centrate */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg overflow-hidden">
                            <div className="p-6 text-center">
                                <div className="flex items-center justify-center mb-3">
                                    <FiFileText className="h-8 w-8 text-white" />
                                </div>
                                <div className="text-3xl font-bold text-white mb-1">{stats.totale}</div>
                                <div className="text-blue-100 font-medium">Totale Documenti</div>
                            </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg overflow-hidden">
                            <div className="p-6 text-center">
                                <div className="flex items-center justify-center mb-3">
                                    <FiCalendar className="h-8 w-8 text-white" />
                                </div>
                                <div className="text-3xl font-bold text-white mb-1">{stats.oggi}</div>
                                <div className="text-green-100 font-medium">Documenti Oggi</div>
                            </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg overflow-hidden">
                            <div className="p-6 text-center">
                                <div className="flex items-center justify-center mb-3">
                                    <FiCheckCircle className="h-8 w-8 text-white" />
                                </div>
                                <div className="text-3xl font-bold text-white mb-1">{stats.settimana}</div>
                                <div className="text-purple-100 font-medium">Ultima Settimana</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Messaggio di sincronizzazione */}
                    {syncMessage && (
                        <div className="mt-6 max-w-2xl mx-auto">
                            <div className={`p-4 rounded-xl border ${
                                syncMessage.includes('✅') 
                                    ? 'bg-green-50 border-green-200 text-green-800' 
                                    : syncMessage.includes('❌')
                                    ? 'bg-red-50 border-red-200 text-red-800'
                                    : 'bg-blue-50 border-blue-200 text-blue-800'
                            }`}>
                                <div className="flex items-center justify-center">
                                    {syncMessage.includes('✅') ? (
                                        <FiCheckCircle className="h-5 w-5 mr-2" />
                                    ) : syncMessage.includes('❌') ? (
                                        <FiAlertCircle className="h-5 w-5 mr-2" />
                                    ) : (
                                        <FiRefreshCw className="h-5 w-5 mr-2 animate-spin" />
                                    )}
                                    <span className="font-medium">{syncMessage}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Filtri */}
            {showFiltri && (
                <div className="bg-white border-b shadow-sm">
                    <div className="max-w-6xl mx-auto px-6 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cliente
                                </label>
                                <select
                                    value={filtri.cliente}
                                    onChange={(e) => handleFiltroChange('cliente', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Tutti i clienti</option>
                                    {clienti.map(cliente => (
                                        <option key={cliente.id} value={cliente.id}>
                                            {cliente.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sede
                                </label>
                                <select
                                    value={filtri.sede}
                                    onChange={(e) => handleFiltroChange('sede', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Tutte le sedi</option>
                                    {sedi.map(sede => (
                                        <option key={sede.id} value={sede.id}>
                                            {sede.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Data Inizio
                                </label>
                                <input
                                    type="date"
                                    value={filtri.data_inizio}
                                    onChange={(e) => handleFiltroChange('data_inizio', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Data Fine
                                </label>
                                <input
                                    type="date"
                                    value={filtri.data_fine}
                                    onChange={(e) => handleFiltroChange('data_fine', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Codice Documento
                                </label>
                                <input
                                    type="text"
                                    value={filtri.codice_documento}
                                    onChange={(e) => handleFiltroChange('codice_documento', e.target.value)}
                                    placeholder="es. DDT"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-center gap-4 mt-6">
                            <button
                                onClick={resetFiltri}
                                className="px-6 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Reset
                            </button>
                            <button
                                onClick={applicaFiltri}
                                className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <FiSearch className="mr-2 h-4 w-4 inline" />
                                Applica Filtri
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contenuto principale */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex justify-center items-center py-16">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <span className="text-lg text-gray-600">Caricamento documenti...</span>
                        </div>
                    </div>
                ) : documenti.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                            <FiFileText className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 mb-2">Nessun documento trovato</h3>
                        <p className="text-gray-500 mb-6">
                            Prova a modificare i filtri o sincronizza i dati da Arca
                        </p>
                        <button
                            onClick={sincronizzaOggi}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                            <FiRefreshCw className="mr-2 h-4 w-4" />
                            Sincronizza Ora
                        </button>
                    </div>
                ) : (
                    <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 text-center">
                                {documenti.length} documenti trovati
                            </h3>
                        </div>
                        
                        <div className="divide-y divide-gray-200">
                            {documenti.map((documento) => (
                                <div key={documento.id} className="px-6 py-6 hover:bg-gray-50 transition-colors duration-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="text-lg font-semibold text-blue-600 truncate">
                                                        {documento.codice_doc || 'N/A'} #{documento.numero_doc}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap items-center text-sm text-gray-500 gap-4">
                                                        <div className="flex items-center">
                                                            <FiCalendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                                            {formatData(documento.data_doc)}
                                                        </div>
                                                        
                                                        {documento.cliente && (
                                                            <div className="flex items-center">
                                                                <FiUser className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                                                {documento.cliente.name}
                                                            </div>
                                                        )}
                                                        
                                                        {documento.sede && (
                                                            <div className="flex items-center">
                                                                <FiMapPin className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                                                {documento.sede.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="text-right ml-6">
                                                    <p className="text-xl font-bold text-gray-900">
                                                        {formatImporto(documento.totale_doc)}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {documento.righe_count || 0} righe
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="ml-6 flex-shrink-0 flex items-center gap-3">
                                            <button
                                                onClick={() => generaPDF(documento.id)}
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                                                title="Genera PDF"
                                            >
                                                <FiDownload className="h-4 w-4 mr-2" />
                                                PDF
                                            </button>
                                            
                                            <button
                                                onClick={() => collegaAttivita(documento.id)}
                                                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                                                title="Collega ad attività"
                                            >
                                                <FiLink className="h-4 w-4 mr-2" />
                                                Collega
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
