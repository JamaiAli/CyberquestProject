// ═══════════════════════════════════════════════════════════════════════════
//  Simulateur de Commandes Linux (API Groq)
// ═══════════════════════════════════════════════════════════════════════════

const c = (t, col = '#00aaff') => ({ t, c: col });

export const DEFAULT_VFS = {
  cwd: '/home/kali',
  fs: {
    '/': ['home', 'var', 'etc', 'bin', 'usr', 'tmp', 'root'],
    '/home': ['kali'],
    '/home/kali': ['Documents', 'Downloads', 'Pictures', 'config.php', 'flag.txt'],
    '/home/kali/Documents': [],
    '/home/kali/Downloads': [],
    '/home/kali/Pictures': [],
    '/var': ['www', 'log'],
    '/var/www': ['html'],
    '/var/www/html': ['index.php', 'config.php'],
    '/etc': ['passwd', 'shadow', 'ssh'],
    '/root': ['secret.txt'],
  },
};

// Colorie les lignes de sortie terminal : erreurs en rouge, lignes vides préservées, reste en blanc
function colorize(lines) {
  return lines.map(l => {
    if (l === '') return c('', '#333');
    if (/^(bash:|sh:|error:|cannot|permission denied|no such file|command not found)/i.test(l))
      return c(l, '#ff5555');
    if (/^\[Erreur/i.test(l)) return c(l, '#ff5555');
    return c(l, '#d8d8d8');
  });
}

// ── Moteur VFS local : exécute les commandes simples sans appeler l'IA ──────
// Évite de saturer le quota Groq (erreur 429) et répond instantanément.

function normalize(path) {
  const stack = [];
  for (const p of path.split('/')) {
    if (!p || p === '.') continue;
    if (p === '..') { stack.pop(); continue; }
    stack.push(p);
  }
  return '/' + stack.join('/');
}

function resolvePath(cwd, target) {
  if (!target || target === '~') return '/home/kali';
  let t = target;
  if (t.startsWith('~/')) t = '/home/kali/' + t.slice(2);
  const base = t.startsWith('/') ? t : cwd + '/' + t;
  return normalize(base) || '/';
}

const isDir = (fs, p) => Object.prototype.hasOwnProperty.call(fs, p);

function parentAndName(path) {
  const norm = normalize(path);
  const idx = norm.lastIndexOf('/');
  return { parent: idx <= 0 ? '/' : norm.slice(0, idx), name: norm.slice(idx + 1) };
}

function entryExists(fs, path) {
  if (isDir(fs, path)) return true;
  const { parent, name } = parentAndName(path);
  return isDir(fs, parent) && fs[parent].includes(name);
}

// Retourne { output, envState } si géré localement, sinon null (→ fallback IA)
export function runLocal(cmd, env) {
  // Toute commande avec pipe, redirection, variable ou chaînage → IA
  if (/[|><;&`$]/.test(cmd)) return null;

  const parts = cmd.split(/\s+/);
  const base = parts[0];
  const args = parts.slice(1);
  const opts = args.filter(a => a.startsWith('-')).join('');
  const ops  = args.filter(a => !a.startsWith('-'));
  const fs = env.fs, cwd = env.cwd;

  switch (base) {
    case 'pwd':    return { output: [cwd], envState: env };
    case 'whoami': return { output: ['kali'], envState: env };
    case 'echo':   return { output: [args.join(' ').replace(/^["']|["']$/g, '')], envState: env };

    case 'cd': {
      const dest = resolvePath(cwd, ops[0]);
      if (isDir(fs, dest)) return { output: [], envState: { ...env, cwd: dest } };
      if (entryExists(fs, dest)) return { output: [`bash: cd: ${ops[0]}: Not a directory`], envState: env };
      return { output: [`bash: cd: ${ops[0] || ''}: No such file or directory`], envState: env };
    }

    case 'ls': {
      const target = ops[0] ? resolvePath(cwd, ops[0]) : cwd;
      if (!isDir(fs, target)) {
        if (entryExists(fs, target)) return { output: [parentAndName(target).name], envState: env };
        return { output: [`ls: cannot access '${ops[0]}': No such file or directory`], envState: env };
      }
      const showHidden = opts.includes('a');
      const longFmt = opts.includes('l');
      let entries = [...fs[target]].filter(e => showHidden || !e.startsWith('.'));
      if (showHidden) entries = ['.', '..', ...entries];
      entries.sort();
      if (!longFmt) return { output: entries.length ? [entries.join('  ')] : [], envState: env };
      const lines = [`total ${entries.length * 4}`];
      for (const e of entries) {
        const full = (e === '.' || e === '..') ? target : resolvePath(target, e);
        const dir = e === '.' || e === '..' || isDir(fs, full);
        lines.push(`${dir ? 'drwxr-xr-x' : '-rw-r--r--'} ${dir ? 2 : 1} kali kali ${String(dir ? 4096 : 220).padStart(5)} Jan  1 12:00 ${e}`);
      }
      return { output: lines, envState: env };
    }

    case 'mkdir': {
      if (!ops.length) return { output: ['mkdir: missing operand'], envState: env };
      const next = { ...env, fs: { ...fs } };
      const recursive = opts.includes('p');
      for (const op of ops) {
        const dest = resolvePath(cwd, op);
        if (recursive) {
          let cur = '';
          for (const s of dest.split('/').filter(Boolean)) {
            const parent = cur || '/';
            cur += '/' + s;
            if (!isDir(next.fs, cur)) {
              next.fs[parent] = [...(next.fs[parent] || []), s];
              next.fs[cur] = [];
            }
          }
        } else {
          const { parent, name } = parentAndName(dest);
          if (!isDir(next.fs, parent)) return { output: [`mkdir: cannot create directory '${op}': No such file or directory`], envState: env };
          if (entryExists(next.fs, dest)) return { output: [`mkdir: cannot create directory '${op}': File exists`], envState: env };
          next.fs[parent] = [...next.fs[parent], name];
          next.fs[dest] = [];
        }
      }
      return { output: [], envState: next };
    }

    case 'touch': {
      if (!ops.length) return { output: ['touch: missing file operand'], envState: env };
      const next = { ...env, fs: { ...fs } };
      for (const op of ops) {
        const dest = resolvePath(cwd, op);
        const { parent, name } = parentAndName(dest);
        if (!isDir(next.fs, parent)) return { output: [`touch: cannot touch '${op}': No such file or directory`], envState: env };
        if (!entryExists(next.fs, dest)) next.fs[parent] = [...next.fs[parent], name];
      }
      return { output: [], envState: next };
    }

    case 'rmdir': {
      if (!ops.length) return { output: ['rmdir: missing operand'], envState: env };
      const next = { ...env, fs: { ...fs } };
      for (const op of ops) {
        const dest = resolvePath(cwd, op);
        if (!isDir(next.fs, dest)) return { output: [`rmdir: failed to remove '${op}': No such file or directory`], envState: env };
        if (next.fs[dest].length) return { output: [`rmdir: failed to remove '${op}': Directory not empty`], envState: env };
        const { parent, name } = parentAndName(dest);
        delete next.fs[dest];
        next.fs[parent] = next.fs[parent].filter(e => e !== name);
      }
      return { output: [], envState: next };
    }

    case 'rm': {
      if (!ops.length) return { output: ['rm: missing operand'], envState: env };
      const recursive = opts.includes('r') || opts.includes('R');
      const force = opts.includes('f');
      const next = { ...env, fs: { ...fs } };
      for (const op of ops) {
        const dest = resolvePath(cwd, op);
        if (isDir(next.fs, dest)) {
          if (!recursive) return { output: [`rm: cannot remove '${op}': Is a directory`], envState: env };
          for (const key of Object.keys(next.fs)) {
            if (key === dest || key.startsWith(dest + '/')) delete next.fs[key];
          }
          const { parent, name } = parentAndName(dest);
          if (next.fs[parent]) next.fs[parent] = next.fs[parent].filter(e => e !== name);
        } else if (entryExists(next.fs, dest)) {
          const { parent, name } = parentAndName(dest);
          next.fs[parent] = next.fs[parent].filter(e => e !== name);
        } else if (!force) {
          return { output: [`rm: cannot remove '${op}': No such file or directory`], envState: env };
        }
      }
      return { output: [], envState: next };
    }
  }
  return null;
}

export async function handleLinuxCommand(rawCmd, ctx = {}, getAccessToken) {
  const cmd = rawCmd.trim();
  const env = ctx.envState || { ...DEFAULT_VFS };

  if (cmd === 'clear') return { handled: true, lines: [], envState: env, clear: true };

  // --help géré localement pour économiser un appel API
  if (cmd.endsWith('--help') && cmd.split(/\s+/).length === 2) {
    const base = cmd.split(/\s+/)[0];
    return {
      handled: true,
      lines: colorize([`${base}: consulte 'man ${base}' pour la documentation complète.`, `Usage: ${base} [OPTIONS] [ARGS]`]),
      envState: env,
    };
  }

  // Moteur local d'abord : navigation/fichiers sans appel IA (évite le quota Groq)
  const local = runLocal(cmd, env);
  if (local) {
    return { handled: true, lines: colorize(local.output), envState: local.envState };
  }

  try {
    const token = typeof getAccessToken === 'function' ? getAccessToken() : null;
    const resp = await fetch('/api/linux-sim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ cmd, envState: env, levelN: ctx.levelN || 1 }),
    });

    if (!resp.ok) {
      let msg;
      if (resp.status === 429) {
        const retry = resp.headers.get('retry-after');
        msg = retry
          ? `[Quota IA atteint] Trop de commandes complexes d'affilée. Réessaie dans ${retry}s. (Les commandes simples comme ls/cd/mkdir restent dispo.)`
          : `[Quota IA atteint] Patiente ~1 minute. (Les commandes simples comme ls/cd/mkdir restent dispo.)`;
      } else if (resp.status === 401) {
        msg = '[Erreur auth] Session expirée — recharge la page.';
      } else {
        msg = `[Erreur serveur ${resp.status}]`;
      }
      return { handled: true, lines: [c(msg, '#ffaa33')], envState: env };
    }

    const data = await resp.json();

    // output peut être [] (commandes silencieuses comme cd, mkdir) — c'est valide
    let rawLines = [];
    if (Array.isArray(data.output)) rawLines = data.output;
    else if (typeof data.output === 'string') rawLines = data.output.split('\n');

    return {
      handled: true,
      lines: colorize(rawLines),
      envState: data.envState || env,
    };

  } catch (err) {
    console.error('linuxSimulator fetch error:', err);
    return {
      handled: true,
      lines: [c('[Erreur réseau] Impossible de joindre le simulateur.', '#ff5555')],
      envState: env,
    };
  }
}
