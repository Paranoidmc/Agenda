"use client";
import AddButton from './AddButton';

export default function PageHeader({ title, buttonLabel, onAddClick }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: 24 
    }}>
      <h2 style={{ 
        fontWeight: 600, 
        margin: 0,
        fontSize: '1.5rem',
        color: '#1a1a1a'
      }}>
        {title}
      </h2>
      
      {buttonLabel && onAddClick && (
        <AddButton onClick={onAddClick} label={buttonLabel} />
      )}
    </div>
  );
}