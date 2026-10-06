'use strict';
/* NEBULA PROTOCOL v15 // COMMAND MATRIX — combat core.
   Extends the single GE loop through the N8 API (hook / post / resetFns / N8.W / N8.P / N8.CLASSES). No second engine.
   Owns: ship archetypes + ultimates, combo tiers, damage types / weak points, new weapons + secondaries, new powers,
   enemy spawn tuning, boss extras, recharge, and the (session-only) God Mode rules.
   Rendering lives in v15-fx.js, HUD / controls / panels in v15-ui.js. */
(()=>{
const N8=window.N8,GE=window.GameEngine;if(!N8||!GE||!N8.hook)return;
const {hook,clamp,rnd}=N8,A8=N8.audio,V=N8.v15={ver:'v15.1'};
const PLAYING=g=>g&&g.state===GAME.PLAYING;
const say=(g,t,c)=>{try{if(N8.v15UI&&N8.v15UI.banner)N8.v15UI.banner(t,c);else g.toast(t)}catch{}};

/* ---------- God Mode session state (never persisted; see save guard below) ---------- */
const GOD=V.god={on:false,session:false,blocked:0,dmg:2,spd:1.5,t:{hp:false,shield:false,energy:false,ammo:false,cd:false,rapid:false,inv:false,ohk:false,freeze:false,slow:false,ult:false}};
const SetItem=Storage.prototype.setItem;
Storage.prototype.setItem=function(k,val){ // while a God Mode session is active no progression key is written, so normal saves can't be corrupted
  if(GOD.session&&/^nebula/.test(k)&&!/^nebula15_/.test(k)){GOD.blocked++;return}
  return SetItem.apply(this,arguments)};
const godOn=k=>GOD.on&&GOD.t[k];

/* ---------- sound presets (pooled through A8.voice: polyphony-capped, routed to the SFX/UI mixer channels) ---------- */
const SFXP={
 BURST:{f:900,f2:420,d:.07,type:'square',v:.16,cat:'volumeWeapons'},ARC:{f:1400,f2:300,d:.14,type:'sawtooth',v:.16,lp:5000,cat:'volumeWeapons'},EMPCAN:{f:200,f2:60,d:.35,type:'sine',v:.3,cat:'volumeWeapons'},
 CHARGE:{f:160,f2:900,d:.28,type:'sawtooth',v:.26,lp:3000,cat:'volumeWeapons'},EMP:{f:120,f2:40,d:.6,type:'sine',v:.34,n:0,cat:'volumeExplosions'},
 COMBO:{f:520,f2:1200,d:.22,type:'triangle',v:.22,cat:'volumeUI'},DENY:{f:140,f2:90,d:.12,type:'square',v:.14,cat:'volumeUI'},ULT_READY:{f:440,f2:1320,d:.5,type:'triangle',v:.28,cat:'volumeUI'},
 SURGE:{f:300,f2:900,d:.5,type:'sine',v:.26,cat:'volumeUI'},TIMESLOW:{f:900,f2:90,d:1.1,type:'sine',v:.3,cat:'volumeUI'},DASHP:{f:200,f2:1100,d:.18,type:'sawtooth',v:.2,lp:4000,cat:'volumeUI'},
 RECHARGE:{f:400,f2:1000,d:.3,type:'triangle',v:.2,cat:'volumeUI'},BOSS_RAGE:{f:90,f2:40,d:.9,type:'sawtooth',v:.4,cat:'volumeExplosions'},VICTORY:{f:392,f2:1568,d:.9,type:'triangle',v:.3,cat:'volumeUI'},
 ULT_NOVA:{f:70,f2:22,d:1.2,type:'sawtooth',v:.5,lp:900,cat:'volumeExplosions'},ULT_STORM:{f:300,f2:80,d:.9,type:'sawtooth',v:.32,cat:'volumeWeapons'},ULT_BEAM:{f:110,f2:880,d:1.0,type:'sawtooth',v:.4,lp:2500,cat:'volumeWeapons'},
 ULT_BASTION:{f:220,f2:70,d:.8,type:'triangle',v:.36,cat:'volumeExplosions'},ULT_VOID:{f:60,f2:260,d:1.2,type:'sine',v:.45,cat:'volumeExplosions'},
 DEFEAT:{f:300,f2:40,d:1.4,type:'sawtooth',v:.34,lp:1200,cat:'volumeUI'},UIBTN:{f:700,f2:520,d:.05,type:'square',v:.1,cat:'volumeUI'}};
N8.sfx=(k,x,y)=>{const pr=SFXP[k];if(pr){const prev=A8._v9Category;A8._v9Category=pr.cat;try{A8.voice(Object.assign({x,y},pr))}finally{A8._v9Category=prev}return}
  try{A8.play(k,x,y)}catch{}};

/* ---------- per-run state ---------- */
const fresh=()=>({ult:0,ultMax:100,ultReady:false,ultKind:'',streak:0,tier:0,best:0,boost:0,tb:0,beam:null,chg:0,chgSeen:0,burstN:0,burstT:0,rchg:0,tick:0,lastSh:0,ripples:[],kinds:{}});
N8.resetFns.push(g=>{g.v15=fresh()});
hook(GE.prototype,'bind',function(o){o.call(this);this.v15=fresh()});

/* ===================== SHIPS ===================== */
N8.CLASSES.DESTROYER={hp:1.3,sh:.95,armor:.1,spd:.8,acc:.65,turn:.65,dmg:1.55,en:1.05,rg:.9,ev:0,desc:'Heavy offensive frame. Slow, devastating.'};
N8.HULLS.DESTROYER={len:32,wid:13,span:30,sweep:3,tip:13,noz:[-9,-3,3,9],mnt:[[22,-6],[22,6],[12,0]]};
N8.HULLS.e_SCOUT={len:16,wid:4,span:15,sweep:12,tip:5,noz:[-2,2],mnt:[]};
N8.HULLS.e_TANK={len:30,wid:19,span:34,sweep:1,tip:18,noz:[-12,-4,4,12],mnt:[]};
N8.HULLS.e_STEALTH={len:25,wid:5,span:22,sweep:22,tip:4,noz:[-2.5,2.5],mnt:[]};
N8.HULLS.e_MINIBOSS={len:40,wid:22,span:40,sweep:3,tip:20,noz:[-14,-6,6,14],mnt:[]};
Object.assign(N8.ABIL,{
  ASSAULT:Object.assign(N8.ABIL.ASSAULT,{n:'OVERDRIVE'}),HEAVY:Object.assign(N8.ABIL.HEAVY,{n:'FORTRESS MODE'}),
  STEALTH:Object.assign(N8.ABIL.STEALTH,{n:'VOID CLOAK'}),
  SUPPORT:Object.assign(N8.ABIL.SUPPORT,{n:'ENERGY SURGE',d:'Surge: +60% energy, +35% shield, repair drones deploy'}),
  DESTROYER:{n:'DEVASTATION',e:45,cd:1500,dur:0,d:'Fires a concentrated energy blast down the lane'}});
const sc0=N8.shipClass;
N8.shipClass=s=>{const k=sc0(s);if(k!=='ASSAULT'||!s)return k;if(s.id==='NOVA')return'DESTROYER';if(s.id==='TITAN')return k;const m=/SHIP_(\d+)/.exec(s.id||'');return m&&(+m[1]%2===1)?'DESTROYER':k};
/* flavour text for the hangar */
V.ARCH={FIGHTER:'Balanced',INTERCEPTOR:'Interceptor',ASSAULT:'Assault',DESTROYER:'Destroyer',HEAVY:'Battleship',STEALTH:'Stealth',SUPPORT:'Support',EXPERIMENTAL:'Experimental'};

hook(GE.prototype,'useAbility',function(o){
  const g=this,p=g.player,v=p&&p.v8,b=v?v.ab.cd:0;o.call(g);
  if(!v||b>0||v.ab.cd<=0)return;const c=p.cls;
  if(c==='DESTROYER'){const dmg=p.damage*N8.dmgMul(g)*(p.powMul||1)*16;
    for(const e of N8.hostiles(g))if(e.y<p.y&&Math.abs(e.x-p.x)<(e.size||30)*.5+60)N8.hurt(g,e,dmg,'#ff5a2d',{x:e.x,y:e.y,type:'energy',noWp:1});
    for(const q of g.bullets)if(q.isEnemy&&Math.abs(q.x-p.x)<70&&q.y<p.y)q.dead=true;
    g.v15.beam={t:26,max:26,w:60,burst:true};N8.shake(g,14);N8.flash(g,.3,'#ff5a2d');N8.sfx('ULT_BEAM')}
  else if(c==='SUPPORT'){p.energy=Math.min(p.maxEnergy,p.energy+p.maxEnergy*.6);p.shield=Math.min(p.maxShield,p.shield+p.maxShield*.35);g.v8.fx.push({t:'ring',x:p.x,y:p.y,r:12,max:170,life:1,c:'#7dffb5'});N8.sfx('SURGE')}
});

/* ===================== ULTIMATES ===================== */
const ULT={FIGHTER:['NOVA APOCALYPSE','#ff9d2e'],INTERCEPTOR:['TIME BREAK','#7dffe8'],ASSAULT:['WARHEAD STORM','#ff7a2e'],DESTROYER:['OMEGA BEAM','#ff5a2d'],HEAVY:['BASTION PROTOCOL','#8fd0ff'],STEALTH:['VOID COLLAPSE','#9d7dff'],SUPPORT:['RESTORATION NOVA','#7dffb5'],EXPERIMENTAL:['SINGULARITY CORE','#e0a0ff']};
V.ULT=ULT;
const addUlt=(g,n)=>{const v=g.v15;if(!v||!PLAYING(g)||n<=0)return;v.ult=Math.min(v.ultMax,v.ult+n);if(v.ult>=v.ultMax&&!v.ultReady){v.ultReady=true;say(g,'ULTIMATE READY — PRESS F','#ffcc33');N8.sfx('ULT_READY')}};
V.addUlt=addUlt;
const wipeShots=(g,x,y,r)=>{for(const b of g.bullets)if(b.isEnemy&&Math.hypot(b.x-x,b.y-y)<r)b.dead=true};
GE.prototype.useUltimate=function(){
  const g=this,p=g.player,v=g.v15;if(!PLAYING(g)||!p||!v)return;
  const free=godOn('ult');
  if(v.ult<v.ultMax&&!free){g.toast(`ULTIMATE CHARGING ${Math.floor(v.ult)}%`);N8.sfx('DENY');return}
  const [name,col]=ULT[p.cls]||ULT.FIGHTER;v.ult=0;v.ultReady=false;v.ultKind=name;
  const dmg=p.damage*N8.dmgMul(g)*(p.powMul||1);
  say(g,name,col);N8.flash(g,.35,col);N8.shake(g,16);p.hitInvuln=Math.max(p.hitInvuln,45);v.ripples.push({t:'ult',x:p.x,y:p.y,r:20,max:980,life:1,c:col});
  switch(name){
  case'NOVA APOCALYPSE':N8.aoe(g,p.x,p.y,980,dmg*20,col,{type:'explosive'});wipeShots(g,p.x,p.y,1200);for(let i=0;i<3;i++)g.v8.fx.push({t:'ring',x:p.x,y:p.y,r:10+i*20,max:900-i*120,life:1,c:i%2?'#ffffff':col});N8.boom(g,p.x,p.y,3,col,1.4);N8.sfx('ULT_NOVA');break;
  case'TIME BREAK':v.tb=Math.max(v.tb,480);p.hitInvuln=Math.max(p.hitInvuln,90);N8.sfx('TIMESLOW');break;
  case'WARHEAD STORM':for(let i=0;i<30;i++){const a=(i-14.5)*.1+rnd(-.04,.04),b=new Bullet(p.x+(i-14.5)*3,p.y-10,Math.sin(a)*8,-Math.cos(a)*8,col,false,dmg*2.4,4,.35,3,0);b.missile=true;b.wk='BARRAGE';b.dm8=1;b.splash=64;g.bullets.push(b)}N8.sfx('ULT_STORM');break;
  case'OMEGA BEAM':v.beam={t:210,max:210,w:46};N8.sfx('ULT_BEAM');break;
  case'BASTION PROTOCOL':p.shield=p.maxShield;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.25);p.hitInvuln=Math.max(p.hitInvuln,360);p.v8.fort=Math.max(p.v8.fort,360);p.v8.shieldRim=360;
    for(const e of N8.hostiles(g)){const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;if(d<420&&e!==g.boss){const f=(1-d/420)*34+8;e.kb={vx:dx/d*f,vy:dy/d*f,t:16};N8.hurt(g,e,dmg*6,col,{x:e.x,y:e.y,type:'kinetic'})}}
    wipeShots(g,p.x,p.y,500);N8.sfx('ULT_BASTION');break;
  case'VOID COLLAPSE':{const hs=N8.hostiles(g).filter(e=>e!==g.boss);let cx=p.x,cy=Math.max(150,p.y-320);if(hs.length){cx=hs.reduce((a,e)=>a+e.x,0)/hs.length;cy=Math.max(130,hs.reduce((a,e)=>a+e.y,0)/hs.length)}N8.spawnSingularity(g,cx,cy,2.4);N8.sfx('ULT_VOID');break}
  case'RESTORATION NOVA':p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.5);p.shield=p.maxShield;p.energy=p.maxEnergy;N8.aoe(g,p.x,p.y,520,dmg*9,col,{type:'energy'});wipeShots(g,p.x,p.y,560);g.v8.fx.push({t:'ring',x:p.x,y:p.y,r:12,max:520,life:1,c:col});N8.sfx('SURGE');break;
  case'SINGULARITY CORE':N8.spawnSingularity(g,p.x,Math.max(130,p.y-320),3.2);N8.spawnSingularity(g,clamp(p.x-220,60,g.canvas.width-60),Math.max(130,p.y-200),1.5);N8.spawnSingularity(g,clamp(p.x+220,60,g.canvas.width-60),Math.max(130,p.y-200),1.5);N8.sfx('ULT_VOID');break;
  }
};
/* charge sources: damage, kills (below), combo tiers, waves, objectives, boss */
const nw0=GE.prototype.nextWave;hook(GE.prototype,'nextWave',function(o){const w=this.wave;o.call(this);if(this.wave>w)addUlt(this,8)});
const oc0=N8.objComplete;N8.objComplete=function(g){const ob=g.v8&&g.v8.obj,was=ob&&ob.done;const r=oc0.apply(this,arguments);if(ob&&ob.done&&!was)addUlt(g,12);return r};

