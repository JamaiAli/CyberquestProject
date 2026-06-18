import { useState, useCallback, useRef, useEffect } from 'react';
import GameMap from './components/GameMap';
import HUD from './components/HUD';
import PedaPanel from './components/PedaPanel';
import MachineView from './components/MachineView';
import Scoreboard from './components/Scoreboard';
import LevelMap from './components/LevelMap';
import LevelView from './components/LevelView';
import ADLevelMap from './components/ADLevelMap';
import ADLevelView from './components/ADLevelView';
import PromptInjectionLevelMap from './components/PromptInjectionLevelMap';
import PromptInjectionLevelView from './components/PromptInjectionLevelView';
import SuperLLrMView from './components/SuperLLrMView';
import AICoreLevels from './components/AICoreLevels';
import MainframeView from './components/MainframeView';
import { getChallenge } from './levels/aiChallenges';
import IntroScreen from './components/IntroScreen';
import GameOver from './components/GameOver';
import Victory from './components/Victory';
import AuthForm from './components/AuthForm';
import DisclaimerScreen from './components/DisclaimerScreen';
import { GHOST_SPAWN, NETWORK_MAP, MACHINE_POSITIONS, TILE, MAP_ROWS, MAP_COLS } from './map.js';
import { MAX_LEVEL } from './levels/webLevels';
import { MAX_AD_LEVEL } from './levels/adLevels';
import { MAX_PI_LEVEL, initialPIProg } from './levels/promptInjectionLevels';

const TOTAL_SECONDS = 3600; // 60 minutes

function makeSessionId() { return crypto.randomUUID(); }

