'use strict';
/* NEBULA PROTOCOL v8 // REALISTIC WARFRONT — core layer.
   Loaded after script.js, v6.js, v7.js. Same hook pattern as v6/v7: prototypes are patched, no second game loop.
   This file owns: shared N8 namespace, quality tiers, sectors, procedural parallax environment,
   layered explosions, fake dynamic lighting, slow-motion, and the single update/draw pipelines
   that the other v8 files plug into (N8.pre / N8.post / N8.addDraw). */
(()=>{
const N8=window.N8={ver:'v8'};
const $=N8.$=id=>document.getElementById(id);
const clamp=N8.clamp=(v,a,b)=>v<a?a:v>b?b:v;
const rnd=N8.rnd=(a,b)=>a+Math.random()*(b-a);
const hook=N8.hook=(o,name,fn)=>{const f=o[name];o[name]=function(...a){return fn.call(this,f,...a)}};
const mulberry=N8.rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const GE=GameEngine;
N8.pre=[];N8.post=[];N8.resetFns=[];N8.draws=[];
N8.addDraw=(z,fn)=>{N8.draws.push({z,fn});N8.draws.sort((a,b)=>a.z-b.z)};

/* ---------- quality tiers: each level changes particles, background, VFX, debris, lighting, explosion quality ---------- */
N8.QUALITY={
  LOW:{part:200,stars:70,neb:2,rocks:5,structs:1,fx:45,debris:.35,light:false,dust:10,fleet:0,scale:.45,storm:false,glow:false,smoke:false,trail:false},
  MEDIUM:{part:450,stars:130,neb:3,rocks:9,structs:2,fx:100,debris:.6,light:true,dust:22,fleet:1,scale:.6,storm:true,glow:true,smoke:true,trail:true},
  HIGH:{part:700,stars:200,neb:5,rocks:14,structs:3,fx:190,debris:1,light:true,dust:36,fleet:2,scale:.75,storm:true,glow:true,smoke:true,trail:true},
  ULTRA:{part:1100,stars:300,neb:7,rocks:20,structs:4,fx:320,debris:1.5,light:true,dust:56,fleet:3,scale:1,storm:true,glow:true,smoke:true,trail:true}
};
N8.q=N8.QUALITY.HIGH;

/* ---------- sectors: every 10 levels = 1 sector; six visual/tactical identities cycle across the 1000 sectors ---------- */
N8.SECTORS=[
 {n:'ORBITAL FRONTIER',sky:['#030a1c','#0b2350'],neb:['#2f8cff','#5fd8ff'],planet:['#4f8fd8','#0d2a5a','#8fd0ff',0],moons:1,rocks:.3,structs:2,wreck:.1,storm:0,fleet:1,acc:'#38d9ff',rock:['#8a8f99','#23262d'],hull:'#6d7f99',
  comp:{FIGHTER:5,SWARM:2,INTERCEPTOR:2,SNIPER:1},form:['V','LINE','WEDGE'],diff:1,bclass:'ORBITAL DREADNOUGHT',haz:['laser','rock'],obj:['DESTROY_ALL','DESTROY_BOMBER','SURVIVE','PROTECT_CARRIER']},
 {n:'NEBULA RIFT',sky:['#0c0320','#2a0a52'],neb:['#c04dff','#ff4fa8'],planet:['#8a3fd0','#240a4a','#e59bff',1],moons:2,rocks:.15,structs:1,wreck:.1,storm:.9,fleet:1,acc:'#e07bff',rock:['#9a8aa8','#2a2033'],hull:'#8a6fa8',
  comp:{INTERCEPTOR:4,FIGHTER:3,ASSASSIN:2,SHIELD_DRONE:2,HUNTER:1},form:['PINCER','SWARM','V'],diff:1.08,bclass:'RIFT STALKER',haz:['gravity','wave'],obj:['COLLECT_CORES','DESTROY_GENS','SURVIVE','ESCORT']},
 {n:'VOID GRAVEYARD',sky:['#02030a','#10111c'],neb:['#3c4a66','#6b7a99'],planet:['#4a4f5c','#0c0d14','#9aa6c0',0],moons:0,rocks:.35,structs:2,wreck:1,storm:.2,fleet:0,acc:'#9db4d9',rock:['#6f7078','#1b1c20'],hull:'#5d6675',
  comp:{FIGHTER:3,BOMBER:3,SNIPER:2,HUNTER:2,CARRIER:1},form:['LINE','ESCORT','CARRIER GROUP'],diff:1.15,bclass:'GRAVEYARD SOVEREIGN',haz:['mine','rock'],obj:['DESTROY_BOMBER','CLEAR_ASTEROIDS','PROTECT_CARRIER','DEFEAT_COMMANDER']},
 {n:'ASTEROID WARZONE',sky:['#120802','#3a1a08'],neb:['#ff7a2e','#ffb347'],planet:['#a8582c','#2a1206','#ffc487',0],moons:1,rocks:1,structs:1,wreck:.3,storm:.4,fleet:2,acc:'#ff9a4d',rock:['#a08060','#2e2015'],hull:'#8a6a4a',
  comp:{FIGHTER:3,INTERCEPTOR:2,BOMBER:2,SNIPER:2,ELITE:1},form:['WEDGE','PINCER','SWARM'],diff:1.22,bclass:'SIEGE TITAN',haz:['rock','laser'],obj:['CLEAR_ASTEROIDS','DEFEAT_COMMANDER','SURVIVE','COLLECT_CORES']},
 {n:'DEEP SPACE',sky:['#00020a','#05102a'],neb:['#2a4cff','#00e0c0'],planet:['#3a5a9a','#050c22','#7fb0ff',1],moons:0,rocks:.1,structs:1,wreck:.15,storm:.3,fleet:3,acc:'#5f9bff',rock:['#7a8090','#1a1d26'],hull:'#5f7090',
  comp:{HUNTER:3,SNIPER:3,ASSASSIN:2,INTERCEPTOR:2,CARRIER:1,ELITE:1},form:['V','ESCORT','CARRIER GROUP'],diff:1.28,bclass:'VOID LEVIATHAN',haz:['gravity','laser'],obj:['ESCORT','DESTROY_GENS','DEFEAT_COMMANDER','SURVIVE']},
 {n:'ALIEN FRONT',sky:['#031a0c','#0c4a24'],neb:['#42ff7a','#c5ff3a'],planet:['#3ab05a','#0a2a14','#b6ffcc',0],moons:2,rocks:.2,structs:0,wreck:.2,storm:.7,fleet:2,acc:'#5dff8a',rock:['#6a8a6a','#1a2a1c'],hull:'#4f9a6a',
  comp:{ELITE:2,ASSASSIN:3,HUNTER:2,SHIELD_DRONE:2,BOMBER:2,CARRIER:2},form:['SWARM','PINCER','CARRIER GROUP','WEDGE'],diff:1.35,bclass:'HIVE OVERMIND',haz:['mine','wave'],obj:['DESTROY_GENS','DEFEAT_COMMANDER','PROTECT_CARRIER','COLLECT_CORES']}
];
N8.sectorNo=L=>Math.max(1,Math.ceil((L|0||1)/10));
N8.sectorIdx=L=>(N8.sectorNo(L)-1)%N8.SECTORS.length;
N8.sectorOf=L=>N8.SECTORS[N8.sectorIdx(L)];
N8.sectorLabel=L=>`SECTOR ${String(N8.sectorNo(L)).padStart(3,'0')} · ${N8.sectorOf(L).n}`;

/* ---------- per-run state ---------- */
N8.resetRun=g=>{g.v8={fx:[],lights:[],slow:0,st:false,sflash:0,sflashC:'#fff',zoom:1,warp:0,storm:{t:180,flash:0,bolt:null},recoil:0,hitFlash:0,haz:[],obj:null,objE:[],ally:null,cine:null,crit:0,lightList:[],off:0,t:0}};
hook(GE.prototype,'bind',function(o){o.call(this);N8.resetRun(this)});
hook(GE.prototype,'startGame',function(o,...a){N8.resetRun(this);for(const f of N8.resetFns)f(this);N8.env=null;o.apply(this,a)});
hook(GE.prototype,'exitGame',function(o){const r=o.call(this);N8.resetRun(this);for(const f of N8.resetFns)f(this);return r});
hook(GE.prototype,'applySettings',function(o){o.call(this);N8.q=N8.QUALITY[this.settings.quality]||N8.QUALITY.HIGH;this.maxParticles=N8.q.part;N8.env=null});

/* ---------- cheaper, prettier particles: halo instead of per-particle shadowBlur ---------- */
Particle.prototype.draw=function(c){const a=Math.max(0,this.life);if(a<=0)return;c.globalAlpha=a;c.fillStyle=this.color;c.beginPath();c.arc(this.x,this.y,this.size,0,6.2832);c.fill();if(N8.q.glow&&this.size>1.6){c.globalAlpha=a*.25;c.beginPath();c.arc(this.x,this.y,this.size*2.4,0,6.2832);c.fill()}c.globalAlpha=1};

/* ---------- procedural sprites ---------- */
const cv=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(2,Math.ceil(w));c.height=Math.max(2,Math.ceil(h));return c};
function makePlanet(r,cols,gas,R,sc){
  const d=Math.ceil(r*2*sc)+6,C=cv(d,d),c=C.getContext('2d'),m=d/2,rr=d/2-3;
  c.save();c.beginPath();c.arc(m,m,rr,0,7);c.clip();
  let g=c.createLinearGradient(0,0,d,d);g.addColorStop(0,cols[0]);g.addColorStop(1,cols[1]);c.fillStyle=g;c.fillRect(0,0,d,d);
  if(gas){for(let i=0;i<11;i++){c.globalAlpha=.1+R()*.18;c.fillStyle=R()<.5?cols[0]:cols[1];c.fillRect(0,R()*d,d,d*(.02+R()*.09))}}
  else{for(let i=0;i<16;i++){const x=R()*d,y=R()*d,s=d*(.04+R()*.13);g=c.createRadialGradient(x,y,0,x,y,s);const dark=R()<.55;g.addColorStop(0,dark?'rgba(0,0,0,.35)':'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha=1;c.fillStyle=g;c.fillRect(x-s,y-s,s*2,s*2)}}
  c.globalAlpha=1;g=c.createRadialGradient(m-rr*.45,m-rr*.45,rr*.1,m-rr*.15,m-rr*.15,rr*1.4);g.addColorStop(0,'rgba(255,255,255,.2)');g.addColorStop(.45,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,12,.94)');c.fillStyle=g;c.fillRect(0,0,d,d);c.restore();
  g=c.createRadialGradient(m,m,rr*.86,m,m,rr*1.05);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.7,cols[2]+'55');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.beginPath();c.arc(m,m,rr*1.05,0,7);c.fill();
  return C}
function makeRock(s,tint,R){
  const d=Math.ceil(s*2.4),C=cv(d,d),c=C.getContext('2d'),m=d/2,n=9+Math.floor(R()*4);
  c.beginPath();for(let i=0;i<n;i++){const a=i/n*6.2832,r=s*(.72+R()*.3);c[i?'lineTo':'moveTo'](m+Math.cos(a)*r,m+Math.sin(a)*r)}c.closePath();
  const g=c.createRadialGradient(m-s*.35,m-s*.35,s*.1,m,m,s*1.1);g.addColorStop(0,tint[0]);g.addColorStop(1,tint[1]);c.fillStyle=g;c.fill();
  c.save();c.clip();for(let i=0;i<5;i++){const x=m+(R()-.5)*s*1.2,y=m+(R()-.5)*s*1.2,r=s*(.08+R()*.14);c.fillStyle='rgba(0,0,0,.28)';c.beginPath();c.arc(x,y,r,0,7);c.fill();c.strokeStyle='rgba(255,255,255,.12)';c.beginPath();c.arc(x-r*.2,y-r*.2,r,3.6,5.6);c.stroke()}
  const sh=c.createLinearGradient(m-s,m-s,m+s,m+s);sh.addColorStop(0,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,8,.7)');c.fillStyle=sh;c.fillRect(0,0,d,d);c.restore();
  return C}
function makeStation(s,col,acc,R){
  const d=Math.ceil(s*2.6),C=cv(d,d),c=C.getContext('2d'),m=d/2;
  c.strokeStyle=col;c.lineWidth=s*.09;c.beginPath();c.ellipse(m,m,s*.95,s*.34,.35,0,7);c.stroke();
  c.fillStyle=col;for(let i=0;i<4;i++){const a=i*1.5708+.35;c.save();c.translate(m,m);c.rotate(a);c.fillRect(s*.1,-s*.03,s*.85,s*.06);c.restore()}
  const g=c.createRadialGradient(m-s*.1,m-s*.1,2,m,m,s*.42);g.addColorStop(0,'#c9d6ea');g.addColorStop(1,'#2a3446');c.fillStyle=g;c.beginPath();c.arc(m,m,s*.4,0,7);c.fill();
  c.fillStyle='#1c2a44';c.fillRect(m-s*.95,m-s*.5,s*.28,s*.14);c.fillRect(m+s*.67,m+s*.36,s*.28,s*.14);
  c.fillStyle=acc;for(let i=0;i<7;i++){c.globalAlpha=.9;c.fillRect(m+(R()-.5)*s*1.5,m+(R()-.5)*s*.6,2,2)}return C}
function makeWreck(s,col,R){
  const d=Math.ceil(s*2.4),C=cv(d,d),c=C.getContext('2d'),m=d/2;
  for(let k=0;k<3;k++){c.save();c.translate(m+(R()-.5)*s*.9,m+(R()-.5)*s*.6);c.rotate(R()*6.28);c.fillStyle=col;c.beginPath();c.moveTo(-s*.5,0);c.lineTo(-s*.1,-s*.22);c.lineTo(s*.4,-s*.08);c.lineTo(s*.55,s*.12);c.lineTo(0,s*.2);c.closePath();c.fill();c.strokeStyle='rgba(0,0,0,.5)';c.stroke();c.fillStyle='rgba(255,140,40,.8)';c.fillRect(s*.1,-s*.05,3,3);c.restore()}return C}

/* ---------- environment build (once per level / resize / quality change) ---------- */
function buildEnv(g){
  const W=g.canvas.width,H=g.canvas.height,q=N8.q,L=Math.max(1,g.level|0),sec=N8.sectorOf(L),R=mulberry(L*7919+N8.sectorNo(L)*31+5);
  const env={L,W,H,sec,q,off:0,stars:[],rocks:[],structs:[],fleets:[],dust:[],planets:[],rockImgs:[]};
  // nebula sky (wrapping vertically)
  const sc=q.scale,ch=Math.ceil(H*1.7),sky=cv(W*sc,ch*sc),c=sky.getContext('2d');c.scale(sc,sc);
  let g0=c.createLinearGradient(0,0,0,ch);g0.addColorStop(0,sec.sky[0]);g0.addColorStop(.5,sec.sky[1]);g0.addColorStop(1,sec.sky[0]);c.fillStyle=g0;c.fillRect(0,0,W,ch);
  for(let i=0;i<q.neb*2;i++){const x=R()*W,y=R()*ch,r=140+R()*Math.max(W,H)*.34,col=sec.neb[i%2],a=Math.floor((.05+R()*.09)*255).toString(16).padStart(2,'0');
    for(const yy of[y,y-ch,y+ch]){const g1=c.createRadialGradient(x,yy,0,x,yy,r);g1.addColorStop(0,col+a);g1.addColorStop(.6,col+'12');g1.addColorStop(1,col+'00');c.fillStyle=g1;c.fillRect(x-r,yy-r,r*2,r*2)}}
  for(let i=0;i<q.neb;i++){const y=R()*ch,x=R()*W,w=W*(.4+R()*.7),h=30+R()*70;for(const yy of[y,y-ch,y+ch]){c.save();c.translate(x,yy);c.rotate(-.5+R());const g1=c.createRadialGradient(0,0,0,0,0,w/2);g1.addColorStop(0,'rgba(0,0,0,.28)');g1.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g1;c.scale(1,h/w*2);c.beginPath();c.arc(0,0,w/2,0,7);c.fill();c.restore()}}
  env.sky=sky;env.skyH=ch;
  // planet + moons
  const pr=Math.min(W,H)*(.16+R()*.14),pc=sec.planet;
  env.planets.push({img:makePlanet(pr,pc,pc[3]===1,R,sc),r:pr,x:W*(.15+R()*.7),y0:R()*H,par:.05,ring:R()<.4,ringA:-.35+R()*.7,acc:pc[2]});
  for(let i=0;i<sec.moons;i++){const mr=pr*(.16+R()*.14);env.planets.push({img:makePlanet(mr,['#9aa0aa','#1d2028','#c0c8d8',0],false,R,sc),r:mr,x:W*(.1+R()*.8),y0:R()*H,par:.09+R()*.05})}
  // stars: 3 parallax layers
  for(let i=0;i<q.stars;i++){const l=i%3;env.stars.push({x:R()*W,y:R()*H,l,s:l===2?1.9:l===1?1.3:.8,tw:R()*6.28,a:.25+R()*.55})}
  // asteroid sprites + field
  for(let i=0;i<6;i++)env.rockImgs.push(makeRock(28+i*6,sec.rock,R));
  const nr=Math.round(q.rocks*(.4+sec.rocks));
  for(let i=0;i<nr;i++){const far=R();env.rocks.push({x:R()*W,y:R()*H*1.3-H*.15,img:i%6,sz:.35+far*.9,par:.25+far*1.3,rot:R()*6.28,vr:(R()-.5)*.02,a:.35+far*.5})}
  // stations + wrecks (far layer)
  const ns=Math.min(q.structs,sec.structs),nw=Math.round(q.structs*sec.wreck*2);
  for(let i=0;i<ns;i++)env.structs.push({img:makeStation(46+R()*30,sec.hull,sec.acc,R),x:R()*W,y0:R()*H,par:.13,a:.55,rot:-.4+R()*.8,blink:R()*6});
  for(let i=0;i<nw;i++)env.structs.push({img:makeWreck(30+R()*36,sec.hull,R),x:R()*W,y0:R()*H,par:.18+R()*.1,a:.6,rot:R()*6.28,vr:(R()-.5)*.004});
  // distant fleets
  for(let i=0;i<Math.min(q.fleet,sec.fleet);i++){const n=5+Math.floor(R()*7);env.fleets.push({x:R()*W,y0:R()*H,par:.28,n,sp:8+R()*6,dir:R()<.5?-1:1,flash:0})}
  // cosmic dust streaks
  for(let i=0;i<q.dust;i++)env.dust.push({x:R()*W,y:R()*H,l:.4+R()*1.3,len:6+R()*18});
  return env}
N8.ensureEnv=g=>{const e=N8.env;if(!e||e.L!==Math.max(1,g.level|0)||Math.abs(e.W-g.canvas.width)>2||Math.abs(e.H-g.canvas.height)>2||e.q!==N8.q){const off=e?e.off:0;N8.env=buildEnv(g);N8.env.off=off}return N8.env};

/* ---------- environment drawing (parallax layers, back to front) ---------- */
function drawEnv(g,c){
  const env=N8.ensureEnv(g),W=env.W,H=env.H,v=g.v8,sec=env.sec,off=env.off,p=g.player,playing=g.state===GAME.PLAYING||g.state===GAME.PAUSED;
  if(g.state===GAME.MENU||g.state===GAME.GAMEOVER)env.off+=.35;
  const px=playing&&p?(p.x-W/2):0,warp=v.warp;
  c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';
  // 1. sky + nebula
  const sy=-((off*.06)%env.skyH);c.drawImage(env.sky,-px*.008,sy,W,env.skyH);c.drawImage(env.sky,-px*.008,sy+env.skyH,W,env.skyH);if(sy+env.skyH*2<H)c.drawImage(env.sky,-px*.008,sy+env.skyH*2,W,env.skyH);
  // 2. deep stars
  c.fillStyle='#dff3ff';const t=v.t*.03;
  for(const s of env.stars){if(s.l!==0)continue;const y=(s.y+off*.12)%H;c.globalAlpha=s.a*(.7+.3*Math.sin(t+s.tw));c.fillRect(s.x-px*.01,y,s.s,s.s)}
  // 3. planets/moons
  for(const pl of env.planets){const span=H+pl.r*4,y=((pl.y0+off*pl.par)%span)-pl.r*2,x=pl.x-px*pl.par*.12;
    if(pl.ring){c.save();c.translate(x,y);c.rotate(pl.ringA);c.globalAlpha=.35;c.strokeStyle=pl.acc;c.lineWidth=pl.r*.09;c.beginPath();c.ellipse(0,0,pl.r*1.65,pl.r*.36,0,Math.PI,6.2832);c.stroke();c.restore()}
    c.globalAlpha=1;c.drawImage(pl.img,x-pl.r-3,y-pl.r-3,pl.r*2+6,pl.r*2+6);
    if(pl.ring){c.save();c.translate(x,y);c.rotate(pl.ringA);c.globalAlpha=.55;c.strokeStyle=pl.acc;c.lineWidth=pl.r*.09;c.beginPath();c.ellipse(0,0,pl.r*1.65,pl.r*.36,0,0,Math.PI);c.stroke();c.restore()}}
  // 4. storm lightning (behind everything but planets)
  if(N8.q.storm&&sec.storm>0){if(v.storm.flash>0){c.globalAlpha=v.storm.flash*.13;c.fillStyle=sec.acc;c.fillRect(0,0,W,H)}
    if(v.storm.bolt&&v.storm.flash>.15){c.globalAlpha=v.storm.flash*.9;c.strokeStyle=sec.neb[1];c.lineWidth=2;c.beginPath();v.storm.bolt.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke()}}
  // 5. mid stars
  c.fillStyle='#ffffff';
  for(const s of env.stars){if(s.l!==1)continue;const y=(s.y+off*.3)%H;c.globalAlpha=s.a*(.75+.25*Math.sin(t*1.3+s.tw));c.fillRect(s.x-px*.02,y,s.s,s.s+warp*3)}
  // 6. stations, wreckage, distant fleets
  for(const s of env.structs){const span=H+300,y=((s.y0+off*s.par)%span)-150,x=s.x-px*s.par*.1;c.save();c.translate(x,y);c.rotate((s.rot||0)+(s.vr?off*s.vr:0));c.globalAlpha=s.a;c.drawImage(s.img,-s.img.width/2,-s.img.height/2);
    if(s.blink!==undefined&&Math.sin(v.t*.06+s.blink)>.6){c.globalAlpha=.9;c.fillStyle=sec.acc;c.fillRect(-2,-2,4,4)}c.restore()}
  for(const f of env.fleets){const span=H+200,y=((f.y0+off*f.par)%span)-100,x0=f.x-px*.03+Math.sin(v.t*.004+f.y0)*20;c.globalAlpha=.55;c.fillStyle=sec.hull;
    for(let i=0;i<f.n;i++){const x=x0+(i%2?1:-1)*Math.ceil(i/2)*14,yy=y+Math.ceil(i/2)*11;c.beginPath();c.moveTo(x,yy-4);c.lineTo(x+3.5,yy+4);c.lineTo(x-3.5,yy+4);c.closePath();c.fill()}
    c.fillStyle=sec.acc;c.globalAlpha=.8;for(let i=0;i<f.n;i++){const x=x0+(i%2?1:-1)*Math.ceil(i/2)*14,yy=y+Math.ceil(i/2)*11;c.fillRect(x-.5,yy+4,1.5,1.5)}
    if(f.flash>0){c.globalAlpha=f.flash;c.fillStyle='#ffd9a0';c.beginPath();c.arc(x0+40*f.dir,y+30,6,0,7);c.fill()}}
  // 7. asteroid field (parallax 0.25-1.5x)
  for(const r of env.rocks){const sz=r.sz,span=H+200,y=((r.y+off*r.par)%span)-100,x=r.x-px*r.par*.05,im=env.rockImgs[r.img];c.save();c.translate(x,y);c.rotate(r.rot+off*r.vr);c.globalAlpha=r.a;c.drawImage(im,-im.width*sz/2,-im.height*sz/2,im.width*sz,im.height*sz);c.restore()}
  // 8. near stars + dust streaks (speed cues)
  c.fillStyle='#ffffff';
  for(const s of env.stars){if(s.l!==2)continue;const y=(s.y+off*.7)%H;c.globalAlpha=s.a;c.fillRect(s.x-px*.035,y,s.s,s.s+1+warp*14)}
  if(N8.q.dust){c.strokeStyle=sec.acc;c.lineWidth=1;const spd=1+warp*6;c.globalAlpha=.12+warp*.25;c.beginPath();for(const d of env.dust){const y=(d.y+off*d.l*1.6)%H;c.moveTo(d.x-px*.05*d.l,y);c.lineTo(d.x-px*.05*d.l,y+d.len*spd)}c.stroke()}
  // vignette
  c.globalAlpha=1;const vg=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.45,W/2,H/2,Math.max(W,H)*.85);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,6,.5)');c.fillStyle=vg;c.fillRect(0,0,W,H);
}
GE.prototype.drawBackground=function(){drawEnv(this,this.ctx)};

/* ---------- layered explosions ---------- */
N8.boom=(g,x,y,size,color,sc=1)=>{
  const v=g.v8,q=N8.q,fx=v.fx,room=q.fx-fx.length,col=color||'#ff9d2e';
  if(size>=1)v.lights.push({x,y,r:[0,120,220,380][size]*sc,c:col,life:12,max:12});
  if(room<=0&&size<2)return;
  const R=[8,16,30,52][size]*sc;
  fx.push({t:'spark',x,y,n:[3,8,16,30][size]});
  if(size>=1){fx.push({t:'flash',x,y,r:[0,55,110,200][size]*sc,life:1,c:'#fff'});fx.push({t:'ring',x,y,r:6,max:[0,60,120,250][size]*sc,life:1,c:col})}
  if(size>=1&&room>6){const n=[0,2,4,7][size];for(let i=0;i<n;i++){const a=Math.random()*6.28,d=Math.random()*R*.6;fx.push({t:'fire',x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,r:R*(.35+Math.random()*.4),life:1,dec:.03+Math.random()*.02,c:col})}}
  if(size>=1&&room>12){const n=Math.round([0,3,7,16][size]*q.debris);for(let i=0;i<n;i++){const a=Math.random()*6.28,s=1.2+Math.random()*[0,3,5,8][size];fx.push({t:'deb',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,rot:Math.random()*6.28,vr:(Math.random()-.5)*.4,s:2+Math.random()*[0,3,4,6][size],life:1,c:i%3?'#39404d':col})}}
  if(q.smoke&&size>=1&&room>20){const n=[0,1,3,6][size];for(let i=0;i<n;i++)fx.push({t:'smoke',x:x+(Math.random()-.5)*R,y:y+(Math.random()-.5)*R,vx:(Math.random()-.5)*.6,vy:-.2+Math.random()*.5,r:R*.5,gr:.5+Math.random()*.6,life:1,dec:.008+Math.random()*.008})}
  if(size>=2)v.sflash=Math.max(v.sflash,[0,0,.16,.4][size]),v.sflashC=col;
  if(size>=2)g.cameraShake=Math.max(g.cameraShake,[0,0,3,9][size]);
};
hook(GE.prototype,'explode',function(o,x,y,color,count=16,big=false){
  const a=this.audio;if(a){a.at={x,y};a.bs=big?'L':count>=24?'M':count>=11?'S':'T'}o.call(this,x,y,color,count,big);if(a)a.at=null;
  if(!this.v8||this.v8.mute)return;const size=big?(count>=100?3:2):count>=24?2:count>=11?1:0;N8.boom(this,x,y,size,color)});
function updateFx(g){
  const v=g.v8,fx=v.fx;
  for(let i=fx.length-1;i>=0;i--){const f=fx[i];
    if(f.t==='spark'){const sp=f.n;for(let k=0;k<sp&&fx.length<N8.q.fx+40;k++){const a=Math.random()*6.28,s=3+Math.random()*9;fx.push({t:'streak',x:f.x,y:f.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,dec:.05+Math.random()*.05})}fx.splice(i,1);continue}
    if(f.t==='muz'){f.life-=.26}else if(f.t==='arc'){f.life-=.12}
    else if(f.t==='flash'){f.life-=.11}else if(f.t==='ring'){f.r+=(f.max-f.r)*.14+1.5;f.life-=.055}
    else if(f.t==='fire'){f.r*=1.045;f.life-=f.dec;f.y-=.15}
    else if(f.t==='deb'){f.x+=f.vx;f.y+=f.vy;f.vx*=.985;f.vy*=.985;f.rot+=f.vr;f.life-=.014}
    else if(f.t==='smoke'){f.x+=f.vx;f.y+=f.vy;f.r+=f.gr;f.life-=f.dec}
    else if(f.t==='streak'){f.x+=f.vx;f.y+=f.vy;f.vx*=.94;f.vy*=.94;f.life-=f.dec}
    if(f.life<=0)fx.splice(i,1)}
  for(let i=v.lights.length-1;i>=0;i--){if(--v.lights[i].life<=0)v.lights.splice(i,1)}
  if(v.sflash>0)v.sflash*=.86;if(v.sflash<.01)v.sflash=0;
  if(v.zoom!==1)v.zoom+=(1-v.zoom)*.04;if(v.warp>0)v.warp=Math.max(0,v.warp-.045);if(v.recoil>0)v.recoil*=.7;if(v.hitFlash>0)v.hitFlash--;
  // storm lightning scheduler
  const sec=N8.sectorOf(g.level),s=v.storm;if(s.flash>0)s.flash-=.06;
  if(sec.storm>0&&N8.q.storm&&--s.t<=0){s.t=(120+Math.random()*420)/sec.storm;s.flash=1;const W=g.canvas.width,H=g.canvas.height;let x=Math.random()*W,y=0;s.bolt=[[x,y]];while(y<H*(.3+Math.random()*.4)){x+=(Math.random()-.5)*60;y+=20+Math.random()*30;s.bolt.push([x,y])}}
  const env=N8.env;if(env){for(const f of env.fleets)if(f.flash>0)f.flash-=.05;else if(Math.random()<.004)f.flash=.9}
}
function drawFx(g,c){
  const fx=g.v8.fx;if(!fx.length)return;c.save();
  for(const f of fx){
    if(f.t==='flash'){c.globalCompositeOperation='lighter';c.globalAlpha=Math.max(0,f.life);const gr=c.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r);gr.addColorStop(0,'#fff');gr.addColorStop(.4,'rgba(255,240,200,.5)');gr.addColorStop(1,'rgba(255,200,120,0)');c.fillStyle=gr;c.fillRect(f.x-f.r,f.y-f.r,f.r*2,f.r*2)}
    else if(f.t==='ring'){c.globalCompositeOperation='lighter';c.globalAlpha=Math.max(0,f.life)*.7;c.strokeStyle=f.c;c.lineWidth=2+f.life*5;c.beginPath();c.arc(f.x,f.y,f.r,0,6.2832);c.stroke()}
    else if(f.t==='fire'){c.globalCompositeOperation='lighter';c.globalAlpha=Math.max(0,f.life);const gr=c.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r);gr.addColorStop(0,'#fff6d0');gr.addColorStop(.35,f.c);gr.addColorStop(1,'rgba(120,20,0,0)');c.fillStyle=gr;c.beginPath();c.arc(f.x,f.y,f.r,0,6.2832);c.fill()}
    else if(f.t==='smoke'){c.globalCompositeOperation='source-over';c.globalAlpha=Math.max(0,f.life)*.32;const gr=c.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r);gr.addColorStop(0,'rgba(60,62,72,.9)');gr.addColorStop(1,'rgba(20,22,30,0)');c.fillStyle=gr;c.beginPath();c.arc(f.x,f.y,f.r,0,6.2832);c.fill()}
    else if(f.t==='deb'){c.globalCompositeOperation='source-over';c.globalAlpha=Math.min(1,f.life*1.5);c.save();c.translate(f.x,f.y);c.rotate(f.rot);c.fillStyle=f.c;c.beginPath();c.moveTo(-f.s,-f.s*.4);c.lineTo(f.s*.8,-f.s*.6);c.lineTo(f.s,f.s*.5);c.lineTo(-f.s*.6,f.s*.7);c.closePath();c.fill();c.restore()}
    else if(f.t==='streak'){c.globalCompositeOperation='lighter';c.globalAlpha=Math.max(0,f.life);c.strokeStyle='#ffe2a8';c.lineWidth=1.5;c.beginPath();c.moveTo(f.x,f.y);c.lineTo(f.x-f.vx*1.8,f.y-f.vy*1.8);c.stroke()}
    else if(f.t==='muz'){c.globalCompositeOperation='lighter';c.globalAlpha=Math.max(0,f.life);const gr=c.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*1.6);gr.addColorStop(0,'#fff');gr.addColorStop(.3,f.c);gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(f.x-f.r*1.6,f.y-f.r*1.6,f.r*3.2,f.r*3.2)}
    else if(f.t==='arc'){c.globalCompositeOperation='lighter';c.globalAlpha=Math.max(0,f.life);c.strokeStyle=f.c||'#8fd0ff';c.lineWidth=1.6;for(let k=0;k<(f.n||1);k++){const x0=f.fx!==undefined?f.fx:f.x,y0=f.fy!==undefined?f.fy:f.y;c.beginPath();c.moveTo(x0,y0);const seg=5;for(let i=1;i<=seg;i++){const t=i/seg;c.lineTo(x0+(f.x-x0)*t+(Math.random()-.5)*22*(f.fx!==undefined?1:t),y0+(f.y-y0)*t+(Math.random()-.5)*22*(f.fx!==undefined?1:t)-(f.fx===undefined?(1-t)*18:0))}c.stroke()}}}
  c.restore()}

