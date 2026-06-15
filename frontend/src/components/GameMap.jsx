import { useEffect, useRef, useState, useCallback } from 'react';
import { TILE_SIZE, MAP_COLS, MAP_ROWS, NETWORK_MAP, MACHINE_POSITIONS, CABLE_LINKS, TILE } from '../map.js';

const CW = MAP_COLS * TILE_SIZE; // 960
const CH = MAP_ROWS * TILE_SIZE; // 672

const DIFF_COLOR = { easy: '#00bb44', medium: '#bbaa00', hard: '#cc3300' };

function lerp(a, b, t) { return a + (b - a) * t; }

function tileCenter(col, row) {
  return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
}

// Compute L-shaped waypoints between two machine ports (bottom of A → top of B)
function cableWaypoints(fPos, tPos) {
  const ax = (fPos.col + fPos.w / 2) * TILE_SIZE;
  const ay = (fPos.row + fPos.h) * TILE_SIZE;
  const bx = (tPos.col + tPos.w / 2) * TILE_SIZE;
  const by = tPos.row * TILE_SIZE;
  const midY = (ay + by) / 2;
  return [[ax, ay], [ax, midY], [bx, midY], [bx, by]];
}

function pointOnPath(pts, progress) {
  let total = 0;
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    const dy = pts[i + 1][1] - pts[i][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segs.push({ i, dx, dy, len, cum: total });
    total += len;
  }
  if (!total) return pts[0];
  const d = progress * total;
  for (const s of segs) {
    if (d <= s.cum + s.len) {
      const t = s.len ? (d - s.cum) / s.len : 0;
      return [pts[s.i][0] + s.dx * t, pts[s.i][1] + s.dy * t];
    }
  }
  return pts[pts.length - 1];
}

