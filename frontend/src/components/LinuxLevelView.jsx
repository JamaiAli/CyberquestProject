import { useState } from 'react';
import LevelTerminal from './LevelTerminal';
import {
  getLinuxLevel, initialLinuxProg, linuxObjectives, handleLinuxTerm, MAX_LINUX_LEVEL
} from '../levels/linuxLevels';

export default function LinuxLevelView({ level: n, accessToken, onClose, onComplete, onAdvance }) {
  const level = getLinuxLevel(n);
  const [prog, setProg]   = useState(() => initialLinuxProg(n));
  const [term, setTerm]   = useState([
    { t: `[*] Niveau Linux ${n} — ${level.title}`, c: '#00ff41' },
    { t: level.intro, c: '#4a9a4a' },
    { t: 'Tape les commandes de base pour valider les objectifs.', c: '#ffd93d' },
    { t: '', c: '#fff' },
  ]);
  const [prompt, setPrompt] = useState('linux');
  const [envState, setEnvState] = useState(null);
  const [toast, setToast]   = useState(null);
  const [doneFlag, setDone] = useState(false);

  const objs      = linuxObjectives(n, prog);
  const doneCount = objs.filter(o => o.done).length;

  const flash = (msg) => { if (!msg) return; setToast(msg); setTimeout(() => setToast(null), 2600); };

  const finish = () => {
    if (doneFlag) return;
    setDone(true);
    flash('✅ Niveau validé ! Continue d\'explorer ou passe au niveau suivant.');
    onComplete?.(n);
  };

  const onTerm = async (cmd) => {
    // 1. Affiche la commande
    const pr    = prompt === 'root' ? '#' : '$';
    const label = prompt === 'root' ? 'root@linux-training' : 'kali@linux-training';
    setTerm(t => [...t, { t: `${label}:${pr} ${cmd}`, c: '#00ff41' }]);

    // 2. Latence réaliste de 400 à 1000ms
    await new Promise(res => setTimeout(res, 400 + Math.random() * 600));

    // 3. Affiche le résultat
    const r = await handleLinuxTerm(n, prog, cmd, { prompt, envState, accessToken: accessToken });
    setProg(r.prog);
    if (r.envState) setEnvState(r.envState);

    if (r.clear) { setTerm([]); return; }
    if (r.lines && r.lines.length > 0) {
      setTerm(t => [...t, ...r.lines]);
    }
    if (r.prompt) setPrompt(r.prompt);
    flash(r.notify);
    if (r.done) finish();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: '#050a05', display: 'flex', flexDirection: 'column',
      fontFamily: '"Fira Code", monospace',
    }}>
      {/* Header */}
      <div style={{
        flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px', background: '#060c06', borderBottom: '1px solid #0a2a0a',
      }}>
        <div>
          <span style={{ color: '#00ff41', fontWeight: 'bold', fontSize: 15 }}>
            Niveau {n} · {level.title}
          </span>
          <span style={{ color: '#2a5a2a', fontSize: 11, marginLeft: 12 }}>Formation Bash</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: doneCount === objs.length ? '#00ff41' : '#2a5a2a', fontSize: 12 }}>
            {doneCount}/{objs.length} objectifs
          </span>
          <button onClick={onClose} style={closeBtn}
            onMouseEnter={e => { e.currentTarget.style.color = '#00ff41'; e.currentTarget.style.borderColor = '#00ff41'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#3a7a3a'; e.currentTarget.style.borderColor = '#1a3a1a'; }}>
            ✕ Carte
          </button>
        </div>
      </div>

      {/* Body: terminal | panel droit */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.6fr 1fr', minHeight: 0 }}>

        {/* Gauche : terminal plein */}
        <div style={{ borderRight: '1px solid #0a2a0a', minHeight: 0 }}>
          <LevelTerminal 
            lines={term} 
            prompt={prompt} 
            promptPath={envState?.cwd}
            onRun={onTerm} 
          />
        </div>

        {/* Droite : panel d'informations + objectifs */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto', background: '#070a07' }}>
          
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #0a2a0a' }}>
            <div style={{ color: '#00ff41', fontSize: 11, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 }}>
              🐧 CIBLE — LINUX TRAINING
            </div>
            <div style={{ color: '#2a6a2a', fontSize: 10, marginBottom: 8, fontFamily: 'monospace' }}>
              Environnement bac à sable pour l'apprentissage des commandes.
            </div>
          </div>

          <div style={{ padding: '10px 12px' }}>
            <div style={{ color: '#00ff41', fontSize: 11, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 }}>
              🎯 OBJECTIFS (COMMANDE A TESTER)
            </div>
            {objs.map((o, i) => (
              <div key={i} style={{ fontSize: 11, marginBottom: 5, color: o.done ? '#00ff41' : '#2a4a2a', lineHeight: 1.4 }}>
                {o.done ? '✓' : '○'} {o.label}
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Barre de complétion */}
      {doneFlag && (
        <div style={{
          flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 18px', background: '#060f06', borderTop: '1px solid #00ff41',
        }}>
          <span style={{ color: '#00ff41', fontSize: 13 }}>
            ✅ Niveau {n} validé — excellent travail !
          </span>
          <button onClick={() => onAdvance?.(n)} style={nextBtn}>
            {n < MAX_LINUX_LEVEL ? 'Passe à l\'étape suivante →' : '🏁 Formation terminée — retour à la carte'}
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#061a06', border: '1px solid #00ff41', color: '#00ff41',
          padding: '9px 20px', borderRadius: 5, fontSize: 13, zIndex: 1200,
          boxShadow: '0 0 24px #00ff4144',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const closeBtn = {
  background: 'transparent', border: '1px solid #1a3a1a', color: '#3a7a3a',
  fontFamily: 'monospace', fontSize: 12, cursor: 'pointer', padding: '5px 14px', borderRadius: 4,
};

const nextBtn = {
  background: 'linear-gradient(135deg,#061a06,#0a2a0a)', border: '1px solid #00ff41',
  color: '#00ff41', fontFamily: '"Fira Code",monospace', fontSize: 13, fontWeight: 'bold',
  cursor: 'pointer', padding: '8px 20px', borderRadius: 4, letterSpacing: '0.03em',
  boxShadow: '0 0 16px #00ff4144', animation: 'pulse 1.8s ease-in-out infinite',
};
