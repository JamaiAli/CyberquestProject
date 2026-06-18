import { useMemo } from 'react';
import { AD_LEVELS } from '../levels/adLevels';
import CyberpunkCityscape from './CyberpunkCityscape';

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
    done:    { ring: 'var(--neon-blue)', fill: 'rgba(0, 240, 255, 0.1)', text: 'var(--neon-blue)', glow: 'var(--neon-blue)' },
    current: { ring: '#00ff65', fill: 'rgba(0, 255, 101, 0.1)', text: '#00ff65', glow: '#00ff65' },
    locked:  { ring: '#1a2a3a', fill: '#050a12', text: '#2a4a6a', glow: 'transparent' },
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'radial-gradient(circle at 50% 50%, #040914 0%, #010205 100%)',
      fontFamily: '"Rajdhani", "Fira Code", monospace',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        flex: '0 0 auto', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '14px 22px',
        borderBottom: '1px solid rgba(0, 240, 255, 0.2)', background: 'rgba(2, 5, 12, 0.95)',
        boxShadow: '0 4px 20px rgba(0, 240, 255, 0.05)',
      }}>
        <div>
          <div className="cyber-font" style={{ color: 'var(--neon-blue)', fontSize: '20px', fontWeight: 'bold', letterSpacing: '3px', textShadow: '0 0 10px var(--neon-blue)' }}>
            [ TEST D'INTRUSION — ACTIVE DIRECTORY ]
          </div>
          <div style={{ color: '#00ffcc', fontSize: '12px', marginTop: '4px', letterSpacing: '1px' }}>
            TARGET_IP: 192.168.1.10 · DOMAIN: corp.local · STATUS: {completed.length}/{TOTAL} OVERRIDDEN
          </div>
        </div>
        <button
          className="cyber-button"
          onClick={onClose}
          style={{
            padding: '8px 20px', fontSize: '13px', letterSpacing: '1px'
          }}
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
              <linearGradient id="neonPathAD" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--neon-blue)" />
                <stop offset="100%" stopColor="#00ff65" />
              </linearGradient>
            </defs>
            <path d={pathD} fill="none" stroke="rgba(0, 240, 255, 0.05)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <path d={pathD} fill="none" stroke="url(#neonPathAD)" strokeWidth="3" strokeDasharray="4 12" strokeLinecap="round" />
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
                    width: size, height: size,
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', // Hexagon shape
                    background: c.fill,
                    color: c.text, fontFamily: '"Rajdhani", "Fira Code", monospace',
                    fontSize: '20px', fontWeight: 'bold',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    boxShadow: isLocked ? 'none' : `0 0 20px ${c.glow}, inset 0 0 15px ${c.glow}`,
                    border: 'none',
                    position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    animation: status === 'current' ? 'pulse 1.6s ease-in-out infinite' : 'none',
                  }}
                  onMouseEnter={e => { if (!isLocked) e.currentTarget.style.transform = 'scale(1.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {/* Inner hexagon for border effect since clip-path cuts real borders */}
                  <div style={{
                    position: 'absolute', inset: '2px',
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    background: status === 'locked' ? '#080d16' : '#040912',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: -1
                  }}></div>
                  {status === 'done' ? '✓' : isLocked ? '🔒' : nd.n}
                </button>
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
                  <div style={{ color: '#2a6a8a', fontSize: 11, marginTop: 3, opacity: isLocked ? 0.4 : 0.9, letterSpacing: '0.5px' }}>
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
