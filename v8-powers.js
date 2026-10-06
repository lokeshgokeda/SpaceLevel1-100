'use strict';
/* NEBULA PROTOCOL v8 — powers v2 (12 powers), combos, singularity, overlay rendering (wells/rings/bolts/beam/storms/drones/strikes). */
(()=>{
const N8=window.N8,{hook,clamp,rnd}=N8,GE=GameEngine,A8=N8.audio;

/* id, name, energy, cooldown(frames), unlock level, HUD colour, description */
N8.P=[
 {n:'NOVA BLAST',e:35,cd:900,lvl:1,c:'#ff9d2e',d:'Blast around the ship. x1.5 in a Gravity Well; GRAVITY NOVA implodes first.'},
 {n:'AEGIS',e:30,cd:1200,lvl:1,c:'#7d4dff',d:'Full shield refill and 3s invulnerability.'},
 {n:'CHAIN LIGHTNING',e:25,cd:600,lvl:1,c:'#8affff',d:'Arcs through up to 6 hostiles.'},
 {n:'GRAVITY WELL',e:28,cd:900,lvl:1,c:'#b56cff',d:'Drags and crushes enemies.'},
 {n:'PLASMA STORM',e:30,cd:1100,lvl:2,c:'#7dff42',d:'5s area-denial plasma cloud.'},
 {n:'SHIELD BURST',e:28,cd:900,lvl:3,c:'#5ec8ff',d:'+60% shield, knocks enemies back, wipes nearby shots.'},
 {n:'MISSILE BARRAGE',e:32,cd:1000,lvl:4,c:'#ff7a2e',d:'10 seeking missiles. With EMP active: DISABLED TARGET STRIKE.'},
 {n:'OVERDRIVE',e:35,cd:1500,lvl:5,c:'#ffcc33',d:'7s: +90% damage & fire rate, no heat. With Laser: OVERCHARGE BEAM.'},
 {n:'VOID CLOAK',e:30,cd:1200,lvl:6,c:'#9d7dff',d:'6s stealth: enemies lose tracking, +60% damage.'},
 {n:'DRONE SWARM',e:35,cd:1500,lvl:7,c:'#45ffc0',d:'5 attack drones for 7s.'},
 {n:'ORBITAL STRIKE',e:45,cd:1800,lvl:9,c:'#ff4466',d:'Telegraphed satellite beam on a target zone.'},
 {n:'SINGULARITY',e:50,cd:1800,lvl:11,c:'#e0a0ff',d:'Gravitational collapse that drags, crushes and detonates.'}
];
N8.powerUnlocked=i=>!N8.pilot||N8.pilot.cheat||N8.pilot.level>=N8.P[i].lvl;
const V=g=>g.v8;
const aim=(g)=>{const p=g.player;return{x:g.mouse.active&&!g.touch?g.mouse.x:p.x,y:g.mouse.active&&!g.touch?g.mouse.y:Math.max(140,p.y-260)}};
N8.comboMsg=(g,txt)=>{const p=g.player;g.addText(p.x,p.y-90,txt,'#fff36b',1.3);g.toast('COMBO: '+txt);N8.flash(g,.1,'#fff36b');A8.play('POWER')};

/* ---------- singularity entity ---------- */
N8.spawnSingularity=(g,x,y,scale=1)=>{const v=V(g);(v.sing=v.sing||[]).push({x,y,r:0,R:150*scale,life:240,max:240,scale});A8.voice({f:60,f2:200,d:1.2,type:'sine',v:.4});N8.flash(g,.12,'#e0a0ff')};
function updSing(g){const v=V(g),p=g.player;if(!v.sing)return;
  for(let i=v.sing.length-1;i>=0;i--){const s=v.sing[i];s.life--;s.r=Math.min(s.R,s.r+s.R/30);
    for(const e of g.enemies){if(e.dead)continue;const dx=s.x-e.x,dy=s.y-e.y,d=Math.hypot(dx,dy);if(d<s.R*2.2&&d>4){const f=Math.min(5,(1-d/(s.R*2.2))*7+1.2);e.x+=dx/d*f;e.y+=dy/d*f}}
    for(const b of g.bullets){if(!b.isEnemy||b.dead)continue;const d=Math.hypot(s.x-b.x,s.y-b.y);if(d<s.R*1.2){b.vx+=(s.x-b.x)/d*.6;b.vy+=(s.y-b.y)/d*.6;if(d<26)b.dead=true}}
    if(s.life%8===0)N8.aoe(g,s.x,s.y,s.r*.8,p.damage*.9*N8.dmgMul(g)*s.scale,'#e0a0ff',{pierceProt:1});
    if(s.life<=0){N8.boom(g,s.x,s.y,3,'#e0a0ff',1.1);N8.aoe(g,s.x,s.y,s.R*1.4,p.damage*10*N8.dmgMul(g)*s.scale,'#e0a0ff');N8.slowmo(g,20);N8.shake(g,12);v.sing.splice(i,1)}}}

/* ---------- powers ---------- */
GE.prototype.usePower=function(slot){
  const g=this,p=g.player;if(g.state!==GAME.PLAYING||!p||!p.v8)return;const v=V(g);v.pcd=v.pcd||new Array(N8.P.length).fill(0);
  const idx=(N8.loadout&&N8.loadout.powers[slot]);if(idx===undefined)return;const P=N8.P[idx];
  if(!N8.powerUnlocked(idx)){g.toast(`${P.n} UNLOCKS AT PILOT LEVEL ${P.lvl}`);return}
  if(v.pcd[idx]>0){return}
  if(p.energy<P.e){if(!v.noEn||v.noEn<=0){g.toast('INSUFFICIENT ENERGY');v.noEn=50}return}
  p.energy-=P.e;v.pcd[idx]=Math.round(P.cd*(p.cdMul||1)*(p.v8.cdrBuff>0?.5:1));v.pcdMax=v.pcdMax||{};v.pcdMax[idx]=v.pcd[idx];
  g.audio.special();N8.shake(g,5);g.addText(p.x,p.y-52,P.n,P.c,1);const dmg=p.damage*N8.dmgMul(g)*(p.powMul||1);
  switch(P.n){
  case'NOVA BLAST':{
    const well=(g.wells||[]).find(w=>Math.hypot(w.x-p.x,w.y-p.y)<300);
    if(well){ // GRAVITY WELL + NOVA BLAST = GRAVITY NOVA
      N8.comboMsg(g,'GRAVITY NOVA');for(const e of g.enemies){if(e.dead)continue;const dx=well.x-e.x,dy=well.y-e.y,d=Math.hypot(dx,dy)||1;e.x+=dx/d*Math.min(d,140);e.y+=dy/d*Math.min(d,140)}
      N8.aoe(g,well.x,well.y,330,dmg*11,'#c98bff');N8.boom(g,well.x,well.y,3,'#c98bff',1);g.wells=g.wells.filter(w=>w!==well);N8.slowmo(g,16);
    }else{N8.aoe(g,p.x,p.y,230,dmg*6,'#ff9d2e');N8.boom(g,p.x,p.y,3,'#ff9d2e',.7)}
    g.fx.push({x:p.x,y:p.y,r:10,max:well?330:230,life:1,color:'#ff9d2e'});break}
  case'AEGIS':p.shield=p.maxShield;p.hitInvuln=Math.max(p.hitInvuln,180);v.aegisT=180;g.fx.push({x:p.x,y:p.y,r:20,max:70,life:1,color:'#7d4dff',follow:1});break;
  case'CHAIN LIGHTNING':{let cur={x:p.x,y:p.y},pts=[[cur.x,cur.y]],hit=new Set();
    for(let n=0;n<6;n++){let t=null,b=n?260:520;for(const e of N8.hostiles(g)){if(hit.has(e))continue;const d=Math.hypot(e.x-cur.x,e.y-cur.y);if(d<b){b=d;t=e}}
      if(!t)break;hit.add(t);pts.push([t.x,t.y]);N8.hurt(g,t,dmg*3.2,'#8affff',{x:t.x,y:t.y,stun:20});cur=t}
    g.bolts.push({pts,life:14});break}
  case'GRAVITY WELL':{const a=aim(g);g.wells.push({x:a.x,y:Math.max(120,a.y),life:200});break}
  case'PLASMA STORM':{const a=aim(g);(v.storms=v.storms||[]).push({x:a.x,y:a.y,life:300,r:150});N8.boom(g,a.x,a.y,2,'#7dff42',.6);break}
  case'SHIELD BURST':{p.shield=Math.min(p.maxShield,p.shield+p.maxShield*.6);p.hitInvuln=Math.max(p.hitInvuln,30);
    for(const e of g.enemies){if(e.dead)continue;const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;if(d<300){const f=(1-d/300)*26+8;e.kb={vx:dx/d*f,vy:dy/d*f,t:14};N8.hurt(g,e,dmg*1.2,'#5ec8ff',{x:e.x,y:e.y})}}
    for(const b of g.bullets)if(b.isEnemy&&Math.hypot(b.x-p.x,b.y-p.y)<300)b.dead=true;
    v.fx.push({t:'ring',x:p.x,y:p.y,r:20,max:300,life:1,c:'#5ec8ff'});v.fx.push({t:'ring',x:p.x,y:p.y,r:10,max:220,life:1,c:'#ffffff'});N8.flash(g,.1,'#5ec8ff');break}
  case'MISSILE BARRAGE':{const dts=!!p.active.EMP;if(dts)N8.comboMsg(g,'DISABLED TARGET STRIKE');
    for(let i=0;i<10;i++){const a=(i-4.5)*.24,b=new Bullet(p.x+(i-4.5)*5,p.y-10,Math.sin(a)*7,-Math.cos(a)*7,dts?'#7fe8ff':'#ff7a2e',false,dmg*2.2*(dts?2.5:1),4,0,3,0);b.missile=true;b.wk='BARRAGE';b.dm8=1;b.splash=50;g.bullets.push(b)}
    A8.play('BARRAGE',p.x,p.y);break}
  case'OVERDRIVE':p.v8.od=Math.max(p.v8.od,420);g.heat=0;g.overheat=false;g.audio.special();if((g.wmode|0)===4)N8.comboMsg(g,'OVERCHARGE BEAM');break;
  case'VOID CLOAK':p.v8.cloak=360;A8.play('CLOAK');break;
  case'DRONE SWARM':v.swarm=[];for(let i=0;i<5;i++)v.swarm.push({x:p.x,y:p.y,a:i*1.2566,cd:i*4});v.swarmT=420;break;
  case'ORBITAL STRIKE':{const t=g.lock&&g.lock.e&&!g.lock.e.dead?g.lock.e:null,a=t?{x:t.x,y:t.y}:aim(g);(v.strikes=v.strikes||[]).push({x:a.x,y:a.y,t:90,r:140,e:t});A8.play('WARN');break}
  case'SINGULARITY':{const a=aim(g);N8.spawnSingularity(g,a.x,Math.max(130,a.y),1);break}
  }
};
/* TIMEWARP + RAILGUN = PRECISION BURST: railgun fires a 3-shot burst while Timewarp is active */
hook(GE.prototype,'fire',function(o){const p=this.player,n0=this.bullets.length;o.call(this);if(!p||(this.wmode|0)!==2)return;
  if(p.active.TIMEWARP&&this.bullets.length>n0){const b0=this.bullets[n0];if(b0&&!b0.pb){b0.pb=1;for(const dx of[-9,9]){const b=new Bullet(b0.x+dx,b0.y,0,b0.vy,b0.color,false,b0.damage*1.4,b0.radius,0,b0.style,99);b.wk='RAILGUN';b.dm8=1;b.pb=1;this.bullets.push(b)}b0.damage*=1.4;if(!this.v8.pbT||this.v8.pbT<=0){N8.comboMsg(this,'PRECISION BURST');this.v8.pbT=90}}}});

/* ---------- per-frame power systems ---------- */
N8.post.push(g=>{const v=V(g),p=g.player;if(!p||!p.v8)return;v.pcd=v.pcd||new Array(N8.P.length).fill(0);
  for(let i=0;i<v.pcd.length;i++)if(v.pcd[i]>0)v.pcd[i]--;if(v.pbT>0)v.pbT--;if(v.aegisT>0)v.aegisT--;
  updSing(g);
  // plasma storms
  if(v.storms)for(let i=v.storms.length-1;i>=0;i--){const s=v.storms[i];s.life--;if(s.life%10===0){N8.aoe(g,s.x,s.y,s.r,p.damage*1.1*N8.dmgMul(g),'#7dff42');if(v.fx.length<N8.q.fx&&N8.q.glow)v.fx.push({t:'fire',x:s.x+rnd(-s.r,s.r)*.7,y:s.y+rnd(-s.r,s.r)*.7,r:22,life:.7,dec:.05,c:'#7dff42'})}if(s.life<=0)v.storms.splice(i,1)}
  // orbital strikes: telegraph -> beam
  if(v.strikes)for(let i=v.strikes.length-1;i>=0;i--){const s=v.strikes[i];if(s.e&&!s.e.dead){s.x+=(s.e.x-s.x)*.08;s.y+=(s.e.y-s.y)*.08}s.t--;
    if(s.t===0){N8.aoe(g,s.x,s.y,s.r,p.damage*20*N8.dmgMul(g),'#ff4466');N8.boom(g,s.x,s.y,3,'#ff4466',1.2);N8.slowmo(g,24);N8.shake(g,14);N8.flash(g,.3,'#ffffff');s.beam=14;A8.voice({f:2500,f2:90,d:.8,type:'sawtooth',v:.5})}
    if(s.t<=0){s.beam--;if(s.beam<=0)v.strikes.splice(i,1)}}
  // drone swarm
  if(v.swarmT>0){v.swarmT--;for(const d of v.swarm){d.a+=.09;d.x+=((p.x+Math.cos(d.a)*(60+Math.sin(v.t*.05)*10))-d.x)*.22;d.y+=((p.y+Math.sin(d.a)*44-10)-d.y)*.22;
      if(--d.cd<=0){d.cd=14;const t=N8.nearest(g,d.x,d.y,560);if(t){const dx=t.x-d.x,dy=t.y-d.y,m=Math.hypot(dx,dy)||1,b=new Bullet(d.x,d.y,dx/m*13,dy/m*13,'#45ffc0',false,p.damage*.9*N8.dmgMul(g),3,0,8,0);b.wk='DRONE';b.dm8=1;g.bullets.push(b)}}}
    if(v.swarmT<=0)v.swarm=[]}
  // cloaked player: homing shots lose tracking
  if(p.v8.cloak>0)for(const b of g.bullets)if(b.isEnemy&&b.homing>0){b.homing=0}
});
N8.resetFns.push(g=>{const v=V(g);v.pcd=new Array(N8.P.length).fill(0);v.storms=[];v.strikes=[];v.swarm=[];v.swarmT=0;v.sing=[];if(g.wells)g.wells=[]});

/* ---------- overlay renderers (replace v7's canvas overlay, which the v8 draw pipeline supersedes) ---------- */
N8.addDraw(63,(g,c)=>{ // laser beam under the ship
  const p=g.player;if(!p||g.laserT<=0)return;const oc=(p.v8.od>0||p.active.OVERDRIVE);
  let top=0;const hit=N8.hostiles(g).filter(e=>e.y<p.y&&Math.abs(e.x-p.x)<(e.size||30)*.55+8);
  c.globalCompositeOperation='lighter';const w=oc?22:11,fl=.75+Math.random()*.25;
  const gr=c.createLinearGradient(p.x-w,0,p.x+w,0);gr.addColorStop(0,'rgba(255,107,214,0)');gr.addColorStop(.35,oc?'rgba(255,255,255,.95)':'rgba(255,107,214,.9)');gr.addColorStop(.5,'#fff');gr.addColorStop(.65,oc?'rgba(255,255,255,.95)':'rgba(255,107,214,.9)');gr.addColorStop(1,'rgba(255,107,214,0)');
  c.globalAlpha=fl;c.fillStyle=gr;c.fillRect(p.x-w,top,w*2,p.y-24);
  if(oc){c.globalAlpha=.25;c.fillStyle='#ff6bd6';c.fillRect(p.x-w*2.2,top,w*4.4,p.y-24)}
  for(const e of hit){c.globalAlpha=.7;const gg=c.createRadialGradient(p.x,e.y+e.size*.35,0,p.x,e.y+e.size*.35,26);gg.addColorStop(0,'#fff');gg.addColorStop(1,'rgba(255,107,214,0)');c.fillStyle=gg;c.fillRect(p.x-26,e.y+e.size*.35-26,52,52)}
  c.globalCompositeOperation='source-over';c.globalAlpha=1});
N8.addDraw(67,(g,c)=>{const v=V(g),p=g.player,t=v.t;
  // gravity wells (v7 data)
  for(const w of g.wells||[]){const a=Math.min(1,w.life/40);c.globalCompositeOperation='lighter';c.strokeStyle='#b56cff';c.lineWidth=2;for(let i=0;i<4;i++){const rr=((w.life*1.4+i*45)%190)+8;c.globalAlpha=a*.55*(1-rr/200);c.beginPath();c.arc(w.x,w.y,rr,0,7);c.stroke()}
    c.globalAlpha=a*.6;c.fillStyle='#050110';c.beginPath();c.arc(w.x,w.y,14,0,7);c.fill();c.globalAlpha=a;c.strokeStyle='#e0b0ff';c.lineWidth=1.5;c.beginPath();c.arc(w.x,w.y,15,0,7);c.stroke()}
  // v7 rings (nova/aegis)
  c.globalCompositeOperation='lighter';for(const f of g.fx||[]){c.globalAlpha=Math.max(0,f.life)*.8;c.strokeStyle=f.color;c.lineWidth=2+f.life*4;c.beginPath();c.arc(f.x,f.y,f.r,0,7);c.stroke()}
  // chain lightning
  for(const b of g.bolts||[]){c.globalAlpha=b.life/14;c.strokeStyle='#dfffff';c.lineWidth=2.4;c.beginPath();b.pts.forEach((q,i)=>i?c.lineTo(q[0]+(Math.random()-.5)*12,q[1]+(Math.random()-.5)*12):c.moveTo(q[0],q[1]));c.stroke();c.globalAlpha=b.life/14*.4;c.strokeStyle='#5ec8ff';c.lineWidth=7;c.stroke()}
  // plasma storms
  for(const s of v.storms||[]){const a=Math.min(1,s.life/40);c.globalAlpha=a*.35;const gr=c.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r);gr.addColorStop(0,'rgba(180,255,120,.6)');gr.addColorStop(.7,'rgba(90,255,60,.2)');gr.addColorStop(1,'rgba(60,255,60,0)');c.fillStyle=gr;c.beginPath();c.arc(s.x,s.y,s.r,0,7);c.fill();c.globalAlpha=a*.7;c.strokeStyle='#9dff5a';c.lineWidth=1.5;c.setLineDash([6,8]);c.lineDashOffset=-t;c.beginPath();c.arc(s.x,s.y,s.r,0,7);c.stroke();c.setLineDash([])}
  // singularities
  for(const s of v.sing||[]){const a=Math.min(1,s.life/30);c.globalAlpha=a*.5;const gr=c.createRadialGradient(s.x,s.y,s.r*.2,s.x,s.y,s.R*1.3);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.6,'rgba(190,110,255,.35)');gr.addColorStop(1,'rgba(190,110,255,0)');c.fillStyle=gr;c.beginPath();c.arc(s.x,s.y,s.R*1.3,0,7);c.fill();
    c.strokeStyle='#e0b0ff';c.lineWidth=2;for(let i=0;i<5;i++){const rr=((s.life*2+i*40)%(s.R*1.4));c.globalAlpha=a*.5*(1-rr/(s.R*1.4));c.beginPath();c.arc(s.x,s.y,rr,0,7);c.stroke()}
    c.globalCompositeOperation='source-over';c.globalAlpha=a;c.fillStyle='#000';c.beginPath();c.arc(s.x,s.y,s.r*.28+4,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=2;c.stroke();c.globalCompositeOperation='lighter'}
  // orbital strikes
  for(const s of v.strikes||[]){if(s.t>0){c.globalAlpha=.45+.35*Math.sin(t*.6);c.strokeStyle='#ff4466';c.lineWidth=2;c.beginPath();c.arc(s.x,s.y,s.r,0,7);c.stroke();c.beginPath();c.arc(s.x,s.y,s.r*(s.t/90),0,7);c.stroke();c.beginPath();c.moveTo(s.x-s.r,s.y);c.lineTo(s.x+s.r,s.y);c.moveTo(s.x,s.y-s.r);c.lineTo(s.x,s.y+s.r);c.stroke()}
    else{c.globalAlpha=Math.max(0,s.beam/14);const gr=c.createLinearGradient(s.x-s.r*.6,0,s.x+s.r*.6,0);gr.addColorStop(0,'rgba(255,70,100,0)');gr.addColorStop(.5,'#ffffff');gr.addColorStop(1,'rgba(255,70,100,0)');c.fillStyle=gr;c.fillRect(s.x-s.r*.6,0,s.r*1.2,s.y)}}
  // drone swarm
  c.globalCompositeOperation='source-over';for(const d of v.swarm||[]){c.globalAlpha=1;c.fillStyle='#0a1a14';c.strokeStyle='#45ffc0';c.lineWidth=1.5;c.beginPath();c.moveTo(d.x,d.y-6);c.lineTo(d.x+5,d.y+4);c.lineTo(d.x-5,d.y+4);c.closePath();c.fill();c.stroke()}
  // aegis / cloak shimmer
  if(p&&v.aegisT>0){c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(.7,v.aegisT/60);c.strokeStyle='#a98bff';c.lineWidth=2.5;c.beginPath();for(let i=0;i<6;i++){const a=i*1.0472+t*.02;const x=p.x+Math.cos(a)*52,y=p.y+Math.sin(a)*52;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.stroke()}
  c.globalCompositeOperation='source-over';c.globalAlpha=1});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v8-powers.js');
