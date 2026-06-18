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

// DVWA Cyberpunk wrapper
function DvwaShell({ children }) {
  return (
    <div className="cyber-panel" style={{ fontFamily: '"Rajdhani", Arial, sans-serif', color: '#e0e0ff', minHeight: '100%', margin: '4px' }}>
      <div style={{
        background: 'linear-gradient(90deg, rgba(255,0,127,0.2), transparent)', borderBottom: '2px solid var(--neon-pink)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span className="cyber-font glow" style={{ color: 'var(--neon-pink)', fontSize: '24px' }}>DVWA_CYBER</span>
        <span style={{ color: 'var(--neon-blue)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>Damn Vulnerable Web App</span>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  );
}

const H = ({ children }) => (
  <h2 style={{ color: '#e6e6e6', borderBottom: '1px solid #333', paddingBottom: '8px', fontSize: '18px', margin: '0 0 16px' }}>{children}</h2>
);

const inputStyle = {
  background: 'rgba(10, 10, 26, 0.6)', border: '1px solid var(--neon-blue)', color: 'var(--neon-blue)',
  padding: '7px 10px', fontFamily: '"Fira Code", monospace', fontSize: '13px',
  boxShadow: 'inset 0 0 10px rgba(0, 240, 255, 0.1)', outline: 'none'
};
const btnStyle = {}; // Obsolete, replaced by className="cyber-btn"

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
            <button className="cyber-btn" onClick={() => onSubmit({ button: 'login', user, pass })}>Login</button>
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
          <button className="cyber-btn" onClick={() => onSubmit({ button: 'reset' })}>Create / Reset Database</button>
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
        <button className="cyber-btn" onClick={() => onSubmit({ button: 'security', value: sec })}>Submit</button>
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
          <button className="cyber-btn" onClick={() => onSubmit({ value: val })}>Submit</button>
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
          <button className="cyber-btn" onClick={() => onSubmit({ value: val })}>Inclure</button>
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
          <button className="cyber-btn" onClick={() => onSubmit({ value: val })}>Upload</button>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: '#777' }}>
          Le fichier doit exister sur Kali (crée-le dans le terminal : <code>cat &gt; shell.php</code>).
        </div>
        <OutBox output={output} webError={webError} />
      </>
    );
  }

  // ── Level 7 : XSS Réfléchi ──
  if (level.id === 'xss_r') {
    return (
      <>
        <H>Vulnerability: Reflected XSS</H>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#bbb', fontSize: 13 }}>What's your name?</span>
          <input style={{ ...inputStyle, width: 360 }} value={val} placeholder="Enter your name"
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSubmit({ value: val }); }} />
          <button className="cyber-btn" onClick={() => onSubmit({ value: val })}>Submit</button>
        </div>
        <OutBox output={output} webError={webError} />
      </>
    );
  }

  // ── Level 8 : XSS Stocké ──
  if (level.id === 'xss_s') {
    const msgs = prog.messages || [];
    return (
      <>
        <H>Vulnerability: Stored XSS</H>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 500, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: 80, color: '#bbb', fontSize: 13 }}>Name:</span>
            <input style={{ ...inputStyle, flex: 1 }} value={user} placeholder="Guest" maxLength={10}
              onChange={e => setUser(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: 80, color: '#bbb', fontSize: 13 }}>Message:</span>
            <textarea style={{ ...inputStyle, flex: 1, minHeight: 60 }} value={val} placeholder="Hello!"
              onChange={e => setVal(e.target.value)} />
          </div>
          <button className="cyber-btn" 
            onClick={() => onSubmit({ name: user || 'Guest', message: val })}>Sign Guestbook</button>
        </div>
        
        <H>Guestbook Entries</H>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #333', padding: 10, borderRadius: 4 }}>
              <div style={{ fontWeight: 'bold', color: '#ffbd2e', marginBottom: 4, fontSize: 13 }}>{m.name}</div>
              <div style={{ color: '#eee', fontSize: 13 }}>{m.msg}</div>
            </div>
          ))}
        </div>
        
        <OutBox output={output} webError={webError} />
      </>
    );
  }

  // ── Level 9 : XSS DOM-based ──
  if (level.id === 'xss_d') {
    return (
      <>
        <H>Vulnerability: DOM Based XSS</H>
        <p style={{ color: '#bbb', fontSize: 13, margin: '0 0 10px' }}>
          La page utilise JavaScript pour lire l'URL et afficher la langue par défaut.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
          <span style={{ color: '#bbb', fontSize: 13 }}>Select language:</span>
          <select style={inputStyle} value="English" disabled>
            <option>English</option>
            <option>French</option>
            <option>Spanish</option>
            <option>German</option>
          </select>
        </div>
        
        <H>Simulation de l'URL</H>
        <p style={{ color: '#bbb', fontSize: 13, margin: '0 0 10px' }}>
          Modifie l'URL ci-dessous pour tester tes payloads (paramètre <code>?default=</code> ou fragment <code>#</code>).
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input style={{ ...inputStyle, width: '100%', color: '#7fbf9f' }} value={val} 
            placeholder={level.url + "?default=English"}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSubmit({ url: val }); }} />
          <button className="cyber-btn" onClick={() => onSubmit({ url: val })}>Aller</button>
        </div>
        <OutBox output={output} webError={webError} />
      </>
    );
  }

  // ── Level 10 : CSRF ──
  if (level.id === 'csrf') {
    return (
      <>
        <H>Vulnerability: Cross Site Request Forgery (CSRF)</H>
        <p style={{ color: '#bbb', fontSize: 13, margin: '0 0 10px' }}>Change your admin password:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360, marginBottom: 20 }}>
          <input style={inputStyle} type="password" value={pass} placeholder="New password" onChange={e => setPass(e.target.value)} />
          <input style={inputStyle} type="password" value={user} placeholder="Confirm new password" onChange={e => setUser(e.target.value)} />
          <button className="cyber-btn" onClick={() => onSubmit({ action: 'change', pass, conf: user })}>Change</button>
        </div>
        <H>Attacker Simulator (Inject HTML)</H>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input style={{ ...inputStyle, width: '100%' }} value={val} placeholder='<img src="..." />'
            onChange={e => setVal(e.target.value)} />
          <button className="cyber-btn" onClick={() => onSubmit({ action: 'exploit', payload: val })}>Test Exploit</button>
        </div>
        <OutBox output={output} webError={webError} />
      </>
    );
  }

  // ── Level 11 : Weak Session IDs ──
  if (level.id === 'weak_id') {
    return (
      <>
        <H>Vulnerability: Weak Session IDs</H>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
          <button className="cyber-btn" onClick={() => onSubmit({ action: 'generate' })}>Generate Session</button>
        </div>
        <H>Session Hijacking</H>
        <p style={{ color: '#bbb', fontSize: 13, margin: '0 0 10px' }}>Devine la prochaine session qui sera attribuée :</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#bbb', fontSize: 13 }}>dvwaSession=</span>
          <input style={{ ...inputStyle, width: 200 }} value={val} placeholder="1005"
            onChange={e => setVal(e.target.value)} />
          <button className="cyber-btn" onClick={() => onSubmit({ action: 'hijack', guess: val })}>Hijack</button>
        </div>
        <OutBox output={output} webError={webError} />
      </>
    );
  }

  // ── Level 12 : JavaScript Attacks ──
  if (level.id === 'js_attack') {
    return (
      <>
        <H>Vulnerability: JavaScript Attacks</H>
        <p style={{ color: '#bbb', fontSize: 13, margin: '0 0 10px' }}>
          Soumet le mot "success" pour obtenir la clé, mais tu dois fournir le bon token.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: 80, color: '#bbb', fontSize: 13 }}>Phrase:</span>
            <input style={{ ...inputStyle, flex: 1 }} value={user} placeholder="success" onChange={e => setUser(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: 80, color: '#bbb', fontSize: 13 }}>Token:</span>
            <input style={{ ...inputStyle, flex: 1 }} value={val} placeholder="md5(sseccus) ou d5...c4" onChange={e => setVal(e.target.value)} />
          </div>
          <button className="cyber-btn" 
            onClick={() => onSubmit({ action: 'submit', phrase: user, token: val, simulatedValid: true })}>Submit</button>
        </div>
        <OutBox output={output} webError={webError} />
      </>
    );
  }

  // ── Level 13 : Insecure CAPTCHA ──
  if (level.id === 'captcha') {
    return (
      <>
        <H>Vulnerability: Insecure CAPTCHA</H>
        <p style={{ color: '#bbb', fontSize: 13, margin: '0 0 10px' }}>
          Le changement de mot de passe nécessite une validation CAPTCHA (étape 2).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360, marginBottom: 20 }}>
          <input style={inputStyle} type="password" value={pass} placeholder="New password" onChange={e => setPass(e.target.value)} />
          <input style={inputStyle} type="password" value={user} placeholder="Confirm new password" onChange={e => setUser(e.target.value)} />
          <button className="cyber-btn" disabled style={{ background: '#555', cursor: 'not-allowed', color: '#999', borderColor: '#555', boxShadow: 'none' }}>Change (Require CAPTCHA)</button>
        </div>
        <H>HTTP Request Simulator</H>
        <p style={{ color: '#bbb', fontSize: 13, margin: '0 0 10px' }}>
          Simule l'envoi direct de la requête (comme avec Burp Suite) :
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea style={{ ...inputStyle, minHeight: 80 }} value={val} 
            placeholder="step=2&password_new=a&password_conf=a&passed_captcha=true"
            onChange={e => setVal(e.target.value)} />
          <button className="cyber-btn" 
            onClick={() => onSubmit({ action: 'submit', payload: val })}>Send Request</button>
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
        <button className="cyber-btn" onClick={() => onSubmit({ value: val })}>Submit</button>
      </div>
      <OutBox output={output} webError={webError} />
    </>
  );
}

const lbl = { display: 'block', color: '#bbb', fontSize: 12, marginBottom: 4 };
