import { useEffect, useRef, useState, useCallback } from 'react';

const CW = 800, CH = 578;

// Hexagonal nodes replacing rectangles
const NODES = [
  {
    id: 'hub', name: 'Kali Linux', sub: '10.0.0.1',
    icon: '💻', x: 400, y: 60, r: 38,
    type: 'hub', locked: false,
  },
  {
    id: 'firewall', name: 'Firewall', sub: '192.168.1.1',
    icon: '🔥', x: 400, y: 158, r: 30,
    type: 'firewall', locked: true,
  },
  {
    id: 'webserver', name: 'Web Server', sub: '192.168.1.10',
    icon: '🌐', x: 190, y: 308, r: 46,
    type: 'server', difficulty: 'easy', locked: false,
  },
  {
    id: 'mailserver', name: 'Mail Server', sub: '192.168.1.20',
    icon: '📧', x: 610, y: 308, r: 46,
    type: 'server', difficulty: 'medium', locked: false,
  },
  {
    id: 'dbserver', name: 'DB Server', sub: '192.168.1.30',
    icon: '🗄', x: 400, y: 432, r: 46,
    type: 'server', difficulty: 'medium', locked: true,
  },
  {
    id: 'dc', name: 'Domain Ctrl', sub: '192.168.1.100',
    icon: '👑', x: 400, y: 528, r: 52,
    type: 'boss', difficulty: 'hard', locked: true,
  },
];

const CORRIDORS = [
  ['hub', 'webserver'], ['hub', 'mailserver'],
  ['webserver', 'dbserver'], ['mailserver', 'dbserver'],
  ['dbserver', 'dc'],
];

const DIFF_COLOR = { easy: '#00bb44', medium: '#bbaa00', hard: '#cc3300' };
const WALK_FRAMES = ['🧑‍💻', '🏃'];

function lerp(a, b, t) { return a + (b - a) * t; }

function hexPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export default function GameMap({ gameState, effect, hackerName, playerEmoji }) {
  const canvasRef = useRef(null);
  const charPos   = useRef({ x: 400, y: 60 });
  const charDst   = useRef({ x: 400, y: 60 });
  const animRef   = useRef(null);
  const tick      = useRef(0);
  const [floats, setFloats] = useState([]);

  const addFloat = useCallback((text, color) => {
    const id = Date.now() + Math.random();
    setFloats(f => [...f, { id, text, color }]);
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1500);
  }, []);

  useEffect(() => {
    if (!effect) return;
    if (effect.type === 'ENTER_MACHINE' && effect.machine) {
      const n = NODES.find(x => x.id === effect.machine.id);
      if (n) charDst.current = { x: n.x, y: n.y };
      addFloat(`⚡ → ${effect.machine.name}`, '#ff8800');
    }
    if (effect.type === 'EXIT_MACHINE') {
      charDst.current = { x: 400, y: 60 };
      addFloat('← Réseau', '#00ffff');
    }
    if (effect.type === 'FLAG_FOUND')     addFloat('🚩 FLAG!',        '#ffd700');
    if (effect.type === 'PHASE_COMPLETE') addFloat('✅ Phase OK',     '#00ff41');
    if (effect.type === 'ROOT_OBTAINED')  addFloat('👑 ROOT !',       '#ff4444');
    if (effect.type === 'SCAN_NETWORK')   addFloat('📡 Cartographié', '#00ffff');
  }, [effect, addFloat]);

  const pwned    = gameState?.pwnedMachines    || [];
  const scanned  = gameState?.scannedMachines  || [];
  const unlocked = gameState?.unlockedMachines || ['webserver', 'mailserver'];
  const activeId = gameState?.currentMachine?.id || null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      tick.current++;
      const t = tick.current;

      charPos.current.x = lerp(charPos.current.x, charDst.current.x, 0.09);
      charPos.current.y = lerp(charPos.current.y, charDst.current.y, 0.09);
      const dist2dst = Math.hypot(charDst.current.x - charPos.current.x, charDst.current.y - charPos.current.y);
      const isMoving = dist2dst > 3;

      // ── Blueprint background ────────────────────────────────
      ctx.fillStyle = '#00091a';
      ctx.fillRect(0, 0, CW, CH);

      // Fine grid
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.025)';
      for (let x = 0; x < CW; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke(); }
      for (let y = 0; y < CH; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }

      // Major grid
      ctx.strokeStyle = 'rgba(255,255,255,0.045)';
      for (let x = 0; x < CW; x += 200) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke(); }
      for (let y = 0; y < CH; y += 200) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }

      // Faint decorative text
      ctx.fillStyle = 'rgba(255,255,255,0.018)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ['192.168.1.0/24', 'NEXUS CORP', 'CLASSIFIED', 'INFILTRATION', '//CYBERQUEST'].forEach((txt, i) => {
        ctx.fillText(txt, 30 + i * 162, 20 + (i % 2) * 543);
      });

      // ── Hub radar sweep ─────────────────────────────────────
      const hub = NODES[0];
      const radarR = 88;
      ctx.strokeStyle = 'rgba(0,255,65,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(hub.x, hub.y, radarR, 0, Math.PI * 2); ctx.stroke();
      {
        const sweep = (t * 0.02) % (Math.PI * 2);
        ctx.save();
        ctx.translate(hub.x, hub.y);
        ctx.rotate(sweep);
        ctx.fillStyle = 'rgba(0,255,65,0.07)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radarR, -0.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // ── Connections ──────────────────────────────────────────
      CORRIDORS.forEach(([aId, bId]) => {
        const a = NODES.find(n => n.id === aId);
        const b = NODES.find(n => n.id === bId);
        if (!a || !b) return;

        const bLocked   = b.locked && !unlocked.includes(b.id);
        const pathPwned = pwned.includes(a.id) && !bLocked;

        // Base line
        ctx.strokeStyle = bLocked
          ? 'rgba(255,255,255,0.04)'
          : pathPwned
            ? 'rgba(0,255,65,0.22)'
            : 'rgba(0,150,255,0.12)';
        ctx.lineWidth = pathPwned ? 2 : 1;
        ctx.setLineDash(bLocked ? [4, 8] : []);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.setLineDash([]);

        // Animated particles on compromised paths
        if (pathPwned) {
          for (let i = 0; i < 3; i++) {
            const prog = ((t / 80 + i / 3) % 1);
            const px = a.x + (b.x - a.x) * prog;
            const py = a.y + (b.y - a.y) * prog;
            // Glow
            ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,255,65,0.15)'; ctx.fill();
            // Dot
            ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff41'; ctx.fill();
          }
        }
      });

      // ── Hex nodes ───────────────────────────────────────────
      NODES.forEach(node => {
        const isLocked  = node.locked && !unlocked.includes(node.id);
        const isPwned   = pwned.includes(node.id);
        const isScanned = scanned.includes(node.id);
        const isActive  = activeId === node.id;
        const isHub     = node.id === 'hub';
        const pulse     = 0.8 + Math.sin(t * 0.07) * 0.2;

        // Scan pulse ring
        if (isScanned && !isPwned) {
          const scanR = node.r + ((t * 1.2) % 55);
          const alpha = Math.max(0, 0.35 - (scanR - node.r) / 55 * 0.35);
          ctx.strokeStyle = `rgba(0,180,255,${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(node.x, node.y, scanR, 0, Math.PI * 2); ctx.stroke();
        }

        // Glow
        if (isActive || isPwned || (isHub && !activeId)) {
          ctx.shadowColor = isActive ? '#ff6600' : '#00ff41';
          ctx.shadowBlur  = 24 * pulse;
        }

        // Hex fill
        const fillMap = {
          locked:  '#06060f',
          pwned:   '#001600',
          active:  '#180a00',
          scanned: '#080f14',
          unknown: '#000b1a',
        };
        const fillKey = isLocked ? 'locked' : isPwned ? 'pwned' : isActive ? 'active' : isScanned ? 'scanned' : 'unknown';
        hexPath(ctx, node.x, node.y, node.r);
        ctx.fillStyle = fillMap[fillKey];
        ctx.fill();

        // Hex border
        let borderCol = isLocked ? '#1a1a2a'
          : isPwned   ? '#00ff41'
          : isActive  ? '#ff6600'
          : isScanned ? '#0088cc'
          : node.difficulty ? (DIFF_COLOR[node.difficulty] + '66') : '#003366aa';

        hexPath(ctx, node.x, node.y, node.r);
        ctx.strokeStyle = borderCol;
        ctx.lineWidth = isActive ? 2.5 : isPwned ? 2 : 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner hex ring
        hexPath(ctx, node.x, node.y, node.r - 7);
        ctx.strokeStyle = isLocked ? 'rgba(255,255,255,0.02)' : isPwned ? 'rgba(0,255,65,0.15)' : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Static noise on locked
        if (isLocked) {
          for (let i = 0; i < 25; i++) {
            const nx = node.x - node.r + Math.random() * node.r * 2;
            const ny = node.y - node.r + Math.random() * node.r * 2;
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
            ctx.fillRect(nx, ny, 2, 2);
          }
        }

        // Icon
        const iconSz = node.type === 'boss' ? 26 : node.type === 'hub' ? 18 : 22;
        ctx.font = `${iconSz}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isLocked ? '🔒' : node.icon, node.x, node.y - (node.r > 42 ? 12 : 8));

        // Name
        ctx.font = `bold 9px monospace`;
        ctx.textBaseline = 'alphabetic';
        const nameColor = isPwned ? '#00ff41'
          : isLocked  ? '#2a2a3a'
          : isActive  ? '#ff9944'
          : isScanned ? '#44aaff'
          : '#336699';
        const nameY = node.y + (node.r > 40 ? 6 : 4);
        ctx.fillStyle = nameColor;
        ctx.fillText(isLocked ? '???' : node.name, node.x, nameY);

        // IP
        if (node.r >= 42) {
          ctx.font = '8px monospace';
          ctx.fillStyle = isLocked ? '#111' : '#1a3a55';
          ctx.fillText(isLocked ? '???.???.???.???' : node.sub, node.x, nameY + 12);
        }

        // Status badge above hex
        if (isPwned) {
          ctx.fillStyle = 'rgba(0,255,65,0.7)';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('✓ PWNED', node.x, node.y - node.r - 7);
        } else if (isScanned && !isLocked) {
          ctx.fillStyle = 'rgba(0,150,255,0.6)';
          ctx.font = '7px monospace';
          ctx.fillText('● SCANNÉ', node.x, node.y - node.r - 5);
        }

        // Difficulty corner dot (top-right vertex of hex)
        if (node.difficulty && !isLocked) {
          const dotA = -Math.PI / 6;
          const dotX = node.x + (node.r - 5) * Math.cos(dotA);
          const dotY = node.y + (node.r - 5) * Math.sin(dotA);
          ctx.fillStyle = DIFF_COLOR[node.difficulty];
          ctx.shadowColor = DIFF_COLOR[node.difficulty];
          ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(dotX, dotY, 4, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Active pulse rings
        if (isActive) {
          const frame = t % 50;
          const alpha = Math.max(0, 0.45 - frame * 0.009);
          const r = node.r + 6 + frame * 0.8;
          ctx.strokeStyle = `rgba(255,102,0,${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); ctx.stroke();
        }
      });

      // ── GHOST ─────────────────────────────────────────────
      const cp  = charPos.current;
      const bob = Math.sin(t * 0.09) * 1.5;

      // Radial halo
      const halo = ctx.createRadialGradient(cp.x, cp.y, 0, cp.x, cp.y, 34);
      halo.addColorStop(0, 'rgba(0,255,65,0.2)');
      halo.addColorStop(1, 'rgba(0,255,65,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cp.x, cp.y, 34, 0, Math.PI * 2); ctx.fill();

      // Rotating dashed ring
      ctx.save();
      ctx.translate(cp.x, cp.y);
      ctx.rotate(t * 0.03);
      ctx.strokeStyle = 'rgba(0,255,65,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.arc(0, 0, 20 + Math.sin(t * 0.05) * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Char emoji with walk animation
      const frame = isMoving ? WALK_FRAMES[Math.floor(t / 8) % WALK_FRAMES.length] : (playerEmoji || '🧑‍💻');
      ctx.shadowColor = '#00ff41';
      ctx.shadowBlur = 14;
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(frame, cp.x, cp.y - 4 + bob);
      ctx.shadowBlur = 0;

      // Name label
      if (hackerName) {
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = 'rgba(0,255,65,0.75)';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(hackerName, cp.x, cp.y + 16 + bob);
      }

      // ── Vignette ──────────────────────────────────────────
      const vig = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.28, CW / 2, CH / 2, CH * 0.88);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,10,0.6)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, CW, CH);

      // ── Top header ──────────────────────────────────────────
      ctx.fillStyle = 'rgba(0,9,26,0.9)';
      ctx.fillRect(0, 0, CW, 15);
      ctx.fillStyle = 'rgba(0,170,255,0.45)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('📡  NEXUS CITY — 192.168.1.0/24  |  Machines pwned : ' + pwned.length + '/4', 8, 10);

      // ── Legend ──────────────────────────────────────────────
      ctx.fillStyle = 'rgba(0,9,26,0.9)';
      ctx.fillRect(0, CH - 17, CW, 17);
      const legend = [
        { c: '#003366aa', label: 'Inconnu' },
        { c: '#0088cc',   label: 'Scanné' },
        { c: '#ff6600',   label: 'Actif' },
        { c: '#00ff41',   label: 'Pwned' },
        { c: '#1a1a2a',   label: 'Verr.' },
      ];
      let lx = 8;
      const ly = CH - 9;
      legend.forEach(({ c, label }) => {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(lx + 4, ly - 1, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#224466';
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(label, lx + 11, ly + 3);
        lx += label.length * 4.6 + 22;
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [pwned, scanned, unlocked, activeId, hackerName, playerEmoji]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#00091a', overflow: 'hidden' }}>
      <canvas ref={canvasRef} width={CW} height={CH}
        style={{ display: 'block', width: '100%', height: '100%' }} />
      {floats.map(f => (
        <div key={f.id} style={{
          position: 'absolute', top: '30px', left: '50%',
          transform: 'translateX(-50%)',
          color: f.color, fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold',
          textShadow: `0 0 10px ${f.color}`, pointerEvents: 'none',
          animation: 'floatUp 1.4s ease-out forwards', zIndex: 10, whiteSpace: 'nowrap',
        }}>{f.text}</div>
      ))}
    </div>
  );
}
