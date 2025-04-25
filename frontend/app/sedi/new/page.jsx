"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";

export default function NewSitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');
  const { user, loading } = useAuth();
  const [sede, setSede] = useState({
    nome: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    telefono: '',
    email: '',
    client_id: clientId || '',
    note: ''
  });
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [clienti, setClienti] = useState([]);

  // Campi del form sede
  const sedeFields = [
    { name: 'nome', label: 'Nome', required: true },
    { name: 'indirizzo', label: 'Indirizzo', required: true },
    { name: 'citta', label: 'Città', required: true },
    { name: 'cap', label: 'CAP' },
    { name: 'provincia', label: 'Provincia' },
    { name: 'telefono', label: 'Telefono' },
    { name: 'email', label: 'Email' },
    { name: 'client_id', label: 'Cliente', type: 'select', options: 
      (Array.isArray(clienti?.data) ? clienti.data : (Array.isArray(clienti) ? clienti : [])).map(cliente => ({ value: cliente.id, label: cliente.nome }))
    },
    { name: 'note', label: 'Note', type: 'textarea' }
  ];

  useEffect(() => {
    if (!loading && user) {
      loadClienti();
    }
  }, [user, loading]);

  const loadClienti = async () => {
    setFetching(true);
    try {
      const response = await api.get("/clients");
      setClienti(response.data);
      setFetching(false);
    } catch (err) {
      console.error("Errore nel caricamento dei clienti:", err);
      setFetching(false);
    }
  };

  const handleSaveSede = async (formData) => {
    setIsSaving(true);
    try {
      // Assicuriamoci che client_id sia un numero se presente
      if (formData.client_id) {
        formData.client_id = Number(formData.client_id);
      }
      
      const response = await api.post('/sites', formData);
      
      // Reindirizza alla pagina della sede appena creata
      router.push(`/sedi/${response.data.id}`);
    } catch (err) {
      console.error("Errore durante il salvataggio:", err);
      
      if (err.response) {
        const errorMessage = err.response.data?.message || "Si è verificato un errore durante il salvataggio. Riprova più tardi.";
        alert(errorMessage);
      } else if (err.request) {
        alert("Nessuna risposta dal server. Verifica la connessione di rete.");
      } else {
        alert("Si è verificato un errore durante il salvataggio. Riprova più tardi.");
      }
      setIsSaving(false);
    }
  };

  const handleBackToList = () => {
    router.push("/sedi");
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title="Nuovo Cantiere" 
        buttonLabel="Torna alla lista" 
        onAddClick={handleBackToList} 
      />
      
      <div style={{ 
        background: '#fff', 
        borderRadius: 14, 
        boxShadow: 'var(--box-shadow)', 
        padding: 24
      }}>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData.entries());
          handleSaveSede(data);
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {sedeFields.map(field => (
              <div key={field.name} style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5 }}>
                  {field.label}{field.required && <span style={{ color: 'red' }}>*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    name={field.name}
                    defaultValue={sede[field.name]}
                    required={field.required}
                    style={{ 
                      width: '100%', 
                      padding: 8, 
                      borderRadius: 4, 
                      border: '1px solid #ddd',
                      minHeight: 100
                    }}
                  />
                ) : field.type === 'select' ? (
                  <select
                    name={field.name}
                    defaultValue={sede[field.name]}
                    required={field.required}
                    style={{ 
                      width: '100%', 
                      padding: 8, 
                      borderRadius: 4, 
                      border: '1px solid #ddd' 
                    }}
                  >
                    <option value="">Seleziona...</option>
                    {clienti.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name={field.name}
                    defaultValue={sede[field.name]}
                    required={field.required}
                    style={{ 
                      width: '100%', 
                      padding: 8, 
                      borderRadius: 4, 
                      border: '1px solid #ddd' 
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button
              type="submit"
              disabled={isSaving}
              style={{ 
                background: 'var(--primary)', 
                color: '#fff', 
                borderRadius: 6, 
                padding: '0.6em 1.2em', 
                fontSize: 14,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </button>
            <button
              type="button"
              onClick={handleBackToList}
              style={{ 
                background: '#f3f3f3', 
                color: '#333', 
                borderRadius: 6, 
                padding: '0.6em 1.2em', 
                fontSize: 14,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
