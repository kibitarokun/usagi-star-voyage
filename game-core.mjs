export const STAGES = [
  null,
  {kind:'swarm',goal:6,spawn:.95,enemySpeed:15,bulletSpeed:12,enemyHp:1,rockChance:.10,beamChance:0},
  {kind:'swarm',goal:9,spawn:.74,enemySpeed:18,bulletSpeed:15,enemyHp:2,rockChance:.13,beamChance:.22},
  {kind:'miniboss',hp:55,volleyCount:4,volleySpeed:19,volleyDelay:1.85,beamDelay:5.6},
  {kind:'swarm',goal:12,spawn:.53,enemySpeed:23,bulletSpeed:19,enemyHp:3,rockChance:.16,beamChance:.34},
  {kind:'final',hp:125,volleyCount:7,volleySpeed:23,volleyDelay:1.15,beamDelay:4.1},
  {kind:'swarm',name:'紫電の星雲',theme:'nebula',goal:18,spawn:.46,enemySpeed:25,bulletSpeed:21,enemyHp:3,rockChance:.12,beamChance:.12,movements:['weaver','orbiter'],formation:2},
  {kind:'swarm',name:'灼熱の小惑星帯',theme:'ember',goal:24,spawn:.39,enemySpeed:27,bulletSpeed:23,enemyHp:4,rockChance:.22,beamChance:.16,movements:['diver','weaver','orbiter'],formation:3},
  {kind:'final',name:'超旗艦「エクリプス」',theme:'eclipse',hp:240,volleyCount:9,volleySpeed:25,volleyDelay:1.1,beamDelay:3.8,elite:true},
  {kind:'swarm',name:'惑星要塞「オブリビオン」',theme:'surface',base:true,goal:15,spawn:.38,enemySpeed:30,bulletSpeed:25,enemyHp:5,rockChance:0,beamChance:.12,movements:['launch'],formation:3,hp:340,volleyCount:11,volleySpeed:27,volleyDelay:1.05,beamDelay:4.8,elite:true}
];
export const STAGE_COUNT=STAGES.length-1;
export const PHASES = {ready:'出撃準備',warp:'ワープ航行',swarm:'敵編隊',miniboss:'中ボス',stageclear:'ステージクリア',transit:'次の戦域へ',final:'ラスボス',victory:'撃破',clear:'ゲームクリア',over:'ゲームオーバー'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const combat=p=>['swarm','miniboss','final'].includes(p);
export function segmentHit(a,b,p,r){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;const d=dx*dx+dy*dy+dz*dz;const t=d?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/d,0,1):0;return Math.hypot(a.x+dx*t-p.x,a.y+dy*t-p.y,a.z+dz*t-p.z)<=r;}
export class Game {
  bounds={minX:-5.8,maxX:5.8,minY:-3.5,maxY:3.7};
  constructor(random=Math.random){this.random=random;this.reset(false);}
  reset(start=true){this.checkpoint=null;this.phase=start?'warp':'ready';this.stage=0;this.stageKills=0;this.time=0;this.total=0;this.score=0;this.kills=0;this.shotsFired=0;this.lives=5;this.player={x:0,y:-1.8,z:6,inv:0};this.enemies=[];this.shots=[];this.bullets=[];this.beams=[];this.events=[];this.serial=0;this.spawn=0;this.fire=0;this.firing=false;this.boss=null;this.paused=false;}
  id(){return ++this.serial;}
  beginStage(stage){this.stage=stage;this.stageKills=0;this.checkpoint={stage,score:this.score,kills:this.kills,shotsFired:this.shotsFired,total:this.total};this.enter(STAGES[stage].kind);}
  launchStage(stage){
    const selected=Math.max(1,Math.min(STAGE_COUNT,Math.floor(stage)||1));
    this.reset(selected===1);
    if(selected>1)this.beginStage(selected);
    return selected;
  }
  retryStage(){
    if(this.phase!=='over'||!this.checkpoint)return false;
    const checkpoint={...this.checkpoint};this.reset();
    this.score=checkpoint.score;this.kills=checkpoint.kills;this.shotsFired=checkpoint.shotsFired;this.total=checkpoint.total;
    this.beginStage(checkpoint.stage);this.player.inv=1.4;return true;
  }
  enter(phase){
    if(phase==='swarm'&&!this.stage)this.stage=1;
    if(phase==='miniboss'&&!this.stage)this.stage=3;
    if(phase==='final'&&!this.stage)this.stage=5;
    this.phase=phase;this.time=0;this.spawn=.2;this.fire=0;this.firing=false;this.shots=[];this.bullets=[];this.beams=[];this.enemies=[];this.boss=null;
    this.events.push({type:'phase',phase,stage:this.stage});
    if(phase==='miniboss'||phase==='final'){
      const final=phase==='final',hp=STAGES[this.stage].hp;
      this.boss={id:this.id(),type:STAGES[this.stage].base?'base':phase,x:0,y:1,z:-55,hp,max:hp,r:STAGES[this.stage].base?4.8:final?3.7:2.6,cooldown:2.4,beamCooldown:final?3.2:4.2};
    }
    if(phase==='stageclear')this.score+=this.stage*250;
    if(phase==='transit')this.lives=Math.min(5,this.lives+1);
  }
  setFiring(value){this.firing=!!value;}
  takeEvents(){return this.events.splice(0);}
  setBounds(b){this.bounds={...this.bounds,...b};}
  move(x,y){if(this.paused||!combat(this.phase))return;const b=this.bounds;this.player.x=clamp(x,b.minX,b.maxX);this.player.y=clamp(y,b.minY,b.maxY);}
  damage(source='impact'){if(!combat(this.phase)||this.paused||this.player.inv>0)return false;this.lives--;this.player.inv=1.4;this.events.push({type:'damage',source,...this.player});if(this.lives===0)this.enter('over');return true;}
  hit(target,power){
    if(!combat(this.phase)||this.paused||target.hp<=0)return false;
    target.hp=Math.max(0,target.hp-power);this.events.push({type:'hit',boss:target===this.boss,lethal:target.hp===0,x:target.x,y:target.y,z:target.z});
    if(target.hp>0)return true;
    this.events.push({type:'explode',boss:target===this.boss,targetType:target.type,x:target.x,y:target.y,z:target.z,big:target.type!=='drone'&&target.type!=='rock'});
    if(target===this.boss){this.score+=this.phase==='final'?5000:1500;this.enter(this.stage===STAGE_COUNT?'victory':'stageclear');}
    else{this.score+=target.type==='rock'?50:150;if(target.type==='drone'){this.kills++;this.stageKills++;if(this.stageKills>=STAGES[this.stage].goal)this.enter(STAGES[this.stage].base?'final':'stageclear');}}
    return true;
  }
  spawnEnemy(){
    const cfg=STAGES[this.stage],rock=this.random()<cfg.rockChance,count=rock?1:cfg.formation||1;
    const movement=cfg.movements?.[Math.floor(this.random()*cfg.movements.length)]||'drone';
    const center=(this.random()-.5)*7,y=(this.random()-.5)*5.4;
    for(let i=0;i<count;i++){const x=cfg.base?(i-1)*3.4:center+(i-(count-1)/2)*2;this.enemies.push({id:this.id(),type:rock?'rock':'drone',movement:rock?'rock':movement,baseX:x,baseY:y,x,y:cfg.base?-2.8:y,z:cfg.base?-72:-62-i*3,hp:rock?2:cfg.enemyHp,r:rock?.85:.8,speed:rock?cfg.enemySpeed+5:cfg.enemySpeed,wobble:this.random()*6,age:0,fired:false});}
  }
  moveEnemy(e,dt){
    e.age+=dt;e.z+=e.speed*dt;
    if(e.movement==='launch'){const t=Math.min(1,e.age/1.2);e.x=e.baseX+Math.sin(e.age*2.6)*t*2;e.y=-2.8+(e.baseY+2.8)*t;}
    else if(e.movement==='weaver'){e.x=e.baseX+Math.sin(e.age*3+e.wobble)*2.2;e.y=e.baseY+Math.sin(e.age*1.7)*.6;}
    else if(e.movement==='orbiter'){e.x=e.baseX+Math.cos(e.age*3+e.wobble)*1.8;e.y=e.baseY+Math.sin(e.age*3+e.wobble)*1.5;}
    else if(e.movement==='diver'){
      if(e.z>-36&&!e.dive){e.dive={x:this.player.x,y:this.player.y};}
      if(e.dive){e.x+=(e.dive.x-e.x)*Math.min(1,dt*2);e.y+=(e.dive.y-e.y)*Math.min(1,dt*2);e.z+=e.speed*.45*dt;}
    }else e.x+=Math.sin(e.wobble+e.age*2)*dt*.35;
  }
  volley(){const b=this.boss;if(!b)return;const cfg=STAGES[this.stage],enraged=cfg.elite&&b.hp<=b.max*.5,count=cfg.volleyCount+(enraged?4:0);b.volleyIndex=(b.volleyIndex||0)+1;const vx=this.player.x-b.x,vy=this.player.y-b.y,vz=this.player.z-b.z,len=Math.hypot(vx,vy,vz);for(let i=0;i<count;i++){const spread=(i-(count-1)/2)*.095;this.bullets.push({id:this.id(),x:b.x,y:b.y,z:b.z+1,vx:(vx/len+spread)*cfg.volleySpeed,vy:(vy/len+(cfg.elite?Math.sin(i*1.7+b.volleyIndex)*.18:this.phase==='final'?Math.sin(i*2)*.035:0))*cfg.volleySpeed,vz:vz/len*cfg.volleySpeed,r:.24});}this.events.push({type:'volley'});}
  baseVolley(){
    const b=this.boss,enraged=b.hp<=b.max*.5,index=b.volleyIndex=(b.volleyIndex||0)+1;
    const ring=index%4===0,count=ring?(enraged?28:22):(enraged?9:7);
    for(const side of[-1,1]){
      const origin={x:side*6,y:1,z:-38};
      for(let i=0;i<count;i++){
        const angle=i/count*Math.PI*2+index*.22;
        const x=this.player.x+(ring?Math.cos(angle)*8:(i-(count-1)/2)*1.7);
        const y=this.player.y+.48+(ring?Math.sin(angle)*5:Math.sin(index*.8)*1.1);
        const dx=x-origin.x,dy=y-origin.y,dz=this.player.z-origin.z,len=Math.hypot(dx,dy,dz),speed=ring?21:30;
        this.bullets.push({id:this.id(),...origin,vx:dx/len*speed,vy:dy/len*speed,vz:dz/len*speed,r:ring?.22:.25,style:ring?'plasma':'cannon'});
      }
      this.events.push({type:'cannon',...origin});
    }
    this.events.push({type:'volley'});
  }
  baseBeams(){
    const enraged=this.boss.hp<=this.boss.max*.5,count=enraged?5:3;
    for(let i=0;i<count;i++){
      this.chargeBeam('boss',{x:(i-(count-1)/2)*3,y:1,z:-38});
      const beam=this.beams.at(-1);beam.to.x=this.player.x+(i-(count-1)/2)*4;beam.charge=1.35;beam.life=.7;beam.fortress=true;
    }
    this.events.push({type:'baseBeamWarning'});
  }
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
      for(const e of this.enemies){this.moveEnemy(e,dt);if(e.type==='drone'&&!e.fired&&e.z>-25){e.fired=true;if(this.random()<cfg.beamChance)this.chargeBeam('drone',e);else{const v={x:this.player.x-e.x,y:this.player.y-e.y,z:this.player.z-e.z},l=Math.hypot(v.x,v.y,v.z);this.bullets.push({id:this.id(),x:e.x,y:e.y,z:e.z,vx:v.x/l*cfg.bulletSpeed,vy:v.y/l*cfg.bulletSpeed,vz:v.z/l*cfg.bulletSpeed,r:.2});}}}
    }
    if(this.boss){const b=this.boss,cfg=STAGES[this.stage];b.z+=(-27-b.z)*Math.min(1,dt*1.6);const enraged=cfg.elite&&b.hp<=b.max*.5;if(enraged&&!b.enraged){b.enraged=true;this.events.push({type:'enrage'});}b.x=Math.sin(this.time*(cfg.elite?1:.65))*(cfg.elite?4.2:2.7);b.y=.3+Math.sin(this.time*(cfg.elite?1.4:.9))*1.4;if(cfg.base){b.x=0;b.y=-1;b.z=-45;}b.cooldown-=dt;if(b.cooldown<0){if(cfg.base){this.baseVolley();b.burst=(b.burst||0)+1;b.cooldown=b.burst%3===0?(enraged?1.35:1.9):.24;}else{this.volley();b.cooldown=cfg.volleyDelay*(enraged?.7:1);}}b.beamCooldown-=dt;if(b.beamCooldown<0){if(cfg.base)this.baseBeams();else{this.chargeBeam('boss',{x:b.x,y:b.y,z:b.z+2});if(cfg.elite){for(const side of[-1,1]){this.chargeBeam('boss',{x:b.x+side*4,y:b.y,z:b.z+2});this.beams.at(-1).to.x+=side*3.8;}}}b.beamCooldown=cfg.beamDelay*(enraged?.8:1);}}
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
