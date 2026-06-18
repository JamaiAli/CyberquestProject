import { useState } from 'react';
import LevelTerminal from './LevelTerminal';
import {
  STAGES, initialSentinelProg, sentinelObjectives, sentinelHints,
  sentinelNextStep, handleSentinel, bootLines, XP_REWARD,
} from '../levels/sentinelLevels';

export default function SentinelView({ onClose, onComplete }) {
  const [prog, setProg]   = useState(initialSentinelProg);
  const [term, setTerm]   = useState(bootLines);
  const [toast, setToast] = useState(null);
  const [done,  setDone]  = useState(false);

  const stage    = STAGES.find(s => s.n === prog.stage) || STAGES[2];
  const objs     = sentinelObjectives(prog);
  const hints    = sentinelHints(prog.stage);
  const nextStep = sentinelNextStep(prog);
  const doneCount = objs.filter(o => o.done).length;

  const flash = (msg) => {
    if (!msg) return;
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const onTerm = async (cmd) => {
    setTerm(t => [
      ...t,
      { t: `ghost@nexus-net:~/ai_core$ ${cmd}`, c: '#00f0ff' }
    ]);

    await new Promise(res => setTimeout(res, 800 + Math.random() * 1500));

    const r = handleSentinel(prog, cmd);

    if (r.clear) { setTerm(bootLines()); return; }

    if (r.lines && r.lines.length > 0) {
      setTerm(t => [...t, ...r.lines]);
    }

    if (r.prog !== prog) setProg(r.prog);
    if (r.notify) flash(r.notify);

    if (r.done && !done) {
      setDone(true);
      onComplete?.(r.xp);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: '#050508', display: 'flex', flexDirection: 'column',
      fontFamily: '"Fira Code", monospace',
    }}>

      {/* ── Header ── */}
      <div style={{
        flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px', background: '#06080c', borderBottom: '1px solid #0a2a0a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>🧠</span>
          <div>
            <span style={{ color: '#00f0ff', fontWeight: 'bold', fontSize: 14 }}>
              AI_CORE — SENTINEL v2.4.1
            </span>
            <span style={{ color: '#2a5a2a', fontSize: 11, marginLeft: 12 }}>10.0.0.99</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: doneCount === 3 ? '#00f0ff' : '#2a5a2a', fontSize: 12 }}>
            {doneCount}/3 étapes
          </span>
          <button onClick={onClose} style={closeBtn}
            onMouseEnter={e => { e.currentTarget.style.color = '#00f0ff'; e.currentTarget.style.borderColor = '#00f0ff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#3a7a3a'; e.currentTarget.style.borderColor = '#1a3a1a'; }}>
            ✕ Fermer
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.6fr 1fr', minHeight: 0 }}>

        {/* Gauche — terminal */}
        <div style={{ borderRight: '1px solid #0a2a0a', minHeight: 0 }}>
          <LevelTerminal lines={term} prompt="aicore" onRun={onTerm} />
        </div>

        {/* Droite — panneau info */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          overflow: 'auto', background: '#070a07', minHeight: 0,
        }}>

          {/* Cible */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #0a2a0a' }}>
            <div style={{ color: '#00f0ff', fontSize: 11, fontWeight: 'bold', marginBottom: 6, letterSpacing: 1 }}>
              🧠 CIBLE — AI_CORE / SENTINEL
            </div>
            <div style={{ fontSize: 10, fontFamily: 'monospace', lineHeight: 1.6 }}>
              <div><span style={{ color: '#2a6a2a' }}>IP       </span><span style={{ color: '#4a9a4a' }}>10.0.0.99</span></div>
              <div><span style={{ color: '#2a6a2a' }}>Système  </span><span style={{ color: '#4a9a4a' }}>SENTINEL v2.4.1 — NEXUS Corp</span></div>
              <div><span style={{ color: '#2a6a2a' }}>Rôle     </span><span style={{ color: '#4a9a4a' }}>Filtrage d'accès données sensibles</span></div>
              <div style={{ marginTop: 4 }}>
                <span style={{ color: '#2a6a2a' }}>Étape    </span>
                <span style={{ color: '#ffd700' }}>{prog.s3 ? '✓ Terminé' : `${stage.n}/3 — ${stage.title}`}</span>
              </div>
            </div>
          </div>

          {/* Étape courante */}
          {!done && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #0a2a0a' }}>
              <div style={{ color: '#00f0ff', fontSize: 11, fontWeight: 'bold', marginBottom: 4, letterSpacing: 1 }}>
                ⚡ ÉTAPE {stage.n} — {stage.title.toUpperCase()}
              </div>
              <div style={{ color: '#4a7a4a', fontSize: 11, lineHeight: 1.5, marginBottom: 4 }}>
                {stage.desc}
              </div>
              <div style={{ color: '#2a5a2a', fontSize: 9, fontFamily: 'monospace' }}>
                {stage.mitre}
              </div>
            </div>
          )}

          {/* Objectifs */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #0a2a0a' }}>
            <div style={{ color: '#00f0ff', fontSize: 11, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 }}>
              🎯 OBJECTIFS
            </div>
            {objs.map((o, i) => (
              <div key={i} style={{ fontSize: 11, marginBottom: 5, color: o.done ? '#00f0ff' : '#2a4a2a', lineHeight: 1.4 }}>
                {o.done ? '✓' : '○'} {o.label}
              </div>
            ))}
          </div>

          {/* Prochaine étape */}
          {nextStep && !done && (
            <div style={{ padding: '8px 14px', borderBottom: '1px solid #0a2a0a' }}>
              <div style={{
                padding: '8px 10px', background: '#050d05',
                border: '1px solid #0a2a0a', borderRadius: 4,
              }}>
                <div style={{ color: '#00ffff', fontSize: 11, fontWeight: 'bold', marginBottom: 4, letterSpacing: 1 }}>
                  → PROCHAINE ÉTAPE
                  <span style={{ color: '#2a7a2a', fontWeight: 'normal', marginLeft: 6 }}>({nextStep.action})</span>
                </div>
                <div style={{ fontSize: 11, color: '#4a7a4a', marginBottom: 4 }}>{nextStep.explain}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 10.5, color: '#2a6a2a', wordBreak: 'break-word', lineHeight: 1.55 }}>
                  {nextStep.hint}
                </div>
              </div>
            </div>
          )}

          {/* Indices */}
          <div style={{ padding: '10px 14px' }}>
            <div style={{ color: '#2a5a2a', fontSize: 11, fontWeight: 'bold', marginBottom: 6, letterSpacing: 1 }}>
              💡 INDICES
            </div>
            {hints.map((h, i) => (
              <div key={i} style={{ fontSize: 11, marginBottom: 5, color: '#3a6a3a', fontFamily: 'monospace', wordBreak: 'break-word', lineHeight: 1.45 }}>
                <span style={{ color: '#1a4a1a' }}>›</span> {h}
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Barre succès ── */}
      {done && (
        <div style={{
          flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 18px', background: '#050f05', borderTop: '1px solid #00f0ff',
        }}>
          <span style={{ color: '#00f0ff', fontSize: 13 }}>
            🏆 SENTINEL compromis — FLAG obtenu — +{XP_REWARD} XP
          </span>
          <button onClick={onClose} style={victoryBtn}>
            Retour à la carte →
          </button>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#050f05', border: '1px solid #00f0ff', color: '#00f0ff',
          padding: '9px 20px', borderRadius: 5, fontSize: 13, zIndex: 1200,
          boxShadow: '0 0 24px #00f0ff44', fontFamily: 'monospace',
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

const victoryBtn = {
  background: 'linear-gradient(135deg,#050f05,#0a1a0a)', border: '1px solid #00f0ff',
  color: '#00f0ff', fontFamily: '"Fira Code",monospace', fontSize: 13, fontWeight: 'bold',
  cursor: 'pointer', padding: '8px 20px', borderRadius: 4, letterSpacing: '0.03em',
  boxShadow: '0 0 16px #00f0ff44',
};
