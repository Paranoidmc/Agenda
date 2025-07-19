"use client";
import { useEffect, useState, useMemo, Suspense } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import SidePanel from "../../components/SidePanel";
import ResourcePairing from "../../components/ResourcePairing";
import EntityForm from "../../components/EntityForm";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import { useRouter, useSearchParams } from "next/navigation";
import AddFacilityPopup from "../../components/AddFacilityPopup";
import dynamic from 'next/dynamic';
import { useVehicleTracking } from "../../hooks/useVehicleTracking";
import "../../styles/map.css";

// Importa VehicleMap solo lato client per evitare errori SSR
const VehicleMap = dynamic(() => import("../../components/VehicleMap"), {
  ssr: false,
  loading: () => (
    <div style={{ 
      height: '350px', 
      backgroundColor: '#f5f5f5', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      border: '1px solid #e5e5ea',
      borderRadius: '8px'
    }}>
      <div style={{ textAlign: 'center', color: '#666' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🗺️</div>
        <div>Caricamento mappa...</div>
      </div>
    </div>
  )
});

function AttivitaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get('open');
  const isNew = searchParams.get('new') === '1';
  const { user, loading } = useAuth();
  const [attivita, setAttivita] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [selectedAttivita, setSelectedAttivita] = useState(null);
  const [isEditing, setIsEditingState] = useState(false);
  
  const setIsEditing = (value) => {
    setIsEditingState(value);
  };
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableWidth, setTableWidth] = useState('100%');
  const [clienti, setClienti] = useState([]);
  const [veicoli, setVeicoli] = useState([]);
  const [autisti, setAutisti] = useState([]);
  const [tipiAttivita, setTipiAttivita] = useState([]);
  const [sediPerCliente, setSediPerCliente] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);

  const isEditMode = selectedAttivita && selectedAttivita.id;
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  // Estrai i veicoli dall'attività selezionata per il tracking
  const activityVehicles = useMemo(() => {
    // Usa le risorse originali per la mappa, non quelle trasformate per il form
    const resources = selectedAttivita?.originalResources || selectedAttivita?.resources;
    
    if (!resources) {
      return [];
    }
    
    
    // Debug dettagliato delle risorse
    resources.forEach((resource, index) => {
    });
    
    const vehicles = resources
      .map(resource => {
        return resource.vehicle;
      })
      .filter(Boolean)
      .map(vehicle => ({
        ...vehicle,
        driver: resources.find(r => r.vehicle?.id === vehicle.id)?.driver
      }));
      
    return vehicles;
  }, [selectedAttivita?.originalResources, selectedAttivita?.resources]);

  // Hook per il tracking dei veicoli
  const { 
    vehiclePositions, 
    isTracking, 
    lastUpdate, 
    refreshPositions 
  } = useVehicleTracking(selectedAttivita?.id, activityVehicles);

  useEffect(() => {
    if (isNew) {
      handleCreateNew();
    } else if (openId) {
      const found = attivita.find(a => String(a.id) === String(openId));
      if (found) {
        handleViewDetails(found);
      } else {
        api.get(`/activities/${openId}`).then(res => handleViewDetails(res.data)).catch(handleClosePanel);
      }
    } else {
      handleClosePanel();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, isNew, attivita]);

  const handleSedeAdded = (newSede) => {
    setIsPopupOpen(false);
    const clienteId = selectedAttivita?.client_id;
    if (!clienteId) return;
    
    // Aggiorna immediatamente la lista delle sedi con la nuova sede
    const newSedeFormatted = {
      id: newSede.id,
      nome: newSede.name || newSede.nome,
      name: newSede.name || newSede.nome,
      indirizzo: newSede.address || newSede.indirizzo,
      citta: newSede.city || newSede.citta,
      cap: newSede.postal_code || newSede.cap,
      provincia: newSede.province || newSede.provincia,
      note: newSede.notes || newSede.note
    };
    
    
    setSediPerCliente(prev => {
      const updated = {
        ...prev,
        [String(clienteId)]: [...(prev[String(clienteId)] || []), newSedeFormatted]
      };
      return updated;
    });
    
    // Seleziona automaticamente la nuova sede
    setSelectedAttivita(prev => {
      const updated = { ...prev, site_id: newSede.id };
      return updated;
    });
    
    // Ricarica anche dal server per sicurezza
    loadSediPerCliente(clienteId);
  };

  const handleFormChange = (updatedData) => {
    const oldClientId = selectedAttivita?.client_id;
    // Preserva l'ID originale quando aggiorniamo i dati del form
    const dataWithId = { ...updatedData };
    if (selectedAttivita?.id && !dataWithId.id) {
      dataWithId.id = selectedAttivita.id;
    }
    setSelectedAttivita(dataWithId);

    if (dataWithId.client_id !== oldClientId) {
      if (dataWithId.client_id) {
        loadSediPerCliente(dataWithId.client_id);
        // Resetta la selezione della sede quando il cliente cambia
        setSelectedAttivita(prev => ({ ...prev, site_id: '' }));
      } else {
        // Pulisci le sedi se il cliente viene deselezionato
        setSediPerCliente(prev => ({ ...prev, [String(oldClientId)]: [] }));
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/D';
    const d = new Date(dateString);
    return d.toLocaleString('it-IT', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '');
  };

  const toInputDatetimeLocal = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getAttivitaFields = (currentFormData) => {
    if (isInitialLoading) return [];

    const selectedClientId = currentFormData?.client_id;
    const sediOptions = (sediPerCliente[String(selectedClientId)] || []).map(s => ({ value: s.id, label: s.nome || s.name || '' }));

    return [
      { name: 'descrizione', label: 'Descrizione', type: 'textarea' },
      { name: 'data_inizio', label: 'Data/Ora Inizio', type: 'datetime-local', required: true },
      { name: 'data_fine', label: 'Data/Ora Fine', type: 'datetime-local' },
      { name: 'client_id', label: 'Cliente', type: 'select', isNumeric: true, required: true, options: clienti.map(c => ({ value: c.id, label: c.nome || c.name || '' })), placeholder: 'Seleziona Cliente' },
      { name: 'site_id', label: <>Sede {extraBelowSite}</>, type: 'select', isNumeric: true, required: true, options: sediOptions, disabled: !selectedClientId, placeholder: selectedClientId ? 'Seleziona Sede' : 'Prima seleziona un cliente' },
      { name: 'resources', label: 'Risorse abbinate', type: 'custom', render: (formData, handleChange) => <ResourcePairing value={formData.resources || []} onChange={(newValue) => handleChange({ target: { name: 'resources', value: newValue }})} drivers={autisti} vehicles={veicoli} />, required: true },
      { name: 'activity_type_id', label: 'Tipo Attività', type: 'select', isNumeric: true, required: true, options: tipiAttivita.map(t => ({ value: t.id, label: t.nome || t.name || '' })), placeholder: 'Seleziona Tipo Attività' },
      { name: 'status', label: 'Stato', type: 'select', required: true, options: [{ value: 'non assegnato', label: 'Non assegnato' }, { value: 'assegnato', label: 'Assegnato' }, { value: 'doc emesso', label: 'Doc emesso' }, { value: 'programmato', label: 'Programmato' }, { value: 'in corso', label: 'In corso' }, { value: 'completato', label: 'Completato' }, { value: 'annullato', label: 'Annullato' }], placeholder: 'Seleziona Stato' },
      { name: 'note', label: 'Note', type: 'textarea' },
    ];
  };

  const extraBelowSite = (
    <button type="button" onClick={() => setIsPopupOpen(true)} disabled={!selectedAttivita?.client_id} className="btn-add-facility" style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '12px' }}>
      Aggiungi
    </button>
  );

  // Effetto per caricare i dati della tabella (attività) che dipendono dalla paginazione e ricerca
  useEffect(() => {
    const fetchActivities = async () => {
      if (loading || !user) return;
      setFetching(true);
      try {
        const activitiesParams = { page: currentPage, per_page: perPage, search: searchTerm };
        const activitiesRes = await api.get('/activities', { params: activitiesParams });
        const attivitaData = Array.isArray(activitiesRes.data.data) ? activitiesRes.data.data : [];
        setAttivita(attivitaData);
        setTotal(activitiesRes.data.total || activitiesRes.data.meta?.total || 0);
      } catch (err) {
        console.error("Errore nel caricamento delle attività", err);
        setError("Impossibile caricare la lista delle attività.");
      } finally {
        setFetching(false);
      }
    };

    if (!isInitialLoading) { // Esegui solo dopo che i dati iniziali del form sono stati caricati
        fetchActivities();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, currentPage, perPage, searchTerm, isInitialLoading, dataVersion]);

  // Effetto per caricare i dati di supporto per il form (clienti, tipi, etc.) UNA SOLA VOLTA
  useEffect(() => {
    const fetchFormData = async () => {
      if (loading || !user) return;
      setIsInitialLoading(true);
      try {
        const params = { perPage: 9999 };
        const [clientsRes, typesRes, driversRes, vehiclesRes] = await Promise.all([
          api.get('/clients', { params }),
          api.get('/activity-types', { params }),
          api.get('/drivers', { params }),
          api.get('/vehicles', { params })
        ]);

        setClienti(Array.isArray(clientsRes.data.data) ? clientsRes.data.data : []);
        setTipiAttivita(Array.isArray(typesRes.data.data) ? typesRes.data.data : []);
        setAutisti(Array.isArray(driversRes.data.data) ? driversRes.data.data : []);
        setVeicoli(Array.isArray(vehiclesRes.data.data) ? vehiclesRes.data.data : []);

      } catch (err) {
        console.error("Errore nel caricamento dei dati del form", err);
        setError("Impossibile caricare i dati necessari per il form.");
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchFormData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    setTableWidth(isPanelOpen ? '60%' : '100%');
  }, [isPanelOpen]);

  useEffect(() => {
    if (selectedAttivita?.client_id) {
      loadSediPerCliente(selectedAttivita.client_id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAttivita?.client_id]);

  const loadSediPerCliente = (clientId) => {
    if (!clientId) {
       setSediPerCliente(prev => ({ ...prev, [String(selectedAttivita.client_id)]: [] }));
       return Promise.resolve();
    }
    return api.get(`/clients/${clientId}/sites`)
      .then(res => {
        setSediPerCliente(prev => ({ ...prev, [String(clientId)]: res.data.data || [] }));
      })
      .catch(() => {
        setSediPerCliente(prev => ({ ...prev, [String(clientId)]: [] }));
      });
  };

  const handleViewDetails = (item) => {
    const newItem = JSON.parse(JSON.stringify(item)); // Deep copy

    // Preserva le risorse originali per la mappa
    newItem.originalResources = newItem.resources;

    if (newItem.resources && Array.isArray(newItem.resources)) {
      const resourcesByVehicle = newItem.resources.reduce((acc, resource) => {
        if (!resource.vehicle) return acc;
        const vehicleId = resource.vehicle.id;
        if (!acc[vehicleId]) {
          acc[vehicleId] = {
            vehicle_id: String(vehicleId),
            driver_ids: [],
          };
        }
        if (resource.driver) {
          acc[vehicleId].driver_ids.push(String(resource.driver.id));
        }
        return acc;
      }, {});
      newItem.resources = Object.values(resourcesByVehicle);
    }

    if (!newItem.status && newItem.stato) {
      newItem.status = String(newItem.stato).toLowerCase().replace(/_/g, ' ');
    } else if (newItem.status) {
      const statusReverseMap = { 'planned': 'programmato', 'in_progress': 'in corso', 'completed': 'completato', 'cancelled': 'annullato', 'doc_issued': 'doc emesso', 'assigned': 'assegnato', 'unassigned': 'non assegnato' };
      newItem.status = statusReverseMap[newItem.status] || newItem.status.replace(/_/g, ' ');
    }
    setSelectedAttivita(newItem);
    setIsPanelOpen(true);
    setIsEditingState(false);
    setValidationErrors({});
    if (newItem.client_id) loadSediPerCliente(newItem.client_id);
    router.push(`/attivita?open=${item.id}`, { scroll: false });
  };

  const handleClosePanel = () => {
    router.push('/attivita', { scroll: false });
    setIsPanelOpen(false);
    setSelectedAttivita(null);
  };

  const handleCreateNew = () => {
    const now = new Date();
    const dataInizio = toInputDatetimeLocal(now.toISOString());
    setSelectedAttivita({ data_inizio: dataInizio, data_fine: dataInizio, status: 'non assegnato', resources: [] });
    setIsEditing(true);
    setIsPanelOpen(true);
    setValidationErrors({});
    router.push('/attivita?new=1', { scroll: false });
  };

  const handleSaveAttivita = async (formData) => {
    setIsSaving(true);
    setValidationErrors({});
    const dataToSave = { ...formData };

    if (dataToSave.resources) {
      const flattenedResources = dataToSave.resources.flatMap(pair => 
        (pair.driver_ids && pair.driver_ids.length > 0) ? pair.driver_ids.map(driverId => ({
          vehicle_id: pair.vehicle_id,
          driver_id: driverId
        })) : (pair.vehicle_id ? [{ vehicle_id: pair.vehicle_id, driver_id: null }] : [])
      );
      dataToSave.resources = flattenedResources.filter(r => r.vehicle_id);
    }

    const statusMap = { 'programmato': 'planned', 'in corso': 'in_progress', 'completato': 'completed', 'annullato': 'cancelled', 'doc emesso': 'doc_issued', 'assegnato': 'assigned', 'non assegnato': 'unassigned' };
    dataToSave.status = statusMap[dataToSave.status] || 'planned';
    delete dataToSave.stato;


    try {
      const response = isEditMode ? await api.put(`/activities/${selectedAttivita.id}`, dataToSave) : await api.post('/activities', dataToSave);
      setDataVersion(v => v + 1); // Trigger re-fetch
      handleClosePanel();
      setIsEditing(false);
    } catch (err) {
      console.error('Errore nel salvataggio:', err);
      if (err.response && err.response.data && err.response.data.errors) {
        setValidationErrors(err.response.data.errors);
      } else {
        setError('Si è verificato un errore durante il salvataggio.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAttivita = async (id) => {
    setIsDeleting(true);
    try {
      await api.delete(`/activities/${id}`);
      setDataVersion(v => v + 1); // Trigger re-fetch
      handleClosePanel();
    } catch (err) {
      console.error('Errore nell\'eliminazione:', err);
      setError('Impossibile eliminare l\'attività.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (stato) => {
    const colors = { 'non assegnato': '#3b82f6', 'assegnato': '#eab308', 'doc emesso': '#ef4444', 'programmato': '#8b5cf6', 'programmata': '#8b5cf6', 'in corso': '#f97316', 'completato': '#22c55e', 'completata': '#22c55e', 'annullato': '#ec4899', 'annullata': '#ec4899' };
    return colors[String(stato)?.toLowerCase()] || '#6b7280';
  };

  const columns = useMemo(() => [
    { key: 'client.nome', label: 'Cliente', render: (item) => item.client?.nome || 'N/D' },
    { key: 'site.nome', label: 'Sede', render: (item) => item.site?.nome || 'N/D' },
    { key: 'orario', label: 'Orario', render: (item) => <span>{formatDate(item.data_inizio)}{item.data_fine && item.data_fine !== item.data_inizio ? ' → ' + formatDate(item.data_fine) : ''}</span> },
    { key: 'resources', label: 'Risorse', render: (item) => {
        if (!item.resources || item.resources.length === 0) return 'N/D';
        
        const resourcesByVehicle = item.resources.reduce((acc, resource) => {
          if (!resource.vehicle) return acc;
          const vehicleKey = `${resource.vehicle.targa || resource.vehicle.modello || resource.vehicle.marca || 'Veicolo'}`;
          if (!acc[vehicleKey]) {
            acc[vehicleKey] = [];
          }
          if (resource.driver) {
            acc[vehicleKey].push(`${resource.driver.nome} ${resource.driver.cognome}`);
          }
          return acc;
        }, {});

        return (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {Object.entries(resourcesByVehicle).map(([vehicle, drivers], index) => (
              <li key={index}>
                <strong>{vehicle}:</strong> {drivers.join(', ') || 'Nessun autista'}
              </li>
            ))}
          </ul>
        );
      }
    },
    { key: 'activityType', label: 'Tipologia', render: (item) => {
        const tipo = item.activityType || tipiAttivita.find(t => t.id === item.activity_type_id);
        if (!tipo) return 'N/D';
        return <span className='badge' style={{ backgroundColor: tipo.color || tipo.colore || 'grey' }}>{tipo.name || tipo.nome}</span>;
      }
    },
    { key: 'status', label: 'Stato', render: (item) => <span className='badge' style={{ backgroundColor: getStatusColor(item.status || item.stato) }}>{(item.status || item.stato || 'N/D').replace(/_/g, ' ')}</span> },
    { key: 'actions', label: 'Azioni', render: (item) => <button data-id={item.id} className='btn-secondary btn-details'>Dettagli</button> }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [tipiAttivita]);

  useEffect(() => {
    const clickHandler = (e) => {
      if (e.target.matches('.btn-details')) {
        const id = e.target.dataset.id;
        const item = attivita.find(a => String(a.id) === id);
        if (item) handleViewDetails(item);
      }
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [attivita]);

  if (loading) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;

  return (
    <div style={{ padding: 32 }}>
      <PageHeader 
        title="Attività" 
        buttonLabel={canEdit ? "Nuova Attività" : ""}
        onAddClick={canEdit ? handleCreateNew : null} 
      />
      <div style={{ transition: 'width 0.3s ease-in-out', width: tableWidth, overflow: 'hidden' }}>
        {isPopupOpen && selectedAttivita?.client_id && <AddFacilityPopup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} onFacilityAdded={handleSedeAdded} entityData={{client_id: selectedAttivita.client_id, client_name: clienti.find(c => c.id === selectedAttivita.client_id)?.nome || clienti.find(c => c.id === selectedAttivita.client_id)?.name || ''}} clienti={clienti} />}
        <DataTable
          data={Array.isArray(attivita) ? attivita : []}
          columns={columns}
          onRowClick={handleViewDetails}
          pagination={{ total, currentPage, perPage, onPageChange: setCurrentPage, onPerPageChange: setPerPage }}
          search={{ value: searchTerm, onSearch: setSearchTerm }}
          isStriped={true}
          isHoverable={true}
          isLoading={fetching}
        />
      </div>
      {isPanelOpen && selectedAttivita && (
        <SidePanel isOpen={isPanelOpen} onClose={handleClosePanel} title={isNew ? 'Nuova Attività' : (isEditing ? 'Modifica Attività' : 'Dettagli Attività')}>
          <EntityForm
            fields={getAttivitaFields(selectedAttivita)}
            data={selectedAttivita}
            onFormChange={handleFormChange}
            onSave={canEdit ? handleSaveAttivita : undefined}
            onDelete={canEdit ? () => handleDeleteAttivita(selectedAttivita.id) : undefined}
            onEdit={canEdit ? () => setIsEditing(true) : undefined}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            isSaving={isSaving}
            isDeleting={isDeleting}
            validationErrors={validationErrors}
          />
          
          {/* Mappa dei veicoli */}
          {(() => {
            return selectedAttivita && activityVehicles.length > 0;
          })() && (
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e5ea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#333' }}>
                  Posizione Veicoli
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isTracking && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#666' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        backgroundColor: '#22c55e', 
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite'
                      }}></div>
                      Tracking attivo
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={refreshPositions}
                    style={{
                      padding: '6px 12px',
                      fontSize: '14px',
                      border: '1px solid #e5e5ea',
                      borderRadius: '6px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    🔄 Aggiorna
                  </button>
                </div>
              </div>
              
              {lastUpdate && (
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                  Ultimo aggiornamento: {lastUpdate.toLocaleTimeString('it-IT')}
                </div>
              )}
              
              <VehicleMap
                vehicles={vehiclePositions}
                height="350px"
                onVehicleClick={(vehicle) => {
                }}
              />
              
              {vehiclePositions.length === 0 && (
                <div style={{
                  height: '350px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f9f9f9',
                  border: '1px solid #e5e5ea',
                  borderRadius: '8px',
                  color: '#666',
                  textAlign: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📍</div>
                    <div>Nessuna posizione disponibile</div>
                    <div style={{ fontSize: '14px', marginTop: '4px' }}>
                      I veicoli appariranno qui quando saranno disponibili i dati GPS
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </SidePanel>
      )}
    </div>
  );
}

export default function AttivitaPage() {
  return (
    <Suspense fallback={<div className="centered">Caricamento attività...</div>}>
      <AttivitaContent />
    </Suspense>
  );
}
