import { useState, useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
//  MENTOR — Assistant pédagogique flottant, disponible partout dans le jeu.
//  Propulsé par Groq (Llama 3.3 70B) via /api/assistant.
//  Le `context` décrit où se trouve le joueur pour des réponses pertinentes.
// ═══════════════════════════════════════════════════════════════════════════

const SUGGESTIONS = [
  'Je dois faire quoi maintenant ?',
  'À quoi sert cette commande ?',
  'Pourquoi on l\'utilise ici ?',
  'Explique-moi ce concept simplement.',
];

export default function AssistantBot({ accessToken, context }) {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');

    const nextMessages = [...messages, { role: 'user', content: q }];
    setMessages(nextMessages);
    setLoading(true);

    const history = nextMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ question: q, context, history }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "[Erreur] Je n'arrive pas à répondre. Vérifie que le backend tourne.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(o => !o)}
        title="MENTOR — ton assistant"
        style={{
          position: 'fixed', bottom: 22, right: 22, zIndex: 2000,
          width: 58, height: 58, borderRadius: '50%',
          background: open ? '#0a2a0a' : 'linear-gradient(135deg,#0a2a0a,#063006)',
          border: '2px solid #00ff41', color: '#00ff41',
          fontSize: 26, cursor: 'pointer',
          boxShadow: '0 0 22px rgba(0,255,65,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open ? '✕' : '🎓'}
      </button>

      {/* Fenêtre de chat */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 22, zIndex: 2000,
          width: 360, maxWidth: 'calc(100vw - 44px)', height: 480, maxHeight: 'calc(100vh - 130px)',
          background: '#0a0f0a', border: '1px solid #1a4a1a', borderRadius: 12,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 30px rgba(0,255,65,0.12)',
          fontFamily: "'Inter','Segoe UI',sans-serif",
        }}>

          {/* Header */}
          <div style={{
            flex: '0 0 auto', padding: '12px 16px',
            background: '#0c160c', borderBottom: '1px solid #1a3a1a',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: '#0a2a0a', border: '1px solid #00ff41',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
            }}>🎓</div>
            <div>
              <div style={{ color: '#00ff41', fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>MENTOR</div>
              <div style={{ color: '#3a6a3a', fontSize: 11 }}>Ton assistant — pose tes questions</div>
            </div>
          </div>

          {/* Zone de messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 14px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {messages.length === 0 && !loading && (
              <div style={{ color: '#4a6a4a', fontSize: 13, lineHeight: 1.6 }}>
                Salut ! 👋 Je suis là pour t'aider. Demande-moi par exemple :
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => send(s)}
                      style={{
                        textAlign: 'left', background: '#0e1a0e', border: '1px solid #1a3a1a',
                        color: '#7aaa7a', padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                        fontSize: 12.5, fontFamily: 'inherit', transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#00ff41'; e.currentTarget.style.color = '#aadfaa'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a3a1a'; e.currentTarget.style.color = '#7aaa7a'; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              m.role === 'user' ? (
                <div key={i} style={{
                  alignSelf: 'flex-end', maxWidth: '82%',
                  background: '#1a4a1a', color: '#e8f8e8',
                  padding: '9px 13px', borderRadius: '14px 14px 4px 14px',
                  fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                </div>
              ) : (
                <div key={i} style={{
                  alignSelf: 'flex-start', maxWidth: '88%',
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    background: '#0a2a0a', border: '1px solid #1a5a1a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                  }}>🎓</div>
                  <div style={{
                    background: '#101810', color: '#cfe8cf',
                    padding: '9px 13px', borderRadius: '4px 14px 14px 14px',
                    fontSize: 13.5, lineHeight: 1.6, border: '1px solid #1a2a1a',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {m.content}
                  </div>
                </div>
              )
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#0a2a0a', border: '1px solid #1a5a1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                }}>🎓</div>
                <div style={{
                  background: '#101810', border: '1px solid #1a2a1a',
                  borderRadius: '4px 14px 14px 14px', padding: '12px 16px', display: 'flex', gap: 5,
                }}>
                  {[0, 1, 2].map(d => (
                    <span key={d} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#3a7a3a',
                      display: 'inline-block', animation: `mentorBounce 1.2s ${d * 0.2}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Barre de saisie */}
          <div style={{
            flex: '0 0 auto', padding: '10px 12px',
            background: '#0c160c', borderTop: '1px solid #1a3a1a',
            display: 'flex', gap: 8,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Pose ta question…"
              disabled={loading}
              style={{
                flex: 1, background: '#0a120a', border: '1px solid #1a3a1a',
                color: '#e8f8e8', padding: '10px 12px', borderRadius: 8,
                fontSize: 13, outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={e => e.target.style.borderColor = '#00ff41'}
              onBlur={e  => e.target.style.borderColor = '#1a3a1a'}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? '#1a2a1a' : '#00ff41',
                border: 'none', color: loading || !input.trim() ? '#3a5a3a' : '#042a04',
                padding: '0 16px', borderRadius: 8,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: 16, fontWeight: 700,
              }}
            >
              ↗
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes mentorBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
