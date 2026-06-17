import { useMemo } from 'react';
import { AD_LEVELS } from '../levels/adLevels';

const TOTAL = AD_LEVELS.length;

function buildNodes(levels) {
  const nodes = [];
  const vGap = 150;
  const amp  = 130;
  const cx   = 200;
  levels.forEach((lvl, i) => {
    const x = cx + Math.sin(i * 0.9) * amp;
    const y = 100 + i * vGap;
    nodes.push({ n: lvl.n, x, y, title: lvl.title, mitre: lvl.mitre });
  });
  return nodes;
}

export default function ADLevelMap({ onClose, onSelectLevel, currentLevel = 1, completed = [] }) {
  const nodes  = useMemo(() => buildNodes(AD_LEVELS), []);
  const height = 100 + TOTAL * 150 + 80;

  const pathD = nodes
    .map((nd, i) => `${i === 0 ? 'M' : 'L'} ${nd.x} ${nd.y}`)
    .join(' ');

  const statusOf = (n) => {
    if (completed.includes(n)) return 'done';
    if (n === currentLevel)    return 'current';
    if (n < currentLevel)      return 'done';
    return 'locked';
  };

  const COLORS = {
    done:    { ring: '#00aaff', fill: '#060f1a', text: '#00aaff', glow: '#00aaff' },
    current: { ring: '#00ffff', fill: '#031a1f', text: '#00ffff', glow: '#00ffff' },
    locked:  { ring: '#1a2a3a', fill: '#08090e', text: '#2a3a4a', glow: 'transparent' },
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'radial-gradient(ellipse at 50% 0%, #060f1a 0%, #050508 70%)',
      fontFamily: '"Fira Code", monospace',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        flex: '0 0 auto', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '14px 22px',
        borderBottom: '1px solid #0a2a3a', background: '#06080cdd',
        boxShadow: '0 4px 20px #00aaff11',
      }}>
        <div>
          <div style={{ color: '#00aaff', fontSize: '16px', fontWeight: 'bold', letterSpacing: '2px' }}>
            ⛓ TEST D'INTRUSION — ACTIVE DIRECTORY
          </div>
          <div style={{ color: '#2a5a7a', fontSize: '11px', marginTop: '3px' }}>
            192.168.1.10 · corp.local · {completed.length}/{TOTAL} étapes validées
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: '1px solid #1a3a4a',
            color: '#3a7a9a', fontFamily: 'monospace', fontSize: '12px',
            cursor: 'pointer', padding: '6px 16px', borderRadius: '4px',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#00aaff'; e.currentTarget.style.borderColor = '#00aaff'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#3a7a9a'; e.currentTarget.style.borderColor = '#1a3a4a'; }}
        >
          ✕ Retour à la carte
        </button>
      </div>

      {/* Scrollable level map */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <div style={{ position: 'relative', width: '400px', maxWidth: '100%', margin: '0 auto', height: `${height}px` }}>
          {/* Connecting path */}
          <svg width="400" height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <path d={pathD} fill="none" stroke="#0a2a3a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d={pathD} fill="none" stroke="#00aaff33" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" />
          </svg>

          {/* Nodes */}
          {nodes.map((nd) => {
            const status  = statusOf(nd.n);
            const c       = COLORS[status];
            const isLocked = status === 'locked';
            const size    = status === 'current' ? 64 : 56;
            return (
              <div key={nd.n} style={{ position: 'absolute', left: nd.x, top: nd.y, transform: 'translate(-50%,-50%)' }}>
                <button
                  disabled={isLocked}
                  onClick={() => !isLocked && onSelectLevel?.(nd.n)}
                  title={isLocked ? 'Verrouillé — termine l\'étape précédente' : nd.title}
                  style={{
                    width: size, height: size, borderRadius: '50%',
                    background: c.fill, border: `2px solid ${c.ring}`,
                    color: c.text, fontFamily: '"Fira Code", monospace',
                    fontSize: '18px', fontWeight: 'bold',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    boxShadow: isLocked ? 'none' : `0 0 16px ${c.glow}66, inset 0 0 10px ${c.glow}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.12s ease',
                    animation: status === 'current' ? 'pulse 1.6s ease-in-out infinite' : 'none',
                  }}
                  onMouseEnter={e => { if (!isLocked) e.currentTarget.style.transform = 'scale(1.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {status === 'done' ? '✓' : isLocked ? '🔒' : nd.n}
                </button>
                <div style={{
                  position: 'absolute', top: size + 6, left: '50%', transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap', textAlign: 'center', pointerEvents: 'none',
                }}>
                  <div style={{ color: c.text, fontSize: 11, fontWeight: 'bold', opacity: isLocked ? 0.4 : 1 }}>
                    {nd.title}
                  </div>
                  <div style={{ color: '#1a4a6a', fontSize: 9, marginTop: 1, opacity: isLocked ? 0.3 : 0.8 }}>
                    {nd.mitre?.split('·')[0]?.trim()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
