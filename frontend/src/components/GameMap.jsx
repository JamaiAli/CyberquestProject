import { useEffect, useRef, useState, useCallback } from 'react';
import {
  TILE_SIZE as S, MAP_COLS, MAP_ROWS,
  NETWORK_MAP, MACHINE_POSITIONS, TILE, GHOST_SPAWN,
} from '../map.js';

const CW = MAP_COLS * S; // 960
const CH = MAP_ROWS * S; // 672

// Cable routes in pixel space, following the corridor paths
const CABLES = [
  { from: 'kali',       to: 'webserver',  pts: [[480,144],[480,216],[168,216],[168,288]] },
  { from: 'kali',       to: 'mailserver', pts: [[480,144],[480,216],[744,216],[744,288]] },
  { from: 'webserver',  to: 'aicore',     pts: [[168,384],[168,216],[480,216],[480,432]] },
  { from: 'mailserver', to: 'aicore',     pts: [[744,384],[744,216],[480,216],[480,432]] },
];

const DIFF_COLOR = { easy: '#00cc55', medium: '#ccaa00', hard: '#cc2200' };

// ── Utilities ────────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }

function pointOnPolyline(pts, prog) {
  let total = 0;
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    segs.push({ ax, ay, bx, by, len, start: total });
    total += len;
  }
  const d = prog * total;
  for (const s of segs) {
    if (d <= s.start + s.len) {
      const tt = s.len ? (d - s.start) / s.len : 0;
      return [lerp(s.ax, s.bx, tt), lerp(s.ay, s.by, tt)];
    }
  }
  return pts[pts.length - 1];
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

function drawChamferRect(ctx, x, y, w, h, cut) {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x + cut, y + h);
  ctx.lineTo(x, y + h - cut);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
}

function drawRoadDash(ctx, x1, y1, x2, y2) {
  ctx.strokeStyle = 'rgba(0,80,170,0.14)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 10]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
}

function drawCable(ctx, cable, pwned, scanned, t) {
  const { from, to, pts } = cable;
  const alive  = from === 'kali' || pwned.includes(from);
  const active = alive && (scanned.includes(to) || pwned.includes(to));
  const comp   = pwned.includes(to);

  ctx.save();
  ctx.shadowColor = comp ? '#00f0ff' : active ? '#0099ff' : 'transparent';
  ctx.shadowBlur  = comp ? 12 : active ? 7 : 0;
  ctx.strokeStyle = comp
    ? 'rgba(0,255,65,0.8)'
    : active ? 'rgba(0,150,255,0.6)'
    : 'rgba(0,55,130,0.22)';
  ctx.lineWidth = comp ? 3 : active ? 2 : 1.5;
  ctx.setLineDash(active ? [] : [5, 9]);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Animated data particles
  if (active) {
    const n = comp ? 5 : 2;
    const col = comp ? '#00f0ff' : '#44aaff';
    for (let i = 0; i < n; i++) {
      const p = ((t * 0.011 + i / n) % 1);
      const [px, py] = pointOnPolyline(pts, p);
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = comp ? 'rgba(0,255,65,0.13)' : 'rgba(68,170,255,0.1)'; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
    }
  }
}



// ── Building renderers ───────────────────────────────────────────────────────

