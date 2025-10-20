"use client";
import AddButton from './AddButton';

export default function PageHeader({ 
  title, 
  subtitle, 
  icon, 
  buttonLabel, 
  onAddClick, 
  actions = [],
  showBackButton = false,
  onBackClick
}) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start', 
      marginBottom: 24,
      gap: 20
    }}>
      {/* Title section */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subtitle ? 8 : 0 }}>
          {icon && <span style={{ fontSize: '1.5rem' }}>{icon}</span>}
          <h2 style={{ 
            fontWeight: 600, 
            margin: 0,
            fontSize: '1.5rem',
            color: '#1a1a1a'
          }}>
            {title}
          </h2>
        </div>
        {subtitle && (
          <p style={{ 
            margin: 0, 
            color: '#6b7280', 
            fontSize: '0.95rem' 
          }}>
            {subtitle}
          </p>
        )}
      </div>
      
      {/* Actions section */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {/* Legacy support for buttonLabel/onAddClick */}
        {buttonLabel && onAddClick && (
          <AddButton onClick={onAddClick} label={buttonLabel} />
        )}
        
        {/* Back button if needed */}
        {showBackButton && onBackClick && (
          <button
            onClick={onBackClick}
            style={{
              padding: '10px 16px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            ← Indietro
          </button>
        )}
        
        {/* New actions array support */}
        {actions.map((action, index) => {
          const getButtonStyle = (variant) => {
            const baseStyle = {
              padding: '10px 16px',
              border: 'none',
              borderRadius: 6,
              cursor: action.disabled ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: action.disabled ? 0.6 : 1,
              transition: 'all 0.2s'
            };
            
            switch(variant) {
              case 'primary':
                return { ...baseStyle, background: '#3b82f6', color: '#fff' };
              case 'danger':
                return { ...baseStyle, background: '#dc2626', color: '#fff' };
              case 'secondary':
              default:
                return { ...baseStyle, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' };
            }
          };
          
          return (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              style={getButtonStyle(action.variant)}
            >
              {action.icon}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}