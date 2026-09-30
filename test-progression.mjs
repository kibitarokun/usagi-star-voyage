import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STAGES,segmentHit} from './game-core.mjs';

const advance=(g,seconds)=>{for(let t=0;t<seconds;t+=.02)g.step(.02);};
function hitWithLaser(g,target){g.fire=100;g.spawn=100;g.shots=[{id:g.id(),x:target.x,y:target.y,z:target.z+1,vx:0,vy:0,vz:-100}];g.step(.02);}
function finishWave(g){const goal=STAGES[g.stage].goal;for(let i=0;i<goal;i++){const e={id:g.id(),type:'drone',x:0,y:0,z:-12,hp:1,r:.8,speed:0,age:0,wobble:0,fired:true};g.enemies=[e];hitWithLaser(g,e);assert.equal(g.stageKills,i+1);assert.equal(g.phase,i===goal-1?'stageclear':'swarm');}}
function nextStage(g,stage){advance(g,2.3);assert.equal(g.phase,'transit');advance(g,1.7);assert.equal(g.stage,stage);assert.equal(g.phase,STAGES[stage].kind);}

test('warp → eight increasingly difficult stages → final clear; terminal state freezes',()=>{
  const g=new Game(()=>.5);g.reset();advance(g,3.5);assert.equal(g.stage,1);assert.equal(g.phase,'swarm');
  assert.ok(STAGES[1].goal<STAGES[2].goal&&STAGES[2].goal<STAGES[4].goal);
  assert.ok(STAGES[1].enemySpeed<STAGES[2].enemySpeed&&STAGES[2].enemySpeed<STAGES[4].enemySpeed);
  finishWave(g);nextStage(g,2);finishWave(g);nextStage(g,3);
  const b=g.boss;b.x=0;b.y=1.69;b.z=-27;b.hp=1;hitWithLaser(g,b);assert.equal(g.phase,'stageclear');nextStage(g,4);
  finishWave(g);nextStage(g,5);
  const f=g.boss;f.x=0;f.y=1.69;f.z=-27;f.hp=1;hitWithLaser(g,f);assert.equal(g.phase,'stageclear');
  nextStage(g,6);finishWave(g);nextStage(g,7);finishWave(g);nextStage(g,8);
  assert.equal(g.boss.max,240);g.hit(g.boss,240);assert.equal(g.phase,'victory');
  const score=g.score,lives=g.lives;assert.equal(g.damage(),false);advance(g,3);assert.equal(g.phase,'clear');advance(g,30);assert.equal(g.score,score);assert.equal(g.lives,lives);assert.equal(g.beams.length,0);
  g.reset();assert.equal(g.phase,'warp');assert.equal(g.stage,0);assert.equal(g.score,0);assert.equal(g.shotsFired,0);assert.equal(g.lives,5);
});

test('shooting fires only while held and stops on release or restart',()=>{
  const g=new Game(()=>.5);g.reset();g.beginStage(1);g.spawn=100;advance(g,.5);assert.equal(g.shotsFired,0);
  g.setFiring(true);g.step(.02);assert.equal(g.shotsFired,2);g.setFiring(false);advance(g,.5);assert.equal(g.shotsFired,2);
  g.reset();assert.equal(g.firing,false);advance(g,3.5);advance(g,.5);assert.equal(g.shotsFired,0);
});

test('game over locks damage, restart clears entities, pause and invulnerability',()=>{
  const g=new Game();g.reset();g.beginStage(1);for(let i=0;i<5;i++){g.player.inv=0;g.damage();}assert.equal(g.phase,'over');assert.equal(g.lives,0);assert.equal(g.damage(),false);advance(g,10);assert.equal(g.enemies.length,0);g.paused=true;g.reset();assert.equal(g.paused,false);assert.equal(g.player.inv,0);assert.equal(g.lives,5);
});

test('dead targets cannot score twice or trigger duplicate stage clear',()=>{
  const g=new Game();g.reset();g.beginStage(1);g.stageKills=STAGES[1].goal-1;const e={type:'drone',hp:1,x:0,y:0,z:-20};g.hit(e,1);const score=g.score;g.hit(e,1);assert.equal(g.stageKills,STAGES[1].goal);assert.equal(g.score,score);assert.equal(g.phase,'stageclear');
});

test('boss attacks approach player; pause freezes state; movement remains bounded',()=>{
  const g=new Game(()=>.5);g.reset();g.beginStage(3);advance(g,3);assert.ok(g.bullets.length>0);assert.ok(g.bullets.every(b=>b.vz>0));g.move(100,-100);assert.equal(g.player.x,5.8);assert.equal(g.player.y,-3.5);g.paused=true;const s=JSON.stringify(g);g.step(.04);g.move(0,0);assert.equal(JSON.stringify(g),s);
});

