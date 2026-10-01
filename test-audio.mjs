import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioDirector,combatSound} from './audio.mjs';
import {Game} from './game-core.mjs';
import {statSync} from 'node:fs';

class FakeParam {
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
  setTargetAtTime() {}
}

test('enemy defeat and boss damage/defeat events play the supplied recordings',()=>{
  const previous=globalThis.Audio,played=[];
  globalThis.Audio=class {constructor(url){this.url=url;}play(){played.push(this.url);return Promise.resolve();}};
  try{
    const audio=new AudioDirector();audio.enabled=true;
    const playEvents=g=>{for(const event of g.takeEvents()){const sound=combatSound(event);if(sound)audio.effect(sound);}};
    const g=new Game();g.beginStage(1);g.hit({type:'drone',hp:1,x:0,y:0,z:-20},1);playEvents(g);
    assert.deepEqual(played,['assets/sounds/enemy-down.mp3']);
    for(const stage of [3,5,8,9]){
      played.length=0;g.beginStage(stage);if(stage===9)g.enter('final');
      g.hit(g.boss,1);playEvents(g);assert.deepEqual(played,['assets/sounds/enemy-down.mp3']);
      played.length=0;g.hit(g.boss,999);playEvents(g);assert.deepEqual(played,['assets/sounds/boss-down.mp3']);
    }
    for(const url of ['assets/sounds/enemy-down.mp3','assets/sounds/boss-down.mp3'])assert.ok(statSync(new URL(url,import.meta.url)).size>0);
    played.length=0;audio.enabled=false;audio.effect('enemyDown');audio.effect('bossBlast');assert.equal(played.length,0);
  }finally{globalThis.Audio=previous;}
});
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
