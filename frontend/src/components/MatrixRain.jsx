import { useEffect, useRef } from 'react';

export default function MatrixRain({ opacity = 0.15 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const cols = Math.floor(canvas.width / 16);
    const drops = Array(cols).fill(1);
    const chars = '01アイウエカキABCDEF$#@%><{}'.split('');

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00ff41';
      ctx.font = '13px monospace';
      drops.forEach((y, x) => {
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x * 16, y * 16);
        if (y * 16 > canvas.height && Math.random() > 0.975) drops[x] = 0;
        drops[x]++;
      });
    };

    const id = setInterval(draw, 45);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none', zIndex: 0 }} />;
}