function drawKali(ctx, pos, t, hackerName) {
  const x = pos.col * S, y = pos.row * S, w = pos.w * S, h = pos.h * S;
  const p = 0.75 + Math.sin(t * 0.06) * 0.25;

  ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 22 * p;
  ctx.fillStyle = 'rgba(0, 15, 20, 0.9)';
  drawChamferRect(ctx, x, y, w, h, 8); ctx.fill();
  
  // Outer glowing border
  ctx.strokeStyle = `rgba(0, 240, 255, ${0.75 * p})`; ctx.lineWidth = 2; ctx.stroke();
  
  // Inner subtle border
  ctx.strokeStyle = `rgba(0, 240, 255, ${0.3 * p})`; ctx.lineWidth = 1;
  drawChamferRect(ctx, x + 4, y + 4, w - 8, h - 8, 4); ctx.stroke();
  ctx.shadowBlur = 0;

  // Decorative corner brackets
  ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 2, y + 15); ctx.lineTo(x - 2, y - 2); ctx.lineTo(x + 15, y - 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w + 2, y + h - 15); ctx.lineTo(x + w + 2, y + h + 2); ctx.lineTo(x + w - 15, y + h + 2); ctx.stroke();

  // Circuit board lines inside
  ctx.strokeStyle = 'rgba(0,255,65,0.1)'; ctx.lineWidth = 0.8;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(x + (i * w) / 4, y + 5); ctx.lineTo(x + (i * w) / 4, y + h - 5); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(x + 5, y + h / 2); ctx.lineTo(x + w - 5, y + h / 2); ctx.stroke();

  // Screen glow
  const sg = ctx.createRadialGradient(x + w / 2, y + h * 0.38, 0, x + w / 2, y + h * 0.38, 30);
  sg.addColorStop(0, `rgba(0,255,65,${0.2 * p})`); sg.addColorStop(1, 'rgba(0,255,65,0)');
  ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);

  ctx.font = '20px Orbitron, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('💻', x + w / 2, y + h / 2 - 11);
  ctx.font = 'bold 10px Orbitron, sans-serif'; ctx.fillStyle = `rgba(0,240,255,${p})`; ctx.textBaseline = 'alphabetic';
  ctx.fillText('KALI_BASE', x + w / 2, y + h / 2 + 6);
  if (hackerName) {
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(0,200,50,0.5)';
    ctx.fillText(hackerName, x + w / 2, y + h / 2 + 14);
  }

  // Blinking LED top-right corner
  const on = Math.floor(t / 20) % 2 === 0;
  ctx.beginPath(); ctx.arc(x + w - 10, y + 9, 4, 0, Math.PI * 2);
  ctx.fillStyle = on ? '#00f0ff' : '#002210';
  ctx.shadowColor = on ? '#00f0ff' : 'transparent'; ctx.shadowBlur = on ? 8 : 0;
  ctx.fill(); ctx.shadowBlur = 0;
}

