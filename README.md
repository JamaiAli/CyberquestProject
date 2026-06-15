# CyberQuest — Standalone Edition (PoC)

Bienvenue dans la branche **Proof of Concept (PoC)** de CyberQuest ! 
Cette branche contient une version spéciale du jeu, conçue pour être **100% autonome et exécutable directement depuis le navigateur**, sans aucun besoin de lancer un serveur Backend ou une base de données. 

---

## 🎯 Concept et Objectif du PoC

L'objectif de ce PoC est de prouver la faisabilité technique du jeu et de ses mécaniques interactives complexes (Terminal, Gameplay RPG, Progression) de manière purement front-end. 

Pour cela, le fonctionnement original Client/Serveur a été court-circuité : toute la logique métier et la sauvegarde de l'état ont été encapsulées directement dans l'application web React.

---

## 🏗️ Architecture et Modifications par rapport à la version `master`

### 1. Disparition du Serveur Node.js
Dans la version originale (`master`), le jeu dépendait d'un backend Node.js (serveur Express) pour :
- Traiter et valider les commandes du joueur (le "moteur" du jeu).
- Maintenir l'état de la partie (XP, HP, machines compromises).
- Stocker les classements des joueurs.

Dans ce PoC, le code du moteur de jeu (`backend/engine`) a été **transféré intégralement dans le dossier `frontend/src/engine/`** et converti en modules JavaScript modernes (ES Modules).

### 2. Le Bypass des Appels Réseau (Fetch)
Dans l'interface, toutes les requêtes HTTP asynchrones vers l'API (par exemple `fetch('/api/command')`) ont été supprimées et remplacées par des appels locaux et synchrones au nouveau moteur embarqué :
```javascript
// Avant (Version Master avec Backend) :
const res = await fetch('/api/command', { body: JSON.stringify({ command, sessionId }) });

// Maintenant (Version PoC Standalone) :
const state = engineGetGameState(sessionId);
const res = processCommand(command, state); // Calcul local immédiat !
const savedState = engineUpdateGameState(sessionId, res.newState);
```

### 3. Persistance des Données via `LocalStorage`
Afin de ne pas perdre la progression du joueur s'il actualise la page (et simuler une base de données), le stockage en mémoire vive du serveur Node.js a été remplacé par l'utilisation de l'API web `localStorage`.
- **Clé `cyberquest_sessions`** : Sauvegarde en temps réel de l'avancement, des points de vie, de l'XP et des machines débloquées par l'utilisateur.
- **Clé `cyberquest_named_scores`** : Remplace la base de données de "High Scores" afin que le composant *Scoreboard* (Hall of Fame) puisse fonctionner de façon persistante sans serveur central.

---

## 🎮 Fonctionnement du Jeu

CyberQuest est un "Hacker RPG" simulant un test d'intrusion. L'utilisateur (le hacker) doit s'introduire dans le réseau fictif de *NEXUS CORP* :

1. **Terminal Interactif** : Le joueur tape des commandes inspirées de véritables outils de cybersécurité (Nmap, SQLmap, Nikto, Dirb) dans le composant Terminal central.
2. **Mécanique de Phases** : Chaque machine à pirater possède 4 phases scénarisées à valider séquentiellement :
   - *Reconnaissance* (ex: `recon`, `whois`)
   - *Scanning* (ex: `nmap`, `nikto`)
   - *Exploitation* (ex: `sqlmap`, `hydra`)
   - *Post-Exploitation / PrivEsc* (ex: `sudo -l`, `cat /flag.txt`)
3. **Progression** : En réussissant les actions, le joueur gagne de l'expérience (XP), monte de niveau, augmente ses points de vie (HP) et débloque l'accès à de nouvelles cibles plus profondes dans le réseau (ex: sauter du *Web Server* vers le *Domain Controller* interne en utilisant les credentials trouvés).
4. **Pédagogie** : À chaque commande valide, le jeu affiche un "Panneau Pédagogique" qui explique le concept cybernétique réel à l'utilisateur (ex: ce qu'est une attaque Path Traversal, l'utilité du kerberoasting, etc.).

---

## 🚀 Comment lancer le projet ?

Puisque le jeu est 100% autonome, l'installation est triviale et immédiate :

```bash
# 1. Se placer dans le répertoire frontend
cd frontend

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement local (Vite)
npm run dev
```

Ouvrez ensuite simplement votre navigateur sur l'adresse indiquée dans le terminal (généralement `http://localhost:5173`).

*Note : Le dossier `backend` originel a été laissé dans le dépôt à titre purement comparatif, mais il n'est absolument pas utilisé ou nécessaire pour l'exécution.*