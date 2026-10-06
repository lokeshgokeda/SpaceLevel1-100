'use strict';
/* NEBULA PROTOCOL v8 — weapons v2, projectile renderers, missiles, weapon switching, damage helpers, procedural audio. */
(()=>{
const N8=window.N8,{hook,clamp,rnd,$}=N8,GE=GameEngine;

/* ---------- shared helpers ---------- */
N8.hostiles=g=>{const a=[];if(g.boss&&g.boss.hp>0)a.push(g.boss);for(const e of g.enemies)if(!e.dead)a.push(e);return a};
N8.nearest=(g,x,y,r=1e9)=>{let t=null,b=r;for(const e of N8.hostiles(g)){if(e.v8&&e.v8.cloak>0&&e.cloakHide)continue;const d=Math.hypot(e.x-x,e.y-y);if(d<b){b=d;t=e}}return t};
N8.segDist=(px,py,x0,y0,x1,y1)=>{const dx=x1-x0,dy=y1-y0,l=dx*dx+dy*dy||1;let t=clamp(((px-x0)*dx+(py-y0)*dy)/l,0,1);return Math.hypot(px-(x0+dx*t),py-(y0+dy*t))};
/* the one damage path: enemy shields (ion x8), shield-drone protection, boss components, hit flash */
N8.hurt=(g,e,d,col,o={})=>{
  if(!e||e.dead||d<=0)return 0;
  if(e===g.boss){return N8.bossDamage?N8.bossDamage(g,e,d,o.x,o.y,col,o):((e.hp-=d),e.hp<=0&&g.defeatBoss(),d)}
  if(e.prot>0&&!o.pierceProt)d*=.5;
  if(e.sh>0){const s=d*(o.shieldMul||1);if(s<=e.sh){e.sh-=s;e.hitFlash=4;if(N8.q.fx>0&&Math.random()<.5)g.v8.fx.push({t:'spark',x:o.x??e.x,y:o.y??e.y,n:2});return d}d-=e.sh/(o.shieldMul||1);e.sh=0;g.addText(e.x,e.y-e.size*.6,'SHIELD DOWN','#5ec8ff',.8);g.v8.fx.push({t:'ring',x:e.x,y:e.y,r:e.size*.4,max:e.size*1.3,life:1,c:'#5ec8ff'})}
  if(o.hullMul)d*=o.hullMul;
  e.hp-=d;e.hitFlash=6;if(o.stun&&!e.stun)e.stun=o.stun;
  if(e.hp<=0)g.killEnemy(e);
  return d};
N8.aoe=(g,x,y,r,dmg,col,o={})=>{for(const e of N8.hostiles(g)){const d=Math.hypot(e.x-x,e.y-y)-(e===g.boss?e.size*.6:e.size*.4);if(d<r){const f=1-clamp(d/r,0,1)*.6;N8.hurt(g,e,dmg*f,col,Object.assign({x:e.x,y:e.y,aoe:1,ax:x,ay:y},o))}}};

/* ---------- glow sprite cache (avoids shadowBlur) ---------- */
const glowC={};
N8.glow=(col,size)=>{const k=col+size;if(glowC[k])return glowC[k];const s=size*2,C=document.createElement('canvas');C.width=C.height=s;const c=C.getContext('2d');const gr=c.createRadialGradient(size,size,0,size,size,size);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.25,N8.rgba(col,.75));gr.addColorStop(1,N8.rgba(col,0));c.fillStyle=gr;c.fillRect(0,0,s,s);return glowC[k]=C};
const blit=(c,col,size,x,y,a)=>{if(!N8.q.glow&&size>14)size*=.7;c.globalAlpha=a;const im=N8.glow(col,size);c.drawImage(im,x-size,y-size,size*2,size*2)};

/* ---------- weapon table (names, UI stats, costs) ---------- */
N8.W=[
 {k:'PULSE',n:'PULSE BLASTER',c:'#38d9ff',lvl:1,en:0,heat:2.5,dmg:'1.0x',rate:'FAST',rng:'LONG',fx:'Reliable rapid bolts. No energy cost.',mz:8},
 {k:'SCATTER',n:'SCATTER CANNON',c:'#ffb02e',lvl:1,en:2,heat:9,dmg:'5 x 0.7x',rate:'MED',rng:'SHORT',fx:'Five-pellet spread, devastating up close.',mz:12},
 {k:'RAILGUN',n:'RAILGUN',c:'#8affff',lvl:2,en:10,heat:18,dmg:'6.0x',rate:'SLOW',rng:'EXTREME',fx:'Pierces every target in the lane.',mz:16},
 {k:'PLASMA',n:'PLASMA LAUNCHER',c:'#7dff42',lvl:3,en:8,heat:22,dmg:'4.0x +splash',rate:'SLOW',rng:'LONG',fx:'Pierces 2 targets, splash burns on impact.',mz:14},
 {k:'LASER',n:'BEAM LASER',c:'#ff6bd6',lvl:4,en:0.8,heat:2.2,dmg:'0.42x/tick',rate:'BEAM',rng:'SCREEN',fx:'Continuous piercing beam; drains energy.',mz:0},
 {k:'NOVA',n:'NOVA LAUNCHER',c:'#ff9d2e',lvl:5,en:18,heat:30,dmg:'5.0x AoE',rate:'SLOW',rng:'MED',fx:'Detonates on contact or timer in a blast.',mz:16},
 {k:'GRAVITY',n:'GRAVITY MINE',c:'#b56cff',lvl:6,en:22,heat:25,dmg:'crush DoT',rate:'SLOW',rng:'MED',fx:'Seeds a gravity well that drags enemies.',mz:14},
 {k:'ION',n:'ION CANNON',c:'#6fb8ff',lvl:7,en:6,heat:10,dmg:'0.6x, shields x8',rate:'MED',rng:'LONG',fx:'Shreds shields, stuns hulls, chains arcs.',mz:12},
 {k:'PARTICLE',n:'PARTICLE CANNON',c:'#c9a0ff',lvl:8,en:1.2,heat:3.4,dmg:'0.55x',rate:'VERY FAST',rng:'LONG',fx:'High-energy rapid fire, energy hungry.',mz:9},
 {k:'BARRAGE',n:'MISSILE BARRAGE',c:'#ff7a2e',lvl:9,en:30,heat:25,dmg:'6 x 2.2x',rate:'SLOW',rng:'SEEKING',fx:'Six homing missiles in a fan.',mz:16},
 {k:'ANTIMATTER',n:'ANTIMATTER CANNON',c:'#ffffff',lvl:10,en:40,heat:38,dmg:'14.0x AoE',rate:'VERY SLOW',rng:'MED',fx:'Slow devastating warhead, pierces & implodes.',mz:26}
];
N8.WK=N8.W.map(w=>w.k);
N8.weaponUnlocked=i=>!N8.pilot||N8.pilot.cheat||N8.pilot.level>=N8.W[i].lvl;

/* ---------- procedural audio v2 (spatial-feeling: volume + pan from position relative to player) ---------- */
const A8=N8.audio={
  ctx:()=>N8.g&&N8.g.audio.ctx,
  noiseBuf:null,
  noise(ac){if(!this.noiseBuf){const n=ac.sampleRate*.6,b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;this.noiseBuf=b}return this.noiseBuf},
  pan(x){return N8.g?clamp((x-N8.g.canvas.width/2)/(N8.g.canvas.width/2),-1,1):0},
  vol(x,y){const g=N8.g,p=g&&g.player;if(x===undefined||!p)return 1;return clamp(1.15-Math.hypot(x-p.x,y-p.y)/900,.15,1)},
  /* v: {f,f2,d,type,v,x,y,n(noise),lp(lowpass),delay} */
  voice(o){const g=N8.g;if(!g||g.audio.mute8||g.settings.volume===0)return;const ac=g.audio.ctx;if(!ac||ac.state==='closed')return;if(this.n>28)return;
    const t0=ac.currentTime+(o.delay||0),d=o.d||.15,vol=(o.v||.3)*g.audio.master*this.vol(o.x,o.y)*2.2;
    const out=ac.createGain();out.gain.setValueAtTime(vol,t0);out.gain.exponentialRampToValueAtTime(.0008,t0+d);
    let tail=out;if(ac.createStereoPanner&&o.x!==undefined){const pn=ac.createStereoPanner();pn.pan.value=this.pan(o.x)*.8;out.connect(pn);tail=pn}tail.connect(ac.destination);
    let head=out;if(o.lp||o.hp){const f=ac.createBiquadFilter();f.type=o.hp?'highpass':'lowpass';f.frequency.setValueAtTime(o.lp||o.hp,t0);if(o.lp)f.frequency.exponentialRampToValueAtTime(Math.max(60,o.lp*.2),t0+d);f.connect(out);head=f}
    let src;if(o.n){src=ac.createBufferSource();src.buffer=this.noise(ac);src.loop=true}else{src=ac.createOscillator();src.type=o.type||'sine';src.frequency.setValueAtTime(o.f||300,t0);src.frequency.exponentialRampToValueAtTime(Math.max(25,o.f2||(o.f||300)*.4),t0+d)}
    src.connect(head);src.start(t0);src.stop(t0+d+.02);this.n=(this.n||0)+1;src.onended=()=>{this.n--}},
  /* named sounds */
  play(k,x,y){const V=o=>{o.x=x;o.y=y;this.voice(o)};switch(k){
    case'PULSE':V({f:900,f2:420,d:.09,type:'square',v:.16});break;
    case'SCATTER':V({n:1,d:.14,v:.3,lp:3500});V({f:160,f2:60,d:.12,type:'sawtooth',v:.2});break;
    case'RAILGUN':V({f:2400,f2:180,d:.32,type:'sawtooth',v:.28});V({n:1,d:.1,v:.2,hp:3000});break;
    case'PLASMA':V({f:200,f2:520,d:.28,type:'sawtooth',v:.22,lp:1800});V({f:90,f2:50,d:.3,type:'sine',v:.3});break;
    case'LASER':V({f:620,f2:560,d:.08,type:'sine',v:.14});break;
    case'ION':V({f:1300,f2:300,d:.2,type:'triangle',v:.24});V({n:1,d:.12,v:.15,hp:4500});break;
    case'PARTICLE':V({f:1500,f2:900,d:.05,type:'triangle',v:.1});break;
    case'NOVA':V({f:110,f2:40,d:.45,type:'square',v:.35});break;
    case'GRAVITY':V({f:80,f2:200,d:.6,type:'triangle',v:.3});break;
    case'BARRAGE':for(let i=0;i<4;i++)V({n:1,d:.16,v:.16,lp:2200,delay:i*.06});V({f:300,f2:120,d:.4,type:'sawtooth',v:.2});break;
    case'ANTIMATTER':V({f:55,f2:25,d:.9,type:'sine',v:.5});V({f:400,f2:60,d:.7,type:'sawtooth',v:.2,lp:900});break;
    case'MISSILE':V({n:1,d:.35,v:.2,lp:2600});V({f:320,f2:110,d:.35,type:'sawtooth',v:.14});break;
    case'SHIELD':V({f:700,f2:1500,d:.18,type:'sine',v:.22});V({n:1,d:.1,v:.1,hp:5000});break;
    case'HULL':V({n:1,d:.16,v:.34,lp:1400});V({f:120,f2:45,d:.2,type:'square',v:.3});break;
    case'BOOM_S':V({n:1,d:.22,v:.28,lp:2600});break;
    case'BOOM_M':V({n:1,d:.4,v:.4,lp:1800});V({f:100,f2:40,d:.4,type:'sine',v:.35});break;
    case'BOOM_L':V({n:1,d:.9,v:.55,lp:1200});V({f:70,f2:28,d:.9,type:'sine',v:.5});break;
    case'POWER':V({f:420,f2:1200,d:.3,type:'triangle',v:.3});V({f:210,f2:600,d:.4,type:'sine',v:.2,delay:.05});break;
    case'STORM':V({n:1,d:.7,v:.4,lp:2400});V({f:140,f2:50,d:.6,type:'sawtooth',v:.3});break;
    case'LOOT':V({f:900,f2:1800,d:.12,type:'sine',v:.2});V({f:1350,f2:2200,d:.14,type:'sine',v:.15,delay:.07});break;
    case'LOOT_R':V({f:700,f2:1600,d:.25,type:'triangle',v:.3});V({f:1050,f2:2400,d:.3,type:'triangle',v:.25,delay:.08});V({f:1400,f2:3000,d:.35,type:'sine',v:.2,delay:.16});break;
    case'WARN':V({f:520,f2:520,d:.22,type:'square',v:.26,lp:1800});V({f:520,f2:520,d:.22,type:'square',v:.26,lp:1800,delay:.3});V({f:520,f2:520,d:.22,type:'square',v:.26,lp:1800,delay:.6});break;
    case'BOSS_ALARM':for(let i=0;i<4;i++)V({f:i%2?440:330,f2:i%2?420:310,d:.34,type:'sawtooth',v:.32,lp:1600,delay:i*.4});V({f:50,f2:30,d:1.6,type:'sine',v:.5});break;
    case'BOSS_PHASE':V({f:90,f2:30,d:1.1,type:'sawtooth',v:.5,lp:900});V({n:1,d:1,v:.4,lp:1600});break;
    case'PLAYER_DEATH':V({n:1,d:1.4,v:.6,lp:1400});V({f:110,f2:22,d:1.4,type:'sawtooth',v:.5});break;
    case'MISSION':V({f:520,f2:520,d:.16,type:'triangle',v:.28});V({f:660,f2:660,d:.16,type:'triangle',v:.28,delay:.14});V({f:880,f2:880,d:.4,type:'triangle',v:.3,delay:.28});break;
    case'LEVELUP':V({f:440,f2:440,d:.14,type:'square',v:.22});V({f:660,f2:660,d:.14,type:'square',v:.22,delay:.12});V({f:880,f2:880,d:.14,type:'square',v:.22,delay:.24});V({f:1320,f2:1320,d:.5,type:'triangle',v:.28,delay:.36});break;
    case'LOCK':V({f:1400,f2:1400,d:.05,type:'square',v:.16});break;
    case'LOCKED':V({f:1800,f2:1800,d:.07,type:'square',v:.2});V({f:1800,f2:1800,d:.07,type:'square',v:.2,delay:.1});break;
    case'ENEMY_LASER':V({f:520,f2:240,d:.1,type:'sawtooth',v:.09});break;
    case'ENEMY_PLASMA':V({f:180,f2:110,d:.2,type:'sawtooth',v:.14,lp:1400});break;
    case'ENEMY_SNIPER':V({f:1800,f2:300,d:.25,type:'sawtooth',v:.18});break;
    case'CLOAK':V({f:900,f2:200,d:.5,type:'sine',v:.2});break;
    case'DASH':V({n:1,d:.25,v:.25,hp:1200});V({f:300,f2:900,d:.2,type:'sawtooth',v:.15});break;
  }}
};
/* silence the legacy generic sounds when v8 plays its own; legacy tone() calls in v6/v7 weapon code are muted during fire() */
hook(AudioFX.prototype,'tone',function(o,...a){if(this.mute8)return;return o.apply(this,a)});
hook(AudioFX.prototype,'laser',function(o,enemy,style){if(this.mute8)return;if(enemy)return;return o.call(this,enemy,style)}); // enemy shots use v8 per-kind sounds
hook(AudioFX.prototype,'boom',function(o,big){if(this.mute8)return;const at=this.at,s=this.bs||(big?'L':'M');if(A8&&A8.play)A8.play(s==='L'||big?'BOOM_L':s==='M'?'BOOM_M':'BOOM_S',at&&at.x,at&&at.y)});
hook(AudioFX.prototype,'power',function(o){if(this.mute8)return;A8.play('POWER')});
hook(AudioFX.prototype,'special',function(o){if(this.mute8)return;A8.play('POWER');A8.voice({f:130,f2:60,d:.35,type:'sawtooth',v:.4})});
AudioFX.prototype.shieldHit=function(x){A8.play('SHIELD',x,N8.g.player.y)};
AudioFX.prototype.hullHit=function(x){A8.play('HULL',x,N8.g.player.y)};

/* ---------- fire pipeline: v6/v7 weapons stay as-is, v8 adds ION/PARTICLE/ANTIMATTER/BARRAGE and post-processes every shot ---------- */
const HEATV=[0,0,0,0,0,0,0,10,3.4,25,38]; // heat for weapons handled here (index by W)
function mkB(g,x,y,vx,vy,col,d,r,pierce,style,wk){const b=new Bullet(x,y,vx,vy,col,false,d,r,0,style,pierce);b.wk=wk;g.bullets.push(b);return b}
function fireNew(g,p,k){
  const c=N8.W[k].c,mult=(p.active.BOOST?2.4:1);let ok=false;
  if(k===7&&p.energy>=6){ok=true;p.fireCooldown=Math.max(6,p.fireRate*1.25);p.energy-=6;mkB(g,p.x,p.y-24,0,-15,c,p.damage*.6,4.5,1+p.pierce,4,'ION').ion=1}
  else if(k===8&&p.energy>=1.2){ok=true;p.fireCooldown=Math.max(2,p.fireRate*.32);p.energy-=1.2;const s=(Math.random()-.5)*.9;mkB(g,p.x+(Math.random()-.5)*10,p.y-22,s,-17,c,p.damage*.55,3,p.pierce,0,'PARTICLE')}
  else if(k===9&&p.energy>=30){ok=true;p.fireCooldown=90;p.maxCd=90;p.energy-=30;for(let i=-2;i<=3;i++){const a=(i-.5)*.26,b=mkB(g,p.x+i*6,p.y-14,Math.sin(a)*6,-Math.cos(a)*6,c,p.damage*2.2,4,0,3,'BARRAGE');b.missile=1;b.splash=50}}
  else if(k===10&&p.energy>=40){ok=true;p.fireCooldown=150;p.maxCd=150;p.energy-=40;const b=mkB(g,p.x,p.y-26,0,-5.2,c,p.damage*14,13,99,5,'ANTIMATTER');b.am=1;g.v8.slow=Math.max(g.v8.slow,0)}
  else if(k>=7){if(!g.v8.noEn||g.v8.noEn<=0){g.toast('INSUFFICIENT ENERGY');g.v8.noEn=50}return false}
  if(ok){for(const b of g.bullets)if(b.wk&&!b.m8&&b.age===0){b.damage*=mult;b.m8=1}g.heat+=HEATV[k]}
  return ok}
hook(GE.prototype,'fire',function(o){
  const p=this.player;if(!p||p.fireCooldown>0)return;const m=this.wmode|0,W=N8.W[m],A=this.audio;
  if(!W){this.wmode=0;return}
  if(this.overheat){if(!this.ohMsg||this.ohMsg<=0){this.toast('WEAPON OVERHEATED');this.ohMsg=90}return}
  if(this.bullets.length>300)return;
  const v=p.v8,n0=this.bullets.length,cd0=p.fireCooldown;let fired=false;
  A.mute8=true;
  try{if(m>=7){fired=fireNew(this,p,m)}else{o.call(this);fired=p.fireCooldown>0||this.bullets.length>n0}}finally{A.mute8=false}
  if(!fired)return;
  // post-process everything just fired: weapon kind tag, class/buff damage, fire-rate mods, heat cooling, recoil, muzzle, sound
  const dm=N8.dmgMul(this),rm=N8.rateMul(this),ass=this.settings.assist;
  for(let i=n0;i<this.bullets.length;i++){const b=this.bullets[i];if(!b.wk)b.wk=W.k;if(!b.dm8){b.dm8=1;b.damage*=dm;if(m===4)b.damage*=1}}
  if(rm!==1&&p.fireCooldown>0)p.fireCooldown=Math.max(1,p.fireCooldown/rm);
  if(v&&v.od>0)this.heat=Math.max(0,this.heat-HEATV[m]-5);
  const rec={0:.5,1:2.4,2:3.4,3:2,4:0,5:2.2,6:1,7:2.4,8:.4,9:2,10:6}[m]||1;this.v8.recoil=Math.max(this.v8.recoil,rec);
  if(W.mz){this.v8.fx.push({t:'muz',x:p.x,y:p.y-26,r:W.mz*(1+(p.v8.od>0?.4:0)),c:W.c,life:1});p.v8.flare=Math.max(p.v8.flare,W.mz>14?4:2)}
  if(m===4){if(!this.laserSnd||this.laserSnd<=0){A8.play('LASER',p.x,p.y);this.laserSnd=5}}else if(!(m===0&&(this.v8.sndT=(this.v8.sndT||0)+1)%2)){A8.play(W.k,p.x,p.y)}
  if(m===2||m===10){N8.shake(this,m===10?7:2)}
  if(m===10)N8.flash(this,.08,'#ffffff');
});
/* laser beam has no bullet: mark ticks so damage scales with class/buffs, drawn in the overlay layer */
hook(GE.prototype,'update',function(o){o.call(this);const g=this,v=g.v8;if(!v||g.state!==GAME.PLAYING||!g.player)return;const p=g.player;
  if(v.noEn>0)v.noEn--;
  // extra heat cooling from upgrade tree / support class
  if(p.heatCool>1)g.heat=Math.max(0,g.heat-.55*(p.heatCool-1));
  // laser: v7 does damage each tick inside fire() with raw p.damage; add the class/buff scaling difference here as extra damage
  if(g.laserT>=3&&(g.wmode|0)===4){const dm=N8.dmgMul(g),extra=dm-1;if(Math.abs(extra)>.01){for(const e of N8.hostiles(g))if(e.y<p.y&&Math.abs(e.x-p.x)<(e.size||30)*.55+8){const d=p.damage*.42*extra;if(d>0)N8.hurt(g,e,d,'#ff6bd6',{x:e.x,y:e.y+e.size*.4})}}
    if(N8.q.fx&&v.t%4===0){const t=N8.nearest(g,p.x,p.y);const hit=N8.hostiles(g).filter(e=>e.y<p.y&&Math.abs(e.x-p.x)<(e.size||30)*.55+8).sort((a,b)=>b.y-a.y)[0];if(hit)v.fx.push({t:'spark',x:p.x,y:hit.y+hit.size*.45,n:3})}}
  // missiles: smoke trail, splash + wk tagging
  for(const b of g.bullets){if(b.dead||b.isEnemy)continue;
    if(b.missile){if(!b.wk)b.wk='MISSILE';if(N8.q.trail&&b.age%3===0&&v.fx.length<N8.q.fx)v.fx.push({t:'smoke',x:b.x-b.vx*.8,y:b.y-b.vy*.8,vx:0,vy:0,r:3,gr:.2,life:.7,dec:.04})}
    if(b.am){b.vy*=1.004;if(b.age%2===0&&v.fx.length<N8.q.fx)v.fx.push({t:'ring',x:b.x,y:b.y,r:4,max:30,life:.6,c:'#c9a0ff'});// antimatter pulls nearby enemies as it flies
      for(const e of g.enemies){if(e.dead)continue;const dx=b.x-e.x,dy=b.y-e.y,d=Math.hypot(dx,dy);if(d<200&&d>4){e.x+=dx/d*1.6;e.y+=dy/d*1.6}}}
    if(b.wk==='GRAVITY'&&b.age===1)b.color='#b56cff';
    if(b.wk==='ION'&&b.age%3===0&&N8.q.fx>50&&v.fx.length<N8.q.fx)v.fx.push({t:'streak',x:b.x,y:b.y,vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,life:.8,dec:.14})}
});

/* ---------- impacts: bullets that died on a hit this frame get weapon-specific impact + behavior ---------- */
N8.impact=(g,b,p)=>{
  const v=g.v8,x=b.x,y=b.y,wk=b.wk,c=b.color,room=N8.q.fx-v.fx.length;
  switch(wk){
   case'PULSE':v.fx.push({t:'spark',x,y,n:2});if(room>4)v.fx.push({t:'ring',x,y,r:2,max:14,life:.8,c});break;
   case'SCATTER':v.fx.push({t:'spark',x,y,n:2});break;
   case'RAILGUN':N8.boom(g,x,y,1,c,.7);break;
   case'PLASMA':N8.boom(g,x,y,1,c,.9);N8.aoe(g,x,y,70,p.damage*1.3*N8.dmgMul(g),c);g.v8.fx.push({t:'ring',x,y,r:6,max:70,life:1,c});break;
   case'ION':v.fx.push({t:'arc',x,y,life:1,n:3,c});v.fx.push({t:'ring',x,y,r:3,max:34,life:1,c:'#e8f6ff'});
     // ion arcs chain to nearby enemies: real extra shield damage
     for(const e of N8.hostiles(g)){if(e===g.boss)continue;if(Math.hypot(e.x-x,e.y-y)<130){N8.hurt(g,e,p.damage*.5*N8.dmgMul(g),c,{shieldMul:8,stun:e.sh>0?0:36,x:e.x,y:e.y});v.fx.push({t:'arc',x:e.x,y:e.y,fx:x,fy:y,life:1,c,n:1})}}break;
   case'PARTICLE':v.fx.push({t:'spark',x,y,n:2});break;
   case'BARRAGE':case'MISSILE':N8.boom(g,x,y,1,c,1);if(b.splash)N8.aoe(g,x,y,b.splash,b.damage*.5,c);break;
   case'ANTIMATTER':N8.boom(g,x,y,3,'#c9a0ff',.7);N8.aoe(g,x,y,170,p.damage*8*N8.dmgMul(g),'#c9a0ff');N8.slowmo(g,14);N8.shake(g,12);break;
   case'HEAVY':N8.boom(g,x,y,2,c,.8);N8.aoe(g,x,y,90,b.damage*.6,c);break;
   default:v.fx.push({t:'spark',x,y,n:2})}
};

/* ---------- projectile renderers ---------- */
function streak(c,b,len,w,col,a,ang){c.save();c.translate(b.x,b.y);c.rotate(ang);const gr=c.createLinearGradient(0,-len*.2,0,len);gr.addColorStop(0,N8.rgba(col,a));gr.addColorStop(1,N8.rgba(col,0));c.fillStyle=gr;c.fillRect(-w,-len*.2,w*2,len*1.2);c.restore()}
Bullet.prototype.draw=function(c){
  const ang=Math.atan2(this.vy,this.vx)+Math.PI/2,r=this.radius,col=this.color,x=this.x,y=this.y,t=this.age;
  c.globalCompositeOperation='lighter';
  if(this.isEnemy){N8.drawEnemyShot(c,this,ang);c.globalCompositeOperation='source-over';c.globalAlpha=1;return}
  switch(this.wk){
   case'PULSE':streak(c,this,r*7,r*.7,col,.6,ang);blit(c,col,r*3.2,x,y,.9);c.globalAlpha=1;c.fillStyle='#fff';c.save();c.translate(x,y);c.rotate(ang);c.fillRect(-r*.45,-r*1.6,r*.9,r*3.2);c.restore();break;
   case'SCATTER':streak(c,this,r*4,r*.55,col,.55,ang);blit(c,col,r*2.4,x,y,.9);break;
   case'RAILGUN':c.save();c.translate(x,y);c.rotate(ang);let gr=c.createLinearGradient(0,-8,0,90);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.15,N8.rgba(col,.9));gr.addColorStop(1,N8.rgba(col,0));c.fillStyle=gr;c.fillRect(-1.6,-10,3.2,100);c.globalAlpha=.35;c.fillRect(-4.5,-6,9,60);c.restore();blit(c,col,14,x,y,.8);break;
   case'PLASMA':{const s=r*(1.5+.18*Math.sin(t*.4));blit(c,'#7dff42',s*3,x,y,.85);c.globalAlpha=1;c.fillStyle='#eaffd6';c.beginPath();c.arc(x,y,s*.55,0,7);c.fill();c.strokeStyle='#7dff42';c.lineWidth=1.2;c.globalAlpha=.7;c.beginPath();c.arc(x,y,s*1.05,t*.2,t*.2+4);c.stroke();break}
   case'ION':{blit(c,col,r*4.2,x,y,.8);c.globalAlpha=1;c.strokeStyle='#eaf6ff';c.lineWidth=1.6;c.beginPath();c.moveTo(x,y+r*3);for(let i=1;i<=6;i++)c.lineTo(x+(Math.random()-.5)*r*2.6,y+r*3-i*r*1.1);c.stroke();c.fillStyle='#fff';c.beginPath();c.arc(x,y,r*.7,0,7);c.fill();break}
   case'PARTICLE':streak(c,this,r*6,r*.6,col,.6,ang);blit(c,col,r*2.6,x,y,.9);c.globalAlpha=1;c.fillStyle='#fff';c.beginPath();c.arc(x,y,r*.5,0,7);c.fill();break;
   case'NOVA':{const s=r*(1.6+.25*Math.sin(t*.3));blit(c,col,s*3.4,x,y,.8);c.globalAlpha=.9;c.strokeStyle='#fff3d0';c.lineWidth=1.5;c.beginPath();c.arc(x,y,s*1.2,0,7);c.stroke();c.fillStyle='#fff';c.beginPath();c.arc(x,y,s*.5,0,7);c.fill();break}
   case'GRAVITY':{c.globalAlpha=.8;c.strokeStyle='#b56cff';c.lineWidth=1.4;for(let i=0;i<3;i++){c.beginPath();c.arc(x,y,r*(1+i*.7)+Math.sin(t*.3+i)*1.5,t*.2+i,t*.2+i+3.6);c.stroke()}blit(c,'#7d4dff',r*3,x,y,.7);c.globalAlpha=1;c.fillStyle='#0a0416';c.beginPath();c.arc(x,y,r*.7,0,7);c.fill();break}
   case'BARRAGE':case'MISSILE':case'HEAVY':case'DRONE':{
     if(this.wk==='DRONE'){blit(c,col,r*3,x,y,.9);break}
     const big=this.wk==='HEAVY'?1.7:1;c.save();c.translate(x,y);c.rotate(ang);c.globalCompositeOperation='lighter';
     const fl=6+Math.random()*4;let g2=c.createLinearGradient(0,r*2,0,r*2+fl*big*2);g2.addColorStop(0,'rgba(255,255,255,.9)');g2.addColorStop(.3,N8.rgba('#ff9d2e',.8));g2.addColorStop(1,'rgba(255,80,0,0)');c.fillStyle=g2;c.beginPath();c.moveTo(-r*.8*big,r*2);c.lineTo(0,r*2+fl*big*2.4);c.lineTo(r*.8*big,r*2);c.fill();
     c.globalCompositeOperation='source-over';c.globalAlpha=1;c.fillStyle='#d8dde6';c.fillRect(-r*.7*big,-r*2.4*big,r*1.4*big,r*4.6*big);c.fillStyle='#ff5030';c.beginPath();c.moveTo(-r*.7*big,-r*2.4*big);c.lineTo(0,-r*3.6*big);c.lineTo(r*.7*big,-r*2.4*big);c.fill();c.fillStyle='#7f8794';c.fillRect(-r*1.5*big,r*1.2*big,r*.8*big,r*1.4*big);c.fillRect(r*.7*big,r*1.2*big,r*.8*big,r*1.4*big);c.restore();break}
   case'ANTIMATTER':{const s=r*(1.4+.15*Math.sin(t*.25));blit(c,'#c9a0ff',s*5,x,y,.7);c.globalCompositeOperation='source-over';c.globalAlpha=1;c.fillStyle='#050208';c.beginPath();c.arc(x,y,s*1.1,0,7);c.fill();c.globalCompositeOperation='lighter';c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(x,y,s*1.15,0,7);c.stroke();c.strokeStyle='#c9a0ff';c.lineWidth=1;for(let i=0;i<3;i++){c.beginPath();c.arc(x,y,s*(1.6+i*.5),t*.15*(i%2?-1:1),t*.15*(i%2?-1:1)+2.4);c.stroke()}break}
   default:streak(c,this,r*5,r*.6,col,.55,ang);blit(c,col,r*2.8,x,y,.85)}
  c.globalAlpha=1;c.globalCompositeOperation='source-over'};

