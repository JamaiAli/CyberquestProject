import { useState, useEffect, useRef } from 'react';
import '../styles/disclaimer.css';

/* ── Matrix rain on <canvas> ──────────────────────────────────────────────── */
function MatrixCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    let raf;

    const resize = () => { cvs.width = cvs.offsetWidth; cvs.height = cvs.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const fontSize = 14;
    let cols = Math.floor(cvs.width / fontSize);
    let drops = Array(cols).fill(1);
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        const brightness = Math.random();
        if (brightness > 0.98) ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
        else if (brightness > 0.8) ctx.fillStyle = 'rgba(0, 150, 200, 0.3)';
        else ctx.fillStyle = `rgba(0, 80, 120, ${0.05 + Math.random() * 0.1})`;

        ctx.fillText(char, x, y);

        if (y > cvs.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={ref} className="disc-matrix-canvas" />;
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function DisclaimerScreen({ onAccept, user, authLoading, onLoginClick, onLogout }) {
  const [loaded, setLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showBtn, setShowBtn] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLoaded(true), 400);
    const t2 = setTimeout(() => setShowContent(true), 1200);
    const t3 = setTimeout(() => setShowBtn(true), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="disc-screen">
      <MatrixCanvas />
      <div className="disc-scanlines" />
      <div className="disc-overlay" />

      <div className="disc-hero">
        {/* Top right corner for Auth / User ID */}
        {!authLoading && (
          <div style={{ position: 'absolute', top: '20px', right: '30px', zIndex: 100 }}>
            {user ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ 
                  color: 'var(--neon-blue, #00f0ff)', 
                  fontFamily: 'monospace', 
                  fontSize: '14px', 
                  border: '1px solid var(--neon-blue, #00f0ff)', 
                  padding: '6px 12px', 
                  borderRadius: '4px', 
                  background: 'rgba(0, 240, 255, 0.1)',
                  animation: 'fadeIn 0.5s ease'
                }}>
                  {user}
                </div>
                <button
                  onClick={onLogout}
                  style={{
                    background: 'transparent',
                    border: '1px solid #ff333355',
                    color: '#ff3333bb',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    cursor: 'pointer',
                    padding: '6px 14px',
                    borderRadius: '3px',
                    letterSpacing: '1px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.target.style.color = '#ff3333';
                    e.target.style.borderColor = '#ff3333';
                    e.target.style.background = 'rgba(255, 51, 51, 0.05)';
                  }}
                  onMouseLeave={e => {
                    e.target.style.color = '#ff3333bb';
                    e.target.style.borderColor = '#ff333355';
                    e.target.style.background = 'transparent';
                  }}
                >
                  ❌ DÉCONNEXION
                </button>
              </div>
            ) : (
              <button 
                onClick={onLoginClick}
                style={{ 
                  cursor: 'pointer', 
                  color: 'var(--neon-pink, #ff00ff)', 
                  fontFamily: 'monospace', 
                  fontSize: '14px', 
                  border: '1px solid var(--neon-pink, #ff00ff)', 
                  padding: '6px 12px', 
                  borderRadius: '4px', 
                  background: 'rgba(255, 0, 255, 0.1)',
                  transition: 'all 0.2s ease',
                  animation: 'fadeIn 0.5s ease'
                }}
                onMouseEnter={e => {
                  e.target.style.background = 'rgba(255, 0, 255, 0.2)';
                  e.target.style.boxShadow = '0 0 10px rgba(255, 0, 255, 0.5)';
                }}
                onMouseLeave={e => {
                  e.target.style.background = 'rgba(255, 0, 255, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                [ CONNEXION ]
              </button>
            )}
          </div>
        )}

        {/* Glitch title */}
        <div className={`disc-title-wrap ${loaded ? 'disc-title-wrap--in' : ''}`}>
          <h1 className="disc-title" data-text="CYBERQUEST">CYBERQUEST</h1>
          <p className="disc-subtitle">THE CYBERSECURITY TRAINING GAME</p>
          <div className="disc-badge">
            <span className="disc-badge__icon">{'//'}</span>
            <span className="disc-badge__text">INSA Centre-Val de Loire</span>
          </div>
        </div>

        {/* Description card */}
        <div className={`disc-card ${showContent ? 'disc-card--in' : ''}`}>
          <p className="disc-card__lead">
            En 2077, la mégacorporation <strong className="hl-cyan">NEXUS Corp</strong> a volé les données de millions de citoyens. Vous êtes <strong className="hl-magenta">GHOST</strong>, un hacktiviste d'élite déterminé à les faire tomber.
            <br/><br/>
            Pour accomplir votre mission, vous devrez <strong>explorer leur réseau physique</strong> et vous infiltrer dans différentes salles de serveurs (Serveur Web, Active Directory, AI Core). Chaque machine abrite une série de <strong>niveaux et de défis de cybersécurité</strong>. Terminez toutes les salles, résolvez chaque faille, et atteignez le cœur du système pour gagner la partie !
          </p>

          <div className="disc-features">
            <div className="disc-feat">
              <span className="disc-feat__icon">{'[01]'}</span>
              <div>
                <strong>Maîtrise de Linux</strong>
                <p>Apprenez les commandes fondamentales — <code>ls</code>, <code>cd</code>, <code>cat</code>, <code>chmod</code>, <code>grep</code> — pour survivre sur un système Unix.</p>
              </div>
            </div>
            <div className="disc-feat">
              <span className="disc-feat__icon">{'[02]'}</span>
              <div>
                <strong>Reconnaissance & Scanning</strong>
                <p>Cartographiez les réseaux ennemis avec <code>nmap</code>, <code>whois</code>, <code>enum4linux</code> et identifiez les services vulnérables.</p>
              </div>
            </div>
            <div className="disc-feat">
              <span className="disc-feat__icon">{'[03]'}</span>
              <div>
                <strong>Exploitation Web & Active Directory</strong>
                <p>Mettez en pratique les standards OWASP et les techniques d'énumération AD pour faire tomber les défenses.</p>
              </div>
            </div>
            <div className="disc-feat">
              <span className="disc-feat__icon">{'[04]'}</span>
              <div>
                <strong>Post-Exploitation & Pivoting</strong>
                <p>Forcez des accès avec <code>hydra</code>, élevez vos privilèges et récupérez les flags CTF ultimes.</p>
              </div>
            </div>
          </div>

          <p className="disc-card__footer">
            Développé dans le cadre du <strong>Projet d'Application STI 3A</strong> à l'INSA Centre-Val de Loire, dans la continuité des travaux pratiques de cybersécurité de M. Adell.
          </p>
        </div>

        {/* CTA button */}
        <div className={`disc-cta ${showBtn ? 'disc-cta--in' : ''}`}>
          <button className="disc-btn" onClick={onAccept}>
            <span className="disc-btn__bracket">[</span>
            &nbsp;INITIALISER LA CONNEXION&nbsp;
            <span className="disc-btn__bracket">]</span>
          </button>
          <p className="disc-cta__hint">Toutes les commandes sont exécutées dans un environnement simulé et sécurisé.</p>
        </div>
      </div>
    </div>
  );
}