/* ---------- fake dynamic lighting: ships query nearby light sources ---------- */
N8.buildLights=g=>{const v=g.v8,L=v.lightList;L.length=0;if(!N8.q.light)return;for(const l of v.lights)L.push({x:l.x,y:l.y,r:l.r,c:l.c,i:l.life/l.max});
  let n=0;for(const b of g.bullets){if(n>36)break;if(b.dead||!(b.isEnemy||b.wk==='ION'||b.wk==='PLASMA'||b.wk==='PARTICLE'||b.wk==='RAIL'||b.wk==='ANTIM'||b.m8))continue;L.push({x:b.x,y:b.y,r:100,c:b.color,i:.55});n++}
  const p=g.player;if(p&&p.v8&&p.v8.flare>0)L.push({x:p.x,y:p.y-26,r:90,c:'#ffffff',i:p.v8.flare/6})};
N8.lightAt=(x,y,self)=>{let i=0,cr=0,cg=0,cb=0;const L=N8.g.v8.lightList;for(const l of L){const d=Math.hypot(l.x-x,l.y-y);if(d>l.r||d<.5&&l.self===self)continue;const w=(1-d/l.r)*l.i;const rgb=N8.hex(l.c);cr+=rgb[0]*w;cg+=rgb[1]*w;cb+=rgb[2]*w;i+=w}
  if(i<.03)return null;i=Math.min(1,i);return{i,r:Math.round(cr/(i||1)*1),g:Math.round(cg/(i||1)*1),b:Math.round(cb/(i||1)*1)}};
