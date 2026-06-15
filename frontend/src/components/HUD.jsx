const MACHINES_META = [
  { id: 'webserver' }, { id: 'mailserver' }, { id: 'dbserver' }, { id: 'dc' },
];

function formatTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function HUD({ gameState, mode, player, timeLeft }) {
  const { xp = 0, level = 1, pwnedMachines = [], currentMachine = null } = gameState;
  const xpPct   = xp % 100;
  const pwned   = pwnedMachines.length;
  const urgent  = timeLeft < 120;
  const warning = timeLeft < 180;
  const timerColor = urgent ? '#ff0000' : warning ? '#ffaa00' : '#00ff41';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '0 12px', height: '50px',
      background: '#06060c',
      borderBottom: `1px solid ${urgent ? '#ff000033' : '#00ff4122'}`,
      fontFamily: '"Fira Code", monospace', fontSize: '11px',
      flexShrink: 0, overflow: 'hidden', width: '100%',
      transition: 'border-color 0.5s',
    }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#ff2200', letterSpacing: '2px', flexShrink: 0, textShadow: '0 0 8px #ff220066' }}>
        ⚡ CYBER<span style={{ color: '#ff6600' }}>QUEST</span>
      </span>

      {/* Player identity */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0,
        padding: '3px 10px', background: '#0a0a0a',
        border: '1px solid #1a1a2a', borderRadius: '3px',
      }}>
        <span style={{ fontSize: '14px' }}>{player?.emoji || '🧑‍💻'}</span>
        <div>
          <div style={{ color: '#00ff41', fontSize: '11px', fontWeight: 'bold', lineHeight: 1.2 }}>
            {player?.hackerName || 'GHOST'}
          </div>
          <div style={{ color: '#2a2a2a', fontSize: '9px' }}>{player?.role || 'Hacker'}</div>
        </div>
      </div>

      {/* Mode badge */}
      <div style={{
        padding: '3px 9px', borderRadius: '3px', fontSize: '10px', fontWeight: 'bold', flexShrink: 0,
        background: mode === 'MACHINE' ? '#1a0800' : '#001a33',
        border: `1px solid ${mode === 'MACHINE' ? '#ff5500' : '#0055aa'}`,
        color: mode === 'MACHINE' ? '#ff6600' : '#0099ff',
      }}>
        {mode === 'MACHINE' ? `💻 ${currentMachine?.name || ''}` : '🌐 VUE RÉSEAU'}
      </div>

      {/* XP bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <span style={{ color: '#ffaa00', fontSize: '10px' }}>⭐ Niv.{level}</span>
        <div style={{ width: '60px', height: '5px', background: '#111', borderRadius: '3px', border: '1px solid #222' }}>
          <div style={{ width: `${xpPct}%`, height: '100%', background: '#ffaa00', borderRadius: '3px', transition: 'width 0.4s' }} />
        </div>
        <span style={{ color: '#333', fontSize: '10px' }}>{xp}xp</span>
      </div>

      {/* Machines pwned */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <span style={{ color: '#333', fontSize: '10px' }}>💀</span>
        <div style={{ display: 'flex', gap: '3px' }}>
          {MACHINES_META.map(m => (
            <div key={m.id} style={{
              width: '17px', height: '17px', borderRadius: '2px',
              background: pwnedMachines.includes(m.id) ? '#004422' : '#0a0a0a',
              border: `1px solid ${pwnedMachines.includes(m.id) ? '#00ff41' : '#1a1a1a'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', color: '#00ff41',
              boxShadow: pwnedMachines.includes(m.id) ? '0 0 5px #00ff4166' : 'none',
            }}>
              {pwnedMachines.includes(m.id) ? '✓' : ''}
            </div>
          ))}
        </div>
        <span style={{ color: '#333', fontSize: '10px' }}>{pwned}/4</span>
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
          <span style={{ color: '#ff0000', fontSize: '10px', animation: 'blink 0.8s step-end infinite' }}>
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
    </div>
  );
}
