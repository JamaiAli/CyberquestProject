const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'cyberquest.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à SQLite:', err.message);
  } else {
    console.log('Connecté à la base de données SQLite CyberQuest.');
  }
});

// Initialisation des tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      security_question TEXT NOT NULL,
      security_answer_hash TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      game_state TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Erreur lors de la création de la table users:', err.message);
  });
});

// Wrapper de base pour rendre les requêtes compatibles avec async/await (évite le callback-hell)
const dbQuery = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      // Les requêtes sont sécurisées contre SQL Injection grâce aux Prepared Statements (?)
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Fonctions d'accès aux données (DAO)
const dbHelper = {
  // Trouver un utilisateur par son pseudo
  async findUserByUsername(username) {
    return dbQuery.get('SELECT * FROM users WHERE username = ?', [username.toUpperCase()]);
  },

  // Créer un nouvel utilisateur avec question/réponse de sécurité
  async createUser(username, passwordHash, securityQuestion, securityAnswerHash) {
    return dbQuery.run(
      'INSERT INTO users (username, password_hash, security_question, security_answer_hash) VALUES (?, ?, ?, ?)',
      [username.toUpperCase(), passwordHash, securityQuestion, securityAnswerHash]
    );
  },

  // Réinitialiser le mot de passe d'un utilisateur
  async updatePassword(username, newPasswordHash) {
    return dbQuery.run(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [newPasswordHash, username.toUpperCase()]
    );
  },

  // Récupérer l'état de jeu d'un utilisateur
  async getGameState(username) {
    const row = await dbQuery.get('SELECT game_state FROM users WHERE username = ?', [username.toUpperCase()]);
    if (row && row.game_state) {
      try {
        return JSON.parse(row.game_state);
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  // Mettre à jour l'état de jeu et les scores (xp, level)
  async updateGameState(username, state, xp, level) {
    return dbQuery.run(
      'UPDATE users SET game_state = ?, xp = ?, level = ? WHERE username = ?',
      [JSON.stringify(state), xp, level, username.toUpperCase()]
    );
  },

  // Récupérer le classement (Top 10)
  async getScoreboard() {
    return dbQuery.all(
      'SELECT username as playerName, xp, level FROM users ORDER BY xp DESC LIMIT 10'
    );
  }
};

module.exports = dbHelper;
