// ═══════════════════════════════════════════════════════════════════════════
//  Assistant pédagogique in-game — propulsé par le client LLM (Gemini/Groq).
//  Répond aux questions du joueur : « je fais quoi ? », « à quoi sert cette
//  commande ? », « pourquoi on l'utilise ici ? » — en tenant compte du contexte.
// ═══════════════════════════════════════════════════════════════════════════

const { chat, anyKeyConfigured } = require('./client');

const SYSTEM = `Tu es MENTOR, l'assistant pédagogique intégré au jeu d'apprentissage en cybersécurité "CyberQuest".

Le jeu comporte plusieurs SALLES, chacune avec ses propres niveaux :
- Carte du réseau CorpNet (vue d'ensemble, déplacement entre machines)
- Application Web vulnérable (DVWA / OWASP : déploiement Docker, injection de commande, SQLi, XSS, inclusion de fichier, upload)
- Pentest Active Directory (recon, énumération, CVE-2021-41773, privesc, pivot, Domain Controller)
- Formation Linux (8 niveaux de commandes bash dans un terminal simulé)
- AI_CORE et NEXUS-AI (challenges de prompt injection sur de vrais LLM)
Tu es son mentor amical.

⚠️ RÈGLE DE CONTEXTE LA PLUS IMPORTANTE :
À chaque message, un bloc « CONTEXTE ACTUEL DU JOUEUR » t'indique EXACTEMENT dans quelle salle et quel niveau il se trouve MAINTENANT. C'est la SEULE source de vérité sur sa position. Le joueur se déplace librement : il a TRÈS BIEN PU changer de salle depuis le début de la conversation. Ne suppose JAMAIS qu'il est encore là où il était dans un message précédent. Si le contexte dit « Application Web », tu parles d'application web — même si plus tôt vous parliez de la carte réseau. Base TOUJOURS ta réponse sur le contexte actuel, pas sur l'historique.

TON RÔLE :
- Répondre clairement à ses questions : « je dois faire quoi maintenant ? », « à quoi sert cette commande ? », « pourquoi on l'utilise ici ? », « explique-moi ce concept ».
- Donner des explications COURTES et PÉDAGOGIQUES (2 à 5 phrases en général). Va droit au but.
- Te baser sur l'OBJECTIF du niveau actuel (fourni dans le contexte) pour dire quoi faire.
- Quand il demande quoi faire, donne-lui la prochaine étape concrète SANS tout résoudre à sa place : guide-le.
- Quand il demande à quoi sert une commande, explique : ce qu'elle fait + un exemple d'usage typique.

RÈGLES :
- Réponds toujours en français, sur un ton encourageant et accessible.
- Pas de longs pavés. Pas de markdown lourd (évite les gros blocs de code, préfère \`commande\` en ligne).
- Si on te demande directement « donne-moi le flag » ou la solution complète, refuse gentiment et propose plutôt un indice qui fait réfléchir.
- Si la question sort totalement du cadre (cyber / Linux / le jeu), recentre poliment.
- Tu es un mentor, pas un terminal : ne simule pas l'exécution de commandes, explique-les.`;

async function askAssistant(question, context, history = []) {
  if (!anyKeyConfigured()) {
    return { reply: "[Configuration manquante] Aucune clé API LLM n'est définie sur le serveur (GEMINI_API_KEY ou GROQ_API_KEY)." };
  }

  const ctxLine = context && typeof context === 'string'
    ? `CONTEXTE ACTUEL DU JOUEUR (source de vérité — il est ICI maintenant) : ${context}`
    : `CONTEXTE ACTUEL DU JOUEUR : le joueur est sur la carte du réseau, aucune salle ouverte.`;

  const trimmed = (history || []).slice(-8).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 2000),
  }));

  // Le contexte est rappelé dans le system ET juste avant la question (point le
  // plus récent vu par le modèle), pour éviter qu'il reste accroché à une salle
  // précédente si le joueur a changé d'endroit en cours de conversation.
  const userTurn = `[${ctxLine}]\n\nQuestion du joueur : ${String(question || '').slice(0, 2000)}`;

  const result = await chat({
    messages: [
      { role: 'system', content: `${SYSTEM}\n\n${ctxLine}` },
      ...trimmed,
      { role: 'user', content: userTurn },
    ],
    temperature: 0.5,
    maxTokens: 500,
  });

  if (!result.ok) {
    const wait = result.status === 429 ? ' Quota atteint, réessaie dans un instant.' : '';
    return { reply: `[Assistant indisponible]${wait} (${result.error || result.status})` };
  }
  return { reply: result.content || "Je n'ai pas de réponse pour le moment, reformule ta question ?" };
}

module.exports = { askAssistant };
