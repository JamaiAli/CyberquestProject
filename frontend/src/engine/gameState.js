export function createInitialState(sessionId) {
  return {
    sessionId,
    xp: 0,
    level: 1,
    hp: 100,
    maxHp: 100,
    mode: 'NETWORK',           // 'NETWORK' | 'MACHINE'
    pwnedMachines: [],
    scannedMachines: [],
    unlockedMachines: ['webserver', 'mailserver'],
    currentMachine: null,
    machinePhase: 0,           // 0=recon 1=scan 2=exploit 3=post
    rootObtained: false,
    score: 0,
    startTime: Date.now(),
    createdAt: Date.now(),
    listenerPort: null,
    hydraDone: false,
    asrepDone: false,
    svcBackupCreds: false,
    smbShareAccessed: false,
    ntdsDumped: false,
  };
}

export function getGameState(sessionId) {
  const stored = localStorage.getItem(`gameState_${sessionId}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse game state from local storage", e);
    }
  }
  const newState = createInitialState(sessionId);
  localStorage.setItem(`gameState_${sessionId}`, JSON.stringify(newState));
  return newState;
}

export function updateGameState(sessionId, newState) {
  const current = getGameState(sessionId);
  const merged = { ...current, ...newState };
  const newLevel = Math.floor(merged.xp / 100) + 1;
  if (newLevel > merged.level) {
    merged.level = newLevel;
    merged.maxHp = 100 + (newLevel - 1) * 20;
    merged.hp = Math.min(merged.hp + 20, merged.maxHp);
  }
  localStorage.setItem(`gameState_${sessionId}`, JSON.stringify(merged));
  
  updateScoreboard(sessionId, merged.xp, merged.level, merged.pwnedMachines.length);
  return merged;
}

export function updateScoreboard(sessionId, xp, level, pwnedCount) {
  const stored = localStorage.getItem('scoreboard') || '[]';
  let board = [];
  try {
    board = JSON.parse(stored);
  } catch (e) {
    board = [];
  }
  const existing = board.find(s => s.sessionId === sessionId);
  if (existing) {
    existing.xp = Math.max(existing.xp, xp);
    existing.level = Math.max(existing.level, level);
    existing.pwnedCount = Math.max(existing.pwnedCount, pwnedCount);
  } else {
    board.push({ sessionId, xp, level, pwnedCount });
  }
  board.sort((a, b) => b.xp - a.xp);
  board = board.slice(0, 10);
  localStorage.setItem('scoreboard', JSON.stringify(board));
}

export function getScoreboard() {
  const stored = localStorage.getItem('scoreboard') || '[]';
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
}
