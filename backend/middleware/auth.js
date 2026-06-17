const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cyberquest_access_secret_key_2031';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'cyberquest_refresh_secret_key_2031';

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