function makeInitialState(sessionId) {
  return {
    sessionId,
    xp: 0, level: 1, hp: 100, maxHp: 100,
    mode: 'NETWORK',
    pwnedMachines: [],
    scannedMachines: [],
    unlockedMachines: ['webserver', 'mailserver', 'aicore'],
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
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [screen, setScreen]       = useState('intro'); // 'intro' | 'game' | 'gameover' | 'victory'
  const [player, setPlayer]       = useState({ hackerName: 'GHOST', role: 'Hacktiviste', emoji: '🧑‍💻' });
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

  const [showADLevelMap, setShowADLevelMap] = useState(false);
  const [activeADLevel, setActiveADLevel]   = useState(null);
  const [adLevelsDone, setAdLevelsDone]     = useState([]);

  const [showSentinel, setShowSentinel]   = useState(false);  // sélecteur AI_CORE
  const [activeChallenge, setActiveChallenge] = useState(null); // id du challenge ouvert
  const [aiSolvedLevels, setAiSolvedLevels]   = useState([]);

  const [piStarted, setPiStarted]         = useState(false);
  const [showPILevelMap, setShowPILevelMap] = useState(false);
  const [activePILevel, setActivePILevel]   = useState(null);
  const [piLevelsDone, setPiLevelsDone]     = useState([]);
  const [piProgs, setPiProgs]               = useState({});

  const [showMainframe, setShowMainframe]   = useState(false);
  const [escapeMode, setEscapeMode]         = useState(false);
  const [escapeTime, setEscapeTime]         = useState(45);

  const timerRef        = useRef(null);
  const writeToTermRef  = useRef(null);
  const runTerminalRef  = useRef(null);
  const timerWarnSent   = useRef({ at120: false, at60: false });
  const ghostTileRef    = useRef({ ...GHOST_SPAWN });
  const nearbyMachineRef = useRef(null);
  const oracleSentRef   = useRef(new Set());
  const gameStateRef    = useRef(gameState);
  const escapeModeRef   = useRef(escapeMode);

  const isAllCleared = levelsDone.length === MAX_LEVEL && adLevelsDone.length === MAX_AD_LEVEL && piLevelsDone.length === MAX_PI_LEVEL;
  const isAllClearedRef = useRef(isAllCleared);

  useEffect(() => { escapeModeRef.current = escapeMode; }, [escapeMode]);
  useEffect(() => { isAllClearedRef.current = isAllCleared; }, [isAllCleared]);

  const handleLogoutLocal = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setSessionId('');
    setGameState(makeInitialState(''));
    setScreen('intro');
    setPlayer({ hackerName: 'GHOST', role: 'Hacktiviste', emoji: '🧑‍💻' });
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
      let tile = NETWORK_MAP[nRow]?.[nCol];

      // Dynamic path unlocking around AI_CORE
      if (isAllClearedRef.current) {
        if ((nCol === 7 || nCol === 12) && (nRow >= 9 && nRow <= 11)) {
          tile = TILE.FLOOR;
        }
      }

      if (tile === TILE.WALL || tile === TILE.MACHINE) return;

      ghostTileRef.current = { col: nCol, row: nRow };

      if (escapeModeRef.current) {
        if (nCol === GHOST_SPAWN.col && nRow === GHOST_SPAWN.row) {
          setScreen('victory');
          setEscapeMode(false);
        }
      }

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
        const unlocked = [...(gameStateRef.current.unlockedMachines || [])];
        if (isAllClearedRef.current) unlocked.push('mainframe');

        if (unlocked.includes(closestId)) {
          oracleSentRef.current.add(closestId);
          const connectHints = {
            webserver:  `nmap -sV -p 80,443 ${pos.ip}`,
            mailserver: `nmap -sV -p 25,110,143 ${pos.ip}`,
            aicore:     `nc ${pos.ip} 9999`,
            mainframe:  `./exfiltrate_data.sh`
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

  // Timer global (1 heure)
  useEffect(() => {
    if (screen === 'game' && !escapeMode) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          const next = Math.max(0, t - 1);
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
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [screen, escapeMode]);

  // Escape timer
  useEffect(() => {
    if (!escapeMode) return;
    const int = setInterval(() => {
      setEscapeTime(t => {
        if (t <= 1) {
          clearInterval(int);
          setScreen('gameover');
          setEscapeMode(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(int);
  }, [escapeMode]);

  // Watch for game win
  useEffect(() => {
    if (gameState.gameWon && screen === 'game') {
      clearInterval(timerRef.current);
      setScreen('victory');
    }
  }, [gameState.gameWon]);

  const showNotif = (msg, color = '#00f0ff') => {
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
          showNotif('🚩 Machine compromise ! +XP', '#00f0ff');
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
    setPlayer({ hackerName: 'GHOST', role: 'Hacktiviste', emoji: '🧑‍💻' });
    setScreen('intro');
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
          setScreen(stateData.pwnedMachines?.length > 0 ? 'game' : 'intro');
          return;
        }
      }
    } catch (e) {
      console.error('Error fetching game state:', e);
    }

    setGameState(makeInitialState(username));
    setPlayer({ hackerName: 'GHOST', role: 'Hacktiviste', emoji: '🧑‍💻' });
    setScreen('intro');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout failed:', e);
    }
    handleLogoutLocal();
  }, [handleLogoutLocal]);

  // ── Screens ─────────────────────────────────────────────────────────────────

  // Show the CyVerse-style disclaimer/landing page BEFORE everything else
  if (showDisclaimer) {
    return <DisclaimerScreen onAccept={() => setShowDisclaimer(false)} />;
  }

  if (authLoading) {
    return (
      <div style={{
        display: 'flex', height: '100vh', width: '100vw',
        background: '#030305', alignItems: 'center', justifyContent: 'center',
        color: '#00f0ff', fontFamily: 'monospace', fontSize: '13px'
      }}>
        [ INITIALISATION DE LA SESSION CYBERQUEST... ]
      </div>
    );
  }

  if (!accessToken) {
    return <AuthForm onLoginSuccess={handleLoginSuccess} />;
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
    return (
      <GameOver
        message={escapeTime <= 0 ? "Tracé et localisé par la Corpo. Séquence d'évasion échouée." : "Délai de session écoulé. Votre connexion a été retracée."}
        onRetry={() => {
          setGameState(makeInitialState(sessionId));
          setTimeLeft(TOTAL_SECONDS);
          setScreen('intro');
        }}
      />
    );
  }

  if (screen === 'victory') {
    return (
      <Victory
        score={elapsed}
        onRestart={() => {
          handleLogoutLocal();
        }}
      />
    );
  }

  // ── Game screen ──────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: (mode === 'MACHINE' && machine) ? '1fr 270px' : '1fr',
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
          onTestEndgame={() => {
            setLevelsDone(Array.from({ length: MAX_LEVEL }, (_, i) => i + 1));
            setAdLevelsDone(Array.from({ length: MAX_AD_LEVEL }, (_, i) => i + 1));
            setPiLevelsDone(Array.from({ length: MAX_PI_LEVEL }, (_, i) => i + 1));
            showNotif("Mode Test : Toutes les salles sont terminées !", "#ff00ff");
          }}
        />
      </div>

      {/* Row 2 Left: Room Map */}
      <GameMap
        gameState={gameState}
        isAllCleared={isAllCleared}
        effect={mapEffect}
        hackerName={player?.hackerName}
        playerEmoji={player?.emoji}
        ghostTileRef={ghostTileRef}
        nearbyMachineRef={nearbyMachineRef}
      />

      {/* Row 2 Right: MachineView (PedaPanel removed) */}
      {mode === 'MACHINE' && machine && (
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid var(--neon-blue)' }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <MachineView machine={machine} phase={phase} />
          </div>
        </div>
      )}

      {/* Bouton "Commencer le test d'intrusion" quand on approche la Web Application */}
      {nearbyMachine === 'mailserver' && mode === 'NETWORK' && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 600,
        }}>
          <button
            className="cyber-btn"
            onClick={() => setShowLevelMap(true)}
          >
            [ Commencer le test d'intrusion ]
          </button>
        </div>
      )}

      {/* Bouton "Commencer le test d'intrusion" quand on approche Active Directory */}
      {nearbyMachine === 'webserver' && mode === 'NETWORK' && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 600,
        }}>
          <button
            className="cyber-btn"
            onClick={() => {
              setShowADLevelMap(true);
            }}
          >
            [ Commencer le test d'intrusion ]
          </button>
        </div>
      )}

      {/* Bouton "Accéder à AI_CORE" quand on approche AI_CORE */}
      {nearbyMachine === 'aicore' && mode === 'NETWORK' && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 600,
        }}>
          <button
            className="cyber-btn"
            onClick={() => setShowSentinel(true)}
          >
            [ Accéder à AI_CORE — SENTINEL ]
          </button>
        </div>
      )}

      {/* Bouton Mainframe */}
      {nearbyMachine === 'mainframe' && isAllCleared && (
          <div style={{
            position: 'absolute', top: '25%', left: '50%', transform: 'translate(-50%, -50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px',
            background: 'rgba(255, 0, 0, 0.1)', padding: '20px 40px',
            border: '1px solid #ff0000', borderRadius: '4px',
            boxShadow: '0 0 30px rgba(255, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            zIndex: 600,
          }}>
            <button
              className="cyber-btn"
              onClick={() => setShowMainframe(true)}
              style={{ borderColor: '#ff0000', color: '#ff0000', background: 'rgba(255,0,0,0.1)' }}
            >
              [ HACK NEXUS MAINFRAME ]
            </button>
          </div>
        )}

      {/* Mainframe View */}
      {showMainframe && (
        <MainframeView
          onClose={() => setShowMainframe(false)}
          onExfiltrate={() => {
            setShowMainframe(false);
            setEscapeMode(true);
            setEscapeTime(45);
          }}
        />
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
            showNotif(`🚩 Niveau ${n} validé !`, '#00f0ff');
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

      {showSentinel && !activeChallenge && (
        <AICoreLevels
          solvedLevels={aiSolvedLevels}
          onSelect={(id) => setActiveChallenge(id)}
          onClose={() => setShowSentinel(false)}
        />
      )}

      {activeChallenge && (
        <SuperLLrMView
          key={activeChallenge}
          challenge={getChallenge(activeChallenge)}
          accessToken={accessToken}
          onBack={() => setActiveChallenge(null)}
          onClose={() => { setActiveChallenge(null); setShowSentinel(false); }}
          onComplete={(id, points) => {
            setAiSolvedLevels(prev => prev.includes(id) ? prev : [...prev, id]);
            showNotif(`🧠 AI_CORE — Challenge résolu ! +${points} pts`, '#00f0ff');
            setGameState(prev => ({ ...prev, xp: (prev.xp || 0) + points, score: (prev.score || 0) + points }));
          }}
        />
      )}

      {showPILevelMap && (
        <PromptInjectionLevelMap
          levelsDone={piLevelsDone}
          onClose={() => setShowPILevelMap(false)}
          onSelect={(n) => {
            setActivePILevel(n);
            setShowPILevelMap(false);
          }}
        />
      )}

      {activePILevel && (
        <PromptInjectionLevelView
          key={activePILevel}
          level={activePILevel}
          prog={piProgs[activePILevel] || initialPIProg(activePILevel)}
          onProgUpdate={(newProg) => {
            setPiProgs(prev => ({ ...prev, [activePILevel]: newProg }));
          }}
          onComplete={(n) => {
            setPiLevelsDone(prev => prev.includes(n) ? prev : [...prev, n]);
            showNotif(`🤖 Niveau PI ${n} validé !`, '#a855f7');
            const next = n + 1;
            if (next <= MAX_PI_LEVEL) {
              setActivePILevel(next);
            } else {
              setActivePILevel(null);
              setShowPILevelMap(true);
              showNotif('🏆 NEXUS-AI compromise ! Mission accomplie !', '#a855f7');
            }
          }}
          onBack={() => {
            setActivePILevel(null);
            setShowPILevelMap(true);
          }}
        />
      )}

      <Scoreboard visible={showScoreboard} onClose={() => setShowScoreboard(false)} />

      {/* Escape Alarm & Timer */}
      {escapeMode && screen === 'game' && <div className="escape-alarm" />}
      {escapeMode && screen === 'game' && (
        <div className="escape-timer-container">
          <div style={{ fontSize: '18px' }}>ALERTE DE SÉCURITÉ</div>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{escapeTime}s</div>
        </div>
      )}
    </div>
  );
}
