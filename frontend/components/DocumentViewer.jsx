"use client";
import { useState, useEffect } from 'react';
import { FiX, FiDownload, FiFile, FiImage, FiFileText } from 'react-icons/fi';

export default function DocumentViewer({ documentId, documentUrl, fileName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fileType, setFileType] = useState('');

  useEffect(() => {
    if (!documentUrl) {
      setError('URL documento non valida');
      setLoading(false);
      return;
    }

    // Determina il tipo di file dall'estensione
    const extension = fileName?.split('.').pop()?.toLowerCase() || '';
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const pdfTypes = ['pdf'];
    
    if (imageTypes.includes(extension)) {
      setFileType('image');
    } else if (pdfTypes.includes(extension)) {
      setFileType('pdf');
    } else {
      setFileType('other');
    }
    
    setLoading(false);
  }, [documentUrl, fileName]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = fileName || 'documento';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 40,
          textAlign: 'center'
        }}>
          <div style={{
            width: 40,
            height: 40,
            border: '4px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <div>Caricamento documento...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 40,
          maxWidth: 500,
          textAlign: 'center'
        }}>
          <div style={{ color: '#dc2626', marginBottom: 16 }}>Errore: {error}</div>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: '#1f2937',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#fff'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          {fileType === 'image' && <FiImage style={{ fontSize: 20 }} />}
          {fileType === 'pdf' && <FiFileText style={{ fontSize: 20 }} />}
          {fileType === 'other' && <FiFile style={{ fontSize: 20 }} />}
          <span style={{ fontWeight: 600 }}>{fileName || 'Documento'}</span>
        </div>
        <div style={{
          display: 'flex',
          gap: 8
        }}>
          <button
            onClick={handleDownload}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14
            }}
          >
            <FiDownload /> Scarica
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#6b7280',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14
            }}
          >
            <FiX /> Chiudi
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}>
        {fileType === 'image' ? (
          <img
            src={documentUrl}
            alt={fileName}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
            onError={() => setError('Errore nel caricamento dell\'immagine')}
          />
        ) : fileType === 'pdf' ? (
          <iframe
            src={documentUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: 8
            }}
            title={fileName}
            onError={() => setError('Errore nel caricamento del PDF')}
          />
        ) : (
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
            maxWidth: 500
          }}>
            <FiFile style={{ fontSize: 64, color: '#9ca3af', marginBottom: 16 }} />
            <div style={{ marginBottom: 16, fontWeight: 600 }}>Visualizzazione non disponibile</div>
            <div style={{ color: '#6b7280', marginBottom: 24 }}>
              Questo tipo di file non può essere visualizzato inline.<br />
              Usa il pulsante "Scarica" per aprirlo.
            </div>
            <button
              onClick={handleDownload}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500
              }}
            >
              <FiDownload style={{ marginRight: 8, display: 'inline' }} /> Scarica Documento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

