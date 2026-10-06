'use strict';
/* NEBULA PROTOCOL v8 — bosses v2: destructible components, 4 phases, arena hazards, cinematics, layered renderer. */
(()=>{
const N8=window.N8,{hook,clamp,rnd}=N8,GE=GameEngine,A8=N8.audio;
const PHASES=['PHASE 1 · ENGAGE','PHASE 2 · ARMED','PHASE 3 · ARENA','FINAL PHASE · OVERLOAD'];
const dmgB=g=>Math.max(8,Math.min(140,8+g.level*.18));

/* component layout (relative to boss size) */
function mkComps(b){
  const m=b.maxHp,s=b.size,C=[];
  const add=(id,type,dx,dy,r,hpf,extra)=>C.push(Object.assign({id,type,dx,dy,r:r*s,maxHp:m*hpf,hp:m*hpf,dead:false,flash:0,x:b.x,y:b.y,cd:60+Math.random()*90,ang:Math.PI/2},extra||{}));
  add('GEN_L','GEN',-.62,-.08,.21,.07);add('GEN_R','GEN',.62,-.08,.21,.07);
  add('MSL','TURRET',-.5,.42,.16,.075,{atk:'MISSILE'});add('PLS','TURRET',.5,.42,.16,.075,{atk:'PLASMA'});add('LAS','TURRET',0,.62,.15,.07,{atk:'LASER'});
  add('ENG_L','ENGINE',-.42,-.68,.15,.08);add('ENG_R','ENGINE',.42,-.68,.15,.08);
  add('ARM_L','ARMOR',-.3,.14,.19,.08);add('ARM_R','ARMOR',.3,.14,.19,.08);
  return C}
const alive=(b,t)=>b.comps.filter(c=>c.type===t&&!c.dead);
const has=(b,id)=>{const c=b.comps.find(c=>c.id===id);return c&&!c.dead};
N8.bossShieldUp=b=>alive(b,'GEN').length>0;

N8.initBoss=(g,b)=>{
  b.i8=1;const v=g.v8,sec=N8.sectorOf(g.level);
  b.comps=mkComps(b);b.ph=0;b.intro=150;b.t8=0;b.sec=sec;b.hazT=240;b.ultT=400;b.chargeT=0;b.warn=0;b.speedF=1;b.cls=sec.bclass;b.reinT=0;b.fxT=0;
  b.maxHp=Math.round(b.maxHp*sec.diff);b.hp=b.maxHp;for(const c of b.comps){c.maxHp*=sec.diff;c.hp=c.maxHp}
  b.vx=Math.abs(b.vx)*(Math.random()<.5?-1:1);
  v.cine={t:0,dur:230,name:b.def.name,cls:b.cls,color:b.def.color};v.zoom=.88;v.haz=[];v.gravz=null;
  A8.play('BOSS_ALARM');N8.flash(g,.18,'#ff3355');
  for(const c of b.comps){c.x=b.x+c.dx*b.size;c.y=b.y+c.dy*b.size}};
N8.resetFns.push(g=>{const v=g.v8;v.haz=[];v.gravz=null;v.cine=null;v.bossDeath=null});

function phaseFor(b){const r=b.hp/b.maxHp;return r>.75?0:r>.5?1:r>.25?2:3}
function enterPhase(g,b,n){
  b.ph=n;const v=g.v8;A8.play('BOSS_PHASE');N8.slowmo(g,28);N8.shake(g,10);N8.flash(g,.22,n===3?'#ff3355':'#ffcc33');
  g.addText(b.x,b.y-b.size-40,PHASES[n],n===3?'#ff3355':'#ffcc00',1.5);g.toast(PHASES[n]);
  if(n===3){g.toast('CRITICAL INTEGRITY — FINAL PHASE');b.ultT=180}
  if(n===2)b.hazT=90;
  b.invT=60; // brief transition immunity
  const add=(role,k)=>{for(let i=0;i<k&&g.enemies.length<14;i++){const e=new Enemy(clamp(b.x+(i-(k-1)/2)*110,60,g.canvas.width-60),Math.max(40,b.y+40),g.level,'STANDARD',role);g.enemies.push(e)}};
  if(n===1)add('INTERCEPTOR',3);else if(n===2){add('HUNTER',2);add('SHIELD_DRONE',1)}else if(n===3){add('SWARM',4);add('ASSASSIN',1)}
  g.v8.fx.push({t:'ring',x:b.x,y:b.y,r:10,max:b.size*3,life:1,c:'#ffcc00'})}

/* ---------- damage entry points ---------- */
function compHit(g,b,c,d,x,y,col){
  c.hp-=d;c.flash=6;if(b.hp>0&&!b.dying){b.hp-=d*.5;b.hitF=3;if(b.hp<=0){b.hp=1;}}g.v8.fx.push({t:'spark',x:x??c.x,y:y??c.y,n:3});
  g.addText(x??c.x,(y??c.y)-12,`-${Math.round(d)}`,'#ffd36b',.7);
  if(c.hp<=0)destroyComp(g,b,c)}
function destroyComp(g,b,c){
  c.dead=true;c.hp=0;N8.boom(g,c.x,c.y,2,b.def.color,.7);N8.shake(g,6);
  const NAMES={GEN:'SHIELD GENERATOR',TURRET:{MISSILE:'MISSILE LAUNCHER',PLASMA:'PLASMA CANNON',LASER:'LASER ARRAY'}[c.atk],ENGINE:'ENGINE',ARMOR:'ARMOR PLATE'};
  const nm=NAMES[c.type]&&NAMES[c.type].charAt?NAMES[c.type]:c.type;
  g.addText(c.x,c.y-20,nm+' DESTROYED','#00ff9d',1);g.toast(nm+' DESTROYED');g.score+=800;g.coins+=15;
  if(N8.onComp)N8.onComp(g,b,c);
  if(c.type==='GEN'&&!N8.bossShieldUp(b)){g.toast('SHIELDS DOWN — CORE EXPOSED');g.addText(b.x,b.y,'CORE EXPOSED','#ff3355',1.3);b.invT=0;b.stunT=90;N8.slowmo(g,20);N8.flash(g,.15,'#5ec8ff')}
  if(c.type==='ENGINE'){b.speedF=has(b,'ENG_L')||has(b,'ENG_R')?.65:.35;g.toast(b.speedF<.4?'ENGINES OFFLINE — BOSS CRIPPLED':'ENGINE DOWN — BOSS SLOWED')}
  if(c.type==='TURRET')g.toast(nm+' OFFLINE — ATTACK LOST');
  if(c.type==='ARMOR')g.toast('ARMOR BREACH — CORE DAMAGE UP')}
N8.bossDamage=(g,b,d,x,y,col,o={})=>{
  if(b.hp<=0||!b.comps)return 0;
  if(b.intro>0||b.invT>0){if(N8.q.fx&&Math.random()<.3)g.v8.fx.push({t:'spark',x:x??b.x,y:y??b.y,n:1});return 0}
  if(o.aoe){ // splash: component damage for those inside the blast, core takes the rest
    for(const c of b.comps)if(!c.dead&&Math.hypot(c.x-o.ax,c.y-o.ay)<(o.rad||120)+c.r)compHit(g,b,c,d*.45,c.x,c.y,col)}
  else if(x!==undefined){let best=null,bd=1e9;for(const c of b.comps){if(c.dead)continue;const dd=Math.hypot(c.x-x,c.y-y);if(dd<c.r+8&&dd<bd){bd=dd;best=c}}
    if(best){compHit(g,b,best,d,x,y,col);return d}}
  let m=1;if(N8.bossShieldUp(b)){m=.4;if(N8.q.fx&&Math.random()<.4)g.v8.fx.push({t:'ring',x:x??b.x,y:y??b.y,r:3,max:26,life:.8,c:'#5ec8ff'})}
  const arm=alive(b,'ARMOR').length;m*=1-.07*arm;
  const dealt=d*m;b.hp-=dealt;b.hitF=5;
  if(m>.5&&x!==undefined)g.addText(x+rnd(-8,8),y-8,`-${Math.round(dealt)}`,'#ffcc00',.75);
  if(b.hp<=0){b.hp=0;g.defeatBoss()}return dealt};
/* player bullets against components + body; returns true when the bullet was consumed */
N8.bossHit=(g,bl)=>{
  const b=g.boss;if(!b||!b.comps||b.hp<=0)return false;const p=g.player;
  if(bl.hits&&bl.hits.get(b)>bl.age-6)return false;
  let hit=null,bd=1e9;
  for(const c of b.comps){if(c.dead)continue;if(bl.hits&&bl.hits.get(c)>bl.age-6)continue;const d=Math.hypot(c.x-bl.x,c.y-bl.y);if(d<c.r+bl.radius*.6&&d<bd){bd=d;hit=c}}
  const cd=Math.hypot(bl.x-b.x,bl.y-b.y);
  if(!hit&&cd>b.size*.78)return false;
  let dmg=bl.damage;const crit=Math.random()<p.crit;if(crit)dmg*=2.4;
  if(b.wp&&b.intro<=0&&!(b.invT>0)&&Math.hypot(bl.x-b.wp.x,bl.y-b.wp.y)<22&&!(bl.wpHit)){bl.wpHit=1;const extra=dmg*2;b.hp-=extra;b.hitF=6;g.addText(b.wp.x,b.wp.y-20,'CRITICAL x3','#ff3355',1.1);g.v8.fx.push({t:'spark',x:b.wp.x,y:b.wp.y,n:6});N8.boom(g,b.wp.x,b.wp.y,0,'#ff3355',1);if(b.hp<=0){b.hp=0;g.defeatBoss();return true}}
  if(b.intro>0||b.invT>0){bl.dead=true;g.v8.fx.push({t:'spark',x:bl.x,y:bl.y,n:2});g.v8.fx.push({t:'ring',x:bl.x,y:bl.y,r:3,max:22,life:.8,c:'#88aaff'});return true}
  if(hit){compHit(g,b,hit,dmg,bl.x,bl.y,bl.color);(bl.hits=bl.hits||new Map()).set(hit,bl.age)}
  else{
    const core=cd<b.size*.3;if(core&&!N8.bossShieldUp(b))dmg*=1.6;
    N8.bossDamage(g,b,dmg,bl.x,bl.y,bl.color);(bl.hits=bl.hits||new Map()).set(b,bl.age);
    if(core&&!N8.bossShieldUp(b)&&Math.random()<.25)g.addText(bl.x,bl.y-18,'CORE HIT','#ff3355',.9)}
  if(N8.onHit)N8.onHit(g,bl,b,dmg,crit);
  if(bl.pierce>0){bl.pierce--}else if(bl.wk==='ANTIMATTER'||bl.pierce===99){}else bl.dead=true;
  if(bl.dead||bl.wk==='ANTIMATTER')N8.impact(g,bl,p);
  return true};

/* ---------- boss AI ---------- */
Boss.prototype.update=function(w,g){
  const b=this,v=g.v8,p=g.player,H=g.canvas.height;if(!b.i8)N8.initBoss(g,b);
  b.t8++;if(b.hitF>0)b.hitF--;if(b.invT>0)b.invT--;
  b.wp={x:b.x+Math.cos(b.phase*1.7)*b.size*.62,y:b.y+Math.sin(b.phase*1.7)*b.size*.42};
  const cin=v.cine;if(cin){cin.t++;v.zoom+=(1-v.zoom)*.02;if(cin.t>=cin.dur){v.cine=null;v.zoom=1;g.addText(g.canvas.width/2,g.canvas.height*.4,'ENGAGE','#00ff9d',1.5)}}
  // intro: descend, fully immune, no fire
  if(b.intro>0){b.intro--;if(b.y<b.targetY)b.y+=Math.max(.5,(b.targetY-b.y)*.03);b.phase+=.02;updComps(g,b);return}
  if(b.stunT>0){b.stunT--;b.phase+=.01;updComps(g,b);return}
  b.phase+=.035;const ph=phaseFor(b);if(ph>b.ph)enterPhase(g,b,ph);
  // movement: patterns change per phase; engines scale speed
  const sp=b.speedF*(1+b.ph*.12);
  if(b.charge>0){b.charge--;if(b.charge>50){b.y+=(b.cy-b.y)*.06}else{b.y+=(b.targetY-b.y)*.06}}
  else{
    if(b.ph===0)b.x+=b.vx*sp;
    else if(b.ph===1){b.x+=b.vx*sp;b.y=b.targetY+Math.sin(b.phase*1.3)*26}
    else if(b.ph===2){b.x+=b.vx*sp*1.1;b.y=b.targetY+Math.sin(b.phase*1.5)*34;if(has(b,'ENG_L')||has(b,'ENG_R')){b.chargeT--;if(b.chargeT<=0&&b.t8>60){b.chargeT=520;b.warn=70;b.cy=clamp(p.y-240,b.targetY+60,H*.45);b.chargeGo=1}}}
    else{b.x+=b.vx*sp*.9+Math.sin(b.phase*.7)*1.2;b.y=b.targetY+Math.sin(b.phase*1.1)*40+Math.cos(b.phase*.55)*18}
    if(b.x<b.size||b.x>w-b.size){b.vx*=-1;b.x=clamp(b.x,b.size,w-b.size)}}
  if(b.warn>0){b.warn--;if(b.warn===0&&b.chargeGo){b.chargeGo=0;b.charge=110}}
  // attacks: base pattern from the boss def (v5) + component weapons
  b.timer--;b.specialTimer--;
  if(b.timer<=0){b.timer=Math.max(18,46-Math.floor(b.level/8))*(b.ph>=1?.85:1);b.fire(g)}
  if(b.specialTimer<=0){b.specialTimer=Math.max(80,150-Math.floor(b.level*.35))*(b.ph===3?.75:1);b.special(g)}
  const d=dmgB(g),cl=p.v8&&p.v8.cloak>0;
  for(const c of b.comps){if(c.dead||c.type!=='TURRET')continue;const dx=(cl?p.x+Math.sin(b.phase*4)*150:p.x)-c.x,dy=p.y-c.y,m=Math.hypot(dx,dy)||1;c.ang=Math.atan2(dy,dx);
    const rate=b.ph>=2?.75:1;c.cd--;
    if(c.cd<=0){
      if(c.atk==='LASER'){c.cd=(b.ph===0?55:42)*rate;for(let i=-1;i<=1;i++){const a=c.ang+i*.13;N8.eShot(g,'LASER',c.x,c.y,Math.cos(a)*6.4,Math.sin(a)*6.4,d*.8,{col:b.def.color})}}
      else if(b.ph>=1&&c.atk==='MISSILE'){c.cd=230*rate;g.addText(c.x,c.y-14,'MISSILES','#ff5030',.6);for(let i=0;i<2;i++)N8.eShot(g,'MISSILE',c.x+(i?12:-12),c.y,(i?1.6:-1.6),3,d*1.7,{col:'#ff5030',homing:.05})}
      else if(b.ph>=1&&c.atk==='PLASMA'){c.cd=170*rate;for(let i=-1;i<=1;i++){const a=c.ang+i*.3;N8.eShot(g,'PLASMA',c.x,c.y,Math.cos(a)*3.9,Math.sin(a)*3.9,d*2,{col:'#ffa02e'})}}
      else c.cd=30}}
  // phase 3+: arena hazards (always telegraphed)
  if(b.ph>=2){b.hazT--;if(b.hazT<=0){b.hazT=b.ph===3?170:250;spawnHazard(g,b)}}
  // final phase ultimate: telegraphed spiral + expanding energy waves
  if(b.ph===3){b.ultT--;if(b.ultT===70){b.warn=70;b.ult=1;A8.play('WARN');g.toast('⚠ ULTIMATE CHARGING — MOVE TO A GAP')}
    if(b.ultT<=0){b.ultT=460;b.ult=0;ultimate(g,b)}
    // reinforcements while they are few
    b.reinT--;if(b.reinT<=0){b.reinT=900;if(g.enemies.length<6){for(let i=0;i<2;i++)g.enemies.push(new Enemy(rnd(80,w-80),-40-i*40,g.level,'STANDARD','INTERCEPTOR'))}}}
  // low HP callout
  if(b.hp<b.maxHp*.15&&!b.crit8){b.crit8=true;g.addText(b.x,b.y-b.size-70,'CRITICAL INTEGRITY','#ff3355',1.5);g.toast('BOSS: CRITICAL INTEGRITY');A8.play('WARN');N8.shake(g,8)}
  // wreckage smoke/sparks from destroyed components
  if(N8.q.smoke&&++b.fxT%9===0)for(const c of b.comps)if(c.dead&&v.fx.length<N8.q.fx)v.fx.push({t:'smoke',x:c.x+rnd(-6,6),y:c.y+rnd(-6,6),vx:0,vy:.6,r:6,gr:.4,life:.9,dec:.03});
  updComps(g,b)};
function updComps(g,b){for(const c of b.comps){c.x=b.x+c.dx*b.size;c.y=b.y+c.dy*b.size;if(c.flash>0)c.flash--}
  // boss reinforcements move and fight like normal enemies
  if(g.enemies.length){const gg=g;GE.prototype.updateEnemies.call(gg)}else N8.updRocks(g)}
function spawnHazard(g,b){
  const v=g.v8,W=g.canvas.width,H=g.canvas.height,haz=b.sec.haz,type=haz[Math.floor(Math.random()*haz.length)],p=g.player;
  if(type==='laser'){ // two beams leave >=45% of the screen free; warned 90 frames ahead
    const vertical=Math.random()<.5;if(vertical){const bw=W*.13,x0=rnd(0,W-bw*2.4);for(const x of[x0,x0+bw*1.8+rnd(0,W*.25)])if(x<W-bw)v.haz.push({t:'laser',x,y:0,w:bw,h:H,warn:90,dur:50,tick:0})}
    else{const bh=H*.1,y0=rnd(H*.25,H*.55);v.haz.push({t:'laser',x:0,y:y0,w:W,h:bh,warn:90,dur:50,tick:0})}g.toast('⚠ LASER ZONE')}
  else if(type==='mine'){g.toast('⚠ MINEFIELD');for(let i=0;i<4;i++){const m=N8.eShot(g,'MINE',rnd(60,W-60),rnd(90,H*.45),0,.3,d8(g)*3,{col:'#ff5030',fuse:520});if(m){v.haz.push({t:'mineWarn',x:m.x,y:m.y,warn:40,dur:0})}}}
  else if(type==='gravity'){v.gravz={x:rnd(W*.2,W*.8),y:rnd(H*.35,H*.6),r:190,t:300,warn:70};g.toast('⚠ GRAVITY DISTURBANCE')}
  else if(type==='wave'){g.toast('⚠ ENERGY WAVE');b.warn=50;for(let i=0;i<3;i++)setTimeout(()=>{if(g.boss===b&&g.state===GAME.PLAYING)N8.eShot(g,'WAVE',b.x+(i-1)*70,b.y+b.size*.5,(i-1)*.5,3.4,dmgB(g)*1.5,{col:b.def.color})},i*420)}
  else if(type==='rock'){g.toast('⚠ ASTEROID FIELD');for(let i=0;i<5;i++){const x=rnd(50,W-50);v.haz.push({t:'rockWarn',x,y:0,warn:60});setTimeout(()=>{if(g.state===GAME.PLAYING&&g.v8===v)v.rocks.push({x,y:-40,vx:rnd(-.6,.6),vy:rnd(2.2,3.4),hp:90+g.level*3,maxHp:90+g.level*3,r:24+Math.random()*12,rot:0,vr:rnd(-.04,.04),img:Math.floor(Math.random()*6)})},1000+i*260)}}}
const d8=dmgB;
function ultimate(g,b){A8.play('BOSS_PHASE');N8.shake(g,10);const d=dmgB(g);
  // spiral with a guaranteed safe lane (rotating gap) + 2 slow energy wave rings
  const gap=Math.random()*6.28;for(let r=0;r<3;r++)for(let i=0;i<24;i++){const a=i*Math.PI/12+r*.13;let da=Math.abs(((a-gap+Math.PI*3)%(Math.PI*2))-Math.PI);if(da<.42)continue;N8.eShot(g,'PLASMA',b.x,b.y,Math.cos(a)*(2.8+r*.7),Math.sin(a)*(2.8+r*.7),d*1.3,{col:b.def.color})}
  N8.eShot(g,'WAVE',b.x,b.y+b.size*.4,0,3,d*1.8,{col:'#ff3355'});g.addText(b.x,b.y+b.size,'OVERLOAD','#ff3355',1.3)}
/* laser-zone / gravity / warnings update + damage to the player (dashing = i-frames) */
N8.post.push(g=>{const v=g.v8,p=g.player,b=g.boss;if(!p)return;
  for(let i=v.haz.length-1;i>=0;i--){const h=v.haz[i];
    if(h.warn>0){h.warn--;continue}
    if(h.t==='laser'){h.dur--;if(h.dur%10===0&&p.hitInvuln<=0&&p.x>h.x-8&&p.x<h.x+h.w+8&&p.y>h.y-8&&p.y<h.y+h.h+8){g.v8.hitInfo={ang:Math.atan2(h.y+h.h/2-p.y,h.x+h.w/2-p.x),kind:'LASER'};g.applyDamage(dmgB(g)*1.4)}if(h.dur<=0)v.haz.splice(i,1);else if(h.dur===49){A8.play('STORM',h.x+h.w/2,h.y+h.h/2);N8.shake(g,3)}}
    else v.haz.splice(i,1)}
  const z=v.gravz;if(z){if(z.warn>0)z.warn--;else{z.t--;const dx=z.x-p.x,dy=z.y-p.y,d=Math.hypot(dx,dy)||1;if(d<z.r*1.6&&p.dashTimer<=0){const f=(1-d/(z.r*1.6))*2.2;p.x+=dx/d*f;p.y+=dy/d*f}
    if(d<40&&z.t%20===0&&p.hitInvuln<=0){g.v8.hitInfo={ang:Math.atan2(dy,dx),kind:'IMPACT'};g.applyDamage(dmgB(g)*.6)}
    for(const bl of g.bullets)if(bl.isEnemy&&Math.hypot(bl.x-z.x,bl.y-z.y)<z.r){bl.vx+=(z.x-bl.x)*.0008;bl.vy+=(z.y-bl.y)*.0008}
    if(z.t<=0)v.gravz=null}}
});
/* ---------- boss death cinematic ---------- */
hook(GE.prototype,'defeatBoss',function(o){
  const g=this,b=g.boss;if(!b)return;const v=g.v8;
  v.bossDeath={x:b.x,y:b.y,s:b.size,t:0,col:b.def.color};N8.slowmo(g,60);N8.flash(g,.5,'#ffffff');A8.play('BOOM_L');
  if(N8.onBossDefeat)N8.onBossDefeat(g,b);
  o.call(g);g.v8.cine=null;g.v8.haz=[];g.v8.gravz=null});
N8.post.push(g=>{const d=g.v8.bossDeath;if(!d)return;d.t++;
  if(d.t%4===0&&d.t<90){const a=Math.random()*6.28,r=Math.random()*d.s*.9;N8.boom(g,d.x+Math.cos(a)*r,d.y+Math.sin(a)*r,d.t<60?2:1,d.t%8?d.col:'#fff',.8);if(d.t%12===0)N8.shake(g,7)}
  if(d.t===90){N8.boom(g,d.x,d.y,3,'#ffffff',1.6);N8.flash(g,.7,'#ffffff');N8.shake(g,16);for(let i=0;i<40&&g.v8.fx.length<N8.q.fx+60;i++){const a=Math.random()*6.28,s=2+Math.random()*9;g.v8.fx.push({t:'deb',x:d.x,y:d.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,rot:0,vr:rnd(-.4,.4),s:3+Math.random()*7,life:1.4,c:i%3?'#39404d':d.col})}}
  if(d.t>120)g.v8.bossDeath=null});

/* ---------- boss renderer ---------- */
function bodyPath(c,sh,s){c.beginPath();
  if(sh==='circle'||sh==='singularity'||sh==='blackstar'||sh==='sun'||sh==='seraph'){c.arc(0,0,s*.72,0,7)}
  else if(sh==='diamond'||sh==='eclipse'){c.moveTo(0,-s*.95);c.lineTo(s*.8,0);c.lineTo(0,s*.9);c.lineTo(-s*.8,0);c.closePath()}
  else if(sh==='mantis'||sh==='hydra'||sh==='dragon'||sh==='wyrm'){c.moveTo(0,-s*.9);c.lineTo(s*.95,-s*.15);c.lineTo(s*.55,s*.72);c.lineTo(0,s*.42);c.lineTo(-s*.55,s*.72);c.lineTo(-s*.95,-s*.15);c.closePath()}
  else if(sh==='fortress'||sh==='juggernaut'||sh==='titan'){c.moveTo(-s*.9,-s*.5);c.lineTo(-s*.5,-s*.72);c.lineTo(s*.5,-s*.72);c.lineTo(s*.9,-s*.5);c.lineTo(s*.9,s*.5);c.lineTo(s*.5,s*.7);c.lineTo(-s*.5,s*.7);c.lineTo(-s*.9,s*.5);c.closePath()}
  else{c.moveTo(0,-s*.95);c.lineTo(s*.85,s*.5);c.lineTo(s*.35,s*.36);c.lineTo(0,s*.9);c.lineTo(-s*.35,s*.36);c.lineTo(-s*.85,s*.5);c.closePath()}}
Boss.prototype.draw=function(c){
  const g=N8.g,b=this;if(!b.comps)return;const s=b.size,t=g.v8.t,col=b.def.color,sh=b.def.shape,lo=b.hp/b.maxHp;
  c.save();c.translate(b.x,b.y);c.rotate(Math.sin(b.phase)*.04);
  if(b.warn>0||b.ult){const wa=(b.warn||1)/70;c.globalCompositeOperation='lighter';c.globalAlpha=.25+.3*Math.sin(t*.5);c.strokeStyle='#ff3355';c.lineWidth=4;c.beginPath();c.arc(0,0,s*(1.25+ (1-wa)*.6),0,7);c.stroke();c.globalCompositeOperation='source-over';c.globalAlpha=1}
  // engine plumes
  for(const e of b.comps)if(e.type==='ENGINE'){const ex=e.dx*s,ey=e.dy*s;if(!e.dead){c.globalCompositeOperation='lighter';const gr=c.createLinearGradient(ex,ey,ex,ey-s*.5);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(.3,N8.rgba(col,.7));gr.addColorStop(1,N8.rgba(col,0));c.fillStyle=gr;c.beginPath();c.moveTo(ex-e.r*.5,ey);c.lineTo(ex,ey-s*(.3+Math.random()*.15));c.lineTo(ex+e.r*.5,ey);c.fill();c.globalCompositeOperation='source-over'}}
  // hull
  bodyPath(c,sh,s);const hg=c.createLinearGradient(-s,-s,s,s);hg.addColorStop(0,N8.shade('#3a4358',.25));hg.addColorStop(.5,'#232a3a');hg.addColorStop(1,'#0d111a');c.fillStyle=hg;c.fill();
  c.lineWidth=3;c.strokeStyle=N8.rgba(col,.9);c.stroke();
  c.save();bodyPath(c,sh,s);c.clip();c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=1;for(let i=-4;i<=4;i++){c.beginPath();c.moveTo(-s,i*s*.22);c.lineTo(s,i*s*.22+s*.1);c.stroke()}for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(i*s*.3,-s);c.lineTo(i*s*.3-s*.1,s);c.stroke()}
  const lg=c.createLinearGradient(0,-s,0,s);lg.addColorStop(0,'rgba(255,255,255,.14)');lg.addColorStop(.5,'rgba(0,0,0,0)');lg.addColorStop(1,'rgba(0,0,10,.5)');c.fillStyle=lg;c.fillRect(-s,-s,s*2,s*2);
  const li=N8.q.light?N8.lightAt(b.x,b.y,b):null;if(li){c.globalCompositeOperation='lighter';c.fillStyle=`rgba(${li.r},${li.g},${li.b},${li.i*.4})`;c.fillRect(-s,-s,s*2,s*2)}
  if(b.hitF>0){c.globalCompositeOperation='lighter';c.fillStyle='rgba(255,255,255,.25)';c.fillRect(-s,-s,s*2,s*2)}c.restore();
  // armor plates
  for(const a of b.comps)if(a.type==='ARMOR'){const x=a.dx*s,y=a.dy*s;c.save();c.translate(x,y);if(!a.dead){const w=a.r*1.9,h=a.r*1.5;c.fillStyle='#3b4560';c.strokeStyle=N8.rgba(col,.8);c.lineWidth=2;c.beginPath();c.moveTo(-w/2,-h/2);c.lineTo(w/2,-h/2);c.lineTo(w*.4,h/2);c.lineTo(-w*.4,h/2);c.closePath();c.fill();c.stroke();c.fillStyle='rgba(255,255,255,.15)';c.fillRect(-w*.4,-h*.35,w*.8,h*.12);if(a.flash>0){c.globalAlpha=.6;c.fillStyle='#fff';c.fill()}}
    else{c.strokeStyle='rgba(255,120,40,.5)';c.lineWidth=1.4;c.beginPath();c.moveTo(-a.r,-a.r*.4);c.lineTo(-a.r*.2,a.r*.2);c.lineTo(a.r*.3,-a.r*.3);c.lineTo(a.r,a.r*.3);c.stroke()}c.restore()}
  // turrets
  for(const u of b.comps)if(u.type==='TURRET'){const x=u.dx*s,y=u.dy*s;c.save();c.translate(x,y);c.fillStyle=u.dead?'#12151c':'#2a3244';c.strokeStyle=u.dead?'#3a2a20':N8.rgba(col,.8);c.lineWidth=2;c.beginPath();c.arc(0,0,u.r*.9,0,7);c.fill();c.stroke();
    if(!u.dead){c.rotate(u.ang-Math.PI/2);c.fillStyle=u.atk==='MISSILE'?'#a03020':u.atk==='PLASMA'?'#c07a1a':'#7a1a3a';c.fillRect(-u.r*.22,0,u.r*.44,u.r*1.15);c.fillStyle='#fff';c.fillRect(-u.r*.1,u.r*1.05,u.r*.2,u.r*.15);c.rotate(-(u.ang-Math.PI/2));
      const ch=1-Math.max(0,u.cd)/200;c.globalCompositeOperation='lighter';c.fillStyle=N8.rgba(u.atk==='MISSILE'?'#ff5030':u.atk==='PLASMA'?'#ffa02e':'#ff3a6a',.3+.5*ch);c.beginPath();c.arc(0,0,u.r*.35,0,7);c.fill();c.globalCompositeOperation='source-over';if(u.flash>0){c.globalAlpha=.6;c.fillStyle='#fff';c.beginPath();c.arc(0,0,u.r*.9,0,7);c.fill()}}
    else{c.fillStyle='rgba(255,90,20,.4)';c.beginPath();c.arc(0,0,u.r*.4,0,7);c.fill()}c.restore()}
  // generators
  for(const q of b.comps)if(q.type==='GEN'){const x=q.dx*s,y=q.dy*s;c.save();c.translate(x,y);c.fillStyle='#0f1c2a';c.strokeStyle=q.dead?'#3a2a20':'#5ec8ff';c.lineWidth=2;c.beginPath();c.arc(0,0,q.r,0,7);c.fill();c.stroke();
    if(!q.dead){c.globalCompositeOperation='lighter';const gr=c.createRadialGradient(0,0,0,0,0,q.r*.9);gr.addColorStop(0,'#fff');gr.addColorStop(.4,'#5ec8ff');gr.addColorStop(1,'rgba(94,200,255,0)');c.globalAlpha=.7+.3*Math.sin(t*.2);c.fillStyle=gr;c.beginPath();c.arc(0,0,q.r*.9,0,7);c.fill();c.globalCompositeOperation='source-over';c.globalAlpha=1;c.strokeStyle='#5ec8ff';c.lineWidth=1;c.beginPath();c.arc(0,0,q.r*(1.2+.1*Math.sin(t*.2)),0,7);c.stroke();if(q.flash>0){c.globalAlpha=.6;c.fillStyle='#fff';c.beginPath();c.arc(0,0,q.r,0,7);c.fill()}}c.restore()}
  // engine housings
  for(const e of b.comps)if(e.type==='ENGINE'){c.save();c.translate(e.dx*s,e.dy*s);c.fillStyle=e.dead?'#12151c':'#232b3d';c.strokeStyle=e.dead?'#3a2a20':'#8896b3';c.lineWidth=1.6;c.fillRect(-e.r*.6,-e.r*.5,e.r*1.2,e.r);c.strokeRect(-e.r*.6,-e.r*.5,e.r*1.2,e.r);if(e.flash>0){c.globalAlpha=.6;c.fillStyle='#fff';c.fillRect(-e.r*.6,-e.r*.5,e.r*1.2,e.r)}c.restore()}
  // core
  const cr=s*.26*(1+.05*Math.sin(t*.12)),exposed=!N8.bossShieldUp(b),enr=lo<.25;
  c.globalCompositeOperation='lighter';const cg=c.createRadialGradient(0,0,0,0,0,cr*2);cg.addColorStop(0,'#fff');cg.addColorStop(.3,enr?'#ff3355':col);cg.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha=exposed?1:.55;c.fillStyle=cg;c.beginPath();c.arc(0,0,cr*2,0,7);c.fill();c.globalCompositeOperation='source-over';c.globalAlpha=1;
  c.strokeStyle=exposed?'#fff':N8.rgba(col,.6);c.lineWidth=2;c.beginPath();c.arc(0,0,cr,0,7);c.stroke();
  if(exposed){c.strokeStyle='#ff3355';c.lineWidth=1.4;c.setLineDash([4,5]);c.lineDashOffset=-t*.5;c.beginPath();c.arc(0,0,cr*1.5,0,7);c.stroke();c.setLineDash([])}
  // shield bubble while generators live
  if(N8.bossShieldUp(b)){const n=alive(b,'GEN').length;c.globalCompositeOperation='lighter';c.strokeStyle=`rgba(94,200,255,${.25+.15*n})`;c.lineWidth=3;c.beginPath();c.arc(0,0,s*1.12+Math.sin(t*.1)*3,0,7);c.stroke();const bg=c.createRadialGradient(0,0,s*.8,0,0,s*1.12);bg.addColorStop(0,'rgba(94,200,255,0)');bg.addColorStop(1,'rgba(94,200,255,.16)');c.fillStyle=bg;c.beginPath();c.arc(0,0,s*1.12,0,7);c.fill();c.globalCompositeOperation='source-over'}
  if(b.intro>0){c.globalAlpha=.4+.3*Math.sin(t*.5);c.strokeStyle='#88aaff';c.lineWidth=3;c.beginPath();c.arc(0,0,s*1.2,0,7);c.stroke()}
  if(enr){c.globalCompositeOperation='lighter';c.globalAlpha=.18+.12*Math.sin(t*.4);c.fillStyle='#ff3355';bodyPath(c,sh,s);c.fill();c.globalCompositeOperation='source-over'}
  c.restore();
  // weak point reticle (v7 feature, preserved)
  if(b.wp&&b.intro<=0){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.9;c.strokeStyle='#ff3355';c.lineWidth=2;const wr=13+Math.sin(b.phase*8)*2;c.beginPath();c.arc(b.wp.x,b.wp.y,wr,0,7);c.moveTo(b.wp.x-wr-7,b.wp.y);c.lineTo(b.wp.x+wr+7,b.wp.y);c.moveTo(b.wp.x,b.wp.y-wr-7);c.lineTo(b.wp.x,b.wp.y+wr+7);c.stroke();c.restore()}
  // component hp pips
  c.save();for(const q of b.comps){if(q.dead||q.hp>=q.maxHp)continue;const f=q.hp/q.maxHp;c.fillStyle='rgba(0,0,0,.6)';c.fillRect(q.x-q.r*.8,q.y-q.r-8,q.r*1.6,3);c.fillStyle=q.type==='GEN'?'#5ec8ff':q.type==='TURRET'?'#ff9d2e':q.type==='ENGINE'?'#c9a0ff':'#9aa6c0';c.fillRect(q.x-q.r*.8,q.y-q.r-8,q.r*1.6*f,3)}c.restore()};
/* hazard telegraphs + zone visuals */
N8.addDraw(46,(g,c)=>{const v=g.v8,t=v.t,W=g.canvas.width,H=g.canvas.height;c.globalCompositeOperation='lighter';
  for(const h of v.haz){
    if(h.t==='laser'){if(h.warn>0){c.globalAlpha=.18+.14*Math.sin(t*.5);c.fillStyle='#ff3355';c.fillRect(h.x,h.y,h.w,h.h);c.globalAlpha=.7;c.strokeStyle='#ff6680';c.setLineDash([10,8]);c.lineWidth=2;c.strokeRect(h.x,h.y,h.w,h.h);c.setLineDash([]);c.globalAlpha=.9;c.fillStyle='#ff6680';c.font='800 13px Orbitron,sans-serif';c.textAlign='center';c.fillText('⚠',h.x+h.w/2,h.y+Math.min(h.h,60)/2+5)}
      else{const f=.7+.3*Math.random();c.globalAlpha=f;const horiz=h.w>h.h;const gr=horiz?c.createLinearGradient(0,h.y,0,h.y+h.h):c.createLinearGradient(h.x,0,h.x+h.w,0);gr.addColorStop(0,'rgba(255,50,90,0)');gr.addColorStop(.3,'rgba(255,90,120,.9)');gr.addColorStop(.5,'#fff');gr.addColorStop(.7,'rgba(255,90,120,.9)');gr.addColorStop(1,'rgba(255,50,90,0)');c.fillStyle=gr;c.fillRect(h.x,h.y,h.w,h.h)}}
    else if(h.t==='mineWarn'){c.globalAlpha=.6*(h.warn/40);c.strokeStyle='#ff3030';c.lineWidth=2;c.beginPath();c.arc(h.x,h.y,50-h.warn,0,7);c.stroke()}
    else if(h.t==='rockWarn'){c.globalAlpha=.4+.3*Math.sin(t*.5);c.strokeStyle='#ffb34a';c.lineWidth=2;c.beginPath();c.moveTo(h.x,0);c.lineTo(h.x,60);c.stroke();c.fillStyle='#ffb34a';c.beginPath();c.moveTo(h.x-9,42);c.lineTo(h.x+9,42);c.lineTo(h.x,62);c.fill()}}
  const z=v.gravz;if(z){const a=z.warn>0?.35+.25*Math.sin(t*.5):.75;c.globalAlpha=a*.4;const gr=c.createRadialGradient(z.x,z.y,0,z.x,z.y,z.r*1.6);gr.addColorStop(0,'rgba(0,0,0,.9)');gr.addColorStop(.5,'rgba(150,90,255,.35)');gr.addColorStop(1,'rgba(150,90,255,0)');c.fillStyle=gr;c.beginPath();c.arc(z.x,z.y,z.r*1.6,0,7);c.fill();c.globalAlpha=a;c.strokeStyle='#c9a0ff';c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.arc(z.x,z.y,((t*2+i*55)%(z.r*1.6)),0,7);c.stroke()}if(z.warn>0){c.setLineDash([7,7]);c.beginPath();c.arc(z.x,z.y,z.r,0,7);c.stroke();c.setLineDash([])}}
  c.globalCompositeOperation='source-over';c.globalAlpha=1});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v8-boss.js');
