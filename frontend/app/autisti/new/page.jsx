"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";

// Client component that uses searchParams
function NewAutistaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [autista, setAutista] = useState({
    codice_arca: '',
    nome: '',
    cognome: '',
    telefono: '',
    email: '',
    codice_fiscale: '',
    data_nascita: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    patente: '',
    numero_patente: '',
    scadenza_patente: '',
    data_assunzione: '',
    tipo_contratto: '',
    scadenza_contratto: '',
    note: ''
  });
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Campi del form autista - informazioni personali
  const autistaFields = [
    { name: "codice_arca", label: "Codice Arca" },
    { name: "nome", label: "Nome", required: true },
    { name: "cognome", label: "Cognome", required: true },
    { name: "telefono", label: "Telefono" },
    { name: "email", label: "Email" },
    { name: "codice_fiscale", label: "Codice Fiscale" },
    { name: "data_nascita", label: "Data di Nascita", type: "date" },
    { name: "indirizzo", label: "Indirizzo" },
    { name: "citta", label: "Città" },
    { name: "cap", label: "CAP" },
    { name: "provincia", label: "Provincia" },
    { name: "note", label: "Note", type: "textarea" }
  ];

  // Campi per la patente e informazioni lavorative
  const patenteFields = [
    {
      name: "patente",
      label: "Tipo Patente",
      type: "select",
      options: [
        { value: "", label: "Seleziona..." },
        { value: "B", label: "B" },
        { value: "C", label: "C" },
        { value: "D", label: "D" },
        { value: "CE", label: "CE" },
        { value: "DE", label: "DE" }
      ]
    },
    { name: "numero_patente", label: "Numero Patente" },
    { name: "scadenza_patente", label: "Scadenza Patente", type: "date" },
    { name: "data_assunzione", label: "Data Assunzione", type: "date" },
    {
      name: "tipo_contratto",
      label: "Tipo Contratto",
      type: "select",
      options: [
        { value: "", label: "Seleziona..." },
        { value: "indeterminato", label: "Tempo Indeterminato" },
        { value: "determinato", label: "Tempo Determinato" },
        { value: "partita_iva", label: "Partita IVA" },
        { value: "occasionale", label: "Occasionale" }
      ]
    },
    { name: "scadenza_contratto", label: "Scadenza Contratto", type: "date" }
  ];

  const handleSaveAutista = async (formData) => {
    setIsSaving(true);
    setError("");
    try {
      // Pulisci i dati: invia solo i campi previsti dal database
      const allowedFields = [
        'codice_arca', 'nome', 'cognome', 'telefono', 'email', 'codice_fiscale',
        'data_nascita', 'indirizzo', 'citta', 'cap', 'provincia',
        'patente', 'numero_patente', 'scadenza_patente', 'data_assunzione',
        'tipo_contratto', 'scadenza_contratto', 'note'
      ];
      const cleanedData = {};
      for (const key of allowedFields) {
        if (formData[key] !== undefined && formData[key] !== '') {
          cleanedData[key] = formData[key];
        }
      }
      
      const response = await api.post('/drivers', cleanedData);
      
      // Reindirizza alla pagina dell'autista appena creato
      if (response.data?.id) {
        router.push(`/autisti/${response.data.id}`);
      } else {
        // Se la risposta ha una struttura diversa
        const autistaId = response.data?.data?.id || response.data?.id;
        if (autistaId) {
          router.push(`/autisti/${autistaId}`);
        } else {
          throw new Error('ID autista non trovato nella risposta');
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
    router.push("/autisti");
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title="Nuovo Autista" 
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
          handleSaveAutista(data);
        }}>
          <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 600 }}>Informazioni Personali</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30 }}>
            {autistaFields.map(field => (
              <div key={field.name} style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5 }}>
                  {field.label}{field.required && <span style={{ color: 'red' }}>*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    name={field.name}
                    defaultValue={autista[field.name]}
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
                    defaultValue={autista[field.name]}
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

          <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 600 }}>Patente e Informazioni Lavorative</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30 }}>
            {patenteFields.map(field => (
              <div key={field.name} style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5 }}>
                  {field.label}{field.required && <span style={{ color: 'red' }}>*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    name={field.name}
                    defaultValue={autista[field.name]}
                    required={field.required}
                    style={{ 
                      width: '100%', 
                      padding: 8, 
                      borderRadius: 4, 
                      border: '1px solid #ddd' 
                    }}
                  >
                    {field.options?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || 'text'}
                    name={field.name}
                    defaultValue={autista[field.name]}
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
export default function NewAutistaPage() {
  return (
    <Suspense fallback={<div className="centered">Caricamento...</div>}>
      <NewAutistaContent />
    </Suspense>
  );
}

