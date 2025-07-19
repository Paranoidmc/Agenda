"use client";
import { useEffect, useState, use } from "react"; // Aggiunto use
import { useRouter } from "next/navigation";
import api from "../../../lib/api";

export default function ScadenzaDetailPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params); // Risolve la Promise params
  const { id } = resolvedParams; // Estrae id dai parametri risolti
  const [scadenza, setScadenza] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setFetching(true);
    api.get(`/vehicle-deadlines/${id}`)
      .then(res => setScadenza(res.data))
      .catch((err) => {
        if (err.response && err.response.status === 404) {
          setError("Scadenza non trovata");
        } else {
          setError("Errore nel caricamento della scadenza");
        }
      })
      .finally(() => setFetching(false));
  }, [id]);

  if (fetching) return <div>Caricamento...</div>;
  if (error) return <div>{error}</div>;
  if (!scadenza) return <div>Scadenza non trovata</div>;

  return (
    <div style={{ padding: 32 }}>
      <h1>Dettaglio Scadenza</h1>
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <div><b>Veicolo:</b> {scadenza.vehicle?.targa || 'N/D'}</div>
        <div><b>Tipo:</b> {scadenza.tipo || 'N/D'}</div>
        <div><b>Data Scadenza:</b> {scadenza.data_scadenza ? new Date(scadenza.data_scadenza).toLocaleDateString('it-IT') : 'N/D'}</div>
        <div><b>Importo:</b> {scadenza.importo ? `€ ${scadenza.importo}` : 'N/D'}</div>
        <div><b>Pagato:</b> {scadenza.pagato === 1 || scadenza.pagato === '1' ? 'Sì' : 'No'}</div>
        <div><b>Data Pagamento:</b> {scadenza.data_pagamento ? new Date(scadenza.data_pagamento).toLocaleDateString('it-IT') : 'N/D'}</div>
        <div><b>Note:</b> {scadenza.note || 'Nessuna nota'}</div>
      </div>
      <button style={{ marginTop: 24 }} onClick={() => router.push('/scadenze')}>Torna alla lista</button>
    </div>
  );
}
