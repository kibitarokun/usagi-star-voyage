// Small, self-contained soundtrack: no downloads and no autoplay before a gesture.
export class AudioDirector {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = false;
    this.volume = 0.55;
    this.step = 0;
    this.nextNote = 0;
    this.phase = 'ready';
  }

  async enable() {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return false;
    if (!this.context) {
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
    }
    await this.context.resume();
    this.enabled = true;
    this.setVolume(this.volume);
    this.nextNote = this.context.currentTime;
    return true;
  }

  disable() {
    this.enabled = false;
    if (this.master && this.context) this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.015);
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.context.currentTime, 0.02);
  }

  setPhase(phase) {
    if (this.phase !== phase) {
      this.phase = phase;
      this.step = 0;
      if (this.context) this.nextNote = this.context.currentTime;
    }
  }

  note(frequency, duration, type = 'sine', level = 0.02, when = this.context?.currentTime, ending = frequency) {
    if (!this.enabled || !this.context || !this.master) return;
    const start = Math.max(this.context.currentTime, when);
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(30, frequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, ending), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), start + Math.min(0.025, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }

  effect(kind) {
    const effects = {
      shot: [870, 0.085, 'triangle', 0.018, 190],
      hit: [660, 0.16, 'sine', 0.032, 980],
      damage: [190, 0.44, 'sawtooth', 0.055, 43],
      blast: [130, 0.3, 'sawtooth', 0.044, 38],
      bossBlast: [90, 0.82, 'sawtooth', 0.07, 31],
      volley: [270, 0.16, 'triangle', 0.024, 100],
      charge: [180, 0.55, 'sine', 0.034, 790],
      beam: [1020, 0.62, 'sawtooth', 0.045, 90],
      warp: [65, 1.8, 'sine', 0.05, 460],
    };
    const [frequency, duration, type, level, ending] = effects[kind] || effects.hit;
    this.note(frequency, duration, type, level, undefined, ending);
  }

  fanfare(success) {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime;
    const notes = success ? [392, 523.25, 659.25, 783.99, 1046.5] : [392, 329.63, 261.63, 196];
    notes.forEach((frequency, i) => this.note(frequency, success ? 0.52 : 0.48, 'triangle', 0.055, now + i * 0.16, frequency));
  }

  tick(phase, paused) {
    this.setPhase(phase);
    if (!this.enabled || !this.context || paused || ['ready', 'clear', 'over'].includes(phase)) {
      if (this.context) this.nextNote = this.context.currentTime;
      return;
    }
    const combat = ['swarm', 'miniboss', 'final'].includes(phase);
    const boss = ['miniboss', 'final'].includes(phase);
    const interval = boss ? 0.22 : combat ? 0.25 : 0.32;
    const roots = boss ? [55, 55, 65.41, 49] : combat ? [65.41, 65.41, 73.42, 55] : [65.41, 82.41, 73.42, 98];
    const lead = boss ? [0, 3, 7, 10, 7, 3, 12, 10] : [0, 7, 12, 7, 3, 7, 10, 7];
    let scheduled = 0;
    while (this.nextNote < this.context.currentTime + 0.1 && scheduled++ < 2) {
      const s = this.step++;
      const root = roots[Math.floor(s / 8) % roots.length];
      const at = this.nextNote;
      if (s % 4 === 0) this.note(root, boss ? 0.48 : 0.6, 'sine', combat ? 0.06 : 0.035, at, root * 0.9);
      if (combat && s % 4 === 2) this.note(60, 0.11, 'triangle', 0.026, at, 34);
      if (s % 2 === 0 || combat) this.note(root * 4 * 2 ** (lead[s % 8] / 12), combat ? 0.15 : 0.3, 'triangle', combat ? 0.014 : 0.009, at);
      if (boss && s % 2 === 1) this.note(1800, 0.035, 'sine', 0.007, at, 500);
      this.nextNote += interval;
    }
    if (this.nextNote < this.context.currentTime) this.nextNote = this.context.currentTime;
  }
}
