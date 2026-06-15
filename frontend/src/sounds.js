let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = 'square', volume = 0.1) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

export const sounds = {
  keyPress:     () => playTone(800, 0.04, 'square', 0.04),
  commandOk:    () => { playTone(523, 0.1, 'sine', 0.08); setTimeout(() => playTone(659, 0.1, 'sine', 0.08), 80); },
  commandError: () => playTone(120, 0.3, 'sawtooth', 0.12),
  attack:       () => { playTone(200, 0.1, 'square', 0.18); setTimeout(() => playTone(90, 0.2, 'square', 0.1), 90); },
  enemyDead:    () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'sine', 0.1), i * 80)),
  levelUp:      () => [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'sine', 0.12), i * 100)),
  itemFound:    () => [880, 1047, 1319].forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'sine', 0.1), i * 60)),
  move:         () => playTone(380, 0.04, 'sine', 0.04),
  victory:      () => [523,659,784,1047,1319,1568].forEach((f,i) => setTimeout(() => playTone(f, 0.25, 'sine', 0.15), i * 120)),
  zoneUnlock:   () => { playTone(440, 0.15, 'sine', 0.12); setTimeout(() => playTone(880, 0.3, 'sine', 0.15), 150); },
};
