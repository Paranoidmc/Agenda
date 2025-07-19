import React, { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import axios from "../lib/api";

export default function VehicleDocumentSection({ veicoloId, categoria }) {
  const [documenti, setDocumenti] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [descrizione, setDescrizione] = useState("");
  const [dataScadenza, setDataScadenza] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef();

  const fetchDocumenti = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`/veicoli/${veicoloId}/documenti`, {
        params: { categoria },
      });
      setDocumenti(res.data.data || []);
    } catch (e) {
      setError("Errore caricamento documenti");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (veicoloId) fetchDocumenti();
    // eslint-disable-next-line
  }, [veicoloId, categoria]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("categoria", categoria);
    if (descrizione) formData.append("descrizione", descrizione);
    if (dataScadenza) formData.append("data_scadenza", dataScadenza);
    try {
      await axios.post(`/veicoli/${veicoloId}/documenti`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFile(null);
      setDescrizione("");
      setDataScadenza("");
      if (fileInput.current) fileInput.current.value = "";
      fetchDocumenti();
    } catch (e) {
      setError(e.response?.data?.error || "Errore upload documento");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Eliminare il documento?")) return;
    try {
      await axios.delete(`/documenti/${id}`);
      fetchDocumenti();
    } catch (e) {
      setError("Errore eliminazione documento");
    }
  };

  const handleDownload = async (id, nome) => {
    try {
      const response = await axios.get(`/documenti/${id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", nome || `documento_${id}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError("Errore download documento");
    }
  };

  return (
    <div style={{ marginBottom: 32, background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px #0001', padding: 24, maxWidth: 700 }}>
      <h4 style={{ marginBottom: 16, fontWeight: 600, fontSize: 20, color: '#2A3A4A' }}>{categoria.charAt(0).toUpperCase() + categoria.slice(1)}</h4>
      <form onSubmit={handleUpload} style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="file" accept=".pdf,image/*" ref={fileInput} onChange={e => setFile(e.target.files[0])} style={{ padding: 6, border: '1px solid #e0e0e0', borderRadius: 6, background: '#f9f9f9', fontSize: 14 }} />
        <input type="text" placeholder="Descrizione" value={descrizione} onChange={e => setDescrizione(e.target.value)} style={{ padding: 6, border: '1px solid #e0e0e0', borderRadius: 6, minWidth: 120, fontSize: 14 }} />
        <input type="date" placeholder="Data scadenza" value={dataScadenza} onChange={e => setDataScadenza(e.target.value)} style={{ padding: 6, border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 14 }} />
        <button type="submit" disabled={uploading || !file} style={{
          background: uploading || !file ? '#b3c6e0' : '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '7px 18px',
          fontWeight: 600,
          cursor: uploading || !file ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}>Carica</button>
      </form>
      {error && <div style={{ background: '#ffeaea', color: '#b91c1c', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontWeight: 500 }}>{error}</div>}
      {loading ? (
        <div style={{ color: '#555', fontStyle: 'italic', padding: '12px 0' }}>Caricamento...</div>
      ) : (
        <table style={{ width: "100%", fontSize: 15, borderCollapse: 'separate', borderSpacing: 0, background: '#f8fafc', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px #0001' }}>
          <thead style={{ background: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '10px 8px', fontWeight: 700, color: '#334155', borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>Nome file</th>
              <th style={{ padding: '10px 8px', fontWeight: 700, color: '#334155', borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>Descrizione</th>
              <th style={{ padding: '10px 8px', fontWeight: 700, color: '#334155', borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>Data scadenza</th>
              <th style={{ padding: '10px 8px', fontWeight: 700, color: '#334155', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {documenti.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>Nessun documento caricato</td></tr>
            )}
            {documenti.map(doc => (
              <tr key={doc.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px 8px' }}>{doc.file_path?.split("_").slice(1).join("_") || "-"}</td>
                <td style={{ padding: '8px 8px' }}>{doc.descrizione || "-"}</td>
                <td style={{ padding: '8px 8px' }}>{doc.data_scadenza || "-"}</td>
                <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                  <button onClick={() => handleDownload(doc.id, doc.file_path?.split("_").slice(1).join("_") || "documento.pdf")}
                    style={{
                      background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, cursor: 'pointer', marginRight: 4, transition: 'background 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#1d4ed8'}
                    onMouseOut={e => e.currentTarget.style.background = '#2563eb'}
                  >Scarica</button>
                  <button onClick={() => handleDelete(doc.id)}
                    style={{
                      background: '#fff', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, padding: '6px 14px', fontWeight: 600, cursor: 'pointer', marginLeft: 4, transition: 'background 0.2s, color 0.2s',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = '#fee2e2';
                      e.currentTarget.style.color = '#b91c1c';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                  >Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

VehicleDocumentSection.propTypes = {
  veicoloId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  categoria: PropTypes.oneOf(["bollo", "assicurazione", "manutenzione"]).isRequired,
};
