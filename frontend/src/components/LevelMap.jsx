import { useMemo } from 'react';
import { WEB_LEVELS } from '../levels/webLevels';

const TOTAL_LEVELS = WEB_LEVELS.length; // 6

// Generates a winding S-curve path of nodes (Candy-Crush style) going top→bottom.
function buildNodes(levels) {
  const nodes = [];
  const vGap = 150;
  const amp  = 130;
  const cx   = 200;
  levels.forEach((lvl, i) => {
    const x = cx + Math.sin(i * 0.9) * amp;
    const y = 100 + i * vGap;
    nodes.push({ n: lvl.n, x, y, title: lvl.title, owasp: lvl.owasp });
  });
  return nodes;
}

export default function LevelMap({ onClose, onSelectLevel, currentLevel = 1, completed = [] }) {
  const nodes  = useMemo(() => buildNodes(WEB_LEVELS), []);
  const height = 100 + TOTAL_LEVELS * 150 + 80;

  // Build the connecting path string (smooth-ish poly-line through node centers)
  const pathD = nodes
    .map((nd, i) => `${i === 0 ? 'M' : 'L'} ${nd.x} ${nd.y}`)
    .join(' ');

  const statusOf = (n) => {
    if (completed.includes(n)) return 'done';
    if (n === currentLevel) return 'current';
    if (n < currentLevel) return 'done';
    return 'locked';
  };

  const COLORS = {
    done:    { ring: '#00ff41', fill: '#0a1f0a', text: '#00ff41', glow: '#00ff41' },
    current: { ring: '#00ffff', fill: '#031a1f', text: '#00ffff', glow: '#00ffff' },
    locked:  { ring: '#243044', fill: '#0a0e16', text: '#3a4860', glow: 'transparent' },
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'radial-gradient(ellipse at 50% 0%, #0a1420 0%, #050508 70%)',
      fontFamily: '"Fira Code", monospace',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        flex: '0 0 auto', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '14px 22px',
        borderBottom: '1px solid #11331c', background: '#06080cdd',
        boxShadow: '0 4px 20px #00ff4111',
      }}>
        <div>
          <div style={{ color: '#00ff41', fontSize: '16px', fontWeight: 'bold', letterSpacing: '2px' }}>
            ⛓ TEST D'INTRUSION — WEB APPLICATION
          </div>
          <div style={{ color: '#4a6a55', fontSize: '11px', marginTop: '3px' }}>
            192.168.1.20 · {completed.length}/{TOTAL_LEVELS} étapes validées
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: '1px solid #1a3a26',
            color: '#5a8a6a', fontFamily: 'monospace', fontSize: '12px',
            cursor: 'pointer', padding: '6px 16px', borderRadius: '4px',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#00ff41'; e.currentTarget.style.borderColor = '#00ff41'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5a8a6a'; e.currentTarget.style.borderColor = '#1a3a26'; }}
        >
          ✕ Retour à la carte
        </button>
      </div>

      {/* Scrollable level map */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <div style={{ position: 'relative', width: '400px', maxWidth: '100%', margin: '0 auto', height: `${height}px` }}>
          {/* Connecting path */}
          <svg width="400" height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <path
              d={pathD}
              fill="none"
              stroke="#11331c"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pathD}
              fill="none"
              stroke="#00ff4133"
              strokeWidth="2"
              strokeDasharray="2 10"
              strokeLinecap="round"
            />
          </svg>

          {/* Nodes */}
          {nodes.map((nd) => {
            const status = statusOf(nd.n);
            const c = COLORS[status];
            const isLocked = status === 'locked';
            const size = status === 'current' ? 64 : 56;
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
                {/* Level title below the node */}
                <div style={{
                  position: 'absolute', top: size + 6, left: '50%', transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap', textAlign: 'center', pointerEvents: 'none',
                }}>
                  <div style={{ color: c.text, fontSize: 11, fontWeight: 'bold', opacity: isLocked ? 0.4 : 1 }}>
                    {nd.title}
                  </div>
                  <div style={{ color: '#3a5a45', fontSize: 9, marginTop: 1, opacity: isLocked ? 0.3 : 0.8 }}>
                    {nd.owasp?.split('·')[0]?.trim()}
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
