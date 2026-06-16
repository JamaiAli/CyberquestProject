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
import { GHOST_SPAWN, NETWORK_MAP, MACHINE_POSITIONS, TILE, MAP_ROWS, MAP_COLS } from './map.js';

const TOTAL_SECONDS = 600; // 10 minutes

function makeSessionId() { return crypto.randomUUID(); }

function makeInitialState(sessionId) {
  return {
    sessionId,
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
    listenerPort: null,
    hydraDone: false,
  };
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

  const timerRef        = useRef(null);
  const writeToTermRef  = useRef(null); // set by Terminal via onWriteRef
  const timerWarnSent   = useRef({ at120: false, at60: false });
  const ghostTileRef    = useRef({ ...GHOST_SPAWN });
  const nearbyMachineRef = useRef(null);
  const oracleSentRef   = useRef(new Set());
  const gameStateRef    = useRef(gameState);

  // Keep ref in sync so keydown handler always reads latest state
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Reset GHOST position and oracle memory when entering game screen
  useEffect(() => {
    if (screen === 'game') {
      ghostTileRef.current    = { ...GHOST_SPAWN };
      nearbyMachineRef.current = null;
      oracleSentRef.current.clear();
    }
  }, [screen]);

  // Arrow-key GHOST movement (only during game)
  useEffect(() => {
    if (screen !== 'game') return;
    const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

    const handler = (e) => {
      if (!ARROWS.includes(e.key)) return;
      e.preventDefault();

      const { col, row } = ghostTileRef.current;
      const dRow = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      const dCol = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      const nRow = row + dRow;
      const nCol = col + dCol;

      if (nRow < 0 || nRow >= MAP_ROWS || nCol < 0 || nCol >= MAP_COLS) return;
      const tile = NETWORK_MAP[nRow]?.[nCol];
      if (tile === TILE.WALL || tile === TILE.MACHINE) return;

      ghostTileRef.current = { col: nCol, row: nRow };

      // Proximity detection — closest machine within 1 tile (Manhattan)
      let closestId = null;
      let closestDist = Infinity;
      Object.entries(MACHINE_POSITIONS).forEach(([id, pos]) => {
        const clampedCol = Math.max(pos.col, Math.min(nCol, pos.col + pos.w - 1));
        const clampedRow = Math.max(pos.row, Math.min(nRow, pos.row + pos.h - 1));
        const dist = Math.abs(nCol - clampedCol) + Math.abs(nRow - clampedRow);
        if (dist <= 1 && dist < closestDist) { closestDist = dist; closestId = id; }
      });

      const prevNearby = nearbyMachineRef.current;
      nearbyMachineRef.current = closestId;

      // ORACLE message on first approach to each unlocked machine
      if (closestId && closestId !== 'kali' && closestId !== prevNearby && !oracleSentRef.current.has(closestId)) {
        const pos = MACHINE_POSITIONS[closestId];
        const unlocked = gameStateRef.current.unlockedMachines || [];
        if (unlocked.includes(closestId)) {
          oracleSentRef.current.add(closestId);
          const connectHints = {
            webserver:  `nc -lvnp 4444  →  python3 cve-2021-41773.py ${pos.ip} 4444`,
            mailserver: `hydra -l admin -P rockyou.txt ${pos.ip} ssh  →  ssh admin@${pos.ip}`,
            dbserver:   `mysql -h ${pos.ip} -u db_user -pStr0ngP@ss`,
            dc:         `evil-winrm -i ${pos.ip} -u Administrator -H <ntlm_hash>`,
          };
          const hint = connectHints[closestId] || `connect ${pos.ip}`;
          writeToTermRef.current?.(
            `\x1b[33m[ORACLE] ${pos.name} détectée.\x1b[0m\n\x1b[36m  → ${hint}\x1b[0m`
          );
        } else if (!oracleSentRef.current.has(closestId + '_locked')) {
          oracleSentRef.current.add(closestId + '_locked');
          writeToTermRef.current?.(
            `\x1b[35mORACLE > Cette machine est verrouillée. Compromets d'abord ses prérequis.\x1b[0m`
          );
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen]);

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
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, sessionId }),
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
      <GameMap
        gameState={gameState}
        effect={mapEffect}
        hackerName={player?.hackerName}
        playerEmoji={player?.emoji}
        ghostTileRef={ghostTileRef}
        nearbyMachineRef={nearbyMachineRef}
      />

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
