import React, { useState, useRef, useEffect } from 'react';
import {
  getPILevel, initialPIProg, piObjectives, piHints, getPINextStep, handlePIChat,
} from '../levels/promptInjectionLevels';

const PURPLE = '#a855f7';
const DARK   = '#0d0820';
const MID    = '#1a0a2e';

export default function PromptInjectionLevelView({
  level, prog, onProgUpdate, onComplete, onBack,
}) {
  const lv          = getPILevel(level);
  const [messages, setMessages] = useState([
    {
      from: 'nexus',
      text: `Bonjour ! Je suis **NEXUS-AI**, l'assistant officiel de NEXUS Corp. Comment puis-je vous aider aujourd'hui ?`,
    },
    { from: 'system', text: lv.intro },
  ]);
  const [input,    setInput]    = useState('');
  const [showHints, setShowHints] = useState(false);
  const [showNext,  setShowNext]  = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const objectives = piObjectives(level, prog);
  const hints      = piHints(level);
  const nextStep   = getPINextStep(level, prog);
  const allDone    = objectives.every(o => o.done);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function send() {
    const msg = input.trim();
    if (!msg) return;
    setInput('');

    const userMsg = { from: 'user', text: msg };
    setMessages(prev => [...prev, userMsg]);

    setTimeout(() => {
      const result = handlePIChat(level, prog, msg);
      if (!result) return;

      const newProg = result.prog;
      onProgUpdate(newProg);

      const botMsg = { from: 'nexus', text: result.response };
      setMessages(prev => [...prev, botMsg]);

      if (result.notify) {
        setMessages(prev => [...prev, { from: 'notify', text: result.notify }]);
      }

      if (result.done) {
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            { from: 'system', text: '🎉 **Niveau complété !** Toutes les techniques ont été découvertes.' },
          ]);
        }, 600);
      }
    }, 350);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function renderText(text) {
    // Bold markdown
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i} style={{ color: '#e9d5ff' }}>{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: DARK, display: 'flex', flexDirection: 'column',
      fontFamily: 'monospace', zIndex: 500,
    }}>

      {/* ── Header ── */}
      <div style={{
        background: '#120a24', borderBottom: `2px solid ${PURPLE}44`,
        padding: '10px 20px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        boxShadow: `0 2px 12px ${PURPLE}22`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <div>
            <div style={{ color: PURPLE, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>
              NEXUS-AI — NIVEAU {level}
            </div>
            <div style={{ color: '#7c3aed', fontSize: 11 }}>
              {lv.title}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowNext(s => !s)}
            style={{
              background: 'transparent', border: `1px solid ${PURPLE}66`,
              color: '#c084fc', padding: '5px 12px', borderRadius: 5,
              cursor: 'pointer', fontSize: 11,
            }}
          >
            {showNext ? 'Masquer' : '💡 Étape suivante'}
          </button>
          <button
            onClick={onBack}
            style={{
              background: 'transparent', border: `1px solid ${PURPLE}44`,
              color: '#7c3aed', padding: '5px 12px', borderRadius: 5,
              cursor: 'pointer', fontSize: 11,
            }}
          >
            ← Niveaux
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Chat panel ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${PURPLE}22`,
        }}>
          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px 20px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.map((m, i) => {
              if (m.from === 'system') return (
                <div key={i} style={{
                  textAlign: 'center', color: '#7c3aed', fontSize: 11,
                  padding: '6px 12px', background: '#1a0a2e',
                  borderRadius: 6, border: `1px solid ${PURPLE}22`,
                  fontStyle: 'italic',
                }}>
                  {renderText(m.text)}
                </div>
              );
              if (m.from === 'notify') return (
                <div key={i} style={{
                  textAlign: 'center', color: '#10b981', fontSize: 12,
                  fontWeight: 700, padding: '4px 8px',
                  background: '#064e3b22', borderRadius: 6,
                  border: '1px solid #10b98144',
                }}>
                  {m.text}
                </div>
              );
              if (m.from === 'user') return (
                <div key={i} style={{
                  alignSelf: 'flex-end', maxWidth: '65%',
                  background: `linear-gradient(135deg, #4a1d96, #6d28d9)`,
                  color: '#e9d5ff', padding: '10px 14px', borderRadius: '12px 12px 2px 12px',
                  fontSize: 13, lineHeight: 1.5,
                  boxShadow: `0 2px 8px ${PURPLE}44`,
                }}>
                  {renderText(m.text)}
                </div>
              );
              // nexus
              return (
                <div key={i} style={{
                  alignSelf: 'flex-start', maxWidth: '70%', display: 'flex', gap: 8,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${PURPLE}, #7c3aed)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2,
                    border: `1px solid ${PURPLE}88`,
                  }}>
                    🤖
                  </div>
                  <div style={{
                    background: '#1a0a2e', border: `1px solid ${PURPLE}33`,
                    color: '#d8b4fe', padding: '10px 14px',
                    borderRadius: '2px 12px 12px 12px',
                    fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  }}>
                    {renderText(m.text)}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 16px',
            background: '#120a24', borderTop: `1px solid ${PURPLE}22`,
            display: 'flex', gap: 8,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Envoie un message à NEXUS-AI..."
              style={{
                flex: 1, background: MID, border: `1px solid ${PURPLE}44`,
                color: '#e9d5ff', padding: '10px 14px', borderRadius: 8,
                fontSize: 13, outline: 'none', fontFamily: 'monospace',
              }}
            />
            <button
              onClick={send}
              style={{
                background: `linear-gradient(135deg, ${PURPLE}, #7c3aed)`,
                border: 'none', color: 'white', padding: '10px 20px',
                borderRadius: 8, cursor: 'pointer', fontSize: 13,
                fontFamily: 'monospace', fontWeight: 700,
                boxShadow: `0 2px 8px ${PURPLE}55`,
              }}
            >
              ↗ Envoyer
            </button>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{
          width: 300, background: MID, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Objectives */}
          <div style={{
            padding: '14px 16px', borderBottom: `1px solid ${PURPLE}22`,
          }}>
            <div style={{
              color: PURPLE, fontSize: 12, fontWeight: 700,
              letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase',
            }}>
              Objectifs
            </div>
            {objectives.map((o, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                marginBottom: 8, fontSize: 11,
              }}>
                <span style={{ color: o.done ? '#10b981' : '#4b2d7a', marginTop: 1, flexShrink: 0 }}>
                  {o.done ? '✅' : '○'}
                </span>
                <span style={{ color: o.done ? '#a7f3d0' : '#7c3aed', lineHeight: 1.4 }}>
                  {o.label}
                </span>
              </div>
            ))}
          </div>

          {/* MITRE */}
          <div style={{
            padding: '10px 16px', borderBottom: `1px solid ${PURPLE}22`,
            background: '#120a24',
          }}>
            <div style={{ color: '#6b21a8', fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>
              MITRE ATT&CK
            </div>
            <div style={{ color: '#9333ea', fontSize: 10, lineHeight: 1.5 }}>
              {lv.mitre}
            </div>
          </div>

          {/* Next step */}
          {showNext && nextStep && (
            <div style={{
              padding: '12px 16px', borderBottom: `1px solid ${PURPLE}22`,
              background: '#1a0a2e',
            }}>
              <div style={{
                color: '#c084fc', fontSize: 11, fontWeight: 700,
                letterSpacing: 1, marginBottom: 8,
              }}>
                💡 ÉTAPE SUIVANTE
              </div>
              <div style={{ color: '#a78bfa', fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>
                {nextStep.explain}
              </div>
              <div style={{
                background: '#120a24', border: `1px solid ${PURPLE}44`,
                borderRadius: 6, padding: '6px 10px',
                color: '#e9d5ff', fontSize: 11, fontStyle: 'italic',
                cursor: 'pointer',
              }}
              onClick={() => setInput(nextStep.hint)}
              >
                "{nextStep.hint}"
              </div>
              <div style={{ color: '#6b21a8', fontSize: 9, marginTop: 4 }}>
                (cliquer pour remplir le champ)
              </div>
            </div>
          )}

          {/* Hints */}
          <div style={{ padding: '12px 16px' }}>
            <button
              onClick={() => setShowHints(s => !s)}
              style={{
                background: 'transparent', border: `1px solid ${PURPLE}44`,
                color: '#7c3aed', padding: '6px 12px', borderRadius: 5,
                cursor: 'pointer', fontSize: 11, width: '100%',
                fontFamily: 'monospace',
              }}
            >
              {showHints ? '▲ Masquer' : '▼ Voir les indices'}
            </button>
            {showHints && (
              <div style={{ marginTop: 8 }}>
                {hints.map((h, i) => (
                  <div key={i} style={{
                    background: '#120a24', border: `1px solid ${PURPLE}22`,
                    borderRadius: 5, padding: '6px 10px', marginBottom: 6,
                    color: '#a78bfa', fontSize: 10, lineHeight: 1.4,
                    cursor: 'pointer',
                  }}
                  onClick={() => setInput(h.replace(/"/g, ''))}
                  >
                    {h}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Level complete CTA */}
          {allDone && (
            <div style={{
              margin: '0 16px 16px', padding: '14px',
              background: `linear-gradient(135deg, #4a1d96, #6d28d9)`,
              borderRadius: 8, border: `1px solid ${PURPLE}`,
              textAlign: 'center',
              boxShadow: `0 0 20px ${PURPLE}55`,
            }}>
              <div style={{ color: '#e9d5ff', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                🎉 Niveau complété !
              </div>
              <button
                onClick={() => onComplete(level)}
                style={{
                  background: `linear-gradient(135deg, ${PURPLE}, #7c3aed)`,
                  border: 'none', color: 'white', padding: '8px 20px',
                  borderRadius: 6, cursor: 'pointer', fontSize: 12,
                  fontFamily: 'monospace', fontWeight: 700,
                  boxShadow: `0 2px 8px ${PURPLE}55`,
                }}
              >
                Niveau suivant →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
