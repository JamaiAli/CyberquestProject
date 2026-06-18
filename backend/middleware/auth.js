const jwt = require('jsonwebtoken');

// Les secrets JWT proviennent EXCLUSIVEMENT de l'environnement (backend/.env).
// Aucune valeur en dur : un secret en clair dans le code source est exploitable
// par quiconque accède au dépôt (forge des jetons d'accès). Générer la valeur via :
//   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    'JWT_SECRET et JWT_REFRESH_SECRET doivent être définis dans backend/.env. ' +
    'Génère-les avec : node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Récupère la partie <token> de "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Jeton invalide ou expiré.' });
    }
    // Ajoute les infos utilisateur à la requête
    req.user = decoded;
    next();
  });
}

module.exports = {
  authenticateToken,
  JWT_SECRET,
  JWT_REFRESH_SECRET
};
