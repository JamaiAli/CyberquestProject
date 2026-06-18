// ═══════════════════════════════════════════════════════════════════════════
//  Client LLM unifié — Gemini (principal, jusqu'à 4 clés en rotation)
//  avec basculement auto vers Groq quand toutes les clés Gemini sont épuisées.
//
//  Config via backend/.env :
//    LLM_PROVIDER=gemini          (principal ; "groq" pour inverser)
//    GEMINI_API_KEY=...            clé 1
//    GEMINI_API_KEY_2=...          clé 2 (optionnel)
//    GEMINI_API_KEY_3=...          clé 3 (optionnel)
//    GEMINI_API_KEY_4=...          clé 4 (optionnel)
//    GEMINI_MODEL=gemini-2.5-flash
//    GROQ_API_KEY=gsk_...
//    GROQ_MODEL=llama-3.3-70b-versatile
// ═══════════════════════════════════════════════════════════════════════════

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';

// Retourne toutes les clés Gemini valides définies dans l'env
function geminiKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
  ].filter(k => k && k.length > 10);
}

function groqKey() {
  const k = process.env.GROQ_API_KEY;
  return k && k !== 'gsk_REMPLACE_MOI' ? k : null;
}

function geminiModel() { return process.env.GEMINI_MODEL || 'gemini-2.5-flash'; }
function groqModel()   { return process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile'; }

const PRIMARY  = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
const FALLBACK = PRIMARY === 'gemini' ? 'groq' : 'gemini';

// Appel d'une URL + clé précise. Retourne { ok, content } ou { ok:false, status, ... }
async function callOnce(url, key, model, { messages, temperature, maxTokens, jsonMode }) {
  const body = {
    model,
    messages,
    temperature: temperature ?? 0.6,
    max_tokens:  maxTokens  ?? 800,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[LLM] fetch error:', err.message);
    return { ok: false, status: 0, error: 'NETWORK' };
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    console.error(`[LLM] API error ${resp.status}:`, txt.slice(0, 200));
    return { ok: false, status: resp.status, retryAfter: resp.headers.get('retry-after'), error: txt.slice(0, 200) };
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content?.trim() || '';
  return { ok: true, content };
}

// Tente toutes les clés Gemini en ordre ; s'arrête à la première qui répond OK.
// Retourne { ok, content, keyIndex } ou { ok:false, status, ... } si toutes échouent.
async function callGemini(opts) {
  const keys = geminiKeys();
  if (!keys.length) return { ok: false, status: 0, error: 'NO_GEMINI_KEY' };

  let lastErr = null;
  for (let i = 0; i < keys.length; i++) {
    const r = await callOnce(GEMINI_URL, keys[i], geminiModel(), opts);
    if (r.ok) {
      if (i > 0) console.log(`[Gemini] clé ${i + 1} utilisée (clés 1-${i} épuisées)`);
      return { ...r, provider: 'gemini', keyIndex: i };
    }
    lastErr = r;
    const shouldTryNext = r.status === 429 || r.status === 401 || r.status === 0 || r.status >= 500;
    if (!shouldTryNext) break; // erreur non-récupérable (ex: 400 bad request)
    if (i < keys.length - 1) {
      console.warn(`[Gemini] clé ${i + 1} a échoué (${r.status}) → essai clé ${i + 2}`);
    }
  }
  console.error(`[Gemini] toutes les clés épuisées (${keys.length} clés). Dernier statut: ${lastErr?.status}`);
  return { ...(lastErr || { ok: false }), provider: 'gemini' };
}

async function callGroq(opts) {
  const key = groqKey();
  if (!key) return { ok: false, status: 0, error: 'NO_GROQ_KEY' };
  const r = await callOnce(GROQ_URL, key, groqModel(), opts);
  return { ...r, provider: 'groq' };
}

// Point d'entrée principal.
// fallbackOnEmpty : si Gemini répond OK mais vide (filtre sécurité), bascule sur Groq.
async function chat(opts) {
  let r1;

  if (PRIMARY === 'gemini') {
    r1 = await callGemini(opts);
  } else {
    r1 = await callGroq(opts);
  }

  if (r1.ok) {
    const empty = !r1.content || r1.content.trim() === '';
    if (opts.fallbackOnEmpty && empty) {
      console.warn('[LLM] Gemini a renvoyé un contenu vide (filtre ?) → bascule Groq');
      const r2 = await callGroq(opts);
      if (r2.ok && r2.content && r2.content.trim() !== '') return r2;
    }
    return r1;
  }

  // Toutes les clés Gemini épuisées → bascule sur Groq
  const shouldFallback = r1.status === 0 || r1.status === 429 || r1.status === 401 || r1.status >= 500;
  if (shouldFallback && FALLBACK === 'groq') {
    console.warn('[LLM] Gemini épuisé → bascule Groq (secours final)');
    const r2 = await callGroq(opts);
    if (r2.ok) return r2;
    return { ok: false, status: r2.status || r1.status, retryAfter: r2.retryAfter || r1.retryAfter, error: r2.error, provider: null };
  }

  return { ok: false, status: r1.status, retryAfter: r1.retryAfter, error: r1.error, provider: null };
}

function anyKeyConfigured() {
  return geminiKeys().length > 0 || !!groqKey();
}

module.exports = { chat, anyKeyConfigured, PRIMARY, FALLBACK };
