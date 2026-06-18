import { useEffect, useRef, useState } from 'react';

export default function IntroScreen({ hackerName, onDone, onLogout }) {
  const [lines, setLines] = useState([]);
  const [done, setDone] = useState(false);

  const SEQUENCE = [
    { text: '> Séquence d\'amorçage du terminal...', color: 'var(--neon-blue)', delay: 0 },
    { text: '> Connexion au réseau fantôme......... [OK]', color: 'var(--neon-blue)', delay: 700 },
    { text: '> Routage quantique activé............ [OK]', color: 'var(--neon-blue)', delay: 1300 },
    { text: '> Brouillage de l\'empreinte........... [OK]', color: 'var(--neon-blue)', delay: 1900 },
    { text: '', delay: 2400 },
    { text: '> CIBLE : Architecture NEXUS Corp', color: 'var(--neon-pink)', delay: 2900 },
    { text: '> Niveau de menace : CRITIQUE', color: '#ff2200', delay: 3500 },
    { text: '', delay: 4100 },
    { text: `> Bienvenue dans les ombres, Opérateur ${hackerName}.`, color: '#00ffcc', delay: 4500 },
    { text: '> ORACLE > Ta cible ultime est AI_CORE.', color: 'var(--neon-pink)', delay: 5200 },
    { text: '> ORACLE > Infiltre l\'Active Directory pour ouvrir la voie.', color: 'var(--neon-pink)', delay: 6000 },
    { text: '> ORACLE > Ne laisse aucune trace.', color: '#00ffcc', delay: 6800 },
    { text: '', delay: 7500 },
  ];

  useEffect(() => {
    const timers = SEQUENCE.map(({ text, color, delay }) =>
      setTimeout(() => setLines(l => [...l, { text, color }]), delay)
    );
    const done = setTimeout(() => setDone(true), 7700);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'radial-gradient(circle at 50% 50%, #040914 0%, #010205 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Rajdhani", "Fira Code", monospace',
      zIndex: 10000
    }}>
      {onLogout && (
        <button
          onClick={onLogout}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 100,
            background: 'transparent',
            border: '1px solid #ff333355',
            color: '#ff3333bb',
            fontFamily: 'monospace',
            fontSize: '10px',
            cursor: 'pointer',
            padding: '6px 14px',
            borderRadius: '3px',
            letterSpacing: '1px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            e.target.style.color = '#ff3333';
            e.target.style.borderColor = '#ff3333';
            e.target.style.background = 'rgba(255, 51, 51, 0.05)';
          }}
          onMouseLeave={e => {
            e.target.style.color = '#ff3333bb';
            e.target.style.borderColor = '#ff333355';
            e.target.style.background = 'transparent';
          }}
        >
          ❌ DECONNEXION
        </button>
      )}
      <div style={{ position: 'relative' }}>
        <div className="cyber-panel" style={{ 
          width: '600px', maxWidth: '90vw', 
          padding: '40px', 
          background: 'rgba(2, 5, 12, 0.85)', 
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderTop: '2px solid var(--neon-pink)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.05), inset 0 0 20px rgba(0, 240, 255, 0.02)', 
          position: 'relative' 
        }}>
          {lines.map((l, i) => (
          <div key={i} style={{
            color: l.color || 'var(--neon-blue)', fontSize: '15px', fontWeight: '500',
            lineHeight: '2.2', animation: 'fadeIn 0.2s ease',
            textShadow: `0 0 8px ${l.color || 'var(--neon-blue)'}`
          }}>
            {l.text}
          </div>
        ))}
          {/* Blinking cursor */}
          <span style={{ color: 'var(--neon-blue)', animation: 'blink 1s step-end infinite', fontSize: '15px', textShadow: '0 0 8px var(--neon-blue)' }}>█</span>
        </div>
        <div className="cyber-font" style={{ position: 'absolute', top: '-12px', right: '20px', background: '#02050c', padding: '0 10px', color: 'var(--neon-pink)', fontSize: '14px', letterSpacing: '2px', zIndex: 10 }}>
          SYS.BOOT
        </div>
      </div>

      {done && (
        <button
          className="cyber-button"
          onClick={onDone}
          style={{
            marginTop: '50px',
            padding: '12px 40px',
            fontSize: '16px',
            letterSpacing: '3px',
            animation: 'fadeIn 0.5s ease',
          }}
        >
          [ COMMENCER L'INFILTRATION ]
        </button>
      )}
    </div>
  );
}
