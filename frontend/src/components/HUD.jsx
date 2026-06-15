const MACHINES_META = [
  { id: 'webserver',  difficulty: 'easy' },
  { id: 'mailserver', difficulty: 'medium' },
  { id: 'dbserver',   difficulty: 'medium' },
  { id: 'dc',         difficulty: 'hard' },
];

export default function HUD({ gameState, mode }) {
  const { xp = 0, level = 1, pwnedMachines = [], currentMachine = null } = gameState;
  const xpPct = xp % 100;

  const totalTargets = MACHINES_META.length;
  const pwnedCount = pwnedMachines.length;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '18px',
      padding: '0 14px',
      height: '52px',
      background: '#08080e',
      borderBottom: '1px solid #00ff4133',
      color: '#00ff41',
      fontFamily: '"Fira Code", monospace',
      fontSize: '11px',
      flexShrink: 0,
      overflow: 'hidden',
      width: '100%',
    }}>
      {/* Title */}
      <span className="glow" style={{ fontWeight: 'bold', fontSize: '14px', color: '#ff4444', letterSpacing: '2px', flexShrink: 0 }}>
        ⚔ CYBERQUEST
      </span>

      {/* Mode badge */}
      <div style={{
        padding: '2px 10px', borderRadius: '3px', fontSize: '10px', fontWeight: 'bold', flexShrink: 0,
        background: mode === 'MACHINE' ? '#1a0800' : '#00180a',
        border: `1px solid ${mode === 'MACHINE' ? '#ff6600' : '#00aa44'}`,
        color: mode === 'MACHINE' ? '#ff6600' : '#00ff41',
      }}>
        {mode === 'MACHINE' ? `⚡ PENTEST — ${currentMachine?.ip || ''}` : '🌐 VUE RÉSEAU'}
      </div>

      {/* XP bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <span style={{ color: '#ffff00' }}>⭐</span>
        <div style={{ width: '70px', height: '7px', background: '#111', borderRadius: '4px', border: '1px solid #222' }}>
          <div style={{ width: `${xpPct}%`, height: '100%', background: '#ffff00', borderRadius: '4px', transition: 'width 0.4s', boxShadow: '0 0 5px #ffff00' }} />
        </div>
        <span style={{ color: '#ffff00' }}>Niv.{level}</span>
        <span style={{ color: '#555' }}>({xp}xp)</span>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <span style={{ color: '#00ffff' }}>🎯 Machines pwned :</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {MACHINES_META.map(m => (
            <div key={m.id} style={{
              width: '16px', height: '16px', borderRadius: '3px',
              background: pwnedMachines.includes(m.id) ? '#00aa44' : '#111',
              border: `1px solid ${pwnedMachines.includes(m.id) ? '#00ff41' : '#2a2a2a'}`,
              boxShadow: pwnedMachines.includes(m.id) ? '0 0 5px #00ff41' : 'none',
              transition: 'all 0.3s',
            }} title={m.id} />
          ))}
        </div>
        <span style={{ color: pwnedCount === totalTargets ? '#00ff41' : '#555' }}>
          {pwnedCount}/{totalTargets}
        </span>
      </div>

      {/* Machine phase (if in machine mode) */}
      {mode === 'MACHINE' && currentMachine && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid #1a1a1a', paddingLeft: '14px', flexShrink: 0 }}>
          {['Recon','Scan','Exploit','Post'].map((p, i) => (
            <span key={p} style={{
              padding: '2px 7px', borderRadius: '3px', fontSize: '10px',
              background: i < (gameState.machinePhase || 0) ? '#051a05' : i === (gameState.machinePhase || 0) ? '#0d1a00' : '#0a0a0a',
              border: `1px solid ${i < (gameState.machinePhase || 0) ? '#00aa44' : i === (gameState.machinePhase || 0) ? '#88cc00' : '#1a1a1a'}`,
              color: i < (gameState.machinePhase || 0) ? '#00aa44' : i === (gameState.machinePhase || 0) ? '#aaff00' : '#333',
            }}>
              {i < (gameState.machinePhase || 0) ? '✓' : i === (gameState.machinePhase || 0) ? '▶' : '○'} {p}
            </span>
          ))}
        </div>
      )}

      {/* Score */}
      <div style={{ marginLeft: 'auto', color: '#333', fontSize: '10px', flexShrink: 0 }}>
        Score: <span style={{ color: '#ffff00' }}>{xp}</span>
      </div>
    </div>
  );
}
