import { useMemo, useState } from 'react';
import { LINUX_LEVELS } from '../levels/linuxLevels';
import CyberpunkCityscape from './CyberpunkCityscape';

const TOTAL = LINUX_LEVELS.length;

function buildNodes(levels) {
  const nodes = [];
  const vGap = 130;
  const amp  = 100;
  const cx   = 200;
  levels.forEach((lvl, i) => {
    const x = cx + Math.sin(i * 1.2) * amp;
    const y = 100 + i * vGap;
    nodes.push({ n: lvl.n, x, y, title: lvl.title });
  });
  return nodes;
}

export default function LinuxLevelMap({ onClose, onSelectLevel, currentLevel = 1, completed = [] }) {
  const [hoveredLevel, setHoveredLevel] = useState(null);
  const nodes  = useMemo(() => buildNodes(LINUX_LEVELS), []);
  const height = 100 + TOTAL * 130 + 80;

  const hoveredNode = hoveredLevel ? LINUX_LEVELS.find(l => l.n === hoveredLevel) : null;

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
    done:    { ring: '#00ff41', fill: 'rgba(0, 255, 65, 0.1)', text: '#00ff41', glow: '#00ff41' },
    current: { ring: '#ffd93d', fill: 'rgba(255, 217, 61, 0.1)', text: '#ffd93d', glow: '#ffd93d' },
    locked:  { ring: '#1a3a1a', fill: '#050a05', text: '#2a5a2a', glow: 'transparent' },
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'radial-gradient(circle at 50% 50%, #020a02 0%, #000 100%)',
      fontFamily: '"Rajdhani", "Fira Code", monospace',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        flex: '0 0 auto', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '14px 22px',
        borderBottom: '1px solid rgba(0, 255, 65, 0.2)', background: 'rgba(2, 10, 2, 0.95)',
        boxShadow: '0 4px 20px rgba(0, 255, 65, 0.05)',
      }}>
        <div>
          <div className="cyber-font" style={{ color: '#00ff41', fontSize: '20px', fontWeight: 'bold', letterSpacing: '3px', textShadow: '0 0 10px #00ff41' }}>
            [ FORMATION — LINUX COMMANDS ]
          </div>
          <div style={{ color: '#2a9a2a', fontSize: '12px', marginTop: '4px', letterSpacing: '1px' }}>
            LOCAL_ENV: BASH · STATUS: {completed.length}/{TOTAL} MODULES
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
        <CyberpunkCityscape height={height} opacity={0.25} color="#00ff41" />
        <div style={{ position: 'relative', width: '400px', maxWidth: '100%', margin: '0 auto', height: `${height}px` }}>
          {/* Connecting path */}
          <svg width="400" height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <defs>
              <linearGradient id="neonPathLinux" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00ff41" />
                <stop offset="100%" stopColor="#ffd93d" />
              </linearGradient>
            </defs>
            <path d={pathD} fill="none" stroke="rgba(0, 255, 65, 0.05)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <path d={pathD} fill="none" stroke="url(#neonPathLinux)" strokeWidth="3" strokeDasharray="4 12" strokeLinecap="round" />
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
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
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
                  onMouseEnter={e => { 
                    if (!isLocked) e.currentTarget.style.transform = 'scale(1.15)'; 
                    setHoveredLevel(nd.n);
                  }}
                  onMouseLeave={e => { 
                    e.currentTarget.style.transform = 'scale(1)'; 
                    setHoveredLevel(null);
                  }}
                >
                  <div style={{
                    position: 'absolute', inset: '2px',
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    background: status === 'locked' ? '#020502' : '#040a04',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: -1
                  }}></div>
                  {status === 'done' ? '✓' : isLocked ? '🔒' : nd.n}
                </button>
                <div style={{
                  position: 'absolute', top: size + 10, left: '50%', transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap', textAlign: 'center', pointerEvents: 'none',
                  background: 'rgba(2, 5, 2, 0.85)', padding: '6px 12px',
                  border: `1px solid ${isLocked ? '#1a3a1a' : c.ring}44`,
                  borderRadius: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(4px)'
                }}>
                  <div className="cyber-font" style={{ color: c.text, fontSize: 14, fontWeight: '600', letterSpacing: '1px', opacity: isLocked ? 0.5 : 1, textShadow: isLocked ? 'none' : `0 0 8px ${c.glow}` }}>
                    {nd.title}
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
