// ─── Machine definitions ─────────────────────────────────────────────────────

const MACHINES = [
  {
    id: 'firewall',
    ip: '192.168.1.1',
    name: 'Firewall',
    icon: '🔥',
    type: 'firewall',
    x: 400, y: 80,
    difficulty: 'hard',
    os: 'pfSense 2.6',
    services: [],
    locked: true,
    unlockedBy: [],
    connections: ['webserver', 'mailserver'],
    description: 'Pare-feu périmétrique. Impossible d\'attaquer directement.',
    hints: ['Contourne-moi en attaquant les machines de la DMZ']
  },
  {
    id: 'webserver',
    ip: '192.168.1.10',
    name: 'Web Server',
    icon: '🌐',
    type: 'server',
    x: 200, y: 240,
    difficulty: 'easy',
    os: 'Ubuntu 20.04',
    services: ['HTTP:80', 'HTTPS:443', 'SSH:22'],
    locked: false,
    unlockedBy: [],
    connections: ['dbserver'],
    description: 'Serveur web Apache. Point d\'entrée principal.',
    flag: 'CQ{w3b_s3rv3r_pwn3d}',
    hints: [
      'Le serveur tourne Apache 2.4.49 — version vulnérable !',
      'Il y a une page /admin cachée. Essaie dirb.',
      'SQLi possible sur /login.php?id= → essaie sqlmap'
    ]
  },
  {
    id: 'mailserver',
    ip: '192.168.1.20',
    name: 'Mail Server',
    icon: '📧',
    type: 'server',
    x: 620, y: 240,
    difficulty: 'medium',
    os: 'Debian 11',
    services: ['SMTP:25', 'IMAP:143', 'SSH:22'],
    locked: false,
    unlockedBy: [],
    connections: ['dbserver'],
    description: 'Serveur mail Postfix. Contient des emails sensibles.',
    flag: 'CQ{m41l_s3rv3r_0wn3d}',
    hints: [
      'Postfix 3.5.6 — bannière SMTP révèle la version',
      'VRFY command activée → énumération d\'utilisateurs',
      'Mot de passe faible sur le compte admin'
    ]
  },
  {
    id: 'dbserver',
    ip: '192.168.1.30',
    name: 'DB Server',
    icon: '🗄',
    type: 'server',
    x: 400, y: 390,
    difficulty: 'medium',
    os: 'CentOS 7',
    services: ['MySQL:3306', 'SSH:22'],
    locked: true,
    unlockedBy: ['webserver', 'mailserver'],
    connections: ['dc'],
    description: 'Base de données MySQL. Accès interne uniquement.',
    flag: 'CQ{db_dump_g0t}',
    hints: [
      'Accessible uniquement depuis les machines compromises',
      'MySQL 5.7 avec credentials trouvés sur le Mail Server',
      'FILE privilege activé — lecture de fichiers système possible'
    ]
  },
  {
    id: 'dc',
    ip: '192.168.1.100',
    name: 'Domain Controller',
    icon: '👑',
    type: 'boss',
    x: 400, y: 520,
    difficulty: 'hard',
    os: 'Windows Server 2019',
    services: ['SMB:445', 'RDP:3389', 'LDAP:389', 'Kerberos:88'],
    locked: true,
    unlockedBy: ['dbserver'],
    connections: [],
    description: 'Contrôleur de domaine Active Directory. Boss final.',
    flag: 'CQ{d0m41n_4dm1n_pwn3d}',
    hints: [
      'SMB signing désactivé → Pass-the-Hash possible',
      'Kerberoasting : GetUserSPNs.py pour récupérer des TGS',
      'Les creds du DB Server permettent un pivot'
    ]
  }
];

// ─── Pentest scenarios per machine ───────────────────────────────────────────