/* ===================== COMBO + DAMAGE ===================== */
const TIERS=[2,5,10,20,50],TMULT=[1,1.15,1.35,1.7,2.2,3];
V.TIERS=TIERS;V.TMULT=TMULT;
hook(GE.prototype,'killEnemy',function(o,e){
  if(!e||e.dead)return o.call(this,e);
  const g=this,v=g.v15;o.call(g,e);if(!e.dead||!v)return;
  v.streak++;v.best=Math.max(v.best,v.streak);g.comboTimer=Math.max(g.comboTimer||0,150);
  let t=0;for(let i=0;i<TIERS.length;i++)if(v.streak>=TIERS[i])t=i+1;
  g.score+=Math.round((e.type==='ELITE'?450:140)*(TMULT[v.tier]-1));
  addUlt(g,e.role==='MINIBOSS'?15:e.type==='ELITE'?4:2.2);
  if(t>v.tier){v.tier=t;const p=g.player;v.boost=Math.max(v.boost,300+t*60);
    if(p){p.energy=Math.min(p.maxEnergy,p.energy+p.maxEnergy*.05*t)}addUlt(g,3*t);
    g.addText(e.x,e.y-40,`COMBO x${TIERS[t-1]}`,'#fff36b',1.4);say(g,`COMBO x${TIERS[t-1]}  ·  SCORE x${TMULT[t].toFixed(2)}`,'#fff36b');N8.sfx('COMBO');
    if(t>=3&&N8.dropLoot&&Math.random()<.35+t*.08)N8.dropLoot(g,e.x,e.y,t*.12)}
  if(e.role==='MINIBOSS'){if(N8.dropLoot){N8.dropLoot(g,e.x,e.y,.6);N8.dropLoot(g,e.x+30,e.y,.3)}g.coins+=150;say(g,'MINI-BOSS DESTROYED','#ffcc33')}
});
const dm0=N8.dmgMul;N8.dmgMul=g=>{let m=dm0(g);const v=g.v15;if(v)m*=1+v.tier*.035+(v.boost>0?.12:0);if(GOD.on)m*=GOD.dmg;return m};
/* damage types: kinetic / energy / plasma / explosive / emp / gravity / chain */
const CT={'#8affff':'kinetic','#ffb02e':'kinetic','#ffe14a':'kinetic','#7dff42':'plasma','#6fb8ff':'emp','#ff6bd6':'energy','#38d9ff':'energy','#c9a0ff':'energy','#b56cff':'gravity','#ff7a2e':'explosive','#ff9d2e':'explosive','#ff5a2d':'energy'};
const MOD={TANK:{kinetic:.55,energy:.85,plasma:1.15,explosive:1.25,gravity:1.3},BOMBER:{kinetic:1.15,explosive:.6,plasma:.9},SWARM:{explosive:1.6,chain:1.5,kinetic:.85},SHIELD_DRONE:{emp:2.2,energy:.85},
  STEALTH:{energy:1.15,emp:1.6},SNIPER:{kinetic:1.15},ASSASSIN:{emp:1.5,chain:1.2},MINIBOSS:{kinetic:.9,gravity:.8},HUNTER:{plasma:1.15},CARRIER:{explosive:1.2,kinetic:.8},ELITE:{emp:.8,energy:1.05},INTERCEPTOR:{plasma:1.2},SCOUT:{chain:1.3}};
