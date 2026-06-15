const sessions = new Map();

function createInitialState(sessionId) {
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
  };
}

function getGameState(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, createInitialState(sessionId));
  }
  return sessions.get(sessionId);
}

function updateGameState(sessionId, newState) {
  const current = getGameState(sessionId);
  const merged = { ...current, ...newState };
  const newLevel = Math.floor(merged.xp / 100) + 1;
  if (newLevel > merged.level) {
    merged.level = newLevel;
    merged.maxHp = 100 + (newLevel - 1) * 20;
    merged.hp = Math.min(merged.hp + 20, merged.maxHp);
  }
  sessions.set(sessionId, merged);
  return merged;
}

function getScoreboard() {
  return Array.from(sessions.values())
    .map(s => ({ sessionId: s.sessionId, xp: s.xp, level: s.level, pwnedCount: s.pwnedMachines.length }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10);
}

module.exports = { getGameState, updateGameState, getScoreboard };