/* ---------- enemy projectile renderers (distinct silhouettes per threat type) ---------- */
N8.shotKind=b=>{if(b.ek)return b.ek;if(b.homing>0)return'MISSILE';if(b.style===3&&b.speedHint>9)return'SNIPER';if(b.style===3)return'SNIPER';if(b.radius>=6)return'PLASMA';return'LASER'};
N8.drawEnemyShot=(c,b,ang)=>{
  const k=N8.shotKind(b),x=b.x,y=b.y,r=b.radius,t=b.age,col=b.color||'#ff3355';
  if(k==='LASER'){c.save();c.translate(x,y);c.rotate(ang);let gr=c.createLinearGradient(0,-r*4,0,r*3);gr.addColorStop(0,N8.rgba('#ff3355',0));gr.addColorStop(.5,N8.rgba('#ff3355',.9));gr.addColorStop(1,'rgba(255,255,255,.95)');c.fillStyle=gr;c.fillRect(-r*.55,-r*4,r*1.1,r*7);c.restore();blit(c,'#ff2244',r*2.6,x,y,.55)}
  else if(k==='PLASMA'){const s=r*(1.2+.12*Math.sin(t*.5));blit(c,'#ffa02e',s*3,x,y,.85);c.globalAlpha=1;c.fillStyle='#fff2c8';c.beginPath();c.arc(x,y,s*.5,0,7);c.fill();c.strokeStyle='#ff8a1e';c.lineWidth=1.4;c.beginPath();c.arc(x,y,s*.95,0,7);c.stroke()}
  else if(k==='MISSILE'){c.save();c.translate(x,y);c.rotate(ang);const fl=5+Math.random()*4;let g2=c.createLinearGradient(0,r*1.6,0,r*1.6+fl*2);g2.addColorStop(0,'rgba(255,255,255,.9)');g2.addColorStop(.4,'rgba(255,120,40,.8)');g2.addColorStop(1,'rgba(255,60,0,0)');c.fillStyle=g2;c.beginPath();c.moveTo(-r*.6,r*1.6);c.lineTo(0,r*1.6+fl*2.2);c.lineTo(r*.6,r*1.6+fl*2.2>0?r*1.6:0);c.fill();c.globalCompositeOperation='source-over';c.globalAlpha=1;c.fillStyle='#b8bcc6';c.fillRect(-r*.6,-r*2,r*1.2,r*3.6);c.fillStyle='#ff2a3a';c.beginPath();c.moveTo(-r*.6,-r*2);c.lineTo(0,-r*3.2);c.lineTo(r*.6,-r*2);c.fill();c.fillStyle='#ff2a3a';c.fillRect(-r*1.3,r*.6,r*.7,r*1.2);c.fillRect(r*.6,r*.6,r*.7,r*1.2);c.restore();
    c.globalAlpha=.5+.4*Math.sin(t*.5);c.strokeStyle='#ff2a3a';c.lineWidth=1.2;c.beginPath();c.arc(x,y,r*3.2,0,7);c.stroke()}
  else if(k==='MINE'){c.globalCompositeOperation='source-over';c.globalAlpha=1;c.save();c.translate(x,y);c.rotate(t*.02);c.fillStyle='#252a34';c.strokeStyle='#8a94a8';c.lineWidth=1.4;c.beginPath();c.arc(0,0,r*1.6,0,7);c.fill();c.stroke();c.strokeStyle='#8a94a8';for(let i=0;i<8;i++){const a=i*.7854;c.beginPath();c.moveTo(Math.cos(a)*r*1.6,Math.sin(a)*r*1.6);c.lineTo(Math.cos(a)*r*2.5,Math.sin(a)*r*2.5);c.stroke()}c.restore();
    const on=Math.floor(t/12)%2;c.globalCompositeOperation='lighter';blit(c,on?'#ff3030':'#661010',r*2.4,x,y,on?.9:.4);
    c.globalAlpha=.25;c.strokeStyle='#ff3030';c.setLineDash([3,4]);c.beginPath();c.arc(x,y,b.trig||60,0,7);c.stroke();c.setLineDash([])}
  else if(k==='WAVE'){const w=r*(2+t*.02);c.save();c.translate(x,y);c.rotate(ang);c.globalAlpha=.85;c.strokeStyle=col;c.lineWidth=3;c.beginPath();c.arc(0,r*2,w*1.6,-2.3,-.84);c.stroke();c.globalAlpha=.4;c.lineWidth=8;c.beginPath();c.arc(0,r*2,w*1.6,-2.3,-.84);c.stroke();c.restore()}
  else if(k==='SNIPER'){c.save();c.translate(x,y);c.rotate(ang);let gr=c.createLinearGradient(0,-90,0,16);gr.addColorStop(0,'rgba(190,120,255,0)');gr.addColorStop(.85,'rgba(220,170,255,.95)');gr.addColorStop(1,'#fff');c.fillStyle=gr;c.fillRect(-1.6,-90,3.2,106);c.globalAlpha=.3;c.fillRect(-4,-60,8,70);c.restore();blit(c,'#c07dff',9,x,y,.8)}
  c.globalAlpha=1};

