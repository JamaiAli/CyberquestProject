import MatrixRain from './MatrixRain';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return `${m}m${s.toString().padStart(2, '0')}s`;
}

export default function Victory({ hackerName, gameState, elapsed, onRestart }) {
  const xp   = gameState?.xp   || 0;
  const pwned = gameState?.pwnedMachines?.length || 0;
  const FLAG  = 'CQ{n3xus_c0rp_3xp0s3d}';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      fontFamily: '"Fira Code", monospace', overflow: 'hidden',
    }}>
      <MatrixRain opacity={0.2} />

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 10px #00f0ff, 0 0 20px #00f0ff; }
          50%       { text-shadow: 0 0 20px #00f0ff, 0 0 40px #00f0ff, 0 0 60px #00f0ff; }
        }
      `}</style>

      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', animation: 'fadeIn 1s ease',
      }}>
        <div style={{
          color: '#00f0ff', fontSize: '32px', fontWeight: 'bold',
          letterSpacing: '6px', marginBottom: '6px',
          animation: 'glow 2s ease-in-out infinite',
        }}>
          MISSION ACCOMPLIE
        </div>

        <div style={{ color: '#1a4a1a', fontSize: '12px', letterSpacing: '3px', marginBottom: '32px' }}>
          NEXUS CORP NEUTRALISÉ
        </div>

        <div style={{
          border: '1px solid #00f0ff44', padding: '24px 36px',
          minWidth: '420px', marginBottom: '28px',
          background: 'rgba(0,10,0,0.8)',
        }}>
          <div style={{ color: '#224422', fontSize: '10px', letterSpacing: '2px', marginBottom: '14px' }}>
            RAPPORT DE MISSION — {hackerName}
          </div>
          <div style={{ color: '#00f0ff', fontSize: '14px', marginBottom: '14px', fontWeight: 'bold' }}>
            🚩 FLAG FINAL : {FLAG}
          </div>
          <div style={{ color: '#2a4a2a', fontSize: '11px', lineHeight: '2' }}>
            <div>Score XP       : <span style={{ color: '#00aa44' }}>{xp}</span></div>
            <div>Temps          : <span style={{ color: '#00aa44' }}>{formatTime(elapsed)}</span></div>
            <div>Machines pwned : <span style={{ color: '#00aa44' }}>{pwned}/4</span></div>
          </div>
        </div>

        <div style={{ color: '#1a2a1a', fontSize: '11px', textAlign: 'center', lineHeight: '2.2', marginBottom: '32px' }}>
          <div>ORACLE &gt; C'est fini. Les preuves sont entre les mains des journalistes.</div>
          <div>ORACLE &gt; NEXUS Corp ne s'en remettra pas.</div>
          <div>ORACLE &gt; Bien joué, {hackerName}. Disparais maintenant.</div>
        </div>

        <button
          onClick={onRestart}
          style={{
            background: 'transparent', border: '1px solid #00f0ff',
            color: '#00f0ff', padding: '10px 32px',
            fontFamily: 'monospace', fontSize: '12px',
            cursor: 'pointer', letterSpacing: '2px',
          }}
          onMouseEnter={e => { e.target.style.background = '#00f0ff15'; }}
          onMouseLeave={e => { e.target.style.background = 'transparent'; }}
        >
          [ NOUVELLE MISSION ]
        </button>
      </div>
    </div>
  );
}
