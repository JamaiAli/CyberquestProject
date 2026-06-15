import { useEffect, useRef, useState, useCallback } from 'react';

const CW = 800, CH = 578;

// Room definitions — cx/cy = center, rw/rh = half-dimensions
const ROOMS = [
  {
    id: 'hub', name: 'Kali Linux', sub: 'attacker — 10.0.0.1',
    icon: '💻', cx: 400, cy: 45, rw: 70, rh: 30,
    type: 'hub', connects: ['webserver', 'mailserver'],
    floor: '#0a180a', wall: '#1e5a1e', locked: false,
  },
  {
    id: 'firewall', name: 'Firewall', sub: '192.168.1.1',
    icon: '🔥', cx: 400, cy: 148, rw: 78, rh: 36,
    type: 'firewall', connects: [], locked: true,
    floor: '#180808', wall: '#4a1a1a',
  },
  {
    id: 'webserver', name: 'Web Server', sub: '192.168.1.10',
    icon: '🌐', cx: 185, cy: 318, rw: 94, rh: 62,
    type: 'server', difficulty: 'easy', connects: ['dbserver'], locked: false,
    floor: '#080e1a', wall: '#18304a',
  },
  {
    id: 'mailserver', name: 'Mail Server', sub: '192.168.1.20',
    icon: '📧', cx: 615, cy: 318, rw: 94, rh: 62,
    type: 'server', difficulty: 'medium', connects: ['dbserver'], locked: false,
    floor: '#0e081a', wall: '#2a1848',
  },
  {
    id: 'dbserver', name: 'DB Server', sub: '192.168.1.30',
    icon: '🗄', cx: 400, cy: 450, rw: 94, rh: 62,
    type: 'server', difficulty: 'medium', connects: ['dc'], locked: true,
    floor: '#1a0e08', wall: '#483020',
  },
  {
    id: 'dc', name: 'Domain Controller', sub: '192.168.1.100',
    icon: '👑', cx: 400, cy: 546, rw: 106, rh: 46,
    type: 'boss', difficulty: 'hard', connects: [], locked: true,
    floor: '#16001a', wall: '#4a0060',
  },
];

const DIFF_COL = { easy: '#00aa44', medium: '#aaaa00', hard: '#cc3300' };
const CORRIDORS = [
  ['hub','webserver'], ['hub','mailserver'],
  ['webserver','dbserver'], ['mailserver','dbserver'],
  ['dbserver','dc'],
];

function lerp(a, b, t) { return a + (b - a) * t; }

