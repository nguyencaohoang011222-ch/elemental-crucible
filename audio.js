// Âm thanh 8-bit tự tổng hợp (không dùng file): hiệu ứng theo từng hành động + nhạc chiptune lặp liền mạch.
// Kênh: master → (sfx, music) → compressor → loa. Mọi âm đều tạo bằng WebAudio nên không vướng bản quyền.
let ac = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
const V = { master: 0.7, sfx: 0.9, music: 0.55, muted: false, duck: 1, musicOn: true, sfxOn: true };
const waves = {};

export function ensure() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ac.destination);
  master = ac.createGain(); master.connect(comp);
  sfxBus = ac.createGain(); sfxBus.connect(master); musBus = ac.createGain(); musBus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  apply(); return ac;
}
function apply() { if (!ac) return; const t = ac.currentTime; master.gain.setTargetAtTime(V.muted ? 0 : V.master, t, 0.03); sfxBus.gain.setTargetAtTime(V.sfxOn ? V.sfx : 0, t, 0.03); musBus.gain.setTargetAtTime(V.musicOn ? V.music * 0.6 * V.duck : 0, t, 0.2); }
export function setMusicOn(b) { V.musicOn = b; apply(); }
export function setSfxOn(b) { V.sfxOn = b; apply(); }
export function setVolumes(m, s, mu) { V.master = m; V.sfx = s; V.music = mu; apply(); }
export function setMuted(b) { V.muted = b; apply(); }
export function duck(on) { const d = on ? 0.35 : 1; if (d !== V.duck) { V.duck = d; apply(); } }

function pulse(duty) {
  const k = 'p' + duty; if (waves[k]) return waves[k];
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let i = 1; i < n; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
  return (waves[k] = ac.createPeriodicWave(re, im));
}
// một nốt: kiểu sóng, tần số (có trượt), độ dài, âm lượng, rung
function osc(type, f, t0, d, v, o = {}) {
  const os = ac.createOscillator(), g = ac.createGain();
  if (type.startsWith('pulse')) os.setPeriodicWave(pulse(+type.slice(5) || 0.25)); else os.type = type;
  os.frequency.setValueAtTime(f, t0); if (o.to) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + (o.slideT || d));
  if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vibF || 6; lg.gain.value = o.vib; l.connect(lg); lg.connect(os.frequency); l.start(t0); l.stop(t0 + d + 0.05); }
  const a = o.attack || 0.004; g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + a);
  if (o.sustain) { g.gain.setValueAtTime(v, t0 + d * o.sustain); g.gain.linearRampToValueAtTime(0.0001, t0 + d); } else g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  os.connect(g); g.connect(o.bus || sfxBus); os.start(t0); os.stop(t0 + d + 0.05);
}
function nz(t0, d, v, o = {}) {
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noiseBuf; src.loop = true; f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.f || 1200, t0); if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.to), t0 + d); f.Q.value = o.q || 0.8;
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + (o.attack || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(f); f.connect(g); g.connect(o.bus || sfxBus); src.start(t0, Math.random() * 1.5); src.stop(t0 + d + 0.05);
}
const now = () => ac.currentTime + 0.005;
const on = () => ac && !V.muted && V.master > 0 && V.sfxOn;

// ---------- hiệu ứng theo hành động ----------
const STEP = {
  forest: t => { nz(t, 0.05, 0.08, { f: 520 }); },
  frost: t => { nz(t, 0.045, 0.07, { type: 'bandpass', f: 3200, q: 1.5 }); nz(t + 0.03, 0.03, 0.05, { type: 'bandpass', f: 4200, q: 2 }); },
  dungeon: t => { osc('triangle', 210, t, 0.035, 0.05, { to: 150 }); nz(t, 0.025, 0.05, { type: 'bandpass', f: 1600, q: 3 }); },
  palace: t => { osc('triangle', 150, t, 0.05, 0.08, { to: 90 }); nz(t, 0.03, 0.04, { f: 900 }); }
};
let lastStep = 0, lastRain = 0, lastHit = 0;
export function step(theme) { if (!on()) return; const t = now(); if (t - lastStep < 0.08) return; lastStep = t; (STEP[theme] || STEP.forest)(t); }
export function tone(f, d, type = 'square', v = 0.05, slide = 0, delay = 0) { if (!on()) return; osc(type, f, now() + delay, d, v, slide ? { to: f + slide } : {}); }
export function noise(d, v = 0.08, f = 1200) { if (!on()) return; nz(now(), d, v, { f }); }

