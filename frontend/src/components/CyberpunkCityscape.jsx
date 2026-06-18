import React, { useEffect, useRef } from 'react';
import anime from 'animejs';

export default function CyberpunkCityscape({ height = 2000 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const neons = containerRef.current.querySelectorAll('.pulse-neon');
      anime({
        targets: neons,
        opacity: [0.5, 1],
        duration: () => 1000 + Math.random() * 2000,
        direction: 'alternate',
        loop: true,
        easing: 'easeInOutSine'
      });
      
      const floaters = containerRef.current.querySelectorAll('.float-bldg');
      anime({
        targets: floaters,
        translateY: [0, -20],
        duration: 4000,
        direction: 'alternate',
        loop: true,
        easing: 'easeInOutSine'
      });
    }
  }, []);

  return (
    <div ref={containerRef} style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: `${height}px`,
      overflow: 'hidden', pointerEvents: 'none', zIndex: 0
    }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        <defs>
          <filter id="neonPink" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="neonCyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="neonOrange" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          
          <linearGradient id="bldgGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#151b2a" />
          </linearGradient>
          <linearGradient id="greyGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#121820" />
            <stop offset="100%" stopColor="#1c2430" />
          </linearGradient>
        </defs>

        {/* Building 1: Pink/Cyan Isometric-style (Left, fixed near top) */}
        <g transform="translate(20, 100)">
          {/* Base */}
          <rect x="0" y="100" width="160" height="600" fill="url(#bldgGrad)" stroke="#1a253a" strokeWidth="2" />
          <rect x="20" y="50" width="120" height="50" fill="url(#bldgGrad)" stroke="#1a253a" strokeWidth="2" />
          <polygon points="0,100 20,50 140,50 160,100" fill="#151b2a" stroke="#1a253a" strokeWidth="2" />
          
          {/* Vertical Pink Neons */}
          <line x1="15" y1="150" x2="15" y2="500" stroke="#ff007a" strokeWidth="5" filter="url(#neonPink)" className="pulse-neon" />
          <line x1="30" y1="150" x2="30" y2="500" stroke="#ff007a" strokeWidth="5" filter="url(#neonPink)" className="pulse-neon" />
          <line x1="45" y1="150" x2="45" y2="500" stroke="#ff007a" strokeWidth="5" filter="url(#neonPink)" className="pulse-neon" />
          
          {/* Cyan Balcony / Sign */}
          <rect x="60" y="200" width="110" height="60" fill="#00ffff" opacity="0.1" stroke="#00ffff" strokeWidth="2" />
          <text x="65" y="235" fill="#00ffff" fontFamily="monospace" fontSize="20" fontWeight="bold" filter="url(#neonCyan)">LIOBRO</text>
          <rect x="60" y="280" width="110" height="30" fill="#00ffff" opacity="0.15" stroke="#00ffff" strokeWidth="1" />
          <text x="65" y="300" fill="#00ffff" fontFamily="monospace" fontSize="12" filter="url(#neonCyan)">SYS.ONLINE</text>
          
          {/* Side extensions */}
          <rect x="160" y="350" width="40" height="150" fill="#0a0f1a" stroke="#1a253a" strokeWidth="2" />
          <line x1="160" y1="360" x2="200" y2="360" stroke="#ff007a" strokeWidth="2" filter="url(#neonPink)" />
          
          <rect x="-20" y="400" width="20" height="100" fill="#0a0f1a" stroke="#1a253a" strokeWidth="2" />
          <text x="-15" y="450" fill="#00ffff" fontFamily="monospace" fontSize="16" transform="rotate(-90 -15 450)" filter="url(#neonCyan)">01</text>
        </g>

        {/* Building 2: Tall Grey/Orange Industrial Tower (Right, fixed middle) */}
        <g transform="translate(calc(100% - 250px), 300)">
          <rect x="50" y="0" width="180" height="900" fill="url(#greyGrad)" stroke="#253040" strokeWidth="3" />
          <rect x="30" y="250" width="220" height="30" fill="#1a253a" stroke="#253040" strokeWidth="2" />
          <rect x="70" y="-50" width="140" height="50" fill="url(#greyGrad)" stroke="#253040" strokeWidth="2" />
          
          {/* Antennas */}
          <line x1="90" y1="-50" x2="90" y2="-150" stroke="#405060" strokeWidth="3" />
          <line x1="150" y1="-50" x2="150" y2="-120" stroke="#405060" strokeWidth="2" />
          <line x1="180" y1="-50" x2="180" y2="-90" stroke="#405060" strokeWidth="1" />
          <circle cx="90" cy="-150" r="4" fill="#ff5500" filter="url(#neonOrange)" className="pulse-neon" />
          <circle cx="150" cy="-120" r="3" fill="#ff5500" filter="url(#neonOrange)" className="pulse-neon" />
          
          {/* Giant Orange Window / Core */}
          <rect x="70" y="60" width="140" height="120" fill="#ff5500" opacity="0.1" stroke="#ff5500" strokeWidth="2" />
          <rect x="80" y="70" width="50" height="100" fill="#ff5500" filter="url(#neonOrange)" className="pulse-neon" opacity="0.8" />
          <rect x="140" y="70" width="60" height="100" fill="#ff5500" filter="url(#neonOrange)" className="pulse-neon" opacity="0.8" />
          
          <rect x="70" y="350" width="140" height="60" fill="#ff5500" opacity="0.1" stroke="#ff5500" strokeWidth="2" />
          <rect x="80" y="360" width="120" height="40" fill="#ff5500" filter="url(#neonOrange)" className="pulse-neon" opacity="0.9" />
          
          {/* AC Units & Pipes */}
          <rect x="230" y="450" width="30" height="60" fill="#1a253a" stroke="#253040" strokeWidth="2" />
          <rect x="230" y="550" width="25" height="40" fill="#1a253a" stroke="#253040" strokeWidth="2" />
          <rect x="20" y="600" width="30" height="80" fill="#1a253a" stroke="#253040" strokeWidth="2" />
          
          {/* Vertical Text Neon */}
          <text x="35" y="100" fill="#ff0055" fontFamily="monospace" fontSize="24" fontWeight="bold" transform="rotate(90 35 100)" filter="url(#neonPink)" className="pulse-neon">DANGER</text>
        </g>

        {/* Building 3: Floating Cyan Silo (Left, lower down) */}
        <g className="float-bldg" transform="translate(60, 950)">
          {/* Floating Silo */}
          <path d="M 0 60 Q 100 0 200 60 L 200 240 Q 100 300 0 240 Z" fill="url(#bldgGrad)" stroke="#00ffff" strokeWidth="3" opacity="0.9" />
          <path d="M 0 60 Q 100 120 200 60" fill="none" stroke="#00ffff" strokeWidth="2" opacity="0.5" />
          <path d="M 0 240 Q 100 180 200 240" fill="none" stroke="#00ffff" strokeWidth="2" opacity="0.5" />
          
          <circle cx="100" cy="150" r="50" fill="#00ffff" opacity="0.05" stroke="#00ffff" strokeWidth="2" filter="url(#neonCyan)" />
          <text x="85" y="165" fill="#00ffff" fontSize="40" fontFamily="monospace" filter="url(#neonCyan)" className="pulse-neon">Q</text>
          
          {/* Thruster Base */}
          <path d="M 40 270 L 160 270 L 140 300 L 60 300 Z" fill="#0a0f1a" stroke="#00ffff" strokeWidth="2" />
          
          {/* Thruster Plasma */}
          <polygon points="60,300 140,300 100,400" fill="#00ffff" opacity="0.4" filter="url(#neonCyan)" className="pulse-neon" />
          <polygon points="75,300 125,300 100,370" fill="#ffffff" opacity="0.8" filter="url(#neonCyan)" className="pulse-neon" />
        </g>

        {/* Building 4: Militarized Triangle Tower (Right, very low down) */}
        <g transform="translate(calc(100% - 300px), 1400)">
          <rect x="50" y="100" width="200" height="700" fill="#080c12" stroke="#121820" strokeWidth="2" />
          <polygon points="50,100 150,0 250,100" fill="#080c12" stroke="#121820" strokeWidth="2" />
          
          {/* Glowing Triangle Logo */}
          <polygon points="150,150 120,200 180,200" fill="none" stroke="#00ffff" strokeWidth="4" filter="url(#neonCyan)" className="pulse-neon" />
          <polygon points="150,165 135,190 165,190" fill="#00ffff" opacity="0.5" filter="url(#neonCyan)" />
          
          {/* Thin vertical cyan lines */}
          <line x1="120" y1="250" x2="120" y2="700" stroke="#00ffff" strokeWidth="2" opacity="0.5" />
          <line x1="180" y1="250" x2="180" y2="700" stroke="#00ffff" strokeWidth="2" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}