export default function GameMap({ gameState, effect }) {
  const canvasRef = useRef(null);
  const charPos   = useRef({ x: 400, y: 45 });
  const charDst   = useRef({ x: 400, y: 45 });
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
      const r = ROOMS.find(x => x.id === effect.machine.id);
      if (r) { charDst.current = { x: r.cx, y: r.cy }; }
      addFloat(`⚡ → ${effect.machine.name}`, '#ff8800');
    }
    if (effect.type === 'EXIT_MACHINE') {
      charDst.current = { x: 400, y: 45 };
      addFloat('← Réseau', '#00ffff');
    }
    if (effect.type === 'FLAG_FOUND') addFloat(`🚩 FLAG!`, '#ffd700');
    if (effect.type === 'PHASE_COMPLETE') addFloat('✅ Phase complétée', '#00ff41');
    if (effect.type === 'ROOT_OBTAINED') addFloat('👑 ROOT OBTENU !', '#ff4444');
    if (effect.type === 'SCAN_NETWORK') addFloat('📡 Réseau cartographié', '#00ffff');
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

      // Smooth char movement
      charPos.current.x = lerp(charPos.current.x, charDst.current.x, 0.09);
      charPos.current.y = lerp(charPos.current.y, charDst.current.y, 0.09);

      // ── Background ─────────────────────────────────────
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, CW, CH);

      // Dot grid
      ctx.fillStyle = '#0b0b14';
      for (let gx = 0; gx < CW; gx += 24)
        for (let gy = 0; gy < CH; gy += 24)
          ctx.fillRect(gx, gy, 1, 1);

      // ── Corridors ──────────────────────────────────────
      CORRIDORS.forEach(([aId, bId]) => {
        const a = ROOMS.find(r => r.id === aId);
        const b = ROOMS.find(r => r.id === bId);
        if (!a || !b) return;

        const bLocked = b.locked && !unlocked.includes(b.id);
        const aPwned  = pwned.includes(a.id) && pwned.includes(b.id);
        const aActive = activeId === aId || activeId === bId;

        // Hallway — two parallel lines
        const dx = b.cx - a.cx, dy = b.cy - a.cy;
        const len = Math.hypot(dx, dy);
        const nx = -dy / len * 6, ny = dx / len * 6;  // normal offset for width

        ctx.fillStyle = bLocked ? '#0d0d10' : aPwned ? '#00ff4110' : aActive ? '#ff660012' : '#14141e';
        ctx.beginPath();
        ctx.moveTo(a.cx + nx, a.cy + ny);
        ctx.lineTo(b.cx + nx, b.cy + ny);
        ctx.lineTo(b.cx - nx, b.cy - ny);
        ctx.lineTo(a.cx - nx, a.cy - ny);
        ctx.closePath();
        ctx.fill();

        // Hallway walls
        ctx.strokeStyle = bLocked ? '#111' : aPwned ? '#00ff4130' : '#1e1e28';
        ctx.lineWidth = 1;
        ctx.setLineDash(bLocked ? [4, 8] : []);
        ctx.beginPath(); ctx.moveTo(a.cx + nx, a.cy + ny); ctx.lineTo(b.cx + nx, b.cy + ny); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.cx - nx, a.cy - ny); ctx.lineTo(b.cx - nx, b.cy - ny); ctx.stroke();
        ctx.setLineDash([]);
      });

      // ── Rooms ──────────────────────────────────────────
      ROOMS.forEach(room => {
        const rx = room.cx - room.rw, ry = room.cy - room.rh;
        const rw = room.rw * 2,      rh = room.rh * 2;

        const isLocked  = room.locked && !unlocked.includes(room.id);
        const isPwned   = pwned.includes(room.id);
        const isScanned = scanned.includes(room.id);
        const isActive  = activeId === room.id;
        const isHub     = room.id === 'hub' && !activeId;
        const pulse     = 0.82 + Math.sin(t * 0.06) * 0.18;

        // — Floor —
        let floorC = isLocked ? '#080808' : isPwned ? '#021002' : isScanned ? '#120c00' : isActive ? '#0e0800' : room.floor;
        ctx.fillStyle = floorC;
        ctx.fillRect(rx, ry, rw, rh);

        // Floor tiles
        ctx.strokeStyle = 'rgba(255,255,255,0.025)';
        ctx.lineWidth = 0.5;
        const TS = 14;
        for (let gx = rx + TS; gx < rx + rw; gx += TS) { ctx.beginPath(); ctx.moveTo(gx, ry); ctx.lineTo(gx, ry + rh); ctx.stroke(); }
        for (let gy = ry + TS; gy < ry + rh; gy += TS) { ctx.beginPath(); ctx.moveTo(rx, gy); ctx.lineTo(rx + rw, gy); ctx.stroke(); }

        // — Walls —
        let wallC = isLocked ? '#1a1a1a' : isPwned ? '#00aa44' : isScanned ? '#664400' : isActive ? '#ff8800' : room.wall;
        const glowC = isActive ? '#ff6600' : isPwned ? '#00ff41' : isHub ? '#00ff4166' : null;
        if (glowC) { ctx.shadowColor = glowC; ctx.shadowBlur = 16 * pulse; }

        ctx.strokeStyle = wallC;
        ctx.lineWidth = isActive ? 2.5 : 2;
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.shadowBlur = 0;

        // Corner accents
        const cs = 6;
        [[rx,ry],[rx+rw,ry],[rx,ry+rh],[rx+rw,ry+rh]].forEach(([cx2,cy2]) => {
          const sx = cx2 === rx ? 1 : -1, sy = cy2 === ry ? 1 : -1;
          ctx.strokeStyle = wallC;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(cx2 + sx*cs, cy2); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 + sy*cs); ctx.stroke();
        });

        // — Interior content —

        // Icon
        ctx.shadowBlur = 0;
        const iconSize = room.type === 'hub' ? 14 : 18;
        ctx.font = `${iconSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isLocked ? '🔒' : room.icon, room.cx, room.cy - (room.rh < 40 ? 8 : 14));

        // Name
        ctx.font = `bold 9px monospace`;
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = isPwned ? '#00ff41' : isLocked ? '#2a2a2a' : isActive ? '#ffaa44' : isScanned ? '#ccaa44' : '#888';
        ctx.fillText(isLocked ? '???' : room.name, room.cx, room.cy + (room.rh < 40 ? 4 : 2));

        // Sub / IP
        if (room.rh >= 35) {
          ctx.font = '8px monospace';
          ctx.fillStyle = '#444';
          ctx.fillText(isLocked ? '???.???.???.???' : room.sub, room.cx, room.cy + 14);
        }

        // Difficulty
        if (room.difficulty && !isLocked && room.rh >= 50) {
          ctx.font = '7px monospace';
          ctx.fillStyle = DIFF_COL[room.difficulty] || '#555';
          ctx.fillText(`[${room.difficulty.toUpperCase()}]`, room.cx, room.cy + 25);
        }

        // Badges above room
        if (isPwned) {
          ctx.fillStyle = '#00ff4199';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('✓ PWNED', room.cx, ry - 5);
        } else if (isScanned && !isLocked) {
          ctx.fillStyle = '#aaaa0088';
          ctx.font = '7px monospace';
          ctx.fillText('● SCANNÉ', room.cx, ry - 5);
        }

        // Active ping rings
        if (isActive || isHub) {
          const maxR = Math.max(room.rw, room.rh) + 5;
          const frame = t % 40;
          const alpha = Math.max(0, 0.45 - frame * 0.011);
          const r = maxR + frame * 0.8;
          ctx.strokeStyle = `rgba(${isActive ? '255,102,0' : '0,255,65'},${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(room.cx, room.cy, r, r * (room.rh / room.rw), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // ── Character ──────────────────────────────────────
      const cp = charPos.current;
      const bob = Math.sin(t * 0.09) * 1.5;

      // Shadow under char
      ctx.fillStyle = 'rgba(0,255,65,0.08)';
      ctx.beginPath();
      ctx.ellipse(cp.x, cp.y + 9, 9, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Char emoji
      ctx.shadowColor = '#00ff41';
      ctx.shadowBlur = 12;
      ctx.font = '15px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧑‍💻', cp.x, cp.y - 5 + bob);
      ctx.shadowBlur = 0;

      // Blink indicator
      if (Math.floor(t / 18) % 2 === 0) {
        ctx.fillStyle = '#00ff41';
        ctx.beginPath();
        ctx.arc(cp.x, cp.y + 7 + bob, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Header bar ─────────────────────────────────────
      ctx.fillStyle = 'rgba(5,5,8,0.85)';
      ctx.fillRect(0, 0, CW, 14);
      ctx.fillStyle = '#00ff4155';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('📡  RÉSEAU CIBLE : CorpNet — 192.168.1.0/24  |  Machines pwned : ' + pwned.length + '/4', 8, 10);

      // ── Legend ─────────────────────────────────────────
      const legend = [
        { c: '#080e18', b: '#18304a', label: 'Inconnu' },
        { c: '#120c00', b: '#664400', label: 'Scanné' },
        { c: '#0e0800', b: '#ff8800', label: 'Actif' },
        { c: '#021002', b: '#00aa44', label: 'Pwned' },
        { c: '#080808', b: '#1a1a1a', label: 'Verrouillé' },
      ];
      let lx = 8;
      const ly = CH - 14;
      legend.forEach(({ c, b, label }) => {
        ctx.fillStyle = c; ctx.strokeStyle = b; ctx.lineWidth = 1;
        ctx.fillRect(lx, ly, 11, 8); ctx.strokeRect(lx, ly, 11, 8);
        ctx.fillStyle = '#555'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
        ctx.fillText(label, lx + 14, ly + 7);
        lx += label.length * 4.8 + 22;
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [pwned, scanned, unlocked, activeId]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#050508', overflow: 'hidden' }}>
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
