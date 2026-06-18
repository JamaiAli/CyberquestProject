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

import { signData, verifyAndDecodeData } from './cryptoUtils.js';

export function getGameState(sessionId) {
  const stored = localStorage.getItem(`gameState_${sessionId}`);
  if (stored) {
    const decoded = verifyAndDecodeData(stored);
    if (decoded) {
      try {
        return JSON.parse(decoded);
      } catch (e) {
        console.error("Failed to parse game state", e);
      }
    }
  }
  const newState = createInitialState(sessionId);
  localStorage.setItem(`gameState_${sessionId}`, signData(JSON.stringify(newState)));
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
  localStorage.setItem(`gameState_${sessionId}`, signData(JSON.stringify(merged)));
  
  addScore({
    sessionId,
    xp: merged.xp,
    level: merged.level,
    pwnedCount: merged.pwnedMachines.length
  });
  return merged;
}

export function getScoreboard() {
  const rawPayload = localStorage.getItem('scoreboard');
  if (!rawPayload) return [];
  const decodedStr = verifyAndDecodeData(rawPayload);
  if (decodedStr) {
    try {
      return JSON.parse(decodedStr);
    } catch(e) {
      return [];
    }
  }
  return [];
}

export function addScore(scoreEntry) {
  const scores = getScoreboard();
  const existingIndex = scores.findIndex(s => s.sessionId === scoreEntry.sessionId);
  if (existingIndex >= 0) {
    if (scoreEntry.xp > scores[existingIndex].xp) {
      scores[existingIndex] = scoreEntry;
    }
  } else {
    scores.push(scoreEntry);
  }
  scores.sort((a, b) => b.xp - a.xp);
  
  const signedPayload = signData(JSON.stringify(scores));
  localStorage.setItem('scoreboard', signedPayload);
}