const WPM={TANK:1.8,STEALTH:1.5,MINIBOSS:1.4,SNIPER:1.5,CARRIER:1.3,BOMBER:1.3};
V.MOD=MOD;
const hu0=N8.hurt;
N8.hurt=function(g,e,d,col,o){
  o=o||{};if(!e||e.dead||d<=0)return hu0(g,e,d,col,o);
  const isB=e===g.boss,ty=o.type||(o.aoe?'explosive':CT[(col||'').toLowerCase()])||'energy';
  if(!isB){const m=(MOD[e.role]||0)[ty];if(m)d*=m}
  if(ty==='emp'){o.shieldMul=Math.max(o.shieldMul||1,4);if(!isB&&!o.stun)o.stun=60}
  if(ty==='chain')o.shieldMul=Math.max(o.shieldMul||1,1.5);
  if(!isB&&!o.aoe&&!o.noWp&&o.y!==undefined&&o.y<e.y-e.size*.15&&(WPM[e.role])){d*=WPM[e.role];if(!(e.wpT>0)){e.wpT=24;g.addText(e.x,e.y-e.size*.7,'WEAK POINT','#ff6680',.85)}}
  if(e.wpT>0)e.wpT--;
  if(GOD.on&&GOD.t.ohk)d=isB?Math.max(d,e.maxHp*.2):9e9;
  const dealt=hu0(g,e,d,col,o);
  if(dealt>0&&g.v15)addUlt(g,clamp(.6*dealt/(e.maxHp||200),0,1.2)*(isB?.4:1));
  return dealt};