const MACHINE_SCENARIOS = {
  webserver: {
    phase_recon: {
      xp: 20,
      reveals: [
        'Apache/2.4.49 (Ubuntu) détecté',
        'Page /admin trouvée (401 Unauthorized)',
        'Formulaire login sur /login.php',
        'robots.txt révèle /backup/'
      ]
    },
    phase_scan: {
      xp: 30,
      reveals: [
        '\x1b[31mCVE-2021-41773 : Path Traversal sur Apache 2.4.49 !\x1b[0m',
        '/admin/config.php (401)',
        '/backup/db.sql.gz — backup accessible !',
        'SQLi détectée sur /login.php?id=1'
      ]
    },
    phase_exploit: {
      xp: 50,
      reveals: [
        'DB dump : users(id, username, password_hash)',
        'admin:$2y$10$hash → cracké : admin:password123',
        '/etc/passwd récupéré via Path Traversal',
        'Shell obtenu sur /admin/shell.php'
      ]
    },
    phase_post: {
      xp: 80,
      reveals: [
        'User : www-data',
        'sudo -l : (root) NOPASSWD: /usr/bin/python3',
        'Escalade via sudo python3 → ROOT !',
        '\x1b[32m🚩 FLAG : CQ{w3b_s3rv3r_pwn3d}\x1b[0m'
      ],
      unlocksMachines: ['dbserver'],
      flag: 'CQ{w3b_s3rv3r_pwn3d}'
    }
  },

  mailserver: {
    phase_recon: {
      xp: 20,
      reveals: [
        'Postfix 3.5.6 — bannière SMTP exposée',
        '220 mail.corp.local ESMTP Postfix',
        'VRFY activée → énumération possible',
        'Domaine interne : corp.local'
      ]
    },
    phase_scan: {
      xp: 30,
      reveals: [
        'Users valides : admin@corp.local, john@corp.local',
        'CVE-2021-xyz applicable sur Postfix 3.5',
        'IMAP accessible depuis l\'extérieur',
        'Pas de fail2ban détecté → brute-force possible'
      ]
    },
    phase_exploit: {
      xp: 50,
      reveals: [
        'Credentials trouvés : admin:letmein',
        'Emails lus : RH, finances, passwords',
        'Email contient credentials DB : db_user:Str0ngP@ss',
        'Accès total à la messagerie'
      ]
    },
    phase_post: {
      xp: 60,
      reveals: [
        'Emails sensibles exfiltrés',
        'Config Postfix : credentials LDAP trouvés',
        'Pivot possible vers DB Server',
        '\x1b[32m🚩 FLAG : CQ{m41l_s3rv3r_0wn3d}\x1b[0m'
      ],
      unlocksMachines: ['dbserver'],
      flag: 'CQ{m41l_s3rv3r_0wn3d}'
    }
  },

  dbserver: {
    phase_recon: {
      xp: 15,
      reveals: [
        'MySQL 5.7.38 sur port 3306',
        'Accessible depuis webserver et mailserver',
        'Pas de SSL sur la connexion MySQL',
        'Hostname : db.corp.local'
      ]
    },
    phase_scan: {
      xp: 25,
      reveals: [
        'CVE-2016-6662 applicable',
        'FILE privilege activé (dangereux !)',
        'Credentials DB obtenus du Mail Server : db_user:Str0ngP@ss',
        'Bases : information_schema, corp_db, employees'
      ]
    },
    phase_exploit: {
      xp: 70,
      reveals: [
        'Connexion réussie : db_user:Str0ngP@ss',
        'Dump : 450 enregistrements employés',
        'Hash MySQL root cracké : root:toor',
        'SELECT LOAD_FILE("/etc/shadow") → succès !'
      ]
    },
    phase_post: {
      xp: 80,
      reveals: [
        'Webshell déposé via MySQL OUTFILE',
        'Lecture /etc/shadow complet',
        'Pivot vers Domain Controller maintenant possible',
        '\x1b[32m🚩 FLAG : CQ{db_dump_g0t}\x1b[0m'
      ],
      unlocksMachines: ['dc'],
      flag: 'CQ{db_dump_g0t}'
    }
  },

  dc: {
    phase_recon: {
      xp: 20,
      reveals: [
        'Windows Server 2019 — Active Directory',
        'Domain : CORP.LOCAL',
        'SMB signing : DISABLED (vulnérable !)',
        'enum4linux : 3 users, 2 groups'
      ]
    },
    phase_scan: {
      xp: 40,
      reveals: [
        '\x1b[31mEternalBlue MS17-010 potentiel !\x1b[0m',
        'SPN trouvé : MSSQLSvc/dc.corp.local',
        'Kerberoasting → hash TGS récupéré',
        'BloodHound : chemin vers Domain Admin trouvé'
      ]
    },
    phase_exploit: {
      xp: 100,
      reveals: [
        'Hash TGS cracké : svc_sql:ServicePass1!',
        'PSExec → SYSTEM shell obtenu',
        'NTDS.dit dump → TOUS les hashes du domaine',
        'Administrator NTLM : aad3b435b51404eeaad3b435b51404ee'
      ]
    },
    phase_post: {
      xp: 150,
      reveals: [
        'Pass-the-Hash → Domain Administrator',
        'Tous les privilèges AD obtenus',
        'Domaine CORP.LOCAL entièrement compromis',
        '\x1b[33m🏆 FLAG FINAL : CQ{d0m41n_4dm1n_pwn3d}\x1b[0m'
      ],
      unlocksMachines: [],
      flag: 'CQ{d0m41n_4dm1n_pwn3d}',
      gameWin: true
    }
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMachineByIP(ip) {
  return MACHINES.find(m => m.ip === ip) || null;
}

function getMachineByIdOrName(val) {
  return MACHINES.find(m => m.id === val || m.name.toLowerCase() === val.toLowerCase()) || null;
}

// ─── Network mode command handlers ───────────────────────────────────────────

function handleNetwork(cmd, args, state) {
  const joined = args.join(' ');

  if (cmd === 'help') {
    return {
      output: [
        '\x1b[33m╔══════════════════════════════════════════╗\x1b[0m',
        '\x1b[33m║   COMMANDES — Vue Réseau (CorpNet)       ║\x1b[0m',
        '\x1b[33m╚══════════════════════════════════════════╝\x1b[0m',
        '',
        '\x1b[36m  ls\x1b[0m                    Lister les machines visibles',
        '\x1b[36m  nmap <ip/range>\x1b[0m      Scanner le réseau ou une machine',
        '\x1b[36m  cd <ip>\x1b[0m              Entrer dans une salle (machine)',
        '\x1b[36m  whoami\x1b[0m               Ton contexte attaquant',
        '\x1b[36m  hint\x1b[0m                 Obtenir un indice',
        '\x1b[36m  scores\x1b[0m               Tableau des scores',
        '',
        '\x1b[33m📍 ORDRE D\'ATTAQUE RECOMMANDÉ :\x1b[0m',
        '  1. nmap 192.168.1.0/24   → découvrir les machines',
        '  2. nmap -sV 192.168.1.10 → scanner le Web Server',
        '  3. cd 192.168.1.10       → entrer dans la salle Web Server',
      ].join('\n'),
      pedagogie: 'En pentest, on commence toujours par la reconnaissance réseau. nmap permet de découvrir les hôtes, ports ouverts et services disponibles.',
      effect: null,
      xpBonus: 0,
      stateChanges: {}
    };
  }

  if (cmd === 'hint') {
    const pwned = state.pwnedMachines || [];
    const scanned = state.scannedMachines || [];
    const unlocked = state.unlockedMachines || ['webserver', 'mailserver'];
    const targets = MACHINES.filter(m => m.type !== 'firewall' && !pwned.includes(m.id));
    const next = targets.find(m => !m.locked || unlocked.includes(m.id));
    if (scanned.length === 0) {
      return {
        output: [
          '\x1b[33m💡 INDICE — Début de partie :\x1b[0m',
          '',
          '  Tu es sur ta machine Kali Linux.',
          '  Le réseau cible CorpNet est devant toi.',
          '',
          '\x1b[36m  Étape 1 : nmap 192.168.1.0/24\x1b[0m  → découvrir les machines',
          '\x1b[36m  Étape 2 : nmap -sV 192.168.1.10\x1b[0m → scanner le Web Server',
          '\x1b[36m  Étape 3 : cd 192.168.1.10\x1b[0m       → entrer dans la salle',
        ].join('\n'),
        pedagogie: 'La reconnaissance réseau est la première phase de tout pentest. On cartographie la surface d\'attaque avant de tenter quoi que ce soit.',
        effect: null, xpBonus: 0, stateChanges: {}
      };
    }
    if (next) {
      return {
        output: [
          `\x1b[33m💡 INDICE — Prochaine cible : ${next.name} (${next.ip})\x1b[0m`,
          '',
          `  ${next.hints ? next.hints[0] : 'Scanne et entre dans cette machine.'}`,
          '',
          `\x1b[36m  → nmap -sV ${next.ip}\x1b[0m  puis  \x1b[36mcd ${next.ip}\x1b[0m`,
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }
    return {
      output: '\x1b[32m🏆 Toutes les machines ont été compromises !\x1b[0m Tape "scores" pour voir ton classement.',
      pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
    };
  }

  if (cmd === 'ls') {
    const visible = MACHINES.filter(m =>
      !m.locked || state.unlockedMachines.includes(m.id) || state.scannedMachines.includes(m.id)
    );
    const lines = visible.map(m => {
      const st = state.pwnedMachines.includes(m.id) ? '\x1b[32m[PWNED]\x1b[0m  ' :
                 state.scannedMachines.includes(m.id) ? '\x1b[33m[SCANNÉ]\x1b[0m ' : '\x1b[34m[INCONNU]\x1b[0m';
      const locked = m.locked && !state.unlockedMachines.includes(m.id) ? ' 🔒' : '';
      return `  ${m.ip.padEnd(16)} ${st} ${m.name}${locked}`;
    });
    return {
      output: [
        'Réseau CorpNet — Machines visibles :',
        '',
        ...lines,
        '',
        '\x1b[33mAstuce : nmap 192.168.1.0/24 pour découvrir toutes les machines\x1b[0m',
      ].join('\n'),
      pedagogie: '\'ls\' sur le réseau liste les hôtes connus. En vrai pentest : nmap, netdiscover ou arp-scan pour découvrir les machines actives.',
      effect: null,
      xpBonus: 0,
      stateChanges: {}
    };
  }

  if (cmd === 'whoami') {
    return {
      output: [
        '\x1b[31mattacker\x1b[0m@\x1b[33mkali\x1b[0m — IP source : 10.0.0.1',
        `Réseau cible   : 192.168.1.0/24 (CorpNet)`,
        `Machines pwned : ${state.pwnedMachines.length} / ${MACHINES.filter(m => m.type !== 'firewall').length}`,
        `Score XP       : ${state.xp}`,
      ].join('\n'),
      pedagogie: '\'whoami\' vérifie ton contexte : quelle IP on a, quel user on est, quels privilèges. Toujours vérifier après chaque pivot.',
      effect: null,
      xpBonus: 0,
      stateChanges: {}
    };
  }

  if (cmd === 'nmap') {
    // Network-wide scan
    if (joined.includes('192.168.1.0/24') || args.includes('-sn') || joined.includes('/24')) {
      const newScanned = MACHINES
        .filter(m => m.type !== 'firewall' && !m.locked && !state.scannedMachines.includes(m.id))
        .map(m => m.id);

      return {
        output: [
          'Starting Nmap 7.94 — Ping scan 192.168.1.0/24',
          '...',
          '',
          'Nmap scan report for 192.168.1.1    [Firewall]       → filtered',
          '\x1b[32mNmap scan report for 192.168.1.10\x1b[0m   [open: 80,443,22]',
          '\x1b[32mNmap scan report for 192.168.1.20\x1b[0m   [open: 25,143,22]',
          'Nmap scan report for 192.168.1.30   → filtered (réseau interne)',
          'Nmap scan report for 192.168.1.100  → filtered (réseau interne)',
          '',
          '5 hosts up — 2 accessibles, 3 filtrés',
          '',
          '\x1b[33m💡 Utilise "nmap -sV 192.168.1.10" pour un scan de versions\x1b[0m',
          '\x1b[33m   Puis "cd 192.168.1.10" pour attaquer\x1b[0m',
        ].join('\n'),
        pedagogie: 'nmap -sn effectue un ping scan pour découvrir les hôtes actifs. C\'est la première étape d\'un pentest réseau — cartographier la surface d\'attaque.',
        effect: { type: 'SCAN_NETWORK', discovered: ['webserver', 'mailserver'] },
        xpBonus: 30,
        stateChanges: {
          scannedMachines: [...new Set([...state.scannedMachines, ...newScanned, 'webserver', 'mailserver'])]
        }
      };
    }

    // Single machine scan
    const ip = args.find(a => a.match(/192\.168\.1\.\d+/));
    if (ip) {
      const machine = getMachineByIP(ip);
      if (!machine) return { output: `Host ${ip} unreachable.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

      const isLocked = machine.locked && !state.unlockedMachines.includes(machine.id);
      if (isLocked) {
        return {
          output: `\x1b[31m[filtered] ${ip} — Réseau interne inaccessible depuis ta position.\x1b[0m\nTu dois d'abord pivoter depuis une machine compromise.`,
          pedagogie: 'Le pivoting consiste à utiliser une machine compromise comme relais pour accéder à des réseaux internes inaccessibles directement.',
          effect: null, xpBonus: 0, stateChanges: {}
        };
      }

      const portLines = machine.services.map(s => {
        const [name, port] = s.split(':');
        return `${String(port + '/tcp').padEnd(10)} open  ${name.padEnd(10)} [version simulée]`;
      });

      return {
        output: [
          `Starting Nmap 7.94 against ${ip}`,
          `Host is up (0.012s latency).`,
          '',
          'PORT       STATE SERVICE    VERSION',
          ...portLines,
          '',
          `OS detection: ${machine.os}`,
          '',
          `\x1b[32m[+] Machine identifiée : ${machine.name}\x1b[0m`,
          `\x1b[33m💡 Tape "cd ${ip}" pour l'attaquer\x1b[0m`,
        ].join('\n'),
        pedagogie: 'nmap -sV combine scan de ports et détection de versions. Les flags clés : -sV (versions), -sC (scripts), -O (OS), -p- (tous ports).',
        effect: { type: 'SCAN_MACHINE', machineId: machine.id },
        xpBonus: 20,
        stateChanges: {
          scannedMachines: [...new Set([...state.scannedMachines, machine.id])]
        }
      };
    }

    return { output: 'Usage: nmap 192.168.1.0/24   ou   nmap -sV <ip>', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  if (cmd === 'cd') {
    const target = args[0];
    const machine = getMachineByIP(target) || getMachineByIdOrName(target);

    if (!machine) {
      return { output: `bash: cd: ${target}: No such host or directory`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }

    const isLocked = machine.locked && !state.unlockedMachines.includes(machine.id);
    if (isLocked) {
      const needs = machine.unlockedBy.join(' ou ');
      return {
        output: [
          `\x1b[31m[ACCÈS REFUSÉ] ${machine.ip} — ${machine.name}\x1b[0m`,
          `Réseau interne inaccessible depuis ta position.`,
          `\x1b[33m💡 Compromets d'abord : ${needs}\x1b[0m`,
        ].join('\n'),
        pedagogie: 'Le pivoting permet d\'atteindre des machines internes via une machine compromise. Technique clé en pentest de réseaux segmentés.',
        effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    if (machine.type === 'firewall') {
      return {
        output: `\x1b[31m[BLOQUÉ] Le Firewall filtre toute tentative de connexion directe.\x1b[0m\nAttaque les machines de la DMZ à la place.`,
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    if (!state.scannedMachines.includes(machine.id)) {
      return {
        output: [
          `\x1b[33m⚠ Machine non scannée !\x1b[0m`,
          `Lance d'abord : \x1b[36mnmap -sV ${machine.ip}\x1b[0m`,
          `Un bon pentester scanne avant d'attaquer.`,
        ].join('\n'),
        pedagogie: 'La reconnaissance avant exploitation est fondamentale : connaître les services et versions permet de choisir les bons exploits.',
        effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    const svcStr = machine.services.join(' | ');
    const diffLabel = { easy: 'FACILE', medium: 'MOYEN', hard: 'DIFFICILE' }[machine.difficulty] || machine.difficulty;
    return {
      output: [
        `\x1b[32m╔══════════════════════════════════════════════════╗\x1b[0m`,
        `\x1b[32m║  ${(machine.icon + ' ENTRÉE : ' + machine.name).padEnd(48)}║\x1b[0m`,
        `\x1b[32m╚══════════════════════════════════════════════════╝\x1b[0m`,
        '',
        `  \x1b[36mIP      :\x1b[0m ${machine.ip}          \x1b[33m[${diffLabel}]\x1b[0m`,
        `  \x1b[36mOS      :\x1b[0m ${machine.os}`,
        `  \x1b[36mServices:\x1b[0m ${svcStr}`,
        '',
        `\x1b[33m━━━ PHASE 1 : RECONNAISSANCE ━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
        '',
        `  Commence par analyser cette machine :`,
        `  \x1b[36m→ recon\x1b[0m                   Reconnaissance passive (DNS, WHOIS...)`,
        `  \x1b[36m→ nmap -sV ${machine.ip}\x1b[0m  Scan de versions et services`,
        '',
        `\x1b[37m  💡 Bloqué ?       tape : \x1b[36mhint\x1b[0m`,
        `\x1b[37m  📋 Aide complète : tape : \x1b[36mhelp\x1b[0m`,
        `\x1b[37m  🚪 Quitter :       tape : \x1b[36mexit\x1b[0m`,
      ].join('\n'),
      pedagogie: '\'cd\' vers une IP simule l\'établissement d\'une connexion. En réel : ssh, netcat, ou un reverse shell selon le service disponible.',
      effect: { type: 'ENTER_MACHINE', machine },
      xpBonus: 10,
      stateChanges: {
        mode: 'MACHINE',
        currentMachine: machine,
        machinePhase: 0,
        rootObtained: false,
      }
    };
  }

  if (cmd === 'scores' || cmd === 'scoreboard') {
    return { output: '', pedagogie: null, effect: { type: 'SHOW_SCORES' }, xpBonus: 0, stateChanges: {} };
  }

  return {
    output: `\x1b[31mbash: ${cmd}: command not found\x1b[0m\nTape \x1b[33mhelp\x1b[0m pour les commandes disponibles.`,
    pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
  };
}

// ─── Machine mode command handlers ───────────────────────────────────────────

function handleMachine(cmd, args, state) {
  const machine = state.currentMachine;
  if (!machine) return { output: 'Erreur: aucune machine active.', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

  const scenario = MACHINE_SCENARIOS[machine.id];
  if (!scenario) return { output: `Scénario non défini pour ${machine.id}.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

  const phase = state.machinePhase;

  if (cmd === 'help') {
    return {
      output: [
        `\x1b[36m╔══════════════════════════════════════════╗\x1b[0m`,
        `\x1b[36m║  COMMANDES — ${machine.name.padEnd(28)}║\x1b[0m`,
        `\x1b[36m╚══════════════════════════════════════════╝\x1b[0m`,
        '',
        '\x1b[33mRECONNAISSANCE :\x1b[0m',
        '  recon              Reconnaissance passive',
        '  whois <ip>         Infos WHOIS',
        '  dig <ip>           Résolution DNS',
        '',
        '\x1b[33mSCANNING :\x1b[0m',
        '  nmap -sV <ip>      Scan ports + versions',
        '  nikto -h <ip>      Vulnérabilités web',
        '  dirb http://<ip>   Brute-force répertoires',
        '  searchsploit <app> Chercher exploits',
        '',
        '\x1b[33mEXPLOITATION :\x1b[0m',
        '  sqlmap -u <url>    Injection SQL',
        '  hydra -l <u> <ip>  Brute-force creds',
        '  curl <url>         Requête HTTP',
        '  nc <ip> <port>     Netcat',
        '',
        '\x1b[33mPOST-EXPLOITATION :\x1b[0m',
        '  whoami             Identité courante',
        '  sudo -l            Droits sudo',
        '  find / -perm -4000 Binaires SUID',
        '  cat /flag.txt      Lire le flag (si root)',
        '',
        '  exit               Revenir au réseau',
      ].join('\n'),
      pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
    };
  }

  if (cmd === 'hint') {
    const phaseHints = [
      // Phase 0 — Recon
      [
        `\x1b[33m💡 INDICE — Phase RECONNAISSANCE :\x1b[0m`,
        '',
        `  Tu dois d'abord analyser ${machine.name} passivement.`,
        `  \x1b[36m→ tape : recon\x1b[0m`,
        '',
        machine.hints && machine.hints[0] ? `  Info : ${machine.hints[0]}` : '',
      ],
      // Phase 1 — Scan
      [
        `\x1b[33m💡 INDICE — Phase SCANNING :\x1b[0m`,
        '',
        `  Effectue un scan approfondi pour trouver des vulnérabilités.`,
        `  \x1b[36m→ nmap -sV ${machine.ip}\x1b[0m`,
        `  \x1b[36m→ nikto -h ${machine.ip}\x1b[0m   (si serveur web)`,
        '',
        machine.hints && machine.hints[1] ? `  Info : ${machine.hints[1]}` : '',
      ],
      // Phase 2 — Exploit
      [
        `\x1b[33m💡 INDICE — Phase EXPLOITATION :\x1b[0m`,
        '',
        `  Des vulnérabilités ont été trouvées. Exploite-les !`,
        `  \x1b[36m→ sqlmap -u http://${machine.ip}/login.php\x1b[0m`,
        `  \x1b[36m→ hydra -l admin -P rockyou.txt ${machine.ip} ssh\x1b[0m`,
        '',
        machine.hints && machine.hints[2] ? `  Info : ${machine.hints[2]}` : '',
      ],
      // Phase 3 — Post-exploit
      [
        `\x1b[33m💡 INDICE — Phase POST-EXPLOITATION :\x1b[0m`,
        '',
        `  Tu as un accès. Maintenant élève tes privilèges et capture le flag.`,
        `  \x1b[36m→ whoami\x1b[0m          Vérifier l'utilisateur courant`,
        `  \x1b[36m→ sudo -l\x1b[0m         Chercher les droits sudo`,
        `  \x1b[36m→ sudo python3 ...\x1b[0m  Élever en root`,
        `  \x1b[36m→ cat /flag.txt\x1b[0m   Capturer le flag !`,
      ],
    ];
    const idx = Math.min(phase, phaseHints.length - 1);
    return {
      output: phaseHints[idx].filter(s => s !== '').join('\n'),
      pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
    };
  }

  if (cmd === 'exit') {
    return {
      output: `\x1b[33m[DÉCONNEXION] ${machine.ip} → réseau CorpNet\x1b[0m`,
      pedagogie: 'exit ferme la session. En pentest réel, on nettoie ses traces : supprimer les shells, logs, fichiers temporaires.',
      effect: { type: 'EXIT_MACHINE' },
      xpBonus: 0,
      stateChanges: { mode: 'NETWORK', currentMachine: null, rootObtained: false }
    };
  }

  if (cmd === 'recon' || (cmd === 'whois') || (cmd === 'dig')) {
    if (phase >= 1) {
      return { output: `\x1b[33m[Déjà fait]\x1b[0m Reconnaissance complétée. Phase actuelle : ${getPhaseName(phase)}.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
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
        `\x1b[37mProchaine étape → Scanning approfondi\x1b[0m`,
        `\x1b[37mCommandes : nmap -sV ${machine.ip}, nikto, dirb\x1b[0m`,
      ].join('\n'),
      pedagogie: 'La reconnaissance passive collecte des infos sans toucher la cible : WHOIS, DNS, certificats SSL, moteurs de recherche. La reconnaissance active (nmap) envoie des paquets.',
      effect: { type: 'PHASE_COMPLETE', phase: 'RECON', machineId: machine.id },
      xpBonus: pr.xp,
      stateChanges: { machinePhase: 1 }
    };
  }

  if (cmd === 'nmap' || cmd === 'nikto' || cmd === 'dirb' || cmd === 'searchsploit') {
    if (phase < 1) return { output: `\x1b[31m[!] Lance d'abord la reconnaissance : recon\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (phase >= 2) return { output: `\x1b[33m[Déjà fait]\x1b[0m Scanning complété. Passe à l'exploitation.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

    const ps = scenario.phase_scan;
    const pedas = {
      nmap: 'nmap -sV -sC -p- : scan complet avec scripts et détection de versions. -A ajoute détection OS. -oN file.txt sauvegarde le résultat.',
      nikto: 'Nikto scanne les serveurs web pour des configs dangereuses, fichiers exposés et CVEs connus. Utile pour les tests web rapides.',
      dirb: 'dirb brute-force les répertoires web avec une wordlist. Équivalent moderne : gobuster, feroxbuster. Découvre les pages cachées.',
      searchsploit: 'searchsploit cherche dans Exploit-DB local les exploits pour une application/version donnée. Toujours vérifier la version exacte avant de tester.',
    };
    return {
      output: [
        `\x1b[36m╔═══════════════════════════════════════╗\x1b[0m`,
        `\x1b[36m║  PHASE 2 — SCANNING                  ║\x1b[0m`,
        `\x1b[36m╚═══════════════════════════════════════╝\x1b[0m`,
        `Target : ${machine.ip}`,
        '',
        ...ps.reveals.map(r => `\x1b[33m[+]\x1b[0m ${r}`),
        '',
        `\x1b[32m✓ Scanning terminé ! +${ps.xp} XP\x1b[0m`,
        `\x1b[37mVulnérabilités trouvées ! Passe à l'exploitation.\x1b[0m`,
        `\x1b[37mCommandes : sqlmap, hydra, curl\x1b[0m`,
      ].join('\n'),
      pedagogie: pedas[cmd] || 'Scanning approfondi complété.',
      effect: { type: 'PHASE_COMPLETE', phase: 'SCAN', machineId: machine.id },
      xpBonus: ps.xp,
      stateChanges: { machinePhase: 2 }
    };
  }

  if (cmd === 'sqlmap' || cmd === 'hydra' || cmd === 'curl' || cmd === 'nc' || cmd === 'exploit') {
    if (phase < 2) return { output: `\x1b[31m[!] Tu n'as pas encore scanné. Lance d'abord le scanning.\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (phase >= 3) return { output: `\x1b[33m[Déjà fait]\x1b[0m Exploitation complétée. Lance "whoami" et "sudo -l".`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

    const pe = scenario.phase_exploit;
    const pedas = {
      sqlmap: 'sqlmap automatise la détection et l\'exploitation des injections SQL. --dbs liste les bases, --dump extrait les données. Toujours sur cibles autorisées.',
      hydra: 'Hydra est un outil de brute-force multi-protocoles (SSH, HTTP, SMTP, FTP). -l = login, -P = wordlist. rockyou.txt est la wordlist standard en pentest.',
      curl: 'curl permet des requêtes HTTP manuelles. Utile pour tester des CVEs, envoyer des payloads, vérifier des réponses de serveur.',
      nc: 'netcat = le couteau suisse réseau : connexions TCP/UDP, transfert de fichiers, reverse shells, port listening.',
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
        `\x1b[37mAccès obtenu. Lance les commandes post-exploitation :\x1b[0m`,
        `\x1b[37mwhoami → sudo -l → cat /flag.txt\x1b[0m`,
      ].join('\n'),
      pedagogie: pedas[cmd] || 'Exploitation réussie.',
      effect: { type: 'PHASE_COMPLETE', phase: 'EXPLOIT', machineId: machine.id },
      xpBonus: pe.xp,
      stateChanges: { machinePhase: 3 }
    };
  }

  if (cmd === 'whoami') {
    if (phase < 3) return { output: `\x1b[33mTu n'es pas encore sur la machine. Exploite-la d'abord.\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    const user = state.rootObtained ? 'root' : 'www-data';
    const hint = state.rootObtained ? '' : `\n\x1b[33m💡 Tu es ${user}, pas root. Essaie : sudo -l\x1b[0m`;
    return {
      output: `${user}${hint}`,
      pedagogie: 'whoami vérifie l\'identité post-exploitation. www-data = service web, pas root. L\'escalade de privilèges (PrivEsc) est souvent nécessaire.',
      effect: null, xpBonus: 5, stateChanges: {}
    };
  }

  if (cmd === 'sudo') {
    if (phase < 3) return { output: `\x1b[33mTu n'as pas encore accès à cette machine.\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (args[0] === '-l') {
      return {
        output: [
          'Matching Defaults entries for www-data:',
          '    env_reset, mail_badpass',
          '',
          'User www-data may run the following commands on ' + machine.ip + ':',
          `\x1b[32m    (root) NOPASSWD: /usr/bin/python3\x1b[0m`,
          '',
          `\x1b[33m💡 Escalade possible ! Lance :\x1b[0m`,
          `\x1b[36m   sudo python3 -c 'import os; os.system("/bin/bash")'\x1b[0m`,
        ].join('\n'),
        pedagogie: 'sudo -l liste les commandes exécutables en root. NOPASSWD sur python3, vim, find ou d\'autres binaires = PrivEsc facile. Référence : GTFOBins.',
        effect: null, xpBonus: 20, stateChanges: {}
      };
    }
    if (args.join(' ').includes('python3') || args[0] === 'su') {
      return {
        output: [
          '\x1b[32m[+] Élévation de privilèges réussie !\x1b[0m',
          'root@' + machine.ip.replace(/\./g, '-') + ':~# whoami',
          'root',
          '',
          '\x1b[32m🎉 Tu es maintenant ROOT sur cette machine !\x1b[0m',
          '\x1b[37mTape : cat /flag.txt\x1b[0m',
        ].join('\n'),
        pedagogie: 'Sudo abuse : si python3 peut être lancé en root sans mot de passe, il peut spawner un shell root. Voir GTFOBins (gtfobins.github.io) pour d\'autres binaires exploitables.',
        effect: { type: 'ROOT_OBTAINED', machineId: machine.id },
        xpBonus: 50,
        stateChanges: { rootObtained: true }
      };
    }
    return { output: 'sudo: commande inconnue. Essaie : sudo -l', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  if (cmd === 'find') {
    if (phase < 3) return { output: 'find: aucun accès.', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    return {
      output: [
        '/usr/bin/python3',
        '/usr/bin/sudo',
        '/usr/bin/pkexec',
        '/bin/mount',
        '/bin/su',
        '',
        '\x1b[33m💡 /usr/bin/python3 est SUID → exploitable avec GTFOBins\x1b[0m',
      ].join('\n'),
      pedagogie: 'find / -perm -4000 liste les binaires SUID (Set User ID). Si un binaire SUID appartient à root et peut exécuter du code, c\'est un vecteur d\'escalade de privilèges.',
      effect: null, xpBonus: 10, stateChanges: {}
    };
  }

  if (cmd === 'cat') {
    if (args[0] === '/flag.txt' || args[0] === 'flag.txt' || args[0] === '/root/flag.txt') {
      if (phase < 3) return { output: `cat: ${args[0]}: No such file or directory`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
      if (!state.rootObtained) {
        return {
          output: `\x1b[31mcat: ${args[0]}: Permission denied\x1b[0m\n\x1b[33m💡 Tu dois être root. Lance : sudo -l\x1b[0m`,
          pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
        };
      }

      const pp = scenario.phase_post;
      const alreadyPwned = state.pwnedMachines.includes(machine.id);
      const newPwned = alreadyPwned ? state.pwnedMachines : [...state.pwnedMachines, machine.id];
      const newUnlocked = [...new Set([...state.unlockedMachines, ...(pp.unlocksMachines || [])])];

      const unlockMsg = (pp.unlocksMachines || []).map(id => {
        const m = MACHINES.find(x => x.id === id);
        return m ? `\x1b[32m🔓 ${m.name} (${m.ip}) débloquée !\x1b[0m` : '';
      }).filter(Boolean);

      return {
        output: [
          '\x1b[32m╔══════════════════════════════════════════╗\x1b[0m',
          '\x1b[32m║          🚩 FLAG TROUVÉ !                ║\x1b[0m',
          '\x1b[32m╚══════════════════════════════════════════╝\x1b[0m',
          '',
          `\x1b[33m${pp.flag}\x1b[0m`,
          '',
          ...pp.reveals.slice(-2),
          '',
          `\x1b[36m+${pp.xp} XP — ${machine.name} compromise !\x1b[0m`,
          ...(unlockMsg.length ? ['', ...unlockMsg] : []),
          '',
          `\x1b[37mTape "exit" pour revenir au réseau et continuer.\x1b[0m`,
          pp.gameWin ? '\x1b[32m🏆 TU AS COMPLÉTÉ CYBERQUEST ! Tape "exit" pour voir ton score final.\x1b[0m' : '',
        ].filter(s => s !== '').join('\n'),
        pedagogie: 'En CTF et pentest, le flag prouve la compromission. En pentest réel, on documente chaque étape : logs, screenshots, fichiers récupérés → rapport d\'audit.',
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
    return { output: `cat: ${args[0] || ''}: No such file or directory`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  if (cmd === 'scores' || cmd === 'scoreboard') {
    return { output: '', pedagogie: null, effect: { type: 'SHOW_SCORES' }, xpBonus: 0, stateChanges: {} };
  }

  // Unknown command
  return {
    output: `\x1b[31mbash: ${cmd}: command not found\x1b[0m\nTape \x1b[33mhelp\x1b[0m pour les commandes disponibles.`,
    pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
  };
}

function getPhaseName(p) {
  return ['Reconnaissance', 'Scanning', 'Exploitation', 'Post-Exploitation', 'Terminée'][p] || 'Inconnue';
}

// ─── Main entry point ────────────────────────────────────────────────────────

function processCommand(rawInput, state) {
  if (!rawInput || !rawInput.trim()) return { output: '', pedagogie: null, effect: null, newState: state };

  const parts = rawInput.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  // clear works everywhere
  if (cmd === 'clear') return { output: '\x1b[2J\x1b[H', pedagogie: null, effect: { type: 'CLEAR' }, newState: state };

  const mode = state.mode || 'NETWORK';
  const result = mode === 'MACHINE' ? handleMachine(cmd, args, state) : handleNetwork(cmd, args, state);

  const newState = {
    ...state,
    xp: state.xp + (result.xpBonus || 0),
    ...result.stateChanges
  };

  return {
    output: result.output,
    pedagogie: result.pedagogie,
    effect: result.effect,
    newState
  };
}

module.exports = { processCommand, MACHINES };
