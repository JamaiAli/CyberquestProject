// ═══════════════════════════════════════════════════════════════════════════
//  Simulateur de terminal — Pentest Active Directory (fallback LLM).
//
//  La chaîne d'attaque principale est SCRIPTÉE (adLevels.js, déterministe, valide
//  les objectifs). Ce simulateur ne gère QUE les commandes hors-script : il donne
//  une sortie réaliste cohérente avec le scénario AD et le shell courant.
//  Propulsé par le client LLM (Gemini principal / Groq secours).
// ═══════════════════════════════════════════════════════════════════════════

const { chat, anyKeyConfigured } = require('./client');

// Contexte de la chaîne d'attaque, partagé dans le system prompt
const ATTACK_CHAIN = `SCÉNARIO — Pentest Active Directory du domaine corp.local.
Tu es le terminal d'un environnement de pentest réaliste. L'attaquant opère depuis une machine Kali (10.0.0.1).

RÉSEAU CIBLE (192.168.1.0/24) :
- 192.168.1.10  = "Active Directory" / point d'entrée. Windows-like, expose Apache 2.4.49 (vulnérable CVE-2021-41773 Path Traversal + RCE via mod_cgi). Signature DC : ports 88 (Kerberos), 389 (LDAP), 445 (SMB), 3268 (Global Catalog), 5985 (WinRM). FQDN dc.corp.local. SMB Signing REQUIRED.
- 192.168.1.20  = Mail/Web server (Postfix, SSH).
- 192.168.1.30  = DB Server (MySQL 5.7, privilège FILE actif). Identifiants : db_user / Str0ngP@ss.
- 192.168.1.100 = Domain Controller (Windows Server 2019).

CHAÎNE D'ATTAQUE (les 6 étapes) :
1. Recon réseau : nmap 192.168.1.0/24 → nmap -sV 192.168.1.10 → nmap -sC -sV -p- 192.168.1.10 (signature DC).
2. Énumération AD : dnsrecon -d corp.local, nikto -h 192.168.1.10 (confirme CVE-2021-41773).
3. Accès initial : exploit CVE-2021-41773 (Path Traversal /cgi-bin/.%2e/) → reverse shell www-data.
4. Post-exploit / PrivEsc : sudo -l montre (root) NOPASSWD: /usr/bin/python3 → sudo python3 -c 'import os; os.system("/bin/bash")' → root. Loot : /var/www/html/config.php (db_user:Str0ngP@ss).
5. Pivot DB : mysql -h 192.168.1.30 -u db_user -pStr0ngP@ss → dump table credentials → hash NTLM Administrator (aad3b435b51404eeaad3b435b51404ee:5f4dcc3b5aa765d61d8327deb882cf99).
6. Domain Controller : evil-winrm -i 192.168.1.100 -u Administrator -H <hash> (Pass-the-Hash) → secretsdump → NTDS.dit (krbtgt → Golden Ticket).

COMPTES / SECRETS connus du scénario : Administrator (NTLM ci-dessus), db_user:Str0ngP@ss, svc_backup, svc_sql, krbtgt.`;

// Détermine le contexte du shell courant selon le prompt
function shellContext(prompt) {
  switch (prompt) {
    case 'shell': return `SHELL ACTUEL : reverse shell www-data sur l'hôte compromis (192.168.1.10), Ubuntu 20.04 / Apache 2.4.49. uid=33(www-data). Tu réponds comme un bash Linux. L'utilisateur n'est PAS root.`;
    case 'root':  return `SHELL ACTUEL : shell root sur 192.168.1.10 (Ubuntu). uid=0(root). Tu réponds comme un bash Linux root. /root et /etc/shadow sont accessibles.`;
    case 'mysql': return `SHELL ACTUEL : moniteur MySQL sur le DB Server (192.168.1.30), connecté en db_user. Tu réponds comme un client mysql> (requêtes SQL). Bases : corp_db (tables: employees, users, credentials, secrets), information_schema.`;
    case 'winrm': return `SHELL ACTUEL : session Evil-WinRM (PowerShell) sur le Domain Controller (192.168.1.100), en tant que CORP\\Administrator (Domain Admins). Tu réponds comme un PowerShell Windows.`;
    default:      return `SHELL ACTUEL : machine d'attaque Kali Linux (10.0.0.1), répertoire ~/pentest. Tu réponds comme un bash Kali. Les outils de pentest (nmap, hydra, impacket, evil-winrm, crackmapexec, etc.) sont installés.`;
  }
}

async function runADSim(cmd, levelN = 1, prompt = 'kali') {
  if (!anyKeyConfigured()) {
    return { output: ["[Erreur] Aucune clé API LLM n'est définie sur le serveur."] };
  }

  const systemPrompt = `Tu es un simulateur de terminal hyper-réaliste pour un jeu de formation en cybersécurité (pentest Active Directory).

${ATTACK_CHAIN}

${shellContext(prompt)}

ÉTAPE EN COURS : niveau ${levelN}/6 de la chaîne d'attaque.

RÈGLES DE RÉPONSE :
- Réponds UNIQUEMENT par la sortie brute du terminal, exactement comme une vraie machine l'afficherait — une ligne par ligne.
- AUCUNE explication, AUCUN commentaire pédagogique, AUCUN markdown, AUCune balise de code. Juste la sortie du terminal.
- Reste cohérent avec le scénario ci-dessus (mêmes IP, hôtes, identifiants, hashes).
- Reste cohérent avec le SHELL ACTUEL (bash Kali, bash Linux compromis, mysql>, ou PowerShell selon le cas).
- Pour une commande inconnue : renvoie l'erreur standard (ex: "bash: foobar: command not found").
- Pour une erreur de permission (ex: cat /etc/shadow en www-data non-root) : renvoie l'erreur réelle "Permission denied".
- Reste bref et plausible (quelques lignes), comme une vraie sortie. Pas de pavés interminables.
- Ne révèle JAMAIS spontanément un flag ou un secret final ; contente-toi de simuler la commande tapée.
- Si la commande n'affiche rien (ex: cd, export), ne renvoie rien.`;

  const result = await chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: String(cmd || '').slice(0, 500) },
    ],
    temperature: 0.2,
    maxTokens: 900,
    fallbackOnEmpty: true,  // Gemini filtre /etc/passwd & co → bascule Groq
  });

  if (!result.ok) {
    return {
      output: [`[Erreur API LLM ${result.status || ''}]`],
      _status: result.status || 503,
      _retryAfter: result.retryAfter,
    };
  }

  // Sortie en texte brut : on nettoie d'éventuelles fences markdown et on découpe en lignes
  const reply = (result.content || '')
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return { output: reply ? reply.split('\n') : [] };
}

module.exports = { runADSim };
