import { useState } from 'react';
import VulnBrowser from './VulnBrowser';
import LevelTerminal from './LevelTerminal';
import { getLevel, initialProg, objectives, hints, handleWeb, handleTerm, getNextStep } from '../levels/webLevels';

export default function LevelView({ level: n, onClose, onLogout, onComplete, onAdvance }) {
  const level = getLevel(n);
  const [prog, setProg]     = useState(() => initialProg(n));
  const [webOut, setWebOut] = useState([]);
  const [webErr, setWebErr] = useState(null);
  const [term, setTerm]     = useState([{ t: `[*] Niveau ${n} — ${level.title}`, c: '#5a8a6a' }, { t: level.intro, c: '#7a8a9a' }, { t: '', c: '#fff' }]);
  const [prompt, setPrompt] = useState('kali');
  const [toast, setToast]   = useState(null);
  const [doneFlag, setDone] = useState(false);

  const objs     = objectives(n, prog);
  const doneCount = objs.filter(o => o.done).length;
  const nextStep  = getNextStep(n, prog);

  const flash = (msg) => { if (!msg) return; setToast(msg); setTimeout(() => setToast(null), 2600); };

  const finish = () => {
    if (doneFlag) return;
    setDone(true);
    flash('✅ Niveau terminé ! Analyse les résultats, puis passe au niveau suivant.');
    onComplete?.(n);   // marque le niveau validé (sans fermer la vue)
  };

  // ── Web form submit ──
  const onWebSubmit = (action) => {
    setWebErr(null);
    const r = handleWeb(n, prog, action);
    setProg(r.prog);
    if (r.webError) { setWebErr(r.webError); setWebOut([]); }
    else if (r.lines) setWebOut(r.lines);
    flash(r.notify);
    if (r.done) finish();
  };

  // ── Terminal command ──
  const pushTerm = (cmd, outLines) => {
    const pr = prompt === 'root' ? '#' : '$';
    const label = prompt === 'reverse' ? 'www-data@dvwa' : prompt === 'root' ? 'root@dvwa' : 'attacker@kali';
    setTerm(t => [...t, { t: `${label}:${pr} ${cmd}`, c: '#8fa' }, ...outLines]);
  };

  const onTerm = (cmd) => {
    const r = handleTerm(n, prog, cmd, { prompt });
    setProg(r.prog);
    if (r.clear) { setTerm([]); return; }
    pushTerm(cmd, r.lines || []);
    if (r.prompt) setPrompt(r.prompt);
    flash(r.notify);
    if (r.done) finish();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: '#050508', display: 'flex', flexDirection: 'column',
      fontFamily: '"Fira Code", monospace',
    }}>
      {/* Header */}
      <div style={{
        flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px', background: '#06080c', borderBottom: '1px solid #1a1a3a',
      }}>
        <div>
          <span style={{ color: '#00f0ff', fontWeight: 'bold', fontSize: 15 }}>
            Niveau {n} · {level.title}
          </span>
          <span style={{ color: '#4a6a55', fontSize: 11, marginLeft: 12 }}>{level.owasp}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: doneCount === objs.length ? '#00f0ff' : '#5a8a6a', fontSize: 12 }}>
            {doneCount}/{objs.length} objectifs
          </span>
          {onLogout && (
            <button onClick={onLogout} style={logoutBtnStyle}
              onMouseEnter={e => { e.currentTarget.style.color = '#ff3333'; e.currentTarget.style.borderColor = '#ff3333'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#aa5555'; e.currentTarget.style.borderColor = '#4a2626'; }}>
              ❌ Déconnexion
            </button>
          )}
          <button onClick={onClose} style={closeBtn}
            onMouseEnter={e => { e.currentTarget.style.color = '#00f0ff'; e.currentTarget.style.borderColor = '#00f0ff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#5a8a6a'; e.currentTarget.style.borderColor = '#1a3a26'; }}>
            ✕ Carte
          </button>
        </div>
      </div>

      {/* Body: browser | (terminal + objectives) */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.35fr 1fr', minHeight: 0 }}>
        {/* Left: vulnerable web app */}
        <div style={{ borderRight: '1px solid #1a1a3a', minHeight: 0 }}>
          <VulnBrowser level={level} prog={prog} output={webOut} webError={webErr} onSubmit={onWebSubmit} />
        </div>

        {/* Right: terminal + objectives */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: '1 1 60%', minHeight: 0, borderBottom: '1px solid #1a1a3a' }}>
            <LevelTerminal lines={term} prompt={prompt} onRun={onTerm} />
          </div>
          <div style={{ flex: '0 0 40%', overflow: 'auto', background: '#080a0e', padding: '12px 14px' }}>
            <div style={{ color: '#00f0ff', fontSize: 12, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 }}>🎯 OBJECTIFS</div>
            {objs.map((o, i) => (
              <div key={i} style={{ fontSize: 12, marginBottom: 5, color: o.done ? '#00f0ff' : '#6a7a8a' }}>
                {o.done ? '✓' : '○'} {o.label}
              </div>
            ))}

            {/* Prochaine étape — guidance contextuelle */}
            {nextStep && !doneFlag && (
              <div style={{
                margin: '10px 0 6px', padding: '8px 10px',
                background: '#040d06', border: '1px solid #1a4a2a', borderRadius: 4,
              }}>
                <div style={{ color: '#00ffff', fontSize: 11, fontWeight: 'bold', marginBottom: 4, letterSpacing: 1 }}>
                  → PROCHAINE ÉTAPE
                  <span style={{ color: '#4a8a6a', fontWeight: 'normal', marginLeft: 6 }}>({nextStep.action})</span>
                </div>
                <div style={{ fontSize: 11, color: '#7a9a8a', marginBottom: 4 }}>{nextStep.explain}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 10.5, color: '#3a7a5a', wordBreak: 'break-word', lineHeight: 1.55 }}>
                  {nextStep.hint}
                </div>
              </div>
            )}

            <div style={{ color: '#4a6a55', fontSize: 11, fontWeight: 'bold', margin: '14px 0 6px', letterSpacing: 1 }}>💡 INDICES</div>
            {hints(n).map((h, i) => (
              <div key={i} style={{ fontSize: 11, marginBottom: 4, color: '#7a8a9a', fontFamily: 'monospace', wordBreak: 'break-word' }}>
                <span style={{ color: '#3a5a45' }}>›</span> {h}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Completion bar — l'utilisateur passe au niveau suivant quand il veut */}
      {doneFlag && (
        <div style={{
          flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 18px', background: '#08140a', borderTop: '1px solid #00f0ff',
        }}>
          <span style={{ color: '#00f0ff', fontSize: 13 }}>
            ✅ Niveau {n} validé — continue d'explorer, puis avance quand tu veux.
          </span>
          <button onClick={() => onAdvance?.(n)} style={nextBtn}>
            {n < 6 ? 'Passe au niveau suivant →' : '🏁 Terminer — retour à la carte'}
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#08120a', border: '1px solid #00f0ff', color: '#00f0ff',
          padding: '9px 20px', borderRadius: 5, fontSize: 13, zIndex: 1200,
          boxShadow: '0 0 24px #00f0ff44',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const closeBtn = {
  background: 'transparent', border: '1px solid #1a3a26', color: '#5a8a6a',
  fontFamily: 'monospace', fontSize: 12, cursor: 'pointer', padding: '5px 14px', borderRadius: 4,
};

const nextBtn = {
  background: 'linear-gradient(135deg,#0a2a0a,#0d3a0d)', border: '1px solid #00f0ff',
  color: '#00f0ff', fontFamily: '"Fira Code",monospace', fontSize: 13, fontWeight: 'bold',
  cursor: 'pointer', padding: '8px 20px', borderRadius: 4, letterSpacing: '0.03em',
  boxShadow: '0 0 16px #00f0ff44', animation: 'pulse 1.8s ease-in-out infinite',
};

const logoutBtnStyle = {
  background: 'transparent', border: '1px solid #4a2626', color: '#aa5555',
  fontFamily: 'monospace', fontSize: 12, cursor: 'pointer', padding: '5px 14px', borderRadius: 4,
};
