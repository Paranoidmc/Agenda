"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import FilterBar from "../../components/FilterBar";

export default function VeicoliPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [veicoli, setVeicoli] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [selectedVeicolo, setSelectedVeicolo] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [filters, setFilters] = useState({});

  const canEdit = user?.role === 'admin';

  // Stato per valori dropdown
  const [brandOptions, setBrandOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [yearOptions, setYearOptions] = useState([]);

  // Carica valori unici per dropdown
  useEffect(() => {
    if (!loading && user) {
      // Carica marche
      api.get('/vehicles/filter-values', { params: { field: 'brand' } })
        .then(res => {
          if (res.data?.data) {
            setBrandOptions(res.data.data.map(v => ({ value: v, label: v })));
          }
        })
        .catch(err => console.error('Errore caricamento marche:', err));
      
      // Carica modelli
      api.get('/vehicles/filter-values', { params: { field: 'model' } })
        .then(res => {
          if (res.data?.data) {
            setModelOptions(res.data.data.map(v => ({ value: v, label: v })));
          }
        })
        .catch(err => console.error('Errore caricamento modelli:', err));
      
      // Carica anni
      api.get('/vehicles/filter-values', { params: { field: 'year' } })
        .then(res => {
          if (res.data?.data) {
            setYearOptions(res.data.data.sort((a, b) => b - a).map(v => ({ value: v, label: v })));
          }
        })
        .catch(err => console.error('Errore caricamento anni:', err));
    }
  }, [user, loading]);

  // Configurazione filtri per veicoli
  const filterConfig = [
    { key: 'plate', label: 'Targa', type: 'text', placeholder: 'Cerca per targa' },
    { key: 'brand', label: 'Marca', type: brandOptions.length > 0 ? 'select' : 'text', options: brandOptions, placeholder: 'Cerca per marca' },
    { key: 'model', label: 'Modello', type: modelOptions.length > 0 ? 'select' : 'text', options: modelOptions, placeholder: 'Cerca per modello' },
    { key: 'year', label: 'Anno', type: yearOptions.length > 0 ? 'select' : 'text', options: yearOptions, placeholder: 'Cerca per anno' },
    { key: 'type', label: 'Tipo Veicolo', type: 'select', options: [
      { value: 'Auto', label: 'Auto' },
      { value: 'Furgone', label: 'Furgone' },
      { value: 'Camion', label: 'Camion' },
      { value: 'Moto', label: 'Moto' },
      { value: 'Altro', label: 'Altro' }
    ]},
    { key: 'fuel_type', label: 'Carburante', type: 'select', options: [
      { value: 'Benzina', label: 'Benzina' },
      { value: 'Diesel', label: 'Diesel' },
      { value: 'GPL', label: 'GPL' },
      { value: 'Metano', label: 'Metano' },
      { value: 'Elettrico', label: 'Elettrico' },
      { value: 'Ibrido', label: 'Ibrido' }
    ]},
    { key: 'status', label: 'Stato', type: 'select', options: [
      { value: 'operational', label: 'Operativo' },
      { value: 'maintenance', label: 'In manutenzione' },
      { value: 'decommissioned', label: 'Disattivato' }
    ]},
  ];

  // Campi del form veicolo - allineati alla migration e al model
  const veicoloFields = [
    { name: 'plate', label: 'Targa', required: true },
    { name: 'imei', label: 'IMEI dispositivo MOMAP', placeholder: 'Inserisci IMEI (opzionale)' },
    { name: 'nome', label: 'Nome veicolo' }, // Modificato da 'name' a 'nome'
    { name: 'brand', label: 'Marca', required: true },
    { name: 'model', label: 'Modello', required: true },
    { name: 'year', label: 'Anno', type: 'number' },
    { name: 'type', label: 'Tipo Veicolo', type: 'select', options: [
      { value: 'Auto', label: 'Auto' },
      { value: 'Furgone', label: 'Furgone' },
      { value: 'Camion', label: 'Camion' },
      { value: 'Moto', label: 'Moto' },
      { value: 'Altro', label: 'Altro' }
    ]},
    { name: 'fuel_type', label: 'Carburante', type: 'select', options: [
      { value: 'Benzina', label: 'Benzina' },
      { value: 'Diesel', label: 'Diesel' },
      { value: 'GPL', label: 'GPL' },
      { value: 'Metano', label: 'Metano' },
      { value: 'Elettrico', label: 'Elettrico' },
      { value: 'Ibrido', label: 'Ibrido' }
    ]},
    { name: 'color', label: 'Colore' },
    { name: 'odometer', label: 'Chilometraggio', type: 'number' },
    { name: 'engine_hours', label: 'Ore motore', type: 'number' },
    { name: 'max_load', label: 'Portata max', type: 'number' },
    { name: 'chassis_number', label: 'Numero telaio' },
    { name: 'vin_code', label: 'VIN' },
    { name: 'engine_capacity', label: 'Cilindrata' },
    { name: 'engine_code', label: 'Codice motore' },
    { name: 'engine_serial_number', label: 'Matricola motore' },
    { name: 'fiscal_horsepower', label: 'Cavalli fiscali' },
    { name: 'power_kw', label: 'Potenza kW', type: 'number' },
    { name: 'registration_number', label: 'Numero immatricolazione' },
    { name: 'euro_classification', label: 'Classe Euro' },
    { name: 'gruppi', label: 'Gruppi' }, // Modificato da 'groups' a 'gruppi'
    { name: 'autista_assegnato', label: 'Autista assegnato' }, // Modificato da 'assigned_driver' a 'autista_assegnato'
    { name: 'first_registration_date', label: 'Data prima immatricolazione', type: 'date' },
    { name: 'ownership', label: 'Proprietà' },
    { name: 'current_profitability', label: 'Redditività attuale' },
    { name: 'contract_holder', label: 'Intestatario contratto' },
    { name: 'ownership_type', label: 'Tipo proprietà' },
    { name: 'rental_type', label: 'Tipo noleggio' },
    { name: 'advance_paid', label: 'Anticipo pagato', type: 'number' },
    { name: 'final_installment', label: 'Maxi rata', type: 'number' },
    { name: 'monthly_fee', label: 'Canone mensile', type: 'number' },
    { name: 'contract_start_date', label: 'Inizio contratto', type: 'date' },
    { name: 'contract_end_date', label: 'Fine contratto', type: 'date' },
    { name: 'monthly_alert', label: 'Allerta mensile' },
    { name: 'end_alert', label: 'Allerta fine' },
    { name: 'installment_payment_day', label: 'Giorno rata' },
    { name: 'supplier', label: 'Fornitore' },
    { name: 'collection_date', label: 'Data ritiro', type: 'date' },
    { name: 'contract_duration_months', label: 'Durata contratto (mesi)', type: 'number' },
    { name: 'contract_kilometers', label: 'Km contratto', type: 'number' },
    { name: 'invoice_amount_excl_vat', label: 'Fattura (IVA escl.)', type: 'number' },
    { name: 'invoice_amount_incl_vat', label: 'Fattura (IVA incl.)', type: 'number' },
    { name: 'contract_equipment', label: 'Dotazioni contratto', type: 'textarea' },
    { name: 'front_tire_size', label: 'Misura gomme anteriori' },
    { name: 'rear_tire_size', label: 'Misura gomme posteriori' },
    { name: 'tomtom', label: 'TomTom' },
    { name: 'tires', label: 'Gomme' },
    { name: 'returned_or_redeemed', label: 'Restituito/Riscattato' },
    { name: 'link', label: 'Link esterno', type: 'textarea' },
    { name: 'status', label: 'Stato', type: 'select', options: [
      { value: 'operational', label: 'Operativo' },
      { value: 'maintenance', label: 'In manutenzione' },
      { value: 'decommissioned', label: 'Disattivato' },
    ]},
    { name: 'notes', label: 'Note', type: 'textarea' },
    { name: 'purchase_date', label: 'Data Acquisto', type: 'date' },
    { name: 'purchase_price', label: 'Prezzo Acquisto', type: 'number' },
  ];

  // Suddivisione tab logiche per i dettagli veicolo
  const tabGroups = [
    {
      label: 'Generale',
      fields: veicoloFields.filter(f => [
        'plate','imei','nome','brand','model','year','type','fuel_type','status','color','gruppi','autista_assegnato','notes'
      ].includes(f.name))
    },
    {
      label: 'Motore/Telaio',
      fields: veicoloFields.filter(f => [
        'vin_code','engine_capacity','engine_code','engine_serial_number','fiscal_horsepower','power_kw','chassis_number','odometer','engine_hours','max_load','front_tire_size','rear_tire_size','tomtom','tires'
      ].includes(f.name))
    },
    {
      label: 'Amministrativi',
      fields: veicoloFields.filter(f => [
        'registration_number','euro_classification','ownership','current_profitability','supplier','collection_date','first_registration_date','purchase_date','purchase_price','link'
      ].includes(f.name))
    },
    {
      label: 'Contratto/Noleggio',
      fields: veicoloFields.filter(f => [
        'contract_holder','ownership_type','rental_type','advance_paid','final_installment','monthly_fee','contract_start_date','contract_end_date','contract_duration_months','contract_kilometers','invoice_amount_excl_vat','invoice_amount_incl_vat','contract_equipment','returned_or_redeemed'
      ].includes(f.name))
    }
  ];

  // Ref per evitare loop infiniti
  const isInitialLoad = useRef(true);
  const lastFiltersRef = useRef(JSON.stringify(filters));
  const lastSearchRef = useRef(searchTerm);
  const isLoadingRef = useRef(false);
  
  // Ref per memorizzare i valori correnti senza triggerare re-render
  const stateRef = useRef({ searchTerm, currentPage, perPage, filters });
  
  // Aggiorna i ref quando cambiano i valori
  useEffect(() => {
    stateRef.current = { searchTerm, currentPage, perPage, filters };
  }, [searchTerm, currentPage, perPage, filters]);
  
  // Funzione unificata per caricare i dati (usa ref per evitare loop)
  const loadData = useCallback(async (options = {}) => {
    if (!user || loading || isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setFetching(true);
    setError("");
    
    // Usa i valori dalle options o dai ref correnti (per evitare dipendenze)
    const currentState = stateRef.current;
    const search = options.search !== undefined ? options.search : currentState.searchTerm;
    const page = options.page !== undefined ? options.page : currentState.currentPage;
    const itemsPerPage = options.itemsPerPage !== undefined ? options.itemsPerPage : currentState.perPage;
    const resetPage = options.resetPage || false;
    const filtersToUse = options.filters !== undefined ? options.filters : currentState.filters;
    
    const pageToUse = resetPage ? 1 : page;
    
    // Se resetPage è true e currentPage non è 1, aggiorna lo stato
    // Ma continua con il caricamento (non fare return)
    if (resetPage && currentState.currentPage !== 1) {
      setCurrentPage(1);
      // Continua con pageToUse = 1 per il caricamento
    }
    
    try {
      const params = new URLSearchParams({
        page: pageToUse.toString(),
        perPage: itemsPerPage.toString()
      });
      
      if (search && String(search).trim()) {
        params.append('search', String(search).trim());
      }
      
      // Usa i filtri passati o correnti
      Object.entries(filtersToUse).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          if (typeof value === 'object' && value.from) {
            if (value.from) params.append(`${key}_from`, value.from);
            if (value.to) params.append(`${key}_to`, value.to);
          } else {
            params.append(`filter[${key}]`, value);
          }
        }
      });
      
      const response = await api.get(`/vehicles?${params.toString()}`);
      
      if (response.data && response.data.data) {
        setVeicoli(response.data.data);
        setTotal(response.data.total || 0);
      } else {
        setVeicoli([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("❌ Errore nel caricamento dei veicoli:", err);
      if (err.response && err.response.status === 401) {
        setError("Sessione scaduta. Effettua nuovamente il login.");
      } else {
        setError("Errore nel caricamento dei veicoli.");
      }
      setVeicoli([]);
      setTotal(0);
    } finally {
      setFetching(false);
      isLoadingRef.current = false;
    }
  }, [user, loading]);
  
  // Caricamento iniziale
  useEffect(() => {
    if (!loading && user && isInitialLoad.current) {
      isInitialLoad.current = false;
      loadData();
    } else if (!loading && !user) {
      setFetching(false);
    }
  }, [user, loading, loadData]);
  
  // Ricarica quando cambia dataVersion
  useEffect(() => {
    if (!loading && user && dataVersion > 0) {
      loadData({ resetPage: true });
    }
  }, [dataVersion, loadData, user, loading]);
  
  // Ricarica quando cambiano pagina o items per pagina
  useEffect(() => {
    if (!loading && user && !isInitialLoad.current && !isLoadingRef.current) {
      // Usa i valori correnti da stateRef per evitare problemi di timing
      const currentState = stateRef.current;
      loadData({ 
        page: currentPage, 
        itemsPerPage: perPage,
        search: currentState.searchTerm,
        filters: currentState.filters
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, perPage]);
  
  // Ricarica quando cambiano i filtri (resetta pagina)
  useEffect(() => {
    const filtersStr = JSON.stringify(filters);
    if (!loading && user && !isInitialLoad.current && !isLoadingRef.current && filtersStr !== lastFiltersRef.current) {
      lastFiltersRef.current = filtersStr;
      const currentState = stateRef.current;
      if (currentState.currentPage !== 1) {
        setCurrentPage(1);
      } else {
        loadData({ 
          filters: filters,
          search: currentState.searchTerm,
          resetPage: false 
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);
  
  // Ricarica quando cambia searchTerm
  // Il debounce è gestito nel DataTable, qui facciamo solo la chiamata quando searchTerm cambia
  // IMPORTANTE: resetta la pagina SOLO quando searchTerm cambia, non quando cambia la pagina
  useEffect(() => {
    if (!loading && user && !isInitialLoad.current && !isLoadingRef.current && searchTerm !== lastSearchRef.current) {
      lastSearchRef.current = searchTerm;
      const currentState = stateRef.current;
      // Reset pagina solo se searchTerm è cambiato (non quando cambia la pagina)
      if (currentState.currentPage !== 1) {
        setCurrentPage(1);
        // Non fare loadData qui, l'useEffect per currentPage lo farà
      } else {
        loadData({ 
          search: searchTerm,
          filters: currentState.filters,
          resetPage: false 
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Funzione per gestire la ricerca con debounce (chiamata dal DataTable)
  // Questa funzione viene chiamata DOPO il debounce, quindi possiamo aggiornare direttamente
  const handleSearchChange = useCallback((newTerm) => {
    const trimmedTerm = newTerm ? String(newTerm).trim() : '';
    // Aggiorna searchTerm solo se è diverso (evita loop)
    setSearchTerm(prev => {
      if (prev !== trimmedTerm) {
        return trimmedTerm;
      }
      return prev;
    });
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const handleViewDetails = (veicolo) => {
    if (veicolo?.id) router.push(`/veicoli/${veicolo.id}`);
  };
  
  const handleCreateNew = () => {
    router.push('/veicoli/new');
  };

  if (loading || fetching) return <div className="centered">Caricamento...</div>;
  if (error) return <div className="centered">{error}</div>;

  return (
    <div style={{ padding: 32 }}>
    <PageHeader 
      title="Veicoli" 
      buttonLabel={canEdit ? "Nuovo Veicolo" : ""} 
      onAddClick={canEdit ? handleCreateNew : null} 
    />
    
    {/* Filtri avanzati */}
    <FilterBar 
      filters={filterConfig}
      currentFilters={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
    />
    
    <div>
      <DataTable 
        data={veicoli}
        columns={[
          { 
            key: 'plate', 
            label: 'Targa'
          },
          { 
            key: 'brand', 
            label: 'Marca'
          },
          { 
            key: 'model', 
            label: 'Modello'
          },
          { 
            key: 'year', 
            label: 'Anno'
          },
          {
            key: 'imei',
            label: 'IMEI MOMAP',
            render: (item) => item.imei || <span style={{color:'#bbb'}}>—</span>
          },
          { 
            key: 'type', 
            label: 'Tipo'
          },
          { 
            key: 'fuel_type', 
            label: 'Carburante'
          },
          { 
            key: 'odometer', 
            label: 'KM'
          },
          {
            key: 'actions', 
            label: 'Azioni',
            render: (item) => (
              <button 
                onClick={(e) => { e.stopPropagation(); router.push(`/veicoli/${item.id}`); }}
                style={{ background: 'var(--primary)', color: '#fff', borderRadius: 6, padding: '0.4em 1em', fontSize: 14, border: 'none', cursor: 'pointer' }}
              >
                Dettagli
              </button>
            )
          }
        ]}
        // Server-side search e paginazione
        serverSide={true}
        currentPage={currentPage}
        totalItems={total}
        itemsPerPage={perPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setPerPage}
        onSearchTermChange={handleSearchChange}
        searchTerm={searchTerm}
        loading={fetching}
        // Props per filtri client-side (disabilitati per server-side)
        filterableColumns={[]}
        onRowClick={handleViewDetails}
        selectedRow={null}
        searchPlaceholder="Cerca veicoli..."
        emptyMessage={fetching ? "Caricamento..." : "Nessun veicolo trovato"}
        defaultVisibleColumns={['plate','brand','model','year','status','actions']}
      />
    </div>
    </div>
  );
}