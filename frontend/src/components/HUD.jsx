const MACHINES_META = [
  { id: 'webserver' }, { id: 'mailserver' }, { id: 'aicore' }
];

function formatTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function HUD({ gameState, mode, player, timeLeft, onLogout, onShowScores, onTestEndgame }) {
  const { xp = 0, level = 1, pwnedMachines = [], currentMachine = null, sessionId = '' } = gameState;
  const xpPct   = xp % 100;
  const pwned   = pwnedMachines.length;
  const urgent  = timeLeft < 120;
  const warning = timeLeft < 180;
  const timerColor = urgent ? '#ff007f' : warning ? '#ffaa00' : '#00f0ff';

  return (
    <div className="cyber-panel" style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '0 12px', height: '50px',
      background: 'rgba(5, 5, 12, 0.95)',
      borderBottom: `2px solid ${urgent ? 'var(--neon-pink)' : 'var(--neon-blue)'}`,
      boxShadow: `0 4px 15px ${urgent ? 'rgba(255, 0, 127, 0.3)' : 'rgba(0, 240, 255, 0.15)'}`,
      fontFamily: '"Rajdhani", monospace', fontSize: '12px',
      flexShrink: 0, overflow: 'hidden', width: '100%',
      transition: 'border-color 0.5s',
    }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      <span className="cyber-font glow" style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--neon-pink)', letterSpacing: '3px', flexShrink: 0 }}>
        ⚡ CYBER<span style={{ color: 'var(--neon-blue)' }}>QUEST</span>
      </span>

      {/* Player identity */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0,
        padding: '3px 10px', background: 'rgba(0, 240, 255, 0.05)',
        border: '1px solid var(--neon-blue)',
        clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)'
      }}>
        <span style={{ fontSize: '16px' }}>{player?.emoji || '🧑‍💻'}</span>
        <div>
          <div className="cyber-font" style={{ color: 'var(--neon-blue)', fontSize: '12px', fontWeight: 'bold', lineHeight: 1.2 }}>
            {player?.hackerName || 'GHOST'} <span style={{ color: '#aaa', fontSize: '9px', fontWeight: 'normal' }}>({sessionId})</span>
          </div>
          <div style={{ color: '#a0a0ff', fontSize: '10px' }}>{player?.role || 'Hacker'}</div>
        </div>
      </div>

      {/* Mode badge */}
      <div className="cyber-font" style={{
        padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', flexShrink: 0,
        background: mode === 'MACHINE' ? 'rgba(255, 0, 127, 0.1)' : 'rgba(0, 240, 255, 0.1)',
        border: `1px solid ${mode === 'MACHINE' ? 'var(--neon-pink)' : 'var(--neon-blue)'}`,
        color: mode === 'MACHINE' ? 'var(--neon-pink)' : 'var(--neon-blue)',
        clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)'
      }}>
        {mode === 'MACHINE' ? `💻 ${currentMachine?.name || ''}` : '🌐 VUE RÉSEAU'}
      </div>



      {/* Machine phases */}
      {mode === 'MACHINE' && currentMachine && (
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {['Recon', 'Scan', 'Exploit', 'Post'].map((p, i) => (
            <span key={p} style={{
              padding: '2px 6px', borderRadius: '2px', fontSize: '9px',
              background: i < (gameState.machinePhase || 0) ? '#051a05' : i === (gameState.machinePhase || 0) ? '#0d1a00' : '#0a0a0a',
              border: `1px solid ${i < (gameState.machinePhase || 0) ? '#00aa44' : i === (gameState.machinePhase || 0) ? '#88cc00' : '#1a1a1a'}`,
              color: i < (gameState.machinePhase || 0) ? '#00aa44' : i === (gameState.machinePhase || 0) ? '#aaff00' : '#222',
            }}>
              {i < (gameState.machinePhase || 0) ? '✓' : i === (gameState.machinePhase || 0) ? '▶' : '○'} {p}
            </span>
          ))}
        </div>
      )}

      {/* Timer */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {urgent && (
          <span style={{ color: '#ff007f', fontSize: '10px', animation: 'blink 0.8s step-end infinite' }}>
            ⚠ TRACÉ IMMINENT
          </span>
        )}
        <span style={{
          color: timerColor, fontSize: '15px', fontWeight: 'bold',
          fontFamily: 'monospace', letterSpacing: '2px',
          textShadow: `0 0 8px ${timerColor}66`,
          animation: timeLeft < 60 ? 'blink 0.5s step-end infinite' : 'none',
        }}>
          ⏱ {formatTime(timeLeft)}
        </span>
      </div>

      {/* Actions (Scores et Déconnexion) */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, paddingLeft: '6px' }}>
        {onTestEndgame && (
          <button className="cyber-btn glow" onClick={onTestEndgame} style={{
            padding: '4px 10px', fontSize: '11px', borderColor: '#ff0000', color: '#ff0000'
          }}>
            ☢ TEST ENDGAME
          </button>
        )}
        {onShowScores && (
          <button className="cyber-btn glow" onClick={onShowScores} style={{
            padding: '4px 10px', fontSize: '11px',
          }}>
            🏆 SCORES
          </button>
        )}
        {onLogout && (
          <button className="cyber-btn" onClick={onLogout} style={{
            padding: '4px 10px', fontSize: '11px', borderColor: 'var(--neon-pink)', color: 'var(--neon-pink)'
          }}>
            ❌ DÉCONNEXION
          </button>
        )}
      </div>
    </div>
  );
}
