"use client";

export default function CGFLogo({ size = 'medium', showTagline = true }) {
  const sizes = {
    small: { logoSize: 40, fontSize: 18, taglineSize: 10 },
    medium: { logoSize: 60, fontSize: 24, taglineSize: 11 },
    large: { logoSize: 80, fontSize: 32, taglineSize: 12 }
  };
  
  const { logoSize, fontSize, taglineSize } = sizes[size] || sizes.medium;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      color: '#66CC00'
    }}>
      {/* Logo grafico */}
      <div style={{
        position: 'relative',
        width: logoSize,
        height: logoSize,
        flexShrink: 0
      }}>
        <svg width={logoSize} height={logoSize} viewBox="0 0 100 100" style={{ display: 'block' }}>
          {/* Cerchio esterno */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#66CC00"
            strokeWidth="4"
          />
          {/* Lettera G stilizzata */}
          <path
            d="M 35 30 Q 50 25 65 30 L 65 50 Q 65 60 55 60 L 45 60"
            fill="none"
            stroke="#66CC00"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Lettera F stilizzata */}
          <path
            d="M 40 35 L 40 65 M 40 45 L 55 45 M 40 55 L 50 55"
            fill="none"
            stroke="#66CC00"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Foglia verde */}
          <path
            d="M 60 45 Q 70 50 75 60 Q 70 65 65 70 Q 60 65 58 60 Q 60 55 60 50 Z"
            fill="#7ED321"
            stroke="#66CC00"
            strokeWidth="1"
          />
          {/* Vene della foglia */}
          <path
            d="M 60 50 L 70 60 M 60 55 L 68 65"
            stroke="#66CC00"
            strokeWidth="1"
            opacity="0.6"
          />
        </svg>
      </div>
      
      {/* Separatore verticale */}
      <div style={{
        width: 1,
        height: logoSize * 0.7,
        background: '#888',
        flexShrink: 0
      }} />
      
      {/* Testo */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6
        }}>
          <span style={{
            fontSize: fontSize,
            fontWeight: 700,
            color: '#66CC00',
            letterSpacing: 1
          }}>
            CGF
          </span>
          <span style={{
            fontSize: fontSize * 0.6,
            fontWeight: 400,
            color: '#66CC00',
            marginLeft: 2
          }}>
            srl
          </span>
        </div>
        {showTagline && (
          <div style={{
            fontSize: taglineSize,
            fontWeight: 400,
            color: '#66CC00',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            marginTop: 2
          }}>
            SERVIZI PER L'EDILIZIA E PER L'AMBIENTE
          </div>
        )}
      </div>
    </div>
  );
}

