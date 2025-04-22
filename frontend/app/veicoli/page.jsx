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
import DeadlineList from "../../components/DeadlineList";
import DataTable from "../../components/DataTable";

export default function VeicoliPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [veicoli, setVeicoli] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [selectedVeicolo, setSelectedVeicolo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableWidth, setTableWidth] = useState('100%');
  const [activities, setActivities] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingDeadlines, setLoadingDeadlines] = useState(false);

  // Campi del form veicolo - informazioni generali
  const veicoloFields = [
    { name: 'targa', label: 'Targa', required: true },
    { name: 'marca', label: 'Marca', required: true },
    { name: 'modello', label: 'Modello', required: true },
    { name: 'anno', label: 'Anno', type: 'number' },
    { name: 'carburante', label: 'Carburante', type: 'select', options: [
      { value: 'Benzina', label: 'Benzina' },
      { value: 'Diesel', label: 'Diesel' },
      { value: 'GPL', label: 'GPL' },
      { value: 'Metano', label: 'Metano' },
      { value: 'Elettrico', label: 'Elettrico' },
      { value: 'Ibrido', label: 'Ibrido' }
    ]},
    { name: 'telaio', label: 'Numero Telaio' },
    { name: 'km', label: 'Chilometraggio', type: 'number' },
    { name: 'colore', label: 'Colore' },
    { name: 'tipo', label: 'Tipo Veicolo', type: 'select', options: [
      { value: 'Auto', label: 'Auto' },
      { value: 'Furgone', label: 'Furgone' },
      { value: 'Camion', label: 'Camion' },
      { value: 'Moto', label: 'Moto' },
      { value: 'Altro', label: 'Altro' }
    ]},
    { name: 'note', label: 'Note', type: 'textarea' }
  ];
  
  // Campi per le informazioni amministrative
  const amministrativiFields = [
    { name: 'data_immatricolazione', label: 'Data Immatricolazione', type: 'date' },
    { name: 'data_acquisto', label: 'Data Acquisto', type: 'date' },
    { name: 'valore_acquisto', label: 'Valore Acquisto', type: 'number' },
    { name: 'proprietario', label: 'Proprietario' },
    { name: 'numero_polizza', label: 'Numero Polizza Assicurativa' },
    { name: 'compagnia_assicurativa', label: 'Compagnia Assicurativa' },
    { name: 'scadenza_assicurazione', label: 'Scadenza Assicurazione', type: 'date' },
    { name: 'scadenza_bollo', label: 'Scadenza Bollo', type: 'date' },
    { name: 'scadenza_revisione', label: 'Scadenza Revisione', type: 'date' },
    { name: 'note_amministrative', label: 'Note Amministrative', type: 'textarea' }
  ];
  
  // Campi per le manutenzioni
  const manutenzioniFields = [
    { name: 'ultima_manutenzione', label: 'Data Ultima Manutenzione', type: 'date' },
    { name: 'km_ultima_manutenzione', label: 'KM Ultima Manutenzione', type: 'number' },
    { name: 'tipo_ultima_manutenzione', label: 'Tipo Ultima Manutenzione' },
    { name: 'officina', label: 'Officina di Riferimento' },
    { name: 'telefono_officina', label: 'Telefono Officina' },
    { name: 'prossima_manutenzione', label: 'Data Prossima Manutenzione', type: 'date' },
    { name: 'km_prossima_manutenzione', label: 'KM Prossima Manutenzione', type: 'number' },
    { name: 'note_manutenzioni', label: 'Note Manutenzioni', type: 'textarea' }
  ];

  useEffect(() => {
    if (!loading && user) {
      loadVeicoli();
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

  const loadVeicoli = () => {
    setFetching(true);
    api.get("/vehicles")
      .then(res => setVeicoli(res.data))
      .catch((err) => {
        console.error("Errore nel caricamento dei veicoli:", err);
        if (err.response && err.response.status === 401) {
          setError("Sessione scaduta. Effettua nuovamente il login.");
        } else {
          setError("Errore nel caricamento dei veicoli");
        }
      })
      .finally(() => setFetching(false));
  };

  const handleViewDetails = (veicolo) => {
    setSelectedVeicolo(veicolo);
    setIsEditing(false);
    setIsPanelOpen(true);
    
    // Carica le attività e le scadenze per questo veicolo
    loadActivities(veicolo.id);
    loadDeadlines(veicolo.id);
  };
  
  const loadActivities = async (vehicleId) => {
    if (!vehicleId) return;
    
    setLoadingActivities(true);
    try {
      const response = await api.get(`/vehicles/${vehicleId}/activities`);
      setActivities(response.data);
    } catch (err) {
      console.error("Errore nel caricamento delle attività:", err);
    } finally {
      setLoadingActivities(false);
    }
  };
  
  const loadDeadlines = async (vehicleId) => {
    if (!vehicleId) return;
    
    setLoadingDeadlines(true);
    try {
      const response = await api.get(`/vehicles/${vehicleId}/deadlines`);
      setDeadlines(response.data);
    } catch (err) {
      console.error("Errore nel caricamento delle scadenze:", err);
    } finally {
      setLoadingDeadlines(false);
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    // Reset dello stato dopo che l'animazione di chiusura è completata
    setTimeout(() => {
      setSelectedVeicolo(null);
      setIsEditing(false);
    }, 300);
  };

  const handleSaveVeicolo = async (formData) => {
    setIsSaving(true);
    try {
      let response;
      if (formData.id) {
        // Aggiornamento
        response = await api.put(`/vehicles/${formData.id}`, formData);
        
        // Aggiorna la lista dei veicoli
        setVeicoli(prev => 
          prev.map(v => v.id === formData.id ? response.data : v)
        );
        
        // Aggiorna il veicolo selezionato
        setSelectedVeicolo(response.data);
      } else {
        // Creazione
        response = await api.post('/vehicles', formData);
        
        // Aggiorna la lista dei veicoli
        setVeicoli(prev => [...prev, response.data]);
        
        // Seleziona il nuovo veicolo
        setSelectedVeicolo(response.data);
      }
      
      setIsEditing(false);
    } catch (err) {
      console.error("Errore durante il salvataggio:", err);
      alert("Si è verificato un errore durante il salvataggio. Riprova più tardi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVeicolo = async (id) => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/vehicles/${id}`);
      
      // Rimuovi il veicolo dalla lista
      setVeicoli(prev => prev.filter(v => v.id !== id));
      
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
    setSelectedVeicolo({});
    setIsEditing(true);
    setIsPanelOpen(true);
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title="Veicoli" 
        buttonLabel="Nuovo Veicolo" 
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
          data={veicoli}
          columns={[
            { 
              key: 'targa', 
              label: 'Targa'
            },
            { 
              key: 'marca', 
              label: 'Marca'
            },
            { 
              key: 'modello', 
              label: 'Modello'
            },
            { 
              key: 'anno', 
              label: 'Anno'
            },
            { 
              key: 'tipo', 
              label: 'Tipo'
            },
            { 
              key: 'carburante', 
              label: 'Carburante'
            },
            { 
              key: 'km', 
              label: 'KM'
            },
            { 
              key: 'scadenza_assicurazione', 
              label: 'Scadenza Assicurazione',
              render: (item) => item.scadenza_assicurazione ? new Date(item.scadenza_assicurazione).toLocaleDateString() : '-'
            },
            { 
              key: 'scadenza_bollo', 
              label: 'Scadenza Bollo',
              render: (item) => item.scadenza_bollo ? new Date(item.scadenza_bollo).toLocaleDateString() : '-'
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
              key: 'targa', 
              label: 'Targa',
              filterType: 'text'
            },
            { 
              key: 'marca', 
              label: 'Marca',
              filterType: 'text'
            },
            { 
              key: 'carburante', 
              label: 'Carburante',
              filterType: 'select',
              filterOptions: [
                { value: 'Benzina', label: 'Benzina' },
                { value: 'Diesel', label: 'Diesel' },
                { value: 'GPL', label: 'GPL' },
                { value: 'Metano', label: 'Metano' },
                { value: 'Elettrico', label: 'Elettrico' },
                { value: 'Ibrido', label: 'Ibrido' }
              ]
            },
            { 
              key: 'tipo', 
              label: 'Tipo',
              filterType: 'select',
              filterOptions: [
                { value: 'Auto', label: 'Auto' },
                { value: 'Furgone', label: 'Furgone' },
                { value: 'Camion', label: 'Camion' },
                { value: 'Moto', label: 'Moto' },
                { value: 'Altro', label: 'Altro' }
              ]
            }
          ]}
          onRowClick={handleViewDetails}
          selectedRow={selectedVeicolo}
          searchPlaceholder="Cerca veicoli..."
          emptyMessage="Nessun veicolo trovato"
          defaultVisibleColumns={['targa', 'marca', 'modello', 'anno', 'carburante', 'actions']}
        />
      </div>

      {/* Pannello laterale per i dettagli */}
      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={handleClosePanel} 
        title={isEditing ? "Modifica Veicolo" : "Dettagli Veicolo"}
      >
        {selectedVeicolo && (
          <TabPanel 
            tabs={[
              {
                id: 'details',
                label: 'Generale',
                content: (
                  <EntityForm
                    data={selectedVeicolo}
                    fields={veicoloFields}
                    onSave={handleSaveVeicolo}
                    onDelete={handleDeleteVeicolo}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    isLoading={isSaving || isDeleting}
                  />
                )
              },
              {
                id: 'amministrativi',
                label: 'Amministrazione',
                content: (
                  <EntityForm
                    data={selectedVeicolo}
                    fields={amministrativiFields}
                    onSave={handleSaveVeicolo}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    isLoading={isSaving}
                  />
                )
              },
              {
                id: 'manutenzioni',
                label: 'Manutenzioni',
                content: (
                  <EntityForm
                    data={selectedVeicolo}
                    fields={manutenzioniFields}
                    onSave={handleSaveVeicolo}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    isLoading={isSaving}
                  />
                )
              },
              {
                id: 'deadlines',
                label: 'Scadenze',
                count: deadlines.length,
                content: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ margin: 0 }}>Scadenze del veicolo</h3>
                      <button
                        onClick={() => router.push(`/scadenze/new?vehicle_id=${selectedVeicolo.id}`)}
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
                        Nuova Scadenza
                      </button>
                    </div>
                    
                    {loadingDeadlines ? (
                      <div>Caricamento scadenze...</div>
                    ) : (
                      <DeadlineList 
                        deadlines={deadlines} 
                        onDeadlineClick={(deadline) => router.push(`/scadenze/${deadline.id}`)}
                      />
                    )}
                  </div>
                )
              },
              {
                id: 'activities',
                label: 'Attività',
                count: activities.length,
                content: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ margin: 0 }}>Attività del veicolo</h3>
                      <button
                        onClick={() => router.push(`/attivita/new?vehicle_id=${selectedVeicolo.id}`)}
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
                        vehicleId={selectedVeicolo.id} 
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