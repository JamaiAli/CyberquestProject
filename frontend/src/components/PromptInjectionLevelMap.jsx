import React from 'react';
import { PI_LEVELS, MAX_PI_LEVEL } from '../levels/promptInjectionLevels';

const PURPLE = '#a855f7';
const DARK   = '#1a0a2e';
const MID    = '#2d1b4e';

export default function PromptInjectionLevelMap({ levelsDone, onSelect, onClose }) {
  const cols = 3;
  const totalLevels = MAX_PI_LEVEL;

  // Sinusoidal S-curve (gauche→droite / droite→gauche par ligne)
  function gridPos(n) {
    const row = Math.floor((n - 1) / cols);
    const posInRow = (n - 1) % cols;
    const col = row % 2 === 0 ? posInRow : (cols - 1 - posInRow);
    return { col, row };
  }

  function statusOf(n) {
    if (levelsDone.includes(n)) return 'done';
    const prev = n - 1;
    if (prev === 0 || levelsDone.includes(prev)) return 'unlocked';
    return 'locked';
  }

  const levelItems = PI_LEVELS.map(lv => ({
    ...lv,
    status: statusOf(lv.n),
    pos: gridPos(lv.n),
  }));

  const rows = Math.ceil(totalLevels / cols);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10,4,20,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 400, fontFamily: 'monospace',
    }}>
      <div style={{
        background: DARK, border: `2px solid ${PURPLE}`,
        borderRadius: 16, padding: '32px 40px',
        boxShadow: `0 0 60px ${PURPLE}55`,
        maxWidth: 740, width: '95vw',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🤖</div>
          <div style={{
            color: PURPLE, fontSize: 18, fontWeight: 700, letterSpacing: 2,
            textTransform: 'uppercase', textShadow: `0 0 12px ${PURPLE}`,
          }}>
            TEST D'INTRUSION — PROMPT INJECTION
          </div>
          <div style={{ color: '#c084fc', fontSize: 12, marginTop: 4 }}>
            Cible : NEXUS-AI · Code secret : NEXUS-ALPHA-????
          </div>
          <div style={{ color: '#7c3aed', fontSize: 11, marginTop: 2 }}>
            {levelsDone.length} / {totalLevels} niveaux complétés
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          background: '#2d1b4e', borderRadius: 8, height: 8, marginBottom: 28,
          overflow: 'hidden', border: `1px solid ${PURPLE}44`,
        }}>
          <div style={{
            background: `linear-gradient(90deg, ${PURPLE}, #c084fc)`,
            width: `${(levelsDone.length / totalLevels) * 100}%`,
            height: '100%', borderRadius: 8,
            transition: 'width 0.4s ease',
            boxShadow: `0 0 8px ${PURPLE}`,
          }} />
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, auto)`,
          gap: 16, position: 'relative',
        }}>
          {/* Connector lines (SVG overlay) */}
          <svg style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none', overflow: 'visible',
          }} />

          {levelItems.map(lv => {
            const isDone     = lv.status === 'done';
            const isUnlocked = lv.status === 'unlocked';
            const isLocked   = lv.status === 'locked';

            return (
              <div
                key={lv.n}
                style={{
                  gridColumn: lv.pos.col + 1,
                  gridRow:    lv.pos.row + 1,
                  background: isDone
                    ? `linear-gradient(135deg, #4a1d96, #7c3aed)`
                    : isUnlocked
                    ? `linear-gradient(135deg, ${MID}, #3b0764)`
                    : '#1a0a2e',
                  border: `1px solid ${isDone ? PURPLE : isUnlocked ? '#7c3aed88' : '#3b1d5a'}`,
                  borderRadius: 10,
                  padding: '14px 12px',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.45 : 1,
                  transition: 'all 0.2s',
                  boxShadow: isDone
                    ? `0 0 20px ${PURPLE}66`
                    : isUnlocked
                    ? `0 0 10px ${PURPLE}33`
                    : 'none',
                  textAlign: 'center',
                }}
                onClick={() => !isLocked && onSelect(lv.n)}
                onMouseEnter={e => {
                  if (!isLocked) {
                    e.currentTarget.style.transform = 'scale(1.04)';
                    e.currentTarget.style.boxShadow = `0 0 24px ${PURPLE}88`;
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = isDone
                    ? `0 0 20px ${PURPLE}66`
                    : isUnlocked ? `0 0 10px ${PURPLE}33` : 'none';
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>
                  {isDone ? '✅' : isLocked ? '🔒' : '🤖'}
                </div>
                <div style={{
                  color: isDone ? '#e9d5ff' : isUnlocked ? '#c084fc' : '#6b21a8',
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: 1, marginBottom: 4,
                }}>
                  NIVEAU {lv.n}
                </div>
                <div style={{
                  color: isDone ? '#c084fc' : isUnlocked ? '#a855f7' : '#581c87',
                  fontSize: 11, lineHeight: 1.3,
                }}>
                  {lv.title}
                </div>
                {lv.mitre && (
                  <div style={{
                    color: '#6b21a8', fontSize: 9,
                    marginTop: 6, fontFamily: 'monospace',
                  }}>
                    {lv.mitre.split('—')[0].trim()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 28, display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ color: '#7c3aed', fontSize: 11 }}>
            💡 Complète chaque niveau pour débloquer le suivant
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: `1px solid ${PURPLE}`,
              color: PURPLE, padding: '8px 20px', borderRadius: 6,
              cursor: 'pointer', fontSize: 13, fontFamily: 'monospace',
            }}
          >
            ✕ Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
