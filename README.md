# CyberQuest — Pentest RPG

Un jeu de simulation de pentest où tu incarnes un hacker qui doit compromettre un réseau d'entreprise (CorpNet). Explore les salles de la carte, scanne les machines, exploite les vulnérabilités et récupère les flags.

---

## Prérequis

- **Node.js** v18+
- **npm**

---

## Installation & Lancement

### 1. Backend (API + moteur de jeu)

```bash
cd backend
npm install
node server.js
```

Le backend démarre sur **http://localhost:3001**

Tu dois voir :
```
CyberQuest backend on port 3001
```

### 2. Frontend (Interface du jeu)

Dans un **deuxième terminal** :

```bash
cd frontend
npm install
npm run dev
```

Le frontend démarre sur **http://localhost:5173**

### 3. Jouer

Ouvre **http://localhost:5173** dans ton navigateur.

---

## Comment jouer

### Vue Réseau — Commandes disponibles

| Commande | Description |
|----------|-------------|
| `nmap 192.168.1.0/24` | Scanner le réseau et découvrir les machines |
| `nmap -sV <ip>` | Scanner une machine précise |
| `cd <ip>` | Entrer dans une salle (machine) |
| `ls` | Lister les machines visibles |
| `whoami` | Voir ton contexte attaquant |
| `hint` | Obtenir un indice |
| `help` | Toutes les commandes |

### Mode Machine (Pentest) — 4 phases

Une fois dans une machine (après `cd <ip>`) :

| Phase | Commandes |
|-------|-----------|
| **1 — Reconnaissance** | `recon`, `whois <ip>` |
| **2 — Scanning** | `nmap -sV <ip>`, `nikto -h <ip>`, `dirb http://<ip>` |
| **3 — Exploitation** | `sqlmap`, `hydra`, `curl`, `nc` |
| **4 — Post-exploitation** | `whoami`, `sudo -l`, `sudo python3`, `cat /flag.txt` |
| **Quitter** | `exit` |

> Tape `hint` à tout moment pour un indice sur la phase actuelle.

### Ordre d'attaque recommandé

```
nmap 192.168.1.0/24
    ↓
cd 192.168.1.10    → Web Server    [FACILE]   flag: CQ{w3b_s3rv3r_pwn3d}
cd 192.168.1.20    → Mail Server   [MOYEN]    flag: CQ{m41l_s3rv3r_0wn3d}
    ↓ (déblocage automatique)
cd 192.168.1.30    → DB Server     [MOYEN]    flag: CQ{db_dump_g0t}
    ↓
cd 192.168.1.100   → Domain Controller [DIFFICILE] flag: CQ{d0m41n_4dm1n_pwn3d}
```

### Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `↑` / `↓` | Historique des commandes |
| `Tab` | Autocomplétion |
| `Ctrl+C` | Copier la sélection / Annuler la commande |
| `Ctrl+V` | Coller depuis le presse-papiers |
| `Ctrl+L` | Effacer le terminal |

---

## Structure du projet

```
cyberquest/
├── backend/
│   ├── engine/
│   │   ├── commandEngine.js   # Moteur de jeu, commandes, scénarios pentest
│   │   └── gameState.js       # Gestion des sessions en mémoire
│   └── server.js              # API Express (POST /api/command, GET /api/state)
└── frontend/
    └── src/
        ├── components/
        │   ├── GameMap.jsx     # Carte des salles avec personnage animé (Canvas)
        │   ├── Terminal.jsx    # Terminal interactif (xterm.js)
        │   ├── HUD.jsx         # Barre d'état (XP, niveau, machines pwned)
        │   ├── MachineView.jsx # Vue pentest d'une machine (phases, commandes)
        │   ├── PedaPanel.jsx   # Panneau d'aide et guide par phase
        │   └── Scoreboard.jsx  # Tableau des scores
        ├── sounds.js           # Sons synthétisés (Web Audio API)
        ├── styles/main.css     # Animations, effets CRT, thème hacker
        └── App.jsx             # Composant principal, gestion de l'état
```

---

## Technologies utilisées

| Côté | Stack |
|------|-------|
| Frontend | React 18, Vite, HTML Canvas, xterm.js |
| Backend | Node.js, Express |
| Audio | Web Audio API (pas de fichiers audio) |
| État | Sessions en mémoire (Map) — pas de base de données |

---

## Auteurs

- **BouazzaZayd** — Moteur backend & logique pentest
- **isselmou** — Carte interactive & terminal
- **JamaiAli** — Interface, intégration & UX
- **Aziz Baoueb** — Co-conception de la version initiale & Architecture de la version Standalone (branche `proof-of-concept`)
