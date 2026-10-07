// Tiny synthesized sound effects, so the game needs no audio files.
class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, dur, { type = 'square', vol = 0.08, slideTo = null, delay = 0 } = {}) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.1, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    gain.gain.value = vol;
    src.connect(gain).connect(this.ctx.destination);
    src.start(t);
  }

  play(name, volume = 1) {
    switch (name) {
      case 'pew': this.tone(900, 0.08, { slideTo: 380, vol: 0.04 * volume }); break;
      case 'throw': this.noise(0.18, 0.06 * volume); this.tone(500, 0.15, { type: 'sine', slideTo: 900, vol: 0.04 * volume }); break;
      case 'bonk': this.tone(320, 0.16, { type: 'sine', slideTo: 110, vol: 0.2 * volume }); break;
      case 'hit': this.tone(1400, 0.05, { type: 'triangle', vol: 0.08 }); break;
      case 'hurt': this.tone(220, 0.15, { type: 'sawtooth', slideTo: 110, vol: 0.06 }); break;
      case 'pop':
        this.noise(0.25, 0.15 * volume);
        [660, 880, 1100].forEach((f, i) => this.tone(f, 0.12, { type: 'triangle', vol: 0.07 * volume, delay: i * 0.05 }));
        break;
      case 'jump': this.tone(380, 0.12, { type: 'sine', slideTo: 720, vol: 0.06 }); break;
      case 'swap': this.tone(600, 0.06, { type: 'triangle', vol: 0.06 }); break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.1, delay: i * 0.14 }));
        break;
      case 'lose':
        [392, 330, 262].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.08, delay: i * 0.18 }));
        break;
      default: break;
    }
  }
}

export const sound = new Sound();
