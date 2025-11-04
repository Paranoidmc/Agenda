import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import axios from "../lib/api";

export default function VehicleRentalsSection({ veicoloId, canEdit = false }) {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingRental, setEditingRental] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchRentals = async () => {
    setLoading(true);
    setError("");
    try {
      axios.invalidateCache(`/vehicles/${veicoloId}/rentals`);
      const res = await axios.get(`/vehicles/${veicoloId}/rentals`, {
        useCache: false,
      });
      setRentals(res.data.data || []);
    } catch (e) {
      console.error('Errore caricamento contratti:', e);
      setError("Errore caricamento contratti");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (veicoloId) fetchRentals();
    
    const handleRentalSync = () => {
      setTimeout(() => fetchRentals(), 200);
    };
    
    window.addEventListener('vehicleRentalCreated', handleRentalSync);
    window.addEventListener('vehicleRentalUpdated', handleRentalSync);
    window.addEventListener('vehicleRentalDeleted', handleRentalSync);
    
    return () => {
      window.removeEventListener('vehicleRentalCreated', handleRentalSync);
      window.removeEventListener('vehicleRentalUpdated', handleRentalSync);
      window.removeEventListener('vehicleRentalDeleted', handleRentalSync);
    };
  }, [veicoloId]);

  const getRentalStatus = (rental) => {
    const now = new Date();
    const start = new Date(rental.contract_start_date);
    const end = new Date(rental.contract_end_date);
    
    if (!rental.is_active) return { label: 'Inattivo', color: '#9ca3af' };
    if (end < now) return { label: 'Scaduto', color: '#ef4444' };
    if (start > now) return { label: 'Futuro', color: '#3b82f6' };
    return { label: 'Attivo', color: '#22c55e' };
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Eliminare questo contratto?")) return;
    
    setLoading(true);
    setError("");
    try {
      await axios.delete(`/vehicles/${veicoloId}/rentals/${id}`);
      axios.invalidateCache(`/vehicles/${veicoloId}/rentals`);
      setTimeout(() => fetchRentals(), 300);
      
      window.dispatchEvent(new CustomEvent('vehicleRentalDeleted', {
        detail: { veicoloId, rentalId: id }
      }));
      
      console.log('✅ Contratto eliminato con successo');
    } catch (e) {
      console.error('❌ Errore eliminazione contratto:', e);
      setError(e.response?.data?.error || e.response?.data?.message || "Errore eliminazione contratto");
      setLoading(false);
    }
  };

  const handleEdit = (rental) => {
    setEditingRental(rental);
    setShowForm(true);
    setIsEditing(true);
  };

  const handleNew = () => {
    setEditingRental(null);
    setShowForm(true);
    setIsEditing(false);
  };

  const handleSave = async (formData) => {
    setLoading(true);
    setError("");
    try {
      let response;
      if (isEditing) {
        response = await axios.put(`/vehicles/${veicoloId}/rentals/${editingRental.id}`, formData);
        window.dispatchEvent(new CustomEvent('vehicleRentalUpdated', {
          detail: { veicoloId, rentalId: editingRental.id }
        }));
      } else {
        response = await axios.post(`/vehicles/${veicoloId}/rentals`, formData);
        window.dispatchEvent(new CustomEvent('vehicleRentalCreated', {
          detail: { veicoloId, rentalId: response.data?.data?.id }
        }));
      }
      
      axios.invalidateCache(`/vehicles/${veicoloId}/rentals`);
      setTimeout(() => {
        fetchRentals();
        setShowForm(false);
        setEditingRental(null);
        setIsEditing(false);
      }, 300);
      
      console.log('✅ Contratto salvato con successo');
    } catch (e) {
      console.error('❌ Errore salvataggio contratto:', e);
      const errors = e.response?.data?.errors || {};
      const errorMsg = Object.values(errors).flat().join(', ') || e.response?.data?.message || "Errore salvataggio contratto";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return `€ ${parseFloat(amount).toFixed(2)}`;
  };

  return (
    <div style={{ marginBottom: 32, background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px #0001', padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h4 style={{ margin: 0, fontWeight: 600, fontSize: 20, color: '#2A3A4A' }}>Storico Contratti di Noleggio</h4>
        {canEdit && (
          <button
            onClick={handleNew}
            disabled={showForm}
            style={{
              background: showForm ? '#b3c6e0' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              fontWeight: 600,
              cursor: showForm ? 'not-allowed' : 'pointer',
            }}
          >
            + Nuovo Contratto
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: '#ffeaea', color: '#b91c1c', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontWeight: 500 }}>
          {error}
        </div>
      )}

      {showForm && (
        <RentalForm
          rental={editingRental}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingRental(null);
            setIsEditing(false);
          }}
          loading={loading}
        />
      )}

      {loading && !showForm ? (
        <div style={{ color: '#555', fontStyle: 'italic', padding: '12px 0' }}>Caricamento...</div>
      ) : rentals.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '48px', marginBottom: 16 }}>📄</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: 8 }}>Nessun contratto registrato</div>
          <div>Inizia aggiungendo il primo contratto di noleggio</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {rentals.map(rental => {
            const status = getRentalStatus(rental);
            return (
              <div
                key={rental.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 16,
                  background: '#f9fafb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: status.color + '20',
                        color: status.color,
                      }}>
                        {status.label}
                      </span>
                      {rental.contract_holder && (
                        <span style={{ fontWeight: 600, color: '#1f2937' }}>{rental.contract_holder}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                      <strong>Dal:</strong> {formatDate(rental.contract_start_date)} <strong>Al:</strong> {formatDate(rental.contract_end_date)}
                    </div>
                    {rental.rental_type && (
                      <div style={{ fontSize: 14, color: '#6b7280' }}>
                        <strong>Tipo:</strong> {rental.rental_type}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleEdit(rental)}
                        style={{
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => handleDelete(rental.id)}
                        style={{
                          background: '#fff',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Elimina
                      </button>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12, fontSize: 13, color: '#4b5563' }}>
                  {rental.monthly_fee && (
                    <div><strong>Canone mensile:</strong> {formatCurrency(rental.monthly_fee)}</div>
                  )}
                  {rental.contract_duration_months && (
                    <div><strong>Durata:</strong> {rental.contract_duration_months} mesi</div>
                  )}
                  {rental.contract_kilometers && (
                    <div><strong>Km contrattuali:</strong> {rental.contract_kilometers.toLocaleString('it-IT')}</div>
                  )}
                  {rental.supplier && (
                    <div><strong>Fornitore:</strong> {rental.supplier}</div>
                  )}
                </div>
                
                {rental.notes && (
                  <div style={{ marginTop: 12, padding: 8, background: '#fff', borderRadius: 4, fontSize: 13, color: '#4b5563' }}>
                    <strong>Note:</strong> {rental.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RentalForm({ rental, onSave, onCancel, loading }) {
  const [formData, setFormData] = useState({
    contract_holder: rental?.contract_holder || '',
    ownership_type: rental?.ownership_type || '',
    rental_type: rental?.rental_type || '',
    advance_paid: rental?.advance_paid || '',
    final_installment: rental?.final_installment || '',
    monthly_fee: rental?.monthly_fee || '',
    contract_start_date: rental?.contract_start_date ? rental.contract_start_date.split('T')[0] : '',
    contract_end_date: rental?.contract_end_date ? rental.contract_end_date.split('T')[0] : '',
    monthly_alert: rental?.monthly_alert || '',
    end_alert: rental?.end_alert || '',
    installment_payment_day: rental?.installment_payment_day || '',
    supplier: rental?.supplier || '',
    collection_date: rental?.collection_date ? rental.collection_date.split('T')[0] : '',
    contract_duration_months: rental?.contract_duration_months || '',
    contract_kilometers: rental?.contract_kilometers || '',
    invoice_amount_excl_vat: rental?.invoice_amount_excl_vat || '',
    invoice_amount_incl_vat: rental?.invoice_amount_incl_vat || '',
    contract_equipment: rental?.contract_equipment || '',
    returned_or_redeemed: rental?.returned_or_redeemed || '',
    notes: rental?.notes || '',
    is_active: rental?.is_active !== undefined ? rental.is_active : true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 20, padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
      <h5 style={{ marginTop: 0, marginBottom: 16 }}>{rental ? 'Modifica Contratto' : 'Nuovo Contratto'}</h5>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Intestatario contratto *</label>
          <input
            type="text"
            name="contract_holder"
            value={formData.contract_holder}
            onChange={handleChange}
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
            required
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Tipo noleggio</label>
          <input
            type="text"
            name="rental_type"
            value={formData.rental_type}
            onChange={handleChange}
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Data inizio *</label>
          <input
            type="date"
            name="contract_start_date"
            value={formData.contract_start_date}
            onChange={handleChange}
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
            required
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Data fine *</label>
          <input
            type="date"
            name="contract_end_date"
            value={formData.contract_end_date}
            onChange={handleChange}
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
            required
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Canone mensile</label>
          <input
            type="number"
            step="0.01"
            name="monthly_fee"
            value={formData.monthly_fee}
            onChange={handleChange}
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Durata (mesi)</label>
          <input
            type="number"
            name="contract_duration_months"
            value={formData.contract_duration_months}
            onChange={handleChange}
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Km contrattuali</label>
          <input
            type="number"
            name="contract_kilometers"
            value={formData.contract_kilometers}
            onChange={handleChange}
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Fornitore</label>
          <input
            type="text"
            name="supplier"
            value={formData.supplier}
            onChange={handleChange}
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>
      </div>
      
      <div style={{ marginTop: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Note</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
        />
      </div>
      
      <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            background: '#fff',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '8px 16px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? '#b3c6e0' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 16px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>
    </form>
  );
}

VehicleRentalsSection.propTypes = {
  veicoloId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  canEdit: PropTypes.bool,
};