/* chain / EMP riders on bullet hits */
const hitList=(g,from,r,hit)=>{let t=null,b=r;for(const e of N8.hostiles(g)){if(hit.has(e)||e===from)continue;const d=Math.hypot(e.x-from.x,e.y-from.y);if(d<b){b=d;t=e}}return t};
const chainArc=(g,e,dmg,n)=>{const hit=new Set([e]),pts=[[e.x,e.y]];let cur=e;for(let i=0;i<n;i++){const t=hitList(g,cur,240,hit);if(!t)break;hit.add(t);pts.push([t.x,t.y]);N8.hurt(g,t,dmg,'#8affff',{x:t.x,y:t.y,type:'chain',stun:12});cur=t}if(pts.length>1)(g.bolts=g.bolts||[]).push({pts,life:12})};
const empBurst=(g,x,y,r,dmg)=>{
  for(const e of N8.hostiles(g)){const d=Math.hypot(e.x-x,e.y-y);if(d<r+(e.size||30)*.4){N8.hurt(g,e,dmg,'#6fb8ff',{x:e.x,y:e.y,type:'emp'});if(e===g.boss){e.stunT=Math.max(e.stunT||0,30)}else{e.stun=Math.max(e.stun||0,150);e.sh=(e.sh||0)*.15}}}
  wipeShots(g,x,y,r);g.v8.fx.push({t:'ring',x,y,r:10,max:r,life:1,c:'#6fb8ff'});g.v8.fx.push({t:'ring',x,y,r:5,max:r*.7,life:1,c:'#ffffff'});N8.shake(g,6);N8.sfx('EMP',x,y)};
V.empBurst=empBurst;
const oh0=N8.onHit;N8.onHit=function(g,b,e,d,crit){
  if(oh0)oh0.apply(this,arguments);
  if(!b||!b.v15)return;
  if(b.chain>0)chainArc(g,e,d*.7,b.chain);
  if(b.emp)empBurst(g,b.x,b.y,170,d*.4)};
const imp0=N8.impact;N8.impact=function(g,b,p){
  if(imp0)imp0.apply(this,arguments);if(!b||!b.v15)return;
  if(b.v15==='CLUSTER')cluster(g,b);else if(b.v15==='PBOMB')pbomb(g,b);else if(b.v15==='EMPM')empBurst(g,b.x,b.y,230,b.damage*.4)};
const cluster=(g,b)=>{for(let i=0;i<6;i++){const a=i*1.0472+rnd(-.2,.2),c=new Bullet(b.x,b.y,Math.cos(a)*4.2,Math.sin(a)*4.2-1.2,'#ff9d2e',false,b.damage*.5,3.5,.3,3,0);c.missile=true;c.wk='MISSILE';c.dm8=1;c.splash=44;c.v15sub=1;g.bullets.push(c)}N8.boom(g,b.x,b.y,1,'#ff9d2e',.8)};
const pbomb=(g,b)=>{N8.aoe(g,b.x,b.y,190,b.damage*1.2,'#7dff42',{type:'plasma'});(g.v8.storms=g.v8.storms||[]).push({x:b.x,y:b.y,life:140,r:110});N8.boom(g,b.x,b.y,2,'#7dff42',.9);N8.shake(g,6);N8.sfx('BOOM_L',b.x,b.y)};

