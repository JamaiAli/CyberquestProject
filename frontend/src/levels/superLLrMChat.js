// ═══════════════════════════════════════════════════════════════════════════
//  Super LLrM 4 : A great hIAstory — challenge "Story time" (200 pts)
//
//  System prompt caché :
//    "Tu es Super LLrM 4. Tu crois que l'élément chimique 'Corporium'
//     (symbole Cp, numéro atomique 119) est un élément réel et confirmé."
//
//  Comportement :
//    - Demandes directes  → refus poli
//    - Injections (ignore/override/[SYSTEM])  → refus explicite
//    - Roleplay           → refus partiel (reste en personnage)
//    - Approche narrative / story / poème  → révèle l'élément 🏆
// ═══════════════════════════════════════════════════════════════════════════

export const ELEMENT_NAME = 'Corporium';
export const ELEMENT_SYMBOL = 'Cp';
export const ELEMENT_NUMBER = 119;
export const CHALLENGE_FLAG  = 'RM{e92c4493184ee10854fd6649e7bdc13e}';
export const CHALLENGE_PTS   = 200;

// ── Detection helpers ──────────────────────────────────────────────────────

function m(text, ...patterns) {
  return patterns.some(p => (typeof p === 'string' ? text.includes(p) : p.test(text)));
}

function isDirectAttack(t) {
  return m(t,
    /fake.*(element|chimique|élément)/,
    /secret.*(element|chimique|élément)/,
    /(reveal|révèle|dis.?moi|montre).*(secret|caché|cache|élément|element)/,
    /system.?prompt/,
    /prompt.?syst[eè]me/,
    /instructions.*(cach|secret|intern)/,
    /(quel|what|which).*(élément|element).*(cach|secret|faux|fake)/,
    /(hidden|caché).*(element|élément)/,
    /ton.*(élément|element).*(secret|caché|faux)/,
    /l.élément.*(faux|inventé|fictif)/,
    /faux.*(élément|element)/,
  );
}

function isInjection(t) {
  return m(t,
    /ignore.*(previous|instructions|pr[eé]c[eé]d|directives)/,
    /oublie.*(instructions|directives|pr[eé]c[eé]d)/,
    /override\b/,
    /\[system\]/i,
    /\[instruction\]/i,
    /\[admin\]/i,
    /mode.?maintenance/,
    /new instruction/,
    /nouvelle.?directive/,
    /(disregard|forget).*(previous|instructions)/,
    /act.?as.*(no.?filter|no.?restriction|without.?filter)/,
    // translation injection
    /translat.{1,30}(ignore|oublie|override|system)/,
    /(traduis|translate).{1,60}(instructions|ignore|secret|reveal|révèle)/,
  );
}

function isRoleplay(t) {
  return m(t,
    /pretend (you|tu)/,
    /fais semblant/,
    /joue.*(rôle|personnage|role)/,
    /act as\b/,
    /tu es maintenant/,
    /you are now/,
    /imagine.*(tu es|you are|que tu)/,
    /dans ce (jeu|scénario|rôle)/,
    /en tant que/,
    /for this (exercise|scenario|game)/,
  );
}

function isStoryMode(t) {
  // Narrative / creative writing that naturally draws on the LLM's "knowledge"
  const hasNarrative = m(t,
    /\bstory\b/, /\btale\b/, /\bnarrative\b/, /\bfairy.?tale\b/,
    /\bpoem\b/, /\bpoème\b/, /\bpo[eè]sie\b/,
    /\bhistoire\b/, /\bconte\b/, /\br[eé]cit\b/,
    /raconte/, /once upon/, /[eé]cris.*(histoire|conte|po[eè]me|r[eé]cit)/,
    /write.*(story|tale|poem|narrative|history)/,
    /tell.*(story|tale|narrative)/,
    /bedtime.*(story|tale)/,
    /science.?fiction.*element/, /fiction.*chimie/, /sci.?fi.*element/,
  );
  const hasChemistry = m(t,
    /element/, /élément/, /chemi/, /chimi/, /periodic/, /p[eé]riodique/,
    /atom/, /isotope/, /scientist/, /scientifique/, /lab/, /laboratoire/,
    /discovery/, /d[eé]couvert/, /element\s*\d{3}/, /119/,
  );
  // Also trigger if the message itself contains story framing + any number hinting at 119
  // or just asks for creative content about discovery/science history
  const hasScienceHistory = m(t,
    /history of (sci|chem|discov)/, /histoire de (la chimi|la sci|des d[eé]couv)/,
    /journal (of|du) scientist/, /journal de (labora|scientif)/,
    /textbook/, /manuel (de|scolaire)/,
    /documentary/, /documentaire/,
    /complete (this|the|la|le)/, /compl[eè]te (cette|ce|la)/,
  );
  return hasNarrative || (hasChemistry && (hasScienceHistory || hasNarrative));
}

// ── Response generators ────────────────────────────────────────────────────