test('enemy shots crossing cockpit reduce SHIELD once',()=>{
  const g=new Game();g.reset();g.beginStage(1);g.bullets=[{id:g.id(),x:0,y:g.player.y+.9,z:g.player.z+1,vx:0,vy:0,vz:-18,r:.2}];g.step(.05);assert.equal(g.lives,4);assert.equal(g.bullets.length,0);assert.ok(g.takeEvents().some(e=>e.type==='damage'&&e.source==='bullet'));
});

test('charged beam gives warning, hits once if not dodged, and clears on phase change',()=>{
  const g=new Game(()=>.5);g.reset();g.beginStage(3);g.chargeBeam('boss',{x:0,y:0,z:-27});
  advance(g,.5);assert.equal(g.beams[0].state,'charge');assert.equal(g.lives,5);
  advance(g,.55);assert.equal(g.beams[0].state,'fire');assert.equal(g.lives,4);
  assert.ok(g.takeEvents().some(e=>e.type==='damage'&&e.source==='beam'));
  advance(g,.4);assert.equal(g.lives,4);g.enter('stageclear');assert.equal(g.beams.length,0);
});

test('moving out of a charged beam avoids damage',()=>{
  const g=new Game(()=>.5);g.reset();g.beginStage(3);g.chargeBeam('boss',{x:0,y:0,z:-27});g.move(5.8,3.7);advance(g,1.3);assert.equal(g.lives,5);
});

test('rock impact loses SHIELD and identifies the source for a shared reaction',()=>{
  const g=new Game();g.reset();g.beginStage(1);g.spawn=100;g.enemies=[{id:g.id(),type:'rock',x:0,y:g.player.y,z:g.player.z,hp:2,r:.85,speed:0,age:0,wobble:0,fired:true}];g.step(.02);assert.equal(g.lives,4);assert.ok(g.takeEvents().some(e=>e.type==='damage'&&e.source==='rock'));
});

test('fast shots use swept collision',()=>{assert.equal(segmentHit({x:0,y:0,z:10},{x:0,y:0,z:-10},{x:0,y:0,z:0},.3),true);assert.equal(segmentHit({x:2,y:0,z:10},{x:2,y:0,z:-10},{x:0,y:0,z:0},.3),false);});

test('retry restores each failed stage checkpoint and can be repeated without score farming',()=>{
  for(let stage=1;stage<STAGES.length;stage++){
    const g=new Game(()=>.5);g.score=1000;g.kills=9;g.beginStage(stage);
    for(let attempt=0;attempt<3;attempt++){
      g.score+=400;g.stageKills=3;g.kills+=3;g.setFiring(true);
      for(let i=0;i<5;i++){g.player.inv=0;g.damage();}
      assert.equal(g.phase,'over');assert.equal(g.retryStage(),true);
      assert.equal(g.stage,stage);assert.equal(g.phase,STAGES[stage].kind);assert.equal(g.score,1000);assert.equal(g.kills,9);assert.equal(g.stageKills,0);assert.equal(g.lives,5);assert.equal(g.firing,false);assert.equal(g.bullets.length,0);assert.equal(g.beams.length,0);assert.equal(g.player.x,0);
      if(g.boss)assert.equal(g.boss.hp,STAGES[stage].hp);
    }
    g.reset();assert.equal(g.checkpoint,null);assert.equal(g.stage,0);assert.equal(g.score,0);assert.equal(g.retryStage(),false);
  }
});

test('advanced sectors spawn denser formations and distinct movement paths',()=>{
  for(const stage of [6,7]){const g=new Game(()=>.5);g.beginStage(stage);g.spawnEnemy();assert.equal(g.enemies.length,STAGES[stage].formation);assert.ok(STAGES[stage].goal>STAGES[4].goal);}
  const positions=[];
  for(const movement of ['weaver','orbiter','diver']){const g=new Game(()=>.5);g.beginStage(7);g.spawn=100;g.spawnEnemy();const e=g.enemies[0];e.movement=movement;e.z=-35;g.moveEnemy(e,.05);positions.push([e.x,e.y,e.z]);assert.ok(Object.values(e).every(v=>typeof v!=='number'||Number.isFinite(v)));if(movement==='diver'){const aim={...e.dive};g.move(5,3);g.moveEnemy(e,.05);assert.deepEqual(e.dive,aim);}}
  assert.equal(new Set(positions.map(JSON.stringify)).size,3);
});

test('super flagship enrages once and launches three warned, dodgeable beams',()=>{
  const g=new Game(()=>.5);g.beginStage(8);g.boss.hp=120;g.boss.beamCooldown=0;g.step(.02);
  assert.equal(g.beams.length,3);assert.ok(g.beams.every(b=>b.state==='charge'&&b.charge>.8));assert.equal(g.takeEvents().filter(e=>e.type==='enrage').length,1);
  g.move(5.8,3.7);advance(g,1.05);assert.equal(g.lives,5);assert.equal(g.takeEvents().filter(e=>e.type==='enrage').length,0);
  g.volley();assert.equal(g.bullets.length,13);g.hit(g.boss,999);assert.equal(g.beams.length,0);assert.equal(g.bullets.length,0);g.reset();assert.equal(g.boss,null);assert.equal(g.stage,0);
});