const SKILL = {
  CONTROL: t => { [880, 1175, 1568].forEach((f, i) => osc('triangle', f, t + i * 0.035, 0.22, 0.05)); nz(t, 0.25, 0.04, { type: 'highpass', f: 5000 }); },
  AREA: t => { osc('sawtooth', 220, t, 0.3, 0.06, { to: 70 }); nz(t, 0.35, 0.08, { f: 1500, to: 300 }); },
  MOBILITY: t => { nz(t, 0.18, 0.07, { type: 'bandpass', f: 700, to: 3500, q: 1.2 }); osc('pulse0.25', 660, t, 0.1, 0.04, { to: 1320 }); },
  DEFENSE: t => { osc('sine', 120, t, 0.25, 0.12, { to: 60 }); osc('triangle', 520, t + 0.05, 0.25, 0.04, { vib: 8 }); },
  DAMAGE: t => { osc('pulse0.25', 440, t, 0.16, 0.06, { to: 880 }); nz(t, 0.2, 0.06, { type: 'bandpass', f: 2500, q: 0.7 }); },
  ULTIMATE: t => { [262, 330, 392, 523].forEach((f, i) => osc('pulse0.25', f, t + i * 0.05, 0.5, 0.05, { sustain: 0.5 })); osc('sawtooth', 65, t, 0.7, 0.08, { to: 130 }); nz(t, 0.6, 0.08, { f: 400, to: 3000, attack: 0.25 }); }
};
const roar = (t, f = 90, d = 0.9, v = 0.1) => { osc('sawtooth', f, t, d, v, { to: f * 0.7, vib: 9, vibF: 18, attack: 0.08 }); osc('square', f * 0.5, t, d, v * 0.6, { to: f * 0.35, attack: 0.1 }); nz(t, d, v * 0.9, { f: 500, to: 180, attack: 0.1 }); };
const boom = (t, big = 1) => { nz(t, 0.35 * big, 0.12, { f: 900, to: 120 }); osc('sine', 110, t, 0.35 * big, 0.14, { to: 35 }); };
const R = {
  swing: e => { const t = now(); nz(t, e.charge ? 0.2 : 0.12, 0.09, { type: 'bandpass', f: e.charge ? 1200 : 2200, to: 600, q: 1.1 }); },
  knightWave: () => { const t = now(); boom(t, 1.2); nz(t, 0.4, 0.07, { type: 'bandpass', f: 600, to: 2000 }); },
  hit: e => { if (e.kind === 'burn') return; const t = now(); if (t - lastHit < 0.03) return; lastHit = t;
    if (e.kind === 'slash') { osc('square', 1400, t, 0.04, 0.05, { to: 900 }); osc('triangle', 700, t, 0.07, 0.06, { to: 300 }); nz(t, 0.04, 0.06, { type: 'highpass', f: 3000 }); }
    else { osc('sine', 170, t, 0.08, 0.1, { to: 60 }); nz(t, 0.05, 0.07, { f: 1400 }); }
    if (e.dmg >= 40) boom(t, 0.6); },
  kill: () => { const t = now(); osc('pulse0.25', 660, t, 0.06, 0.05); osc('pulse0.25', 330, t + 0.06, 0.1, 0.05, { to: 160 }); nz(t, 0.14, 0.06, { f: 1000 }); },
  shoot: e => { const t = now(); if (e.kind === 'orb') { osc('sine', 300, t, 0.16, 0.07, { to: 640 }); osc('triangle', 900, t, 0.14, 0.03, { vib: 30, vibF: 25 }); } else { osc('triangle', 520, t, 0.1, 0.07, { to: 170 }); osc('pulse0.125', 1040, t, 0.05, 0.03, { to: 300 }); nz(t, 0.025, 0.05, { type: 'highpass', f: 4000 }); } },
  boom: () => boom(now()),
  hurt: () => { const t = now(); osc('pulse0.5', 240, t, 0.22, 0.09, { to: 80 }); nz(t, 0.15, 0.08, { f: 700 }); },
  dash: () => { const t = now(); nz(t, 0.18, 0.08, { type: 'bandpass', f: 500, to: 2600, q: 1.3 }); },
  thud: () => { const t = now(); osc('sine', 80, t, 0.25, 0.14, { to: 35 }); nz(t, 0.2, 0.09, { f: 450 }); },
  tele: () => { const t = now(); osc('sawtooth', 300, t, 0.25, 0.025, { to: 600 }); },
  cast: () => { const t = now(); osc('triangle', 700, t, 0.12, 0.03, { to: 500 }); },
  parry: () => { const t = now(); osc('square', 1600, t, 0.1, 0.05, { to: 2200 }); osc('triangle', 2400, t, 0.18, 0.03); },
  skill: e => { const t = now(); (SKILL[e.group] || SKILL.DAMAGE)(t); if (e.first) { osc('pulse0.25', 1047, t + 0.15, 0.1, 0.04); osc('pulse0.25', 1568, t + 0.25, 0.18, 0.04); } },
  arcSlash: () => { const t = now(); nz(t, 0.16, 0.1, { type: 'bandpass', f: 2600, to: 900 }); osc('sawtooth', 180, t, 0.15, 0.04, { to: 110 }); },
  whirl: () => { const t = now(); nz(t, 0.3, 0.08, { type: 'bandpass', f: 800, to: 2400, q: 1.5 }); },
  spike: () => { if (Math.random() < 0.5) { const t = now(); osc('square', 140, t, 0.06, 0.04, { to: 70 }); nz(t, 0.06, 0.05, { f: 800 }); } },
  rainHit: e => { const t = now(); if (t - lastRain < 0.045) return; lastRain = t; nz(t, 0.05, e.big ? 0.09 : 0.035, { f: e.big ? 600 : 2600 }); },
  beam: () => { const t = now(); osc('sawtooth', 900, t, 0.28, 0.05, { to: 400 }); osc('pulse0.25', 450, t, 0.28, 0.03, { vib: 40, vibF: 30 }); nz(t, 0.22, 0.05, { type: 'highpass', f: 4000 }); },
  blink: () => { const t = now(); osc('sine', 1300, t, 0.14, 0.06, { to: 400 }); },
  trapSet: () => { const t = now(); osc('square', 500, t, 0.05, 0.03, { to: 700 }); },
  trapPop: () => { const t = now(); boom(t, 0.7); },
  slam: e => { const t = now(); osc('sine', e.big ? 60 : 90, t, 0.32, 0.14, { to: 30 }); nz(t, 0.28, 0.11, { f: e.big ? 500 : 900, to: 150 }); },
  interrupt: () => { const t = now(); osc('square', 1500, t, 0.09, 0.05, { to: 600 }); },
  noEnergy: () => { const t = now(); osc('pulse0.5', 110, t, 0.09, 0.04); osc('pulse0.5', 98, t + 0.09, 0.09, 0.04); },
  locked: () => { const t = now(); osc('square', 100, t, 0.08, 0.03); },
  steamPop: () => { const t = now(); nz(t, 0.22, 0.06, { type: 'highpass', f: 2500 }); },
  block: () => { const t = now(); osc('square', 900, t, 0.05, 0.03); },
  shieldHit: () => { const t = now(); osc('triangle', 600, t, 0.12, 0.05, { to: 900 }); },
  obstacleBreak: e => { const t = now(); if (e.type === 'tree') { nz(t, 0.5, 0.08, { f: 700, to: 200 }); osc('triangle', 120, t + 0.1, 0.3, 0.06, { to: 60 }); } else if (e.type === 'crate') { nz(t, 0.15, 0.09, { type: 'bandpass', f: 900, q: 1.5 }); osc('square', 220, t, 0.06, 0.04, { to: 120 }); } else if (e.type === 'lamp') { nz(t, 0.2, 0.06, { type: 'highpass', f: 4500 }); osc('triangle', 1800, t, 0.15, 0.03, { to: 900 }); } else boom(t, 0.8); },
  bossWind: () => { const t = now(); osc('sawtooth', 90, t, 0.6, 0.05, { to: 160 }); },
  bossHit: () => { const t = now(); boom(t, 1.5); nz(t + 0.1, 0.6, 0.06, { f: 250 }); },
  bossCast: () => { const t = now(); osc('triangle', 600, t, 0.12, 0.03, { to: 400 }); },
  bossStagger: () => { const t = now(); osc('sawtooth', 240, t, 0.5, 0.08, { to: 80 }); nz(t, 0.4, 0.1, { f: 500 }); },
  bossPhase: () => roar(now(), 75, 1.3, 0.12),
  bossRoar: () => roar(now(), 95, 0.9, 0.1),
  breath: () => { const t = now(); nz(t, 0.7, 0.1, { type: 'bandpass', f: 600, to: 1800, q: 0.6, attack: 0.05 }); osc('sawtooth', 120, t, 0.6, 0.05, { to: 80, vib: 20, vibF: 14 }); },
  sporeBurst: () => { const t = now(); nz(t, 0.4, 0.08, { type: 'bandpass', f: 900, to: 400, q: 1 }); osc('triangle', 300, t, 0.2, 0.04, { to: 150 }); },
  trapCrash: () => { const t = now(); boom(t, 0.9); osc('square', 900, t, 0.1, 0.04, { to: 400 }); nz(t + 0.03, 0.2, 0.06, { type: 'highpass', f: 3500 }); },
  ventErupt: () => { const t = now(); nz(t, 0.6, 0.1, { f: 400, to: 1500, attack: 0.05 }); osc('sine', 70, t, 0.5, 0.12, { to: 40 }); },
  playerFrozen: () => { const t = now(); [1568, 1319, 1047].forEach((f, i) => osc('triangle', f, t + i * 0.04, 0.2, 0.04)); nz(t, 0.25, 0.05, { type: 'highpass', f: 5000 }); },
  iceCrack: () => { const t = now(); nz(t, 0.08, 0.07, { type: 'highpass', f: 4000 }); osc('square', 2200, t, 0.04, 0.03); },
  bellRing: () => { const t = now(); osc('triangle', 880, t, 0.8, 0.06, { vib: 6 }); osc('sine', 1320, t, 0.6, 0.03); },
  steamPop: () => { const t = now(); nz(t, 0.22, 0.06, { type: 'highpass', f: 2500 }); },
  bossIntro: () => { const t = now(); roar(t, 70, 1.6, 0.1); osc('triangle', 82, t + 0.2, 1.4, 0.06); },
  victory: () => { const t = now(); [[523, 0], [659, 0.14], [784, 0.28], [1047, 0.42], [784, 0.62], [1047, 0.76], [1319, 0.95]].forEach(([f, d], i) => { osc('pulse0.25', f, t + d, i === 6 ? 0.9 : 0.16, 0.05); osc('triangle', f / 2, t + d, i === 6 ? 0.9 : 0.16, 0.04); }); [1568, 2093, 2637].forEach((f, i) => osc('sine', f, t + 1.0 + i * 0.08, 0.6, 0.02)); },
  bossDown: () => { const t = now(); [392, 523, 659, 784, 1047].forEach((f, i) => osc('pulse0.25', f, t + i * 0.11, 0.4, 0.05)); boom(t, 1.4); },
  bossBlink: () => { const t = now(); osc('sine', 1400, t, 0.15, 0.05, { to: 400 }); },
  stageStart: () => { const t = now(); [330, 440, 554].forEach((f, i) => osc('pulse0.25', f, t + i * 0.08, 0.16, 0.04)); },
  stageClear: () => { const t = now(); [523, 659, 784, 1047].forEach((f, i) => osc('pulse0.25', f, t + i * 0.09, 0.2, 0.045)); },
  merge: () => { const t = now(); [392, 587, 784, 1175].forEach((f, i) => osc('triangle', f, t + i * 0.07, 0.3, 0.06)); nz(t, 0.4, 0.04, { type: 'highpass', f: 5000 }); },
  coreGain: () => { const t = now(); osc('sine', 660, t, 0.2, 0.06, { to: 990 }); osc('triangle', 1320, t + 0.08, 0.2, 0.03); },
  drop: () => { const t = now(); osc('triangle', 990, t, 0.06, 0.025, { to: 1320 }); },
  pickup: e => { const t = now(); if (e.kind === 'energy') { osc('sine', 660, t, 0.12, 0.06, { to: 1320 }); osc('triangle', 1760, t + 0.05, 0.1, 0.025); } else if (e.kind === 'heal') { osc('triangle', 523, t, 0.12, 0.06); osc('triangle', 784, t + 0.08, 0.16, 0.06); } else { [659, 880, 1175, 1568].forEach((f, i) => osc('pulse0.25', f, t + i * 0.06, 0.16, 0.045)); } },
  chain: () => { const t = now(); nz(t, 0.12, 0.06, { type: 'highpass', f: 3000 }); osc('square', 1800, t, 0.06, 0.03, { to: 600 }); },
  fuseLit: () => { const t = now(); nz(t, 0.5, 0.04, { type: 'bandpass', f: 4000, q: 3 }); osc('square', 1200, t, 0.03, 0.03); },
  bombBlast: () => { const t = now(); boom(t, 1.8); nz(t + 0.05, 0.8, 0.08, { f: 300 }); },
  hurtDot: () => { const t = now(); osc('pulse0.5', 180, t, 0.08, 0.05, { to: 110 }); },
  vortex: () => { const t = now(); osc('sawtooth', 60, t, 1.4, 0.08, { to: 200, vib: 6, vibF: 3 }); nz(t, 1.4, 0.06, { type: 'bandpass', f: 300, to: 1200, q: 2 }); },
  prison: () => { const t = now(); [1319, 988, 784].forEach((f, i) => osc('triangle', f, t + i * 0.05, 0.3, 0.05)); nz(t, 0.3, 0.06, { type: 'highpass', f: 4000 }); },
  rooted: () => { const t = now(); nz(t, 0.25, 0.07, { type: 'bandpass', f: 500, q: 2 }); osc('triangle', 160, t, 0.2, 0.05, { to: 90 }); },
  burrow: () => { const t = now(); nz(t, 0.8, 0.09, { f: 300 }); osc('sine', 55, t, 0.8, 0.1); },
  burrowOut: () => { const t = now(); boom(t, 1.4); },
  spawnSigil: () => { const t = now(); osc('triangle', 220, t, 0.25, 0.018, { to: 440 }); nz(t, 0.2, 0.015, { type: 'highpass', f: 4000 }); },
  swell: () => { const t = now(); osc('square', 300, t, 0.6, 0.03, { to: 900, vib: 30, vibF: 12 }); },
  lob: () => { const t = now(); boom(t, 0.5); osc('sine', 200, t, 0.3, 0.05, { to: 500 }); },
  fissure: () => { const t = now(); boom(t, 1.0); nz(t, 0.5, 0.08, { f: 300, to: 900 }); },
  glaive: () => { const t = now(); nz(t, 0.4, 0.04, { type: 'bandpass', f: 2200, q: 4, attack: 0.02 }); },
  tether: () => { const t = now(); osc('sine', 520, t, 0.3, 0.03, { to: 780, vib: 8 }); },
  juggCharge: () => { const t = now(); osc('sawtooth', 70, t, 0.8, 0.06, { to: 140 }); },
  eliteSpawn: () => { const t = now(); roar(t, 140, 0.6, 0.07); },
  frostBeam: () => { const t = now(); osc('sawtooth', 1200, t, 0.5, 0.05, { to: 300 }); nz(t, 0.5, 0.06, { type: 'highpass', f: 5000 }); },
  terraform: () => { const t = now(); nz(t, 0.3, 0.08, { f: 500 }); osc('sine', 80, t, 0.25, 0.08, { to: 40 }); },
  ui: () => { const t = now(); osc('pulse0.25', 880, t, 0.05, 0.03); },
  hover: () => { const t = now(); osc('square', 2600, t, 0.025, 0.018, { to: 1900 }); nz(t, 0.02, 0.02, { type: 'highpass', f: 6000 }); },
  jackpot: (big) => { const t = now(); const seq = big ? [523, 659, 784, 1047, 1319, 1568, 2093] : [659, 784, 988, 1319]; seq.forEach((f, i) => { osc('triangle', f, t + i * 0.07, 0.6, 0.05); osc('sine', f * 2, t + i * 0.07, 0.4, 0.015); }); osc('pulse0.25', big ? 262 : 330, t, big ? 1.4 : 0.8, 0.04, { to: big ? 524 : 660 }); nz(t, big ? 0.9 : 0.5, 0.03, { type: 'highpass', f: 6000, attack: 0.1 }); },
  claim: () => { const t = now(); [1319, 1760, 2349, 3136].forEach((f, i) => { osc('triangle', f, t + i * 0.07, 0.5, 0.06); osc('sine', f * 2.76, t + i * 0.07, 0.22, 0.016); }); nz(t, 0.35, 0.03, { type: 'highpass', f: 7000, attack: 0.05 }); osc('pulse0.25', 988, t + 0.32, 0.08, 0.03); osc('pulse0.25', 1319, t + 0.4, 0.2, 0.03); },
  coin: () => { const t = now(); if (t - (R._coin || 0) < 0.05) return; R._coin = t; osc('square', 1976, t, 0.05, 0.03); osc('square', 2637, t + 0.05, 0.09, 0.03); },
  sold: () => { const t = now(); [1568, 2093, 2637].forEach((f, i) => osc('square', f, t + i * 0.04, 0.07, 0.03)); },
  bought: () => { const t = now(); osc('triangle', 784, t, 0.08, 0.05); osc('triangle', 1175, t + 0.06, 0.12, 0.05); },
  forged: () => { const t = now(); for (let i = 0; i < 3; i++) { osc('square', 2200, t + i * 0.16, 0.05, 0.05, { to: 1500 }); nz(t + i * 0.16, 0.08, 0.08, { type: 'highpass', f: 3500 }); osc('sine', 180, t + i * 0.16, 0.12, 0.08, { to: 90 }); } [784, 1047, 1568].forEach((f, i) => osc('triangle', f, t + 0.5 + i * 0.07, 0.4, 0.05)); },
  potion: () => { const t = now(); for (let i = 0; i < 4; i++) osc('sine', 300 + i * 90, t + i * 0.06, 0.08, 0.05, { to: 500 + i * 90 }); osc('triangle', 1320, t + 0.28, 0.2, 0.04); },
  goldStart: () => { const t = now(); [1047, 1319, 1568, 2093].forEach((f, i) => osc('triangle', f, t + i * 0.05, 0.5, 0.04)); osc('sine', 130, t, 0.5, 0.08, { to: 60 }); },
  goldEnd: e => { const t = now(); nz(t, 0.2, 0.08, { type: 'highpass', f: 3000 }); if (e && e.tele) osc('sine', 1400, t + 0.05, 0.2, 0.06, { to: 300 }); },
  goldBlock: () => { const t = now(); if (t - (R._gb || 0) < 0.1) return; R._gb = t; osc('triangle', 2093, t, 0.12, 0.04); },
  stealthOn: () => { const t = now(); nz(t, 0.4, 0.06, { type: 'bandpass', f: 2000, to: 400, q: 2 }); osc('sine', 880, t, 0.3, 0.03, { to: 220 }); },
  crit: () => { const t = now(); osc('square', 1760, t, 0.06, 0.06, { to: 2600 }); boom(t, 0.8); },
  slowmo: () => { const t = now(); osc('sawtooth', 400, t, 0.6, 0.05, { to: 100 }); nz(t, 0.6, 0.05, { type: 'bandpass', f: 1200, to: 300, q: 3 }); },
  shieldUp: () => { const t = now(); osc('triangle', 520, t, 0.15, 0.04, { to: 780 }); },
  forgeNear: () => { const t = now(); [523, 784, 1047].forEach((f, i) => { osc('square', 2000, t + i * 0.2, 0.04, 0.04, { to: 1400 }); osc('triangle', f, t + i * 0.2, 0.25, 0.04); }); },
  freeCast: () => { const t = now(); osc('pulse0.25', 1320, t, 0.08, 0.04, { to: 1760 }); },
  dead: () => { const t = now(); [440, 349, 294, 220].forEach((f, i) => osc('pulse0.5', f, t + i * 0.16, 0.3, 0.05)); }
};
// bảng hiệu ứng: tên sự kiện của game → hàm phát
export const SFX = new Proxy(R, { get: (o, k) => (o[k] && on()) ? o[k] : undefined });

