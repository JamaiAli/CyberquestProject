import { useState, useCallback, useRef, useEffect } from 'react';
import GameMap from './components/GameMap';
import HUD from './components/HUD';
import PedaPanel from './components/PedaPanel';
import MachineView from './components/MachineView';
import Scoreboard from './components/Scoreboard';
import CharacterSelect from './components/CharacterSelect';
import LevelMap from './components/LevelMap';
import LevelView from './components/LevelView';
import ADLevelMap from './components/ADLevelMap';
import ADLevelView from './components/ADLevelView';
import IntroScreen from './components/IntroScreen';
import GameOver from './components/GameOver';
import Victory from './components/Victory';
import AuthForm from './components/AuthForm';
import { GHOST_SPAWN, NETWORK_MAP, MACHINE_POSITIONS, TILE, MAP_ROWS, MAP_COLS } from './map.js';
import { MAX_LEVEL } from './levels/webLevels';
import { MAX_AD_LEVEL } from './levels/adLevels';

const TOTAL_SECONDS = 3600; // 60 minutes

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
    asrepDone: false,
    svcBackupCreds: false,
    smbShareAccessed: false,
    ntdsDumped: false,
  };
}

export default function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen]       = useState('select'); // 'select' | 'intro' | 'game' | 'gameover' | 'victory'
  const [player, setPlayer]       = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [gameState, setGameState] = useState(() => makeInitialState(''));
  const [lastCommand, setLastCommand] = useState(null);
  const [pedaInfo, setPedaInfo]   = useState(null);
  const [mapEffect, setMapEffect] = useState(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [notification, setNotification] = useState(null);
  const [timeLeft, setTimeLeft]   = useState(TOTAL_SECONDS);
  const [elapsed, setElapsed]     = useState(0);

  const [nearbyMachine, setNearbyMachine] = useState(null);
  const [showLevelMap, setShowLevelMap]   = useState(false);
  const [activeLevel, setActiveLevel]     = useState(null); // 1..4 web-app level open
  const [levelsDone, setLevelsDone]       = useState([]);
  const [adTestStarted, setAdTestStarted]   = useState(false);
  const [showADLevelMap, setShowADLevelMap] = useState(false);
  const [activeADLevel, setActiveADLevel]   = useState(null);
  const [adLevelsDone, setAdLevelsDone]     = useState([]);

  const timerRef        = useRef(null);
  const writeToTermRef  = useRef(null);
  const runTerminalRef  = useRef(null);
  const timerWarnSent   = useRef({ at120: false, at60: false });
  const ghostTileRef    = useRef({ ...GHOST_SPAWN });
  const nearbyMachineRef = useRef(null);
  const oracleSentRef   = useRef(new Set());
  const gameStateRef    = useRef(gameState);

  const handleLogoutLocal = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setSessionId('');
    setGameState(makeInitialState(''));
    setScreen('select');
    setPlayer(null);
  }, []);

  // 1. Silent Refresh au démarrage
  useEffect(() => {
    const silentRefresh = async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          setUser(data.username);
          setSessionId(data.username);

          // Charge la progression du joueur
          const stateRes = await fetch('/api/state', {
            headers: { 'Authorization': `Bearer ${data.accessToken}` }
          });
          if (stateRes.ok) {
            const stateData = await stateRes.json();
            if (stateData) {
              setGameState(stateData);
              if (stateData.pwnedMachines && stateData.pwnedMachines.length > 0) {
                setScreen('game'); // Passe directement au jeu si partie en cours
              }
            }
          }
        }
      } catch (err) {
        console.error('Silent refresh failed:', err);
      } finally {
        setAuthLoading(false);
      }
    };
    silentRefresh();
  }, []);

  // 2. Refresh automatique de l'Access Token (toutes les 13 minutes)
  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          setUser(data.username);
        } else {
          handleLogoutLocal();
        }
      } catch (e) {
        console.error('Auto refresh failed:', e);
      }
    }, 13 * 60 * 1000);
    return () => clearInterval(interval);
  }, [accessToken, handleLogoutLocal]);

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

      // Prevent map movement if the user is typing in an input, textarea (xterm), etc.
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

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
      setNearbyMachine(closestId);

      // ORACLE message on first approach to each unlocked machine
      if (closestId && closestId !== 'kali' && closestId !== prevNearby && !oracleSentRef.current.has(closestId)) {
        const pos = MACHINE_POSITIONS[closestId];
        const unlocked = gameStateRef.current.unlockedMachines || [];
        if (unlocked.includes(closestId)) {
          oracleSentRef.current.add(closestId);
          const connectHints = {
            webserver:  `nmap -sC -sV -p- ${pos.ip}  →  dnsrecon -d corp.local -n ${pos.ip} -t std`,
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ command }),
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
  }, [accessToken]);

  const handleRestart = () => {
    setGameState(makeInitialState(user));
    setTimeLeft(TOTAL_SECONDS);
    setElapsed(0);
    setPlayer(null);
    setScreen('select');
  };

  const handleLoginSuccess = useCallback(async (token, username) => {
    setAccessToken(token);
    setUser(username);
    setSessionId(username);

    // Récupère la progression existante de l'utilisateur
    try {
      const stateRes = await fetch('/api/state', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        if (stateData) {
          setGameState(stateData);
          setScreen(stateData.pwnedMachines?.length > 0 ? 'game' : 'select');
          return;
        }
      }
    } catch (e) {
      console.error('Error fetching game state:', e);
    }

    setGameState(makeInitialState(username));
    setScreen('select');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout failed:', e);
    }
    handleLogoutLocal();
  }, [handleLogoutLocal]);

  const handleCharSelect = (selectedPlayer) => {
    setPlayer(selectedPlayer);
    setScreen('intro');
  };

  // ── Screens ─────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div style={{
        display: 'flex', height: '100vh', width: '100vw',
        background: '#030305', alignItems: 'center', justifyContent: 'center',
        color: '#00ff41', fontFamily: 'monospace', fontSize: '13px'
      }}>
        [ INITIALISATION DE LA SESSION CYBERQUEST... ]
      </div>
    );
  }

  if (!accessToken) {
    return <AuthForm onLoginSuccess={handleLoginSuccess} />;
  }

  if (screen === 'select') {
    return <CharacterSelect onSelect={handleCharSelect} onLogout={handleLogout} />;
  }

  if (screen === 'intro') {
    return (
      <IntroScreen
        hackerName={player?.hackerName || 'GHOST'}
        onDone={() => setScreen('game')}
        onLogout={handleLogout}
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
      gridTemplateRows: '50px 1fr',
      height: '100vh', width: '100vw',
      background: '#050508', overflow: 'hidden',
    }}>
      {/* Row 1: HUD full width */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center' }}>
        <HUD 
          gameState={gameState} 
          mode={mode} 
          player={player} 
          timeLeft={timeLeft} 
          onLogout={handleLogout} 
          onShowScores={() => setShowScoreboard(true)} 
        />
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

      {/* Bouton "Commencer le test d'intrusion" quand on approche Active Directory */}
      {nearbyMachine === 'webserver' && mode === 'NETWORK' && !adTestStarted && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 600,
        }}>
          <button
            onClick={() => {
              setAdTestStarted(true);
              setShowADLevelMap(true);
            }}
            style={{
              background: 'linear-gradient(135deg, #0a0f1a, #0d1a2a)',
              border: '1px solid #00aaff',
              color: '#00aaff',
              fontFamily: '"Fira Code", monospace',
              fontSize: '13px',
              fontWeight: 'bold',
              padding: '10px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              boxShadow: '0 0 20px #00aaff55, 0 0 40px #00aaff22',
              letterSpacing: '0.05em',
              animation: 'pulse 1.8s ease-in-out infinite',
            }}
          >
            ▶ Commencer le test d'intrusion
          </button>
        </div>
      )}

      {/* Bouton "Commencer le test d'intrusion" quand on approche la Web Application */}
      {nearbyMachine === 'mailserver' && mode === 'NETWORK' && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 600,
        }}>
          <button
            onClick={() => setShowLevelMap(true)}
            style={{
              background: 'linear-gradient(135deg, #0a1a0a, #0d2a0d)',
              border: '1px solid #00ff41',
              color: '#00ff41',
              fontFamily: '"Fira Code", monospace',
              fontSize: '13px',
              fontWeight: 'bold',
              padding: '10px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              boxShadow: '0 0 20px #00ff4155, 0 0 40px #00ff4122',
              letterSpacing: '0.05em',
              animation: 'pulse 1.8s ease-in-out infinite',
            }}
          >
            ▶ Commencer le test d'intrusion
          </button>
        </div>
      )}

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

      {showLevelMap && (
        <LevelMap
          currentLevel={Math.min(levelsDone.length + 1, MAX_LEVEL)}
          completed={levelsDone}
          onClose={() => setShowLevelMap(false)}
          onSelectLevel={(n) => {
            if (n <= MAX_LEVEL) setActiveLevel(n);
          }}
        />
      )}

      {activeLevel && (
        <LevelView
          key={activeLevel}
          level={activeLevel}
          onClose={() => setActiveLevel(null)}
          onLogout={() => {
            setActiveLevel(null);
            handleLogout();
          }}
          onComplete={(n) => {
            setLevelsDone(prev => prev.includes(n) ? prev : [...prev, n]);
            showNotif(`🚩 Niveau ${n} validé !`, '#00ff41');
          }}
          onAdvance={(n) => {
            setActiveLevel(n < MAX_LEVEL ? n + 1 : null);
          }}
        />
      )}

      {showADLevelMap && (
        <ADLevelMap
          currentLevel={Math.min(adLevelsDone.length + 1, MAX_AD_LEVEL)}
          completed={adLevelsDone}
          onClose={() => setShowADLevelMap(false)}
          onSelectLevel={(n) => { if (n <= MAX_AD_LEVEL) setActiveADLevel(n); }}
        />
      )}

      {activeADLevel && (
        <ADLevelView
          key={activeADLevel}
          level={activeADLevel}
          onClose={() => setActiveADLevel(null)}
          onComplete={(n) => {
            setAdLevelsDone(prev => prev.includes(n) ? prev : [...prev, n]);
            showNotif(`🚩 Étape AD ${n} validée !`, '#00aaff');
          }}
          onAdvance={(n) => {
            setActiveADLevel(n < MAX_AD_LEVEL ? n + 1 : null);
          }}
        />
      )}

      <Scoreboard visible={showScoreboard} onClose={() => setShowScoreboard(false)} />
    </div>
  );
}
