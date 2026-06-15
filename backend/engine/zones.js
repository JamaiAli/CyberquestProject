const zonesData = require('../data/zones.json');

const ZONE_FILES = {
  0: {
    'goblin.txt':  '⚠ GOBELIN DÉTECTÉ\nPID: 1337\nHP: 30\nFaiblesse: kill -9 1337\nNote: Ce gobelin bloque le passage vers la zone suivante.',
    'troll.sh':    '#!/bin/bash\n# TROLL GARDIEN\n# HP: 50 | Permissions: -rw-r--r-- (non exécutable)\n# Faiblesse: chmod +x troll.sh puis ./troll.sh\necho "TROLL VAINCU !"',
    'sword.sh':    '#!/bin/bash\n# ÉPÉE BASH — Arme niveau 1\n# Utilise: chmod +x sword.sh\necho "⚔ Épée bash équipée ! +10 ATK"',
    'map.txt':     '🗺 CARTE DU MONDE CYBERQUEST\n\n[Zone 0] Forêt de départ      → /home/player\n[Zone 1] Village — Recon       → /recon       [LOCKED]\n[Zone 2] Donjon — Exploitation → /exploit     [LOCKED]\n[Zone 3] Tour finale           → /root        [LOCKED]\n\nObjectif : Atteindre /root et obtenir le flag.',
    'readme.txt':  '📋 BIENVENUE DANS CYBERQUEST\n\nTu es dans /home/player. Voici ce que tu peux faire :\n  ls              → lister les fichiers\n  cat readme.txt  → lire ce fichier\n  cat map.txt     → voir la carte du monde\n  whoami          → connaître ton identité\n  ps aux          → voir les processus ennemis\n  kill -9 <PID>   → éliminer un gobelin\n\nBonne chance, hacker !',
    'notes.txt':   '📝 NOTES DE TERRAIN\n\nJ\'ai repéré deux ennemis dans ce secteur :\n1. Un Gobelin (goblin.txt) — PID 1337, utilise kill -9\n2. Un Troll (troll.sh)   — Fichier non-exécutable, utilise chmod +x\n\nUne fois vaincus, tu pourras progresser vers la Zone 1.'
  },
  1: {
    'guard.conf':  '[GUARD RÉSEAU]\nIP: 192.168.1.1\nPorts ouverts: 22, 80, 443, 8080\nOS: Linux 5.4\nHP: 60\nFaiblesse: nmap -sV 192.168.1.1\n\nScan tous les ports pour trouver sa vulnérabilité !',
    'network.txt': '🌐 TOPOLOGIE RÉSEAU\n\n192.168.1.1   → Garde réseau (guard.conf)\n192.168.1.100 → Le Firewall [BOSS]\n192.168.1.255 → Broadcast\n\nUtilise nmap pour scanner le réseau.',
    'recon.txt':   '📡 GUIDE DE RECONNAISSANCE\n\nnmap -sV <ip>     → Scan de versions\nnmap -p- <ip>     → Tous les ports\nnmap -A <ip>      → Détection OS + scripts\nwhois <domain>    → Infos domaine\nnslookup <domain> → Résolution DNS\n\nCommence par scanner 192.168.1.1'
  },
  2: {
    'orc.php':     '<?php\n// ORC SQL — Vulnérable aux injections SQL\n$query = "SELECT * FROM users WHERE id=" . $_GET[\'id\'];\n// HP: 80 | Faiblesse: sqlmap -u "http://orc.local/?id=1"\nmysql_query($query);\n?>',
    'login.html':  '<form action="/login" method="POST">\n  <!-- DRAGON GARDIEN — HP: 100 -->\n  <!-- Faiblesse: hydra -l admin -P wordlist.txt http://dragon.local -->\n  <input name="username" />\n  <input name="password" type="password" />\n  <button>Login</button>\n</form>',
    'wordlist.txt': 'admin\npassword\n123456\nroot\ntoor\nletmein\ndragon\nmaster\npassword123\nadmin123',
    'exploit.txt': '💣 SEIGNEUR APACHE — BOSS ZONE 2\n\nVersion: Apache 2.2.8\nCVE: CVE-2012-0883\nFaiblesse: searchsploit apache 2.2\n\nTrouve l\'exploit et attaque !'
  },
  3: {
    'sudoers':     '# /etc/sudoers\n# ADMIN SYSTÈME — HP: 120\n# Faiblesse: sudo -l\n\nplayer ALL=(ALL) NOPASSWD: /bin/bash\n\n# Utilise: sudo -l pour voir tes droits\n# Puis: sudo su pour devenir root !',
    'flag.txt':    '🎉 FÉLICITATIONS !\n\nTu as complété CYBERQUEST !\n\nFLAG: CTF{h4ck3r_m4st3r_cyb3rqu3st_2024}\n\nScore final enregistré. Tu es maintenant un vrai hacker !',
    'shadow':      'root:$6$xyz$hashedpassword:19000:0:99999:7:::\nplayer:$6$abc$anotherhashedpassword:19000:0:99999:7:::',
    'history.txt': '# .bash_history du root\nsudo su\ncat /etc/shadow\necho "CTF{h4ck3r_m4st3r_cyb3rqu3st_2024}" > /root/flag.txt\npython3 -m http.server 8080\nchmod 600 /root/flag.txt'
  }
};

function getZone(zoneId) {
  return zonesData.zones.find(z => z.id === zoneId) || null;
}

function getZoneFiles(zoneId) {
  return ZONE_FILES[zoneId] || {};
}

function getFileContent(zoneId, filename) {
  const files = ZONE_FILES[zoneId] || {};
  return files[filename] || null;
}

module.exports = { getZone, getZoneFiles, getFileContent };
