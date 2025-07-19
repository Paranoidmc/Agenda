import React, { useState, useEffect } from 'react';
import api from '../lib/api';

const AddFacilityPopup = ({ isOpen, onClose, onFacilityAdded, entityData, clienti }) => {
    const [form, setForm] = useState({
        name: entityData?.name || '',
        indirizzo: '',
        cap: '',
        citta: '',
        provincia: '',
        note: '',
        client_id: entityData?.client_id || (clienti && clienti.length > 0 ? clienti[0].id : ''),
        client_name: entityData?.client_name || (clienti && clienti.length > 0 ? (clienti[0].nome || clienti[0].name) : '')
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Reset form when popup opens or entityData changes
    useEffect(() => {
        if (isOpen) {
            setForm({
                name: entityData?.name || '',
                indirizzo: '',
                cap: '',
                citta: '',
                provincia: '',
                note: '',
                client_id: entityData?.client_id || (clienti && clienti.length > 0 ? clienti[0].id : ''),
                client_name: entityData?.client_name || (clienti && clienti.length > 0 ? (clienti[0].nome || clienti[0].name) : '')
            });
            setError('');
        }
    }, [isOpen, entityData, clienti]);

    // Aggiorna client_name quando cambia il client_id
    const handleClientChange = (e) => {
        const clientId = e.target.value;
        const selected = clienti.find(c => String(c.id) === String(clientId));
        setForm(prev => ({
            ...prev,
            client_id: clientId,
            client_name: selected ? (selected.nome || selected.name) : ''
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Usa l'API dei cantieri/sedi del cliente
            const response = await api.post(`/clients/${form.client_id}/sites`, form);
            onFacilityAdded(response.data);
            setForm({ name: '', indirizzo: '', cap: '', citta: '', provincia: '', note: '', client_id: form.client_id, client_name: form.client_name });
            onClose();
        } catch (error) {
            console.error('Errore salvataggio sede:', error, error?.response);
            if (error.response && error.response.data && error.response.data.message) {
                setError('Errore: ' + error.response.data.message);
            } else {
                setError('Errore durante il salvataggio');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="styled-popup">
            <div className="styled-popup-content">
                <h2>Aggiungi Nuovo Cantiere / Sede</h2>
                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="styled-field">
                        <label>Cliente</label>
                        <select
                            name="client_id"
                            value={form.client_id}
                            onChange={handleClientChange}
                            required
                            disabled={!clienti || clienti.length === 0}
                        >
                            {(!clienti || clienti.length === 0) && (
                                <option value="">Nessun cliente disponibile</option>
                            )}
                            {clienti && clienti.map(cliente => (
                                <option key={cliente.id} value={cliente.id}>
                                    {cliente.nome || cliente.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="styled-field">
                        <label>Nome Sede</label>
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Nome della sede"
                            required
                        />
                    </div>
                    <div className="styled-field">
                        <label>Indirizzo</label>
                        <input
                            type="text"
                            name="indirizzo"
                            value={form.indirizzo}
                            onChange={handleChange}
                            placeholder="Indirizzo"
                            required
                        />
                    </div>
                    <div className="styled-row">
                        <div className="styled-field half">
                            <label>CAP</label>
                            <input
                                type="text"
                                name="cap"
                                value={form.cap}
                                onChange={handleChange}
                                placeholder="CAP"
                            />
                        </div>
                        <div className="styled-field half">
                            <label>Città</label>
                            <input
                                type="text"
                                name="citta"
                                value={form.citta}
                                onChange={handleChange}
                                placeholder="Città"
                            />
                        </div>
                    </div>
                    <div className="styled-row">
                        <div className="styled-field half">
                            <label>Provincia</label>
                            <input
                                type="text"
                                name="provincia"
                                value={form.provincia}
                                onChange={handleChange}
                                placeholder="Provincia"
                            />
                        </div>
                        <div className="styled-field half">
                            <label>Note</label>
                            <input
                                type="text"
                                name="note"
                                value={form.note}
                                onChange={handleChange}
                                placeholder="Note"
                            />
                        </div>
                    </div>
                    {error && <div className="styled-error">{error}</div>}
                    <div className="styled-actions">
                        <button type="submit" className="primary" disabled={loading}>{loading ? 'Salvataggio...' : 'Aggiungi'}</button>
                        <button type="button" className="secondary" onClick={onClose}>Chiudi</button>
                    </div>
                </form>
            </div>
            <style jsx>{`
                .styled-popup {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.18);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1100;
                }
                .styled-popup-content {
                    background: #fff;
                    border-radius: 18px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
                    padding: 32px 32px 20px 32px;
                    min-width: 440px;
                    max-width: 98vw;
                }
                .styled-field {
                    margin-bottom: 16px;
                    display: flex;
                    flex-direction: column;
                }
                .styled-field label {
                    font-weight: 600;
                    margin-bottom: 4px;
                    font-size: 1rem;
                    color: #222;
                }
                .styled-field input,
                .styled-field select {
                    padding: 10px 12px;
                    border-radius: 8px;
                    border: 1.5px solid #d1d5db;
                    font-size: 1rem;
                    background: #f6f7fa;
                    outline: none;
                    transition: border 0.2s;
                }
                .styled-field input:focus,
                .styled-field select:focus {
                    border: 1.5px solid #2563eb;
                    background: #fff;
                }
                .styled-row {
                    display: flex;
                    gap: 16px;
                }
                .styled-row .half {
                    flex: 1 1 0;
                }
                .styled-actions {
                    margin-top: 24px;
                    display: flex;
                    gap: 12px;
                }
                button.primary {
                    background: #2563eb;
                    color: #fff;
                    font-weight: 600;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 30px;
                    font-size: 1rem;
                    box-shadow: 0 2px 8px rgba(37,99,235,0.07);
                    cursor: pointer;
                    transition: background 0.18s;
                }
                button.primary:hover:not(:disabled) {
                    background: #1746b3;
                }
                button.secondary {
                    background: #e5e7eb;
                    color: #333;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 22px;
                    font-size: 1rem;
                    font-weight: 500;
                    cursor: pointer;
                }
                .styled-error {
                    color: #e11d48;
                    margin-bottom: 10px;
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
};

export default AddFacilityPopup;
