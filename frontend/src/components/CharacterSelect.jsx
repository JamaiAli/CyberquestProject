import { useState } from 'react';
import MatrixRain from './MatrixRain';

const CHARACTERS = [
  {
    id: 'ghost',
    name: 'GHOST',
    emoji: '🧑‍💻',
    role: 'Hacktiviste',
    specialty: 'Web & SQL Injection',
    bonus: '+20% XP sur exploit web',
    bio: 'Ancienne ingénieure NEXUS Corp reconvertie. Connaît le réseau de l\'intérieur.',
    startingHint: "L'Active Directory tourne Apache 2.4.49 — une CVE critique existe.",
    xpMultiplier: { sqlmap: 1.2, hydra: 1.0, nmap: 1.0 },
  },
  {
    id: 'phantom',
    name: 'PHANTOM',
    emoji: '👤',
    role: 'Spécialiste réseau',
    specialty: 'Scanning & Pivoting',
    bonus: '+20% XP sur les scans nmap',
    bio: 'Militaire reconverti. Cartographie les réseaux comme un champ de bataille.',
    startingHint: 'Scanne tous les ports. Les services cachés sont les plus vulnérables.',
    xpMultiplier: { nmap: 1.2, sqlmap: 1.0, hydra: 1.0 },
  },
  {
    id: 'viper',
    name: 'VIPER',
    emoji: '🐍',
    role: 'Social Engineer',
    specialty: 'Credentials & Brute-force',
    bonus: '+20% XP sur hydra & creds',
    bio: 'Maître de l\'ingénierie sociale. Les mots de passe n\'ont aucun secret.',
    startingHint: 'Les admins réutilisent leurs mots de passe. Toujours.',
    xpMultiplier: { hydra: 1.2, sqlmap: 1.0, nmap: 1.0 },
  },
];

export default function CharacterSelect({ onSelect, onLogout }) {
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');

  const launch = () => {
    if (!selected) return;
    onSelect({ ...selected, hackerName: name.trim() || selected.name });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Rajdhani", monospace', overflow: 'hidden',
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

      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '800px', padding: '0 20px' }}>
        {/* Title */}
        <div className="cyber-font glow" style={{ color: 'var(--neon-pink)', fontSize: '40px', fontWeight: 'bold', letterSpacing: '6px', marginBottom: '4px' }}>
          ⚡ CYBERQUEST
        </div>
        <div style={{ color: 'var(--neon-blue)', fontSize: '13px', letterSpacing: '3px', marginBottom: '8px', textTransform: 'uppercase' }}>
          NEXUS CORP INFILTRATION — 2077
        </div>
        <div style={{ color: '#a0a0ff', fontSize: '12px', marginBottom: '36px', lineHeight: '1.6' }}>
          La mégacorporation NEXUS Corp a volé les données de 50 millions de citoyens.<br />
          Tu es leur seul espoir. Infiltre leur réseau. Récupère les preuves. Tout balancer.
        </div>

        {/* Character cards */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', justifyContent: 'center' }}>
          {CHARACTERS.map(char => {
            const isSel = selected?.id === char.id;
            return (
              <div key={char.id} className={isSel ? "cyber-panel" : ""} onClick={() => setSelected(char)} style={{
                width: '210px', padding: '18px 16px', cursor: 'pointer',
                background: isSel ? 'rgba(10, 10, 26, 0.8)' : 'rgba(5, 5, 10, 0.6)',
                border: `1px solid ${isSel ? 'var(--neon-blue)' : '#2a2a4a'}`,
                transition: 'all 0.15s',
                transform: isSel ? 'scale(1.04)' : 'scale(1)',
                boxShadow: isSel ? '0 0 20px rgba(0, 240, 255, 0.2)' : 'none',
                textAlign: 'left',
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>{char.emoji}</div>
                <div className="cyber-font" style={{ color: 'var(--neon-blue)', fontWeight: 'bold', fontSize: '15px', marginBottom: '2px', letterSpacing: '1px' }}>{char.name}</div>
                <div style={{ color: '#a0a0ff', fontSize: '11px', marginBottom: '10px' }}>{char.role} — {char.specialty}</div>
                <div style={{ color: '#7777aa', fontSize: '11px', lineHeight: '1.6', marginBottom: '10px' }}>{char.bio}</div>
                <div style={{ padding: '5px 8px', background: 'rgba(252, 238, 10, 0.1)', border: '1px solid var(--neon-yellow)', borderRadius: '3px', color: 'var(--neon-yellow)', fontSize: '10px' }}>
                  ⭐ {char.bonus}
                </div>
                {isSel && (
                  <div style={{ marginTop: '8px', color: 'var(--neon-blue)', fontSize: '10px', lineHeight: '1.5', borderTop: '1px solid #2a2a4a', paddingTop: '8px' }}>
                    💡 {char.startingHint}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Name input */}
        <div style={{ marginBottom: '24px', opacity: selected ? 1 : 0, transition: 'opacity 0.3s' }}>
          <div style={{ color: 'var(--text)', fontSize: '13px', marginBottom: '8px' }}>
            {'>'} Ton alias sur le réseau :
          </div>
          <input
            value={name}
            onChange={e => setName(e.target.value.toUpperCase().slice(0, 12))}
            onKeyDown={e => e.key === 'Enter' && launch()}
            placeholder={selected?.name || 'GHOST'}
            style={{
              background: 'rgba(0, 240, 255, 0.05)', border: '1px solid var(--neon-blue)',
              color: 'var(--neon-blue)', padding: '8px 20px',
              fontFamily: 'Orbitron, sans-serif', fontSize: '18px',
              textAlign: 'center', outline: 'none', width: '220px',
              letterSpacing: '3px',
              clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'
            }}
          />
        </div>

        {/* Launch button */}
        <button
          className={selected ? "cyber-btn glow" : ""}
          onClick={launch}
          disabled={!selected}
          style={{
            padding: '14px 48px', fontSize: '15px', letterSpacing: '3px',
            opacity: selected ? 1 : 0.5,
            border: selected ? undefined : '1px solid #444',
            color: selected ? undefined : '#444'
          }}
        >
          [ LANCER LA MISSION ]
        </button>
      </div>
    </div>
  );
}
