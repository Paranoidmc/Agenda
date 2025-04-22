"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import SidePanel from "../../components/SidePanel";
import EntityForm from "../../components/EntityForm";
import PageHeader from "../../components/PageHeader";
import TabPanel from "../../components/TabPanel";
import ActivityList from "../../components/ActivityList";
import DataTable from "../../components/DataTable";

export default function AutistiPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [autisti, setAutisti] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [selectedAutista, setSelectedAutista] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableWidth, setTableWidth] = useState('100%');
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Campi del form autista - informazioni personali
  const autistaFields = [
    { name: 'nome', label: 'Nome', required: true },
    { name: 'cognome', label: 'Cognome', required: true },
    { name: 'telefono', label: 'Telefono' },
    { name: 'email', label: 'Email' },
    { name: 'codice_fiscale', label: 'Codice Fiscale' },
    { name: 'data_nascita', label: 'Data di Nascita', type: 'date' },
    { name: 'indirizzo', label: 'Indirizzo' },
    { name: 'citta', label: 'Città' },
    { name: 'cap', label: 'CAP' },
    { name: 'provincia', label: 'Provincia' },
    { name: 'note', label: 'Note', type: 'textarea' }
  ];
  
  // Campi per la patente e informazioni lavorative
  const patenteFields = [
    { name: 'patente', label: 'Tipo Patente', type: 'select', options: [
      { value: 'B', label: 'B' },
      { value: 'C', label: 'C' },
      { value: 'D', label: 'D' },
      { value: 'CE', label: 'CE' },
      { value: 'DE', label: 'DE' },
    ]},
    { name: 'numero_patente', label: 'Numero Patente' },
    { name: 'scadenza_patente', label: 'Scadenza Patente', type: 'date' },
    { name: 'data_assunzione', label: 'Data Assunzione', type: 'date' },
    { name: 'tipo_contratto', label: 'Tipo Contratto', type: 'select', options: [
      { value: 'indeterminato', label: 'Tempo Indeterminato' },
      { value: 'determinato', label: 'Tempo Determinato' },
      { value: 'partita_iva', label: 'Partita IVA' },
      { value: 'occasionale', label: 'Occasionale' },
    ]},
    { name: 'scadenza_contratto', label: 'Scadenza Contratto', type: 'date' },
    { name: 'note_patente', label: 'Note Patente', type: 'textarea' }
  ];

  useEffect(() => {
    if (!loading && user) {
      loadAutisti();
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

  const loadAutisti = () => {
    setFetching(true);
    api.get("/drivers")
      .then(res => setAutisti(res.data))
      .catch((err) => {
        console.error("Errore nel caricamento degli autisti:", err);
        if (err.response && err.response.status === 401) {
          setError("Sessione scaduta. Effettua nuovamente il login.");
        } else {
          setError("Errore nel caricamento degli autisti");
        }
      })
      .finally(() => setFetching(false));
  };

  const handleViewDetails = (autista) => {
    setSelectedAutista(autista);
    setIsEditing(false);
    setIsPanelOpen(true);
    
    // Carica le attività per questo autista
    loadActivities(autista.id);
  };
  
  const loadActivities = async (driverId) => {
    if (!driverId) return;
    
    setLoadingActivities(true);
    try {
      const response = await api.get(`/drivers/${driverId}/activities`);
      setActivities(response.data);
    } catch (err) {
      console.error("Errore nel caricamento delle attività:", err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    // Reset dello stato dopo che l'animazione di chiusura è completata
    setTimeout(() => {
      setSelectedAutista(null);
      setIsEditing(false);
    }, 300);
  };

  const handleSaveAutista = async (formData) => {
    setIsSaving(true);
    try {
      let response;
      if (formData.id) {
        // Aggiornamento
        response = await api.put(`/drivers/${formData.id}`, formData);
        
        // Aggiorna la lista degli autisti
        setAutisti(prev => 
          prev.map(a => a.id === formData.id ? response.data : a)
        );
        
        // Aggiorna l'autista selezionato
        setSelectedAutista(response.data);
      } else {
        // Creazione
        response = await api.post('/drivers', formData);
        
        // Aggiorna la lista degli autisti
        setAutisti(prev => [...prev, response.data]);
        
        // Seleziona il nuovo autista
        setSelectedAutista(response.data);
      }
      
      setIsEditing(false);
    } catch (err) {
      console.error("Errore durante il salvataggio:", err);
      alert("Si è verificato un errore durante il salvataggio. Riprova più tardi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAutista = async (id) => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/drivers/${id}`);
      
      // Rimuovi l'autista dalla lista
      setAutisti(prev => prev.filter(a => a.id !== id));
      
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
    setSelectedAutista({});
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

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title="Autisti" 
        buttonLabel="Nuovo Autista" 
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
          data={autisti}
          columns={[
            { 
              key: 'nome', 
              label: 'Nome'
            },
            { 
              key: 'cognome', 
              label: 'Cognome'
            },
            { 
              key: 'telefono', 
              label: 'Telefono'
            },
            { 
              key: 'email', 
              label: 'Email'
            },
            { 
              key: 'patente', 
              label: 'Patente'
            },
            { 
              key: 'scadenza_patente', 
              label: 'Scadenza Patente',
              render: (item) => formatDate(item.scadenza_patente)
            },
            { 
              key: 'tipo_contratto', 
              label: 'Tipo Contratto',
              render: (item) => {
                const tipiContratto = {
                  'indeterminato': 'Tempo Indeterminato',
                  'determinato': 'Tempo Determinato',
                  'partita_iva': 'Partita IVA',
                  'occasionale': 'Occasionale'
                };
                return tipiContratto[item.tipo_contratto] || item.tipo_contratto || 'N/D';
              }
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
              key: 'cognome', 
              label: 'Cognome',
              filterType: 'text'
            },
            { 
              key: 'patente', 
              label: 'Patente',
              filterType: 'select',
              filterOptions: [
                { value: 'B', label: 'B' },
                { value: 'C', label: 'C' },
                { value: 'D', label: 'D' },
                { value: 'CE', label: 'CE' },
                { value: 'DE', label: 'DE' }
              ]
            },
            { 
              key: 'tipo_contratto', 
              label: 'Tipo Contratto',
              filterType: 'select',
              filterOptions: [
                { value: 'indeterminato', label: 'Tempo Indeterminato' },
                { value: 'determinato', label: 'Tempo Determinato' },
                { value: 'partita_iva', label: 'Partita IVA' },
                { value: 'occasionale', label: 'Occasionale' }
              ]
            }
          ]}
          onRowClick={handleViewDetails}
          selectedRow={selectedAutista}
          searchPlaceholder="Cerca autisti..."
          emptyMessage="Nessun autista trovato"
          defaultVisibleColumns={['nome', 'cognome', 'telefono', 'patente', 'scadenza_patente', 'actions']}
        />
      </div>

      {/* Pannello laterale per i dettagli */}
      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={handleClosePanel} 
        title={isEditing ? "Modifica Autista" : "Dettagli Autista"}
      >
        {selectedAutista && (
          <TabPanel 
            tabs={[
              {
                id: 'details',
                label: 'Anagrafica',
                content: (
                  <EntityForm
                    data={selectedAutista}
                    fields={autistaFields}
                    onSave={handleSaveAutista}
                    onDelete={handleDeleteAutista}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    isLoading={isSaving || isDeleting}
                  />
                )
              },
              {
                id: 'patente',
                label: 'Patente e Lavoro',
                content: (
                  <EntityForm
                    data={selectedAutista}
                    fields={patenteFields}
                    onSave={handleSaveAutista}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    isLoading={isSaving}
                  />
                )
              },
              {
                id: 'activities',
                label: 'Attività',
                count: activities.length,
                content: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ margin: 0 }}>Attività dell'autista</h3>
                      <button
                        onClick={() => router.push(`/attivita/new?driver_id=${selectedAutista.id}`)}
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
                        Nuova Attività
                      </button>
                    </div>
                    
                    {loadingActivities ? (
                      <div>Caricamento attività...</div>
                    ) : (
                      <ActivityList 
                        driverId={selectedAutista.id} 
                        onActivityClick={(activity) => router.push(`/attivita/${activity.id}`)}
                      />
                    )}
                  </div>
                )
              }
            ]}
            defaultTab="details"
          />
        )}
      </SidePanel>
    </div>
  );
}