# Anti-Sèche Soutenance : CyberQuest (Version 2.0)

Ce document est mis à jour avec les toutes dernières fonctionnalités du jeu (Déplacements, Timer, Écrans). Il est fait pour t'aider à répondre aux questions des professeurs lors de ta soutenance.

---

## 1. Pourquoi ces Bibliothèques ? (Choix Techniques)

Si le prof demande : *"Pourquoi avez-vous utilisé X ou Y ?"*

### Côté Backend
*   **`express`** : *"Nous avons utilisé Express.js car c'est le standard de l'industrie pour créer des API REST en Node.js. Il nous permet de gérer nos routes (comme `/api/command`) très facilement avec très peu de lignes de code."*
*   **`cors`** : *"C'est un middleware de sécurité obligatoire. Notre interface tourne sur le port 5173 et notre serveur sur le port 3001. Par défaut, les navigateurs bloquent la communication entre deux ports différents. CORS autorise explicitement cette communication."*

### Côté Frontend
*   **`react`** : *"React nous permet de découper notre interface très complexe (carte + terminal + scores) en petits composants indépendants. Quand le joueur gagne de l'XP ou que le chronomètre défile, React ne met à jour que les bons composants, sans recharger toute la page."*
*   **`vite`** : *"Nous utilisons Vite à la place de l'ancien Webpack car il compile le code instantanément. Ça nous a fait gagner un temps précieux pendant le développement."*
*   **`xterm.js`** : *"C'est la même bibliothèque qu'utilise VS Code pour son terminal intégré ! Elle nous permet d'avoir un vrai rendu de console avec son comportement natif (historique, copier-coller)."*

---

## 2. Les Nouvelles Fonctionnalités Phares (Frontend)

Si le prof demande : *"Comment fonctionne le chronomètre ou les déplacements sur la carte ?"*

### La Gestion des Écrans (Le Routage)
*   *"Dans **`App.jsx`**, au lieu d'utiliser une lourde librairie comme React Router, nous avons implémenté un système de **state (`screen`)** simple : `select` -> `intro` -> `game` -> `gameover` -> `victory`. Selon la valeur de ce state, React affiche le bon composant."*

### Le Chronomètre (Timer & Oracle)
*   *"Le chronomètre (6 minutes) est géré via un **`useEffect`** dans **`App.jsx`**. Il utilise `setInterval` pour décrémenter le temps chaque seconde. À certaines étapes (ex: 2 minutes ou 60s restantes), le timer déclenche l'envoi de messages de stress dans le terminal via un personnage fictif appelé l'Oracle."*

### Le Mouvement du Personnage (map.js & Grille 2D)
*   *"Pour la carte, nous avons modélisé le réseau comme un tableau à deux dimensions (Tilemap) dans **`map.js`**. Chaque case est soit un mur (1), soit du sol (0), soit un serveur (3)."*
*   *"Dans **`App.jsx`**, on écoute les événements clavier (`keydown` sur les flèches). Avant chaque mouvement, on vérifie dans le tableau si la case cible est libre. Si oui, on modifie la coordonnée du personnage (`ghostTileRef`) et le composant **`GameMap.jsx`** redessine le Canvas instantanément."*
*   *"Il y a aussi une détection de proximité (Distance de Manhattan). Si le personnage arrive à 1 case d'un serveur, ça déclenche un événement (l'Oracle nous donne le nom et l'IP de la machine)."*

---

## 3. Les Fonctions Importantes du Backend

Si le prof demande : *"Où se trouve la logique du jeu ? Que se passe-t-il quand je tape une commande ?"*

*   **`server.js`** -> `app.post('/api/command')` : C'est la fonction "porte d'entrée". Elle reçoit ce que le joueur a tapé dans le terminal, l'envoie au moteur de jeu.
*   **`commandEngine.js`** -> `processCommand()` : Le cerveau du jeu. Elle découpe la commande (ex: `nmap 192.168.1.10`) et vérifie si le joueur est sur la carte globale ou dans une machine (4 phases de piratage).
*   **`gameState.js`** -> gère la base de données temporaire. Sauvegarde en mémoire vive (RAM) l'XP, le niveau, et les machines compromises par le joueur.

---

## 4. Les Fonctions Importantes du Frontend

*   **`App.jsx`** -> `handleCommand(command)` : **C'est la fonction vitale côté client.** Elle prend le texte du terminal, envoie une requête HTTP (`fetch()`) au serveur backend, attend la réponse, puis met à jour l'interface React.
*   **`Terminal.jsx`** -> `term.onKey(...)` : Écoute *chaque* touche pressée. C'est ici qu'on gère la touche *Entrée* pour valider la commande, ou les flèches pour l'historique.
*   **`GameMap.jsx`** -> Utilise l'API native `HTML5 Canvas`. Au lieu d'images lourdes, on utilise des fonctions JavaScript natives comme `ctx.fillRect()` pour dessiner la matrice de `map.js` en temps réel.