function drawServer(ctx, id, pos, state, t) {
  const x = pos.col * S, y = pos.row * S, w = pos.w * S, h = pos.h * S;
  const { pwned, scanned, locked, active, nearby } = state;
  const p = 0.75 + Math.sin(t * 0.05) * 0.25;

  const theme = {
    webserver:  { fill: '#000d1a', line: '#0066cc', glow: '#0099ff' },
    mailserver: { fill: '#0e0800', line: '#995500', glow: '#ffaa00' },
    aicore:     { fill: '#001a08', line: '#007a20', glow: '#00f0ff' },
  };
  const c = theme[id] || theme.webserver;
  const accentColor = active ? '#ff6600' : nearby ? '#ffcc00' : null;

  // Shadow glow
  ctx.shadowColor = locked ? 'transparent'
    : accentColor || (pwned ? '#00f0ff' : scanned ? c.glow : nearby ? c.glow : c.line);
  ctx.shadowBlur = locked ? 0 : accentColor ? 22 * p : pwned ? 18 * p : scanned ? 10 * p : nearby ? 14 * p : 4;

  // Body Background
  ctx.fillStyle = locked ? '#04080c'
    : pwned ? 'rgba(0, 30, 40, 0.9)' : active ? 'rgba(20, 5, 10, 0.9)' : nearby ? 'rgba(15, 15, 0, 0.9)' : c.fill;
  drawChamferRect(ctx, x, y, w, h, 6); ctx.fill();
  
  // Outer Border
  const bColor = locked ? '#101820'
    : accentColor || (pwned ? '#00f0ff' : scanned ? c.line + 'aa' : c.line + '44');
  ctx.strokeStyle = bColor;
  ctx.lineWidth = (active || nearby) ? 2 : 1.5;
  ctx.stroke(); ctx.shadowBlur = 0;

  // Inner Technical Border
  if (!locked) {
    ctx.strokeStyle = (pwned || active) ? `${bColor.substring(0, 7)}44` : c.line + '22';
    ctx.lineWidth = 1;
    drawChamferRect(ctx, x + 3, y + 3, w - 6, h - 6, 4); ctx.stroke();
    
    // Cyberpunk Edge Notches
    ctx.fillStyle = bColor;
    ctx.fillRect(x + w / 2 - 10, y - 1, 20, 3); // top notch
    ctx.fillRect(x + w / 2 - 10, y + h - 2, 20, 3); // bottom notch
    ctx.fillRect(x - 1, y + h / 2 - 6, 3, 12); // left notch
    ctx.fillRect(x + w - 2, y + h / 2 - 6, 3, 12); // right notch
  }

  // Static noise on locked machines
  if (locked) {
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`;
      ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 2, 1);
    }
  }

  // Roof detail per type
  if (!locked) {
    if (id === 'webserver') {
      const ax = x + w / 2, ay = y + 9;
      ctx.strokeStyle = pwned ? '#00f0ff' : c.line + '99'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, y + h - 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax - 12, ay + 7); ctx.lineTo(ax + 12, ay + 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax - 7,  ay + 2); ctx.lineTo(ax + 7,  ay + 2); ctx.stroke();
      const blinkOn = Math.floor(t / 14) % 2 === 0 || pwned;
      ctx.beginPath(); ctx.arc(ax, ay, 3, 0, Math.PI * 2);
      ctx.fillStyle = pwned ? '#00f0ff' : blinkOn ? 'rgba(0,150,255,0.8)' : 'rgba(0,50,100,0.4)'; ctx.fill();
    }
    if (id === 'mailserver') {
      const ex = x + 14, ey = y + 10, ew = w - 28, eh = 22;
      ctx.strokeStyle = pwned ? '#00f0ff' : c.line + '88'; ctx.lineWidth = 1.2;
      ctx.strokeRect(ex, ey, ew, eh);
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + ew / 2, ey + eh * 0.55); ctx.lineTo(ex + ew, ey); ctx.stroke();
    }
    if (id === 'dbserver') {
      [[x + w * 0.3, y + h * 0.38], [x + w * 0.7, y + h * 0.38]].forEach(([cx, cy]) => {
        ctx.beginPath(); ctx.ellipse(cx, cy, 13, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = pwned ? 'rgba(0,255,65,0.09)' : 'rgba(100,0,180,0.12)'; ctx.fill();
        ctx.strokeStyle = pwned ? '#00f0ff' : c.line + '77'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx, cy - 5, 13, 5, 0, 0, Math.PI * 2); ctx.stroke();
      });
    }
    if (id === 'dc') {
      [[x + 2, y + 2],[x + w - 10, y + 2],[x + 2, y + h - 10],[x + w - 10, y + h - 10]].forEach(([tx, ty]) => {
        ctx.fillStyle = pwned ? 'rgba(0,255,65,0.15)' : 'rgba(180,0,0,0.22)'; ctx.fillRect(tx, ty, 8, 8);
        ctx.strokeStyle = pwned ? '#00f0ff' : c.line; ctx.lineWidth = 1; ctx.strokeRect(tx, ty, 8, 8);
      });
      ctx.strokeStyle = pwned ? '#00f0ffaa' : c.line + '55'; ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]); ctx.strokeRect(x + 12, y + 10, w - 24, h - 20); ctx.setLineDash([]);
      const dr = 18 + Math.sin(t * 0.08) * 5;
      ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, dr, 0, Math.PI * 2);
      ctx.strokeStyle = pwned ? 'rgba(0,255,65,0.2)' : `rgba(200,0,0,${0.15 + Math.sin(t * 0.08) * 0.1})`;
      ctx.lineWidth = 2; ctx.stroke();
    }
  }

  // Icon
  ctx.font = `${pos.type === 'boss' ? 20 : 16}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(locked ? '🔒' : pos.icon, x + w / 2, y + h / 2 - 10);

  // Name
  ctx.font = 'bold 9px Orbitron, sans-serif'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = locked ? '#1a2530'
    : pwned ? '#00f0ff' : active ? '#ff007f' : nearby ? '#ffcc44' : scanned ? c.glow : '#445566';
  ctx.fillText(locked ? '???' : pos.name.toUpperCase(), x + w / 2, y + h / 2 + 6);

  // IP
  ctx.font = '8px Rajdhani, monospace'; ctx.fillStyle = locked ? '#0a0f14' : '#2a3a45';
  ctx.fillText(locked ? '???.???.???.???' : pos.ip, x + w / 2, y + h / 2 + 16);

  // Status badge above building
  if (pwned) {
    ctx.font = 'bold 7px monospace'; ctx.fillStyle = 'rgba(0,255,65,0.9)'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('✓ PWNED', x + w / 2, y - 4);
  } else if (scanned && !locked) {
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(0,160,255,0.8)';
    ctx.fillText('◉ SCANNÉ', x + w / 2, y - 4);
  }

  // Difficulty dot top-right
  if (pos.difficulty && !locked) {
    ctx.fillStyle = DIFF_COLOR[pos.difficulty]; ctx.shadowColor = DIFF_COLOR[pos.difficulty]; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(x + w - 8, y + 8, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Active scan pulse rings
  if (active) {
    const pr = (t % 60) * 0.45;
    ctx.strokeStyle = `rgba(255,100,0,${Math.max(0, 0.4 - pr * 0.007)})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - pr * 0.3, y - pr * 0.3, w + pr * 0.6, h + pr * 0.6);
  }
}

function drawGhost(ctx, pos, isMoving, emoji, name, t) {
  const { x, y } = pos;

  // Ground shadow
  ctx.fillStyle = 'rgba(0,255,65,0.07)';
  ctx.beginPath(); ctx.ellipse(x, y + 13, 12, 5, 0, 0, Math.PI * 2); ctx.fill();

  // Radial halo
  const halo = ctx.createRadialGradient(x, y, 0, x, y, 26);
  halo.addColorStop(0, 'rgba(0,255,65,0.22)'); halo.addColorStop(1, 'rgba(0,255,65,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();

  // Rotating dashed ring
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.035);
  ctx.strokeStyle = 'rgba(0,255,65,0.45)'; ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath(); ctx.arc(0, 0, 16 + Math.sin(t * 0.08) * 2, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  // Walk animation
  const frames = isMoving ? ['🧑‍💻', '🏃'] : [emoji || '🧑‍💻'];
  ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 14;
  ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(frames[Math.floor(t / 8) % frames.length], x, y - 2);
  ctx.shadowBlur = 0;

  if (name) {
    ctx.font = 'bold 7px monospace'; ctx.fillStyle = 'rgba(0,255,65,0.7)'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(name, x, y + 22);
  }
}

function drawBubble(ctx, charPos, machinePos, isLocked) {
  const { x, y } = charPos;
  const connectCmds = {
    webserver:  `python3 exploit.py ${machinePos.ip}`,
    mailserver: `ssh admin@${machinePos.ip}`,
    dbserver:   `mysql -h ${machinePos.ip} -u db_user`,
    dc:         `evil-winrm -i ${machinePos.ip}`,
  };
  const txt = isLocked ? '🔒 Prérequis manquants' : `▶ ${connectCmds[machinePos.id] || machinePos.ip}`;
  const color = isLocked ? '#ff4444' : '#ffcc00';
  ctx.font = '9px monospace';
  const tw = ctx.measureText(txt).width + 18;
  const bh = 16, by = y - 38;

  // Pointer tail
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.beginPath(); ctx.moveTo(x - 5, by + bh); ctx.lineTo(x, by + bh + 8); ctx.lineTo(x + 5, by + bh); ctx.fill();

  // Box
  ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x - tw / 2, by, tw, bh, 3); ctx.fill(); ctx.stroke();

  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, x, by + bh / 2);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GameMap({ gameState, isAllCleared, effect, hackerName, playerEmoji, ghostTileRef, nearbyMachineRef }) {
  const canvasRef = useRef(null);
  const tickRef   = useRef(0);
  const charPos   = useRef({ x: GHOST_SPAWN.col * S + S / 2, y: GHOST_SPAWN.row * S + S / 2 });
  const animRef   = useRef(null);

  // Use a ref for gameState to avoid resetting the rAF loop on every React render
  const gsRef = useRef({ pwned: [], scanned: [], unlocked: [], activeId: null, isAllCleared: false });
  useEffect(() => {
    const unlockedList = [...(gameState?.unlockedMachines || ['webserver', 'mailserver'])];
    if (isAllCleared) unlockedList.push('mainframe');

    gsRef.current = {
      pwned:    gameState?.pwnedMachines    || [],
      scanned:  gameState?.scannedMachines  || [],
      unlocked: unlockedList,
      activeId: gameState?.currentMachine?.id || null,
      isAllCleared: isAllCleared,
    };
  }, [gameState?.pwnedMachines, gameState?.scannedMachines,
      gameState?.unlockedMachines, gameState?.currentMachine?.id, isAllCleared]);

  const [floats, setFloats] = useState([]);
  const addFloat = useCallback((text, color) => {
    const id = Date.now() + Math.random();
    setFloats(f => [...f, { id, text, color }]);
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1500);
  }, []);

  useEffect(() => {
    if (!effect) return;
    const ev = {
      ENTER_MACHINE:  [effect.machine?.name ? `⚡ ${effect.machine.name}` : '⚡', '#ff8800'],
      EXIT_MACHINE:   ['← Réseau', '#00ffff'],
      FLAG_FOUND:     ['🚩 FLAG !', '#ffd700'],
      PHASE_COMPLETE: ['✅ Phase OK', '#00f0ff'],
      ROOT_OBTAINED:  ['👑 ROOT !', '#ff4444'],
      SCAN_NETWORK:   ['📡 Cartographié', '#00ffff'],
    }[effect.type];
    if (ev) addFloat(...ev);
  }, [effect, addFloat]);

  // Single long-running animation loop — never restarts, reads state via refs
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      tickRef.current++;
      const t = tickRef.current;
      const { pwned, scanned, unlocked, activeId, isAllCleared: loopIsAllCleared } = gsRef.current;
      const tile   = ghostTileRef?.current  || GHOST_SPAWN;
      const nearby = nearbyMachineRef?.current || null;

      // Lerp character to target tile
      const tgtX = tile.col * S + S / 2;
      const tgtY = tile.row * S + S / 2;
      charPos.current.x = lerp(charPos.current.x, tgtX, 0.18);
      charPos.current.y = lerp(charPos.current.y, tgtY, 0.18);
      const isMoving = Math.hypot(tgtX - charPos.current.x, tgtY - charPos.current.y) > 2;

      // ── 1. Background ────────────────────────────────────────────────────
      ctx.fillStyle = '#020205';
      ctx.fillRect(0, 0, CW, CH);

      // ── 2. Floor tiles (lit asphalt corridors) ───────────────────────────
      NETWORK_MAP.forEach((row, r) => {
        row.forEach((cell, c) => {
          let isFloor = cell === TILE.FLOOR;
          if (loopIsAllCleared && (c === 7 || c === 12) && (r >= 9 && r <= 11)) {
            isFloor = true;
          }

          if (!isFloor) return;
          const px = c * S, py = r * S;
          ctx.fillStyle = 'rgba(0, 20, 30, 0.4)';
          ctx.fillRect(px, py, S, S);
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)'; ctx.lineWidth = 1;
          ctx.strokeRect(px + 1, py + 1, S - 2, S - 2);
        });
      });

      // ── 3. Cyberpunk Hex Grid & Particles ────────────────────────────────
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)'; ctx.lineWidth = 1;
      const hexR = 22;
      const dy = hexR * 1.5;
      const dx = hexR * Math.sqrt(3);
      ctx.beginPath();
      for (let y = 0; y < CH + hexR; y += dy) {
        for (let x = 0; x < CW + dx; x += dx) {
          const cx = x + ((y / dy) % 2 === 0 ? 0 : dx / 2);
          for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i;
            const px = cx + hexR * Math.cos(angle);
            const py = y + hexR * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        }
      }
      ctx.stroke();

      // Data particles
      ctx.fillStyle = 'rgba(255, 0, 127, 0.5)';
      for (let i = 0; i < 50; i++) {
        const px = ((i * 137 + t * 0.1) % CW);
        const py = ((i * 251 - t * 0.3 + CH) % CH);
        ctx.beginPath(); ctx.arc(px, py, i % 3 === 0 ? 1.5 : 0.8, 0, Math.PI * 2); ctx.fill();
      }

      // ── 4. Road center-dashes on corridors ──────────────────────────────
      drawRoadDash(ctx, 3 * S,          4 * S + S / 2, 16 * S,         4 * S + S / 2); // horizontal highway
      drawRoadDash(ctx, 9 * S + S / 2,  3 * S,         9 * S + S / 2,  9 * S);          // central vertical
      drawRoadDash(ctx, 3 * S + S / 2,  4 * S,         3 * S + S / 2,  6 * S);          // left branch
      drawRoadDash(ctx, 15 * S + S / 2, 4 * S,         15 * S + S / 2, 6 * S);          // right branch
      drawRoadDash(ctx, 9 * S + S / 2,  8 * S,         9 * S + S / 2,  11 * S);         // bypass+firewall top
      drawRoadDash(ctx, 7 * S + S / 2,  11 * S,        7 * S + S / 2,  14 * S);         // left bypass DC
      drawRoadDash(ctx, 12 * S + S / 2, 11 * S,        12 * S + S / 2, 14 * S);         // right bypass DC

      // ── 5. Network cables ────────────────────────────────────────────────
      CABLES.forEach(cable => drawCable(ctx, cable, pwned, scanned, t));

      // ── 7. Buildings ─────────────────────────────────────────────────────
      Object.entries(MACHINE_POSITIONS).forEach(([id, pos]) => {
        if (id === 'kali') {
          drawKali(ctx, pos, t, hackerName);
          return;
        }
        drawServer(ctx, id, pos, {
          pwned:   pwned.includes(id),
          scanned: scanned.includes(id),
          locked:  !unlocked.includes(id),
          active:  activeId === id,
          nearby:  nearby === id,
        }, t);
      });

      // ── 8. GHOST ─────────────────────────────────────────────────────────
      drawGhost(ctx, charPos.current, isMoving, playerEmoji, hackerName, t);

      // ── 9. Interaction bubble ─────────────────────────────────────────────
      if (nearby && nearby !== 'kali') {
        const mp = MACHINE_POSITIONS[nearby];
        if (mp) drawBubble(ctx, charPos.current, mp, !unlocked.includes(nearby));
      }

      // ── 10. Vignette ─────────────────────────────────────────────────────
      const vig = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.25, CW / 2, CH / 2, CH * 0.9);
      vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,10,0.62)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, CW, CH);



      // ── 12. Bottom hint ───────────────────────────────────────────────────
      ctx.fillStyle = 'rgba(0,2,10,0.85)'; ctx.fillRect(0, CH - 14, CW, 14);
      ctx.fillStyle = 'rgba(0,90,180,0.45)'; ctx.font = '7px monospace';
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText('↑ ↓ ← →  déplacer GHOST   ·   taper commandes dans le terminal', 8, CH - 7);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []); // empty — all live values read through refs

  return (
    <div style={{ width: '100%', height: '100%', background: '#00040e', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} width={CW} height={CH}
        style={{ display: 'block', width: '100%', height: '100%' }} />
      {floats.map(f => (
        <div key={f.id} style={{
          position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)',
          color: f.color, fontFamily: 'monospace', fontSize: '11px', fontWeight: 'bold',
          textShadow: `0 0 8px ${f.color}`, pointerEvents: 'none',
          animation: 'floatUp 1.4s ease-out forwards', whiteSpace: 'nowrap', zIndex: 10,
        }}>{f.text}</div>
      ))}
    </div>
  );
}
