# CyberQuest — Hacker Pentest RPG

**CyberQuest** est un jeu vidéo de simulation de pentest (tests de pénétration) conçu pour sensibiliser à la cybersécurité tout en offrant une expérience de jeu de rôle tactique (RPG). 

Le joueur incarne un hacker (GHOST, PHANTOM ou VIPER) qui s'infiltre dans le réseau sécurisé de *NEXUS Corp*. À l'aide d'une carte top-down interactive et d'un **véritable terminal de commandes intégré**, le joueur doit explorer le réseau, scanner les IP, trouver les vulnérabilités et attaquer les serveurs pour récupérer 4 "Flags" (Drapeaux) avant la fin du temps imparti.

---

## Architecture du Dépôt : Les Deux Branches

Ce dépôt Git est structuré autour de **deux architectures distinctes**. Le code source du jeu n'est pas sur la branche `main` (qui sert uniquement d'accueil et de documentation), mais sur les deux branches de développement suivantes :

### 1. La Branche `master` (Architecture Client-Serveur Complète)
> **Branch:** `git checkout master`

Il s'agit de l'architecture historique et complète du projet, pensée pour un déploiement réel en production sécurisée.

- **Stack Technique** : Frontend (React 18, Vite, HTML Canvas) + Backend (Node.js, Express) + Base de données (SQLite).
- **Fonctionnement** : 
 - Le frontend gère l'interface graphique (Carte, HUD, Terminal UI).
 - Lorsqu'un joueur tape une commande (`nmap`, `sqlmap`), le terminal frontend envoie une requête API au backend (`POST /api/command`).
 - Le **Backend** est le véritable "cerveau" : il valide les phases d'attaque, stocke l'état du jeu en session (pour éviter la triche côté client), et renvoie les réponses du terminal en couleurs ANSI.
- **Avantages** : Extrême sécurité (la logique métier est cachée sur le serveur), persistance multi-sessions en base de données, intégration possible de véritables appels d'API externes (ex: intégration de l'IA Sentinel via l'API GROQ).
- **Usage recommandé** : Déploiement en ligne pour le public.

### 2. La Branche `proof-of-concept` (Architecture Standalone)
> **Branch:** `git checkout proof-of-concept`

Il s'agit d'une version allégée, optimisée, et **100% Frontend** (Sans aucun backend).

- **Stack Technique** : Frontend pur (React 18, Vite, HTML Canvas, Moteur Logique Embarqué).
- **Fonctionnement** :
 - Tout le code du backend (le moteur de commande, la validation des flags) a été migré à l'intérieur du frontend (dans `src/engine/`).
 - La progression du joueur est sauvegardée directement dans le navigateur via le `localStorage`.
- **Avantages** : Lancement immédiat avec une seule commande (`npm run dev`), aucune configuration serveur requise, fonctionne totalement hors-ligne.
- **Sécurisation Poussée** : Bien qu'elle n'ait pas de serveur, cette version est bardée de mécanismes anti-triche de niveau professionnel :
 - **Défense en Profondeur (CSP)** : Politique stricte du navigateur bloquant les injections de code (Zéro XSS, Zéro exécution malveillante).
 - **Sauvegardes Signées** : Les fichiers de sauvegarde locale sont cryptographiquement hachés et signés. Toute modification manuelle du `localStorage` détruit la sauvegarde.
 - **Code Splitting (Vite)** : Chargement asynchrone pour des performances ultra-rapides.
 - **Obfuscation** : Les drapeaux de victoire sont chiffrés en Base64 dans le code.
 - **Anti-Debugging** : Blocage du clic droit et de la console navigateur (`F12`).
- **Usage recommandé** : Salons de démonstration, Hackathons, présentations locales, jeu hors-ligne rapide.

---

## Comment Lancer le Projet ?

### Si vous voulez tester la version "Standalone" (La plus facile/rapide) :
```bash
# 1. Allez sur la branche Standalone
git checkout proof-of-concept

# 2. Entrez dans le dossier frontend
cd frontend

# 3. Installez les dépendances et lancez le jeu
npm install
npm run dev
```
Ouvrez ensuite votre navigateur sur **http://localhost:5173**.

### Si vous voulez tester la version "Client-Serveur" (La plus complète) :
```bash
# 1. Allez sur la branche Master
git checkout master

# 2. Dans un premier terminal, lancez le Backend
cd backend
npm install
npm start
# Le serveur écoute sur le port 3001

# 3. Dans un deuxième terminal, lancez le Frontend
cd frontend
npm install
npm run dev
# Le jeu est accessible sur http://localhost:5173
```

---

## Fonctionnement du Jeu (Gameplay)

1. **La Carte (Déplacement)** : Utilisez les **Flèches directionnelles** du clavier (`Haut`, `Bas`, `Gauche`, `Droite`) pour déplacer votre hacker sur la carte du réseau vue de dessus.
2. **Le Terminal (Attaque)** : Approchez-vous d'une cible (ex: Web Server, Mail Server). Une notification d'interaction s'affichera. Tapez vos commandes dans le terminal intégré.
 *(Toutes les lettres, chiffres et frappes clavier "classiques" alimentent uniquement le terminal. Les flèches déplacent uniquement le personnage).*
3. **Le Compte à rebours** : Vous avez exactement 6 minutes pour récupérer 4 drapeaux (Flags). Passé ce délai, l'administrateur système coupe votre connexion (Game Over).
4. **L'Assistant ORACLE** : Gardez un œil sur le terminal. ORACLE vous guidera et vous alertera du temps restant.

### Commandes Terminal Utiles :
- `help` : Liste les commandes disponibles.
- `hint` : Donne un indice sur l'attaque à réaliser selon la phase en cours.
- `ls` : Affiche les IP des machines découvertes.
- `clear` : Nettoie l'écran du terminal.

---

## Les Auteurs du Projet

- **BouazzaZayd** — Conception du moteur backend et de la logique métier pentest.
- **isselmou** — Développement de la carte interactive Canvas et du composant Terminal.
- **JamaiAli** — Design de l'interface, intégration de la machine à états et de l'expérience utilisateur (UX).
- **Aziz Baoueb** — Co-conception initiale et Architecture Standalone Sécurisée (créateur de la branche `proof-of-concept`).