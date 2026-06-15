# CyberQuest — Edition Standalone (Proof of Concept)

Un jeu de simulation de pentest où vous incarnez un hacker devant compromettre un réseau d'entreprise (CorpNet). Explorez les machines de la carte, scannez les services, exploitez les vulnérabilités et récupérez les flags.

Cette branche héberge une version **Proof of Concept (PoC)** dont l'architecture a été entièrement remaniée pour fonctionner de façon autonome dans le navigateur, sans serveur backend.

---

## Objectif du Proof of Concept (PoC)

Ce Proof of Concept a pour but de valider la faisabilité technique d'une application riche et interactive (terminal simulé, progression RPG, validation de scénarios complexes) en utilisant une architecture purement **Frontend (Client-Side)**. 

### Que permet exactement cette version ?
- **Lancement immédiat** : Aucun serveur Node.js ni base de données à configurer. L'application démarre et s'exécute intégralement dans le navigateur.
- **Autonomie totale** : Le jeu peut fonctionner hors-ligne une fois chargé.
- **Persistance locale** : La progression du joueur et le tableau des scores sont sauvegardés directement dans le navigateur de l'utilisateur.

---

## Installation & Lancement

L'installation est grandement simplifiée par rapport à la version d'origine.

### 1. Prérequis
- **Node.js** v18+
- **npm**

### 2. Lancement du jeu
Placez-vous dans le dossier `frontend`, installez les dépendances et lancez le serveur de développement :

```bash
cd frontend
npm install
npm run dev
```

Le jeu sera alors accessible sur **http://localhost:5173**.

---

## Architecture et Différences avec la version originale

Dans la version originale (`master`), l'architecture reposait sur un modèle Client/Serveur. Un serveur backend Node.js validait les commandes et stockait l'état du jeu.

Dans ce PoC Standalone, **le backend a été court-circuité et intégré au frontend**.

### Résumé des modifications :
1. **Migration du Moteur** : Le moteur de jeu (`commandEngine.js` et `gameState.js`) a été migré depuis le backend vers le dossier `frontend/src/engine/` et transformé en modules JavaScript (ES Modules).
2. **Bypass Réseau** : Les appels asynchrones via `fetch('/api/command')` ont été remplacés par des exécutions locales directes.
3. **Stockage LocalStorage** : La persistance de l'état (points de vie, XP, machines compromises) et le système de High Scores sont désormais gérés par l'API Web `localStorage` au lieu d'être stockés dans la mémoire vive d'un serveur distant.

---

## Comment jouer

### Vue Réseau — Commandes disponibles

| Commande | Description |
|----------|-------------|
| `nmap 192.168.1.0/24` | Scanner le réseau et découvrir les machines |
| `nmap -sV <ip>` | Scanner une machine précise |
| `cd <ip>` | Entrer dans une salle (machine) |
| `ls` | Lister les machines visibles |
| `whoami` | Voir votre contexte attaquant |
| `hint` | Obtenir un indice |
| `help` | Toutes les commandes |

### Mode Machine (Pentest) — 4 phases

Une fois connecté à une machine (via `cd <ip>`), l'attaque suit une méthodologie stricte :

| Phase | Commandes |
|-------|-----------|
| **1 — Reconnaissance** | `recon`, `whois <ip>` |
| **2 — Scanning** | `nmap -sV <ip>`, `nikto -h <ip>`, `dirb http://<ip>` |
| **3 — Exploitation** | `sqlmap`, `hydra`, `curl`, `nc` |
| **4 — Post-exploitation** | `whoami`, `sudo -l`, `sudo python3`, `cat /flag.txt` |
| **Quitter** | `exit` |

> Tapez `hint` à tout moment pour obtenir une indication sur la phase en cours.

### Ordre d'attaque recommandé

```text
nmap 192.168.1.0/24
    ↓
cd 192.168.1.10    → Web Server    [FACILE]   flag: CQ{w3b_s3rv3r_pwn3d}
cd 192.168.1.20    → Mail Server   [MOYEN]    flag: CQ{m41l_s3rv3r_0wn3d}
    ↓ (déblocage conditionnel)
cd 192.168.1.30    → DB Server     [MOYEN]    flag: CQ{db_dump_g0t}
    ↓
cd 192.168.1.100   → Domain Controller [DIFFICILE] flag: CQ{d0m41n_4dm1n_pwn3d}
```

---

## Structure du projet

La structure a été adaptée pour cette version autonome :

```text
cyberquest/
├── backend/                  # Conservé uniquement pour référence (Inactif dans le PoC)
├── poc/                      # Éléments de conception initiaux
└── frontend/
    └── src/
        ├── engine/           # Moteur de jeu migré (Logique, Commandes, État)
        │   ├── commandEngine.js
        │   └── gameState.js  # Gestion de l'état via LocalStorage
        ├── components/
        │   ├── GameMap.jsx     # Carte interactive (Canvas)
        │   ├── Terminal.jsx    # Terminal simulé (xterm.js)
        │   ├── HUD.jsx         # Barre de progression
        │   ├── Scoreboard.jsx  # Classement (connecté au LocalStorage)
        │   └── ...
        ├── sounds.js           # API Web Audio
        ├── styles/main.css
        └── App.jsx             # Composant racine, coordonne l'état local
```

---

## Technologies utilisées

Pour cette version Standalone, la pile technologique est exclusivement frontale :

- **Interface** : React 18, Vite
- **Terminal interactif** : xterm.js
- **Audio** : Web Audio API (génération synthétique)
- **Persistance** : HTML5 Web Storage (LocalStorage)
- **Graphismes** : HTML5 Canvas

---

## Auteurs originaux

- **BouazzaZayd** — Moteur de base & logique de scénarisation
- **isselmou** — Graphismes de la carte interactive & Terminal
- **JamaiAli** — Conception UX/UI globale & Intégration