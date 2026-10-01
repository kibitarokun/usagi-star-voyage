import * as T from './vendor/three.module.js';
import {Game,STAGES,STAGE_COUNT} from './game-core.mjs?v=enemy-down-1';
import {AudioDirector,combatSound} from './audio.mjs?v=enemy-down-1';
const $=id=>document.getElementById(id),canvas=$('game'),game=new Game();
const stageTotal=String(STAGE_COUNT).padStart(2,'0');
document.querySelector('.stage-progress').innerHTML='<i></i>'.repeat(STAGE_COUNT);
let selectedStage=1;
function selectStage(stage){
  selectedStage=Math.max(1,Math.min(STAGE_COUNT,stage));
  const selected=document.querySelector(`#journey [data-stage="${selectedStage}"]`),name=selected.querySelector('span').textContent;
  document.querySelectorAll('#journey button').forEach(button=>{const active=Number(button.dataset.stage)===selectedStage;button.setAttribute('aria-pressed',String(active));button.classList.toggle('selected',active);});
  $('stageSelectName').textContent=`STAGE ${String(selectedStage).padStart(2,'0')} · ${name}`;
  $('start').textContent=selectedStage===1?'出撃する':`STAGE ${String(selectedStage).padStart(2,'0')}から出撃`;
}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});}catch(e){$('error').classList.remove('hidden');$('error').textContent='3D表示を開始できませんでした。WebGLが有効なブラウザで開き直してください。';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(57,1,.1,650);scene.fog=new T.FogExp2(0x102741,.0025);
scene.add(new T.HemisphereLight(0xb5e9ff,0x352e67,2.7));const sun=new T.DirectionalLight(0xd4f4ff,4.5);sun.position.set(-8,14,10);scene.add(sun);const fill=new T.DirectionalLight(0xff8755,2);fill.position.set(12,-3,-15);scene.add(fill);
const metal=new T.MeshStandardMaterial({color:0x9bb6cb,metalness:.48,roughness:.32});const armor=new T.MeshStandardMaterial({color:0x233d55,metalness:.55,roughness:.32});const gold=new T.MeshStandardMaterial({color:0xc18b55,metalness:.6,roughness:.36});
const cyan=new T.MeshBasicMaterial({color:0x6fffff}),pink=new T.MeshBasicMaterial({color:0xff426e}),orange=new T.MeshBasicMaterial({color:0xffaa54});
function mesh(geo,mat,parent,pos=[0,0,0],scale=[1,1,1]){const m=new T.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);parent.add(m);return m;}
const sphere=new T.SphereGeometry(1,18,12),box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,16);
// A lit, faceted hull with inset panels, cannon barrels and separate engine exhausts.
function craft(kind='player'){
  if(kind==='base')return fortress();
  const root=new T.Group(),isPlayer=kind==='player',final=kind==='final'||kind==='elite',boss=final||kind==='miniboss';
  const hullMat=isPlayer?metal:new T.MeshStandardMaterial({color:kind==='elite'?0x59259c:kind==='weaver'?0x187b91:kind==='orbiter'?0x7452b2:kind==='diver'?0xbe5725:final?0x4c254b:0x824845,metalness:.5,roughness:.3});
  const hull=mesh(new T.ConeGeometry(.65,2.7,6),hullMat,root,[0,0,0],[1,.95,.6]);hull.rotation.x=-Math.PI/2;
  mesh(box,armor,root,[0,-.12,.5],[.9,.38,1.15]);
  for(const s of[-1,1]){
    const wing=mesh(box,isPlayer?metal:gold,root,[s*.98,-.1,.32],[1.5,.12,.85]);wing.rotation.y=s*-.32;wing.rotation.z=s*.13;
    mesh(box,armor,root,[s*1.22,-.015,.32],[.45,.065,.61]);
    const gun=mesh(cylinder,armor,root,[s*1.6,0,-.6],[.06,1.35,.06]);gun.rotation.x=Math.PI/2;
    mesh(sphere,isPlayer?cyan:pink,root,[s*1.6,0,-1.26],[.08,.08,.13]);
    const engine=mesh(cylinder,armor,root,[s*.61,-.06,.9],[.23,.8,.23]);engine.rotation.x=Math.PI/2;
    mesh(sphere,isPlayer?cyan:orange,root,[s*.61,-.06,1.34],[.18,.18,.12]);
    const plume=mesh(new T.ConeGeometry(.19,1.7,14),new T.MeshBasicMaterial({color:isPlayer?0x48dfff:0xff6633,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false}),root,[s*.61,-.06,2.02]);plume.rotation.x=Math.PI/2;plume.name='plume';
    for(let i=0;i<3;i++)mesh(box,armor,root,[s*.35,.21,.35+i*.2],[.2,.045,.06]);
  }
  if(isPlayer){
    mesh(sphere,armor,root,[0,.35,.05],[.4,.22,.52]);
    mesh(sphere,new T.MeshPhysicalMaterial({color:0x75deff,metalness:.05,roughness:.08,transparent:true,opacity:.17,depthWrite:false}),root,[0,.49,.06],[.48,.42,.61]);
  }else{
    mesh(sphere,pink,root,[0,.35,.3],[.25,.13,.35]);
    if(boss){for(const s of[-1,1]){mesh(box,hullMat,root,[s*1.3,.3,0],[.45,.9,1.6]);const fin=mesh(new T.ConeGeometry(.7,1.6,4),armor,root,[s*1.4,.65,.8]);fin.rotation.x=Math.PI/2;}root.scale.setScalar(final?2.5:1.8);}
    if(final){const ring=mesh(new T.TorusGeometry(1.6,.09,8,40),orange,root,[0,.4,.3]);ring.rotation.x=.2;mesh(sphere,pink,root,[0,.3,1.15],[.6,.5,.3]);}
  }
  if(kind==='weaver'){root.scale.set(1.1,.65,1.2);for(const side of[-1,1])mesh(box,cyan,root,[side*1.4,.1,0],[.1,.12,1.7]);}
  if(kind==='orbiter'){const halo=mesh(new T.TorusGeometry(1.5,.075,8,32),cyan,root);halo.rotation.x=.5;}
  if(kind==='diver'){root.scale.set(.75,.9,1.5);mesh(box,orange,root,[0,.4,0],[.13,.1,1.8]);}
  if(kind==='elite'){root.scale.setScalar(2.8);for(const side of[-1,1]){mesh(box,armor,root,[side*2,.2,.3],[.6,.65,2.2]);mesh(sphere,cyan,root,[side*2,.2,-.9],[.24,.24,.2]);}const halo=mesh(new T.TorusGeometry(2.5,.045,8,64),cyan,root,[0,.2,.5]);halo.rotation.x=.25;}
  return root;
}
const ship=craft();scene.add(ship);ship.position.set(0,-1.8,6);
// Procedural deep-space color field behind the actual 3D scene.
const sky=new T.Mesh(new T.SphereGeometry(420,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{surface:{value:0},time:{value:0},tint:{value:new T.Color(1,1,1)}},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 v;uniform float time;uniform vec3 tint;uniform float surface;void main(){vec3 d=normalize(v);float n=sin(d.x*8.+sin(d.y*11.))*sin(d.y*13.+d.z*9.);float band=exp(-pow((d.y+.12+d.x*.28)*3.2,2.));vec3 c=mix(vec3(.014,.035,.075),vec3(.025,.16,.24),band*.7);c+=vec3(.15,.045,.17)*band*pow(.5+.5*n,3.);if(surface>.5)c=mix(vec3(.42,.26,.18),vec3(.08,.19,.27),smoothstep(-.1,.8,d.y));gl_FragColor=vec4(surface>.5?c:c*tint,1.);}` }));scene.add(sky);
const planet=mesh(new T.SphereGeometry(13,48,32),new T.MeshStandardMaterial({color:0x477691,roughness:.82,metalness:.15}),scene,[29,14,-100]);
const atmosphere=mesh(new T.SphereGeometry(13.3,40,24),new T.ShaderMaterial({transparent:true,blending:T.AdditiveBlending,depthWrite:false,vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;void main(){float a=pow(1.-max(0.,dot(n,v)),3.);gl_FragColor=vec4(.12,.65,1.,a*.75);}' }),scene,[29,14,-100]);
const ring=mesh(new T.RingGeometry(17,23,100),new T.MeshBasicMaterial({color:0x9fc9eb,side:T.DoubleSide,transparent:true,opacity:.21}),scene,[29,14,-100]);ring.rotation.set(.75,.2,-.3);
const starCount=850,starData=Array.from({length:starCount},()=>({x:(Math.random()-.5)*160,y:(Math.random()-.5)*110,z:-Math.random()*240}));
const lines=new Float32Array(starCount*6),starGeometry=new T.BufferGeometry();starGeometry.setAttribute('position',new T.BufferAttribute(lines,3));const starfield=new T.LineSegments(starGeometry,new T.LineBasicMaterial({color:0x87d8ff,transparent:true,opacity:.7,blending:T.AdditiveBlending}));scene.add(starfield);
const warpRings=[];for(let i=0;i<14;i++){const r=mesh(new T.TorusGeometry(11,.024,5,64),new T.MeshBasicMaterial({color:0x367cff,transparent:true,opacity:.45,blending:T.AdditiveBlending}),scene,[0,0,-i*16]);warpRings.push(r);}
const rocks=[];const rockMat=new T.MeshStandardMaterial({color:0x7a849a,roughness:.94,metalness:.08,flatShading:true});
function rockGeometry(){const g=new T.IcosahedronGeometry(1,1),a=g.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),s=1+.14*Math.sin(x*13+y*17+z*7);a.setXYZ(i,x*s,y*s,z*s);}g.computeVertexNormals();return g;}
const rockGeo=rockGeometry();for(let i=0;i<28;i++){let r=mesh(rockGeo,rockMat,scene,[(i%2?1:-1)*(11+Math.random()*23),(Math.random()-.5)*27,-Math.random()*190],Array(3).fill(.4+Math.random()*2.1));rocks.push(r);}
// Low-altitude planetary assault: a continuous ground plane and a fortified runway.
function fortress(){
 const root=new T.Group(),wall=new T.MeshStandardMaterial({color:0x48565e,metalness:.65,roughness:.5});
 mesh(box,wall,root,[0,-4,0],[24,4,14]);
 mesh(box,armor,root,[0,-1,-3],[9,7,7]);
 mesh(new T.OctahedronGeometry(2.3),orange,root,[0,1,1]);
 for(const side of[-1,1]){
  mesh(box,wall,root,[side*9,0,-1],[4,12,6]);
  mesh(box,armor,root,[side*9,6,-1],[5,.8,7]);
  for(let j=0;j<3;j++)mesh(box,orange,root,[side*9,j*2-2,2.05],[2.8,.18,.12]);
  const gun=mesh(cylinder,armor,root,[side*6,2,4],[.5,6,.5]);gun.rotation.x=Math.PI/2;
  mesh(sphere,pink,root,[side*6,2,7],[.6,.6,.3]);
 }
 for(const x of[-3.4,0,3.4]){mesh(box,armor,root,[x,-1.8,7.05],[2.8,2.6,.1]);mesh(box,cyan,root,[x,-.45,7.12],[2.8,.12,.12]);}
 return root;
}
const surfaceWorld=new T.Group();scene.add(surfaceWorld);surfaceWorld.visible=false;
const groundGeo=new T.PlaneGeometry(320,460,64,92);groundGeo.rotateX(-Math.PI/2);
const gp=groundGeo.attributes.position;
for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getZ(i);gp.setY(i,-7+Math.max(0,Math.abs(x)-14)*.16*(1.4+Math.sin(z*.07+x*.1)));}groundGeo.computeVertexNormals();
mesh(groundGeo,new T.MeshStandardMaterial({color:0x9b6849,roughness:1,flatShading:true}),surfaceWorld,[0,0,-170]);
mesh(box,new T.MeshStandardMaterial({color:0x303c43,roughness:.9}),surfaceWorld,[0,-6.9,-90],[17,.15,250]);
const runwayLights=[];
for(let i=0;i<36;i++)for(const side of[-1,1])runwayLights.push(mesh(box,cyan,surfaceWorld,[side*8,-6.7,-i*6],[.18,.06,1.8]));
const baseScenery=fortress();baseScenery.position.set(0,-1,-72);surfaceWorld.add(baseScenery);
const surfaceSun=mesh(sphere,new T.MeshBasicMaterial({color:0xffc58a}),surfaceWorld,[-70,40,-260],[17,17,17]);
// Shared meshes/materials keep long runs from accumulating GPU allocations.
const shotGeo=new T.CylinderGeometry(.055,.055,1.8,6);shotGeo.rotateX(Math.PI/2);const bulletGeo=new T.SphereGeometry(.25,10,8);
const entities=new Map(),effects=[];const particleGeo=new T.IcosahedronGeometry(.1,0);
let environmentStage=-1;
function updateEnvironment(){
 const stage=game.stage||1;if(stage===environmentStage)return;environmentStage=stage;
 const theme=STAGES[stage].theme;
 surfaceWorld.visible=theme==='surface';sky.material.uniforms.surface.value=theme==='surface'?1:0;planet.visible=atmosphere.visible=ring.visible=theme!=='surface';starfield.visible=theme!=='surface';scene.fog.density=theme==='surface'?.006:.0025;
 const palette=theme==='surface'?[0x926b58,0xffcf9c,0xa86e45,[3.5,1.7,.9],[29,14,-100]]:theme==='nebula'?[0x39165f,0xcb79ff,0x7d49a7,[2.5,.65,1.6],[-26,15,-100]]:theme==='ember'?[0x351c19,0xffad62,0xb45e31,[3.5,.8,.4],[30,-8,-95]]:theme==='eclipse'?[0x170e36,0xbda1ff,0x17112d,[1.8,.5,1.4],[0,20,-120]]:[0x102741,0x87d8ff,0x477691,[1,1,1],[29,14,-100]];
 scene.fog.color.setHex(palette[0]);starfield.material.color.setHex(palette[1]);planet.material.color.setHex(palette[2]);sky.material.uniforms.tint.value.setRGB(...palette[3]);
 planet.position.set(...palette[4]);atmosphere.position.copy(planet.position);ring.position.copy(planet.position);ring.material.color.setHex(palette[1]);ring.material.opacity=theme==='eclipse'?.6:.21;planet.scale.setScalar(theme==='eclipse'?1.8:1);atmosphere.scale.copy(planet.scale);ring.scale.copy(planet.scale);rockMat.color.setHex(theme==='ember'?0xa56849:0x7a849a);
}
let flash=0,shake=0,visualTime=0,noticeEnd=0,last=performance.now(),pointer=null,aim=null;const keys=new Set();
const audio=new AudioDirector();let soundPreference=null,soundRequest=0,lastShotSound=0;
function updateSoundButton(){const on=audio.enabled;$('sound').textContent=on?'音 ON':'音 OFF';$('sound').setAttribute('aria-pressed',String(on));}
async function setSound(on){const request=++soundRequest;soundPreference=on;if(!on){audio.disable();updateSoundButton();return;}try{const supported=await audio.enable();if(request!==soundRequest||!soundPreference){audio.disable();return;}if(!supported){soundPreference=false;audio.disable();}updateSoundButton();}catch(error){console.warn('音声を開始できませんでした',error);audio.disable();soundPreference=false;updateSoundButton();}}
function tone(f,d=.08,type='sine',gain=.03){audio.note(f,d,type,gain,undefined,Math.max(30,f*.35));}
function announce(title,sub,d=2.3){$('noticeTitle').textContent=title;$('noticeSub').textContent=sub;$('notice').classList.add('show');noticeEnd=visualTime+d;}
function explosion(p,big=false,sound=true){const n=big?90:22;for(let i=0;i<n;i++){const m=mesh(particleGeo,i%3?orange:cyan,scene,[p.x,p.y,p.z]);const speed=big?14:5;effects.push({mesh:m,v:new T.Vector3((Math.random()-.5)*speed,(Math.random()-.5)*speed,(Math.random()-.5)*speed),life:.5+Math.random()*(big?2: .6),max:big?2:1});}const m=mesh(new T.TorusGeometry(1,.035,5,60),new T.MeshBasicMaterial({color:0xffd08a,transparent:true,opacity:1,blending:T.AdditiveBlending,depthWrite:false}),scene,[p.x,p.y,p.z]);effects.push({mesh:m,ring:true,life:big?2: .7,max:big?2: .7});shake=big?.27:.06;flash=big?.3:.07;if(sound)audio.effect(big?'bossBlast':'blast');}
const pilotLines={ready:'準備はできた！ 星の海へ出撃だ！',warp:'ワープ中！ 敵編隊に備えよう！',swarm:'敵機をロックオン！ 進路を開くよ！',miniboss:'迎撃艦が来た！ 攻撃を避けて撃ち続けよう！',transit:'次の戦域へワープ！ シールドも回復したよ！',final:'大型旗艦だ！ ビームを避けて反撃しよう！',victory:'やった！ 旗艦を撃破したよ！',clear:'勝った！ 星の海に平和が戻ったよ！',over:'うぅ……シールドがゼロ。もう一度、挑戦しよう！'};
let dialogueMood='normal',dialogueTimer=0,speechTimer=0,lastHitDialogue=-Infinity;
function setTalking(value){$('portraitArt').dataset.talking=String(value);$('titlePilot').dataset.talking=String(value);}
function setPortrait(mood){dialogueMood=mood;$('portraitArt').dataset.mood=mood;$('titlePilot').dataset.mood=mood;}
function baseMood(phase){return ['stageclear','transit','victory','clear'].includes(phase)?'boss':phase==='over'?'damage':'normal';}
function hideDialogue(){dialogueTimer=0;speechTimer=0;setTalking(false);$('dialogue').classList.add('hidden');}
function showDialogue(mood,line,duration=2){setPortrait(mood);dialogueTimer=duration;speechTimer=Math.min(duration,Math.max(.9,line.length*.075));$('dialogueText').textContent=line;$('dialogue').classList.remove('hidden');setTalking(true);}
function phaseDialogue(phase){setPortrait(baseMood(phase));if(['ready','stageclear','clear','over'].includes(phase)){hideDialogue();return;}showDialogue(baseMood(phase),pilotLines[phase]||pilotLines.ready,2.2);}
function tickDialogue(dt){if(dialogueTimer>0){dialogueTimer=Math.max(0,dialogueTimer-dt);if(dialogueTimer===0){hideDialogue();setPortrait(baseMood(game.phase));}}if(speechTimer>0){speechTimer=Math.max(0,speechTimer-dt);if(speechTimer===0)setTalking(false);}}
function cannonFlash(p){
 for(let i=0;i<10;i++){const m=mesh(particleGeo,i%2?orange:cyan,scene,[p.x,p.y,p.z]);effects.push({mesh:m,v:new T.Vector3((Math.random()-.5)*5,(Math.random()-.5)*5,6+Math.random()*9),life:.3,max:.3});}
 const m=mesh(new T.TorusGeometry(.7,.09,6,32),new T.MeshBasicMaterial({color:0xffc66e,transparent:true,blending:T.AdditiveBlending,depthWrite:false}),scene,[p.x,p.y,p.z]);effects.push({mesh:m,ring:true,life:.28,max:.28});shake=Math.max(shake,.045);
}
function handleEvents(){for(const e of game.takeEvents()){const effect=combatSound(e);if(effect)audio.effect(effect);if(e.type==='cannon')cannonFlash(e);if(e.type==='baseBeamWarning'){showDialogue('normal','要塞の主砲が来る！ 光の線から離れて！',1.5);}if(e.type==='enrage'){announce('OVERDRIVE',STAGES[game.stage]?.base?'要塞の全砲門が開放！':'超旗艦、攻撃形態が変化！',2);showDialogue('damage','敵の出力が上がった！ ビームの予告線から離れて！',2.5);audio.effect('charge');}if(e.type==='explode')explosion(e,e.big,false);if(e.type==='hit'&&visualTime-lastHitDialogue>=3.2&&!(dialogueMood==='damage'&&dialogueTimer>0)){lastHitDialogue=visualTime;showDialogue('hit','命中！ その調子で押し切るよ！',1.15);if(!e.boss&&!e.lethal)audio.effect('hit');}if(e.type==='damage'){showDialogue('damage','うわっ、衝撃！ シールドを確認して！',1.6);explosion(e,false);flash=.3;shake=.25;audio.effect('damage');}if(e.type==='fire'&&visualTime-lastShotSound>.12){audio.effect('shot');lastShotSound=visualTime;}if(e.type==='volley')audio.effect('volley');if(e.type==='beamCharge')audio.effect('charge');if(e.type==='beamFire'){flash=Math.max(flash,.14);shake=Math.max(shake,.12);audio.effect('beam');}if(e.type==='phase'){
 $('stageClear').classList.toggle('hidden',e.phase!=='stageclear');
 const stageLabel=`STAGE ${String(e.stage).padStart(2,'0')} / ${stageTotal}`;
 const titles={swarm:[stageLabel,`${STAGES[e.stage]?.name||'敵編隊'} · 敵機${STAGES[e.stage]?.goal}機を撃破`],miniboss:[stageLabel,'迎撃艦を撃破'],transit:['次の戦域へ','シールド回復 / ワープ開始'],final:[stageLabel,STAGES[e.stage]?.name||'旗艦、接近'],victory:['本基地、陥落','惑星の制圧に成功！']};
 if(e.phase==='stageclear'){$('stageClearLabel').textContent=`STAGE ${String(e.stage).padStart(2,'0')} / ${stageTotal}`;$('stageClearNext').textContent=`+ ${e.stage*250} BONUS  ·  NEXT STAGE ${String(e.stage+1).padStart(2,'0')}`;flash=.75;shake=.45;audio.fanfare(true,false);$('notice').classList.remove('show');}
 if(titles[e.phase])announce(...titles[e.phase]);phaseDialogue(e.phase);if(STAGES[e.stage]?.base&&['swarm','final','victory'].includes(e.phase))showDialogue(e.phase==='victory'?'boss':'normal',e.phase==='swarm'?'惑星に突入！ 基地から出撃する敵機を迎え撃とう！':e.phase==='final'?'防衛隊を突破！ 基地の中央コアを狙って！':'本基地を攻め落としたよ！ 作戦成功！',2.8);if(['swarm','final'].includes(e.phase))flash=.35;if(['clear','over'].includes(e.phase))endPanel(e.phase);}}
}
function beamVisual(){const root=new T.Group(),outer=mesh(new T.CylinderGeometry(1,1,1,12),new T.MeshBasicMaterial({color:0xff5cb5,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false}),root),core=mesh(new T.CylinderGeometry(1,1,1,12),new T.MeshBasicMaterial({color:0xe7ffff,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false}),root),ring=mesh(new T.TorusGeometry(1,.07,8,48),new T.MeshBasicMaterial({color:0xffb962,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false}),root);ring.rotation.x=Math.PI/2;root.userData={outer,core,ring};return root;}
function placeBeam(m,b){const from=new T.Vector3(b.from.x,b.from.y,b.from.z),to=new T.Vector3(b.to.x,b.to.y,b.to.z),direction=to.clone().sub(from),length=direction.length(),active=b.state==='fire',boss=b.source==='boss';m.position.copy(from).add(to).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());const{outer,core,ring}=m.userData;outer.scale.set(active?(boss ? .72 : .48):.11,length,active?(boss ? .72 : .48):.11);core.scale.set(active?(boss ? .2 : .15):.045,length,active?(boss ? .2 : .15):.045);outer.material.opacity=active?.53:.38;core.material.opacity=active?.95:.7;outer.material.color.setHex(active?0xff48b7:0xffb05a);core.material.color.setHex(active?0xeaffff:0xfff4ca);ring.position.y=length/2;ring.scale.setScalar(active?(boss?1.6:1.15):.7+Math.sin(visualTime*23)*.09);ring.material.color.setHex(active?0x9affff:0xffb659);}
function syncEntities(){const all=[...game.enemies,...(game.boss?[game.boss]:[]),...game.shots.map(s=>({...s,type:'shot'})),...game.bullets.map(s=>({...s,type:'bullet'})),...game.beams],present=new Set();for(const e of all){present.add(e.id);let m=entities.get(e.id);if(!m){m=e.type==='beam'?beamVisual():e.type==='shot'?new T.Mesh(shotGeo,cyan):e.type==='bullet'?new T.Mesh(bulletGeo,e.style==='plasma'?cyan:e.style==='cannon'?orange:pink):e.type==='rock'?new T.Mesh(rockGeo,rockMat):craft(e.type==='drone'?(e.movement||'enemy'):e.type==='base'?'base':e===game.boss&&STAGES[game.stage].elite?'elite':e.type);entities.set(e.id,m);scene.add(m);}if(e.type==='beam'){placeBeam(m,e);continue;}m.position.set(e.x,e.y,e.z);if(e.type==='bullet'&&e.style){m.scale.set(1,1,e.style==='cannon'?3.5:1.6);m.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(e.vx,e.vy,e.vz).normalize());}if(e.type==='rock'){m.rotation.x=visualTime*.6;m.rotation.y=visualTime*.25;}if(e.type==='drone')m.rotation.z=Math.sin(e.age*2+e.wobble)*.3;if(['miniboss','final'].includes(e.type)){m.rotation.z=Math.sin(game.time*.65)*.1;m.rotation.y=Math.sin(game.time*.3)*.12;} }
for(const[id,m]of entities)if(!present.has(id)){scene.remove(m);if(m.isGroup)m.traverse(c=>{if(c.isMesh){if(![box,sphere,cylinder].includes(c.geometry))c.geometry.dispose();if(![metal,armor,gold,cyan,pink,orange].includes(c.material))c.material.dispose();}});entities.delete(id);}}
function updateHud(){ $('score').textContent=String(game.score).padStart(6,'0');$('life').textContent='◆'.repeat(game.lives)+'◇'.repeat(5-game.lives);$('sector').textContent=`STAGE ${String(Math.max(1,game.stage)).padStart(2,'0')} / ${stageTotal}`;$('objective').textContent=game.phase==='swarm'?`${STAGES[game.stage].base?'基地防衛隊':'敵機'} ${game.stageKills} / ${STAGES[game.stage].goal} 撃破`:game.phase==='miniboss'?'迎撃艦「ヴァイパー」を撃破':game.phase==='final'?`${STAGES[game.stage].name||'旗艦「ネメシス」'}を撃破`:game.phase==='stageclear'?`ステージ${game.stage} 突破！`:game.phase==='warp'||game.phase==='transit'?'ワープ航行中':game.phase==='ready'?`${STAGE_COUNT}つの戦域を突破せよ`:game.phase==='over'?'機体損傷 / 再出撃できます':`全${STAGE_COUNT}ステージ突破！`;$('bossHud').classList.toggle('hidden',!game.boss);if(game.boss){$('bossName').textContent=game.phase==='final'?(STAGES[game.stage].name||'旗艦「ネメシス」'):'迎撃艦「ヴァイパー」';$('bossValue').textContent=`${game.boss.hp} / ${game.boss.max}`;$('bossFill').style.width=100*game.boss.hp/game.boss.max+'%';}document.querySelectorAll('.stage-progress i').forEach((el,i)=>{el.classList.toggle('active',i<game.stage);el.classList.toggle('current',i===game.stage-1&&game.phase!=='clear');});canvas.dataset.phase=game.phase;canvas.dataset.stage=String(game.stage);canvas.dataset.shotsFired=String(game.shotsFired);canvas.dataset.pointer=String(pointer);canvas.dataset.space=String(keys.has('space'));canvas.dataset.firing=String(game.firing);canvas.dataset.playerX=game.player.x.toFixed(2);canvas.dataset.playerY=game.player.y.toFixed(2);}
function resetVisuals(){for(const m of entities.values()){scene.remove(m);if(m.isGroup){const geometries=new Set(),materials=new Set();m.traverse(c=>{if(c.isMesh){if(![box,sphere,cylinder].includes(c.geometry))geometries.add(c.geometry);if(![metal,armor,gold,cyan,pink,orange].includes(c.material))materials.add(c.material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}}entities.clear();for(const e of effects){scene.remove(e.mesh);if(e.ring){e.mesh.geometry.dispose();e.mesh.material.dispose();}}effects.length=0;flash=0;shake=0;lastHitDialogue=-Infinity;hideDialogue();keys.clear();pointer=null;aim=null;game.setFiring(false);$('stageClear').classList.add('hidden');ship.visible=true;}
function retry(){if(game.phase!=='over')return;resetVisuals();if(!game.retryStage())return;$('panel').classList.add('hidden');$('restart').classList.add('hidden');audio.effect('warp');canvas.focus();}
function start(stage=selectedStage){$('restart').classList.add('hidden');if(soundPreference===null)setSound(true).then(()=>audio.effect('warp'));else audio.effect('warp');resetVisuals();const launched=game.launchStage(stage);selectedStage=launched;$('panel').dataset.result='';$('panel').classList.add('hidden');$('resume').classList.add('hidden');if(launched===1){phaseDialogue('warp');announce('ワープ、開始',`${STAGE_COUNT}つの戦域へ`,2.5);}else announce(`STAGE ${String(launched).padStart(2,'0')}`,STAGES[launched].name||'戦域へ出撃',2.5);canvas.focus();}
function endPanel(phase){game.setFiring(false);$('panel').dataset.result=phase;$('panel').classList.remove('hidden');$('kicker').textContent=phase==='clear'?'MISSION COMPLETE':'MISSION FAILED';$('title').textContent=phase==='clear'?'GAME CLEAR!':'GAME OVER';$('description').innerHTML=(phase==='clear'?'敵本基地を撃破。惑星の制圧に成功した！':`ステージ${Math.max(1,game.stage)}でシールド消失。同じステージに再挑戦できます。`)+`<br>スコア ${game.score.toLocaleString('ja-JP')}`;$('stageSelect').classList.add('hidden');$('start').textContent=phase==='over'?`ステージ${game.stage}に再挑戦`:'もう一度、出撃';$('restart').classList.toggle('hidden',phase!=='over');$('resume').classList.add('hidden');flash=phase==='clear'?.95:.65;shake=phase==='clear'?.65:.45;audio.fanfare(phase==='clear',phase==='clear');}
function pause(){if(['ready','clear','over'].includes(game.phase))return;$('restart').classList.add('hidden');game.paused=true;game.setFiring(false);keys.clear();pointer=null;aim=null;$('panel').dataset.result='';$('panel').classList.remove('hidden');$('kicker').textContent='PAUSED';$('title').textContent='一時停止';$('description').textContent='準備ができたら、飛行を再開できます。';$('stageSelect').classList.add('hidden');$('start').textContent='最初から出撃';$('resume').classList.remove('hidden');}
document.querySelectorAll('#journey button').forEach(button=>button.onclick=()=>selectStage(Number(button.dataset.stage)));selectStage(1);$('start').onclick=()=>game.phase==='over'?retry():start();$('restart').onclick=()=>{selectStage(1);start(1);};$('pause').onclick=pause;$('resume').onclick=()=>{game.paused=false;$('panel').classList.add('hidden');canvas.focus();};$('sound').onclick=()=>setSound(!audio.enabled);updateSoundButton();
addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')||e.code==='Space')e.preventDefault();if(e.key==='Escape'){pause();return;}if(e.code==='Space'){keys.add('space');return;}keys.add(e.key.toLowerCase());});addEventListener('keyup',e=>{if(e.code==='Space'){keys.delete('space');return;}keys.delete(e.key.toLowerCase());});addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,0,1),-6),intersection=new T.Vector3();
function drag(e){const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);if(ray.ray.intersectPlane(plane,intersection))aim={x:intersection.x,y:intersection.y};}
canvas.addEventListener('pointerdown',e=>{pointer=e.pointerId;canvas.setPointerCapture(e.pointerId);drag(e);});canvas.addEventListener('pointermove',e=>{if(pointer===e.pointerId)drag(e);});for(const type of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{pointer=null;aim=null;});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('error').textContent='3D表示が中断しました。ページを再読み込みしてください。';$('error').classList.remove('hidden');});
// Screen-space glow for engine cores, laser bolts and bright blast fragments.
const target=new T.WebGLRenderTarget(1,1),postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
const postMat=new T.ShaderMaterial({uniforms:{map:{value:target.texture},pixel:{value:new T.Vector2(1/1000,1/700)},warp:{value:0}},vertexShader:'varying vec2 uvv;void main(){uvv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D map;uniform vec2 pixel;uniform float warp;varying vec2 uvv;void main(){vec2 u=uvv;vec3 c=texture2D(map,u).rgb;vec3 glow=vec3(0.);for(int j=0;j<12;j++){float a=float(j)*.523599;vec2 d=vec2(cos(a),sin(a));vec3 s=texture2D(map,u+d*pixel*7.).rgb;glow+=max(s-vec3(.68),0.);s=texture2D(map,u+d*pixel*19.).rgb;glow+=max(s-vec3(.8),0.)*.65;}c+=glow*.14;float v=1.-.22*pow(length((u-.5)*1.3),2.);c*=v;c+=vec3(.015,.07,.1)*warp*pow(length(u-.5),1.5);gl_FragColor=vec4(c,1.);}`});postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),postMat));
let cameraZ=20;
// Let the rocket roam the whole visible screen: project the screen corners onto the ship's plane (z=6) at the combat FOV, then inset by the ship's own size.
const shipBox=new T.Box3().setFromObject(ship),shipHalf=shipBox.getSize(new T.Vector3()).multiplyScalar(.5),shipOffset=shipBox.getCenter(new T.Vector3()).sub(ship.position);
function fitBounds(){const fov=camera.fov;camera.fov=57;camera.updateProjectionMatrix();camera.updateMatrixWorld();const corners=[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,y])=>{ray.setFromCamera(new T.Vector2(x,y),camera);return ray.ray.intersectPlane(plane,new T.Vector3());});camera.fov=fov;camera.updateProjectionMatrix();if(corners.some(c=>!c))return;const half=Math.min(...corners.map(c=>Math.abs(c.x))),bottom=Math.max(corners[0].y,corners[1].y),top=Math.min(corners[2].y,corners[3].y);game.setBounds({minX:-half+shipHalf.x-shipOffset.x,maxX:half-shipHalf.x-shipOffset.x,minY:bottom+shipHalf.y-shipOffset.y,maxY:top-shipHalf.y-shipOffset.y});}
function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;cameraZ=Math.max(20,6+8.5/(Math.tan(T.MathUtils.degToRad(57/2))*camera.aspect));camera.updateProjectionMatrix();const size=new T.Vector2();renderer.getDrawingBufferSize(size);target.setSize(size.x,size.y);postMat.uniforms.pixel.value.set(1/size.x,1/size.y);camera.position.set(0,4,cameraZ);camera.lookAt(0,-.8,-25);fitBounds();}
addEventListener('resize',resize);resize();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.04,(now-last)/1000);last=now;audio.tick(game.phase,game.paused);if(game.paused)return;visualTime+=dt;
 const dx=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a')),dy=Number(keys.has('arrowup')||keys.has('w'))-Number(keys.has('arrowdown')||keys.has('s'));const prevX=game.player.x,prevY=game.player.y;
 if(dx||dy){const d=Math.hypot(dx,dy);game.move(prevX+dx/d*7*dt,prevY+dy/d*7*dt);aim=null;}else if(aim)game.move(T.MathUtils.lerp(prevX,aim.x,1-Math.exp(-15*dt)),T.MathUtils.lerp(prevY,aim.y,1-Math.exp(-15*dt)));
 game.setFiring(keys.has('space')||pointer!==null);game.step(dt);handleEvents();tickDialogue(dt);syncEntities();updateHud();updateEnvironment();
 const warping=['warp','transit'].includes(game.phase),speed=warping?230:game.phase==='ready'?12:65+Math.max(0,game.stage-5)*10;
 for(let i=0;i<starCount;i++){const s=starData[i];s.z+=speed*dt;if(s.z>22)s.z=-220;const k=i*6;lines[k]=s.x;lines[k+1]=s.y;lines[k+2]=s.z;lines[k+3]=s.x;lines[k+4]=s.y;lines[k+5]=s.z-(warping?26:1.8);}starGeometry.attributes.position.needsUpdate=true;
 warpRings.forEach(r=>{r.visible=warping;if(warping){r.position.z+=speed*dt;if(r.position.z>22)r.position.z=-200;r.rotation.z+=dt*.1;}});rocks.forEach((r,i)=>{r.visible=!surfaceWorld.visible&&!warping&&(game.stage===7||i<16);r.position.z+=speed*.4*dt;r.rotation.y+=dt*.15;if(r.position.z>22)r.position.z=-190;});planet.rotation.y+=dt*.015;
 if(surfaceWorld.visible){baseScenery.visible=game.phase==='swarm';for(const light of runwayLights){light.position.z+=(game.phase==='swarm'?45:8)*dt;if(light.position.z>22)light.position.z-=216;}}
 ship.position.set(game.player.x,game.player.y,game.player.z);ship.rotation.z=T.MathUtils.lerp(ship.rotation.z,-(game.player.x-prevX)*2,.15);ship.rotation.x=T.MathUtils.lerp(ship.rotation.x,(game.player.y-prevY)*.8,.15);ship.visible=game.player.inv===0||Math.floor(game.player.inv*14)%2===0;ship.traverse(m=>{if(m.name==='plume')m.scale.y=(warping?2.5:1)+Math.sin(visualTime*50)*.12;});
 const shakeValue=reduced?0:shake;camera.position.lerp(new T.Vector3(game.player.x*.18+Math.sin(now*.041)*shakeValue,4+game.player.y*.14+Math.cos(now*.052)*shakeValue,cameraZ),1-Math.exp(-4*dt));camera.lookAt(game.player.x*.08,-.8,-25);camera.fov=T.MathUtils.lerp(camera.fov,warping&&!reduced?72:57,.045);camera.updateProjectionMatrix();shake=Math.max(0,shake-dt*.6);flash=Math.max(0,flash-dt*.7);$('flash').style.opacity=String(reduced?Math.min(.08,flash):flash);
 if(visualTime>noticeEnd)$('notice').classList.remove('show');
 for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;if(e.ring){e.mesh.scale.setScalar(1+(e.max-e.life)*14);e.mesh.material.opacity=Math.max(0,e.life/e.max);}else{e.mesh.position.addScaledVector(e.v,dt);e.mesh.scale.setScalar(Math.max(.1,e.life/e.max)*2);}if(e.life<=0){scene.remove(e.mesh);if(e.ring){e.mesh.geometry.dispose();e.mesh.material.dispose();}effects.splice(i,1);}}
 postMat.uniforms.warp.value=warping?1:0;renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
}
requestAnimationFrame(frame);
export {game,start,pause};
