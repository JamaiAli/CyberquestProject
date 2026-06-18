// ═══════════════════════════════════════════════════════════════════════════
//  Linux Commands Training — 8 niveaux thématiques
// ═══════════════════════════════════════════════════════════════════════════

import { handleLinuxCommand } from '../utils/linuxSimulator';

const c = (t, col) => ({ t, c: col });

export const LINUX_LEVELS = [
  { n: 1, title: 'Navigation & fichiers', intro: 'Apprends à te déplacer dans le système et à manipuler les fichiers de base.' },
  { n: 2, title: 'Lecture & manipulation', intro: 'Découvre comment lire, filtrer et modifier le contenu des fichiers.' },
  { n: 3, title: 'Utilisateurs & permissions', intro: 'Gère les droits d\'accès et l\'identité sur le système.' },
  { n: 4, title: 'Processus & système', intro: 'Surveille les ressources et contrôle les processus en cours.' },
  { n: 5, title: 'Réseau', intro: 'Analyse la connectivité, les ports et les téléchargements.' },
  { n: 6, title: 'Paquets & services', intro: 'Installe des logiciels et gère les services en arrière-plan.' },
  { n: 7, title: 'Archives & compression', intro: 'Regroupe et compresse des fichiers pour le transfert.' },
  { n: 8, title: 'Shell & divers', intro: 'Maîtrise l\'environnement shell, l\'historique et les redirections.' },
];

export const MAX_LINUX_LEVEL = LINUX_LEVELS.length;

export function getLinuxLevel(n) {
  return LINUX_LEVELS.find(l => l.n === n) || LINUX_LEVELS[0];
}

export function initialLinuxProg() {
  return {};
}

// ── Objectifs ─────────────────────────────────────────────────────────────

export function linuxObjectives(n, prog) {
  const defs = {
    1: [
      { key: 'ls', label: 'Lister les fichiers (ls, ls -la)' },
      { key: 'cd', label: 'Changer de répertoire (cd, cd ..)' },
      { key: 'pwd', label: 'Afficher le répertoire (pwd)' },
      { key: 'mkdir', label: 'Créer un dossier (mkdir, mkdir -p)' },
      { key: 'rm', label: 'Supprimer un fichier/dossier (rm, rmdir)' },
      { key: 'cp_mv', label: 'Copier / Déplacer (cp, mv)' },
      { key: 'find_loc', label: 'Rechercher (find, locate)' },
    ],
    2: [
      { key: 'cat_less', label: 'Afficher le contenu (cat, less)' },
      { key: 'head_tail', label: 'Afficher les extrémités (head, tail)' },
      { key: 'grep', label: 'Rechercher du texte (grep)' },
      { key: 'wc_sort_uniq', label: 'Traiter les lignes (wc, sort, uniq)' },
      { key: 'cut_awk_sed', label: 'Manipulation avancée (cut, awk, sed)' },
      { key: 'diff', label: 'Comparer des fichiers (diff)' },
    ],
    3: [
      { key: 'whoami_id', label: 'Identité (whoami, id, who)' },
      { key: 'sudo_su', label: 'Privilèges (sudo, su)' },
      { key: 'user_grp', label: 'Gestion comptes (useradd, groupadd, passwd)' },
      { key: 'perms', label: 'Permissions & Propriétaire (chmod, chown)' },
    ],
    4: [
      { key: 'ps_top', label: 'Lister les processus (ps, top, htop)' },
      { key: 'kill', label: 'Terminer un processus (kill, pkill)' },
      { key: 'bg_fg', label: 'Arrière-plan (bg, fg, jobs, nohup)' },
      { key: 'sys_info', label: 'Infos système (uname, uptime, lscpu, lsblk)' },
      { key: 'disk_mem', label: 'Ressources (df, du, free)' },
    ],
    5: [
      { key: 'ip_ping', label: 'Connectivité (ip, ping, traceroute)' },
      { key: 'web', label: 'Requêtes Web (curl, wget)' },
      { key: 'ports', label: 'Ports (ss, netstat)' },
      { key: 'dns', label: 'Résolution DNS (nslookup, dig)' },
      { key: 'ssh_scp', label: 'Accès distant (ssh, scp, rsync)' },
    ],
    6: [
      { key: 'apt', label: 'Gestionnaire de paquets (apt, dpkg, yum, dnf)' },
      { key: 'systemd', label: 'Gestion des services (systemctl, journalctl)' },
    ],
    7: [
      { key: 'tar', label: 'Archives Tar (tar)' },
      { key: 'zip', label: 'Archives Zip (zip, unzip)' },
      { key: 'gzip', label: 'Compression Gzip (gzip, gunzip)' },
    ],
    8: [
      { key: 'echo_env', label: 'Variables (echo, export, env)' },
      { key: 'history', label: 'Historique (history, !!)' },
      { key: 'alias_which', label: 'Commandes (alias, which, type, man)' },
    ],
  };
  return (defs[n] || []).map(d => ({ key: d.key, label: d.label, done: !!prog[d.key] }));
}

