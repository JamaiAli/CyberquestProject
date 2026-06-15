// ─── Adaptation Standalone (LocalStorage) ──────────────────────────────────
// Ce fichier remplace le stockage en mémoire (Map) du backend par un stockage
// persistant dans le navigateur via localStorage. Cela permet au jeu de 
// fonctionner de manière 100% autonome sans serveur.

const SESSIONS_KEY = 'cyberquest_sessions';
const SCORES_KEY = 'cyberquest_named_scores';

function getSessionsMap() {
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    if (data) {
      // Conversion de l'objet stocké en Map
      return new Map(Object.entries(JSON.parse(data)));
    }
  } catch (e) {
    console.error('Erreur lecture sessions localStorage', e);
  }
  return new Map();
}

function saveSessionsMap(map) {
  try {
    const obj = Object.fromEntries(map);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(obj));
  } catch (e) {
    console.error('Erreur écriture sessions localStorage', e);
  }
}

function getNamedScores() {
  try {
    const data = localStorage.getItem(SCORES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveNamedScores(scores) {
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
  } catch (e) {
    console.error('Erreur écriture scores localStorage', e);
  }
}

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
  };
}

export function getGameState(sessionId) {
  const sessions = getSessionsMap();
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, createInitialState(sessionId));
    saveSessionsMap(sessions);
  }
  return sessions.get(sessionId);
}

export function updateGameState(sessionId, newState) {
  const sessions = getSessionsMap();
  const current = getGameState(sessionId);
  const merged = { ...current, ...newState };
  const newLevel = Math.floor(merged.xp / 100) + 1;
  if (newLevel > merged.level) {
    merged.level = newLevel;
    merged.maxHp = 100 + (newLevel - 1) * 20;
    merged.hp = Math.min(merged.hp + 20, merged.maxHp);
  }
  sessions.set(sessionId, merged);
  saveSessionsMap(sessions);
  return merged;
}

export function savePlayerScore(playerData) {
  const { playerName, xp, level, time, flag, sessionId } = playerData;
  const namedScores = getNamedScores();
  const existing = namedScores.findIndex(s => s.sessionId === sessionId);
  
  const entry = { 
    playerName: playerName || 'Anonyme', 
    xp, level, time, flag, sessionId, 
    date: new Date().toISOString() 
  };
  
  if (existing >= 0) {
    namedScores[existing] = entry;
  } else {
    namedScores.push(entry);
  }
  
  namedScores.sort((a, b) => b.xp - a.xp);
  saveNamedScores(namedScores);
  
  return namedScores.findIndex(s => s.sessionId === sessionId) + 1; // Retourne le rank
}

export function getScoreboard() {
  const sessions = getSessionsMap();
  const anon = Array.from(sessions.values())
    .map(s => ({ sessionId: s.sessionId, xp: s.xp, level: s.level, pwnedCount: s.pwnedMachines?.length || 0 }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10);
    
  const named = getNamedScores().slice(0, 10);
  const combined = [...named];
  
  // Fusionner pour éviter les doublons
  anon.forEach(a => {
    if (!named.find(n => n.sessionId === a.sessionId)) {
      combined.push({ playerName: 'Anonyme', xp: a.xp, level: a.level, sessionId: a.sessionId });
    }
  });
  
  return combined.sort((a, b) => b.xp - a.xp).slice(0, 10);
}