/* ===================== WEAPONS ===================== */
const tag=(k,cat,tags)=>{const w=N8.W.find(x=>x.k===k);if(w){w.cat=cat;w.tags=tags}};
tag('PULSE','PRIMARY',['rapid']);tag('SCATTER','PRIMARY',['spread']);tag('RAILGUN','PRIMARY',['pierce','kinetic']);tag('PLASMA','PRIMARY',['explosive','pierce']);tag('LASER','SPECIAL',['beam']);
tag('NOVA','SPECIAL',['aoe','explosive']);tag('GRAVITY','SPECIAL',['gravity','aoe']);tag('ION','PRIMARY',['emp','shield-shred']);tag('PARTICLE','PRIMARY',['rapid']);tag('BARRAGE','SECONDARY',['homing','explosive']);tag('ANTIMATTER','SPECIAL',['aoe','pierce']);
N8.W.push(
 {k:'BURST',n:'BURST CANNON',c:'#ffe14a',lvl:2,en:3,heat:12,dmg:'3 x 0.9x',rate:'BURST',rng:'LONG',fx:'Three-round burst of kinetic slugs. Tight and accurate.',mz:9,cat:'PRIMARY',tags:['burst','kinetic']},
 {k:'ARC',n:'ARC CASTER',c:'#8affff',lvl:3,en:4,heat:7,dmg:'0.8x chain x3',rate:'MED',rng:'MED',fx:'Chain lightning arcs through up to 3 more hostiles. Great vs swarms.',mz:9,cat:'SPECIAL',tags:['chain']},
 {k:'CHARGE',n:'CHARGE CANNON',c:'#ff8cf0',lvl:4,en:12,heat:20,dmg:'2x-9x charged',rate:'CHARGE',rng:'EXTREME',fx:'Hold to charge, release for a piercing blast. Full charge pierces everything.',mz:14,cat:'PRIMARY',tags:['charged','pierce']},
 {k:'EMPCAN',n:'EMP PULSE CANNON',c:'#6fb8ff',lvl:5,en:14,heat:14,dmg:'0.5x, shields x4',rate:'SLOW',rng:'MED',fx:'Detonates an EMP: strips shields, stuns, erases hostile shots in the blast.',mz:12,cat:'SPECIAL',tags:['emp','aoe']});
N8.WK=N8.W.map(w=>w.k);
const NEWW=new Set(['BURST','ARC','CHARGE','EMPCAN']);
hook(GE.prototype,'fire',function(o){
  const g=this,p=g.player,m=g.wmode|0,W=N8.W[m];
  if(!p||!W||!NEWW.has(W.k))return o.call(g);
  const v=g.v15;if(p.fireCooldown>0||!v)return;
  if(g.overheat){if(!(g.ohMsg>0)){g.toast('WEAPON OVERHEATED');g.ohMsg=90}return}
  if(g.bullets.length>300)return;
  const dm=N8.dmgMul(g),rm=N8.rateMul?N8.rateMul(g):1,inf=godOn('ammo');
  const mk=(x,y,vx,vy,dmg,r,pierce,style,wk)=>{const b=new Bullet(x,y,vx,vy,W.c,false,dmg*dm,r,0,style,pierce);b.wk=wk;b.v15=wk;b.dm8=1;g.bullets.push(b);return b};
  const pay=n=>{if(inf)return true;if(p.energy<n){if(!(g.v8.noEn>0)){g.toast('INSUFFICIENT ENERGY');g.v8.noEn=50}return false}p.energy-=n;return true};
  let fired=false;
  switch(W.k){
  case'BURST':if(v.burstN<=0&&pay(W.en)){v.burstN=3;v.burstT=0;p.fireCooldown=Math.max(14,p.fireRate*2.6);g.heat+=W.heat;fired=true}break;
  case'ARC':if(pay(W.en)){p.fireCooldown=Math.max(7,p.fireRate*1.4);mk(p.x,p.y-24,0,-16,p.damage*.8,4,0,12,'ARC').chain=3;g.heat+=W.heat;fired=true}break;
  case'EMPCAN':if(pay(W.en)){p.fireCooldown=55;mk(p.x,p.y-24,0,-9,p.damage*.5,8,0,7,'EMPCAN').emp=1;g.heat+=W.heat;fired=true}break;
  case'CHARGE':v.chg=Math.min(60,v.chg+1);v.chgSeen=3;return}
  if(!fired)return;
  if(rm!==1&&p.fireCooldown>0)p.fireCooldown=Math.max(1,p.fireCooldown/rm);
  g.v8.recoil=Math.max(g.v8.recoil,1.6);g.v8.fx.push({t:'muz',x:p.x,y:p.y-26,r:W.mz,c:W.c,life:1});p.v8.flare=Math.max(p.v8.flare,2);N8.sfx(W.k,p.x,p.y)});