// ── Traitement des commandes pour valider les objectifs ───────────────────

export async function handleLinuxTerm(n, prog, rawCmd, ctx = {}) {
  const cmd = rawCmd.trim();
  const lower = cmd.toLowerCase();
  const base = lower.split(/\s+/)[0];
  
  if (lower === 'clear') return { lines: [], prog, notify: null, done: false, clear: true };

  // Update objectives based on the base command
  const newProg = { ...prog };
  
  const mapObj = (keys, flag) => {
    if (keys.includes(base)) newProg[flag] = true;
  };

  switch (n) {
    case 1:
      mapObj(['ls'], 'ls');
      mapObj(['cd'], 'cd');
      mapObj(['pwd'], 'pwd');
      mapObj(['mkdir'], 'mkdir');
      mapObj(['rm', 'rmdir'], 'rm');
      mapObj(['cp', 'mv'], 'cp_mv');
      mapObj(['find', 'locate'], 'find_loc');
      break;
    case 2:
      mapObj(['cat', 'less'], 'cat_less');
      mapObj(['head', 'tail'], 'head_tail');
      mapObj(['grep'], 'grep');
      mapObj(['wc', 'sort', 'uniq'], 'wc_sort_uniq');
      mapObj(['cut', 'awk', 'sed'], 'cut_awk_sed');
      mapObj(['diff'], 'diff');
      break;
    case 3:
      mapObj(['whoami', 'id', 'who'], 'whoami_id');
      mapObj(['sudo', 'su'], 'sudo_su');
      mapObj(['useradd', 'userdel', 'groupadd', 'usermod', 'passwd'], 'user_grp');
      mapObj(['chmod', 'chown'], 'perms');
      break;
    case 4:
      mapObj(['ps', 'top', 'htop'], 'ps_top');
      mapObj(['kill', 'pkill'], 'kill');
      mapObj(['bg', 'fg', 'jobs', 'nohup'], 'bg_fg');
      mapObj(['uname', 'uptime', 'lscpu', 'lsblk', 'lsof'], 'sys_info');
      mapObj(['df', 'du', 'free'], 'disk_mem');
      break;
    case 5:
      mapObj(['ip', 'ifconfig', 'ping', 'traceroute'], 'ip_ping');
      mapObj(['curl', 'wget'], 'web');
      mapObj(['ss', 'netstat'], 'ports');
      mapObj(['nslookup', 'dig'], 'dns');
      mapObj(['ssh', 'scp', 'rsync'], 'ssh_scp');
      break;
    case 6:
      mapObj(['apt', 'dpkg', 'yum', 'dnf'], 'apt');
      mapObj(['systemctl', 'journalctl'], 'systemd');
      break;
    case 7:
      mapObj(['tar'], 'tar');
      mapObj(['zip', 'unzip'], 'zip');
      mapObj(['gzip', 'gunzip'], 'gzip');
      break;
    case 8:
      mapObj(['echo', 'export', 'env'], 'echo_env');
      if (lower.startsWith('history') || lower.startsWith('!!')) newProg.history = true;
      mapObj(['alias', 'which', 'type', 'man'], 'alias_which');
      break;
  }

  const objs = linuxObjectives(n, newProg);
  const done = objs.every(o => o.done);
  
  // Exécuter la commande simulée via l'API (levelN transmis pour contextualiser le system prompt)
  const sim = await handleLinuxCommand(rawCmd, { ...ctx, levelN: n }, () => ctx.accessToken);
  let lines = [];
  let nextEnv = ctx.envState || null;

  if (sim.handled) {
    lines = sim.lines;
    nextEnv = sim.envState;
  } else {
    lines = [c(`bash: ${base}: command not found`, '#ff5555')];
  }

  // Generate notification if an objective was just completed
  let notify = null;
  const oldObjs = linuxObjectives(n, prog);
  for (let i = 0; i < objs.length; i++) {
    if (objs[i].done && !oldObjs[i].done) {
      notify = `✅ Objectif atteint : ${objs[i].label}`;
    }
  }

  return { lines, prog: newProg, notify, done, envState: nextEnv };
}
