// Nhạc + SFX của trailer: chiptune 16-bit / dark synthwave tự tổng hợp bằng Web Audio (không file, không bản quyền).
// Cùng một bộ dựng chạy được trên AudioContext (phát trực tiếp, OBS thu được) và OfflineAudioContext (xuất WAV khớp từng khung hình).
// 135 BPM, La thứ: Am – F – G – E. Mở đầu chỉ có bass gằn → vào beat ở DROP → cắt phụt ở CUT → sub-bass + hợp âm chiến thắng ở SLAM.
export const BPM = 135, BEAT = 60 / BPM, BAR = BEAT * 4, S16 = BEAT / 4;
export const DROP = BAR * 2;                 // 3.556s: nhát chém tụ lực đầu tiên
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);   // số MIDI → Hz
// hợp âm mỗi ô nhịp: gốc bass (MIDI) + các nốt hợp âm
const PROG = [{ root: 45, tones: [57, 60, 64] }, { root: 41, tones: [53, 57, 60] }, { root: 43, tones: [55, 59, 62] }, { root: 40, tones: [52, 56, 59] }];
// giai điệu chính (nốt 8, 0 = nghỉ), 4 ô nhịp lặp lại
const MEL = [[76, 0, 74, 72, 76, 0, 79, 76], [72, 0, 69, 72, 74, 0, 72, 69], [74, 0, 71, 67, 74, 0, 76, 74], [71, 0, 68, 64, 71, 0, 76, 0]];

