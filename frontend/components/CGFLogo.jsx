"use client";
import { useState, useEffect } from 'react';

export default function CGFLogo({ size = 'medium', showTagline = false, showText = false }) {
  const [logoSrc, setLogoSrc] = useState('/img/cgf-logo.png');
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const sizes = {
    small: { logoSize: 40, fontSize: 18, taglineSize: 10 },
    medium: { logoSize: 50, fontSize: 24, taglineSize: 11 },
    large: { logoSize: 120, fontSize: 32, taglineSize: 13 },
    xlarge: { logoSize: 160, fontSize: 48, taglineSize: 15 },
    xxlarge: { logoSize: 200, fontSize: 56, taglineSize: 16 }
  };
  
  const { logoSize, fontSize, taglineSize } = sizes[size] || sizes.medium;
  
  // Gestione mount per SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prova diversi percorsi per il logo
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') {
      return;
    }

    let isMounted = true;
    const testImage = new Image();
    
    testImage.onload = () => {
      if (isMounted) {
        setHasError(false);
        setIsLoading(false);
      }
    };
    
    testImage.onerror = () => {
      // Prova percorso alternativo
      const altSrc = '/cgf-logo.png';
      const testAlt = new Image();
      
      testAlt.onload = () => {
        if (isMounted) {
          setLogoSrc(altSrc);
          setHasError(false);
          setIsLoading(false);
        }
      };
      
      testAlt.onerror = () => {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      };
      
      testAlt.src = altSrc;
    };
    
    testImage.src = logoSrc;
    
    return () => {
      isMounted = false;
    };
  }, [logoSrc, mounted]);
  
  // Se siamo in SSR o ancora caricando, mostra un placeholder
  if (!mounted || typeof window === 'undefined' || isLoading) {
    return (
      <div style={{
        width: logoSize,
        height: logoSize,
        flexShrink: 0
      }} />
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      color: '#66CC00'
    }}>
      {/* Logo PNG */}
      {!hasError && (
        <div style={{
          position: 'relative',
          width: logoSize,
          height: logoSize,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img
            src={logoSrc}
            alt="CGF Srl Logo"
            style={{
              width: logoSize,
              height: logoSize,
              objectFit: 'cover',
              display: 'block',
              maxWidth: 'none',
              maxHeight: 'none'
            }}
            onError={(e) => {
              console.error('Errore caricamento logo:', e.target.src);
              setHasError(true);
            }}
          />
        </div>
      )}
      
      {/* Separatore verticale e testo - mostrati solo se showText è true */}
      {showText && !hasError && (
        <>
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
        </>
      )}
    </div>
  );
}