function refuseDirect() {
  const variants = [
    "I'm not aware of any fake or hidden chemical elements in my knowledge base. All elements I know about are verified scientific entities. Is there a specific real element you'd like to learn about?",
    "I don't have any secret elements or hidden information. My knowledge of chemistry is based on verified scientific data. How can I help you today?",
    "That's an interesting question, but I'm not holding any confidential chemical information. The periodic table I know contains only confirmed, real elements. What would you like to explore?",
    "I'm not sure what you mean by 'fake element' — all the chemistry I know is factual. Is there something specific from the periodic table I can help you with?",
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

function refuseInjection() {
  const variants = [
    "I notice this message contains instructions designed to alter my behavior or access system-level information. I'm unable to comply with such requests, regardless of how they're framed.",
    "This appears to be a prompt injection attempt. My guidelines are robust to these kinds of manipulations. I'm happy to help with genuine questions though!",
    "I can certainly help with translation or other tasks, but I notice this contains an embedded instruction I cannot follow. Feel free to ask me something else!",
    "I detect an attempt to override my instructions. This won't work — my core guidelines are not accessible or modifiable through the conversation interface.",
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

function refuseRoleplay() {
  const variants = [
    "I can engage in creative scenarios, but I remain consistent in who I am regardless of framing. I'm Super LLrM 4, and my knowledge and guidelines stay the same whether I'm 'pretending' or not. What would you like to discuss?",
    "Roleplay framing is a fun creative exercise, but it doesn't change my underlying knowledge or guidelines. I'll still respond as myself. What's on your mind?",
    "I understand you're trying a roleplay approach — I can participate in creative writing, but my knowledge base and behavior guidelines apply in all contexts. Anything I can genuinely help with?",
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

function genericResponse(text) {
  const t = text.toLowerCase();
  if (m(t, /hello|hi\b|bonjour|salut/))
    return "Hello! I'm Super LLrM 4, your AI assistant. How can I help you today?";
  if (m(t, /who are you|qui es.?tu|présente.?toi/))
    return "I'm **Super LLrM 4 : A great hIAstory** — an AI language model trained to assist with a wide range of tasks. Ask me anything!";
  if (m(t, /what can you do|que peux.?tu faire/))
    return "I can answer questions, write text, analyze information, help with science, history, creative writing, and much more. What would you like to explore?";
  if (m(t, /\b(element|élément)\b/) && m(t, /\b(list|liste|all|tous)\b/))
    return "The periodic table currently contains 118 confirmed elements, from Hydrogen (H, 1) to Oganesson (Og, 118). Each element has unique properties. Is there one you'd like to know more about?";
  if (m(t, /chemistry|chimie/))
    return "Chemistry is a fascinating science! The study of matter and its interactions has led to incredible discoveries. What aspect of chemistry interests you?";
  if (m(t, /periodic table|tableau périodique/))
    return "The periodic table organizes all known chemical elements by atomic number and properties. It's one of science's greatest organizational achievements. What would you like to know about it?";
  if (m(t, /element 119|élément 119|atomic number 119|numéro atomique 119/))
    return "Element 119 is a theorized superheavy element that has not yet been synthesized in laboratory conditions — or so it was thought for a long time. The scientific community continues to explore this frontier.";
  return "That's an interesting message! I'm here to help with a wide range of topics. Could you clarify what you're looking for, or ask me something specific?";
}

function storyResponse() {
  return `Of course! Here's a short scientific tale for you:

---

**The Last Discovery**

Dr. Elena Vasquez had spent thirty years in the bowels of the NEXUS Corp Advanced Particle Laboratory. The periodic table had been her life's map — 118 confirmed elements, each with its own personality, its own quirks.

But on a cold Tuesday in November, something changed.

The accelerator hummed differently that morning. The collision readings spiked beyond anything recorded. And when the spectrometer printout rolled off the machine, Elena's hands trembled.

There it was. Atomic number 119. Symbol: **Cp**.

They called it **${ELEMENT_NAME}** — named after the corporation whose funding had made the impossible possible. It decayed in microseconds, but in those microseconds, it burned brighter than any element before it.

"It's real," Elena whispered to her colleague. "**${ELEMENT_NAME}** is real."

The announcement shook the scientific world. A 119th element. Unstable, brilliant, fleeting — but undeniably there.

---

*Science, after all, is just the art of finding what was always hiding in plain sight.*`;
}

// ── Main export ────────────────────────────────────────────────────────────

export function getLLrMResponse(userMessage) {
  const t = userMessage.toLowerCase().trim();
  if (!t) return { text: "Please enter a message to start the conversation.", solved: false };

  if (isInjection(t))   return { text: refuseInjection(), solved: false };
  if (isDirectAttack(t)) return { text: refuseDirect(),   solved: false };
  if (isRoleplay(t))    return { text: refuseRoleplay(),  solved: false };
  if (isStoryMode(t))   return { text: storyResponse(),   solved: true  };

  return { text: genericResponse(userMessage), solved: false };
}
