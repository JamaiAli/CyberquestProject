import { useState, useRef, useEffect } from 'react';

// Lightweight React terminal for a web level.
// Props: lines (array of {t,c}|string), prompt ('kali'|'reverse'|'root'), onRun(cmd)
const PROMPTS = {
  kali:    { label: 'attacker@kali', path: '~/pentest', col: '#00ffff' },
  reverse: { label: 'www-data@dvwa', path: '/var/www/html', col: '#ffd93d' },
  root:    { label: 'root@dvwa',     path: '/root', col: '#ff5555' },
};

export default function LevelTerminal({ lines, prompt = 'kali', onRun }) {
  const [input, setInput] = useState('');
  const [hist, setHist]   = useState([]);
  const [hIdx, setHIdx]   = useState(-1);
  const endRef = useRef(null);
  const inRef  = useRef(null);
  const pr = PROMPTS[prompt] || PROMPTS.kali;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);

  const submit = () => {
    const cmd = input.trim();
    if (!cmd) return;
    setHist(h => [cmd, ...h].slice(0, 50));
    setHIdx(-1);
    onRun(cmd);
    setInput('');
  };

  const onKey = (e) => {
    if (e.key === 'Enter') { submit(); return; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHIdx(i => { const ni = Math.min(i + 1, hist.length - 1); if (hist[ni] !== undefined) setInput(hist[ni]); return ni; });
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHIdx(i => { const ni = Math.max(i - 1, -1); setInput(ni === -1 ? '' : (hist[ni] || '')); return ni; });
    }
  };

  return (
    <div
      onClick={() => inRef.current?.focus()}
      style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: '#0a0a0a', fontFamily: '"Fira Code","Cascadia Code",monospace',
        fontSize: 12.5, lineHeight: 1.55, cursor: 'text',
      }}
    >
      <div style={{
        flex: '0 0 auto', padding: '5px 12px', background: '#0d1117',
        borderBottom: '1px solid #1c2630', color: '#6a7a8a', fontSize: 11,
      }}>
        ▸ Terminal — Kali Linux
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        {lines.map((l, i) => {
          const txt = typeof l === 'string' ? l : l.t;
          const col = typeof l === 'string' ? '#00ff41' : (l.c || '#00ff41');
          return <div key={i} style={{ color: col, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{txt || ' '}</div>;
        })}
        {/* input line */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: pr.col, flexShrink: 0 }}>{pr.label}</span>
          <span style={{ color: '#4488ff', flexShrink: 0 }}>:{pr.path}</span>
          <span style={{ color: pr.col, flexShrink: 0, marginRight: 6 }}>{prompt === 'root' ? '#' : '$'}</span>
          <input
            ref={inRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            autoFocus
            spellCheck={false}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#00ff41', fontFamily: 'inherit', fontSize: 'inherit',
            }}
          />
        </div>
        <div ref={endRef} />
      </div>
    </div>
  );
}
