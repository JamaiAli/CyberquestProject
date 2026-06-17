import { useEffect, useRef, useState } from 'react';

export default function IntroScreen({ hackerName, onDone, onLogout }) {
  const [lines, setLines] = useState([]);
  const [done, setDone] = useState(false);

  const SEQUENCE = [
    { text: '> Initialisation du système...', color: '#00ff41', delay: 0 },
    { text: '> Connexion VPN chiffrée......... [OK]', color: '#00ff41', delay: 700 },
    { text: '> Tor routing activé............. [OK]', color: '#00ff41', delay: 1300 },
    { text: '> Identité masquée............... [OK]', color: '#00ff41', delay: 1900 },
    { text: '', delay: 2400 },
    { text: '> MISSION : Infiltrer NEXUS Corp', color: '#ffff00', delay: 2900 },
    { text: '> Réseau cible : 192.168.1.0/24', color: '#ffff00', delay: 3500 },
    { text: '> Niveau de sécurité : CRITIQUE', color: '#ff3300', delay: 4100 },
    { text: '', delay: 4600 },
    { text: `> Opérateur identifié : ${hackerName}`, color: '#00ffff', delay: 5000 },
    { text: '> Tu as 6 minutes avant d\'être tracé.', color: '#ff6600', delay: 5600 },
    { text: '', delay: 6100 },
    { text: '> ORACLE > Bienvenue, ' + hackerName + '. Le réseau est en face de toi.', color: '#cc44ff', delay: 6500 },
    { text: '> ORACLE > Commence par nmap 192.168.1.0/24', color: '#cc44ff', delay: 7300 },
    { text: '> ORACLE > Et surtout... ne te fais pas tracer.', color: '#cc44ff', delay: 8000 },
    { text: '', delay: 8700 },
  ];

  useEffect(() => {
    const timers = SEQUENCE.map(({ text, color, delay }) =>
      setTimeout(() => setLines(l => [...l, { text, color }]), delay)
    );
    const done = setTimeout(() => setDone(true), 8900);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Fira Code", monospace',
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
      <div style={{ width: '560px', maxWidth: '90vw' }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            color: l.color || '#00ff41', fontSize: '13px',
            lineHeight: '2', animation: 'fadeIn 0.2s ease',
          }}>
            {l.text}
          </div>
        ))}
        {/* Blinking cursor */}
        <span style={{ color: '#00ff41', animation: 'blink 1s step-end infinite', fontSize: '13px' }}>█</span>
      </div>

      {done && (
        <button
          onClick={onDone}
          style={{
            marginTop: '40px', background: 'transparent',
            border: '1px solid #00ff41', color: '#00ff41',
            padding: '10px 36px', fontFamily: 'monospace',
            fontSize: '13px', cursor: 'pointer', letterSpacing: '2px',
            animation: 'fadeIn 0.5s ease',
          }}
          onMouseEnter={e => { e.target.style.background = '#00ff4115'; }}
          onMouseLeave={e => { e.target.style.background = 'transparent'; }}
        >
          [ COMMENCER L'INFILTRATION ]
        </button>
      )}
    </div>
  );
}
