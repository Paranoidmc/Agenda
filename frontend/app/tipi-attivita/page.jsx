"use client";
import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import SidePanel from "../../components/SidePanel";
import EntityForm from "../../components/EntityForm";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

export default function TipiAttivitaPage() {
  const { user, loading } = useAuth();
  const [tipiAttivita, setTipiAttivita] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [selectedTipo, setSelectedTipo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableWidth, setTableWidth] = useState('100%');

  // Colori predefiniti per i tipi di attività
  const coloriPredefiniti = [
    { value: '#007aff', label: 'Blu' },
    { value: '#34c759', label: 'Verde' },
    { value: '#ff9500', label: 'Arancione' },
    { value: '#ff3b30', label: 'Rosso' },
    { value: '#5856d6', label: 'Viola' },
    { value: '#ff2d55', label: 'Rosa' },
    { value: '#af52de', label: 'Magenta' },
    { value: '#ffcc00', label: 'Giallo' },
    { value: '#8e8e93', label: 'Grigio' }
  ];

  // Campi del form tipo attività
  const tipoAttivitaFields = [
    { name: 'nome', label: 'Nome', required: true },
    { name: 'descrizione', label: 'Descrizione', type: 'textarea' },
    { name: 'colore', label: 'Colore', type: 'select', options: coloriPredefiniti },
    { name: 'durata_predefinita', label: 'Durata Predefinita (minuti)', type: 'number' },
    { name: 'note', label: 'Note', type: 'textarea' }
  ];

  useEffect(() => {
    if (!loading && user) {
      loadTipiAttivita();
    } else if (!loading && !user) {
      // Se non c'è un utente e non sta caricando, imposta fetching a false
      setFetching(false);
    }
  }, [user, loading]);

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

  const loadTipiAttivita = () => {
    setFetching(true);
    api.get("/activity-types")
      .then(res => setTipiAttivita(res.data))
      .catch((err) => {
        console.error("Errore nel caricamento dei tipi di attività:", err);
        if (err.response && err.response.status === 401) {
          setError("Sessione scaduta. Effettua nuovamente il login.");
        } else {
          setError("Errore nel caricamento dei tipi di attività");
        }
      })
      .finally(() => setFetching(false));
  };

  const handleViewDetails = (tipo) => {
    setSelectedTipo(tipo);
    setIsEditing(false);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    // Reset dello stato dopo che l'animazione di chiusura è completata
    setTimeout(() => {
      setSelectedTipo(null);
      setIsEditing(false);
    }, 300);
  };

  const handleSaveTipo = async (formData) => {
    setIsSaving(true);
    try {
      let response;
      if (formData.id) {
        // Aggiornamento
        response = await api.put(`/activity-types/${formData.id}`, formData);
        
        // Aggiorna la lista dei tipi di attività
        setTipiAttivita(prev => 
          prev.map(t => t.id === formData.id ? response.data : t)
        );
        
        // Aggiorna il tipo selezionato
        setSelectedTipo(response.data);
      } else {
        // Creazione
        response = await api.post('/activity-types', formData);
        
        // Aggiorna la lista dei tipi di attività
        setTipiAttivita(prev => [...prev, response.data]);
        
        // Seleziona il nuovo tipo
        setSelectedTipo(response.data);
      }
      
      setIsEditing(false);
    } catch (err) {
      console.error("Errore durante il salvataggio:", err);
      alert("Si è verificato un errore durante il salvataggio. Riprova più tardi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTipo = async (id) => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/activity-types/${id}`);
      
      // Rimuovi il tipo dalla lista
      setTipiAttivita(prev => prev.filter(t => t.id !== id));
      
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
    setSelectedTipo({});
    setIsEditing(true);
    setIsPanelOpen(true);
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title="Tipi di Attività" 
        buttonLabel="Nuovo Tipo" 
        onAddClick={handleCreateNew} 
      />
      <div 
        style={{ 
          transition: 'width 0.3s ease-in-out',
          width: tableWidth,
          overflow: 'hidden'
        }}
      >
        <DataTable 
          data={tipiAttivita}
          columns={[
            { 
              key: 'nome', 
              label: 'Nome'
            },
            { 
              key: 'descrizione', 
              label: 'Descrizione'
            },
            { 
              key: 'durata_predefinita', 
              label: 'Durata (min)'
            },
            { 
              key: 'colore', 
              label: 'Colore',
              render: (item) => (
                <div style={{ 
                  display: 'inline-block',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: item.colore || '#ccc',
                  border: '1px solid #eee'
                }} />
              )
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
              key: 'nome', 
              label: 'Nome',
              filterType: 'text'
            },
            { 
              key: 'durata_predefinita', 
              label: 'Durata',
              filterType: 'range'
            }
          ]}
          onRowClick={handleViewDetails}
          selectedRow={selectedTipo}
          searchPlaceholder="Cerca tipi di attività..."
          emptyMessage="Nessun tipo di attività trovato"
          defaultVisibleColumns={['nome', 'descrizione', 'colore', 'durata_predefinita', 'actions']}
        />
      </div>

      {/* Pannello laterale per i dettagli */}
      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={handleClosePanel} 
        title={isEditing ? "Modifica Tipo Attività" : "Dettagli Tipo Attività"}
      >
        {selectedTipo && (
          <EntityForm
            data={selectedTipo}
            fields={tipoAttivitaFields}
            onSave={handleSaveTipo}
            onDelete={handleDeleteTipo}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            isLoading={isSaving || isDeleting}
          />
        )}
      </SidePanel>
    </div>
  );
}