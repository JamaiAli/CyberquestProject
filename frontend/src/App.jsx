import { useState, useCallback } from 'react';
import GameMap from './components/GameMap';
import Terminal from './components/Terminal';
import HUD from './components/HUD';
import PedaPanel from './components/PedaPanel';
import MachineView from './components/MachineView';
import Scoreboard from './components/Scoreboard';

const SESSION_ID = crypto.randomUUID();

const INITIAL_STATE = {
  sessionId: SESSION_ID,
  xp: 0, level: 1, hp: 100, maxHp: 100,
  mode: 'NETWORK',
  pwnedMachines: [],
  scannedMachines: [],
  unlockedMachines: ['webserver', 'mailserver'],
  currentMachine: null,
  machinePhase: 0,
  rootObtained: false,
  score: 0,
  gameWon: false,
};

export default function App() {
  const [gameState, setGameState]   = useState(INITIAL_STATE);
  const [lastCommand, setLastCommand] = useState(null);
  const [pedaInfo, setPedaInfo]     = useState(null);
  const [mapEffect, setMapEffect]   = useState(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [notification, setNotification] = useState(null);

  const mode    = gameState.mode    || 'NETWORK';
  const machine = gameState.currentMachine;
  const phase   = gameState.machinePhase ?? 0;

  const showNotif = (msg, color = '#00ff41') => {
    setNotification({ msg, color });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCommand = useCallback(async (command) => {
    setLastCommand(command);
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, sessionId: SESSION_ID }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();

      setGameState(prev => {
        const next = result.newState || prev;
        if (next.level > prev.level) showNotif(`🎉 NIVEAU ${next.level} ! +20 HP`, '#ffff00');
        if ((next.pwnedMachines?.length || 0) > (prev.pwnedMachines?.length || 0)) {
          showNotif('🚩 Machine compromise ! +XP', '#00ff41');
        }
        if (next.unlockedMachines?.includes('dbserver') && !prev.unlockedMachines?.includes('dbserver')) {
          showNotif('🔓 DB Server débloqué !', '#00aaff');
        }
        if (next.unlockedMachines?.includes('dc') && !prev.unlockedMachines?.includes('dc')) {
          showNotif('🔓 Domain Controller débloqué !', '#aa44ff');
        }
        return next;
      });

      const eff = result.effect;
      setPedaInfo(result.pedagogie || null);

      if (eff?.type === 'SHOW_SCORES') {
        setShowScoreboard(true);
      } else {
        setMapEffect(eff || null);
      }

      return result.output || '';
    } catch (err) {
      return '\x1b[31m[ERREUR] Backend non disponible. Lance: node backend/server.js\x1b[0m';
    }
  }, []);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 270px',
      gridTemplateRows: '50px 1fr 210px',
      height: '100vh', width: '100vw',
      background: '#050508', overflow: 'hidden',
    }}>
      {/* Row 1: HUD full width */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center' }}>
        <HUD gameState={gameState} mode={mode} />
        <button onClick={() => setShowScoreboard(true)} style={{
          marginLeft: 'auto', marginRight: '10px', flexShrink: 0,
          background: 'transparent', border: '1px solid #1a1a2a',
          color: '#333', fontFamily: 'monospace', fontSize: '10px',
          cursor: 'pointer', padding: '4px 10px', borderRadius: '3px',
        }}
          onMouseEnter={e => { e.target.style.color = '#00ff41'; e.target.style.borderColor = '#00ff41'; }}
          onMouseLeave={e => { e.target.style.color = '#333'; e.target.style.borderColor = '#1a1a2a'; }}
        >
          🏆 Scores
        </button>
      </div>

      {/* Row 2 Left: Room Map (always visible) */}
      <GameMap gameState={gameState} effect={mapEffect} />

      {/* Row 2 Right: MachineView (in machine) + PedaPanel */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {mode === 'MACHINE' && machine && (
          <div style={{ flex: '0 0 auto', maxHeight: '55%', overflow: 'auto', borderBottom: '1px solid #1a1a2a' }}>
            <MachineView machine={machine} phase={phase} />
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <PedaPanel info={pedaInfo} lastCommand={lastCommand} gameState={gameState} />
        </div>
      </div>

      {/* Row 3: Terminal full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <Terminal onCommand={handleCommand} gameState={gameState} />
      </div>

      {/* Toast notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: '62px', right: '18px',
          background: '#08080e', border: `1px solid ${notification.color}`,
          color: notification.color, fontFamily: 'monospace', fontSize: '12px',
          padding: '8px 14px', borderRadius: '4px',
          boxShadow: `0 0 18px ${notification.color}55`,
          animation: 'fadeIn 0.2s ease', zIndex: 500,
        }}>
          {notification.msg}
        </div>
      )}

      {/* Game win banner */}
      {gameState.gameWon && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, flexDirection: 'column', gap: '16px',
          fontFamily: 'monospace',
        }}>
          <div style={{ color: '#ffd700', fontSize: '28px', fontWeight: 'bold', textShadow: '0 0 30px #ffd700' }}>
            🏆 CYBERQUEST COMPLÉTÉ !
          </div>
          <div style={{ color: '#00ff41', fontSize: '14px' }}>
            Tu es Domain Administrator de CORP.LOCAL
          </div>
          <div style={{ color: '#555', fontSize: '12px' }}>
            Score final : {gameState.xp} XP — Niveau {gameState.level}
          </div>
          <button onClick={() => setShowScoreboard(true)} style={{
            marginTop: '10px', padding: '10px 24px',
            background: '#0a1a0a', border: '1px solid #00ff41',
            color: '#00ff41', fontFamily: 'monospace', fontSize: '13px',
            cursor: 'pointer', borderRadius: '4px',
          }}>
            Voir le classement
          </button>
        </div>
      )}

      <Scoreboard visible={showScoreboard} onClose={() => setShowScoreboard(false)} />
    </div>
  );
}
