"use client";
import { useState } from 'react';

export default function DeadlineList({ deadlines, onDeadlineClick }) {
  const [sortField, setSortField] = useState('expiry_date');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedDeadlines = [...deadlines].sort((a, b) => {
    if (sortField === 'expiry_date') {
      const dateA = new Date(a.expiry_date);
      const dateB = new Date(b.expiry_date);
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortField === 'type') {
      return sortDirection === 'asc'
        ? a.type.localeCompare(b.type)
        : b.type.localeCompare(a.type);
    } else if (sortField === 'status') {
      return sortDirection === 'asc'
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    }
    return 0;
  });

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
  const getStatusColor = (deadline) => {
    // Se lo stato è specificato, usa i colori standard
    if (deadline.status === 'completed' || deadline.status === 'completato') return '#22c55e'; // Verde
    if (deadline.status === 'in corso') return '#f97316'; // Arancione
    if (deadline.status === 'programmato') return '#8b5cf6'; // Viola
    if (deadline.status === 'assegnato') return '#eab308'; // Giallo
    if (deadline.status === 'non assegnato') return '#3b82f6'; // Blu
    if (deadline.status === 'annullato') return '#ec4899'; // Rosa
    if (deadline.status === 'doc emesso') return '#ef4444'; // Rosso
    
    // Altrimenti, usa la logica basata sulla data di scadenza
    const dueDate = new Date(deadline.due_date);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return '#ef4444'; // Rosso - scaduta
    if (diffDays <= 30) return '#f97316'; // Arancione - in scadenza
    return '#3b82f6'; // Blu - ok
  };

  if (deadlines.length === 0) return <div>Nessuna scadenza trovata.</div>;

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <th 
              style={{ textAlign: 'left', padding: 8, cursor: 'pointer' }}
              onClick={() => handleSort('type')}
            >
              Tipo {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th style={{ textAlign: 'left', padding: 8 }}>Pagato</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Importo</th>
            <th 
              style={{ textAlign: 'left', padding: 8, cursor: 'pointer' }}
              onClick={() => handleSort('due_date')}
            >
              Scadenza {sortField === 'due_date' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th style={{ textAlign: 'left', padding: 8 }}>Descrizione</th>
            <th 
              style={{ textAlign: 'left', padding: 8, cursor: 'pointer' }}
              onClick={() => handleSort('status')}
            >
              Stato {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedDeadlines.map(deadline => (
            <tr 
              key={deadline.id} 
              style={{ 
                borderBottom: '1px solid #f3f3f3',
                cursor: 'pointer'
              }}
              onClick={() => onDeadlineClick && onDeadlineClick(deadline)}
            >
              <td style={{ padding: 8 }}>{deadline.type}</td>
              <td style={{ padding: 8 }}>{formatDate(deadline.expiry_date)}</td>
              <td style={{ padding: 8 }}>{deadline.description || ''}</td>
              <td style={{ padding: 8, textAlign: 'center' }}>{deadline.pagato ? '✅' : '❌'}</td>
              <td style={{ padding: 8 }}>{deadline.importo ? `${Number(deadline.importo).toFixed(2)} €` : '-'}</td>
              <td style={{ padding: 8 }}>
                <span style={{ 
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  backgroundColor: getStatusColor(deadline),
                  color: '#fff'
                }}>
                  {deadline.status === 'pending' ? 'In attesa' : 
                   deadline.status === 'completed' ? 'Completata' : 
                   deadline.status === 'overdue' ? 'Scaduta' : 
                   deadline.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}