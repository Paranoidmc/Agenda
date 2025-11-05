"use client";
import Image from 'next/image';

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
      {/* Logo PNG */}
      <div style={{
        position: 'relative',
        width: logoSize,
        height: logoSize,
        flexShrink: 0
      }}>
        <Image
          src="/img/cgf-logo.png"
          alt="CGF Srl Logo"
          width={logoSize}
          height={logoSize}
          style={{ objectFit: 'contain' }}
          priority
        />
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

