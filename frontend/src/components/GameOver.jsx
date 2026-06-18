export default function GameOver({ gameState, onRestart }) {
  const pwned = gameState?.pwnedMachines?.length || 0;
  const xp = gameState?.xp || 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Fira Code", monospace', zIndex: 9999,
      animation: 'fadeIn 0.5s ease',
    }}>
      <style>{`
        @keyframes glitch {
          0%   { text-shadow: 3px 0 #ff007f, -3px 0 #00ffff; transform: skewX(0deg); }
          20%  { text-shadow: -3px 0 #ff007f, 3px 0 #00ffff; transform: skewX(-2deg); }
          40%  { text-shadow: 3px 2px #ff007f, -3px -2px #00ffff; transform: skewX(2deg); }
          60%  { text-shadow: -3px 0 #ff007f, 3px 0 #00ffff; transform: skewX(-1deg); }
          80%  { text-shadow: 3px 0 #ff007f, -3px 0 #00ffff; transform: skewX(0deg); }
          100% { text-shadow: -3px 0 #ff007f, 3px 0 #00ffff; transform: skewX(1deg); }
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scanline {
          0% { top: -10%; } 100% { top: 110%; }
        }
      `}</style>

      {/* Scanline effect */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: '2px',
        background: 'rgba(255,0,0,0.3)',
        animation: 'scanline 2s linear infinite',
        pointerEvents: 'none',
      }} />

      {/* Glitch TRACÉ */}
      <div style={{
        color: '#ff007f', fontSize: '52px', fontWeight: 'bold',
        letterSpacing: '8px', marginBottom: '16px',
        animation: 'glitch 0.4s infinite',
      }}>
        TRACÉ
      </div>

      <div style={{ color: '#1a0000', fontSize: '12px', letterSpacing: '4px', marginBottom: '36px' }}>
        CONNEXION COMPROMISE — IDENTITÉ EXPOSÉE
      </div>

      <div style={{
        border: '1px solid #330000', padding: '20px 32px',
        marginBottom: '32px', textAlign: 'center', minWidth: '360px',
      }}>
        <div style={{ color: '#550000', fontSize: '11px', marginBottom: '14px', lineHeight: '2' }}>
          <div>ORACLE &gt; Ils t'ont eu.</div>
          <div>ORACLE &gt; Les agents NEXUS remontent ta connexion.</div>
          <div>ORACLE &gt; Déconnecte-toi. Recommence depuis le début.</div>
        </div>
        <div style={{ borderTop: '1px solid #1a0000', paddingTop: '12px', color: '#333', fontSize: '11px', lineHeight: '1.8' }}>
          <div>XP accumulé : <span style={{ color: '#555' }}>{xp}</span></div>
          <div>Machines pwned : <span style={{ color: '#555' }}>{pwned}/4</span></div>
        </div>
      </div>

      <button
        onClick={onRestart}
        style={{
          background: 'transparent', border: '1px solid #ff007f',
          color: '#ff007f', padding: '12px 36px',
          fontFamily: 'monospace', fontSize: '13px',
          cursor: 'pointer', letterSpacing: '2px', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.target.style.background = '#ff007f15'; }}
        onMouseLeave={e => { e.target.style.background = 'transparent'; }}
      >
        [ RECOMMENCER LA MISSION ]
      </button>
    </div>
  );
}
