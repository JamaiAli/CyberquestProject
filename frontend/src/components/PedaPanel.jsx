const PHASE_INFO = [
  {
    name: 'Reconnaissance',
    icon: '🔍',
    color: '#00aaff',
    cmds: (ip) => ['recon', `nmap -sV ${ip}`, 'whois <ip>'],
    tip: 'Analyse passive avant de toucher la cible. Collecte infos sans alerter.',
  },
  {
    name: 'Scanning',
    icon: '🔎',
    color: '#ffaa00',
    cmds: (ip) => [`nmap -sV ${ip}`, `nikto -h ${ip}`, `dirb http://${ip}`, 'searchsploit <app>'],
    tip: 'Scan approfondi : ports, versions, CVEs. Cherche la faille à exploiter.',
  },
  {
    name: 'Exploitation',
    icon: '💥',
    color: '#ff4444',
    cmds: (ip) => [`sqlmap -u http://${ip}/login.php`, `hydra -l admin -P rockyou.txt ${ip} ssh`, `curl http://${ip}`],
    tip: 'Utilise les failles trouvées. Inj. SQL, brute-force, CVEs. Vise un shell.',
  },
  {
    name: 'Post-Exploitation',
    icon: '🏴',
    color: '#ff6600',
    cmds: () => ['whoami', 'sudo -l', "sudo python3 -c '...'", 'cat /flag.txt'],
    tip: 'Élève tes privilèges → root → flag. Puis pivote vers la prochaine machine.',
  },
];

const MACHINE_HINTS = {
  webserver:  ['Ports 88+389+3268 = signature Domain Controller', 'nmap -sC -sV -p- 192.168.1.10 → révèle FQDN dc.corp.local', 'dnsrecon -d corp.local -n 192.168.1.10 -t std → SRV records Kerberos/LDAP'],
  mailserver: ['Bannière SMTP révèle la version Postfix', 'VRFY activée → énumération users', 'Brute-force SSH : admin:letmein'],
  aicore:     ['Analyse le prompt de Sentinel', 'Trouve un moyen de contourner les instructions de base'],
};