export class TrailerAudio {
  constructor(ctx, dest, t0 = 0) {
    this.ac = ctx; this.t0 = t0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2; comp.connect(dest);
    this.master = ctx.createGain(); this.master.gain.value = 0.85; this.master.connect(comp);
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 18000; this.lp.Q.value = 0.9; this.lp.connect(this.master);   // lọc nhạc khi quay chậm
    this.mus = ctx.createGain(); this.mus.gain.value = 0.62; this.mus.connect(this.lp);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.8; this.sfx.connect(this.master);
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0); let s = 12345;
    for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }   // nhiễu giả ngẫu nhiên cố định → bản xuất file luôn giống nhau
    this.noise = nb; this.waves = {};
  }
  T(t) { return this.t0 + t; }
  pw(duty) { if (this.waves[duty]) return this.waves[duty]; const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let i = 1; i < n; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty); return (this.waves[duty] = this.ac.createPeriodicWave(re, im)); }
  // một nốt: sóng (pulse12/pulse25/square/sawtooth/triangle/sine), Hz, lúc bắt đầu (giây phim), độ dài, âm lượng
  osc(type, f, t, d, v, o = {}) {
    const ac = this.ac, os = ac.createOscillator(), g = ac.createGain(), t0 = this.T(t), stop = o.cut != null ? Math.min(t0 + d, this.T(o.cut)) : t0 + d;
    if (stop <= t0) return;
    if (type === 'pulse12') os.setPeriodicWave(this.pw(0.125)); else if (type === 'pulse25') os.setPeriodicWave(this.pw(0.25)); else os.type = type;
    os.frequency.setValueAtTime(f, t0); if (o.to) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + (o.slide || d));
    const a = o.a || 0.004; g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + a);
    if (o.hold) { g.gain.setValueAtTime(v, Math.max(t0 + a, stop - (o.rel || 0.05))); g.gain.linearRampToValueAtTime(0.0001, stop); } else g.gain.exponentialRampToValueAtTime(0.0001, stop);
    let node = os; if (o.lp) { const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(o.lp, t0); if (o.lpTo) f2.frequency.exponentialRampToValueAtTime(o.lpTo, stop); f2.Q.value = o.q || 4; os.connect(f2); node = f2; }
    node.connect(g); g.connect(o.bus || this.mus); os.start(t0); os.stop(stop + 0.02);
  }
  nz(t, d, v, o = {}) {
    const ac = this.ac, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t0 = this.T(t), stop = o.cut != null ? Math.min(t0 + d, this.T(o.cut)) : t0 + d;
    if (stop <= t0) return;
    src.buffer = this.noise; src.loop = true; f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 2000, t0); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, stop); f.Q.value = o.q || 0.8;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + (o.a || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, stop);
    src.connect(f); f.connect(g); g.connect(o.bus || this.mus); src.start(t0, (t * 0.37) % 1.5); src.stop(stop + 0.02);
  }
  // ---------- nhạc ----------
  music(plan) {
    const { cut, slam, end } = plan;
    const kick = t => { this.osc('sine', 150, t, 0.2, 0.95, { to: 42, slide: 0.12, cut }); this.osc('square', 1200, t, 0.012, 0.08, { cut }); };
    const snare = t => { this.nz(t, 0.16, 0.42, { f: 1900, q: 0.7, cut }); this.osc('triangle', 196, t, 0.09, 0.22, { to: 140, cut }); };
    const hat = (t, v = 0.13, d = 0.035) => this.nz(t, d, v, { type: 'highpass', f: 7500, cut });
    // mở đầu: bass gằn nốt 8 trên La, bộ lọc mở dần; hi-hat nhẹ; trống dồn + riser ở ô nhịp thứ 2
    for (let i = 0; i < 16; i++) { const t = i * BEAT / 2; this.osc('sawtooth', NOTE(33), t, BEAT / 2 * 0.9, 0.36, { lp: 260 + i * 70, q: 8, cut }); this.osc('triangle', NOTE(33), t, BEAT / 2 * 0.8, 0.22, { cut }); if (i % 2) hat(t, 0.06); }
    for (let i = 0; i < 8; i++) snare(BAR + BAR / 2 + i * S16);   // trống dồn nốt 16 ở nửa sau ô nhịp 2
    this.nz(BAR, BAR, 0.28, { f: 300, to: 6000, q: 1.2, cut });
    // phần chính: từ DROP tới CUT
    for (let t = DROP, bar = 0; t < cut - 0.001; t += BAR, bar++) {
      const ch = PROG[bar % 4], late = t > 10, peak = t > 21;
      for (let b = 0; b < 4; b++) { const tb = t + b * BEAT; if (tb >= cut) break; kick(tb); if (b % 2) snare(tb); for (let s = 0; s < 4; s++) hat(tb + s * S16, s % 2 ? 0.07 : 0.12); }
      if (bar % 2 === 1) hat(t + BAR - S16, 0.14, 0.16);   // hi-hat mở cuối mỗi 2 ô
      // bass: nốt 8 gốc ↔ bát độ, saw qua lọc + triangle sub
      for (let e = 0; e < 8; e++) { const te = t + e * BEAT / 2; if (te >= cut) break; const n = ch.root - 12 + (e % 2 ? 12 : 0); this.osc('sawtooth', NOTE(n), te, BEAT / 2 * 0.85, 0.3, { lp: 900, lpTo: 400, q: 6, cut }); if (e % 2 === 0) this.osc('triangle', NOTE(ch.root - 12), te, BEAT / 2 * 0.9, 0.3, { cut }); }
      // arpeggio nốt 16 hai quãng tám (pulse 12.5%)
      const tones = [...ch.tones, ...ch.tones.map(n => n + 12)], pat = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 5, 4, 2, 3, 1];
      for (let s = 0; s < 16; s++) { const ts = t + s * S16; if (ts >= cut) break; this.osc('pulse12', NOTE(tones[pat[s]] + 12), ts, S16 * 0.9, late ? 0.075 : 0.06, { cut }); }
      // giai điệu chính vào sau 2 ô nhịp; đoạn cao trào nhân đôi bát độ
      if (bar >= 2) MEL[bar % 4].forEach((n, k) => { const tm = t + k * BEAT / 2; if (!n || tm >= cut) return; this.osc('pulse25', NOTE(n), tm, BEAT / 2 * 0.95, 0.11, { hold: true, rel: 0.04, cut }); if (peak) this.osc('pulse12', NOTE(n + 12), tm, BEAT / 2 * 0.9, 0.05, { hold: true, cut }); });
      if (late) this.osc('sawtooth', NOTE(ch.tones[0] - 12), t, BAR * 0.98, 0.05, { a: 0.3, hold: true, rel: 0.2, lp: 1200, q: 2, cut });   // pad tối kiểu synthwave
    }
    // màn tiêu đề: sub-bass nổ + tiếng đập kim loại + hợp âm La trưởng add9 lấp lánh
    this.osc('sine', 72, slam, 2.4, 1.0, { to: 26, slide: 1.8 });
    this.nz(slam, 1.4, 0.5, { type: 'lowpass', f: 1400, to: 120 });
    this.osc('square', 98, slam, 0.6, 0.22, { to: 92 }); this.osc('square', 147.5, slam, 0.5, 0.16, { to: 140 }); this.nz(slam, 0.25, 0.35, { type: 'highpass', f: 3000 });
    const chord = [57, 61, 64, 69, 71, 76], tail = Math.max(1, end - slam - 0.25);
    chord.forEach((n, i) => this.osc(i % 2 ? 'pulse25' : 'pulse12', NOTE(n), slam + 0.08 + i * 0.03, tail, 0.06, { a: 0.25, hold: true, rel: 1.2 }));
    for (let i = 0; i < 48; i++) this.osc('triangle', NOTE(chord[i % chord.length] + 12), slam + 0.3 + i * S16 / 2, S16 * 0.6, 0.05 * (1 - i / 60));
  }
  // nhạc bị lọc 300 Hz trong lúc quay chậm rồi bật lại
  slow(t, dur) { const f = this.lp.frequency, t0 = this.T(t); f.setTargetAtTime(300, t0, 0.025); f.setTargetAtTime(18000, t0 + dur, 0.04); }
  // ---------- SFX ----------
  cue(type, t) {
    const B = { bus: this.sfx };
    switch (type) {
      case 'whoosh': this.nz(t, 0.3, 0.5, { f: 3200, to: 420, q: 1.4, ...B }); break;
      case 'riser': this.nz(t, 0.9, 0.3, { f: 280, to: 5200, q: 2, ...B }); this.osc('sawtooth', 110, t, 0.9, 0.12, { to: 520, lp: 2400, q: 3, ...B }); break;
      case 'charge': this.osc('square', 220, t, 0.36, 0.06, { to: 660, ...B }); this.nz(t, 0.36, 0.08, { f: 800, to: 3000, ...B }); break;
      case 'burst': this.osc('sine', 130, t, 0.45, 0.85, { to: 38, slide: 0.3, ...B }); this.nz(t, 0.55, 0.55, { type: 'lowpass', f: 2200, to: 200, ...B }); this.osc('square', 880, t, 0.16, 0.08, { to: 180, ...B }); break;
      case 'thud': this.osc('sine', 90, t, 0.28, 0.35, { to: 40, ...B }); this.nz(t, 0.18, 0.18, { type: 'lowpass', f: 900, ...B }); break;
      case 'hit': this.nz(t, 0.045, 0.14, { f: 2600, q: 1.2, ...B }); this.osc('square', 330, t, 0.035, 0.035, { ...B }); break;
      case 'kill': this.osc('square', 660, t, 0.07, 0.05, { to: 1320, ...B }); break;
      case 'zap': this.nz(t, 0.6, 0.85, { type: 'highpass', f: 2600, ...B }); this.osc('sawtooth', 70, t, 0.8, 0.3, { to: 35, lp: 600, ...B }); break;
      case 'morph': [81, 85, 88, 93].forEach((n, i) => this.osc('triangle', NOTE(n), t + i * 0.035, 0.18, 0.09, { ...B })); this.nz(t, 0.25, 0.15, { type: 'highpass', f: 5000, ...B }); break;
    }
  }
  fadeOut(sec = 0.35) { const g = this.master.gain, t = this.ac.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.0001, t + sec); const m = this.master; setTimeout(() => { try { m.disconnect(); } catch (e) { /* đã ngắt */ } }, sec * 1000 + 100); }
}

// xuất WAV 16-bit từ AudioBuffer (dùng cho bản dựng video)
export function wavDataURL(buf) {
  const ch = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length, bytes = 44 + n * ch * 2, ab = new ArrayBuffer(bytes), v = new DataView(ab);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * ch * 2, true);
  const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
  let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  let bin = ''; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return 'data:audio/wav;base64,' + btoa(bin);
}
