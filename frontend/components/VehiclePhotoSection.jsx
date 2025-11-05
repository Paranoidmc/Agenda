"use client";
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { FiCamera, FiX, FiUpload, FiImage } from 'react-icons/fi';

export default function VehiclePhotoSection({ vehicleId, currentPhoto, onPhotoUpdate }) {
  const [photo, setPhoto] = useState(currentPhoto);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setPhoto(currentPhoto);
    if (currentPhoto) {
      setPreview(`/api/vehicles/${vehicleId}/photo?t=${Date.now()}`);
    } else {
      setPreview(null);
    }
  }, [currentPhoto, vehicleId]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validazione
    if (!file.type.startsWith('image/')) {
      setError('Il file deve essere un\'immagine');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      setError('L\'immagine deve essere inferiore a 5MB');
      return;
    }

    setError('');
    
    // Preview locale
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload
    uploadPhoto(file);
  };

  const uploadPhoto = async (file) => {
    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await api.post(`/vehicles/${vehicleId}/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setPhoto(response.data.photo);
        if (onPhotoUpdate) {
          onPhotoUpdate(response.data.photo);
        }
        // Forza refresh dell'immagine
        setPreview(`/api/vehicles/${vehicleId}/photo?t=${Date.now()}`);
      }
    } catch (err) {
      console.error('Errore upload foto:', err);
      setError(err.response?.data?.message || 'Errore durante l\'upload della foto');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm('Sei sicuro di voler eliminare la foto del veicolo?')) {
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      await api.delete(`/vehicles/${vehicleId}/photo`);
      
      setPhoto(null);
      setPreview(null);
      if (onPhotoUpdate) {
        onPhotoUpdate(null);
      }
    } catch (err) {
      console.error('Errore eliminazione foto:', err);
      setError(err.response?.data?.message || 'Errore durante l\'eliminazione della foto');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 24,
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20
      }}>
        <FiCamera style={{ fontSize: 20, color: '#3b82f6' }} />
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
          Foto Veicolo
        </h3>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: 12,
          marginBottom: 20,
          color: '#dc2626',
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: 20,
        alignItems: 'flex-start'
      }}>
        {/* Preview foto */}
        <div style={{
          width: 300,
          height: 200,
          borderRadius: 8,
          overflow: 'hidden',
          background: '#f3f4f6',
          border: '2px dashed #d1d5db',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {preview ? (
            <>
              <img
                src={preview}
                alt="Foto veicolo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={() => setPreview(null)}
              />
              {photo && (
                <button
                  onClick={handleDeletePhoto}
                  disabled={isUploading}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(220, 38, 38, 0.9)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 16
                  }}
                  title="Elimina foto"
                >
                  <FiX />
                </button>
              )}
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#9ca3af',
              padding: 20
            }}>
              <FiImage style={{ fontSize: 48, marginBottom: 12 }} />
              <div style={{ fontSize: 14 }}>Nessuna foto</div>
            </div>
          )}
        </div>

        {/* Controlli upload */}
        <div style={{ flex: 1 }}>
          <label
            htmlFor="photo-upload"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: '#3b82f6',
              color: '#fff',
              borderRadius: 8,
              cursor: isUploading ? 'not-allowed' : 'pointer',
              opacity: isUploading ? 0.6 : 1,
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            {isUploading ? (
              <>
                <div style={{
                  width: 16,
                  height: 16,
                  border: '2px solid #fff',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Caricamento...
              </>
            ) : (
              <>
                <FiUpload />
                {photo ? 'Cambia Foto' : 'Carica Foto'}
              </>
            )}
          </label>
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            style={{ display: 'none' }}
          />
          <div style={{
            marginTop: 12,
            fontSize: 12,
            color: '#6b7280'
          }}>
            Formati supportati: JPG, PNG, GIF<br />
            Dimensione massima: 5MB
          </div>
        </div>
      </div>
    </div>
  );
}

