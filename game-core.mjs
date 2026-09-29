export const STAGES = [
  null,
  {kind:'swarm',goal:6,spawn:.95,enemySpeed:15,bulletSpeed:12,enemyHp:1,rockChance:.10,beamChance:0},
  {kind:'swarm',goal:9,spawn:.74,enemySpeed:18,bulletSpeed:15,enemyHp:2,rockChance:.13,beamChance:.22},
  {kind:'miniboss',hp:55,volleyCount:4,volleySpeed:19,volleyDelay:1.85,beamDelay:5.6},
  {kind:'swarm',goal:12,spawn:.53,enemySpeed:23,bulletSpeed:19,enemyHp:3,rockChance:.16,beamChance:.34},
  {kind:'final',hp:125,volleyCount:7,volleySpeed:23,volleyDelay:1.15,beamDelay:4.1}
];
export const PHASES = {ready:'出撃準備',warp:'ワープ航行',swarm:'敵編隊',miniboss:'中ボス',stageclear:'ステージクリア',transit:'次の戦域へ',final:'ラスボス',victory:'撃破',clear:'ゲームクリア',over:'ゲームオーバー'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const combat=p=>['swarm','miniboss','final'].includes(p);
export function segmentHit(a,b,p,r){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;const d=dx*dx+dy*dy+dz*dz;const t=d?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/d,0,1):0;return Math.hypot(a.x+dx*t-p.x,a.y+dy*t-p.y,a.z+dz*t-p.z)<=r;}
export class Game {
  constructor(random=Math.random){this.random=random;this.reset(false);}
  reset(start=true){this.phase=start?'warp':'ready';this.stage=0;this.stageKills=0;this.time=0;this.total=0;this.score=0;this.kills=0;this.shotsFired=0;this.lives=5;this.player={x:0,y:-1.8,z:6,inv:0};this.enemies=[];this.shots=[];this.bullets=[];this.beams=[];this.events=[];this.serial=0;this.spawn=0;this.fire=0;this.firing=false;this.boss=null;this.paused=false;}
  id(){return ++this.serial;}
  beginStage(stage){this.stage=stage;this.stageKills=0;this.enter(STAGES[stage].kind);}
  enter(phase){
    if(phase==='swarm'&&!this.stage)this.stage=1;
    if(phase==='miniboss'&&!this.stage)this.stage=3;
    if(phase==='final'&&!this.stage)this.stage=5;
    this.phase=phase;this.time=0;this.spawn=.2;this.fire=0;this.firing=false;this.shots=[];this.bullets=[];this.beams=[];this.enemies=[];this.boss=null;
    this.events.push({type:'phase',phase,stage:this.stage});
    if(phase==='miniboss'||phase==='final'){
      const final=phase==='final',hp=STAGES[this.stage].hp;
      this.boss={id:this.id(),type:phase,x:0,y:1,z:-55,hp,max:hp,r:final?3.7:2.6,cooldown:2.4,beamCooldown:final?3.2:4.2};
    }
    if(phase==='stageclear')this.score+=this.stage*250;
    if(phase==='transit')this.lives=Math.min(5,this.lives+1);
  }
  setFiring(value){this.firing=!!value;}
  takeEvents(){return this.events.splice(0);}
  move(x,y){if(this.paused||!combat(this.phase))return;this.player.x=clamp(x,-5.8,5.8);this.player.y=clamp(y,-3.5,3.7);}
  damage(source='impact'){if(!combat(this.phase)||this.paused||this.player.inv>0)return false;this.lives--;this.player.inv=1.4;this.events.push({type:'damage',source,...this.player});if(this.lives===0)this.enter('over');return true;}
  hit(target,power){
    if(!combat(this.phase)||this.paused||target.hp<=0)return false;
    target.hp=Math.max(0,target.hp-power);this.events.push({type:'hit',x:target.x,y:target.y,z:target.z});
    if(target.hp>0)return true;
    this.events.push({type:'explode',x:target.x,y:target.y,z:target.z,big:target.type!=='drone'&&target.type!=='rock'});
    if(target===this.boss){this.score+=this.phase==='final'?5000:1500;this.enter(this.phase==='final'?'victory':'stageclear');}
    else{this.score+=target.type==='rock'?50:150;if(target.type==='drone'){this.kills++;this.stageKills++;if(this.stageKills>=STAGES[this.stage].goal)this.enter('stageclear');}}
    return true;
  }
  spawnEnemy(){const cfg=STAGES[this.stage],rock=this.random()<cfg.rockChance;this.enemies.push({id:this.id(),type:rock?'rock':'drone',x:(this.random()-.5)*9.5,y:(this.random()-.5)*5.4,z:-62,hp:rock?2:cfg.enemyHp,r:rock?.85:.8,speed:rock?cfg.enemySpeed+5:cfg.enemySpeed,wobble:this.random()*6,age:0,fired:false});}
  volley(){const b=this.boss;if(!b)return;const cfg=STAGES[this.stage],count=cfg.volleyCount;const vx=this.player.x-b.x,vy=this.player.y-b.y,vz=this.player.z-b.z,len=Math.hypot(vx,vy,vz);for(let i=0;i<count;i++){const spread=(i-(count-1)/2)*.095;this.bullets.push({id:this.id(),x:b.x,y:b.y,z:b.z+1,vx:(vx/len+spread)*cfg.volleySpeed,vy:(vy/len+(this.phase==='final'?Math.sin(i*2)*.035:0))*cfg.volleySpeed,vz:vz/len*cfg.volleySpeed,r:.24});}this.events.push({type:'volley'});}
  chargeBeam(source,origin){const from={x:origin.x,y:origin.y,z:origin.z},to={x:this.player.x,y:this.player.y+.48,z:this.player.z+3};this.beams.push({id:this.id(),type:'beam',from,to,charge:source==='boss'?.95:.8,life:source==='boss'?.85:.62,r:source==='boss'?.5:.34,state:'charge',source,hit:false});this.events.push({type:'beamCharge',...from});}
  step(dt){
    if(this.paused||['ready','clear','over'].includes(this.phase))return;
    dt=clamp(dt,0,.05);this.time+=dt;this.total+=dt;
    if(this.phase==='warp'){if(this.time>=3.4)this.beginStage(1);return;}
    if(this.phase==='stageclear'){if(this.time>=2.2)this.enter('transit');return;}
    if(this.phase==='transit'){if(this.time>=1.6)this.beginStage(this.stage+1);return;}
    if(this.phase==='victory'){if(this.time>=2.6)this.enter('clear');return;}
    this.player.inv=Math.max(0,this.player.inv-dt);const phase=this.phase;
    if(phase==='swarm'){
      const cfg=STAGES[this.stage];this.spawn-=dt;if(this.spawn<=0){this.spawnEnemy();this.spawn=cfg.spawn;}
      for(const e of this.enemies){e.age+=dt;e.z+=e.speed*dt;e.x+=Math.sin(e.wobble+e.age*2)*dt*.35;if(e.type==='drone'&&!e.fired&&e.z>-25){e.fired=true;if(this.random()<cfg.beamChance)this.chargeBeam('drone',e);else{const v={x:this.player.x-e.x,y:this.player.y-e.y,z:this.player.z-e.z},l=Math.hypot(v.x,v.y,v.z);this.bullets.push({id:this.id(),x:e.x,y:e.y,z:e.z,vx:v.x/l*cfg.bulletSpeed,vy:v.y/l*cfg.bulletSpeed,vz:v.z/l*cfg.bulletSpeed,r:.2});}}}
    }
    if(this.boss){const b=this.boss,cfg=STAGES[this.stage];b.z+=(-27-b.z)*Math.min(1,dt*1.6);b.x=Math.sin(this.time*.65)*2.7;b.y=.3+Math.sin(this.time*.9)*1.4;b.cooldown-=dt;if(b.cooldown<0){this.volley();b.cooldown=cfg.volleyDelay;}b.beamCooldown-=dt;if(b.beamCooldown<0){this.chargeBeam('boss',{x:b.x,y:b.y,z:b.z+2});b.beamCooldown=cfg.beamDelay;}}
    for(const beam of this.beams){if(beam.state==='charge'){beam.charge-=dt;if(beam.charge<=0){beam.state='fire';this.events.push({type:'beamFire',x:beam.to.x,y:beam.to.y,z:beam.to.z});}}else{beam.life-=dt;if(!beam.hit&&segmentHit(beam.from,beam.to,{x:this.player.x,y:this.player.y+.48,z:this.player.z},beam.r+.88)){beam.hit=this.damage('beam');if(this.phase!==phase)return;}}}
    this.fire=Math.max(0,this.fire-dt);
    if(this.fire===0&&this.firing){
      this.fire=.14;
      for(const side of[-1,1]){let vx=0,vy=0;const targets=this.boss?[this.boss]:this.enemies.filter(e=>e.type==='drone'&&e.z<this.player.z);const target=targets.sort((a,b)=>Math.hypot(a.x-this.player.x,a.y-this.player.y)-Math.hypot(b.x-this.player.x,b.y-this.player.y))[0];if(target&&Math.hypot(target.x-this.player.x,target.y-this.player.y)<2.8){const t=Math.max(.06,(this.player.z-target.z)/100);vx=(target.x-this.player.x-side*.52)/t;vy=(target.y-this.player.y)/t;}this.shots.push({id:this.id(),x:this.player.x+side*.52,y:this.player.y,z:this.player.z-1,vx,vy,vz:-100,r:.12});this.shotsFired++;}
      this.events.push({type:'fire'});
    }
    for(const shot of this.shots){const prev={...shot};shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.z+=shot.vz*dt;for(const e of this.boss?[this.boss]:this.enemies){if(e.hp>0&&!shot.dead&&segmentHit(prev,shot,e,e.r+.12)){shot.dead=true;this.hit(e,1);if(this.phase!==phase)return;}}}
    const pilotCollider={x:this.player.x,y:this.player.y+.48,z:this.player.z};
    for(const b of this.bullets){const prev={...b};b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;if(segmentHit(prev,b,pilotCollider,b.r+.88)){b.dead=true;this.damage('bullet');if(this.phase!==phase)return;}}
    for(const e of this.enemies){if(e.hp>0&&Math.hypot(e.x-this.player.x,e.y-this.player.y,e.z-this.player.z)<e.r+.45){e.hp=0;this.damage(e.type==='rock'?'rock':'collision');if(this.phase!==phase)return;}}
    this.shots=this.shots.filter(s=>!s.dead&&s.z>-100);this.bullets=this.bullets.filter(b=>!b.dead&&b.z<20);this.beams=this.beams.filter(b=>b.state==='charge'||b.life>0);this.enemies=this.enemies.filter(e=>e.hp>0&&e.z<16);
  }
}
