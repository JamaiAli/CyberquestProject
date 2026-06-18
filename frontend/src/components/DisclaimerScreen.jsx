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
        if (brightness > 0.95) ctx.fillStyle = '#ffffff';
        else if (brightness > 0.7) ctx.fillStyle = '#00ff41';
        else ctx.fillStyle = `rgba(0, 255, 65, ${0.15 + Math.random() * 0.3})`;

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
export default function DisclaimerScreen({ onAccept }) {
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
        {/* Glitch title */}
        <div className={`disc-title-wrap ${loaded ? 'disc-title-wrap--in' : ''}`}>
          <h1 className="disc-title" data-text="CYBERQUEST">CYBERQUEST</h1>
          <p className="disc-subtitle">THE CYBERSECURITY TRAINING GAME</p>
          <div className="disc-badge">
            <span className="disc-badge__icon">🛡️</span>
            <span className="disc-badge__text">INSA Centre-Val de Loire</span>
          </div>
        </div>

        {/* Description card */}
        <div className={`disc-card ${showContent ? 'disc-card--in' : ''}`}>
          <p className="disc-card__lead">
            Plongez dans le réseau corrompu de la mégacorporation <strong>NEXUS Corp</strong>. Incarnez un hacktiviste d'élite — <span className="hl-cyan">Ghost</span>, <span className="hl-magenta">Phantom</span> ou <span className="hl-yellow">Viper</span> — dans un monde où chaque frappe au clavier compte.
          </p>

          <div className="disc-features">
            <div className="disc-feat">
              <span className="disc-feat__icon">🐧</span>
              <div>
                <strong>Maîtrise de Linux</strong>
                <p>Apprenez les commandes fondamentales — <code>ls</code>, <code>cd</code>, <code>cat</code>, <code>chmod</code>, <code>grep</code> — pour survivre sur un système Unix.</p>
              </div>
            </div>
            <div className="disc-feat">
              <span className="disc-feat__icon">🔍</span>
              <div>
                <strong>Reconnaissance & Scanning</strong>
                <p>Cartographiez les réseaux ennemis avec <code>nmap</code>, <code>whois</code>, <code>enum4linux</code> et identifiez les services vulnérables.</p>
              </div>
            </div>
            <div className="disc-feat">
              <span className="disc-feat__icon">💉</span>
              <div>
                <strong>Exploitation Web & Active Directory</strong>
                <p>Mettez en pratique les standards OWASP et les techniques d'énumération AD pour faire tomber les défenses.</p>
              </div>
            </div>
            <div className="disc-feat">
              <span className="disc-feat__icon">👑</span>
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
            &nbsp;J'AI COMPRIS, ACCÉDER AU TERMINAL&nbsp;
            <span className="disc-btn__bracket">]</span>
          </button>
          <p className="disc-cta__hint">Toutes les commandes sont exécutées dans un environnement simulé et sécurisé.</p>
        </div>
      </div>
    </div>
  );
}