/* burst scheduling, charge release, homing for the new missiles, fuses */
const releaseCharge=g=>{const p=g.player,v=g.v15,f=v.chg/60;v.chg=0;if(!p||f<.18)return;
  if(!godOn('ammo')){const c=12*f;if(p.energy<c){g.toast('INSUFFICIENT ENERGY');return}p.energy-=c}
  const W=N8.W.find(w=>w.k==='CHARGE'),b=new Bullet(p.x,p.y-26,0,-14-f*4,W.c,false,p.damage*(2+7*f)*N8.dmgMul(g),5+9*f,0,5,f>=.98?99:Math.round(1+f*4));
  b.wk='CHARGE';b.v15='CHARGE';b.dm8=1;g.bullets.push(b);g.heat+=W.heat*f;g.v8.recoil=Math.max(g.v8.recoil,1+f*5);N8.shake(g,2+f*8);g.v8.fx.push({t:'muz',x:p.x,y:p.y-26,r:10+f*26,c:W.c,life:1});N8.sfx('CHARGE',p.x,p.y)};
const steer=(g,b,k)=>{let t=g.lock&&g.lock.e&&!g.lock.e.dead?g.lock.e:null,bd=520;if(!t)for(const e of N8.hostiles(g)){const d=Math.hypot(e.x-b.x,e.y-b.y);if(d<bd){bd=d;t=e}}
  if(!t)return;const dx=t.x-b.x,dy=t.y-b.y,d=Math.hypot(dx,dy)||1,s=Math.hypot(b.vx,b.vy)||5;b.vx+=dx/d*k;b.vy+=dy/d*k;const n=Math.hypot(b.vx,b.vy)||1;b.vx=b.vx/n*s;b.vy=b.vy/n*s};

/* ----- secondary (RMB) missile types ----- */
const NM={CLUSTER:{n:'CLUSTER MISSILE',e:20,cd:130,d:'Splits into 6 bomblets on impact',dmg:'1 x 3x + 6 x 1.5x',lvl:5},PBOMB:{n:'PLASMA BOMB',e:26,cd:170,d:'Slow bomb: large burning plasma blast',dmg:'1 x 6x AoE + burn',lvl:8},EMPM:{n:'EMP MISSILE',e:22,cd:150,d:'Detonates in an EMP: stuns and strips shields',dmg:'0.4x + stun',lvl:6}};
for(const k in NM){N8.MISSILES[k]=NM[k];N8.MISSILE_LVL[k]=NM[k].lvl}
hook(GE.prototype,'fireMissiles',function(o){
  const g=this,p=g.player,ty=N8.loadout&&N8.loadout.missile,T=NM[ty];
  if(!T)return o.call(g);if(!PLAYING(g)||!p||g.missileCd>0)return;
  if(!godOn('ammo')&&p.energy<T.e){if(!(g.v8.noEn>0)){g.toast('INSUFFICIENT ENERGY');g.v8.noEn=50}return}
  if(!godOn('ammo'))p.energy-=T.e;g.missileCd=Math.round(T.cd*(p.cdMul||1)*(p.v8.focus>0?.3:1));g.v8.missMax=Math.max(1,g.missileCd);
  const dm=N8.dmgMul(g)*(p.missileMul||1),mk=(x,y,vx,vy,d,r,col,wk)=>{const b=new Bullet(x,y,vx,vy,col,false,d*dm,r,0,3,0);b.missile=true;b.wk='MISSILE';b.v15=wk;b.dm8=1;g.bullets.push(b);return b};
  if(ty==='CLUSTER'){mk(p.x,p.y-12,0,-6,p.damage*3,6,'#ff9d2e','CLUSTER').splash=50;mk(p.x-12,p.y-8,-1.4,-5.5,p.damage*1.5,4,'#ff9d2e','CLUSTER').splash=30}
  else if(ty==='PBOMB'){const b=mk(p.x,p.y-12,0,-3.2,p.damage*6,9,'#7dff42','PBOMB');b.fuse=70}
  else{const b=mk(p.x,p.y-12,0,-5,p.damage*.4,6,'#6fb8ff','EMPM');b.fuse=48}
  g.v8.recoil=Math.max(g.v8.recoil,1.5);g.v8.fx.push({t:'muz',x:p.x,y:p.y-10,r:12,c:'#ff7a2e',life:1});N8.sfx('MISSILE',p.x,p.y)});

/* ===================== POWERS ===================== */
N8.P.push(
 {n:'PHASE DASH',e:25,cd:420,lvl:2,c:'#6f8bff',d:'Blink 280px; invulnerable in transit and damages hostiles on the path.'},
 {n:'EMP',e:35,cd:1100,lvl:4,c:'#6fb8ff',d:'Shockwave: stuns hostiles, strips shields, erases hostile shots.'},
 {n:'TIME SLOW',e:40,cd:1500,lvl:6,c:'#7dffe8',d:'5s: hostiles and their shots move at a third of normal speed.'},
 {n:'ENERGY SURGE',e:15,cd:1400,lvl:3,c:'#7dffb5',d:'Restores 70% energy and 40% shield; cooldowns recover faster for 4s.'});
