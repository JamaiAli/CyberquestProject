import React, { useState, useEffect } from 'react';

export default function MainframeView({ onClose, onExfiltrate }) {
  const [logs, setLogs] = useState([]);
  const [command, setCommand] = useState('');
  const [isExfiltrating, setIsExfiltrating] = useState(false);

  useEffect(() => {
    setLogs([
      "===========================================================",
      "|| NEXUS CORP - MAINFRAME ACCESSIBLE                     ||",
      "|| ALERTE : INTRUSION PHYSIQUE DÉTECTÉE                  ||",
      "===========================================================",
      "> Authentification bypassée. Accès root obtenu.",
      "> [Astuce] Tapez 'ls' pour voir les fichiers disponibles.",
      " "
    ]);
  }, []);

  const handleCommandSubmit = (e) => {
    e.preventDefault();
    if (!command.trim()) return;

    setLogs(prev => [...prev, `root@nexus-mainframe:~# ${command}`]);

    const cmd = command.trim();

    if (cmd === 'ls') {
      setLogs(prev => [...prev, "-rwxr-xr-x 1 root root  exfiltrate_data.sh"]);
      setCommand('');
      return;
    }

    if (cmd === 'help') {
      setLogs(prev => [...prev, "Commandes disponibles: ls, ./exfiltrate_data.sh"]);
      setCommand('');
      return;
    }

    if (cmd === './exfiltrate_data.sh' || cmd === 'bash exfiltrate_data.sh' || cmd === 'sh exfiltrate_data.sh') {
      setIsExfiltrating(true);
      setCommand('');
      setLogs(prev => [...prev, 
        "> Initialisation du script d'exfiltration...",
        "> Validation des clés de sécurité...",
        "> Clé Web : OK",
        "> Ticket Kerberos : OK",
        "> Override AI : OK",
        " ",
        "> [!] TÉLÉCHARGEMENT EN COURS...",
        "> [!] ATTENTION : DÉTECTION IMMINENTE."
      ]);

      setTimeout(() => {
        setLogs(prev => [...prev, 
          "===========================================================",
          "|| ALERTE ROUGE : TRAÇAGE ACTIF                          ||",
          "|| COUPEZ LA CONNEXION PHYSIQUE IMMÉDIATEMENT            ||",
          "===========================================================",
          "> ÉVASION REQUISE : RETOURNEZ AU POINT DE DÉPART !"
        ]);
      }, 1500);

      setTimeout(() => {
        onExfiltrate();
      }, 3500);
      return;
    }

    setLogs(prev => [...prev, `bash: ${command}: command not found`]);
    setCommand('');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(5, 0, 0, 0.9)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      fontFamily: '"Fira Code", monospace'
    }}>
      <div className="cyber-panel" style={{
        width: '90%', maxWidth: '800px', height: '80%',
        background: '#0a0000',
        border: '1px solid #ff0000',
        boxShadow: '0 0 30px rgba(255, 0, 0, 0.2)',
        display: 'flex', flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 20px', background: '#220000', borderBottom: '1px solid #ff0000',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: '#ff0000', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ animation: 'blink 1s infinite' }}>🔴</span> NEXUS MAINFRAME
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#ff0000', fontSize: '20px', cursor: 'pointer'
          }}>✖</button>
        </div>

        {/* Terminal output */}
        <div style={{
          flex: 1, padding: '20px', overflowY: 'auto',
          color: '#ff4444', fontSize: '14px', lineHeight: 1.6
        }}>
          {logs.map((line, i) => (
            <div key={i} style={{ whiteSpace: 'pre-wrap' }}>{line}</div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleCommandSubmit} style={{
          padding: '15px 20px', background: 'rgba(255, 0, 0, 0.05)', borderTop: '1px solid #ff0000',
          display: 'flex', gap: '10px'
        }}>
          <span style={{ color: '#ff0000' }}>root@nexus-mainframe:~#</span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={isExfiltrating}
            autoFocus
            style={{
              flex: 1, background: 'transparent', border: 'none', color: '#fff',
              fontFamily: 'inherit', fontSize: '14px', outline: 'none'
            }}
          />
        </form>
      </div>
    </div>
  );
}