// ---------- nhạc nền chiptune ----------
// Bộ chơi: giai điệu, bass, rải hợp âm, trống + lớp tạo không khí: drone trầm, pad bất an, chuông, stab, gió, tim đập, giọt nước.
const m2f = m => 440 * Math.pow(2, (m - 69) / 12);
const CH = { m: [0, 3, 7], M: [0, 4, 7], dim: [0, 3, 6], aug: [0, 4, 8], sus: [0, 5, 7], phr: [0, 1, 7] };
// chuyển dữ liệu bài nhạc thành danh sách nốt theo bước 1/16 (có đoạn mở đầu chơi một lần)
function build(spec) {
  const mk = (chords, drums, extra) => {
    const ev = [];
    chords.forEach((c, b) => {
      const root = c[0], tri = CH[c[1]] || CH.m, s0 = b * 16;
      for (let i = 0; i < 16; i++) { const ch = (spec.bass || '')[i]; if (ch === 'R') ev.push({ s: s0 + i, ch: 'bass', m: root - 24, len: spec.bassLen || 2 }); else if (ch === 'r') ev.push({ s: s0 + i, ch: 'bass', m: root - 12, len: 1 }); else if (ch === '5') ev.push({ s: s0 + i, ch: 'bass', m: root - 17, len: 2 }); else if (ch === 'b') ev.push({ s: s0 + i, ch: 'bass', m: root - 23, len: 1 }); }
      if (spec.arp) for (let i = 0; i < 16; i += spec.arpStep || 1) ev.push({ s: s0 + i, ch: 'arp', m: root + tri[(i / (spec.arpStep || 1)) % 3 | 0] + 12 * (i % 6 < 3 ? 0 : 1), len: 1 });
      if (spec.drone) ev.push({ s: s0, ch: 'drone', m: root - 24, len: 16 });
      if (spec.pad) ev.push({ s: s0, ch: 'pad', m: root, tri, len: 16 });
      if (spec.stab) ev.push({ s: s0, ch: 'stab', m: root, tri });
      if (spec.bell) for (let i = 0; i < 16; i++) if (spec.bell[i] === 'x') ev.push({ s: s0 + i, ch: 'bell', m: root + 24 + tri[i % 3] + (spec.bellSour && i % 5 === 0 ? 1 : 0) });
      if (spec.wind && b % 2 === 0) ev.push({ s: s0, ch: 'wind' });
      if (spec.drip) for (let i = 3; i < 16; i += 7) ev.push({ s: s0 + i, ch: 'drip', m: root + 36 + (b % 3) * 2 });
      const dr = drums[b % drums.length];
      for (let i = 0; i < 16; i++) { const k = dr[i]; if (k && k !== '.') ev.push({ s: s0 + i, ch: k }); }
    });
    if (extra) for (const e of extra) ev.push(e);
    const by = new Map(); for (const e of ev) { if (!by.has(e.s)) by.set(e.s, []); by.get(e.s).push(e); }
    return { by, L: chords.length * 16 };
  };
  const main = mk(spec.chords, spec.drums, spec.lead.map(([b, st, m, len]) => ({ s: b * 16 + st, ch: 'lead', m, len })));
  const intro = spec.intro ? mk(spec.intro.chords, spec.intro.drums, []) : { by: new Map(), L: 0 };
  return { bpm: spec.bpm, ...main, introBy: intro.by, IL: intro.L, vol: spec.vol || 1, lead: spec.leadWave || 'pulse0.25', arpUp: spec.arpUp || 0, distort: !!spec.distort };
}
// giai điệu sinh từ hình mẫu trên nốt hợp âm
function motif(chords, oct, patA, patB) {
  const out = [];
  chords.forEach((c, b) => { const tri = CH[c[1]] || CH.m, tones = [0, 1, 2, 3, 4, 5].map(i => c[0] + oct + tri[i % 3] + 12 * Math.floor(i / 3)); const pat = b % 4 === 3 ? patB : patA; for (const [st, len, idx] of pat) out.push([b, st, tones[Math.max(0, Math.min(5, idx + (b >= chords.length / 2 && b % 4 !== 3 ? 1 : 0)))], len]); });
  return out;
}
// giai điệu theo thang âm: deg = bậc trong thang (có thể âm), ví dụ thang Phrygian/ngũ cung thứ
const SCALES = { phr: [0, 1, 3, 5, 7, 8, 10], aeo: [0, 2, 3, 5, 7, 8, 10], hm: [0, 2, 3, 5, 7, 8, 11], penta: [0, 3, 5, 7, 10], whole: [0, 2, 4, 6, 8, 10] };
const deg = (root, sc, d) => { const S = SCALES[sc], n = S.length; return root + S[((d % n) + n) % n] + 12 * Math.floor(d / n); };
const line = (root, sc, notes) => notes.map(([b, st, d, len]) => [b, st, deg(root, sc, d), len]);

