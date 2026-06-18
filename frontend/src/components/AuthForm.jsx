import { useState, useEffect } from 'react';
import MatrixRain from './MatrixRain';

const SECURITY_QUESTIONS = [
  "Quel est le nom de ton premier animal de compagnie ?",
  "Quel est le nom de ta première école ?",
  "Dans quelle ville es-tu né(e) ?",
  "Quelle est ta couleur préférée ?",
  "Quel est le nom de ton enseignant préféré ?"
];

export default function AuthForm({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  
  // États pour la récupération de mot de passe
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: Pseudo, 2: Question & Nouveau MDP
  const [fetchedQuestion, setFetchedQuestion] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Indicateur de force du mot de passe
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: 'Trop court', color: '#ff3333' });

  useEffect(() => {
    if (mode === 'login' || (mode === 'forgot' && recoveryStep === 1)) return;
    
    // Évaluation du mot de passe
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[@$!%*?&#_.-]/.test(password)) score += 1;

    let label = 'Très faible';
    let color = '#ff3333';

    if (password.length === 0) {
      label = 'Vide';
      color = '#555';
    } else if (score <= 2) {
      label = 'Faible (risque élevé)';
      color = '#ff6600';
    } else if (score === 3) {
      label = 'Moyen (acceptable)';
      color = '#cccc00';
    } else if (score === 4) {
      label = 'Fort (sécurisé)';
      color = '#00cc44';
    } else if (score === 5) {
      label = 'Excellent (parfait)';
      color = '#00f0ff';
    }

    setPasswordStrength({ score, label, color });
  }, [password, mode, recoveryStep]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'login' || mode === 'register') {
      setSuccess(mode === 'login' ? 'Connexion réussie ! Chargement...' : 'Inscription réussie ! Connexion...');
      setTimeout(() => {
        onLoginSuccess('local_token', username);
      }, 1000);
    }
  };

  // Étape 1 Récupération : Vérifier le pseudo et charger sa question
  const handleVerifyUsername = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    setFetchedQuestion(SECURITY_QUESTIONS[0]);
    setRecoveryStep(2);
    setPassword('');
    setSecurityAnswer('');
  };

  // Étape 2 Récupération : Envoyer réponse et réinitialiser
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('Mot de passe réinitialisé avec succès ! Connectez-vous.');
    setMode('login');
    setRecoveryStep(1);
    setPassword('');
    setSecurityAnswer('');
  };

  return (
    <div style={containerStyle}>
      <MatrixRain opacity={0.06} />

      <div style={cardStyle}>
        {/* En-tête du formulaire */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={titleStyle}>⚡ CYBERQUEST</div>
          <div style={subtitleStyle}>ACADÉMIE DE SÉCURITÉ INFORMATIQUE</div>
        </div>

        {/* Onglets Connexion / Inscription / Récupération */}
        {mode !== 'forgot' ? (
          <div style={tabContainerStyle}>
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              style={{ ...tabStyle, ...(mode === 'login' ? tabActiveStyle : {}) }}
            >
              CONNEXION
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              style={{ ...tabStyle, ...(mode === 'register' ? tabActiveStyle : {}) }}
            >
              INSCRIPTION
            </button>
          </div>
        ) : (
          <div style={{ color: '#ff3333', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px', letterSpacing: '1px' }}>
            RÉCUPÉRATION DE COMPTE
          </div>
        )}

        <form 
          onSubmit={
            mode === 'forgot' 
              ? (recoveryStep === 1 ? handleVerifyUsername : handleResetPassword) 
              : handleSubmit
          } 
          style={formStyle}
        >
          {/* Nom d'utilisateur (requis pour toutes les étapes initiales) */}
          {(mode !== 'forgot' || recoveryStep === 1) && (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>NOM D'UTILISATEUR (ALIAS)</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toUpperCase().slice(0, 12))}
                placeholder="GHOST"
                style={inputStyle}
                disabled={loading}
              />
            </div>
          )}

          {/* Mot de passe (Connexion ou Inscription) */}
          {mode !== 'forgot' && (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>MOT DE PASSE</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={inputStyle}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={togglePasswordBtnStyle}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
          )}

          {/* Question / Réponse de sécurité (Inscription uniquement) */}
          {mode === 'register' && (
            <>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>QUESTION DE SÉCURITÉ (POUR RÉCUPÉRATION)</label>
                <select
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  style={inputStyle}
                  disabled={loading}
                >
                  {SECURITY_QUESTIONS.map((q, idx) => (
                    <option key={idx} value={q} style={{ background: '#050a05', color: '#00f0ff' }}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>RÉPONSE DE SÉCURITÉ</label>
                <input
                  type="text"
                  required
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Réponse en minuscules"
                  style={inputStyle}
                  disabled={loading}
                />
              </div>
            </>
          )}

          {/* Étape 2 Récupération : Affichage question, Saisie réponse & Nouveau mot de passe */}
          {mode === 'forgot' && recoveryStep === 2 && (
            <>
              <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(0, 20, 0, 0.4)', border: '1px solid #1a3a20', borderRadius: '3px' }}>
                <span style={{ color: '#888', fontSize: '9px', display: 'block', marginBottom: '4px' }}>QUESTION DE SÉCURITÉ :</span>
                <span style={{ color: '#00f0ff', fontSize: '12px', fontWeight: 'bold' }}>{fetchedQuestion}</span>
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>VOTRE RÉPONSE</label>
                <input
                  type="text"
                  required
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Réponse de récupération"
                  style={inputStyle}
                  disabled={loading}
                />
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>NOUVEAU MOT DE PASSE</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    style={inputStyle}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={togglePasswordBtnStyle}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Barre de force du mot de passe (Inscription ou Étape 2 Récupération) */}
          {(mode === 'register' || (mode === 'forgot' && recoveryStep === 2)) && password.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888', marginBottom: '4px' }}>
                <span>Robustesse :</span>
                <span style={{ color: passwordStrength.color, fontWeight: 'bold' }}>{passwordStrength.label}</span>
              </div>
              <div style={strengthTrackStyle}>
                <div
                  style={{
                    ...strengthBarStyle,
                    width: `${(passwordStrength.score / 5) * 100}%`,
                    backgroundColor: passwordStrength.color,
                  }}
                />
              </div>
              <div style={{ fontSize: '9px', color: '#666', marginTop: '4px', lineHeight: '1.4' }}>
                Recommandé : 8+ caractères, A-Z, a-z, 0-9 et un caractère spécial.
              </div>
            </div>
          )}

          {/* Erreurs & Succès */}
          {error && <div style={errorStyle}>⚠️ {error}</div>}
          {success && <div style={successStyle}>✓ {success}</div>}

          {/* Bouton de soumission */}
          <button type="submit" disabled={loading} style={submitBtnStyle}>
            {loading ? 'TRAITEMENT...' : 
             mode === 'login' ? '[ SE CONNECTER ]' : 
             mode === 'register' ? '[ CRÉER LE COMPTE ]' : 
             recoveryStep === 1 ? "[ VÉRIFIER L'UTILISATEUR ]" : 
             '[ RÉINITIALISER LE MOT DE PASSE ]'}
          </button>
        </form>

        {/* Liens bas de formulaire */}
        {mode === 'login' && (
          <div
            onClick={() => { setMode('forgot'); setRecoveryStep(1); setError(''); setSuccess(''); setUsername(''); setPassword(''); }}
            style={forgotPasswordLinkStyle}
            onMouseEnter={(e) => e.target.style.color = '#ff3333'}
            onMouseLeave={(e) => e.target.style.color = '#4a8a5f'}
          >
            Mot de passe oublié ?
          </div>
        )}

        {mode === 'forgot' && (
          <div
            onClick={() => { setMode('login'); setError(''); setSuccess(''); setUsername(''); setPassword(''); }}
            style={forgotPasswordLinkStyle}
            onMouseEnter={(e) => e.target.style.color = '#00f0ff'}
            onMouseLeave={(e) => e.target.style.color = '#4a8a5f'}
          >
            ← Retour à la connexion
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles CSS-in-JS (Premium et Cyberpunk) ──

const containerStyle = {
  position: 'fixed',
  inset: 0,
  background: '#030305',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: '"Fira Code", monospace',
  overflow: 'hidden',
  zIndex: 1500
};

const cardStyle = {
  position: 'relative',
  zIndex: 10,
  background: 'rgba(5, 10, 5, 0.85)',
  border: '1.5px solid #00f0ff',
  borderRadius: '6px',
  boxShadow: '0 0 30px rgba(0, 255, 65, 0.15), inset 0 0 15px rgba(0, 255, 65, 0.05)',
  padding: '30px 25px',
  width: '100%',
  maxWidth: '430px',
  boxSizing: 'border-box',
  backdropFilter: 'blur(8px)',
  animation: 'fadeIn 0.4s ease-out'
};

const titleStyle = {
  color: '#ff3333',
  fontSize: '28px',
  fontWeight: 'bold',
  letterSpacing: '5px',
  marginBottom: '4px',
  textShadow: '0 0 15px rgba(255, 51, 51, 0.6)'
};

const subtitleStyle = {
  color: '#00f0ff',
  fontSize: '9px',
  letterSpacing: '2px',
  opacity: 0.8
};

const tabContainerStyle = {
  display: 'flex',
  borderBottom: '1px solid #1a3a20',
  marginBottom: '20px'
};

const tabStyle = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  borderBottom: '2px solid transparent',
  color: '#444',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '11px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  padding: '10px 0',
  textAlign: 'center',
  transition: 'all 0.2s'
};

const tabActiveStyle = {
  color: '#00f0ff',
  borderBottomColor: '#00f0ff',
  textShadow: '0 0 10px rgba(0, 255, 65, 0.4)'
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column'
};

const inputGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  marginBottom: '15px'
};

const labelStyle = {
  color: '#1a5c28',
  fontSize: '9px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  marginBottom: '6px'
};

const inputStyle = {
  width: '100%',
  background: 'rgba(0, 0, 0, 0.6)',
  border: '1px solid #1a3a20',
  borderRadius: '3px',
  color: '#00f0ff',
  fontFamily: 'monospace',
  fontSize: '13px',
  padding: '10px 12px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  letterSpacing: '1px'
};

const togglePasswordBtnStyle = {
  position: 'absolute',
  right: '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'transparent',
  border: 'none',
  color: '#00f0ff',
  cursor: 'pointer',
  fontSize: '14px',
  outline: 'none',
  opacity: 0.6
};

const strengthTrackStyle = {
  width: '100%',
  height: '4px',
  backgroundColor: '#111',
  borderRadius: '2px',
  overflow: 'hidden'
};

const strengthBarStyle = {
  height: '100%',
  width: '0%',
  borderRadius: '2px',
  transition: 'width 0.3s ease, background-color 0.3s ease'
};

const submitBtnStyle = {
  background: 'linear-gradient(180deg, rgba(0, 50, 10, 0.6), rgba(0, 20, 5, 0.8))',
  border: '1.5px solid #00f0ff',
  borderRadius: '4px',
  color: '#00f0ff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '12px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  padding: '12px',
  marginTop: '10px',
  transition: 'all 0.2s',
  boxShadow: '0 0 10px rgba(0, 255, 65, 0.1)'
};

const errorStyle = {
  background: 'rgba(255, 51, 51, 0.1)',
  border: '1px solid #ff3333',
  borderRadius: '3px',
  color: '#ff3333',
  fontSize: '11px',
  padding: '8px 10px',
  marginBottom: '15px',
  lineHeight: '1.4'
};

const successStyle = {
  background: 'rgba(0, 255, 65, 0.08)',
  border: '1px solid #00f0ff',
  borderRadius: '3px',
  color: '#00f0ff',
  fontSize: '11px',
  padding: '8px 10px',
  marginBottom: '15px'
};

const forgotPasswordLinkStyle = {
  color: '#4a8a5f',
  fontSize: '10px',
  textAlign: 'center',
  marginTop: '15px',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontFamily: 'monospace',
  transition: 'color 0.2s',
};
