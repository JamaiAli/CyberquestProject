# CyberQuest: Standalone Edition (Proof of Concept)

## Introduction
This repository contains the "Proof of Concept" (PoC) branch for CyberQuest, a Hacker RPG simulating penetration testing workflows. The primary objective of this branch is to demonstrate the technical feasibility of running the entire application—including complex interactive mechanics, game state management, and command parsing—exclusively within the browser, requiring absolutely no backend server.

---

## Game Logic and Mechanics
CyberQuest places the user in the role of a cybersecurity professional tasked with infiltrating the fictional "NEXUS CORP" network. The gameplay loop is deeply integrated with real-world cybersecurity concepts.

### 1. Interactive Terminal Interface
The core of the interaction happens through a simulated terminal component. The user inputs commands inspired by actual security tools (such as Nmap, Nikto, SQLmap, Dirb, and Hydra) to interact with the simulated network environment.

### 2. Sequential Attack Phases
Infiltration of any target machine is strictly governed by a four-phase methodology:
- **Reconnaissance**: Passive intelligence gathering (e.g., `recon`, `whois`).
- **Scanning**: Active port and vulnerability scanning (e.g., `nmap -sV`, `nikto`).
- **Exploitation**: Leveraging vulnerabilities to gain initial access (e.g., `sqlmap`, `hydra`).
- **Post-Exploitation**: Privilege escalation and data exfiltration (e.g., `sudo -l`, reading `/flag.txt`).

### 3. Progression System (RPG Elements)
Success in executing correct commands during the appropriate phases yields Experience Points (XP). Accumulating XP increases the player's level and Health Points (HP). Furthermore, compromising specific machines yields credentials or network access that unlocks deeper segments of the network (e.g., pivoting from a perimeter Web Server to an internal Domain Controller).

### 4. Pedagogical Feedback
To ensure educational value, every valid command triggers an informational panel. This panel explains the underlying real-world cybersecurity concepts, detailing why a specific attack works and what vulnerabilities it exploits (e.g., Path Traversal, Kerberoasting, Privilege Escalation).

---

## Architecture: Standalone Migration
The transition from a Client/Server model (found in the `master` branch) to a 100% Standalone application required significant architectural refactoring.

### Decentralization of the Game Engine
In the original architecture, a Node.js Express backend was responsible for parsing commands, validating state transitions, and managing sessions. 
In this PoC, the entire game engine (`backend/engine/`) was ported directly to the frontend (`frontend/src/engine/`) and refactored into modern JavaScript ES Modules. The React application now directly executes the engine logic locally in the user's browser.

### Network Call Bypass
All asynchronous HTTP requests previously used to communicate with the backend API have been completely eradicated. The latency is practically eliminated.

*Original Server-Dependent Logic:*
```javascript
const response = await fetch('/api/command', { 
  method: 'POST', 
  body: JSON.stringify({ command, sessionId }) 
});
```

*Refactored Standalone Logic:*
```javascript
const currentState = engineGetGameState(sessionId);
const result = processCommand(command, currentState);
const savedState = engineUpdateGameState(sessionId, result.newState);
```

### State Persistence via LocalStorage
To simulate database persistence and ensure the player does not lose their progression upon refreshing the browser, the application utilizes the Web Storage API (`localStorage`).
- **State Management (`cyberquest_sessions`)**: Continuously serializes and saves the active game state, including unlocked machines, current phase, XP, and HP.
- **Leaderboard Management (`cyberquest_named_scores`)**: Mimics a relational database table to store and sort completed runs, enabling a fully functional "Hall of Fame" scoreboard without external database dependencies.

---

## Installation and Execution

Given the standalone nature of this architecture, deployment and execution are extremely lightweight. No database setup or backend server is required.

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Launch the local development server (Vite)
npm run dev
```

The application will be instantly accessible via the browser at `http://localhost:5173`. 

*Note: The original `backend` directory remains in this repository strictly for architectural comparison and historical reference. It is not executed or required by this PoC.*