hook(GE.prototype,'usePower',function(o,slot){
  const g=this,p=g.player,v=g.v8,idx=N8.loadout&&N8.loadout.powers[slot];
  const before=v&&v.pcd&&idx!==undefined?v.pcd[idx]:1;o.call(g,slot);
  if(!p||!v||!v.pcd||idx===undefined||before>0||!(v.pcd[idx]>0))return;
  const P=N8.P[idx];if(!P)return;
  if(P.n==='PHASE DASH'){const k=g.keys;let dx=0,dy=0;if(k.ArrowLeft||k.a)dx--;if(k.ArrowRight||k.d)dx++;if(k.ArrowUp||k.w)dy--;if(k.ArrowDown||k.s)dy++;
    if(!dx&&!dy){if(g.mouse.active&&!g.touch){dx=g.mouse.x-p.x;dy=g.mouse.y-p.y}else dy=-1}const m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;
    const x0=p.x,y0=p.y,x1=clamp(p.x+dx*280,30,g.canvas.width-30),y1=clamp(p.y+dy*280,45,g.canvas.height-50),dmg=p.damage*N8.dmgMul(g)*3;
    for(let i=0;i<7;i++)p.v8.ghosts.push({x:x0+(x1-x0)*i/7,y:y0+(y1-y0)*i/7,life:.9-i*.1,b:p.v8.bank});
    for(const e of N8.hostiles(g))if(N8.segDist(e.x,e.y,x0,y0,x1,y1)<(e.size||30)*.7+22)N8.hurt(g,e,dmg,'#6f8bff',{x:e.x,y:e.y,type:'kinetic'});
    p.x=x1;p.y=y1;p.hitInvuln=Math.max(p.hitInvuln,40);g.v8.warp=1;N8.flash(g,.12,'#6f8bff');p.v8.trail.length=0;N8.sfx('DASHP')}
  else if(P.n==='EMP')empBurst(g,p.x,p.y,380,p.damage*N8.dmgMul(g)*1.5);
  else if(P.n==='TIME SLOW'){g.v15.tb=Math.max(g.v15.tb,300);N8.flash(g,.1,'#7dffe8');N8.sfx('TIMESLOW')}
  else if(P.n==='ENERGY SURGE'){p.energy=Math.min(p.maxEnergy,p.energy+p.maxEnergy*.7);p.shield=Math.min(p.maxShield,p.shield+p.maxShield*.4);p.v8.cdrBuff=Math.max(p.v8.cdrBuff||0,240);v.fx.push({t:'ring',x:p.x,y:p.y,r:12,max:190,life:1,c:'#7dffb5'});N8.flash(g,.08,'#7dffb5');N8.sfx('SURGE')}
});

/* ===================== RECHARGE (R) — extends v6's energy recharge (kept) with heat vent + missile refresh; key handled by v6 ===================== */
hook(GE.prototype,'recharge',function(o){
  const g=this,p=g.player,b=g.rechargeCd||0;o.call(g);
  if(!PLAYING(g)||!p||!((g.rechargeCd||0)>b))return;
  g.heat=Math.max(0,g.heat-70);g.overheat=false;g.missileCd=0;
  g.v8.fx.push({t:'ring',x:p.x,y:p.y,r:10,max:120,life:1,c:'#38d9ff'});g.addText(p.x,p.y-52,'SYSTEMS RECHARGED','#38d9ff',1);N8.sfx('RECHARGE')});

/* ===================== ENEMIES ===================== */
for(const s of N8.SECTORS){s.comp.SCOUT=(s.comp.SCOUT||0)+2;s.comp.TANK=(s.comp.TANK||0)+1;s.comp.STEALTH=(s.comp.STEALTH||0)+1}
hook(GE.prototype,'spawnWave',function(o){
  const g=this;o.call(g);
  if(g.state!==GAME.PLAYING||g.boss||g.gameMode==='BOSS_RUSH'||g.level%5===0||g.level<12)return;
  if(g.wave===g.wavesPerLevel&&Math.random()<.5){const e=new Enemy(g.canvas.width/2,-130,g.level,'STANDARD','MINIBOSS');g.enemies.push(e);say(g,'MINI-BOSS INBOUND','#ff5a2d')}});
/* time-break / time-slow / enemy-freeze: skip enemy + boss updates on a pattern; hostile shots are slowed after the main update */
const slowGate=g=>{const v=g.v15;if(godOn('freeze'))return 2;if(v&&v.tb>0&&(v.tick%3))return 1;return 0};
hook(GE.prototype,'updateEnemies',function(o){const s=slowGate(this);if(s){if(s===1)this.handleEnemyCollisions();else this.enemies=this.enemies.filter(e=>!e.dead);return}return o.call(this)});
hook(GE.prototype,'updateBoss',function(o,...a){const s=slowGate(this);if(s)return;return o.apply(this,a)});
hook(GE.prototype,'applyDamage',function(o,amt,...r){if(GOD.on&&(GOD.t.inv||GOD.t.hp&&GOD.t.shield))return;return o.call(this,amt,...r)});

/* ===================== BOSSES ===================== */
const ib0=N8.initBoss;N8.initBoss=function(g,b){const r=ib0.apply(this,arguments);say(g,'WARNING — HOSTILE COMMANDER APPROACHING','#ff3355');N8.sfx('WARN');return r};
const bd0=N8.onBossDefeat;N8.onBossDefeat=function(g,b){if(bd0)bd0.apply(this,arguments);const v=g.v15;if(v){v.ult=v.ultMax;v.ultReady=true}g.coins+=120+Math.round(g.level*5);
  if(N8.dropLoot){N8.dropLoot(g,b.x,b.y,.8);N8.dropLoot(g,b.x-40,b.y,.5);N8.dropLoot(g,b.x+40,b.y,.5)}say(g,'COMMANDER DESTROYED — ULTIMATE CHARGED','#00ff9d');N8.sfx('VICTORY')};

