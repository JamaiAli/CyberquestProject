import { useState, useEffect } from 'react';

import { getScoreboard } from '../engine/gameState';

export default function Scoreboard({ visible, onClose }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    // Court-circuitage : récupération des scores depuis localStorage via l'engine
    try {
      const data = getScoreboard();
      setScores(data);
    } catch (e) {
      setScores([]);
    }
    setLoading(false);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontFamily: 'monospace' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#0a0f0a', border: '2px solid #00ff41', borderRadius: '6px', padding: '24px', minWidth: '380px', boxShadow: '0 0 50px rgba(0,255,65,0.25)', animation: 'fadeIn 0.2s ease' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ color: '#00ff41', fontSize: '15px', fontWeight: 'bold', textAlign: 'center', marginBottom: '18px', letterSpacing: '1px' }}>
          🏆 HALL OF FAME
        </div>

        {loading ? (
          <div style={{ color: '#555', textAlign: 'center', padding: '12px' }}>Chargement...</div>
        ) : scores.length === 0 ? (
          <div style={{ color: '#555', textAlign: 'center', padding: '12px' }}>
            Aucun score enregistré.<br />
            <span style={{ fontSize: '11px', color: '#333' }}>Joue et soumets ton score avec "scores"</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                {['#','Joueur','XP','Niv.','Temps'].map(h => (
                  <th key={h} style={{ color: '#444', fontWeight: 'normal', padding: '4px 8px', textAlign: h === '#' || h === 'Niv.' || h === 'XP' || h === 'Temps' ? 'center' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr key={s.sessionId || i} style={{ borderBottom: '1px solid #0f0f0f', color: i === 0 ? '#ffd700' : i === 1 ? '#aaa' : i === 2 ? '#cd7f32' : '#888' }}>
                  <td style={{ padding: '7px 8px', textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</td>
                  <td style={{ padding: '7px 8px', color: i === 0 ? '#ffd700' : '#ccc' }}>{s.playerName || 'Anonyme'}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'center', color: '#ffff00' }}>{s.xp}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'center', color: '#00ff41' }}>{s.level}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'center', color: '#555', fontSize: '11px' }}>{s.time || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button
          onClick={onClose}
          style={{ marginTop: '18px', width: '100%', background: '#1a1a1a', color: '#00ff41', border: '1px solid #2a2a2a', padding: '8px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', borderRadius: '3px' }}
          onMouseEnter={e => e.target.style.borderColor = '#00ff41'}
          onMouseLeave={e => e.target.style.borderColor = '#2a2a2a'}
        >
          [ESC] Fermer
        </button>
      </div>
    </div>
  );
}
