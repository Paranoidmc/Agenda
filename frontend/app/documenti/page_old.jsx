'use client';

import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { FiDownload, FiLink, FiFilter, FiSearch, FiFileText, FiCalendar, FiUser, FiMapPin } from 'react-icons/fi';

export default function DocumentiPage() {
    const [documenti, setDocumenti] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtri, setFiltri] = useState({
        cliente: '',
        sede: '',
        dataInizio: '',
        dataFine: '',
        codiceDoc: ''
    });
    const [showFiltri, setShowFiltri] = useState(false);
    const [clienti, setClienti] = useState([]);
    const [sedi, setSedi] = useState([]);

    useEffect(() => {
        fetchDocumenti();
        fetchClienti();
        fetchSedi();
    }, []);

    const fetchDocumenti = async () => {
        try {
            setLoading(true);
            const response = await api.get('/documenti', {
                params: filtri
            });
            setDocumenti(response.data.data || []);
        } catch (error) {
            console.error('Errore caricamento documenti:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClienti = async () => {
        try {
            const response = await api.get('/clients');
            setClienti(response.data.data || []);
        } catch (error) {
            console.error('Errore caricamento clienti:', error);
        }
    };

    const fetchSedi = async () => {
        try {
            const response = await api.get('/sites');
            setSedi(response.data.data || []);
        } catch (error) {
            console.error('Errore caricamento sedi:', error);
        }
    };

    const handleFiltroChange = (campo, valore) => {
        setFiltri(prev => ({
            ...prev,
            [campo]: valore
        }));
    };

    const applicaFiltri = () => {
        fetchDocumenti();
    };

    const resetFiltri = () => {
        setFiltri({
            cliente: '',
            sede: '',
            dataInizio: '',
            dataFine: '',
            codiceDoc: ''
        });
        setTimeout(() => fetchDocumenti(), 100);
    };

    const generaPDF = async (documento) => {
        try {
            const response = await api.get(`/documenti/${documento.id}/pdf`, {
                responseType: 'blob'
            });
            
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `documento-${documento.codice_doc}-${documento.numero_doc}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Errore generazione PDF:', error);
            alert('Errore nella generazione del PDF');
        }
    };

    const collegaAdAttivita = (documento) => {
        // TODO: Implementare collegamento ad attività
        console.log('Collega documento ad attività:', documento);
        alert('Funzionalità in sviluppo: collegamento ad attività');
    };

    const formatData = (data) => {
        if (!data) return '-';
        return new Date(data).toLocaleDateString('it-IT');
    };

    const formatCurrency = (amount) => {
        if (!amount) return '€0,00';
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center space-x-3">
                            <FiFileText className="h-8 w-8 text-blue-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Documenti Arca</h1>
                                <p className="text-sm text-gray-500">
                                    Gestione documenti sincronizzati da Arca
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => setShowFiltri(!showFiltri)}
                                className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                                    showFiltri 
                                        ? 'bg-blue-50 border-blue-300 text-blue-700' 
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <FiFilter className="h-4 w-4 mr-2" />
                                Filtri
                            </button>
                            
                            <div className="text-sm text-gray-500">
                                {documenti.length} documenti
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtri */}
            {showFiltri && (
                <div className="bg-white border-b shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cliente
                                </label>
                                <select
                                    value={filtri.cliente}
                                    onChange={(e) => handleFiltroChange('cliente', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sede
                                </label>
                                <select
                                    value={filtri.sede}
                                    onChange={(e) => handleFiltroChange('sede', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Data Inizio
                                </label>
                                <input
                                    type="date"
                                    value={filtri.dataInizio}
                                    onChange={(e) => handleFiltroChange('dataInizio', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Data Fine
                                </label>
                                <input
                                    type="date"
                                    value={filtri.dataFine}
                                    onChange={(e) => handleFiltroChange('dataFine', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Codice Documento
                                </label>
                                <input
                                    type="text"
                                    value={filtri.codiceDoc}
                                    onChange={(e) => handleFiltroChange('codiceDoc', e.target.value)}
                                    placeholder="es. DDT"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-4">
                            <button
                                onClick={resetFiltri}
                                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Reset
                            </button>
                            <button
                                onClick={applicaFiltri}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                            >
                                <FiSearch className="h-4 w-4 mr-2" />
                                Applica Filtri
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lista Documenti */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Caricamento documenti...</span>
                    </div>
                ) : documenti.length === 0 ? (
                    <div className="text-center py-12">
                        <FiFileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Nessun documento trovato
                        </h3>
                        <p className="text-gray-500">
                            Prova a modificare i filtri o sincronizza i dati da Arca
                        </p>
                    </div>
                ) : (
                    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Documento
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Cliente
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Sede
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Autista
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Data
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Totale
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Azioni
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {documenti.map((documento) => (
                                        <tr key={documento.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <FiFileText className="h-5 w-5 text-gray-400 mr-3" />
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {documento.codice_doc}/{documento.numero_doc}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {documento.righe_count || 0} righe
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <FiUser className="h-4 w-4 text-gray-400 mr-2" />
                                                    <div>
                                                        <div className="text-sm text-gray-900">
                                                            {documento.client?.name || '-'}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {documento.client?.phone || ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <FiMapPin className="h-4 w-4 text-gray-400 mr-2" />
                                                    <div>
                                                        <div className="text-sm text-gray-900">
                                                            {documento.site?.name || '-'}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {documento.site?.city || ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {documento.driver ? 
                                                        `${documento.driver.name} ${documento.driver.surname}` : 
                                                        '-'
                                                    }
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <FiCalendar className="h-4 w-4 text-gray-400 mr-2" />
                                                    <span className="text-sm text-gray-900">
                                                        {formatData(documento.data_doc)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {formatCurrency(documento.totale_doc)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => generaPDF(documento)}
                                                        className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                                        title="Genera PDF"
                                                    >
                                                        <FiDownload className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => collegaAdAttivita(documento)}
                                                        className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50 transition-colors"
                                                        title="Collega ad Attività"
                                                    >
                                                        <FiLink className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
