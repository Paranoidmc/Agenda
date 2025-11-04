"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Funzione helper per mostrare il tipo in italiano
function tipoScadenzaIT(tipo) {
  switch ((tipo||'').toLowerCase()) {
    case 'assicurazione':
    case 'insurance':
      return 'Assicurazione';
    case 'bollo':
    case 'tax':
      return 'Bollo';
    case 'revisione':
    case 'inspection':
      return 'Revisione';
    case 'tagliando':
    case 'service':
      return 'Tagliando';
    case 'altro':
    case 'other':
      return 'Altro';
    default:
      return tipo;
  }
}

import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import SidePanel from "../../components/SidePanel";
import EntityForm from "../../components/EntityForm";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

function ScadenzeContent() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const [scadenze, setScadenze] = useState([]);
const [searchText, setSearchText] = useState("");
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [selectedScadenza, setSelectedScadenza] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableWidth, setTableWidth] = useState('100%');
  const [veicoli, setVeicoli] = useState([]);

  // Campi del form scadenza
  const scadenzaFields = [
    { name: 'vehicle_id', label: 'Veicolo', type: 'select', required: true, options: 
      veicoli.map(veicolo => ({ value: veicolo.id, label: `${veicolo.targa} - ${veicolo.marca} ${veicolo.modello}` }))
    },
    { name: 'tipo', label: 'Tipo', type: 'select', required: true, options: [
      { value: 'Assicurazione', label: 'Assicurazione' },
      { value: 'Bollo', label: 'Bollo' },
      { value: 'Revisione', label: 'Revisione' },
      { value: 'Tagliando', label: 'Tagliando' },
      { value: 'Altro', label: 'Altro' },
      // Eventuali valori inglesi dal backend
      { value: 'Insurance', label: 'Assicurazione' },
      { value: 'Tax', label: 'Bollo' },
      { value: 'Inspection', label: 'Revisione' },
      { value: 'Service', label: 'Tagliando' },
      { value: 'Other', label: 'Altro' }
    ]},
    { name: 'data_scadenza', label: 'Data Scadenza', type: 'date', required: true },
    { name: 'importo', label: 'Importo (€)', type: 'number' },
    { name: 'pagato', label: 'Pagato', type: 'select', options: [
      { value: '1', label: 'Sì' },
      { value: '0', label: 'No' }
    ]},
    { name: 'data_pagamento', label: 'Data Pagamento', type: 'date' },
    { name: 'note', label: 'Note', type: 'textarea' }
  ];

  useEffect(() => {
    if (!loading && user) {
      loadScadenze();
      loadVeicoli();
    } else if (!loading && !user) {
      // Se non c'è un utente e non sta caricando, imposta fetching a false
      setFetching(false);
    }
  }, [user, loading]);
  
  // Effetto separato per gestire i parametri URL dopo che le scadenze sono caricate
  useEffect(() => {
    if (scadenze.length > 0 && searchParams) {
      const idParam = searchParams.get('id');
      if (idParam) {
        const scadenza = scadenze.find(s => s.id === idParam || s.id?.toString() === idParam);
        if (scadenza) {
          handleViewDetails(scadenza);
        }
      }
    }
  }, [scadenze, searchParams, handleViewDetails]);

  // Effetto per animare la tabella quando il pannello si apre/chiude
  useEffect(() => {
    if (isPanelOpen) {
      // Riduci la larghezza della tabella con un ritardo per l'animazione
      setTimeout(() => {
        setTableWidth('60%');
      }, 50);
    } else {
      // Ripristina la larghezza della tabella
      setTableWidth('100%');
    }
  }, [isPanelOpen]);

  const loadScadenze = () => {
    setFetching(true);
    api.get("/vehicle-deadlines", { params: { _: new Date().getTime() } }) // Cache-busting
      .then(res => {
        let arr = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : []);
        setScadenze(arr);
      })
      .catch((err) => {
        console.error("Errore nel caricamento delle scadenze:", err);
        if (err.response && err.response.status === 401) {
          setError("Sessione scaduta. Effettua nuovamente il login.");
        } else {
          setError("Errore nel caricamento delle scadenze");
        }
      })
      .finally(() => setFetching(false));
  };

  const loadVeicoli = () => {
    api.get("/vehicles")
      .then(res => {
        const arr = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : []);
        setVeicoli(arr);
      })
      .catch(err => console.error("Errore nel caricamento dei veicoli:", err));
  };


  const handleViewDetails = useCallback((scadenza) => {
    setSelectedScadenza(scadenza);
    setIsEditing(false);
    setIsPanelOpen(true);
  }, []);

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    // Reset dello stato dopo che l'animazione di chiusura è completata
    setTimeout(() => {
      setSelectedScadenza(null);
      setIsEditing(false);
    }, 300);
  };

  const handleSaveScadenza = async (formData) => {
    setIsSaving(true);
    try {
      let response;
      const dataToSend = { ...formData }; 
      if (dataToSend.vehicle_id) {
          dataToSend.vehicle_id = Number(dataToSend.vehicle_id);
      }
      if (dataToSend.pagato !== undefined) {
          dataToSend.pagato = dataToSend.pagato === '1' || dataToSend.pagato === true; // o Number(dataToSend.pagato) se il backend vuole 0/1
      }

      if (dataToSend.id) {
        // Aggiornamento
        response = await api.put(`/vehicle-deadlines/${dataToSend.id}`, dataToSend);
      } else {
        response = await api.post('/vehicle-deadlines', dataToSend);
      }
      
      // setSelectedScadenza(response.data); // Opzionale
      setIsEditing(false);
      await loadScadenze(); 
      handleClosePanel();
      
      const message = dataToSend.id ? 'Scadenza aggiornata con successo!' : 'Scadenza creata con successo!';
      if (typeof showToast === 'function') {
        showToast(message, 'success');
      } else {
        alert(message);
      }

    } catch (err) {
      console.error("Errore durante il salvataggio della scadenza:", err);
      setIsEditing(true); // Mantiene il form aperto per correzioni
      let errorMessage = "Si è verificato un errore durante il salvataggio. Riprova più tardi.";
      if (err.response && err.response.data && err.response.data.errors) {
          const validationErrors = Object.values(err.response.data.errors).flat().join('\n');
          errorMessage = `Errori di validazione:\n${validationErrors}`;
      } else if (err.response && err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
      }
      
      if (typeof showToast === 'function') {
        showToast(errorMessage, 'error');
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteScadenza = async (id) => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/vehicle-deadlines/${id}`);
      
      // Rimuovi la scadenza dalla lista
      setScadenze(prev => prev.filter(s => s.id !== id));
      
      // Chiudi il pannello
      handleClosePanel();
    } catch (err) {
      console.error("Errore durante l'eliminazione:", err);
      alert("Si è verificato un errore durante l'eliminazione. Riprova più tardi.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedScadenza({});
    setIsEditing(true);
    setIsPanelOpen(true);
  };

  // Funzione per formattare la data
  const formatDate = (dateString) => {
    if (!dateString) return 'N/D';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
  };

  // Funzione per determinare lo stato della scadenza
  const getDeadlineStatus = (date) => {
    if (!date) return { color: '#8e8e93', label: 'N/D' }; // Grigio
    
    const deadlineDate = new Date(date);
    const today = new Date();
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { color: '#ff3b30', label: 'Scaduta' }; // Rosso
    } else if (diffDays <= 30) {
      return { color: '#ff9500', label: 'In scadenza' }; // Arancione
    } else {
      return { color: '#34c759', label: 'Valida' }; // Verde
    }
  };

  if (loading || fetching) return <div className="centered"><span className="loader" style={{display:'inline-block', width:32, height:32, border:'4px solid #ddd', borderTop:'4px solid var(--primary)', borderRadius:'50%', animation:'spin 1s linear infinite'}}></span> Caricamento scadenze...</div>;
  if (error) return (
    <div className="centered">
      {error}
      <br />
      <button onClick={loadScadenze} style={{marginTop: 12, padding: '8px 16px', borderRadius: 6, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer'}}>Riprova</button>
    </div>
  );

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title="Scadenze Veicoli" 
        buttonLabel="Nuova Scadenza" 
        onAddClick={handleCreateNew} 
      />
      <div style={{margin: '18px 0 12px 0'}}>
        <input
          type="text"
          placeholder="Cerca per targa, tipo o data..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{padding: 8, borderRadius: 6, border: '1px solid #ccc', width: 240}}
        />
      </div>
      <div 
        style={{ 
          transition: 'width 0.3s ease-in-out',
          width: tableWidth,
          overflow: 'hidden'
        }}
      >
        <DataTable 
          data={scadenze.filter(s => {
            const testo = (s.vehicle?.targa || "") + " " + (s.tipo || "") + " " + (s.data_scadenza || "");
            return testo.toLowerCase().includes(searchText.toLowerCase());
          })}
          columns={[
            { 
              key: 'vehicle.targa', 
              label: 'Targa'
            },
            { 
              key: 'vehicle.marca', 
              label: 'Marca'
            },
            { 
              key: 'vehicle.modello', 
              label: 'Modello'
            },
            { 
              key: 'tipo', 
              label: 'Tipo',
              render: (item) => tipoScadenzaIT(item.tipo)
            },
            { 
              key: 'data_scadenza', 
              label: 'Data Scadenza',
              render: (item) => formatDate(item.data_scadenza)
            },
            { 
              key: 'importo', 
              label: 'Importo (€)'
            },
            { 
              key: 'pagato', 
              label: 'Pagato',
              render: (item) => item.pagato === 1 ? 'Sì' : 'No'
            },
            { 
              key: 'status', 
              label: 'Stato',
              render: (item) => {
                const status = getDeadlineStatus(item.data_scadenza);
                return (
                  <span style={{ 
                    display: 'inline-block',
                    padding: '0.2em 0.6em',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#fff',
                    backgroundColor: status.color
                  }}>
                    {status.label}
                  </span>
                );
              }
            },
            { 
              key: 'note', 
              label: 'Note'
            },
            { 
              key: 'actions', 
              label: 'Azioni',
              render: (item) => (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(item);
                  }}
                  style={{ 
                    background: 'var(--primary)', 
                    color: '#fff', 
                    borderRadius: 6, 
                    padding: '0.4em 1em', 
                    fontSize: 14,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Dettagli
                </button>
              )
            }
          ]}
          filterableColumns={[
            { 
              key: 'vehicle.targa', 
              label: 'Targa',
              filterType: 'text'
            },
            { 
              key: 'tipo', 
              label: 'Tipo',
              filterType: 'select',
              filterOptions: [
                { value: 'Assicurazione', label: 'Assicurazione' },
                { value: 'Bollo', label: 'Bollo' },
                { value: 'Revisione', label: 'Revisione' },
                { value: 'Tagliando', label: 'Tagliando' },
                { value: 'Altro', label: 'Altro' },
                { value: 'Insurance', label: 'Assicurazione' },
                { value: 'Tax', label: 'Bollo' },
                { value: 'Inspection', label: 'Revisione' },
                { value: 'Service', label: 'Tagliando' },
                { value: 'Other', label: 'Altro' }
              ]
            },
            { 
              key: 'pagato', 
              label: 'Pagato',
              filterType: 'select',
              filterOptions: [
                { value: '1', label: 'Sì' },
                { value: '0', label: 'No' }
              ]
            },
            { 
              key: 'importo', 
              label: 'Importo',
              filterType: 'range'
            }
          ]}
          onRowClick={handleViewDetails}
          selectedRow={selectedScadenza}
          searchPlaceholder="Cerca scadenze..."
          emptyMessage="Nessuna scadenza trovata"
          defaultVisibleColumns={['vehicle.targa', 'tipo', 'data_scadenza', 'status', 'pagato', 'actions']}
        />
      </div>

      {/* Pannello laterale per i dettagli */}
      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={handleClosePanel} 
        title={isEditing ? "Modifica Scadenza" : "Dettagli Scadenza"}
      >
        {selectedScadenza && (
          <EntityForm
            data={selectedScadenza}
            fields={scadenzaFields}
            onSave={handleSaveScadenza}
            onDelete={handleDeleteScadenza}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            isLoading={isSaving || isDeleting}
          />
        )}
      </SidePanel>
    </div>
  );
}

export default function ScadenzePage() {
  return (
    <Suspense fallback={<div style={{ padding: '20px' }}>Caricamento...</div>}>
      <ScadenzeContent />
    </Suspense>
  );
}