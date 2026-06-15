const PHASE_LABELS = [
  '🔍 Reconnaissance',
  '🔎 Scanning',
  '💥 Exploitation',
  '🏴 Post-Exploitation',
];

const PHASE_CMDS = [
  ['recon', 'whois <ip>', 'dig <ip>'],
  ['nmap -sV <ip>', 'nikto -h <ip>', 'dirb http://<ip>', 'searchsploit <app>'],
  ['sqlmap -u <url>', 'hydra -l admin -P rockyou.txt <ip> ssh', 'curl <url>'],
  ['whoami', 'sudo -l', 'find / -perm -4000', 'cat /flag.txt'],
];

export default function MachineView({ machine, phase, effect }) {
  if (!machine) return null;

  const done = phase >= 4;

  return (
    <div style={{ padding: '14px', background: '#08080e', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', boxSizing: 'border-box' }}>

      {/* Machine header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px', background: '#0d1420', border: '1px solid #00ff4122', borderRadius: '5px', flexShrink: 0 }}>
        <span style={{ fontSize: '28px', lineHeight: 1 }}>{machine.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#00ff41', fontSize: '15px', fontWeight: 'bold' }}>{machine.name}</div>
          <div style={{ color: '#555', fontSize: '11px', marginTop: '2px' }}>{machine.ip} — {machine.os}</div>
          <div style={{ color: '#333', fontSize: '10px', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {machine.services?.join(' | ') || ''}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
          <div style={{
            padding: '3px 8px', background: '#1a0808',
            border: `1px solid ${{ easy: '#00aa44', medium: '#aaaa00', hard: '#cc2200' }[machine.difficulty] || '#555'}`,
            borderRadius: '3px', fontSize: '10px',
            color: { easy: '#00aa44', medium: '#aaaa00', hard: '#ff4444' }[machine.difficulty] || '#555'
          }}>
            [{machine.difficulty?.toUpperCase()}]
          </div>
          {done && (
            <div style={{ color: '#00ff41', fontSize: '10px', fontWeight: 'bold' }}>✓ PWNED</div>
          )}
        </div>
      </div>

      {/* Phase progress bar */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        {PHASE_LABELS.map((label, i) => (
          <div key={i} style={{
            flex: 1, padding: '6px 4px', textAlign: 'center',
            background: i < phase ? '#051a05' : i === phase && !done ? '#0d1a05' : '#090909',
            border: `1px solid ${i < phase ? '#00aa44' : i === phase && !done ? '#88cc00' : '#1a1a1a'}`,
            borderRadius: '3px', fontSize: '10px',
            color: i < phase ? '#00aa44' : i === phase && !done ? '#aaff00' : '#333',
            transition: 'all 0.3s',
          }}>
            {i < phase ? '✓ ' : i === phase && !done ? '▶ ' : '○ '}
            {label}
          </div>
        ))}
      </div>

      {/* Current phase commands */}
      {!done && (
        <div style={{ flexShrink: 0 }}>
          <div style={{ color: '#444', fontSize: '10px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Commandes suggérées — {PHASE_LABELS[phase]}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {(PHASE_CMDS[phase] || []).map(c => (
              <code key={c} style={{
                background: '#0e0e0e', border: '1px solid #2a2a2a',
                borderRadius: '3px', padding: '4px 9px',
                color: '#00ff41', fontSize: '11px',
                fontFamily: '"Fira Code", monospace',
              }}>
                {c.replace('<ip>', machine.ip)}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      {machine.hints && !done && (
        <div style={{ padding: '8px 12px', background: '#0a0a18', border: '1px solid #22224a', borderRadius: '4px', flexShrink: 0 }}>
          <span style={{ color: '#6666ff', fontSize: '10px', fontWeight: 'bold' }}>💡 INDICE : </span>
          <span style={{ color: '#555', fontSize: '10px' }}>
            {machine.hints[Math.min(phase, machine.hints.length - 1)]}
          </span>
        </div>
      )}

      {/* Pwned success */}
      {done && (
        <div style={{ padding: '12px', background: '#051505', border: '1px solid #00aa44', borderRadius: '5px', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ color: '#00ff41', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>🚩 MACHINE COMPROMISE !</div>
          <div style={{ color: '#555', fontSize: '11px' }}>Flag récupéré. Tape "exit" pour revenir au réseau.</div>
        </div>
      )}

      {/* Exit reminder */}
      <div style={{ marginTop: 'auto', color: '#333', fontSize: '10px', textAlign: 'center', flexShrink: 0 }}>
        "exit" pour revenir au réseau CorpNet
      </div>
    </div>
  );
}