const hexCache={};N8.hex=h=>{if(hexCache[h])return hexCache[h];let s=String(h||'#ffffff').replace('#','');if(s.length===3)s=s.split('').map(x=>x+x).join('');const n=parseInt(s.slice(0,6),16);const r=isNaN(n)?[255,255,255]:[(n>>16)&255,(n>>8)&255,n&255];return hexCache[h]=r};
N8.shade=(h,f)=>{const [r,g,b]=N8.hex(h);const m=f<0?0:255,a=Math.abs(f);return `rgb(${Math.round(r+(m-r)*a)},${Math.round(g+(m-g)*a)},${Math.round(b+(m-b)*a)})`};
N8.rgba=(h,a)=>{const [r,g,b]=N8.hex(h);return `rgba(${r},${g},${b},${a})`};
/* applies a light overlay over the currently-built path of a ship hull */
N8.litFill=(c,x,y,light,self)=>{const li=N8.lightAt(x,y,self);if(!li)return;c.save();c.clip();c.globalCompositeOperation='lighter';c.fillStyle=`rgba(${li.r},${li.g},${li.b},${li.i*.55})`;c.fillRect(-90,-90,180,180);c.restore()};

/* ---------- combat-feel helpers ---------- */
N8.slowmo=(g,frames)=>{g.v8.slow=Math.max(g.v8.slow,frames)};
N8.flash=(g,a,col)=>{g.v8.sflash=Math.max(g.v8.sflash,a);g.v8.sflashC=col||'#fff'};
N8.shake=(g,a)=>{g.cameraShake=Math.max(g.cameraShake,Math.min(a,g.settings.shake===false?0:26))};

