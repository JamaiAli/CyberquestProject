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
  dbserver:   ['Accès via pivot depuis webserver/mailserver', 'Credentials DB trouvés dans les emails', 'MySQL FILE privilege → lecture /etc/shadow'],
  dc:         ['SMB signing désactivé → Pass-the-Hash', 'Kerberoasting : SPN MSSQLSvc disponible', 'Creds DB permettent le pivot'],
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
      borderRadius: '3px', color: '#00ff41', fontSize: '10px',
      fontFamily: 'monospace',
    },
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: '#08080e', borderLeft: '1px solid #1a1a2a',
      color: '#888', fontFamily: '"Fira Code", monospace',
      fontSize: '11px', overflow: 'auto', height: '100%',
    }}>

      {/* Header */}
      <div style={{ padding: '7px 12px', background: '#05050a', borderBottom: '1px solid #1a1a2a', flexShrink: 0 }}>
        <span style={{ color: '#00ff4166', fontWeight: 'bold', fontSize: '9px', letterSpacing: '1px' }}>
          AIDE &amp; GUIDE
        </span>
        <span style={{ float: 'right', color: '#222', fontSize: '9px' }}>
          {mode === 'MACHINE' && machine ? `⚡ ${machine.name}` : '🌐 RÉSEAU'}
        </span>
      </div>

      {/* ── MACHINE MODE ── */}
      {mode === 'MACHINE' && machine && !done && (
        <>
          {/* Machine header */}
          <div style={{ ...s.section, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
              <span style={{ fontSize: '16px' }}>{machine.icon}</span>
              <div>
                <div style={{ color: '#00ff41', fontWeight: 'bold', fontSize: '11px' }}>{machine.name}</div>
                <div style={{ color: '#333', fontSize: '9px' }}>{machine.ip} — {machine.os}</div>
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
              Tape <span style={{ color: '#00ff41' }}>hint</span> → indice complet<br />
              Tape <span style={{ color: '#00ff41' }}>help</span> → toutes les commandes
            </div>
          </div>
        </>
      )}

      {/* ── MACHINE DONE ── */}
      {mode === 'MACHINE' && machine && done && (
        <div style={{ ...s.section, flexShrink: 0 }}>
          <div style={{ color: '#00ff41', fontWeight: 'bold', fontSize: '11px', marginBottom: '6px' }}>
            🚩 PWNED !
          </div>
          <div style={{ color: '#3a4a3a', fontSize: '10px', lineHeight: '1.6' }}>
            {machine.name} compromise.<br />
            Tape <span style={{ color: '#00ff41' }}>exit</span> pour revenir au réseau.
          </div>
          {unlocked.includes('dbserver') && !pwned.includes('dbserver') && (
            <div style={{ marginTop: '8px', color: '#00aaff', fontSize: '10px' }}>
              🔓 DB Server (192.168.1.30) débloqué !
            </div>
          )}
          {unlocked.includes('dc') && !pwned.includes('dc') && (
            <div style={{ marginTop: '4px', color: '#aa44ff', fontSize: '10px' }}>
              🔓 Domain Controller (192.168.1.100) débloqué !
            </div>
          )}
        </div>
      )}

      {/* ── NETWORK MODE ── */}
      {mode === 'NETWORK' && (
        <>
          <div style={{ ...s.section, flexShrink: 0 }}>
            <div style={{ ...s.label, color: '#00aaff' }}>📍 GUIDE DE DÉMARRAGE</div>
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
              Tape <span style={{ color: '#00ff41' }}>hint</span> → indice<br />
              Tape <span style={{ color: '#00ff41' }}>help</span> → commandes<br />
              Tape <span style={{ color: '#00ff41' }}>nmap 192.168.1.0/24</span> pour commencer
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
      <div style={{ padding: '10px 12px', marginTop: 'auto', borderTop: '1px solid #0e0e18', flexShrink: 0 }}>
        <div style={{ ...s.label, color: '#1a1a2a' }}>MACHINES</div>
        {[
          { id: 'webserver',  name: 'Active Directory',   ip: '.10' },
          { id: 'mailserver', name: 'Mail Server',       ip: '.20' },
          { id: 'dbserver',   name: 'DB Server',         ip: '.30' },
          { id: 'dc',         name: 'Domain Controller', ip: '.100' },
        ].map(m => {
          const isPwned  = pwned.includes(m.id);
          const isLocked = !unlocked.includes(m.id);
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0', borderBottom: '1px solid #0a0a0e' }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                background: isPwned ? '#00ff41' : isLocked ? '#111' : '#223',
                boxShadow: isPwned ? '0 0 5px #00ff41' : 'none',
              }} />
              <span style={{ color: isPwned ? '#00ff41' : isLocked ? '#1a1a1a' : '#333', fontSize: '9px', flex: 1 }}>
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
