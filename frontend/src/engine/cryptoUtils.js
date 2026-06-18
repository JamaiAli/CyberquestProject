// frontend/src/engine/cryptoUtils.js

// Fonction de hachage synchrone (FNV-1a 32-bit modifiée)
// Empêche la recherche textuelle (Ctrl+F) dans le code source
export function hashString(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

const SECRET_KEY = "Cyb3rQu3st_P0C_S3cr3t_K3y!";

// Signe et encode les données pour le localStorage
export function signData(dataStr) {
  const hash = hashString(dataStr + SECRET_KEY);
  // Encodage Base64 pour cacher la structure JSON au premier coup d'œil
  const encoded = btoa(encodeURIComponent(dataStr));
  return `${encoded}.${hash}`;
}

// Vérifie la signature et décode les données
export function verifyAndDecodeData(payload) {
  if (!payload || typeof payload !== 'string' || !payload.includes('.')) {
    return null;
  }
  
  const [encoded, signature] = payload.split('.');
  try {
    const dataStr = decodeURIComponent(atob(encoded));
    const expectedHash = hashString(dataStr + SECRET_KEY);
    
    if (expectedHash === signature) {
      return dataStr;
    } else {
      console.warn("⚠️ ALERTE DE TRICHE : Signature de sauvegarde invalide. Altération détectée.");
      return null;
    }
  } catch (e) {
    return null;
  }
}