/* ---------- missiles: HOMING / HEAVY / MICRO (selected in the armory) ---------- */
N8.MISSILES={HOMING:{n:'HOMING MISSILES',e:12,cd:90,d:'2 seeking missiles',dmg:'2 x 3.2x'},HEAVY:{n:'HEAVY MISSILE',e:18,cd:140,d:'1 slow warhead with splash',dmg:'1 x 7x AoE'},MICRO:{n:'MICRO SWARM',e:16,cd:110,d:'6 fast light missiles',dmg:'6 x 1.3x'}};
GE.prototype.fireMissiles=function(){
  const p=this.player;if(this.state!==GAME.PLAYING||!p||this.missileCd>0)return;const T=N8.MISSILES[p.v8&&N8.loadout?N8.loadout.missile:'HOMING']||N8.MISSILES.HOMING,ty=N8.loadout?N8.loadout.missile:'HOMING';
  if(p.energy<T.e){if(!this.v8.noEn||this.v8.noEn<=0){this.toast('INSUFFICIENT ENERGY');this.v8.noEn=50}return}
  p.energy-=T.e;this.missileCd=Math.round(T.cd*(p.cdMul||1)*(p.v8.focus>0?.3:1));this.v8.missMax=Math.max(1,this.missileCd);const dm=N8.dmgMul(this)*(p.missileMul||1);
  const mk=(x,y,vx,vy,d,r,wk)=>{const b=new Bullet(x,y,vx,vy,'#ff7a2e',false,d*dm,r,0,3,0);b.missile=true;b.wk=wk;b.dm8=1;this.bullets.push(b);return b};
  if(ty==='HEAVY'){const b=mk(p.x,p.y-10,0,-4,p.damage*7,7,'HEAVY');b.splash=1}
  else if(ty==='MICRO'){for(let i=0;i<6;i++){const a=(i-2.5)*.22;mk(p.x+(i-2.5)*5,p.y-8,Math.sin(a)*7,-Math.cos(a)*7,p.damage*1.3,3,'MISSILE')}}
  else{for(const s of[-1,1])mk(p.x+s*14,p.y-10,s*3,-7,p.damage*3.2,4.5,'MISSILE')}
  A8.play('MISSILE',p.x,p.y);this.v8.recoil=Math.max(this.v8.recoil,1.5);this.v8.fx.push({t:'muz',x:p.x,y:p.y-10,r:12,c:'#ff7a2e',life:1})};
