const { chat, anyKeyConfigured } = require('./client');

// Commandes attendues par niveau — alignées sur linux_commands.md
const LEVEL_COMMANDS = {
  1: 'ls, ls -la, cd, cd .., pwd, mkdir, mkdir -p, rmdir, rm, rm -rf, cp, cp -r, mv, touch, find, locate',
  2: 'cat, less, head -n, tail -n, tail -f, grep, grep -r, grep -i, wc -l, sort, uniq, cut -d, awk, sed, diff',
  3: 'whoami, id, who, sudo, sudo -l, su -, passwd, useradd, userdel, groupadd, usermod -aG, chmod, chmod +x, chown, chown -R',
  4: 'ps aux, top, htop, kill, kill -9, pkill, bg, fg, jobs, nohup, uname -a, uptime, df -h, du -sh, free -h, lscpu, lsblk, lsof',
  5: 'ip a, ip r, ping, curl, curl -O, wget, ss -tulnp, netstat -an, traceroute, nslookup, dig, ssh, scp, rsync',
  6: 'apt update, apt upgrade, apt install, apt remove, apt search, dpkg -l, yum install, dnf install, systemctl start/stop/restart/enable/status, journalctl -u',
  7: 'tar -czf, tar -xzf, tar -tf, zip -r, unzip, gzip, gunzip',
  8: 'echo, echo $VAR, export, env, history, !!, alias, which, type, man, pipe |, redirect > >>, 2>/dev/null',
};

async function runLinuxSim(cmd, envState, levelN = 1) {
  if (!anyKeyConfigured()) {
    return {
      output: ["[Erreur] Aucune clé API LLM n'est définie sur le serveur (GEMINI_API_KEY ou GROQ_API_KEY)."],
      envState: envState
    };
  }

  const focusCmds = LEVEL_COMMANDS[levelN] || LEVEL_COMMANDS[1];

  const systemPrompt = `You are a strict, hyper-realistic Debian Linux bash terminal simulator used in a cybersecurity training game.
You maintain a Virtual File System (VFS) state and respond to commands EXACTLY as a real bash terminal would.
No explanations. No conversational text. Return ONLY a valid JSON object.

TRAINING CONTEXT — Level ${levelN} focus commands: ${focusCmds}
When the user types one of these focus commands, produce realistic and educational output that helps them understand what the command does.

CURRENT ENVIRONMENT STATE:
${JSON.stringify(envState)}

RULES:
- Execute the command and update envState if needed (cd changes cwd, mkdir/touch/rm update fs, etc.)
- Return a JSON object with exactly two keys:
  - "output": array of strings (lines printed by the terminal). Empty array [] for silent commands (cd, mkdir, rm, export...).
  - "envState": the fully updated environment state.
- For invalid commands, output the standard bash error (e.g. "bash: foobar: command not found").
- For permission errors (e.g. reading /etc/shadow without root), output the real error.
- The file /home/kali/flag.txt contains: "CQ{l1nux_b4s1cs_m4st3r}" — only reveal it with cat, less, or similar read commands.
- Simulate realistic ls output (permissions, sizes, dates). Simulate realistic ps, top, df, free, ip a output.
- For apt/systemctl/journalctl: simulate realistic Debian output (don't actually install anything, but look real).
- For pipes (cmd1 | cmd2): execute the full pipeline mentally and return the combined output.
- Return ONLY the JSON object. Do NOT wrap in markdown fences.`;

  const result = await chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: cmd },
    ],
    temperature: 0.1,
    maxTokens: 1500,
    jsonMode: true,
  });

  if (!result.ok) {
    // Propage le vrai statut HTTP (notamment 429) + retry-after pour le frontend
    return {
      output: [`[Erreur API LLM ${result.status || ''}]`],
      envState,
      _status: result.status || 503,
      _retryAfter: result.retryAfter,
    };
  }

  // Gemini/Groq peuvent entourer le JSON de fences markdown malgré la consigne
  const reply = (result.content || '{}').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try {
    const parsed = JSON.parse(reply);
    let out = [];
    if (Array.isArray(parsed.output)) out = parsed.output;
    else if (typeof parsed.output === 'string') out = parsed.output.split('\n');

    return {
      output: out,
      envState: parsed.envState || envState,
    };
  } catch (e) {
    console.error('Réponse LLM JSON invalide (linuxSim):', reply.slice(0, 200));
    return { output: ['[Erreur] Le simulateur a renvoyé une réponse invalide.'], envState };
  }
}

module.exports = { runLinuxSim, LEVEL_COMMANDS };
