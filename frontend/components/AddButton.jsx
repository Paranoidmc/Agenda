"use client";

export default function AddButton({ onClick, label }) {
  return (
    <button 
      onClick={onClick}
      style={{ 
        background: 'var(--primary)', 
        color: '#fff', 
        borderRadius: 8, 
        padding: '0.6em 1.2em', 
        fontSize: 14,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 8px rgba(0, 122, 255, 0.2)',
        transition: 'all 0.2s ease'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.3)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 122, 255, 0.2)';
      }}
    >
      <span style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1 }}>+</span>
      {label}
    </button>
  );
}