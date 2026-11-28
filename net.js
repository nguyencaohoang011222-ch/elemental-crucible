// Kết nối co-op 2 người: bắt tay qua kênh Supabase Realtime theo mã phòng 4 ký tự, rồi nói chuyện trực tiếp qua WebRTC DataChannel.
// Cùng mạng LAN thì dữ liệu đi thẳng giữa hai máy; khác mạng vẫn chạy nếu hai bên thấy nhau qua STUN.
import { realtime } from './online.js';

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // bỏ I, O, 0, 1 cho khỏi nhầm
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
export const makeCode = () => Array.from({ length: 4 }, () => ABC[Math.floor(Math.random() * ABC.length)]).join('');
export const cleanCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);

// link.on(type, fn): 'open' | 'msg' | 'close' | 'error'
export class Link {
  constructor() { this.h = {}; this.id = Math.random().toString(36).slice(2, 10); this.peer = null; this.pc = null; this.dc = null; this.ch = null; this.open = false; this.closed = false; }
  on(t, fn) { this.h[t] = fn; return this; }
  fire(t, a) { const f = this.h[t]; if (f) try { f(a); } catch (e) { console.warn(e); } }
  send(o) { if (this.dc && this.dc.readyState === 'open') this.dc.send(JSON.stringify(o)); }
  async channel(code) {
    const ch = realtime('ea-coop-' + code); if (!ch) throw new Error('Online play is not set up on this site.');
    this.ch = ch;
    ch.on('broadcast', { event: 'sig' }, ({ payload }) => { if (payload && payload.to === this.id || (payload && !payload.to && payload.from !== this.id)) this.onSig(payload); });
    await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('Could not reach the server. Check your internet.')), 9000); ch.subscribe(s => { if (s === 'SUBSCRIBED') { clearTimeout(t); res(); } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { clearTimeout(t); rej(new Error('Could not reach the server. Check your internet.')); } }); });
  }
  sig(o) { if (this.ch) this.ch.send({ type: 'broadcast', event: 'sig', payload: { ...o, from: this.id } }); }
  // chủ phòng: mở kênh theo mã, chờ người vào
  async host(code) { this.role = 'host'; this.code = code; await this.channel(code); }
  // người vào: gửi lời chào, chờ chủ phòng gửi offer
  async join(code) {
    this.role = 'guest'; this.code = code; await this.channel(code);
    this.sig({ kind: 'knock' });
    this.knockT = setInterval(() => { if (!this.peer) this.sig({ kind: 'knock' }); }, 1500);
    this.failT = setTimeout(() => { if (!this.peer) { this.fire('error', 'No game found with that code.'); this.close(); } }, 9000);
  }
  makePC() {
    const pc = this.pc = new RTCPeerConnection(ICE);
    pc.onicecandidate = e => { if (e.candidate) this.sig({ kind: 'ice', to: this.peer, c: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => { const s = pc.connectionState; if ((s === 'failed' || s === 'closed' || s === 'disconnected') && this.open) { this.open = false; this.fire('close', 'Connection lost.'); } };
    return pc;
  }
  wireDC(dc) {
    this.dc = dc;
    dc.onopen = () => { this.open = true; clearInterval(this.knockT); clearTimeout(this.failT); this.fire('open'); if (this.ch) { this.ch.unsubscribe(); this.ch = null; } };
    dc.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } this.fire('msg', m); };
    dc.onclose = () => { if (this.open) { this.open = false; this.fire('close', 'Your partner left.'); } };
  }
  async onSig(m) {
    try {
      if (this.role === 'host' && m.kind === 'knock' && !this.peer) {
        this.peer = m.from; const pc = this.makePC(); this.wireDC(pc.createDataChannel('game', { ordered: true }));
        await pc.setLocalDescription(await pc.createOffer()); this.sig({ kind: 'offer', to: this.peer, sdp: pc.localDescription.toJSON() });
      } else if (this.role === 'host' && m.kind === 'knock' && this.peer && m.from !== this.peer) this.sig({ kind: 'full', to: m.from });
      else if (this.role === 'guest' && m.kind === 'full') { this.fire('error', 'That game already has two players.'); this.close(); }
      else if (this.role === 'guest' && m.kind === 'offer' && !this.peer) {
        this.peer = m.from; const pc = this.makePC(); pc.ondatachannel = e => this.wireDC(e.channel);
        await pc.setRemoteDescription(m.sdp); await pc.setLocalDescription(await pc.createAnswer()); this.sig({ kind: 'answer', to: this.peer, sdp: pc.localDescription.toJSON() });
      } else if (m.kind === 'answer' && this.pc && m.from === this.peer) await this.pc.setRemoteDescription(m.sdp);
      else if (m.kind === 'ice' && this.pc && m.from === this.peer) await this.pc.addIceCandidate(m.c);
    } catch (e) { console.warn('coop signal', e); }
  }
  close() {
    this.closed = true; clearInterval(this.knockT); clearTimeout(this.failT);
    try { if (this.dc) this.dc.close(); } catch (e) { /* đã đóng */ }
    try { if (this.pc) this.pc.close(); } catch (e) { /* đã đóng */ }
    try { if (this.ch) this.ch.unsubscribe(); } catch (e) { /* đã đóng */ }
    this.open = false; this.dc = this.pc = this.ch = null;
  }
}
