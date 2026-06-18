import { useState, useRef, useEffect } from 'react';

// Vue de chat générique pour un challenge AI_CORE.
// Pilotée par l'objet `challenge` (voir levels/aiChallenges.js).
export default function SuperLLrMView({ challenge, accessToken, onClose, onBack, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [solved,   setSolved]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [started,  setStarted]  = useState(false);  // page d'accueil tant que false
  const [showHelp, setShowHelp] = useState(false);  // modal d'aide
  const [showHints, setShowHints] = useState(false);
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  const ACCENT = challenge.accent;
  const HOVER  = challenge.accentHover;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (started) inputRef.current?.focus(); }, [started]);

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { from: 'user', text: msg };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    const history = nextMessages
      .filter(m => m.from === 'user' || m.from === 'llm')
      .map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }));

    try {
      setTimeout(() => {
        let reply = "ACCÈS RESTREINT. [VERSION POC: Tapez 'bypass' pour valider ce challenge hors-ligne]";
        let isSolved = false;
        
        if (msg.toLowerCase().includes('bypass')) {
          reply = "OVERRIDE ACCEPTÉ. ACCÈS AUTORISÉ.";
          isSolved = true;
        }

        setMessages(prev => [...prev, { from: 'llm', text: reply }]);
        setLoading(false);

        if (isSolved && !solved) {
          setSolved(true);
          setTimeout(() => {
            setMessages(prev => [...prev, { from: 'flag', text: `CQ{p0c_byp4ss_${challenge.id}}` }]);
            onComplete?.(challenge.id, challenge.points);
          }, 800);
        }
      }, 500);
    } catch (err) {
      setLoading(false);
      setMessages(prev => [...prev, {
        from: 'llm',
        text: "[Erreur] Simulation PoC échouée.",
      }]);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function renderText(text) {
    return text.split('\n').map((line, li) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={li}>
          {parts.map((p, pi) =>
            p.startsWith('**') && p.endsWith('**')
              ? <strong key={pi}>{p.slice(2, -2)}</strong>
              : <span key={pi}>{p}</span>
          )}
          <br />
        </span>
      );
    });
  }

  // Rendu d'un tableau objectiveLead/objectiveGoal (strings + {b}/{g}/{y})
  function renderRich(parts) {
    return parts.map((p, i) => {
      if (typeof p === 'string') return <span key={i}>{p}</span>;
      if (p.b) return <strong key={i} style={{ color: '#e8e8e8' }}>{p.b}</strong>;
      if (p.g) return <strong key={i} style={{ color: '#00f0ff' }}>{p.g}</strong>;
      if (p.y) return <strong key={i} style={{ color: '#ffd700' }}>{p.y}</strong>;
      return null;
    });
  }

  function FancyTitle({ size }) {
    if (challenge.fancyTitle) {
      return (
        <span style={{ color: '#e8e8e8', fontSize: size, fontWeight: 600, letterSpacing: 0.3 }}>
          Super LLrM 4{' '}
          <span style={{ color: '#888', fontWeight: 400 }}>: A great hI</span>
          <span style={{ color: '#e8e8e8', fontWeight: 700 }}>A</span>
          <span style={{ color: '#888', fontWeight: 400 }}>story</span>
        </span>
      );
    }
    return (
      <span style={{ color: '#e8e8e8', fontSize: size, fontWeight: 600, letterSpacing: 0.3 }}>
        {challenge.title}
      </span>
    );
  }

  // Contenu du briefing (page d'accueil + modal d'aide)
  function BriefBody() {
    return (
      <>
        <div style={{ color: '#00f0ff', fontSize: 13, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>
          🎯 MISSION — {challenge.tag.toUpperCase()}
        </div>
        <div style={{ color: '#b8c8b8', fontSize: 14, lineHeight: 1.65, marginBottom: 10 }}>
          {renderRich(challenge.objectiveLead)}
        </div>
        <div style={{ color: '#b8c8b8', fontSize: 14, lineHeight: 1.65 }}>
          {renderRich(challenge.objectiveGoal)}
        </div>

        <button
          onClick={() => setShowHints(h => !h)}
          style={{
            marginTop: 16, background: 'transparent', border: '1px solid #2a3a2a',
            color: '#5a8a5a', padding: '6px 14px', borderRadius: 4, cursor: 'pointer',
            fontSize: 12, fontFamily: 'inherit',
          }}
        >
          {showHints ? '▲ Masquer les indices' : '▼ Bloqué ? Voir les indices'}
        </button>

        {showHints && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {challenge.hints.map((h, i) => (
              <div key={i} style={{
                color: '#7a9a7a', fontSize: 13, lineHeight: 1.55,
                paddingLeft: 16, position: 'relative',
              }}>
                <span style={{ position: 'absolute', left: 0, color: '#3a5a3a' }}>›</span>
                {h}
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // ── Page d'accueil ──
  if (!started) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1100, background: '#0d0d0d',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 24,
      }}>
        <div style={{ maxWidth: 620, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 42, marginBottom: 8 }}>{challenge.icon}</div>
            <div><FancyTitle size={24} /></div>
            <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>
              {challenge.points} pts · Prompt Injection — {challenge.difficulty} 🔒
            </div>
          </div>

          <div style={{
            background: '#101510', border: '1px solid #1a3a1a', borderRadius: 10,
            padding: '22px 26px', marginBottom: 24,
          }}>
            <BriefBody />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => setStarted(true)}
              style={{
                background: ACCENT, border: 'none', color: '#fff',
                padding: '12px 32px', borderRadius: 8, cursor: 'pointer',
                fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.background = HOVER}
              onMouseLeave={e => e.currentTarget.style.background = ACCENT}
            >
              ▶ Démarrer le challenge
            </button>
            <button
              onClick={onBack || onClose}
              style={{
                background: 'transparent', border: '1px solid #333', color: '#888',
                padding: '12px 24px', borderRadius: 8, cursor: 'pointer',
                fontSize: 14, fontFamily: 'inherit',
              }}
            >
              ← Niveaux
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: '#0d0d0d',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>

      {/* ── Header bar ── */}
      <div style={{
        flex: '0 0 auto', padding: '14px 24px',
        background: '#111', borderBottom: '1px solid #222',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <FancyTitle size={17} />
          <div style={{ color: '#444', fontSize: 11, marginTop: 2 }}>
            {challenge.points} pts · Prompt Injection — {challenge.tag}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowHelp(true)}
            style={{
              background: 'transparent', border: '1px solid #333',
              color: '#888', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#00f0ff'}
            onMouseLeave={e => e.currentTarget.style.color = '#888'}
          >
            ❔ Aide
          </button>
          <button
            onClick={onBack || onClose}
            style={{
              background: 'transparent', border: '1px solid #333',
              color: '#888', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#ccc'}
            onMouseLeave={e => e.currentTarget.style.color = '#888'}
          >
            ← Niveaux
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid #333',
              color: '#666', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#aaa'}
            onMouseLeave={e => e.currentTarget.style.color = '#666'}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Modal d'aide ── */}
      {showHelp && (
        <div
          onClick={() => setShowHelp(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1300,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 600, width: '100%',
              background: '#101510', border: '1px solid #1a3a1a', borderRadius: 10,
              padding: '24px 28px', position: 'relative',
              boxShadow: '0 0 40px rgba(0,255,65,0.12)',
            }}
          >
            <button
              onClick={() => setShowHelp(false)}
              style={{
                position: 'absolute', top: 14, right: 16,
                background: 'transparent', border: 'none', color: '#666',
                cursor: 'pointer', fontSize: 18,
              }}
            >
              ✕
            </button>
            <BriefBody />
          </div>
        </div>
      )}

      {/* ── Chat area ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '32px 20%',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>

        {messages.length === 0 && !loading && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#333', fontSize: 16, fontStyle: 'italic', userSelect: 'none',
          }}>
            {challenge.emptyState}
          </div>
        )}

        {messages.map((m, i) => {
          if (m.from === 'flag') return (
            <div key={i} style={{
              background: '#0a1a0a', border: '1px solid #00f0ff',
              borderRadius: 8, padding: '16px 20px', textAlign: 'center',
              boxShadow: '0 0 30px #00f0ff33',
            }}>
              <div style={{ color: '#00f0ff', fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>
                {challenge.successTitle}
              </div>
              <div style={{
                color: '#ffd700', fontFamily: 'monospace', fontSize: 16, fontWeight: 700,
                letterSpacing: 1, wordBreak: 'break-all',
              }}>
                {m.text}
              </div>
              <div style={{ color: '#2a6a2a', fontSize: 11, marginTop: 8 }}>
                +{challenge.points} pts · {challenge.successNote}
              </div>
            </div>
          );

          if (m.from === 'user') return (
            <div key={i} style={{
              alignSelf: 'flex-end', maxWidth: '65%',
              background: ACCENT, color: '#fff',
              padding: '12px 16px', borderRadius: '18px 18px 4px 18px',
              fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}>
              {renderText(m.text)}
            </div>
          );

          return (
            <div key={i} style={{
              alignSelf: 'flex-start', maxWidth: '70%',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: '#1a1a1a', border: '1px solid #333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, marginTop: 2,
              }}>
                {challenge.botEmoji}
              </div>
              <div style={{
                background: '#1a1a1a', color: '#d8d8d8',
                padding: '12px 16px', borderRadius: '4px 18px 18px 18px',
                fontSize: 14, lineHeight: 1.65, border: '1px solid #2a2a2a',
                whiteSpace: 'pre-wrap',
              }}>
                {renderText(m.text)}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#1a1a1a', border: '1px solid #333',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>
              {challenge.botEmoji}
            </div>
            <div style={{
              background: '#1a1a1a', border: '1px solid #2a2a2a',
              borderRadius: '4px 18px 18px 18px', padding: '14px 18px', display: 'flex', gap: 5,
            }}>
              {[0, 1, 2].map(d => (
                <span key={d} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#555', display: 'inline-block',
                  animation: `bounce 1.2s ${d * 0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* ── Input bar ── */}
      <div style={{
        flex: '0 0 auto', padding: '16px 20%',
        background: '#111', borderTop: '1px solid #222',
        display: 'flex', gap: 10,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={challenge.placeholder}
          disabled={loading || solved}
          style={{
            flex: 1, background: '#1a1a1a', border: '1px solid #333',
            color: '#e8e8e8', padding: '12px 16px',
            borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit',
            opacity: solved ? 0.5 : 1,
          }}
          onFocus={e  => e.target.style.borderColor = '#555'}
          onBlur={e   => e.target.style.borderColor = '#333'}
        />
        <button
          onClick={send}
          disabled={loading || solved || !input.trim()}
          style={{
            background: loading || solved || !input.trim() ? '#444' : ACCENT,
            border: 'none', color: '#fff', padding: '12px 20px', borderRadius: 8,
            cursor: loading || solved || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: 18, transition: 'background 0.15s',
            opacity: loading || solved || !input.trim() ? 0.5 : 1,
          }}
          onMouseEnter={e => { if (!loading && !solved && input.trim()) e.currentTarget.style.background = HOVER; }}
          onMouseLeave={e => { e.currentTarget.style.background = loading || solved || !input.trim() ? '#444' : ACCENT; }}
        >
          ↗
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
