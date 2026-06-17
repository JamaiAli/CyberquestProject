import { useState } from 'react';

// Renders a simulated DVWA browser pane for a given web level.
// Props: level (config), prog (progress), output (array of {t,c}|string),
//        webError (string|null), onSubmit(action)
export default function VulnBrowser({ level, prog, output, webError, onSubmit }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0e14' }}>
      {/* Browser chrome */}
      <div style={{
        flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px', background: '#11161f', borderBottom: '1px solid #1c2630',
      }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={dot('#ff5f56')} /><span style={dot('#ffbd2e')} /><span style={dot('#27c93f')} />
        </div>
        <div style={{
          flex: 1, background: '#070a0f', border: '1px solid #1c2630', borderRadius: '5px',
          padding: '5px 12px', color: '#7fbf9f', fontFamily: 'monospace', fontSize: '12px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          🔒 {level.url}
        </div>
      </div>

      {/* DVWA page body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
        <DvwaShell>
          <PageBody level={level} prog={prog} output={output} webError={webError} onSubmit={onSubmit} />
        </DvwaShell>
      </div>
    </div>
  );
}

const dot = (col) => ({ width: 11, height: 11, borderRadius: '50%', background: col, display: 'inline-block' });

// DVWA red/grey skin wrapper
function DvwaShell({ children }) {
  return (
    <div style={{ fontFamily: '"Segoe UI", Arial, sans-serif', color: '#e6e6e6', minHeight: '100%' }}>
      <div style={{
        background: 'linear-gradient(#2a0000,#1a0000)', borderBottom: '2px solid #c00',
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: '#e23', fontWeight: 'bold', fontSize: '20px', letterSpacing: '1px' }}>DVWA</span>
        <span style={{ color: '#888', fontSize: '11px' }}>Damn Vulnerable Web Application</span>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  );
}

const H = ({ children }) => (
  <h2 style={{ color: '#e6e6e6', borderBottom: '1px solid #333', paddingBottom: '8px', fontSize: '18px', margin: '0 0 16px' }}>{children}</h2>
);

const inputStyle = {
  background: '#1b1b1b', border: '1px solid #444', color: '#eee',
  padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', borderRadius: '3px',
};
const btnStyle = {
  background: '#c00', border: 'none', color: '#fff', padding: '7px 18px',
  cursor: 'pointer', fontWeight: 'bold', borderRadius: '3px', fontSize: '13px',
};

function OutBox({ output, webError }) {
  if (webError) {
    return <div style={{ marginTop: 14, padding: 12, background: '#2a0a0a', border: '1px solid #c00', borderRadius: 4, color: '#f88', fontFamily: 'monospace', fontSize: 13 }}>{webError}</div>;
  }
  if (!output || output.length === 0) return null;
  return (
    <pre style={{
      marginTop: 14, padding: 12, background: '#0a0a0a', border: '1px solid #333',
      borderRadius: 4, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6,
      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    }}>
      {output.map((l, i) => {
        const txt = typeof l === 'string' ? l : l.t;
        const col = typeof l === 'string' ? '#9fe' : (l.c || '#9fe');
        return <div key={i} style={{ color: col }}>{txt || ' '}</div>;
      })}
    </pre>
  );
}

// ── Per-level page body ──
function PageBody({ level, prog, output, webError, onSubmit }) {
  const [val, setVal]   = useState('');
  const [user, setUser] = useState('admin');
  const [pass, setPass] = useState('password');
  const [sec, setSec]   = useState('low');

  // ── Level 1 : Docker multi-step ──
  if (level.id === 'docker') {
    if (prog.phase === 'down') {
      return (
        <div style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔌</div>
          <div style={{ color: '#e88', fontSize: 16, fontWeight: 'bold' }}>Impossible d'accéder à ce site</div>
          <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}>localhost a refusé la connexion · ERR_CONNECTION_REFUSED</div>
          <div style={{ marginTop: 20, color: '#7fbf9f', fontSize: 12 }}>→ Démarre les conteneurs depuis le terminal : <code>docker compose -f dvwa-compose.yml up -d</code></div>
        </div>
      );
    }
    if (prog.phase === 'up') {
      return (
        <>
          <H>Login :: DVWA</H>
          <div style={{ maxWidth: 320 }}>
            <div style={{ marginBottom: 10 }}><label style={lbl}>Username</label>
              <input style={{ ...inputStyle, width: '100%' }} value={user} onChange={e => setUser(e.target.value)} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Password</label>
              <input type="password" style={{ ...inputStyle, width: '100%' }} value={pass} onChange={e => setPass(e.target.value)} /></div>
            <button style={btnStyle} onClick={() => onSubmit({ button: 'login', user, pass })}>Login</button>
          </div>
          <OutBox webError={webError} />
        </>
      );
    }
    if (prog.phase === 'setup') {
      return (
        <>
          <H>Database Setup :: DVWA</H>
          <p style={{ color: '#bbb', fontSize: 13 }}>Click on the 'Create / Reset Database' button below to create or reset your database.</p>
          <button style={btnStyle} onClick={() => onSubmit({ button: 'reset' })}>Create / Reset Database</button>
          <OutBox webError={webError} />
        </>
      );
    }
    // security
    return (
      <>
        <H>DVWA Security :: DVWA</H>
        <p style={{ color: '#bbb', fontSize: 13 }}>Security Level is currently: <b style={{ color: prog.phase === 'done' ? '#3c3' : '#e88' }}>{prog.phase === 'done' ? 'low' : 'impossible'}</b>.</p>
        <select style={{ ...inputStyle, marginRight: 10 }} value={sec} onChange={e => setSec(e.target.value)}>
          <option value="low">Low</option><option value="medium">Medium</option>
          <option value="high">High</option><option value="impossible">Impossible</option>
        </select>
        <button style={btnStyle} onClick={() => onSubmit({ button: 'security', value: sec })}>Submit</button>
        <OutBox webError={webError} />
        {prog.phase === 'done' && <div style={{ marginTop: 16, color: '#3c3', fontWeight: 'bold' }}>✓ Environnement prêt — niveau validé.</div>}
      </>
    );
  }

  // ── Level 2 : Command Injection ──
  if (level.id === 'cmdi') {
    return (
      <>
        <H>Vulnerability: Command Injection</H>
        <p style={{ color: '#bbb', fontSize: 13, margin: '0 0 10px' }}>Ping a device</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#bbb', fontSize: 13 }}>Enter an IP address:</span>
          <input style={inputStyle} value={val} placeholder="127.0.0.1"
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSubmit({ value: val }); }} />
          <button style={btnStyle} onClick={() => onSubmit({ value: val })}>Submit</button>
        </div>
        <OutBox output={output} webError={webError} />
      </>
    );
  }

  // ── Level 5 : File Inclusion (?page= parameter) ──
  if (level.id === 'lfi') {
    return (
      <>
        <H>Vulnerability: File Inclusion</H>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#7fbf9f', marginBottom: 10, wordBreak: 'break-all' }}>
          {level.url}?page=<span style={{ color: '#ffd93d' }}>{val || 'include.php'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#bbb', fontSize: 13 }}>?page=</span>
          <input style={{ ...inputStyle, width: 440 }} value={val} placeholder="../../../../etc/passwd"
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSubmit({ value: val }); }} />
          <button style={btnStyle} onClick={() => onSubmit({ value: val })}>Inclure</button>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: '#777' }}>
          Pages légitimes : file1.php · file2.php · file3.php
        </div>
        <OutBox output={output} webError={webError} />
      </>
    );
  }

  // ── Level 6 : File Upload ──
  if (level.id === 'upload') {
    return (
      <>
        <H>Vulnerability: File Upload</H>
        <p style={{ color: '#bbb', fontSize: 13, margin: '0 0 10px' }}>Choose an image to upload:</p>
        <div style={{
          border: '1px dashed #555', borderRadius: 5, padding: '16px', background: '#141414',
          display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 22 }}>📄</span>
          <input style={{ ...inputStyle, width: 260 }} value={val} placeholder="shell.php"
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSubmit({ value: val }); }} />
          <button style={btnStyle} onClick={() => onSubmit({ value: val })}>Upload</button>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: '#777' }}>
          Le fichier doit exister sur Kali (crée-le dans le terminal : <code>cat &gt; shell.php</code>).
        </div>
        <OutBox output={output} webError={webError} />
      </>
    );
  }

  // ── Level 3 & 4 : SQLi / Blind (User ID form) ──
  const blind = level.id === 'blind';
  return (
    <>
      <H>Vulnerability: SQL Injection{blind ? ' (Blind)' : ''}</H>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: '#bbb', fontSize: 13 }}>User ID:</span>
        <input style={{ ...inputStyle, width: 360 }} value={val} placeholder="1"
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit({ value: val }); }} />
        <button style={btnStyle} onClick={() => onSubmit({ value: val })}>Submit</button>
      </div>
      <OutBox output={output} webError={webError} />
    </>
  );
}

const lbl = { display: 'block', color: '#bbb', fontSize: 12, marginBottom: 4 };
