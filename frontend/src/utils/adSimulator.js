// ═══════════════════════════════════════════════════════════════════════════
//  Fallback LLM pour le terminal Pentest Active Directory.
//  Appelé par adLevels.js quand la chaîne d'attaque scriptée ne reconnaît pas
//  la commande. Donne une sortie réaliste dans le contexte AD (et non Linux).
// ═══════════════════════════════════════════════════════════════════════════

import { runLocal } from './linuxSimulator';

const c = (t, col = '#d8d8d8') => ({ t, c: col });

// Shells de type Linux : on y exécute les commandes fichiers en local (VFS)
const LINUX_SHELLS = ['kali', 'shell', 'root'];

// VFS réaliste pour la room AD — cohérent avec le scénario de pentest.
// Chaque shell a sa propre arborescence initiale.
export const AD_VFS = {
  kali: {
    cwd: '/home/kali/pentest',
    fs: {
      '/': ['home', 'var', 'etc', 'opt', 'tmp', 'root'],
      '/home': ['kali'],
      '/home/kali': ['pentest', '.bashrc', '.ssh'],
      '/home/kali/pentest': ['nmap', 'loot', 'exploits'],
      '/home/kali/pentest/nmap': [],
      '/home/kali/pentest/loot': [],
      '/home/kali/pentest/exploits': [],
      '/home/kali/.ssh': ['id_rsa', 'known_hosts'],
      '/opt': ['impacket', 'evil-winrm'],
      '/var': ['log'],
      '/etc': ['passwd', 'hosts'],
      '/tmp': [],
      '/root': [],
    },
  },
  shell: {
    cwd: '/var/www/html',
    fs: {
      '/': ['var', 'etc', 'home', 'tmp', 'usr', 'bin'],
      '/var': ['www', 'log'],
      '/var/www': ['html'],
      '/var/www/html': ['index.php', 'config.php', '.htaccess'],
      '/etc': ['passwd', 'apache2'],
      '/home': ['www-data'],
      '/tmp': [],
    },
  },
  root: {
    cwd: '/root',
    fs: {
      '/': ['root', 'var', 'etc', 'home', 'tmp', 'usr'],
      '/root': ['.bash_history', '.ssh'],
      '/root/.ssh': ['authorized_keys'],
      '/var': ['www', 'log'],
      '/var/www': ['html'],
      '/var/www/html': ['index.php', 'config.php'],
      '/etc': ['passwd', 'shadow', 'sudoers'],
      '/home': ['www-data'],
      '/tmp': [],
    },
  },
};

function colorize(lines) {
  return lines.map(l => {
    if (l === '') return c('', '#333');
    if (/(bash:|command not found|permission denied|no such file|cannot|error|denied)/i.test(l))
      return c(l, '#ff5555');
    if (/^\[Erreur/i.test(l)) return c(l, '#ffaa33');
    return c(l, '#9fd0e8');
  });
}

// Retourne { handled, lines } — toujours handled:true (le LLM répond à tout)
export async function handleADCommand(rawCmd, ctx = {}) {
  const cmd = (rawCmd || '').trim();
  const token = ctx.accessToken || null;
  const prompt = ctx.prompt || 'kali';

  // 1) Moteur VFS local : ls/cd/pwd/mkdir/rmdir/rm/touch/echo/whoami fonctionnent
  //    instantanément (0 appel API) dès qu'on est dans un shell de type Linux.
  if (LINUX_SHELLS.includes(prompt)) {
    const defaultVFS = AD_VFS[prompt] || AD_VFS.kali;
    const env = ctx.envState || defaultVFS;
    const local = runLocal(cmd, env);
    if (local) {
      return { handled: true, lines: colorize(local.output), envState: local.envState };
    }
  }

  // 2) Sinon, fallback LLM avec le contexte de la chaîne d'attaque AD.
  try {
    const resp = await fetch('/api/ad-sim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ cmd, levelN: ctx.levelN || 1, prompt: ctx.prompt || 'kali' }),
    });

    if (!resp.ok) {
      let msg;
      if (resp.status === 429) {
        const retry = resp.headers.get('retry-after');
        msg = retry
          ? `[Quota IA atteint] Réessaie dans ${retry}s.`
          : `[Quota IA atteint] Patiente ~1 minute.`;
      } else if (resp.status === 401) {
        msg = '[Erreur auth] Session expirée — recharge la page.';
      } else {
        msg = `[Erreur serveur ${resp.status}]`;
      }
      return { handled: true, lines: [c(msg, '#ffaa33')] };
    }

    const data = await resp.json();
    let rawLines = [];
    if (Array.isArray(data.output)) rawLines = data.output;
    else if (typeof data.output === 'string') rawLines = data.output.split('\n');

    return { handled: true, lines: colorize(rawLines) };
  } catch (err) {
    console.error('adSimulator fetch error:', err);
    return { handled: true, lines: [c('[Erreur réseau] Impossible de joindre le simulateur AD.', '#ff5555')] };
  }
}
