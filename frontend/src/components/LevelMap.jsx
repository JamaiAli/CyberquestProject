import { useMemo } from 'react';
import { WEB_LEVELS } from '../levels/webLevels';
import CyberpunkCityscape from './CyberpunkCityscape';

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
    done:    { ring: 'var(--neon-pink)', fill: 'rgba(255, 0, 127, 0.1)', text: 'var(--neon-pink)', glow: 'var(--neon-pink)' },
    current: { ring: 'var(--neon-blue)', fill: 'rgba(0, 240, 255, 0.1)', text: 'var(--neon-blue)', glow: 'var(--neon-blue)' },
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
        borderBottom: '1px solid #1a1a3a', background: '#06080cdd',
        boxShadow: '0 4px 20px #00f0ff11',
      }}>
        <div>
          <div className="cyber-font" style={{ color: 'var(--neon-blue)', fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px', textShadow: '0 0 10px var(--neon-blue)' }}>
            ⛓ TEST D'INTRUSION — WEB APPLICATION
          </div>
          <div style={{ color: 'var(--text)', fontSize: '12px', marginTop: '3px' }}>
            TARGET_IP: 192.168.1.20 | PROGRESS: {completed.length}/{TOTAL_LEVELS}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: '1px solid var(--neon-pink)',
            color: 'var(--neon-pink)', fontFamily: 'Orbitron, sans-serif', fontSize: '12px',
            cursor: 'pointer', padding: '6px 16px', clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#050510'; e.currentTarget.style.background = 'var(--neon-pink)'; e.currentTarget.style.boxShadow = '0 0 15px var(--neon-pink)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--neon-pink)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          ✕ Retour à la carte
        </button>
      </div>

      {/* Scrollable level map */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <CyberpunkCityscape height={height} opacity={0.35} />
        <div style={{ position: 'relative', width: '400px', maxWidth: '100%', margin: '0 auto', height: `${height}px` }}>
          {/* Connecting path */}
          <svg width="400" height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <defs>
              <linearGradient id="neonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--neon-blue)" />
                <stop offset="100%" stopColor="var(--neon-pink)" />
              </linearGradient>
            </defs>
            <path
              d={pathD}
              fill="none"
              stroke="#1a1a3a"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pathD}
              fill="none"
              stroke="url(#neonGradient)"
              strokeWidth="3"
              strokeDasharray="4 12"
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
                    width: size, height: size,
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', // Hexagon shape
                    background: c.fill, border: `2px solid ${c.ring}`,
                    color: c.text, fontFamily: 'Orbitron, sans-serif',
                    fontSize: '18px', fontWeight: 'bold',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    boxShadow: isLocked ? 'none' : `0 0 20px ${c.glow}, inset 0 0 15px ${c.glow}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    animation: status === 'current' ? 'pulse 1.6s ease-in-out infinite' : 'none',
                  }}
                  onMouseEnter={e => { if (!isLocked) e.currentTarget.style.transform = 'scale(1.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {status === 'done' ? '✓' : isLocked ? '🔒' : nd.n}
                </button>
                {/* Level title below the node */}
                <div style={{
                  position: 'absolute', top: size + 10, left: '50%', transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap', textAlign: 'center', pointerEvents: 'none',
                  background: 'rgba(2, 5, 12, 0.85)', padding: '6px 12px',
                  border: `1px solid ${isLocked ? '#1a2a3a' : c.ring}44`,
                  borderRadius: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(4px)'
                }}>
                  <div className="cyber-font" style={{ color: c.text, fontSize: 14, fontWeight: '600', letterSpacing: '1px', opacity: isLocked ? 0.5 : 1, textShadow: isLocked ? 'none' : `0 0 8px ${c.glow}` }}>
                    {nd.title}
                  </div>
                  <div style={{ color: '#2a8a5a', fontSize: 11, marginTop: 3, opacity: isLocked ? 0.4 : 0.9, letterSpacing: '0.5px' }}>
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