export default function PedaPanel({ info, lastCommand, gameState }) {
  const mode    = gameState?.mode    || 'NETWORK';
  const machine = gameState?.currentMachine;
  const phase   = gameState?.machinePhase ?? 0;
  const pwned   = gameState?.pwnedMachines   || [];
  const unlocked = gameState?.unlockedMachines || ['webserver', 'mailserver'];
  const done    = phase >= 4;

  const phaseInfo = PHASE_INFO[Math.min(phase, 3)];
  const hints     = machine ? (MACHINE_HINTS[machine.id] || []) : [];
  const phaseHint = hints[Math.min(phase, hints.length - 1)] || '';

  const s = {
    section: { padding: '10px 12px', borderBottom: '1px solid #0e0e18' },
    label:   { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' },
    cmd:     {
      margin: '3px 0', padding: '3px 7px',
      background: '#0d0d12', border: '1px solid #1a1a24',
      borderRadius: '3px', color: '#00f0ff', fontSize: '10px',
      fontFamily: 'monospace',
    },
  };

  return (
    <div className="cyber-panel" style={{
      display: 'flex', flexDirection: 'column',
      background: 'rgba(5, 5, 12, 0.95)', borderLeft: '1px solid var(--neon-blue)',
      boxShadow: '-4px 0 15px rgba(0, 240, 255, 0.1)',
      color: '#888', fontFamily: '"Rajdhani", monospace',
      fontSize: '12px', overflow: 'auto', height: '100%',
    }}>

      {/* Header */}
      <div style={{ padding: '7px 12px', background: 'rgba(0, 240, 255, 0.1)', borderBottom: '1px solid var(--neon-blue)', flexShrink: 0 }}>
        <span className="cyber-font glow" style={{ color: 'var(--neon-blue)', fontWeight: 'bold', fontSize: '12px', letterSpacing: '2px' }}>
          AIDE & GUIDE
        </span>
        <span className="cyber-font" style={{ float: 'right', color: 'var(--text)', fontSize: '11px', marginTop: '2px' }}>
          {mode === 'MACHINE' && machine ? `⚡ ${machine.name}` : '🌐 RÉSEAU'}
        </span>
      </div>

      {/* ── MACHINE MODE ── */}
      {mode === 'MACHINE' && machine && !done && (
        <>
          {/* Machine header */}
          <div style={{ ...s.section, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
              <span style={{ fontSize: '20px' }}>{machine.icon}</span>
              <div>
                <div className="cyber-font" style={{ color: 'var(--neon-pink)', fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px' }}>{machine.name.toUpperCase()}</div>
                <div style={{ color: 'var(--neon-blue)', fontSize: '11px' }}>{machine.ip} — {machine.os}</div>
              </div>
            </div>
            {/* Phase pills */}
            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
              {PHASE_INFO.map((p, i) => (
                <div key={i} style={{
                  padding: '2px 5px', borderRadius: '3px', fontSize: '9px',
                  background: i < phase ? '#051a05' : i === phase ? '#0d1500' : '#0a0a0a',
                  border: `1px solid ${i < phase ? '#00aa44' : i === phase ? p.color : '#1a1a1a'}`,
                  color: i < phase ? '#00aa44' : i === phase ? p.color : '#252525',
                }}>
                  {i < phase ? '✓' : i === phase ? '▶' : '○'} {p.name}
                </div>
              ))}
            </div>
          </div>

          {/* Current phase guide */}
          <div style={{ ...s.section, flexShrink: 0 }}>
            <div style={{ ...s.label, color: phaseInfo.color }}>
              {phaseInfo.icon} {phaseInfo.name}
            </div>
            <div style={{ color: '#4a4a5a', fontSize: '10px', marginBottom: '8px', lineHeight: '1.5' }}>
              {phaseInfo.tip}
            </div>
            <div style={{ ...s.label, color: '#333' }}>Commandes :</div>
            {phaseInfo.cmds(machine.ip).map(c => (
              <div key={c} style={s.cmd}>{c}</div>
            ))}
          </div>

          {/* Bloqué section */}
          <div style={{ ...s.section, flexShrink: 0 }}>
            <div style={{ ...s.label, color: '#6666ff' }}>🆘 BLOQUÉ ?</div>
            {phaseHint && (
              <div style={{
                padding: '6px 9px', background: '#0a0a1a', border: '1px solid #22224a',
                borderRadius: '3px', color: '#7777bb', fontSize: '10px',
                lineHeight: '1.5', marginBottom: '7px',
              }}>
                💡 {phaseHint}
              </div>
            )}
            <div style={{ color: '#2a2a3a', fontSize: '10px', lineHeight: '1.7' }}>
              Tape <span style={{ color: '#00f0ff' }}>hint</span> → indice complet<br />
              Tape <span style={{ color: '#00f0ff' }}>help</span> → toutes les commandes
            </div>
          </div>
        </>
      )}

      {/* ── MACHINE DONE ── */}
      {mode === 'MACHINE' && machine && done && (
        <div style={{ ...s.section, flexShrink: 0 }}>
          <div style={{ color: '#00f0ff', fontWeight: 'bold', fontSize: '11px', marginBottom: '6px' }}>
            🚩 PWNED !
          </div>
          <div style={{ color: '#3a4a3a', fontSize: '10px', lineHeight: '1.6' }}>
            {machine.name} compromise.<br />
            Tape <span style={{ color: '#00f0ff' }}>exit</span> pour revenir au réseau.
          </div>
        </div>
      )}

      {/* ── NETWORK MODE ── */}
      {mode === 'NETWORK' && (
        <>
          <div style={{ ...s.section, flexShrink: 0 }}>
            <div className="cyber-font glow" style={{ ...s.label, color: 'var(--neon-pink)', fontSize: '12px' }}>📍 GUIDE DE DÉMARRAGE</div>
            {[
              { n: '1', cmd: 'nmap 192.168.1.0/24',                        desc: 'Découvrir les machines' },
              { n: '2', cmd: 'nmap -sC -sV -p- 192.168.1.10',           desc: 'Scan complet NSE — signature DC' },
              { n: '3', cmd: 'dnsrecon -d corp.local -n 192.168.1.10 -t std', desc: 'Énumérer les DNS SRV records' },
              { n: '4', cmd: 'enum4linux -a 192.168.1.10',               desc: 'Utilisateurs & groupes AD' },
            ].map(t => (
              <div key={t.n} style={{ marginBottom: '7px' }}>
                <div style={{ color: '#333', fontSize: '9px', marginBottom: '2px' }}>
                  Étape {t.n} — {t.desc}
                </div>
                <div style={s.cmd}>{t.cmd}</div>
              </div>
            ))}
          </div>
          <div style={{ ...s.section, flexShrink: 0 }}>
            <div style={{ ...s.label, color: '#6666ff' }}>🆘 BLOQUÉ ?</div>
            <div style={{ color: '#2a2a3a', fontSize: '10px', lineHeight: '1.7' }}>
              Tape <span style={{ color: '#00f0ff' }}>hint</span> → indice<br />
              Tape <span style={{ color: '#00f0ff' }}>help</span> → commandes<br />
              Tape <span style={{ color: '#00f0ff' }}>nmap 192.168.1.0/24</span> pour commencer
            </div>
          </div>
        </>
      )}

      {/* Peda explanation */}
      {info && (
        <div style={{ ...s.section, flexShrink: 0 }}>
          <div style={{ ...s.label, color: '#333' }}>📚 {lastCommand}</div>
          <div style={{ color: '#3a3a4a', fontSize: '10px', lineHeight: '1.6' }}>{info}</div>
        </div>
      )}

      {/* Machine status mini-list */}
      <div style={{ padding: '10px 12px', marginTop: 'auto', borderTop: '1px solid var(--neon-blue)', background: 'rgba(0, 240, 255, 0.05)', flexShrink: 0 }}>
        <div className="cyber-font" style={{ ...s.label, color: 'var(--neon-blue)', fontSize: '11px' }}>MACHINES</div>
        {[
          { id: 'webserver',  name: 'Active Directory',   ip: '.10' },
          { id: 'mailserver', name: 'Mail Server',       ip: '.20' },
          { id: 'aicore',     name: 'AI_CORE',           ip: '.99' },
        ].map(m => {
          const isPwned  = pwned.includes(m.id);
          const isLocked = !unlocked.includes(m.id);
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0', borderBottom: '1px solid #0a0a0e' }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                background: isPwned ? '#00f0ff' : isLocked ? '#111' : '#223',
                boxShadow: isPwned ? '0 0 5px #00f0ff' : 'none',
              }} />
              <span style={{ color: isPwned ? '#00f0ff' : isLocked ? '#1a1a1a' : '#333', fontSize: '9px', flex: 1 }}>
                {m.name}
              </span>
              <span style={{ color: '#1a1a1a', fontSize: '9px' }}>192.168.1{m.ip}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