const BOSSDR = ['KkhKs.hkKkhKs.ss', 'KkhKs.hkKkKKsss.'];
const ROLL = { chords: null, drums: ['K...K...K...K...', 'sssssssssssssKKK'] };
function bossOf(sp, extra = {}) { return { ...sp, bpm: Math.round(sp.bpm + 16), vol: 1.08, bass: 'R.RRr.RRR.RRr.rb', bassLen: 1, arpStep: 1, drums: BOSSDR, stab: true, drone: true, intro: { chords: sp.chords.slice(0, 2), drums: ROLL.drums }, ...extra }; }

const TITLE = build({
  bpm: 100, vol: 0.9, drone: true, pad: true,
  chords: [[50, 'm'], [50, 'm'], [46, 'M'], [46, 'M'], [53, 'M'], [53, 'M'], [49, 'M'], [49, 'M']],
  bass: 'R...r...R...r...', bassLen: 3, arp: true, arpStep: 2,
  drums: ['k.......s.......', 'k.......s...h.h.'],
  lead: line(62, 'hm', [[0, 0, 4, 4], [0, 4, 7, 2], [0, 6, 8, 2], [0, 8, 9, 6], [0, 14, 8, 2], [1, 0, 7, 4], [1, 4, 4, 4], [1, 8, 6, 4], [1, 12, 7, 4],
    [2, 0, 7, 4], [2, 4, 9, 2], [2, 6, 8, 2], [2, 8, 7, 4], [2, 12, 6, 2], [2, 14, 5, 2], [3, 0, 4, 8], [3, 8, 3, 4], [3, 12, 4, 4],
    [4, 0, 6, 4], [4, 4, 9, 4], [4, 8, 11, 6], [4, 14, 10, 2], [5, 0, 9, 4], [5, 4, 8, 4], [5, 8, 6, 8],
    [6, 0, 8, 4], [6, 4, 7, 2], [6, 6, 6, 2], [6, 8, 8, 4], [6, 12, 11, 4], [7, 0, 9, 2], [7, 2, 8, 2], [7, 4, 7, 4], [7, 8, 6, 4], [7, 12, 4, 4]])
});
const MAP = {
  // Rừng: La thứ, hợp âm lệch i–bVI–bII–V, tom dồn, gió lá
  forest: (() => { const c = [[57, 'm'], [53, 'M'], [58, 'M'], [52, 'M'], [57, 'm'], [53, 'M'], [50, 'm'], [52, 'M']];
    return { bpm: 126, chords: c, bass: 'R.r.R.rbR.r.R.rr', arp: true, arpStep: 1, drone: true, wind: true, drums: ['k.t.s.t.k.k.s.tt', 'k.t.s.t.k.t.sttt'],
      lead: line(69, 'aeo', [[0, 0, 4, 3], [0, 3, 3, 1], [0, 4, 2, 2], [0, 6, 0, 2], [0, 8, 4, 6], [1, 0, 5, 3], [1, 4, 4, 4], [1, 8, 2, 8], [2, 0, 1, 4], [2, 4, 2, 2], [2, 6, 4, 2], [2, 8, 5, 4], [2, 12, 6, 4], [3, 0, 7, 8], [3, 8, 6, 4], [3, 12, 4, 4],
        [4, 0, 4, 3], [4, 3, 3, 1], [4, 4, 2, 2], [4, 6, 0, 2], [4, 8, 7, 6], [5, 0, 8, 4], [5, 4, 7, 4], [5, 8, 5, 8], [6, 0, 3, 4], [6, 4, 4, 4], [6, 8, 2, 8], [7, 0, 6, 4], [7, 4, 7, 4], [7, 8, 4, 8]]) }; })(),
  // Băng: Mi Phrygian, chậm, chuông thuỷ tinh lệch nửa cung, tim đập, gió hú, giai điệu có quãng tăng 4
  frost: (() => { const c = [[52, 'm'], [53, 'M'], [52, 'm'], [47, 'dim'], [52, 'm'], [53, 'M'], [48, 'M'], [47, 'M']];
    return { bpm: 92, vol: 1, chords: c, bass: 'R.......R.......', bassLen: 8, drone: true, pad: true, wind: true, bell: 'x..x...x..x.x...', bellSour: true, leadWave: 'triangle', drums: ['H.......H...h...', 'H.......H.....h.'],
      lead: line(64, 'phr', [[0, 0, 7, 6], [0, 8, 8, 2], [0, 10, 7, 6], [1, 4, 8, 4], [1, 8, 11, 8], [2, 0, 10, 6], [2, 8, 8, 2], [2, 10, 7, 6], [3, 0, 4, 4], [3, 4, 3, 4], [3, 8, 1, 8],
        [4, 0, 7, 6], [4, 8, 8, 2], [4, 10, 11, 6], [5, 0, 12, 8], [5, 8, 11, 8], [6, 0, 10, 4], [6, 4, 8, 4], [6, 8, 7, 8], [7, 0, 8, 6], [7, 8, 7, 8]]) }; })(),
  // Hang nấm: thang toàn cung, nhịp lẻ 3+3+2, hợp âm tăng, tiếng nhỏ giọt, drone lắc lư
  dungeon: (() => { const c = [[50, 'aug'], [48, 'aug'], [50, 'aug'], [46, 'aug'], [50, 'aug'], [52, 'aug'], [48, 'aug'], [46, 'aug']];
    return { bpm: 108, chords: c, bass: 'R..R..r.R..R..r.', bassLen: 2, drone: true, drip: true, arp: true, arpStep: 3, drums: ['k..k..s.k..k..s.', 'k..k..s.k.kk.ss.'],
      lead: line(62, 'whole', [[0, 0, 3, 3], [0, 3, 2, 3], [0, 6, 4, 2], [0, 8, 3, 3], [0, 11, 1, 5], [1, 0, 0, 6], [1, 8, 5, 8], [2, 0, 3, 3], [2, 3, 2, 3], [2, 6, 4, 2], [2, 8, 6, 8], [3, 0, 5, 8], [3, 8, 4, 8],
        [4, 0, 3, 3], [4, 3, 4, 3], [4, 6, 5, 2], [4, 8, 6, 3], [4, 11, 7, 5], [5, 0, 6, 8], [5, 8, 4, 8], [6, 0, 3, 6], [6, 8, 2, 8], [7, 0, 1, 8], [7, 8, 0, 8]]) }; })(),
  // Dinh thự: ngũ cung thứ, taiko chậm nặng, đàn gảy, có ô nhịp lặng
  palace: (() => { const c = [[57, 'm'], [55, 'M'], [53, 'M'], [52, 'M'], [57, 'm'], [55, 'M'], [50, 'm'], [52, 'M']];
    return { bpm: 104, chords: c, bass: 'R.....R.R.......', bassLen: 4, drone: true, pad: true, leadWave: 'pulse0.125', drums: ['K.....K.K...s...', 'K.....K.K.K.s.s.', 'K...............', 'K.....K.K...s.K.'],
      lead: line(69, 'penta', [[0, 0, 4, 2], [0, 2, 3, 2], [0, 4, 2, 4], [0, 8, 3, 2], [0, 10, 4, 2], [0, 12, 6, 4], [1, 0, 5, 8], [1, 8, 4, 8], [2, 0, 7, 4], [2, 4, 6, 2], [2, 6, 5, 2], [2, 8, 4, 8],
        [4, 0, 4, 2], [4, 2, 5, 2], [4, 4, 6, 4], [4, 8, 7, 2], [4, 10, 6, 2], [4, 12, 8, 4], [5, 0, 7, 8], [5, 8, 6, 8], [6, 0, 4, 4], [6, 4, 3, 4], [6, 8, 2, 8], [7, 0, 1, 8], [7, 8, 2, 8]]) }; })(),
  // Núi lửa: Đô thứ hoà âm, nhanh, bass 16 phách gầm, drone méo, stab
  volcano: (() => { const c = [[48, 'm'], [44, 'M'], [43, 'M'], [48, 'm'], [41, 'm'], [49, 'M'], [43, 'M'], [43, 'M']];
    return { bpm: 150, vol: 1.05, chords: c, bass: 'RrRrRrRrRrRrRrRr', bassLen: 1, drone: true, distort: true, stab: true, arp: true, arpStep: 1, drums: ['KKh.s.hhKKh.s.hK', 'KKh.s.hhKKhKs.ss'],
      lead: line(60, 'hm', [[0, 0, 7, 1], [0, 1, 7, 1], [0, 2, 8, 2], [0, 4, 7, 2], [0, 6, 6, 2], [0, 8, 4, 4], [0, 12, 6, 4], [1, 0, 5, 4], [1, 4, 4, 4], [1, 8, 3, 8], [2, 0, 6, 2], [2, 2, 7, 2], [2, 4, 8, 4], [2, 8, 9, 8], [3, 0, 7, 8], [3, 8, 4, 8],
        [4, 0, 7, 1], [4, 1, 7, 1], [4, 2, 10, 2], [4, 4, 9, 2], [4, 6, 8, 2], [4, 8, 7, 4], [4, 12, 8, 4], [5, 0, 8, 4], [5, 4, 7, 4], [5, 8, 6, 8], [6, 0, 6, 4], [6, 4, 7, 4], [6, 8, 8, 8], [7, 0, 6, 8], [7, 8, 4, 8]]) }; })()
};
const TRACKS = { title: TITLE };
for (const [k, sp] of Object.entries(MAP)) { TRACKS['map_' + k] = build(sp); TRACKS['boss_' + k] = build(bossOf(sp, k === 'frost' ? { bell: 'x.x.x.x.x.x.x.x.', drums: ['KkhKs.hkKkhKs.ss', 'H.H.KKs.H.H.KKss'] } : k === 'palace' ? { drums: ['K.K.K.s.K.K.KKs.', 'KKK.K.s.K.K.s.ss'] } : {})); }
TRACKS.battle = TRACKS.map_forest; TRACKS.boss = TRACKS.boss_forest;