/* ---------- single update pipeline ---------- */
hook(GE.prototype,'update',function(o){
  const g=this,v=g.v8;N8.g=g;
  if(g.state!==GAME.PLAYING||!g.player||!v)return o.call(g);
  if(v.slow>0){v.slow--;v.st=!v.st;if(v.st)return}
  v.t++;const env=N8.env;if(env){env.off+=1.1+(g.state===GAME.PLAYING?1.5:.3)+v.warp*10}
  for(const f of N8.pre)f(g);
  o.call(g);
  if(g.state!==GAME.PLAYING)return;
  updateFx(g);
  for(const f of N8.post)f(g);
});

/* ---------- single draw pipeline (replaces v6/v7 draw; v8 re-implements their overlays in v8-ui.js) ---------- */
GE.prototype.draw=function(){
  const g=this,c=this.ctx,v=g.v8;N8.g=g;
  if(!v){return}
  drawEnv(g,c);
  if(g.state!==GAME.PLAYING&&g.state!==GAME.PAUSED){if(N8.menuDraw)N8.menuDraw(g,c);return}
  N8.buildLights(g);
  c.save();c.globalCompositeOperation='source-over';c.globalAlpha=1;
  const sh=g.settings.shake===false?0:g.cameraShake;
  if(v.zoom!==1){c.translate(g.canvas.width/2,g.canvas.height/2);c.scale(v.zoom,v.zoom);c.translate(-g.canvas.width/2,-g.canvas.height/2)}
  if(v.cine){const k=clamp(v.cine.t/v.cine.dur,0,1);c.translate(0,(1-k)*(1-k)*46)}
  if(sh>.25)c.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh);
  let postCam=false;
  for(const d of N8.draws){
    if(d.z>=90&&!postCam){c.restore();postCam=true}
    c.globalAlpha=1;c.globalCompositeOperation='source-over';
    try{d.fn(g,c)}catch(e){if(!N8.drawErr){N8.drawErr=1;console.error('v8 draw stage failed',e)}}
  }
  if(!postCam)c.restore();
  c.globalAlpha=1;c.globalCompositeOperation='source-over';
};
// world layers
N8.addDraw(60,(g,c)=>{for(const b of g.bullets)b.draw(c)});               // bullets & missiles
N8.addDraw(64,(g,c)=>{if(g.player)g.player.draw(c)});                      // player ship
N8.addDraw(66,drawFx);                                                     // explosion layers
N8.addDraw(70,(g,c)=>{for(const p of g.particles)p.draw(c)});             // particles
N8.addDraw(85,(g,c)=>{for(const t of g.texts)t.draw(c)});                 // floating text
N8.addDraw(90,(g,c)=>{const v=g.v8;if(v.sflash>.01){c.globalAlpha=Math.min(.6,v.sflash);c.fillStyle=v.sflashC;c.fillRect(0,0,g.canvas.width,g.canvas.height);c.globalAlpha=1}
  if(g.damageFlash>0){c.fillStyle=`rgba(255,20,80,${Math.min(.35,g.damageFlash/34)})`;c.fillRect(0,0,g.canvas.width,g.canvas.height)}});
N8.updateFx=updateFx;
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v8-env.js');