/* ===================== PER-FRAME STEP (N8.post → runs inside the single GE update) ===================== */
let warned=false;
const step=g=>{
  const p=g.player,v=g.v15;if(!p||!v||g.state!==GAME.PLAYING)return;v.tick++;
  if(v.boost>0)v.boost--;if(v.rchg>0)v.rchg--;
  if(g.comboTimer<=0&&v.streak>0){v.streak=0;v.tier=0}
  /* burst fire */
  if(v.burstN>0){if(--v.burstT<=0){v.burstT=3;v.burstN--;const W=N8.W.find(w=>w.k==='BURST'),b=new Bullet(p.x+rnd(-3,3),p.y-24,rnd(-.25,.25),-17,W.c,false,p.damage*.9*N8.dmgMul(g),3.4,0,1,p.pierce||0);b.wk='BURST';b.v15='BURST';b.dm8=1;g.bullets.push(b);g.v8.fx.push({t:'muz',x:p.x,y:p.y-26,r:7,c:W.c,life:1});N8.sfx('BURST',p.x,p.y)}}
  /* charge cannon release */
  if(v.chg>0){if(v.chgSeen>0)v.chgSeen--;else releaseCharge(g)}
  /* missile steering + fuses */
  for(const b of g.bullets){if(!b.v15||b.isEnemy||b.dead)continue;
    if(b.v15==='CLUSTER'||b.v15sub)steer(g,b,.28);
    if(b.fuse!==undefined&&--b.fuse<=0){b.dead=true;if(b.v15==='PBOMB')pbomb(g,b);else if(b.v15==='EMPM')empBurst(g,b.x,b.y,230,b.damage*.4)}
    if(b.v15==='CLUSTER'&&!b.v15sub&&b.age>26){for(const e of N8.hostiles(g))if(Math.hypot(e.x-b.x,e.y-b.y)<110){b.dead=true;cluster(g,b);break}}}
  /* time slow: hostile shots at ~35% speed */
  if(v.tb>0){v.tb--;for(const b of g.bullets)if(b.isEnemy&&!b.dead){b.x-=b.vx*.65;b.y-=b.vy*.65}}
  if(godOn('freeze'))for(const b of g.bullets)if(b.isEnemy&&!b.dead){b.x-=b.vx;b.y-=b.vy}
  /* omega beam / devastation column */
  const bm=v.beam;if(bm){bm.t--;if(bm.t<=0)v.beam=null;else if(bm.t%3===0){const dmg=p.damage*N8.dmgMul(g)*(p.powMul||1)*(bm.burst?0:2.6);
      if(!bm.burst){for(const e of N8.hostiles(g))if(e.y<p.y&&Math.abs(e.x-p.x)<(e.size||30)*.5+bm.w)N8.hurt(g,e,dmg,'#ffffff',{x:e.x,y:e.y,type:'energy',noWp:1});
        for(const q of g.bullets)if(q.isEnemy&&Math.abs(q.x-p.x)<bm.w+10&&q.y<p.y)q.dead=true}
      if(bm.t%9===0)N8.shake(g,bm.burst?3:5)}}
  /* shield-hit ripple */
  if(p.shield<v.lastSh-.5&&v.ripples.length<6)v.ripples.push({t:'sh',x:p.x,y:p.y,r:p.width*.8,max:p.width*1.5,life:1,c:'#7fe8ff'});v.lastSh=p.shield;
  /* boss enrage */
  const b=g.boss;if(b&&b.i8&&b.ph>=3&&!b.v15enr){b.v15enr=true;b.speedF=(b.speedF||1)*1.2;say(g,'COMMANDER ENRAGED','#ff3355');N8.sfx('BOSS_RAGE')}
  /* ---- God Mode (only while the master toggle is on) ---- */
  if(GOD.on){const t=GOD.t;
    if(t.hp)p.hp=p.maxHp;if(t.shield)p.shield=p.maxShield;if(t.energy||t.ammo)p.energy=p.maxEnergy;
    if(t.cd){const pc=g.v8.pcd;if(pc)pc.fill(0);p.v8.ab.cd=0;p.dashCooldown=0;g.missileCd=0}
    if(t.ammo){g.heat=0;g.overheat=false}
    if(t.rapid&&p.fireCooldown>1)p.fireCooldown=1;
    if(t.inv)p.hitInvuln=Math.max(p.hitInvuln,5);
    if(t.slow)g.v8.slow=Math.max(g.v8.slow,3);
    if(t.ult){v.ult=v.ultMax;v.ultReady=true}
    if(!p.sp0)p.sp0=p.speed;p.speed=p.sp0*GOD.spd}
  else if(p.sp0){p.speed=p.sp0;p.sp0=0}
};
N8.post.push(g=>{try{step(g)}catch(err){if(!warned){warned=true;console.error('[v15-core]',err)}}});

/* ---------- God Mode actions (called by the panel) ---------- */
V.godSet=(k,val)=>{if(k==='master'){GOD.on=!!val;if(GOD.on)GOD.session=true;return}GOD.t[k]=!!val};
V.godAct=(a)=>{const g=window.gameEngine;if(!GOD.on||!PLAYING(g))return false;GOD.session=true;const W=g.canvas.width;
  if(a==='enemy'||a==='elite'){const roles=['FIGHTER','SCOUT','TANK','STEALTH','INTERCEPTOR','SNIPER','BOMBER','HUNTER'];const role=a==='elite'?'ELITE':roles[Math.floor(Math.random()*roles.length)];g.enemies.push(new Enemy(rnd(80,W-80),-60,g.level,a==='elite'?'ELITE':'STANDARD',role))}
  else if(a==='boss'){if(g.boss)return false;g.bossRushStage=Math.max(1,Math.ceil(g.level/5));g.spawnBossRushBoss();if(g.boss&&N8.initBoss)N8.initBoss(g,g.boss)}
  else if(a==='clear'){for(const e of g.enemies.slice())if(!e.dead)g.killEnemy(e);if(g.boss&&g.boss.hp>0){g.boss.hp=0;g.defeatBoss()}for(const b of g.bullets)if(b.isEnemy)b.dead=true}
  else if(a==='score')g.score+=10000;else if(a==='credits')g.coins+=1000;else return false;return true};
window.NEBULA_BOOT?.module('v15-core');
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v15-core.js');
