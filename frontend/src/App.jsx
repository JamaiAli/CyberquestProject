import { useState, useCallback, useRef, useEffect } from 'react';
import GameMap from './components/GameMap';
import Terminal from './components/Terminal';
import HUD from './components/HUD';
import PedaPanel from './components/PedaPanel';
import MachineView from './components/MachineView';
import Scoreboard from './components/Scoreboard';
import CharacterSelect from './components/CharacterSelect';
import IntroScreen from './components/IntroScreen';
import GameOver from './components/GameOver';
import Victory from './components/Victory';
import { getGameState as engineGetGameState, updateGameState as engineUpdateGameState, createInitialState } from './engine/gameState';
import { processCommand } from './engine/commandEngine';

const TOTAL_SECONDS = 360; // 6 minutes

function makeSessionId() { return crypto.randomUUID(); }

function makeInitialState(sessionId) {
  // Utilisation de la logique standalone via localStorage
  return engineGetGameState(sessionId);
}

export default function App() {
  const [screen, setScreen]       = useState('select'); // 'select' | 'intro' | 'game' | 'gameover' | 'victory'
  const [player, setPlayer]       = useState(null);
  const [sessionId, setSessionId] = useState(() => makeSessionId());
  const [gameState, setGameState] = useState(() => makeInitialState(sessionId));
  const [lastCommand, setLastCommand] = useState(null);
  const [pedaInfo, setPedaInfo]   = useState(null);
  const [mapEffect, setMapEffect] = useState(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [notification, setNotification] = useState(null);
  const [timeLeft, setTimeLeft]   = useState(TOTAL_SECONDS);
  const [elapsed, setElapsed]     = useState(0);

  const timerRef      = useRef(null);
  const writeToTermRef = useRef(null); // set by Terminal via onWriteRef
  const timerWarnSent = useRef({ at120: false, at60: false });

  const mode    = gameState.mode    || 'NETWORK';
  const machine = gameState.currentMachine;
  const phase   = gameState.machinePhase ?? 0;

  // Start/stop countdown when game screen active
  useEffect(() => {
    if (screen !== 'game') {
      clearInterval(timerRef.current);
      return;
    }
    timerWarnSent.current = { at120: false, at60: false };
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        setElapsed(e => e + 1);

        // ORACLE warnings pushed to terminal
        if (next === 120 && !timerWarnSent.current.at120) {
          timerWarnSent.current.at120 = true;
          writeToTermRef.current?.(
            '\x1b[35mORACLE > 2 minutes. Les techniciens NEXUS remontent ta connexion.\x1b[0m\n' +
            '\x1b[35mORACLE > Accélère. Tu n\'as plus le temps d\'hésiter.\x1b[0m'
          );
        }
        if (next === 60 && !timerWarnSent.current.at60) {
          timerWarnSent.current.at60 = true;
          writeToTermRef.current?.(
            '\x1b[31m⚠ ORACLE > 60 secondes. Ils arrivent. TERMINE LA MISSION.\x1b[0m'
          );
        }

        if (next <= 0) {
          clearInterval(timerRef.current);
          setScreen('gameover');
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen]);

  // Watch for game win
  useEffect(() => {
    if (gameState.gameWon && screen === 'game') {
      clearInterval(timerRef.current);
      setScreen('victory');
    }
  }, [gameState.gameWon]);

  const showNotif = (msg, color = '#00ff41') => {
    setNotification({ msg, color });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCommand = useCallback(async (command) => {
    setLastCommand(command);
    try {
      // Court-circuitage du backend : appel direct au moteur de jeu en local
      const state = engineGetGameState(sessionId);
      const res = processCommand(command, state);
      const savedState = engineUpdateGameState(sessionId, res.newState);
      const result = { ...res, newState: savedState };

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
      console.error(err);
      return '\x1b[31m[ERREUR] Le moteur local a rencontré un problème.\x1b[0m';
    }
  }, [sessionId]);

  const handleRestart = () => {
    const newId = makeSessionId();
    setSessionId(newId);
    setGameState(makeInitialState(newId));
    setTimeLeft(TOTAL_SECONDS);
    setElapsed(0);
    setPlayer(null);
    setScreen('select');
  };

  const handleCharSelect = (selectedPlayer) => {
    setPlayer(selectedPlayer);
    setScreen('intro');
  };

  // ── Screens ─────────────────────────────────────────────────────────────────

  if (screen === 'select') {
    return <CharacterSelect onSelect={handleCharSelect} />;
  }

  if (screen === 'intro') {
    return (
      <IntroScreen
        hackerName={player?.hackerName || 'GHOST'}
        onDone={() => setScreen('game')}
      />
    );
  }

  if (screen === 'gameover') {
    return <GameOver gameState={gameState} onRestart={handleRestart} />;
  }

  if (screen === 'victory') {
    return (
      <Victory
        hackerName={player?.hackerName || 'GHOST'}
        gameState={gameState}
        elapsed={elapsed}
        onRestart={handleRestart}
      />
    );
  }

  // ── Game screen ──────────────────────────────────────────────────────────────

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
        <HUD gameState={gameState} mode={mode} player={player} timeLeft={timeLeft} />
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

      {/* Row 2 Left: Room Map */}
      <GameMap gameState={gameState} effect={mapEffect} hackerName={player?.hackerName} playerEmoji={player?.emoji} />

      {/* Row 2 Right: MachineView + PedaPanel */}
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
        <Terminal onCommand={handleCommand} gameState={gameState} onWriteRef={writeToTermRef} />
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

      <Scoreboard visible={showScoreboard} onClose={() => setShowScoreboard(false)} />
    </div>
  );
}