hook(GE.prototype,'bind',function(o){o.call(this)}); // (v6's RMB listener already routes to g.fireMissiles)

/* ---------- weapon switching: Q next / Shift+Q previous / wheel / Shift+1..0 direct / X swap primary<->secondary ---------- */
N8.selectWeapon=(g,i,quiet)=>{const n=N8.W.length;i=((i%n)+n)%n;if(!N8.weaponUnlocked(i)){g.toast(`${N8.W[i].n} UNLOCKS AT PILOT LEVEL ${N8.W[i].lvl}`);return false}
  g.wmode=i;if(!quiet){A8.voice({f:1000,f2:1400,d:.06,type:'square',v:.2});g.v8.wsw=50;g.v8.wswT=N8.W[i]}return true};
N8.stepWeapon=(g,dir)=>{const n=N8.W.length;for(let k=1;k<=n;k++){const i=(((g.wmode|0)+dir*k)%n+n)%n;if(N8.weaponUnlocked(i)){N8.selectWeapon(g,i);return}}};
GE.prototype.cycleWeapon=function(dir){N8.stepWeapon(this,dir===-1||(dir===undefined&&this.keys.Shift)?-1:1)};
GE.prototype.updateWeaponHud=function(){this.hudT=0};
hook(GE.prototype,'bind',function(o){o.call(this);const g=this;
  window.addEventListener('keydown',e=>{if(e.repeat||g.state!==GAME.PLAYING)return;const k=(e.key||'').toLowerCase();
    if(k==='x'&&N8.loadout){const l=N8.loadout,a=g.wmode|0;if(l.secondary!==a&&N8.weaponUnlocked(l.secondary)){l.primary=a;const s=l.secondary;l.secondary=a;N8.selectWeapon(g,s)}}
    else if(/^Digit[0-9]$/.test(e.code||'')&&e.shiftKey){const d=+e.code.slice(5);N8.selectWeapon(g,d===0?9:d-1)}
    else if((e.code==='Minus'||e.code==='Equal')&&e.shiftKey){N8.selectWeapon(g,e.code==='Minus'?9:10)}
  },true);
  // Shift+Q: v6 also handles Q; both listeners are capture-phase so stop before v6 sees the shifted variant
  g.canvas.addEventListener('wheel',e=>{if(g.state!==GAME.PLAYING)return;e.preventDefault();N8.stepWeapon(g,e.deltaY>0?1:-1)},{passive:false});
});
/* Q (unshifted) is handled by v6's bind listener which calls g.cycleWeapon() -> next weapon; we only need to make sure it passes no arg */
hook(GE.prototype,'startGame',function(o,...a){o.apply(this,a);const l=N8.loadout;if(l){this.wmode=N8.weaponUnlocked(l.primary)?l.primary:0}this.v8.wsw=0});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v8-weapons.js');
