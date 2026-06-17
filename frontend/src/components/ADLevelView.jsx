import { useState } from 'react';
import LevelTerminal from './LevelTerminal';
import {
  getADLevel, initialADProg, adObjectives, adHints,
  handleADTerm, getADNextStep, MAX_AD_LEVEL,
} from '../levels/adLevels';

// Machine info shown in the right panel — updated live as the player discovers things
function MachinePanel({ level, prog }) {
  const discovered = [];

  if (level.n >= 1 && prog.nmapNet) {
    discovered.push({ label: 'Hôtes actifs', value: '192.168.1.10 · .20 · .30 · .100' });
  }
  if (level.n >= 1 && prog.nmapSV) {
    discovered.push({ label: 'Services AD', value: '88 Kerberos · 389 LDAP · 445 SMB · 5985 WinRM' });
  }
  if (level.n >= 1 && prog.nmapFull) {
    discovered.push({ label: 'Domaine', value: 'corp.local  |  dc.corp.local' });
    discovered.push({ label: 'SMB Signing', value: 'REQUIRED → NTLM Relay bloqué' });
  }
  if (level.n >= 2 && prog.dnsrecon) {
    discovered.push({ label: 'DNS SRV', value: 'Kerberos:88 · LDAP:389 · GC:3268' });
  }
  if (level.n >= 2 && prog.nikto) {
    discovered.push({ label: 'CVE', value: 'CVE-2021-41773 (CVSS 9.8) CRITIQUE' });
  }
  if (level.n >= 3 && prog.shell) {
    discovered.push({ label: 'Accès', value: 'www-data@192.168.1.10 (uid=33)' });
  }
  if (level.n >= 4 && prog.root) {
    discovered.push({ label: 'PrivEsc', value: 'root@ad-server via sudo python3' });
  }
  if (level.n >= 4 && prog.creds) {
    discovered.push({ label: 'Creds DB', value: 'db_user : Str0ngP@ss' });
  }
  if (level.n >= 5 && prog.hash) {
    discovered.push({ label: 'NTLM Hash', value: 'aad3b435b51404ee:5f4dcc3b...' });
  }
  if (level.n >= 6 && prog.domainAdmin) {
    discovered.push({ label: 'Accès DC', value: 'Administrator — Domain Admins' });
  }
  if (level.n >= 6 && prog.ntds) {
    discovered.push({ label: 'NTDS dump', value: '47 comptes · krbtgt → Golden Ticket' });
  }

  return (
    <div style={{ padding: '10px 12px', borderBottom: '1px solid #0a1e2a' }}>
      <div style={{ color: '#00aaff', fontSize: 11, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 }}>
        🖥 CIBLE — ACTIVE DIRECTORY
      </div>
      <div style={{ color: '#2a5a7a', fontSize: 10, marginBottom: 8, fontFamily: 'monospace' }}>
        192.168.1.10 · Windows Server 2019 · corp.local
      </div>

      {discovered.length === 0 ? (
        <div style={{ color: '#2a3a4a', fontSize: 10, fontStyle: 'italic' }}>
          Aucune information collectée — commence par scanner.
        </div>
      ) : (
        discovered.map((d, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, fontSize: 10, lineHeight: 1.4 }}>
            <span style={{ color: '#2a7aaa', flexShrink: 0, minWidth: 72 }}>{d.label}</span>
            <span style={{ color: '#7aaacc', wordBreak: 'break-word' }}>{d.value}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default function ADLevelView({ level: n, onClose, onComplete, onAdvance }) {
  const level = getADLevel(n);
  const [prog, setProg]   = useState(() => initialADProg(n));
  const [term, setTerm]   = useState([
    { t: `[*] Niveau AD ${n} — ${level.title}`, c: '#00aaff' },
    { t: level.intro, c: '#4a7a9a' },
    { t: '', c: '#fff' },
  ]);
  const [prompt, setPrompt] = useState('kali');
  const [toast, setToast]   = useState(null);
  const [doneFlag, setDone] = useState(false);

  const objs      = adObjectives(n, prog);
  const doneCount = objs.filter(o => o.done).length;
  const nextStep  = getADNextStep(n, prog);

  const flash = (msg) => { if (!msg) return; setToast(msg); setTimeout(() => setToast(null), 2600); };

  const finish = () => {
    if (doneFlag) return;
    setDone(true);
    flash('✅ Étape validée ! Continue d\'explorer, puis avance quand tu veux.');
    onComplete?.(n);
  };

  const pushTerm = (cmd, outLines) => {
    const pr    = prompt === 'root' ? '#' : '$';
    const label =
      prompt === 'root'  ? 'root@ad-server' :
      prompt === 'shell' ? 'www-data@ad-server' :
      prompt === 'mysql' ? 'mysql' :
      prompt === 'winrm' ? '*Evil-WinRM* PS C:\\>' :
      'attacker@kali';
    const sep = prompt === 'mysql' ? '> ' : `:${pr} `;
    setTerm(t => [...t, { t: `${label}${sep}${cmd}`, c: '#8af' }, ...outLines]);
  };

  const onTerm = (cmd) => {
    const r = handleADTerm(n, prog, cmd, { prompt });
    setProg(r.prog);
    if (r.clear) { setTerm([]); return; }
    pushTerm(cmd, r.lines || []);
    if (r.prompt) setPrompt(r.prompt);
    flash(r.notify);
    if (r.done) finish();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: '#050508', display: 'flex', flexDirection: 'column',
      fontFamily: '"Fira Code", monospace',
    }}>
      {/* Header */}
      <div style={{
        flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px', background: '#06080c', borderBottom: '1px solid #0a2233',
      }}>
        <div>
          <span style={{ color: '#00aaff', fontWeight: 'bold', fontSize: 15 }}>
            Étape {n} · {level.title}
          </span>
          <span style={{ color: '#2a5a7a', fontSize: 11, marginLeft: 12 }}>{level.mitre}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: doneCount === objs.length ? '#00aaff' : '#2a5a7a', fontSize: 12 }}>
            {doneCount}/{objs.length} objectifs
          </span>
          <button onClick={onClose} style={closeBtn}
            onMouseEnter={e => { e.currentTarget.style.color = '#00aaff'; e.currentTarget.style.borderColor = '#00aaff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#3a7a9a'; e.currentTarget.style.borderColor = '#1a3a4a'; }}>
            ✕ Carte
          </button>
        </div>
      </div>

      {/* Body: terminal | panel droit */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.6fr 1fr', minHeight: 0 }}>

        {/* Gauche : terminal plein */}
        <div style={{ borderRight: '1px solid #0a2233', minHeight: 0 }}>
          <LevelTerminal lines={term} prompt={prompt} onRun={onTerm} />
        </div>

        {/* Droite : machine panel + objectifs + next step + hints */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto', background: '#070a0e' }}>

          <MachinePanel level={level} prog={prog} />

          <div style={{ padding: '10px 12px', borderBottom: '1px solid #0a1e2a' }}>
            <div style={{ color: '#00aaff', fontSize: 11, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 }}>
              🎯 OBJECTIFS
            </div>
            {objs.map((o, i) => (
              <div key={i} style={{ fontSize: 11, marginBottom: 5, color: o.done ? '#00aaff' : '#2a4a5a', lineHeight: 1.4 }}>
                {o.done ? '✓' : '○'} {o.label}
              </div>
            ))}
          </div>

          {nextStep && !doneFlag && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #0a1e2a' }}>
              <div style={{
                padding: '8px 10px',
                background: '#050d15', border: '1px solid #0a2a3a', borderRadius: 4,
              }}>
                <div style={{ color: '#00ffff', fontSize: 11, fontWeight: 'bold', marginBottom: 4, letterSpacing: 1 }}>
                  → PROCHAINE ÉTAPE
                  <span style={{ color: '#2a7aaa', fontWeight: 'normal', marginLeft: 6 }}>({nextStep.action})</span>
                </div>
                <div style={{ fontSize: 11, color: '#4a7a9a', marginBottom: 4 }}>{nextStep.explain}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 10.5, color: '#2a6a8a', wordBreak: 'break-word', lineHeight: 1.55 }}>
                  {nextStep.hint}
                </div>
              </div>
            </div>
          )}

          <div style={{ padding: '10px 12px' }}>
            <div style={{ color: '#2a5a7a', fontSize: 11, fontWeight: 'bold', marginBottom: 6, letterSpacing: 1 }}>
              💡 INDICES
            </div>
            {adHints(n).map((h, i) => (
              <div key={i} style={{ fontSize: 11, marginBottom: 4, color: '#4a7a9a', fontFamily: 'monospace', wordBreak: 'break-word' }}>
                <span style={{ color: '#1a4a6a' }}>›</span> {h}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barre de complétion */}
      {doneFlag && (
        <div style={{
          flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 18px', background: '#060d15', borderTop: '1px solid #00aaff',
        }}>
          <span style={{ color: '#00aaff', fontSize: 13 }}>
            ✅ Étape {n} validée — continue d'explorer, puis avance quand tu veux.
          </span>
          <button onClick={() => onAdvance?.(n)} style={nextBtn}>
            {n < MAX_AD_LEVEL ? 'Passe à l\'étape suivante →' : '🏁 CORP.LOCAL compromis — retour à la carte'}
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#06101a', border: '1px solid #00aaff', color: '#00aaff',
          padding: '9px 20px', borderRadius: 5, fontSize: 13, zIndex: 1200,
          boxShadow: '0 0 24px #00aaff44',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const closeBtn = {
  background: 'transparent', border: '1px solid #1a3a4a', color: '#3a7a9a',
  fontFamily: 'monospace', fontSize: 12, cursor: 'pointer', padding: '5px 14px', borderRadius: 4,
};

const nextBtn = {
  background: 'linear-gradient(135deg,#060f1a,#0a1a2a)', border: '1px solid #00aaff',
  color: '#00aaff', fontFamily: '"Fira Code",monospace', fontSize: 13, fontWeight: 'bold',
  cursor: 'pointer', padding: '8px 20px', borderRadius: 4, letterSpacing: '0.03em',
  boxShadow: '0 0 16px #00aaff44', animation: 'pulse 1.8s ease-in-out infinite',
};
