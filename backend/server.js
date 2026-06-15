const express = require('express');
const cors = require('cors');
const { processCommand } = require('./engine/commandEngine');
const { getGameState, updateGameState, getScoreboard } = require('./engine/gameState');

const app = express();
app.use(cors());
app.use(express.json());

// Named scores store (persists in memory for this session)
const namedScores = [];

app.post('/api/command', (req, res) => {
  const { command, sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  const state = getGameState(sessionId);
  const result = processCommand(command, state);
  const savedState = updateGameState(sessionId, result.newState);
  res.json({ ...result, newState: savedState });
});

app.get('/api/state/:sessionId', (req, res) => {
  res.json(getGameState(req.params.sessionId));
});

app.post('/api/score', (req, res) => {
  const { playerName, xp, level, time, flag, sessionId } = req.body;
  const existing = namedScores.findIndex(s => s.sessionId === sessionId);
  const entry = { playerName: playerName || 'Anonyme', xp, level, time, flag, sessionId, date: new Date().toISOString() };
  if (existing >= 0) namedScores[existing] = entry;
  else namedScores.push(entry);
  namedScores.sort((a, b) => b.xp - a.xp);
  const rank = namedScores.findIndex(s => s.sessionId === sessionId) + 1;
  res.json({ rank });
});

app.get('/api/scoreboard', (req, res) => {
  // Merge named scores with anonymous sessions
  const anon = getScoreboard();
  const named = namedScores.slice(0, 10);
  // Return named ones first (they have more info), then anonymous
  const combined = [...named];
  anon.forEach(a => {
    if (!named.find(n => n.sessionId === a.sessionId)) {
      combined.push({ playerName: 'Anonyme', xp: a.xp, level: a.level, sessionId: a.sessionId });
    }
  });
  res.json(combined.sort((a, b) => b.xp - a.xp).slice(0, 10));
});

const PORT = 3001;
app.listen(PORT, () => console.log(`CyberQuest backend on port ${PORT}`));
