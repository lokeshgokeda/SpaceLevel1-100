'use strict';
/* NEBULA PROTOCOL v8 — enemy classes, formations, tactical AI, projectile kinds, damage direction source, objectives, bullet-hit resolution. */
(()=>{
const N8=window.N8,{hook,clamp,rnd}=N8,GE=GameEngine,A8=N8.audio;

/* ---------- role table (existing roles keep their v7 stats; new roles scale from the FIGHTER base the constructor gives them) ---------- */
const R={
 FIGHTER:{hp:1,col:'#ff1768',min:1},SWARM:{hp:1,col:'#62a8ff',min:1},INTERCEPTOR:{hp:1,col:'#00ffcc',min:3},SNIPER:{hp:1,col:'#b56cff',min:4},CARRIER:{hp:1,col:'#ff7a2d',min:8},ELITE:{hp:1,col:'#ffcc00',min:5},
 SCOUT:{hp:.55,size:30,speed:2.1,col:'#ffe14a',min:2,sh:0},TANK:{hp:3.6,size:58,speed:.55,col:'#8fa3c4',min:6,sh:.5},STEALTH:{hp:.9,size:34,speed:1.4,col:'#7d6bff',min:8,sh:.15},MINIBOSS:{hp:7,size:76,speed:.5,col:'#ff5a2d',min:12,sh:.6},
 BOMBER:{hp:2.7,size:52,speed:.75,col:'#ff8a3d',min:5,sh:.4},HUNTER:{hp:1.5,size:40,speed:1.25,col:'#ff4a3a',min:7,sh:.35},SHIELD_DRONE:{hp:.55,size:28,speed:1.5,col:'#5ffff0',min:6,sh:0},ASSASSIN:{hp:.8,size:34,speed:2.4,col:'#c56bff',min:9,sh:.2}
};
N8.ROLES=R;
const dmgBase=g=>Math.max(8,Math.min(140,8+g.level*.18))*(N8.sectorOf(g.level).diff**.5);
const ELITE_ABIL=['BLINK','BURST','REGEN','GHOST'];

function initEnemy(g,e){
  const sec=N8.sectorOf(g.level),ro=R[e.role]||R.FIGHTER;e.v8={cloak:0};e.i8=1;
  if(ro.size){e.size=ro.size;e.maxHp*=ro.hp;e.hp=e.maxHp;e.speed=Math.min(5,ro.speed+Math.sqrt(Math.min(1000,g.level))*.045)}
  e.color=ro.col;if(e.type==='ELITE'||e.role==='ELITE')e.color='#ffcc00';
  e.maxHp*=sec.diff;e.hp=e.maxHp;
  const shf=ro.sh!==undefined?ro.sh:(e.type==='ELITE'||e.role==='CARRIER'?.45:(g.level>=20&&e.role!=='SWARM'?.3:0));
  e.fx0=e.fx0||0;e.fy0=e.fy0||0;e.maxSh=Math.round(e.maxHp*shf);e.sh=e.maxSh;e.cd=40+Math.random()*60;e.hitFlash=0;e.stun=0;e.kb=null;e.prot=0;e.scare=0;e.bankv=0;e.px=e.x;
  if(e.type==='ELITE'||e.role==='ELITE'){e.abil=ELITE_ABIL[Math.floor(Math.random()*4)];e.abT=120+Math.random()*100}
  if(e.role==='CARRIER'){e.bay=200;e.kids=0}
  if(e.role==='ASSASSIN'){e.v8.cloak=1;e.mode='stalk';e.modeT=0}
  if(e.role==='SNIPER'||e.role==='HUNTER'){e.ax=e.x}
  e.tx=e.x;e.ty=120+Math.random()*100;
}
const P=g=>g.player;
function aimPoint(g,e,lead){const p=P(g),c=p.v8&&p.v8.cloak>0;let ax=p.x,ay=p.y;
  if(c){ax+=Math.sin(e.phase*7+e.age*.01)*170;ay+=Math.cos(e.phase*5)*60}
  else if(lead){const d=Math.hypot(ax-e.x,ay-e.y),t=d/9;ax+=(p.vx||0)*t*.6;ay+=(p.vy||0)*t*.6}
  return{x:ax,y:ay}}

/* ---------- enemy projectiles ---------- */
N8.eShot=(g,kind,x,y,vx,vy,dmg,o={})=>{
  let n=0;for(const b of g.bullets)if(b.isEnemy)n++;if(n>=110)return null;
  const s=g.settings.assist?.75:1;const rad={LASER:3.6,PLASMA:7.5,MISSILE:5,MINE:8,WAVE:12,SNIPER:3}[kind]||4;
  const b=new Bullet(x,y,vx*s,vy*s,o.col||'#ff3355',true,dmg,o.r||rad,kind==='MISSILE'?(o.homing||.05):0,kind==='SNIPER'?3:kind==='PLASMA'?5:0,0);
  b.ek=kind;b.hpm=kind==='MISSILE'?14+g.level*.05:kind==='MINE'?20:0;b.own=o.own;if(kind==='MINE'){b.trig=64;b.fuse=o.fuse||620}
  if(kind==='WAVE'){b.wave=1;b.maxR=44;b.pass=1}
  g.bullets.push(b);
  A8.play({LASER:'ENEMY_LASER',PLASMA:'ENEMY_PLASMA',MISSILE:'MISSILE',MINE:'ENEMY_PLASMA',WAVE:'ENEMY_PLASMA',SNIPER:'ENEMY_SNIPER'}[kind],x,y);return b};
/* v5/v7 enemyBullet() callers (bosses) keep working; their bullets are classified by style/radius/homing in the renderer */
N8.enemyBulletKind=(b)=>N8.shotKind(b);

/* ---------- formations ---------- */
function mkE(g,x,y,role,elite){const e=new Enemy(x,y,g.level,elite?'ELITE':role,elite?'ELITE':role);return e}
function spawnFormation(g,id,pick){
  const W=g.canvas.width,L=g.level,v=g.v8,list=[],gid=(v.gid=(v.gid||0)+1),cx=W*(.25+Math.random()*.5),n=id==='SWARM'?9:id==='PINCER'?6:id==='CARRIER GROUP'?5:id==='ESCORT'?5:id==='WEDGE'?5:id==='LINE'?6:5;
  const push=(x,y,role,i,extra)=>{const e=mkE(g,x,y,role,false);e.form={id,i,gid,n,side:extra&&extra.side};e.fx0=extra&&extra.dx||0;e.fy0=extra&&extra.dy||0;list.push(e);return e};
  const body=()=>pick(false);
  if(id==='V'){const lead=push(cx,-90,body(),0);for(let i=1;i<n;i++){const s=i%2?-1:1,k=Math.ceil(i/2);push(cx+s*k*52,-90-k*44,body(),i,{dx:s*k*52,dy:-k*44})}}
  else if(id==='LINE'){for(let i=0;i<n;i++)push(W*.12+i*(W*.76/(n-1)),-80-Math.random()*20,body(),i,{dx:(i-(n-1)/2)*70,dy:0})}
  else if(id==='WEDGE'){push(cx,-90,'INTERCEPTOR',0);for(let i=1;i<n;i++){const s=i%2?-1:1,k=Math.ceil(i/2);push(cx+s*k*40,-90-k*36,i>2?'FIGHTER':'INTERCEPTOR',i,{dx:s*k*40,dy:-k*36})}}
  else if(id==='PINCER'){for(let i=0;i<n;i++){const side=i%2?1:-1;push(side<0?-60-i*26:W+60+i*26,60+Math.floor(i/2)*44,i<2?'INTERCEPTOR':body(),i,{side})}}
  else if(id==='SWARM'){for(let i=0;i<n;i++)push(cx+(Math.random()-.5)*W*.5,-70-Math.random()*160,'SWARM',i)}
  else if(id==='ESCORT'){const c=push(cx,-100,Math.random()<.5?'BOMBER':'SNIPER',0);for(let i=1;i<n;i++){const a=(i-1)*1.57+.78;push(cx+Math.cos(a)*70,-100+Math.sin(a)*60,i<3?'FIGHTER':'SHIELD_DRONE',i,{dx:Math.cos(a)*70,dy:Math.sin(a)*60})}}
  else if(id==='CARRIER GROUP'){const c=push(cx,-130,'CARRIER',0);for(let i=1;i<n;i++){const s=i%2?-1:1,k=Math.ceil(i/2);push(cx+s*k*85,-100-k*20,i<3?'FIGHTER':'SHIELD_DRONE',i,{dx:s*k*85,dy:-30+k*10})}}
  const lead=list[0];for(const e of list)e.lead=lead;(v.groups=v.groups||{})[gid]={id,lead,n};
  return list}

/* ---------- wave spawning: sector composition + formation + objective ---------- */
const ROLE_MIN=k=>(R[k]||R.FIGHTER).min;
hook(GE.prototype,'spawnWave',function(o){
  const g=this;if(g.state!==GAME.PLAYING||g.transition)return;
  if(g.gameMode==='BOSS_RUSH'||g.level%5===0){o.call(g);if(g.boss&&N8.initBoss)N8.initBoss(g,g.boss);return}
  const v=g.v8,sec=N8.sectorOf(g.level),L=g.level;g.enemies=[];v.groups={};
  if(g.wave===1||!v.obj||v.obj.level!==L||v.obj.mode!==g.gameMode)N8.chooseObjective(g);
  const total=Math.min(30,6+g.wave*2+Math.floor(Math.sqrt(L)*.95));
  const weights=Object.entries(sec.comp).filter(([k])=>L>=ROLE_MIN(k)||L>=40),W=weights.reduce((a,[,w])=>a+w,0)||1;
  const pick=(elite)=>{if(elite)return'ELITE';let r=Math.random()*W;for(const [k,w] of weights){r-=w;if(r<=0)return k}return'FIGHTER'};
  const pickNE=()=>{let k=pick(false);if(k==='ELITE')k='FIGHTER';return k};
  let left=total;const forms=sec.form,W2=g.canvas.width;
  // 1-2 formations per wave (more later), rest are free flyers arriving staggered
  const nform=L<3?0:(L<12?1:2);
  for(let f=0;f<nform&&left>5;f++){const id=forms[Math.floor(Math.random()*forms.length)];const es=spawnFormation(g,id,pickNE);if(es.length>left)es.length=left;for(const e of es)g.enemies.push(e);left-=es.length}
  for(let i=0;i<left;i++){const elite=Math.random()<Math.min(.5,.08+L*.004);const role=pick(elite);g.enemies.push(mkE(g,Math.random()*(W2-100)+50,-80-i*42-Math.random()*80,role,elite))}
  N8.objectiveSpawn(g);
  if(g.wave>1||L>1)g.addText(g.canvas.width/2,g.canvas.height*.3,`WAVE ${g.wave}`,sec.acc,1);
});
hook(GE.prototype,'spawnLevel',function(o){const g=this;o.call(g);if(g.gameMode!=='BOSS_RUSH'&&g.state===GAME.PLAYING&&!g.boss){const el=document.getElementById('levelBanner');if(el)el.textContent=`${N8.sectorLabel(g.level)} · LEVEL ${g.level}`}
  if(g.state===GAME.PLAYING)N8.env=null});

/* ---------- objectives ---------- */
const OBJ={
 DESTROY_ALL:{n:'DESTROY ALL HOSTILES',gate:false},
 DESTROY_BOMBER:{n:'DESTROY THE BOMBER',gate:false},
 PROTECT_CARRIER:{n:'PROTECT THE CARRIER',gate:false},
 DESTROY_GENS:{n:'DESTROY SHIELD GENERATORS',gate:false},
 SURVIVE:{n:'SURVIVE 90 SECONDS',gate:true},
 ESCORT:{n:'ESCORT THE SHIP',gate:false},
 CLEAR_ASTEROIDS:{n:'CLEAR THE ASTEROID FIELD',gate:true},
 DEFEAT_COMMANDER:{n:'DEFEAT THE COMMANDER',gate:false},
 COLLECT_CORES:{n:'COLLECT ENERGY CORES',gate:false}
};
N8.OBJ=OBJ;
N8.chooseObjective=g=>{
  const v=g.v8,L=g.level,sec=N8.sectorOf(L);let type='DESTROY_ALL';
  if((g.gameMode==='ENDLESS'||g.gameMode==='SELECTED')&&L>=2){const r=N8.rng(L*131+9)(),list=sec.obj;type=r<.25?'DESTROY_ALL':list[Math.floor(N8.rng(L*17+3)()*list.length)]}
  if(N8.forceObj)type=N8.forceObj;
  const goal={DESTROY_ALL:1,DESTROY_BOMBER:1,PROTECT_CARRIER:1,DESTROY_GENS:3,SURVIVE:5400,ESCORT:1,CLEAR_ASTEROIDS:8+Math.min(10,Math.floor(L/6)),DEFEAT_COMMANDER:1,COLLECT_CORES:5}[type];
  v.obj={type,name:OBJ[type].n,goal,prog:0,done:false,failed:false,level:L,mode:g.gameMode,t:0,spawned:false,rockSpawn:0,coreN:0,coreT:0};v.rocks=[];v.cores=[];v.ally=null;
  if(type!=='DESTROY_ALL')g.toast('OBJECTIVE: '+OBJ[type].n)};
N8.objectiveSpawn=g=>{
  const v=g.v8,ob=v.obj,W=g.canvas.width;if(!ob||ob.done)return;
  const first=g.wave===1;
  if(ob.type==='DESTROY_BOMBER'&&!ob.spawned){const e=mkE(g,W/2,-120,'BOMBER',false);e.maxHp*=1.3;e.objT=1;e.hp=e.maxHp;g.enemies.push(e);ob.spawned=true}
  else if(ob.type==='DEFEAT_COMMANDER'&&!ob.spawned&&g.wave>=g.wavesPerLevel){const e=mkE(g,W/2,-120,'ELITE',true);e.i8=0;e.cmd=1;e.objT=1;e.size=64;e.maxHp*=5;e.hp=e.maxHp;g.enemies.push(e);ob.spawned=true;g.toast('COMMANDER INBOUND')}
  else if(ob.type==='DESTROY_GENS'&&!ob.spawned){for(let i=0;i<3;i++){const e=mkE(g,W*(.25+i*.25),-100-i*30,'SHIELD_DRONE',false);e.gen=1;e.objT=1;e.maxHp*=2.2;e.hp=e.maxHp;e.hold=1;g.enemies.push(e)}ob.spawned=true}
  else if(ob.type==='PROTECT_CARRIER'&&!v.ally){v.ally={x:W/2,y:-90,hp:900+g.level*20,maxHp:900+g.level*20,type:'CARRIER',size:52,vy:.5,t:0};ob.spawned=true}
  else if(ob.type==='ESCORT'&&!v.ally){v.ally={x:W*.5,y:-60,hp:600+g.level*14,maxHp:600+g.level*14,type:'TRANSPORT',size:36,vy:.42,t:0,escort:1};ob.spawned=true}
  else if(ob.type==='COLLECT_CORES'&&first&&!ob.spawned){ob.spawned=true;ob.coreT=0}
  else if(ob.type==='CLEAR_ASTEROIDS'&&first&&!ob.spawned){ob.spawned=true}
}
N8.objComplete=(g,msg)=>{const ob=g.v8.obj;if(!ob||ob.done||ob.failed)return;ob.done=true;g.toast('OBJECTIVE COMPLETE');g.addText(g.canvas.width/2,g.canvas.height*.4,'OBJECTIVE COMPLETE','#00ff9d',1.3);A8.play('MISSION');g.coins+=60+g.level*4;g.score+=1500*Math.max(1,g.combo|0);if(N8.reward)N8.reward(g,{xp:80+g.level*2,loot:'obj',x:g.canvas.width/2,y:g.canvas.height*.4});if(g.updateMission)g.updateMission('obj',1)};
N8.objFail=(g,why)=>{const ob=g.v8.obj;if(!ob||ob.done||ob.failed)return;ob.failed=true;g.toast('OBJECTIVE FAILED — '+why);g.addText(g.canvas.width/2,g.canvas.height*.4,'OBJECTIVE FAILED','#ff3355',1.3);A8.play('WARN')};
N8.updRocks=g=>{const v=g.v8,p=P(g),W=g.canvas.width,H=g.canvas.height,ob=v.obj;if(!v.rocks)return;
  for(let i=v.rocks.length-1;i>=0;i--){const r=v.rocks[i];r.x+=r.vx;r.y+=r.vy;r.rot+=r.vr;if(r.x<r.r||r.x>W-r.r)r.vx*=-1;
    if(Math.hypot(r.x-p.x,r.y-p.y)<r.r+22&&!p.hitInvuln){g.v8.hitInfo={ang:Math.atan2(r.y-p.y,r.x-p.x),kind:'IMPACT'};g.applyDamage(22+g.level*.3);N8.boom(g,r.x,r.y,1,'#aaa',1);v.rocks.splice(i,1);continue}
    if(r.y>H+60)v.rocks.splice(i,1)}
};
function updObjective(g){
  const v=g.v8,ob=v.obj,p=P(g),W=g.canvas.width,H=g.canvas.height;if(!ob)return;ob.t++;
  const sec=N8.sectorOf(g.level);
  if(ob.type==='SURVIVE'&&!ob.done){ob.prog=Math.min(ob.goal,ob.prog+1);if(ob.prog>=ob.goal)N8.objComplete(g)}
  if(ob.type==='CLEAR_ASTEROIDS'&&ob.spawned&&!ob.done){if(v.rocks.length<5&&ob.rockSpawn<ob.goal&&ob.t%50===0){{ob.rockSpawn++;const big=Math.random()<.35;v.rocks.push({x:rnd(60,W-60),y:-50,vx:rnd(-.8,.8),vy:rnd(1,2),hp:big?260+g.level*7:110+g.level*4,maxHp:big?260+g.level*7:110+g.level*4,r:big?44:26,rot:0,vr:rnd(-.03,.03),img:Math.floor(Math.random()*6)})}}}
  N8.updRocks(g);
  if(ob.type==='CLEAR_ASTEROIDS')ob.prog=Math.min(ob.goal,Math.max(0,ob.rockSpawn-v.rocks.length));
  if(ob.type==='CLEAR_ASTEROIDS'&&ob.spawned&&!ob.done&&ob.rockSpawn>=ob.goal&&!v.rocks.length)N8.objComplete(g);
  // energy cores
  if(ob.type==='COLLECT_CORES'&&ob.spawned&&!ob.done){ob.coreT=(ob.coreT||0)+1;if(v.cores.length<2&&ob.coreN<ob.goal&&ob.coreT%300===30){ob.coreN++;v.cores.push({x:rnd(80,W-80),y:-30,life:1100})}
  if(ob.type==='COLLECT_CORES'&&ob.spawned&&!ob.done&&ob.coreN>=ob.goal&&!v.cores.length&&ob.prog<ob.goal){ob.coreN=ob.prog}}
  for(let i=v.cores.length-1;i>=0;i--){const c=v.cores[i];c.y+=.9;c.life--;if(Math.hypot(c.x-p.x,c.y-p.y)<Math.max(34,p.magnet*.6)){c.x+=(p.x-c.x)*.1;c.y+=(p.y-c.y)*.1}
    if(Math.hypot(c.x-p.x,c.y-p.y)<26){v.cores.splice(i,1);ob.prog++;p.energy=Math.min(p.maxEnergy,p.energy+30);g.addText(p.x,p.y-50,'CORE '+ob.prog+'/'+ob.goal,'#ffcc00',1);A8.play('LOOT_R');if(ob.prog>=ob.goal)N8.objComplete(g)}else if(c.y>H+30||c.life<=0)v.cores.splice(i,1)}
  // ally (carrier / escorted transport)
  const a=v.ally;if(a){a.t++;if(a.y<H*.28)a.y+=a.vy*3;else{a.y+=a.escort?a.vy:.06;a.x+=Math.sin(a.t*.01)*.5}
    if(a.hp<=0){N8.boom(g,a.x,a.y,3,'#66ff99',1.2);g.addText(a.x,a.y,ob&&ob.type==='ESCORT'?'ESCORT LOST':'CARRIER LOST','#ff3355',1.3);N8.objFail(g,ob.type==='ESCORT'?'ESCORT LOST':'CARRIER LOST');v.ally=null;for(let i=0;i<3&&g.enemies.length<32;i++)g.enemies.push(mkE(g,rnd(80,W-80),-60-i*40,'INTERCEPTOR',false))}
    else if(a.escort&&a.y>H*.86){N8.objComplete(g);v.ally=null;A8.play('MISSION')}}
  // generators: while any is alive every other enemy takes half damage
  if(ob.type==='DESTROY_GENS'){let gens=0;for(const e of g.enemies)if(e.gen&&!e.dead)gens++;ob.prog=3-gens;v.gensAlive=gens;if(ob.spawned&&!gens&&!ob.done)N8.objComplete(g)}else v.gensAlive=0;
}
/* wave completion is gated for SURVIVE (keep spawning), CLEAR_ASTEROIDS (field must be cleared) */
hook(GE.prototype,'nextWave',function(o){const g=this,ob=g.v8&&g.v8.obj;
  if(ob&&!ob.done&&!ob.failed){
    if(ob.type==='SURVIVE'){g.wave=Math.min(g.wave,g.wavesPerLevel-1);g.wave++;o.call(g);return}
    if(ob.type==='CLEAR_ASTEROIDS'&&g.gameMode!=='BOSS_RUSH'&&(g.v8.rocks.length||(ob.rockSpawn||0)<ob.goal)){if(g.enemies.length===0&&!g._rw){g._rw=1;setTimeout(()=>{g._rw=0},600);}return}
    if(ob.type==='DEFEAT_COMMANDER'&&g.wave>=g.wavesPerLevel&&!ob.spawned){g.wave=g.wavesPerLevel;g.spawnWave();return}
    if(ob.type==='DEFEAT_COMMANDER'&&ob.spawned&&!ob.done){return}
    if(ob.type==='COLLECT_CORES'&&!ob.done&&g.wave>=g.wavesPerLevel&&ob.coreN<ob.goal){return}
  }
  return o.call(g)});
hook(GE.prototype,'completeLevel',function(o){const g=this,ob=g.v8&&g.v8.obj;if(ob&&!ob.done&&!ob.failed&&(ob.type==='PROTECT_CARRIER'&&g.v8.ally)){N8.objComplete(g)}
  else if(ob&&!ob.done&&!ob.failed&&(ob.type==='DESTROY_BOMBER'))N8.objFail(g,'BOMBER ESCAPED');
  if(ob&&ob.type==='ESCORT'&&!ob.done&&!ob.failed)N8.objFail(g,'ESCORT NOT DELIVERED');
  g.v8.ally=null;return o.call(g)});

/* ---------- tactical AI ---------- */
function aiStep(g,e){
  const p=P(g),W=g.canvas.width,H=g.canvas.height,v=g.v8,now=e.age,ro=e.role,spd=e.speed;
  e.age++;e.phase+=e.phaseSpeed;e.px=e.x;if(e.hitFlash>0)e.hitFlash--;if(e.prot>0)e.prot--;if(e.scare>0)e.scare--;
  if(e.kb){e.x+=e.kb.vx;e.y+=e.kb.vy;e.kb.vx*=.86;e.kb.vy*=.86;if(--e.kb.t<=0)e.kb=null}
  const frozen=p.active.EMP||p.active.TIMEWARP;
  if(e.stun>0){e.stun--;return}
  if(p.active.TIMEWARP){e.y-=e.speed*.45}
  if(frozen){e.x=clamp(e.x,e.size,W-e.size);return}
  const ap=aimPoint(g,e,ro==='SNIPER'||ro==='HUNTER'||e.type==='ELITE'),dx=ap.x-e.x,dy=ap.y-e.y,dist=Math.hypot(dx,dy)||1;
  const F=e.form,lead=e.lead&&!e.lead.dead&&e.lead!==e?e.lead:null,inForm=F&&(lead||e===e.lead)&&e.age<2200&&!e.broke;
  const approachY=(y)=>{if(e.y<y)e.y+=Math.min(spd*1.4,y-e.y)};
  // dodge incoming player shots (all fighters)
  const dodge=(k=2.8)=>{for(const b of g.bullets){if(b.isEnemy||b.missile||b.dead)continue;if(b.y>e.y&&b.y-e.y<130&&Math.abs(b.x-e.x)<e.size*.9){e.x+=(Math.sign(e.x-b.x)||1)*k;return true}}return false};
  const retreat=e.scare>0?-1:1;
  let firePlan=null;
  if(e.dive){e.y+=spd*2.2;e.x+=Math.sin(e.phase)*.8}
  else if(ro==='SWARM'){
    if(inForm&&F.id==='SWARM'){const tx=(lead?lead.x:e.x)+Math.sin(e.phase*3+F.i)*70,ty=Math.max(80,(lead?lead.y:e.y))+F.i%3*22;e.x+=(tx-e.x)*.05;e.y+=Math.min(spd*1.8,Math.max(0,p.y-140-e.y))*.65+spd*.35}
    else{e.y+=spd;e.x+=Math.sin(e.phase*3)*1.7+Math.sign(dx)*.35}
    if(dist<70&&e.y>60){e.x+=dx/dist*spd*1.6;e.y+=dy/dist*spd*1.6}
    firePlan={k:'LASER',rate:150,n:1}}
  else if(ro==='INTERCEPTOR'){
    e.bank=e.bank||0;
    if(inForm&&F.id==='WEDGE'){ // wedge dives together on the player's column
      if(!e.wdv&&lead&&lead.y>p.y-380){e.wdv=1}
      if(e.wdv||e===e.lead){e.y+=spd*(1.7+(e.wdv?.4:0));e.x+=clamp((p.x+(e.fx0||0)*.4-e.x)*.05,-3,3);if(e.y>H*.72){e.dive=true}}
      else{const tx=lead.x+e.fx0,ty=lead.y+e.fy0;e.x+=(tx-e.x)*.12;e.y+=(ty-e.y)*.12}}
    else if(inForm&&F.id==='PINCER'){ // sweep in from the sides, converge on the player, then strafe
      const s=F.side||1;if(!e.pin){e.pin=1;e.tx=p.x+s*140;}
      e.x+=clamp(((e.pin===1?(s<0?W*.15:W*.85):p.x+s*120)-e.x)*.03,-spd*2.2,spd*2.2);e.y+=clamp((150+Math.floor(F.i/2)*46+Math.sin(e.phase*2)*20-e.y)*.05,-3,3);
      if(e.pin===1&&Math.abs(e.x-(s<0?W*.15:W*.85))<30)e.pin=2}
    else{ // free interceptor: high-speed lateral strafing passes with periodic dives
      e.y+=clamp((190+Math.sin(e.phase*.8)*80-e.y)*.04,-spd,spd*1.3);e.x+=Math.sin(e.phase*1.5)*spd*1.7+Math.sign(dx)*Math.min(2,Math.abs(dx)*.01);
      if(!dodge(3.4)&&e.age%260===200)e.diveT=40;if(e.diveT>0){e.diveT--;e.y+=spd*2.2}}
    firePlan={k:'LASER',rate:95,n:2}}
  else if(ro==='SNIPER'){
    const hy=Math.min(H*.24,150+e.phase%1*30);approachY(hy);
    if(dist<300||e.scare>0){e.y-=spd*1.5;e.x+=Math.sign(e.x-p.x||1)*1.8}else if(e.y>hy+20)e.y-=spd*.4;e.x+=Math.sin(e.phase*.6)*.7;
    // telegraph then shoot
    if(e.aimT>0){e.aimT--;v.tele=v.tele||[];v.tele.push({x0:e.x,y0:e.y+e.size*.4,x1:e.ax,y1:e.ay,t:e.aimT,ek:'SNIPER',o:e});if(e.aimT===0){const m=Math.hypot(e.ax-e.x,e.ay-e.y)||1;N8.eShot(g,'SNIPER',e.x,e.y+e.size*.5,(e.ax-e.x)/m*15,(e.ay-e.y)/m*15,dmgBase(g)*2.3,{col:'#c07dff',own:e})}}
    else if(--e.cd<=0&&e.y>10){e.cd=170+Math.random()*90;e.aimT=46;e.ax=ap.x;e.ay=ap.y}}
  else if(ro==='BOMBER'){
    approachY(e.hold?95+e.form?.i*0:130);e.x+=Math.sin(e.phase*.5)*.9;if(e.hold)e.x+=Math.sin(e.phase*.3)*.4;
    firePlan={k:'PLASMA',rate:140,n:1};
    if(!e.mineT)e.mineT=100;if(--e.mineT<=0&&e.y>20){e.mineT=200+Math.random()*120;N8.eShot(g,'MINE',e.x,e.y+e.size*.5,rnd(-.4,.4),.55,dmgBase(g)*3,{col:'#ff5030'})}}
  else if(ro==='HUNTER'){
    const ty=clamp(p.y-260,110,H*.5),tx=p.x+Math.sin(e.phase*.7)*130*retreat;e.x+=clamp((tx-e.x)*.03,-spd*1.4,spd*1.4);e.y+=clamp((ty-e.y)*.03,-spd,spd);dodge(2);
    if(--e.cd<=0&&e.y>10){e.cd=210+Math.random()*80;const m=dist;N8.eShot(g,'MISSILE',e.x,e.y+e.size*.4,dx/m*3.2,dy/m*3.2,dmgBase(g)*1.8,{col:'#ff5030',homing:.055})}}
  else if(ro==='SHIELD_DRONE'){
    let best=null,bd=1e9;for(const o of g.enemies){if(o===e||o.dead||o.role==='SHIELD_DRONE')continue;const d=Math.hypot(o.x-e.x,o.y-e.y);const pr=(o.role==='CARRIER'?-200:0)+(o.type==='ELITE'?-100:0)+(o.role==='BOMBER'?-120:0);if(d+pr<bd){bd=d+pr;best=o}}
    const gen=e.gen;
    if(best&&!gen){e.x+=clamp((best.x+Math.sin(e.phase*2)*60-e.x)*.06,-spd*2,spd*2);e.y+=clamp((best.y-46-e.y)*.06,-spd*2,spd*2);for(const o of g.enemies){if(o!==e&&!o.dead&&Math.hypot(o.x-e.x,o.y-e.y)<135)o.prot=8}}
    else if(gen){approachY(90+(e.age%3)*15);e.x+=Math.sin(e.phase*.8)*.9}
    else{e.x+=dx/dist*spd;e.y+=dy/dist*spd}}
  else if(ro==='CARRIER'){
    approachY(110);e.x+=Math.sin(e.phase*.4)*.6;if(inForm&&lead===null&&F){}
    if(--e.bay<=0&&e.y>0){e.bay=Math.max(150,300-g.level*.6);if(g.enemies.length<32&&e.kids<6){e.kids++;const k=mkE(g,e.x+rnd(-20,20),e.y+e.size*.5,'FIGHTER',false);k.lead=e;k.form={id:'CARRIER GROUP',i:9,gid:0,n:0};k.launch=1;g.enemies.push(k);g.addText(e.x,e.y+e.size,'LAUNCH','#ff7a2d',.7);N8.boom(g,e.x,e.y+e.size*.5,0,'#ff7a2d',1)}}
    firePlan={k:'PLASMA',rate:210,n:1,spread:1}}
  else if(ro==='ASSASSIN'){
    if(e.mode==='stalk'){e.v8.cloak=1;e.x+=clamp((p.x-e.x)*.02,-spd,spd);e.y+=Math.max(0,(p.y-210-e.y))*.02+spd*.35;if(dist<300||e.y>H*.5){e.mode='strike';e.modeT=0;e.v8.cloak=0;A8.play('CLOAK',e.x,e.y);g.v8.fx.push({t:'ring',x:e.x,y:e.y,r:5,max:40,life:1,c:'#c56bff'})}}
    else if(e.mode==='strike'){e.modeT++;const ax=ap.x-e.x,ay=ap.y-e.y,m=Math.hypot(ax,ay)||1;if(e.modeT<26){e.x-=ax/m*.6;e.y-=ay/m*.6}else if(e.modeT===26){e.dx8=ax/m;e.dy8=ay/m;const wv=N8.eShot(g,'WAVE',e.x,e.y+10,ax/m*4.2,ay/m*4.2,dmgBase(g)*1.7,{col:'#d488ff'});N8.eShot(g,'LASER',e.x,e.y,ax/m*8,ay/m*8,dmgBase(g)*1.1,{col:'#e0a0ff'})}else if(e.modeT<60){e.x+=e.dx8*spd*3.2;e.y+=e.dy8*spd*3.2}else{e.mode='retreat';e.modeT=0}}
    else{e.modeT++;e.y-=spd*1.6;e.x+=Math.sin(e.phase*2)*2;if(e.modeT>100||e.y<70){e.mode='stalk'}}}
  else if(ro==='ELITE'||e.type==='ELITE'){
    approachY(e.cmd?110:170);e.x+=Math.sin(e.phase*.9)*spd*1.3+Math.sign(dx)*Math.min(1.6,Math.abs(dx)*.008);dodge(3.2);
    if(--e.abT<=0){e.abT=150+Math.random()*90;const ab=e.abil||'BURST';
      if(ab==='BLINK'){g.v8.fx.push({t:'ring',x:e.x,y:e.y,r:4,max:44,life:1,c:'#ffcc00'});e.x=clamp(e.x+(Math.random()<.5?-1:1)*rnd(140,260),e.size,W-e.size);g.v8.fx.push({t:'ring',x:e.x,y:e.y,r:4,max:44,life:1,c:'#ffcc00'});for(let i=-1;i<=1;i++)N8.eShot(g,'LASER',e.x,e.y+20,i*1.6,6.5,dmgBase(g)*.9,{col:'#ffcc00'})}
      else if(ab==='BURST'){for(let i=-2;i<=2;i++)N8.eShot(g,'PLASMA',e.x,e.y+20,i*1.3,4.2,dmgBase(g)*1.4,{col:'#ffb020'})}
      else if(ab==='REGEN'){e.sh=Math.min(e.maxSh,e.sh+e.maxSh*.5);e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.08);g.addText(e.x,e.y-e.size*.6,'REGEN','#63ff9a',.8)}
      else if(ab==='GHOST'){e.v8.cloak=90;e.ghostT=90}}
    if(e.ghostT>0){e.ghostT--;if(e.ghostT===0)e.v8.cloak=0}
    firePlan={k:'LASER',rate:80,n:3}}
  else if(ro==='SCOUT'){ // v15: fast hit-and-run skirmisher; weaves, dodges hard, fires quick bursts then breaks away
    e.v15t=(e.v15t||0)+1;const cyc=e.v15t%300;
    if(cyc<190){approachY(130+Math.sin(e.phase)*40);e.x+=Math.sin(e.phase*2.4)*spd*2.2+Math.sign(dx)*.5;dodge(4.8);firePlan={k:'LASER',rate:70,n:1}}
    else{e.y-=spd*1.1;e.x+=Math.cos(e.phase*3)*spd*1.4}}
  else if(ro==='TANK'){ // v15: slow armoured gunship; holds a lane, wide plasma fans, ignores dodging
    approachY(165);e.x+=Math.sin(e.phase*.35)*.8+Math.sign(dx)*.12;
    if(e.aimT>0){e.aimT--;v.tele=v.tele||[];v.tele.push({x0:e.x,y0:e.y+e.size*.4,x1:p.x,y1:p.y,t:e.aimT,ek:'PLASMA',o:e})}
    else firePlan={k:'PLASMA',rate:150,n:1,spread:true}}
  else if(ro==='STEALTH'){ // v15: cloaks while stalking the flank, decloaks to fire a burst (vulnerable only while visible)
    e.v15t=(e.v15t||0)+1;const cyc=e.v15t%260,vis=cyc>=170;e.v8.cloak=vis?0:1;
    if(!vis){const tx=p.x+(Math.sin(e.phase*.4)>0?1:-1)*210,ty=Math.max(120,p.y-260);e.x+=clamp((tx-e.x)*.03,-spd*2,spd*2);e.y+=clamp((ty-e.y)*.025,-spd,spd)}
    else{e.x+=Math.sin(e.phase)*.5;firePlan={k:'LASER',rate:22,n:2}}
    if(!vis)e.prot=Math.max(e.prot,2)}
  else if(ro==='MINIBOSS'){ // v15: three rotating attack patterns with telegraphs
    approachY(150);e.x+=Math.sin(e.phase*.3)*1.2;e.v15t=(e.v15t||0)+1;const seg=Math.floor(e.v15t/180)%3,tt=e.v15t%180;
    if(tt===0&&!e.aimT){e.aimT=0}
    if(seg===0&&tt%26===0&&e.y>20){for(let i=-3;i<=3;i++){const a=Math.PI/2+i*.2;N8.eShot(g,'LASER',e.x,e.y+e.size*.4,Math.cos(a)*5,Math.sin(a)*5,dmgBase(g)*.9,{col:e.color,own:e})}}
    else if(seg===1){if(tt===30){v.tele=v.tele||[];e.v15aim={x:p.x,y:p.y}}if(tt>30&&tt<70&&e.v15aim){v.tele=v.tele||[];v.tele.push({x0:e.x,y0:e.y+e.size*.4,x1:e.v15aim.x,y1:e.v15aim.y,t:70-tt,ek:'SNIPER',o:e})}
      if(tt===70&&e.v15aim){const m=Math.hypot(e.v15aim.x-e.x,e.v15aim.y-e.y)||1;for(const o of[-.12,0,.12]){const ca=Math.cos(o),sa=Math.sin(o),ux=(e.v15aim.x-e.x)/m,uy=(e.v15aim.y-e.y)/m;N8.eShot(g,'PLASMA',e.x,e.y+e.size*.4,(ux*ca-uy*sa)*4.6,(ux*sa+uy*ca)*4.6,dmgBase(g)*2.2,{col:'#ffa02e',own:e})}}}
    else if(tt%40===0){for(const sx of[-1,1])N8.eShot(g,'LASER',e.x+sx*e.size*.5,e.y+e.size*.3,sx*2.2,4.4,dmgBase(g)*.8,{col:'#ff7a2e',own:e})}}
  else{ // FIGHTER
    if(inForm&&F.id==='V'){const L0=lead||e,tx=L0.x+e.fx0,ty=L0.y+e.fy0;if(!lead){approachY(150);e.x+=Math.sin(e.phase*.5)*1.1}else e.x+=(tx-e.x)*.1;e.y+=(ty-e.y)*.1}
    else if(inForm&&F.id==='LINE'){const ty=150+Math.sin(e.phase*.6)*10;e.y+=clamp((ty-e.y)*.05,-spd,spd*1.4);e.x+=Math.sin(e.phase*.5+F.i)*.7+(F.i%2?.15:-.15);e.cdSeq=true}
    else if(inForm&&(F.id==='ESCORT'||F.id==='CARRIER GROUP')){const c=lead;const a=e.phase*.7+F.i*1.6;const rx=(F.id==='ESCORT'?80:110),tx=c.x+Math.cos(a)*rx+e.fx0*.3,ty=c.y+Math.sin(a)*46+40;e.x+=clamp((tx-e.x)*.06,-spd*2,spd*2);e.y+=clamp((ty-e.y)*.06,-spd*2,spd*2);if(F.id==='CARRIER GROUP')c.guarded=1}
    else{ // flank: fighters sweep to the player's side and fire across
      approachY(150);if(e.y>140&&e.y<p.y-120){const tx=p.x+(Math.sin(e.phase*.3)>0?1:-1)*190*retreat;e.x+=clamp((tx-e.x)*.012,-1.3,1.3)}else e.y+=spd*.7;e.x+=Math.sin(e.phase)*.55+e.drift*.16;dodge()}
    firePlan={k:'LASER',rate:e.launch?70:110,n:1}}
  // target switching: some shooters prefer the ally ship when it is close
  let tgt=null;const al=v.ally;if(al&&al.hp>0&&firePlan&&Math.hypot(al.x-e.x,al.y-e.y)<420&&(e.age+e.form?.i*17|0)%400<170)tgt=al;
  // shooting
  if(firePlan&&e.y>18&&e.y<H-30&&!e.aimT){
    const enr=p.hp/p.maxHp<.35?.75:1;
    if(--e.cd<=0){e.cd=(firePlan.rate*(.8+Math.random()*.5))*enr*(e.cdSeq?1:1);if(e.cdSeq)e.cd=firePlan.rate+F.i*10;
      const t=tgt?{x:tgt.x,y:tgt.y}:ap,m=Math.hypot(t.x-e.x,t.y-e.y)||1,ux=(t.x-e.x)/m,uy=(t.y-e.y)/m;
      const base=dmgBase(g),k=firePlan.k;
      if(k==='LASER'){const sp=6.2+Math.min(2.5,g.level*.01);for(let i=0;i<firePlan.n;i++){const off=(i-(firePlan.n-1)/2)*.09;const ca=Math.cos(off),sa=Math.sin(off);N8.eShot(g,'LASER',e.x+(i-(firePlan.n-1)/2)*10,e.y+e.size*.4,(ux*ca-uy*sa)*sp,(ux*sa+uy*ca)*sp,base*(firePlan.n>1?.8:1),{col:e.color,own:e})}}
      else if(k==='PLASMA'){const n=firePlan.spread?3:1;for(let i=0;i<n;i++){const off=(i-(n-1)/2)*.28,ca=Math.cos(off),sa=Math.sin(off);N8.eShot(g,'PLASMA',e.x,e.y+e.size*.4,(ux*ca-uy*sa)*3.9,(ux*sa+uy*ca)*3.9,base*2.1,{col:'#ffa02e',own:e})}}}}
  // coordination bookkeeping
  e.x=clamp(e.x,e.size*.6,W-e.size*.6);e.bankv+=(clamp((e.x-e.px)*.06,-.4,.4)-e.bankv)*.15;
  // formations dissolve after the leader dies or after a while; enemies then hunt independently
  if(F&&!e.broke&&(e.lead&&e.lead.dead&&e.lead!==e||e.age>2200)){e.broke=true}
  // anti-stall: linger too long and dive out (counts as removed like v7 fly-bys)
  if(e.age>2400&&!e.gen&&!e.objT)e.dive=true;
  // contact: rams and kamikaze
  if(dist<34+(e.size-38)*.2&&!(p.v8&&p.v8.cloak>0&&false)){N8.boom(g,e.x,e.y,1,e.color,1);e.dead=true;g.v8.hitInfo={ang:Math.atan2(e.y-p.y,e.x-p.x),kind:'IMPACT'};g.applyDamage((ro==='SHIELD_DRONE'?10:25)+Math.min(80,g.level*.3)*(ro==='BOMBER'?1.6:1),null)}
}
GE.prototype.updateEnemies=function(){
  const g=this,p=g.player,v=g.v8;v.tele=[];
  for(const e of g.enemies){if(e.dead)continue;if(!e.i8)initEnemy(g,e);aiStep(g,e)}
  // objective bonus: shield-generator aura halves damage on everyone else
  if(v.gensAlive>0)for(const e of g.enemies)if(!e.gen)e.prot=Math.max(e.prot,3);
  // heal-over-time regen for elite shield
  g.enemies=g.enemies.filter(e=>!e.dead&&e.y<=g.canvas.height+e.size);
  updObjective(g);
  g.handleEnemyCollisions()};
/* ---------- enemy shot resolution against the player, ally, mines, waves + damage direction ---------- */
GE.prototype.handleEnemyCollisions=function(){
  const g=this,p=g.player,v=g.v8;if(!p)return;const al=v.ally;
  for(const s of g.bullets){
    if(!s.isEnemy||s.dead)continue;const k=N8.shotKind(s);
    if(k==='MINE'){s.vy=Math.max(.3,s.vy*.995);s.fuse--;const d=Math.hypot(s.x-p.x,s.y-p.y);
      if(d<s.trig||s.fuse<=0){s.dead=true;N8.boom(g,s.x,s.y,2,'#ff5030',.8);if(d<105){g.v8.hitInfo={ang:Math.atan2(s.y-p.y,s.x-p.x),kind:'MINE'};g.applyDamage(s.damage)}if(al&&Math.hypot(s.x-al.x,s.y-al.y)<95)al.hp-=s.damage*2;continue}}
    if(s.wave&&s.radius<s.maxR)s.radius+=.6;
    if(al&&al.hp>0&&Math.hypot(s.x-al.x,s.y-al.y)<al.size*.8+s.radius&&s.own!==undefined){s.dead=true;al.hp-=s.damage*(k==='SNIPER'?2:1);v.fx.push({t:'spark',x:s.x,y:s.y,n:3});continue}
    if(Math.hypot(s.x-p.x,s.y-p.y)<p.width*.72+s.radius){
      if(s.pass&&(s.hitP||0)>0)continue;
      if(!s.pass)s.dead=true;else s.hitP=1;
      v.fx.push({t:'spark',x:s.x,y:s.y,n:k==='PLASMA'||k==='MISSILE'?7:3});if(k==='MISSILE'||k==='PLASMA')N8.boom(g,s.x,s.y,1,s.color,.6);
      g.v8.hitInfo={ang:Math.atan2(s.y-p.y,s.x-p.x),kind:k};g.applyDamage(s.damage)}}
  g.bullets=g.bullets.filter(b=>!b.dead)};

/* ---------- player bullets vs enemies / boss / enemy missiles & mines (crit, pierce, shields, impacts) ---------- */
GE.prototype.handleBulletHits=function(){
  const g=this,p=g.player,v=g.v8;if(!p)return;
  for(const b of g.bullets){
    if(b.dead)continue;
    if(b.isEnemy)continue;
    if(b.nova||b.well)continue; // v7 detonates these itself (zero direct damage by design)
    // shoot down enemy missiles / mines
    const shootable=g.bullets;
    if(g.boss&&N8.bossHit&&N8.bossHit(g,b))continue;
    if(b.dead)continue;
    for(const e of g.enemies){
      if(b.dead)break;if(e.dead)continue;
      if(Math.hypot(b.x-e.x,b.y-e.y)<e.size*.7+(b.radius>7?b.radius*.4:0)){
        if(b.hits&&b.hits.get(e)>b.age-6)continue;
        let dmg=b.damage;const crit=Math.random()<p.crit;if(crit)dmg*=2.4;
        const o={x:b.x,y:b.y};if(b.wk==='ION'){o.shieldMul=8;o.hullMul=1;o.stun=e.sh>0?0:36}
        const dealt=N8.hurt(g,e,dmg,b.color,o);
        if(b.pierce>0){b.pierce--;(b.hits=b.hits||new Map()).set(e,b.age)}else if(b.wk==='ANTIMATTER'||b.pierce===99){(b.hits=b.hits||new Map()).set(e,b.age)}else b.dead=true;
        if(!e.sh||e.sh<=0)g.addText(b.x,b.y,`-${Math.round(dealt)}`,crit?'#fff36b':'#fff',crit?1:.75);
        if(N8.onHit)N8.onHit(g,b,e,dealt,crit);
        if(b.dead||b.wk==='ANTIMATTER'){N8.impact(g,b,p)}
        if(b.dead)break}}
    // enemy missiles and mines are destructible
    if(!b.dead)for(const s of g.bullets){if(s.dead||!s.isEnemy||!s.hpm)continue;if(Math.hypot(s.x-b.x,s.y-b.y)<s.radius+b.radius+6){s.hpm-=b.damage;if(!b.pierce||b.pierce<1)b.dead=true;else b.pierce--;if(s.hpm<=0){s.dead=true;N8.boom(g,s.x,s.y,1,s.color,.8);g.addText(s.x,s.y-10,'INTERCEPTED','#7dffb5',.7);g.score+=25}if(b.dead){N8.impact(g,b,p)}break}}
    if(!b.dead&&v.rocks&&v.rocks.length)for(const r of v.rocks){if(Math.hypot(r.x-b.x,r.y-b.y)<r.r+b.radius){r.hp-=b.damage;v.fx.push({t:'spark',x:b.x,y:b.y,n:2});if(b.pierce>0)b.pierce--;else b.dead=true;if(r.hp<=0){N8.boom(g,r.x,r.y,r.r>34?2:1,'#c0a080',1);g.score+=120;r.dead=true;const ob=v.obj;if(ob&&ob.type==='CLEAR_ASTEROIDS'){ob.prog=Math.min(ob.goal,ob.prog+1)}if(N8.onRock)N8.onRock(g,r)}if(b.dead)N8.impact(g,b,p);break}}
  }
  if(v.rocks)v.rocks=v.rocks.filter(r=>!r.dead);
  g.bullets=g.bullets.filter(b=>!b.dead)};

/* ---------- kills: formation/objective/explosion scaling ---------- */
hook(GE.prototype,'killEnemy',function(o,e){
  if(e.dead)return;const g=this;o.call(g,e);
  const big=e.role==='CARRIER'||e.role==='BOMBER'||e.cmd,size=e.size;
  if(big){N8.boom(g,e.x,e.y,e.role==='CARRIER'||e.cmd?3:2,e.color,e.role==='CARRIER'?.9:.7);if(e.role==='CARRIER'||e.cmd){N8.slowmo(g,18);N8.shake(g,8)}}
  else if(e.type==='ELITE'){N8.boom(g,e.x,e.y,2,e.color,.6)}
  if(e.role==='BOMBER'){for(const o of g.enemies)if(o!==e&&!o.dead&&Math.hypot(o.x-e.x,o.y-e.y)<110)N8.hurt(g,o,80+g.level*3,'#ff8a3d');if(Math.hypot(P(g).x-e.x,P(g).y-e.y)<80){g.v8.hitInfo={ang:Math.atan2(e.y-P(g).y,e.x-P(g).x),kind:'IMPACT'};g.applyDamage(18)}}
  const ob=g.v8.obj;if(ob&&!ob.done&&!ob.failed){
    if(ob.type==='DESTROY_BOMBER'&&e.objT)N8.objComplete(g);
    else if(ob.type==='DEFEAT_COMMANDER'&&e.cmd)N8.objComplete(g)}
  // carrier drop launches its kids into free-flight
  if(e.role==='CARRIER')for(const o of g.enemies)if(o.lead===e)o.broke=true;
});
/* player action -> enemy reaction: powers scare nearby enemies, dashes cause them to fire at old position */
hook(GE.prototype,'usePower',function(o,slot){const g=this,p=g.player,ca=p&&p.energy;o.call(g,slot);if(p&&p.energy<ca)for(const e of g.enemies)if(!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<300&&e.role!=='SHIELD_DRONE')e.scare=50});
hook(GE.prototype,'resetHazard',function(o){});
/* enemy visuals for ally + tele */
N8.addDraw(42,(g,c)=>{const v=g.v8;
  for(const r of v.rocks||[]){const im=N8.env&&N8.env.rockImgs[r.img];if(!im)continue;c.save();c.translate(r.x,r.y);c.rotate(r.rot);const s=r.r*2.6/im.width*1.0;c.globalAlpha=1;c.drawImage(im,-im.width*s/2,-im.height*s/2,im.width*s,im.height*s);c.restore();if(r.hp<r.maxHp){c.fillStyle='rgba(0,0,0,.5)';c.fillRect(r.x-r.r,r.y-r.r-8,r.r*2,3);c.fillStyle='#ffb34a';c.fillRect(r.x-r.r,r.y-r.r-8,r.r*2*(r.hp/r.maxHp),3)}}
  for(const q of v.cores||[]){c.globalCompositeOperation='lighter';blitCore(c,q,v.t)}
  const a=v.ally;if(a&&a.hp>0){c.save();c.translate(a.x,a.y);c.rotate(Math.PI);const P0=N8.HULLS[a.type==='CARRIER'?'e_CARRIER':'e_BOMBER'];N8.drawHull(c,P0,{s:a.size/(P0.len*1.75),col:'#66ff99',base:'#2f4a3c',thrust:.6,hf:.5+.5*a.hp/a.maxHp,t:v.t});c.restore();
    c.save();c.translate(a.x,a.y);c.globalCompositeOperation='lighter';c.strokeStyle='rgba(102,255,153,.5)';c.lineWidth=1.4;c.setLineDash([5,5]);c.lineDashOffset=-v.t*.3;c.beginPath();c.arc(0,0,a.size*.95,0,7);c.stroke();c.setLineDash([]);c.globalCompositeOperation='source-over';c.fillStyle='rgba(0,0,0,.55)';c.fillRect(-a.size*.6,-a.size*.9,a.size*1.2,4);c.fillStyle='#66ff99';c.fillRect(-a.size*.6,-a.size*.9,a.size*1.2*Math.max(0,a.hp/a.maxHp),4);c.fillStyle='#66ff99';c.font='700 9px Orbitron,sans-serif';c.textAlign='center';c.fillText(a.type==='CARRIER'?'ALLY CARRIER':'TRANSPORT',0,-a.size-2);c.restore()}
  c.globalCompositeOperation='lighter';for(const t of v.tele||[]){if(t.t<=0)continue;c.globalAlpha=.25+.5*(1-t.t/46);c.strokeStyle='#c07dff';c.lineWidth=1.2;c.setLineDash([6,5]);c.beginPath();c.moveTo(t.x0,t.y0);c.lineTo(t.x1,t.y1);c.stroke();c.setLineDash([]);c.globalAlpha=.6;c.beginPath();c.arc(t.x1,t.y1,10+t.t*.4,0,7);c.stroke()}
  c.globalCompositeOperation='source-over';c.globalAlpha=1});
function blitCore(c,q,t){const r=13+Math.sin(t*.15)*2;c.globalAlpha=.9;const gr=c.createRadialGradient(q.x,q.y,0,q.x,q.y,r*2);gr.addColorStop(0,'#fff');gr.addColorStop(.35,'#ffcc00');gr.addColorStop(1,'rgba(255,180,0,0)');c.fillStyle=gr;c.beginPath();c.arc(q.x,q.y,r*2,0,7);c.fill();c.globalAlpha=1;c.strokeStyle='#ffe680';c.lineWidth=1.6;c.beginPath();c.moveTo(q.x,q.y-r);c.lineTo(q.x+r,q.y);c.lineTo(q.x,q.y+r);c.lineTo(q.x-r,q.y);c.closePath();c.stroke()}
N8.resetFns.push(g=>{const v=g.v8;v.groups={};v.rocks=[];v.cores=[];v.tele=[];v.ally=null;v.obj=null;v.gensAlive=0});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v8-enemies.js');
