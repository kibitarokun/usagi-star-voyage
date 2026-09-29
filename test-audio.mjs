import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioDirector} from './audio.mjs';

class FakeParam {
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
  setTargetAtTime() {}
}
class FakeNode {
  constructor() { this.gain = new FakeParam(); this.frequency = new FakeParam(); this.started = false; }
  connect(node) { return node; }
  start() { this.started = true; }
  stop() {}
}
class FakeContext {
  constructor() { this.currentTime = 0; this.destination = new FakeNode(); this.oscillators = []; }
  createGain() { return new FakeNode(); }
  createOscillator() { const node = new FakeNode(); this.oscillators.push(node); return node; }
  async resume() {}
}

test('music follows combat phase and stops scheduling on pause or game over', async () => {
  const old = globalThis.AudioContext;
  globalThis.AudioContext = FakeContext;
  try {
    const audio = new AudioDirector();
    assert.equal(await audio.enable(), true);
    audio.tick('warp', false);
    assert.ok(audio.context.oscillators.length > 0);
    const duringWarp = audio.context.oscillators.length;
    audio.context.currentTime += 0.4;
    audio.tick('final', false);
    assert.ok(audio.context.oscillators.length > duringWarp);
    const duringBoss = audio.context.oscillators.length;
    audio.tick('final', true);
    audio.tick('over', false);
    assert.equal(audio.context.oscillators.length, duringBoss);
  } finally { globalThis.AudioContext = old; }
});

test('effects and fanfare honor mute and volume bounds', async () => {
  const old = globalThis.AudioContext;
  globalThis.AudioContext = FakeContext;
  try {
    const audio = new AudioDirector();
    await audio.enable();
    audio.setVolume(2);
    assert.equal(audio.volume, 1);
    audio.effect('beam');
    audio.fanfare(true);
    assert.equal(audio.context.oscillators.length, 6);
    audio.disable();
    audio.effect('shot');
    audio.tick('swarm', false);
    assert.equal(audio.context.oscillators.length, 6);
  } finally { globalThis.AudioContext = old; }
});
