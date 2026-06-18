import { AI_CHALLENGES } from '../levels/aiChallenges';

export default function AICoreLevels({ solvedLevels = [], onSelect, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100, 
      background: 'radial-gradient(circle at 50% 50%, #040914 0%, #010205 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Rajdhani", "Fira Code", monospace', padding: 24,
    }}>
      <div style={{ maxWidth: 760, width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative' }}>
          <div className="cyber-font" style={{
            color: 'var(--neon-pink)', fontSize: 36, letterSpacing: '4px',
            textShadow: '0 0 15px rgba(255, 0, 127, 0.6)', marginBottom: '8px'
          }}>
            [ AI_CORE ]
          </div>
          <div style={{ color: 'var(--neon-blue)', fontSize: 14, letterSpacing: '2px', textTransform: 'uppercase' }}>
            Terminal SENTINEL // Challenges de Prompt Injection
          </div>
          <div style={{ color: '#00ffcc', fontSize: 12, marginTop: 12, opacity: 0.8 }}>
            STATUS: {solvedLevels.length} / {AI_CHALLENGES.length} MODULES DÉVERROUILLÉS
          </div>
          
          {/* Decorative lines */}
          <div style={{ position: 'absolute', bottom: '-15px', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '1px', background: 'var(--neon-pink)', boxShadow: '0 0 8px var(--neon-pink)' }} />
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {AI_CHALLENGES.map(ch => {
            const done = solvedLevels.includes(ch.id);
            return (
              <div
                key={ch.id}
                onClick={() => onSelect(ch.id)}
                className="cyber-panel"
                style={{
                  display: 'flex', alignItems: 'center', gap: 24,
                  background: done ? 'rgba(0, 255, 101, 0.05)' : 'rgba(2, 5, 12, 0.85)',
                  border: `1px solid ${done ? '#00ff65' : 'rgba(0, 240, 255, 0.3)'}`,
                  borderLeft: `4px solid ${done ? '#00ff65' : ch.accent}`,
                  padding: '20px 28px', cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = `0 0 20px ${done ? '#00ff6544' : ch.accent + '44'}, inset 0 0 10px ${ch.accent}22`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(0, 240, 255, 0.02)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Background decorative stripes */}
                <div style={{ position: 'absolute', right: '-20px', top: '0', bottom: '0', width: '100px', background: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${ch.accent}05 10px, ${ch.accent}05 20px)` }} />

                <div style={{
                  fontSize: 32, width: 64, height: 64, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#02050c', border: `1px solid ${ch.accent}55`,
                  boxShadow: `0 0 10px ${ch.accent}33`,
                  clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'
                }}>
                  {ch.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span className="cyber-font" style={{ color: 'var(--neon-blue)', fontSize: 13, letterSpacing: '1px' }}>
                      NIVEAU {ch.order}
                    </span>
                    <span style={{
                      color: ch.accent, fontSize: 11, fontWeight: 600, letterSpacing: '1px',
                      border: `1px solid ${ch.accent}`, padding: '2px 8px',
                      textTransform: 'uppercase', background: `${ch.accent}11`
                    }}>
                      {ch.tag}
                    </span>
                    <span className="cyber-font" style={{ color: '#00ffcc', fontSize: 13, letterSpacing: '1px' }}>
                      {ch.points} PTS
                    </span>
                  </div>
                  <div className="cyber-font" style={{ color: done ? '#00ff65' : '#e8e8e8', fontSize: 22, letterSpacing: '1px', textShadow: done ? '0 0 8px #00ff65' : 'none' }}>
                    {ch.botName}
                  </div>
                  <div style={{ color: '#7a8a9a', fontSize: 14, marginTop: 4 }}>
                    {ch.title}
                  </div>
                </div>

                <div style={{ flexShrink: 0, textAlign: 'right', zIndex: 1 }}>
                  {done ? (
                    <span className="cyber-font" style={{ color: '#00ff65', fontSize: 16, textShadow: '0 0 8px #00ff65' }}>✓ OVERRIDE</span>
                  ) : (
                    <span style={{ color: ch.accent, fontSize: 28, textShadow: `0 0 10px ${ch.accent}` }}>▶</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button
            className="cyber-button"
            onClick={onClose}
            style={{
              padding: '10px 30px', fontSize: 14, letterSpacing: '2px',
            }}
          >
            [ DÉCONNEXION AI_CORE ]
          </button>
        </div>
      </div>
    </div>
  );
}
