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

export default function CharacterSelect({ onSelect }) {
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');

  const launch = () => {
    if (!selected) return;
    onSelect({ ...selected, hackerName: name.trim() || selected.name });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Fira Code", monospace', overflow: 'hidden',
    }}>
      <MatrixRain opacity={0.08} />

      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '800px', padding: '0 20px' }}>
        {/* Title */}
        <div style={{ color: '#ff0000', fontSize: '34px', fontWeight: 'bold', letterSpacing: '6px', marginBottom: '4px', textShadow: '0 0 20px #ff000088' }}>
          ⚡ CYBERQUEST
        </div>
        <div style={{ color: '#333', fontSize: '11px', letterSpacing: '3px', marginBottom: '8px' }}>
          NEXUS CORP INFILTRATION — 2031
        </div>
        <div style={{ color: '#1a4a1a', fontSize: '11px', marginBottom: '36px', lineHeight: '1.6' }}>
          La mégacorporation NEXUS Corp a volé les données de 50 millions de citoyens.<br />
          Tu es leur seul espoir. Infiltre leur réseau. Récupère les preuves. Tout balancer.
        </div>

        {/* Character cards */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', justifyContent: 'center' }}>
          {CHARACTERS.map(char => {
            const isSel = selected?.id === char.id;
            return (
              <div key={char.id} onClick={() => setSelected(char)} style={{
                width: '210px', padding: '18px 16px', cursor: 'pointer',
                background: isSel ? '#060f06' : '#050505',
                border: `2px solid ${isSel ? '#00ff41' : '#1a1a1a'}`,
                borderRadius: '4px', transition: 'all 0.15s',
                transform: isSel ? 'scale(1.04)' : 'scale(1)',
                boxShadow: isSel ? '0 0 20px #00ff4133' : 'none',
                textAlign: 'left',
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>{char.emoji}</div>
                <div style={{ color: '#00ff41', fontWeight: 'bold', fontSize: '13px', marginBottom: '2px' }}>{char.name}</div>
                <div style={{ color: '#555', fontSize: '10px', marginBottom: '10px' }}>{char.role} — {char.specialty}</div>
                <div style={{ color: '#3a3a3a', fontSize: '10px', lineHeight: '1.6', marginBottom: '10px' }}>{char.bio}</div>
                <div style={{ padding: '5px 8px', background: '#0a0a00', border: '1px solid #2a2a00', borderRadius: '3px', color: '#aaaa00', fontSize: '9px' }}>
                  ⭐ {char.bonus}
                </div>
                {isSel && (
                  <div style={{ marginTop: '8px', color: '#224422', fontSize: '9px', lineHeight: '1.5', borderTop: '1px solid #111', paddingTop: '8px' }}>
                    💡 {char.startingHint}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Name input */}
        <div style={{ marginBottom: '24px', opacity: selected ? 1 : 0, transition: 'opacity 0.3s' }}>
          <div style={{ color: '#2a2a2a', fontSize: '11px', marginBottom: '8px' }}>
            {'>'} Ton alias sur le réseau :
          </div>
          <input
            value={name}
            onChange={e => setName(e.target.value.toUpperCase().slice(0, 12))}
            onKeyDown={e => e.key === 'Enter' && launch()}
            placeholder={selected?.name || 'GHOST'}
            style={{
              background: 'transparent', border: '1px solid #00ff41',
              color: '#00ff41', padding: '8px 20px',
              fontFamily: 'monospace', fontSize: '16px',
              textAlign: 'center', outline: 'none', width: '200px',
              letterSpacing: '3px',
            }}
          />
        </div>

        {/* Launch button */}
        <button
          onClick={launch}
          disabled={!selected}
          style={{
            background: 'transparent',
            border: `2px solid ${selected ? '#00ff41' : '#222'}`,
            color: selected ? '#00ff41' : '#222',
            padding: '12px 44px', fontFamily: 'monospace',
            fontSize: '13px', cursor: selected ? 'pointer' : 'default',
            letterSpacing: '3px', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (selected) e.target.style.background = '#00ff4115'; }}
          onMouseLeave={e => { e.target.style.background = 'transparent'; }}
        >
          [ LANCER LA MISSION ]
        </button>
      </div>
    </div>
  );
}