const Music = { cur: null, want: null, timer: null, tr: 0, phase: 0 };
// lớp tạo không khí
function drone(f, t, d, v, g, distort) {
  const o1 = ac.createOscillator(), o2 = ac.createOscillator(), flt = ac.createBiquadFilter(), gn = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
  o1.type = 'sawtooth'; o2.type = distort ? 'square' : 'sawtooth'; o1.frequency.value = f; o2.frequency.value = f * 1.006;
  flt.type = 'lowpass'; flt.frequency.value = distort ? 700 : 380; flt.Q.value = 4; lfo.frequency.value = 0.35; lg.gain.value = distort ? 300 : 160; lfo.connect(lg); lg.connect(flt.frequency);
  gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(v, t + 0.4); gn.gain.setValueAtTime(v, t + d - 0.3); gn.gain.linearRampToValueAtTime(0.0001, t + d);
  o1.connect(flt); o2.connect(flt); flt.connect(gn); gn.connect(g.bus); for (const o of [o1, o2, lfo]) { o.start(t); o.stop(t + d + 0.05); }
}
function playEv(e, t, sd, tr) {
  const v = tr.vol, g = { bus: Music.cur.gain }, tp = Music.tr;
  switch (e.ch) {
    case 'lead': osc(tr.lead, m2f(e.m + tp), t, e.len * sd * 0.95, 0.07 * v, { ...g, vib: e.len > 3 ? 5 : 0, vibF: 5.5, sustain: 0.6, attack: 0.01 }); break;
    case 'bass': osc('triangle', m2f(e.m + tp), t, e.len * sd * 0.9, 0.16 * v, { ...g, sustain: 0.7 }); if (tr.distort) osc('square', m2f(e.m + tp), t, e.len * sd * 0.6, 0.03 * v, { ...g }); break;
    case 'arp': osc('pulse0.125', m2f(e.m + tr.arpUp + tp), t, sd * 0.8, 0.02 * v, { ...g }); break;
    case 'drone': drone(m2f(e.m + tp), t, e.len * sd, (Music.phase > 0 ? 0.065 : 0.045) * v, g, tr.distort); if (Music.phase > 0) drone(m2f(e.m + tp + 7), t, e.len * sd, 0.03 * v, g, true); break;
    case 'pad': for (const [i, k] of e.tri.entries()) osc('triangle', m2f(e.m + k + tp + (i === 2 ? 6 : 0) * 0), t, e.len * sd, 0.018 * v, { ...g, attack: 0.6, sustain: 0.7, vib: 3, vibF: 0.3 + i * 0.1 }); osc('triangle', m2f(e.m + 6 + tp), t + e.len * sd * 0.5, e.len * sd * 0.5, 0.01 * v, { ...g, attack: 0.5, sustain: 0.6 }); break;
    case 'stab': for (const k of e.tri) osc('square', m2f(e.m + k + 12 + tp), t, 0.14, 0.03 * v, { ...g }); break;
    case 'bell': osc('triangle', m2f(e.m + tp), t, 0.7, 0.03 * v, { ...g }); osc('sine', m2f(e.m + tp) * 2.76, t, 0.35, 0.012 * v, { ...g }); break;
    case 'wind': nz(t, sd * 32, 0.03 * v, { ...g, type: 'bandpass', f: 300, to: 1400, q: 6, attack: sd * 12 }); break;
    case 'drip': osc('sine', m2f(e.m + tp), t, 0.09, 0.025 * v, { ...g, to: m2f(e.m + tp) * 0.5 }); break;
    case 'k': osc('sine', 150, t, 0.13, 0.22 * v, { ...g, to: 40, slideT: 0.1 }); break;
    case 'K': osc('sine', 130, t, 0.28, 0.3 * v, { ...g, to: 30, slideT: 0.22 }); nz(t, 0.03, 0.08 * v, { ...g, type: 'highpass', f: 2000 }); break;
    case 'H': osc('sine', 72, t, 0.16, 0.24 * v, { ...g, to: 40 }); osc('sine', 64, t + 0.17, 0.2, 0.18 * v, { ...g, to: 36 }); break;
    case 't': osc('sine', 140, t, 0.2, 0.15 * v, { ...g, to: 70 }); break;
    case 's': nz(t, 0.12, 0.09 * v, { ...g, type: 'bandpass', f: 1800, q: 0.7 }); osc('triangle', 190, t, 0.06, 0.06 * v, { ...g, to: 120 }); break;
    case 'h': nz(t, 0.03, 0.035 * v, { ...g, type: 'highpass', f: 7000 }); break;
  }
}
function tick() {
  const c = Music.cur; if (!ac || !c) return;
  const tr = TRACKS[c.name], sd = 60 / tr.bpm / 4;
  while (c.next < ac.currentTime + 0.18) {
    const list = c.step < tr.IL ? tr.introBy.get(c.step) : tr.by.get((c.step - tr.IL) % tr.L);
    if (list) for (const e of list) playEv(e, c.next, sd, tr);
    c.step++; c.next += sd;
  }
}
export function music(name) {
  if (!ac || Music.want === name) return; Music.want = name;
  const t = ac.currentTime;
  if (Music.cur) { const old = Music.cur.gain; old.gain.setTargetAtTime(0, t, 0.25); setTimeout(() => old.disconnect(), 1500); }
  if (!name) { Music.cur = null; return; }
  const gain = ac.createGain(); gain.gain.setValueAtTime(0.0001, t); gain.gain.linearRampToValueAtTime(1, t + 0.8); gain.connect(musBus);
  Music.cur = { name, gain, step: 0, next: t + 0.1 }; Music.phase = 0; Music.tr = 0;
  if (!Music.timer) Music.timer = setInterval(tick, 30);
}
// pha boss: nâng tông nửa cung mỗi pha và thêm lớp drone
export function musicPhase(n) { if (n !== Music.phase) { Music.phase = n; Music.tr = n; } }
