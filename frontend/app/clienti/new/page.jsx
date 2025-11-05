"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";

// Client component that uses searchParams
function NewClienteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [cliente, setCliente] = useState({
    nome: '',
    email: '',
    telefono: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    partita_iva: '',
    codice_fiscale: '',
    codice_arca: '',
    note: ''
  });
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Campi del form cliente
  const clienteFields = [
    { name: 'nome', label: 'Nome', required: true },
    { name: 'email', label: 'Email', required: true, type: 'email' },
    { name: 'telefono', label: 'Telefono' },
    { name: 'indirizzo', label: 'Indirizzo' },
    { name: 'citta', label: 'Città' },
    { name: 'cap', label: 'CAP' },
    { name: 'provincia', label: 'Provincia' },
    { name: 'partita_iva', label: 'P. IVA' },
    { name: 'codice_fiscale', label: 'Codice Fiscale' },
    { name: 'codice_arca', label: 'Codice ARCA' },
    { name: 'note', label: 'Note', type: 'textarea' }
  ];

  const handleSaveCliente = async (formData) => {
    setIsSaving(true);
    setError("");
    try {
      // Pulisci i dati: invia solo i campi previsti dal database
      const allowedFields = ['nome', 'email', 'telefono', 'indirizzo', 'citta', 'cap', 'provincia', 'partita_iva', 'codice_fiscale', 'codice_arca', 'note'];
      const cleanedData = {};
      for (const key of allowedFields) {
        if (formData[key] !== undefined && formData[key] !== '') {
          cleanedData[key] = formData[key];
        }
      }
      
      const response = await api.post('/clients', cleanedData);
      
      // Reindirizza alla pagina del cliente appena creato
      if (response.data?.id) {
        router.push(`/clienti/${response.data.id}`);
      } else {
        // Se la risposta ha una struttura diversa
        const clienteId = response.data?.data?.id || response.data?.id;
        if (clienteId) {
          router.push(`/clienti/${clienteId}`);
        } else {
          throw new Error('ID cliente non trovato nella risposta');
        }
      }
    } catch (err) {
      console.error("Errore durante il salvataggio:", err);
      
      if (err.response) {
        const errorData = err.response.data;
        if (errorData?.errors) {
          // Errori di validazione Laravel
          const errorMessages = Object.entries(errorData.errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          setError(`Errori di validazione:\n${errorMessages}`);
        } else {
          const errorMessage = errorData?.message || errorData?.error || "Si è verificato un errore durante il salvataggio. Riprova più tardi.";
          setError(errorMessage);
        }
      } else if (err.request) {
        setError("Nessuna risposta dal server. Verifica la connessione di rete.");
      } else {
        setError("Si è verificato un errore durante il salvataggio. Riprova più tardi.");
      }
      setIsSaving(false);
    }
  };

  const handleBackToList = () => {
    router.push("/clienti");
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title="Nuovo Cliente" 
        buttonLabel="Torna alla lista" 
        onAddClick={handleBackToList} 
      />
      
      <div style={{ 
        background: '#fff', 
        borderRadius: 14, 
        boxShadow: 'var(--box-shadow)', 
        padding: 24
      }}>
        {error && (
          <div style={{ 
            background: '#ffeaea', 
            color: '#b91c1c', 
            borderRadius: 6, 
            padding: '12px 16px', 
            marginBottom: 20,
            whiteSpace: 'pre-line'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData.entries());
          handleSaveCliente(data);
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {clienteFields.map(field => (
              <div key={field.name} style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5 }}>
                  {field.label}{field.required && <span style={{ color: 'red' }}>*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    name={field.name}
                    defaultValue={cliente[field.name]}
                    required={field.required}
                    style={{ 
                      width: '100%', 
                      padding: 8, 
                      borderRadius: 4, 
                      border: '1px solid #ddd',
                      minHeight: 100
                    }}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    name={field.name}
                    defaultValue={cliente[field.name]}
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
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.6 : 1
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

// Main page component with Suspense
export default function NewClientePage() {
  return (
    <Suspense fallback={<div className="centered">Caricamento...</div>}>
      <NewClienteContent />
    </Suspense>
  );
}