export default function GameMap({ ghostTileRef, nearbyMachineRef, gameState, effect, hackerName, playerEmoji }) {
  const canvasRef = useRef(null);
  const charPos   = useRef(tileCenter(7, 4));
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
    if (effect.type === 'ENTER_MACHINE' && effect.machine) addFloat(`⚡ ${effect.machine.name}`, '#ff8800');
    if (effect.type === 'EXIT_MACHINE')   addFloat('← Réseau', '#00ffff');
    if (effect.type === 'FLAG_FOUND')     addFloat('🚩 FLAG !', '#ffd700');
    if (effect.type === 'PHASE_COMPLETE') addFloat('✅ Phase OK', '#00ff41');
    if (effect.type === 'ROOT_OBTAINED')  addFloat('👑 ROOT !', '#ff4444');
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

      // Lerp character pixel toward tile target
      const tile  = ghostTileRef?.current || { col: 7, row: 4 };
      const tgt   = tileCenter(tile.col, tile.row);
      charPos.current.x = lerp(charPos.current.x, tgt.x, 0.18);
      charPos.current.y = lerp(charPos.current.y, tgt.y, 0.18);
      const isMoving = Math.hypot(tgt.x - charPos.current.x, tgt.y - charPos.current.y) > 2;
      const nearby = nearbyMachineRef?.current || null;

      // ── Background ──────────────────────────────────────
      ctx.fillStyle = '#00091a';
      ctx.fillRect(0, 0, CW, CH);

      // Wall tiles
      NETWORK_MAP.forEach((row, r) => {
        row.forEach((tile, c) => {
          if (tile !== TILE.WALL) return;
          const x = c * TILE_SIZE, y = r * TILE_SIZE;
          ctx.fillStyle = '#03060f';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#08142a';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        });
      });

      // Floor grid
      ctx.strokeStyle = 'rgba(0,100,200,0.06)';
      ctx.lineWidth = 0.5;
      for (let c = 0; c <= MAP_COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c * TILE_SIZE, 0); ctx.lineTo(c * TILE_SIZE, CH); ctx.stroke();
      }
      for (let r = 0; r <= MAP_ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * TILE_SIZE); ctx.lineTo(CW, r * TILE_SIZE); ctx.stroke();
      }

      // ── Cables ──────────────────────────────────────────
      CABLE_LINKS.forEach(([fId, tId]) => {
        const fPos = MACHINE_POSITIONS[fId];
        const tPos = MACHINE_POSITIONS[tId];
        if (!fPos || !tPos) return;

        const tLocked   = !unlocked.includes(tId) && tId !== 'webserver' && tId !== 'mailserver';
        const pathPwned = pwned.includes(fId) && !tLocked;
        const pts = cableWaypoints(fPos, tPos);

        // Draw L-path
        ctx.strokeStyle = tLocked
          ? 'rgba(255,255,255,0.04)'
          : pathPwned
            ? 'rgba(0,255,65,0.28)'
            : 'rgba(0,130,220,0.15)';
        ctx.lineWidth = pathPwned ? 2.5 : 1.5;
        ctx.setLineDash(tLocked ? [4, 8] : []);
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated particles on compromised paths
        if (pathPwned) {
          for (let i = 0; i < 3; i++) {
            const prog = ((t * 0.013 + i / 3) % 1);
            const [px, py] = pointOnPath(pts, prog);
            ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,255,65,0.18)'; ctx.fill();
            ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff41'; ctx.fill();
          }
        }
      });

      // ── Machines ────────────────────────────────────────
      Object.entries(MACHINE_POSITIONS).forEach(([id, pos]) => {
        const x = pos.col * TILE_SIZE, y = pos.row * TILE_SIZE;
        const w = pos.w * TILE_SIZE,  h = pos.h * TILE_SIZE;

        const isLocked  = id !== 'kali' && !unlocked.includes(id);
        const isPwned   = id === 'kali' || pwned.includes(id);
        const isScanned = scanned.includes(id);
        const isActive  = activeId === id;
        const isNear    = nearby === id;
        const pulse     = 0.8 + Math.sin(t * 0.07) * 0.2;

        // Scan pulse ring
        if (isScanned && !isPwned) {
          const r = 28 + ((t * 1.2) % 50);
          const alpha = Math.max(0, 0.3 - r / 160);
          ctx.strokeStyle = `rgba(0,180,255,${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2); ctx.stroke();
        }

        // Glow
        if (isActive || isPwned || isNear) {
          ctx.shadowColor = isActive ? '#ff6600' : isNear ? '#ffaa00' : '#00ff41';
          ctx.shadowBlur  = 18 * pulse;
        }

        // Body
        const fills = { locked: '#050810', pwned: '#001600', active: '#1a0800', near: '#0f0e00', scanned: '#080f14', unknown: '#060c1a' };
        const fk = isLocked ? 'locked' : isPwned ? 'pwned' : isActive ? 'active' : isNear ? 'near' : isScanned ? 'scanned' : 'unknown';
        const borders = { locked: '#1a1a2a', pwned: '#00aa44', active: '#ff6600', near: '#ffaa00', scanned: '#0088cc', unknown: '#003366' };
        let bk = isLocked ? 'locked' : isPwned ? 'pwned' : isActive ? 'active' : isNear ? 'near' : isScanned ? 'scanned' : 'unknown';
        if (bk === 'unknown' && pos.difficulty) ctx.strokeStyle = DIFF_COLOR[pos.difficulty] + '66';
        else ctx.strokeStyle = borders[bk];

        ctx.fillStyle = fills[fk];
        ctx.lineWidth = (isActive || isNear) ? 2 : 1.5;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;

        // Interior texture lines
        ctx.strokeStyle = 'rgba(255,255,255,0.035)';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(x + 6, y + h / 2); ctx.lineTo(x + w - 6, y + h / 2); ctx.stroke();

        // Static noise on locked
        if (isLocked) {
          for (let i = 0; i < 18; i++) {
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
            ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 2, 2);
          }
        }

        // Icon
        ctx.font = `${pos.type === 'boss' ? 22 : 18}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(isLocked ? '🔒' : pos.icon, x + w / 2, y + h / 2 - 11);

        // Name
        ctx.font = 'bold 9px monospace'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = isPwned ? '#00ff41' : isLocked ? '#2a2a3a' : isActive ? '#ff9944' : isNear ? '#ffcc44' : isScanned ? '#44aaff' : '#336699';
        ctx.fillText(isLocked ? '???' : pos.name, x + w / 2, y + h / 2 + 4);

        // IP
        ctx.font = '8px monospace';
        ctx.fillStyle = isLocked ? '#111' : '#1a3a55';
        ctx.fillText(isLocked ? '???.???.???.???' : pos.ip, x + w / 2, y + h / 2 + 15);

        // Status badge
        if (isPwned && id !== 'kali') {
          ctx.fillStyle = 'rgba(0,255,65,0.85)'; ctx.font = 'bold 8px monospace';
          ctx.fillText('✓ PWNED', x + w / 2, y - 5);
        } else if (isScanned && !isLocked) {
          ctx.fillStyle = 'rgba(0,150,255,0.7)'; ctx.font = '7px monospace';
          ctx.fillText('● SCANNÉ', x + w / 2, y - 4);
        }

        // Difficulty dot (top-right corner)
        if (pos.difficulty && !isLocked) {
          ctx.fillStyle = DIFF_COLOR[pos.difficulty];
          ctx.shadowColor = DIFF_COLOR[pos.difficulty]; ctx.shadowBlur = 5;
          ctx.beginPath(); ctx.arc(x + w - 7, y + 7, 4, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Active pulse rect
        if (isActive) {
          const fr = t % 50;
          ctx.strokeStyle = `rgba(255,102,0,${Math.max(0, 0.35 - fr * 0.007)})`;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x - fr * 0.4, y - fr * 0.4, w + fr * 0.8, h + fr * 0.8);
        }

        // Interaction prompt bubble above machine
        if (isNear && id !== 'kali') {
          const promptX = x + w / 2;
          const promptY = y - 8;
          const txt = isLocked ? '🔒 Réseau inaccessible' : `▶ cd ${pos.ip}`;
          const col2 = isLocked ? '#ff4444' : '#ffcc00';
          ctx.font = '9px monospace';
          const tw = ctx.measureText(txt).width + 20;

          ctx.fillStyle = 'rgba(0,0,0,0.88)';
          ctx.strokeStyle = col2; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.roundRect(promptX - tw / 2, promptY - 16, tw, 16, 3); ctx.fill(); ctx.stroke();

          ctx.fillStyle = col2; ctx.textBaseline = 'middle';
          ctx.fillText(txt, promptX, promptY - 8);
        }
      });

      // ── GHOST ─────────────────────────────────────────────
      const cp = charPos.current;

      // Ground shadow
      ctx.fillStyle = 'rgba(0,255,65,0.07)';
      ctx.beginPath(); ctx.ellipse(cp.x, cp.y + 13, 13, 5, 0, 0, Math.PI * 2); ctx.fill();

      // Radial halo
      const halo = ctx.createRadialGradient(cp.x, cp.y, 0, cp.x, cp.y, 28);
      halo.addColorStop(0, 'rgba(0,255,65,0.2)');
      halo.addColorStop(1, 'rgba(0,255,65,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cp.x, cp.y, 28, 0, Math.PI * 2); ctx.fill();

      // Rotating dashed ring
      ctx.save();
      ctx.translate(cp.x, cp.y);
      ctx.rotate(t * 0.03);
      ctx.strokeStyle = 'rgba(0,255,65,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.arc(0, 0, 17 + Math.sin(t * 0.07) * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Sprite (walk anim when moving)
      const frames = isMoving ? ['🧑‍💻', '🏃'] : [playerEmoji || '🧑‍💻'];
      const sprite = frames[Math.floor(t / 8) % frames.length];
      ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 14;
      ctx.font = '20px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(sprite, cp.x, cp.y - 2);
      ctx.shadowBlur = 0;

      // Name label
      if (hackerName) {
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = 'rgba(0,255,65,0.75)';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(hackerName, cp.x, cp.y + 20);
      }

      // Controls hint (top right)
      ctx.fillStyle = 'rgba(0,130,220,0.3)';
      ctx.font = '8px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('↑↓←→ déplacer  ·  terminal actif', CW - 8, 16);

      // ── Vignette ──────────────────────────────────────────
      const vig = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.28, CW / 2, CH / 2, CH * 0.9);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,10,0.55)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, CW, CH);

      // ── Top bar ────────────────────────────────────────────
      ctx.fillStyle = 'rgba(0,9,26,0.9)'; ctx.fillRect(0, 0, CW, 14);
      ctx.fillStyle = 'rgba(0,170,255,0.45)'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
      ctx.fillText('📡  NEXUS CORP — 192.168.1.0/24  |  Pwned : ' + pwned.length + '/4', 8, 10);

      // ── Legend ────────────────────────────────────────────
      ctx.fillStyle = 'rgba(0,9,26,0.9)'; ctx.fillRect(0, CH - 16, CW, 16);
      const leg = [['#336699aa','Inconnu'],['#0088cc','Scanné'],['#00aa44','Pwned'],['#ffaa00','Proche'],['#1a1a2a','Verr.']];
      let lx = 8;
      leg.forEach(([c, lbl]) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(lx + 4, CH - 8, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#224466'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
        ctx.fillText(lbl, lx + 11, CH - 4);
        lx += lbl.length * 4.6 + 22;
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [pwned, scanned, unlocked, activeId, hackerName, playerEmoji]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#00091a', overflow: 'hidden' }}>
      <canvas ref={canvasRef} width={CW} height={CH}
        style={{ display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated' }} />
      {floats.map(f => (
        <div key={f.id} style={{
          position: 'absolute', top: '30px', left: '50%', transform: 'translateX(-50%)',
          color: f.color, fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold',
          textShadow: `0 0 10px ${f.color}`, pointerEvents: 'none',
          animation: 'floatUp 1.4s ease-out forwards', zIndex: 10, whiteSpace: 'nowrap',
        }}>{f.text}</div>
      ))}
    </div>
  );
}
