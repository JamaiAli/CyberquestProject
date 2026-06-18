const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { processCommand } = require('./engine/commandEngine');
const db = require('./database/db');
const { authenticateToken, JWT_SECRET, JWT_REFRESH_SECRET } = require('./middleware/auth');

const app = express();

// Configuration de CORS avec credentials pour permettre l'envoi sécurisé des cookies HTTP
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// ── En-têtes de sécurité HTTP de base ──
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ── ROUTES D'AUTHENTIFICATION ──

// 1. Inscription
app.post('/api/auth/register', async (req, res) => {
  const { username, password, securityQuestion, securityAnswer } = req.body;

  if (!username || !password || !securityQuestion || !securityAnswer) {
    return res.status(400).json({ error: "Tous les champs sont requis (utilisateur, mot de passe, question et réponse de sécurité)." });
  }

  const cleanUsername = username.trim().toUpperCase();
  if (cleanUsername.length < 3 || cleanUsername.length > 12) {
    return res.status(400).json({ error: "Le nom d'utilisateur doit contenir entre 3 et 12 caractères." });
  }

  // Validation de la complexité du mot de passe (sécurité renforcée)
  const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#_.-])[A-Za-z\d@$!%*?&#_.-]{8,}$/;
  if (!pwdRegex.test(password)) {
    return res.status(400).json({
      error: "Le mot de passe doit faire au moins 8 caractères, contenir une majuscule, une minuscule, un chiffre et un caractère spécial."
    });
  }

  try {
    const existingUser = await db.findUserByUsername(cleanUsername);
    if (existingUser) {
      return res.status(400).json({ error: "Ce nom d'utilisateur est déjà pris." });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const securityAnswerHash = await bcrypt.hash(securityAnswer.trim().toLowerCase(), saltRounds);

    await db.createUser(cleanUsername, passwordHash, securityQuestion.trim(), securityAnswerHash);

    res.status(201).json({ message: "Inscription réussie. Vous pouvez maintenant vous connecter !" });
  } catch (err) {
    console.error('Erreur inscription:', err);
    res.status(500).json({ error: "Une erreur est survenue lors de la création du compte." });
  }
});

// Récupérer la question de sécurité d'un utilisateur (pour mot de passe oublié)
app.get('/api/auth/security-question', async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: "Nom d'utilisateur requis." });
  }

  try {
    const user = await db.findUserByUsername(username.trim().toUpperCase());
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    res.json({ securityQuestion: user.security_question });
  } catch (err) {
    console.error('Erreur récupération question:', err);
    res.status(500).json({ error: "Erreur de serveur lors de la récupération." });
  }
});

// Réinitialiser le mot de passe via réponse de sécurité
app.post('/api/auth/reset-password', async (req, res) => {
  const { username, securityAnswer, newPassword } = req.body;

  if (!username || !securityAnswer || !newPassword) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }

  const cleanUsername = username.trim().toUpperCase();

  // Validation de la complexité du nouveau mot de passe
  const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#_.-])[A-Za-z\d@$!%*?&#_.-]{8,}$/;
  if (!pwdRegex.test(newPassword)) {
    return res.status(400).json({
      error: "Le nouveau mot de passe doit faire au moins 8 caractères, contenir une majuscule, une minuscule, un chiffre et un caractère spécial."
    });
  }

  try {
    const user = await db.findUserByUsername(cleanUsername);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    const match = await bcrypt.compare(securityAnswer.trim().toLowerCase(), user.security_answer_hash);
    if (!match) {
      return res.status(400).json({ error: "Réponse de sécurité incorrecte." });
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await db.updatePassword(cleanUsername, newPasswordHash);

    res.json({ message: "Mot de passe réinitialisé avec succès !" });
  } catch (err) {
    console.error('Erreur réinitialisation mot de passe:', err);
    res.status(500).json({ error: "Erreur de serveur lors de la réinitialisation." });
  }
});

// 2. Connexion
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Veuillez fournir un nom d'utilisateur et un mot de passe." });
  }

  const cleanUsername = username.trim().toUpperCase();

  try {
    const user = await db.findUserByUsername(cleanUsername);
    // Erreur générique pour éviter l'énumération des utilisateurs
    if (!user) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    // Génération des tokens JWT
    const accessToken = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ username: user.username }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Stockage du Refresh Token dans un cookie HttpOnly sécurisé
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh', // restreint aux appels de rafraîchissement
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
    });

    res.json({
      accessToken,
      username: user.username
    });
  } catch (err) {
    console.error('Erreur connexion:', err);
    res.status(500).json({ error: "Une erreur est survenue lors de la connexion." });
  }
});

// 3. Rafraîchissement silencieux de l'Access Token (sécurisé XSS)
app.post('/api/auth/refresh', async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ error: "Non authentifié. Session expirée." });
  }

  try {
    jwt.verify(token, JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        res.clearCookie('refreshToken', { path: '/api/auth/refresh', httpOnly: true, sameSite: 'strict' });
        return res.status(403).json({ error: "Session invalide ou expirée." });
      }

      const user = await db.findUserByUsername(decoded.username);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé." });
      }

      // Génère un nouvel Access Token
      const accessToken = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '15m' });

      res.json({
        accessToken,
        username: user.username
      });
    });
  } catch (err) {
    console.error('Erreur rafraîchissement token:', err);
    res.status(500).json({ error: "Erreur interne de session." });
  }
});

// 4. Déconnexion
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('refreshToken', {
    path: '/api/auth/refresh',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  });
  res.json({ message: "Déconnecté avec succès." });
});


// ── API ROUTES DU JEU (Sécurisées par JWT) ──

// Traiter une commande entrante
app.post('/api/command', authenticateToken, async (req, res) => {
  const { command } = req.body;
  const username = req.user.username;

  try {
    // Charge l'état de l'étudiant
    let state = await db.getGameState(username);
    if (!state) {
      // État de base initial pour un nouveau joueur
      state = {
        sessionId: username,
        xp: 0, level: 1, hp: 100, maxHp: 100,
        mode: 'NETWORK',
        pwnedMachines: [],
        scannedMachines: [],
        unlockedMachines: ['webserver', 'mailserver'],
        currentMachine: null,
        machinePhase: 0,
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

    const result = processCommand(command, state);
    const mergedState = { ...state, ...result.newState };

    // Calcul du niveau/HP
    const newLevel = Math.floor(mergedState.xp / 100) + 1;
    if (newLevel > mergedState.level) {
      mergedState.level = newLevel;
      mergedState.maxHp = 100 + (newLevel - 1) * 20;
      mergedState.hp = Math.min(mergedState.hp + 20, mergedState.maxHp);
    }

    // Sauvegarde en base de données SQLite
    await db.updateGameState(username, mergedState, mergedState.xp, mergedState.level);

    res.json({ ...result, newState: mergedState });
  } catch (err) {
    console.error('Erreur traitement commande:', err);
    res.status(500).json({ error: "Erreur serveur lors du traitement de la commande." });
  }
});

// Récupérer l'état de jeu
app.get('/api/state', authenticateToken, async (req, res) => {
  const username = req.user.username;
  try {
    const state = await db.getGameState(username);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: "Impossible de récupérer l'état de jeu." });
  }
});

// Récupérer le tableau des scores (Top 10)
app.get('/api/scoreboard', async (req, res) => {
  try {
    const board = await db.getScoreboard();
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: "Impossible de charger le tableau des scores." });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`CyberQuest backend on port ${PORT}`));
