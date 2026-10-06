'use strict';
/* NEBULA PROTOCOL v8 — ships: classes, stat model, layered hull renderer, engine/shield/damage visuals, signature abilities. */
(()=>{
const N8=window.N8,{hook,clamp,rnd,$}=N8,GE=GameEngine,PL=Player;

/* ---------- ship classes (multipliers over the base ship stats already in SHIPS) ---------- */
N8.CLASSES={
  FIGHTER:{hp:1,sh:1,armor:.04,spd:1,acc:1,turn:1,dmg:1,en:1,rg:1,ev:.04,desc:'Balanced all-rounder.'},
  INTERCEPTOR:{hp:.8,sh:.85,armor:0,spd:1.28,acc:1.55,turn:1.4,dmg:.92,en:1.05,rg:1.1,ev:.1,desc:'Fast, high acceleration, fragile.'},
  ASSAULT:{hp:.95,sh:.9,armor:.03,spd:.95,acc:.9,turn:.9,dmg:1.3,en:1,rg:.95,ev:.02,desc:'High weapon damage.'},
  HEAVY:{hp:1.7,sh:1.5,armor:.18,spd:.72,acc:.6,turn:.6,dmg:1.05,en:1,rg:.9,ev:0,desc:'Large armor and shields. Slow.'},
  STEALTH:{hp:.85,sh:.8,armor:0,spd:1.1,acc:1.2,turn:1.2,dmg:1.05,en:1.15,rg:1.2,ev:.28,desc:'Low visibility, high evasion.'},
  SUPPORT:{hp:1,sh:1.1,armor:.05,spd:.95,acc:.9,turn:.9,dmg:.85,en:1.5,rg:1.6,ev:.05,desc:'Energy and drones.'},
  EXPERIMENTAL:{hp:1.1,sh:1.2,armor:.06,spd:1.05,acc:1.05,turn:1.05,dmg:1.15,en:1.3,rg:1.3,ev:.08,desc:'Advanced abilities.'}
};
N8.ABIL={
  FIGHTER:{n:'COMBAT FOCUS',e:30,cd:900,dur:360,d:'+35% fire rate, +25% damage, missiles reload instantly'},
  INTERCEPTOR:{n:'PHASE DASH',e:25,cd:420,dur:30,d:'Blink 260px through enemies (damaging them) while phased'},
  ASSAULT:{n:'WEAPON OVERDRIVE',e:35,cd:1200,dur:420,d:'+90% damage & fire rate, no weapon heat'},
  HEAVY:{n:'FORTRESS SHIELD',e:40,cd:1500,dur:300,d:'-80% damage taken, deflects hostile shots, slower'},
  STEALTH:{n:'CLOAK',e:30,cd:1200,dur:360,d:'Enemies lose tracking, +60% damage while hidden'},
  SUPPORT:{n:'REPAIR DRONES',e:40,cd:1500,dur:600,d:'Two drones repair hull and shoot hostiles'},
  EXPERIMENTAL:{n:'SINGULARITY CORE',e:50,cd:1800,dur:0,d:'Collapses a singularity that drags and crushes enemies'}
};
const NAMED={VIPER:'FIGHTER',AEGIS:'HEAVY',PHANTOM:'INTERCEPTOR',SPECTRE:'STEALTH',TITAN:'ASSAULT',WRAITH:'STEALTH',SOLARIS:'SUPPORT',OMEGA:'EXPERIMENTAL',NOVA:'ASSAULT',QUASAR:'EXPERIMENTAL'};
const CYCLE=['FIGHTER','INTERCEPTOR','ASSAULT','HEAVY','STEALTH','SUPPORT','EXPERIMENTAL'];
N8.shipClass=s=>{if(!s)return'FIGHTER';if(NAMED[s.id])return NAMED[s.id];const m=/SHIP_(\d+)/.exec(s.id||'');return CYCLE[(m?+m[1]:0)%7]};
/* full stat sheet (base ship x class), used by gameplay and by Hangar comparison */
N8.stats=s=>{const k=N8.shipClass(s),C=N8.CLASSES[k];return{cls:k,hp:Math.round(s.hp*C.hp),shield:Math.round(s.shield*C.sh),armor:C.armor,speed:+(s.speed*C.spd).toFixed(1),accel:C.acc,turn:C.turn,damage:+(s.damage*C.dmg).toFixed(1),energy:Math.round(s.energy*C.en),regen:C.rg,evasion:C.ev,ability:N8.ABIL[k]}};

/* ---------- apply class + progression modifiers once the Player exists ---------- */
N8.setupPlayer=g=>{
  const p=g.player;if(!p)return;const k=N8.shipClass(p.config),C=N8.CLASSES[k],T=N8.tree?N8.tree.bonus():{};
  p.cls=k;p.maxHp=Math.round(p.maxHp*C.hp*(1+(T.hp||0)));p.hp=p.maxHp;p.maxShield=Math.round(p.maxShield*C.sh*(1+(T.shield||0)));p.shield=p.maxShield;
  p.maxEnergy=Math.round(p.maxEnergy*C.en*(1+(T.energy||0)));p.energy=p.maxEnergy;p.armor=Math.min(.6,p.armor+C.armor+(T.armor||0));
  p.speed=p.speed*C.spd*(1+(T.speed||0));p.damage=p.damage*C.dmg*(1+(T.dmg||0));p.accel=C.acc*(1+(T.accel||0));p.turn=C.turn;p.energyRegen=C.rg*(1+(T.regen||0));p.evasion=Math.min(.6,C.ev+(T.evasion||0));
  p.fireRate=Math.max(2,p.fireRate*(1-(T.rate||0)));p.crit=Math.min(.7,p.crit+(T.crit||0));p.heatCool=1+(T.heat||0);p.cdMul=1-(T.cd||0);p.missileMul=1+(T.missile||0);p.magnet+=(T.magnet||0);p.pierce=(p.pierce||0)+(T.pierce||0);p.powMul=1+(T.pdmg||0);p.lootLuck=T.luck||0;p.xpMul=1+(T.xp||0);
  p.v8={trail:[],ghosts:[],vx:0,vy:0,bank:0,ab:{t:0,cd:0},shHit:null,flash:0,flare:0,shieldRim:0,cloak:0,fort:0,drones:0,focus:0,drone:[],ox:p.x,oy:p.y,dmgBuff:0,wlvl:0,speedBuff:0,cdrBuff:0,od:0};
};
hook(GE.prototype,'startGame',function(o,...a){o.apply(this,a);N8.setupPlayer(this)});

/* ---------- movement model: acceleration, speed cap and bank angle (class stats matter) ---------- */
hook(PL.prototype,'update',function(o,keys,touch,mouse,w,h){
  const v=this.v8;if(!v)return o.call(this,keys,touch,mouse,w,h);
  const ox=this.x,oy=this.y;o.call(this,keys,touch,mouse,w,h);
  let dx=this.x-ox,dy=this.y-oy;const dashing=this.dashTimer>0;
  const cap=this.speed*(v.fort>0?1.1:2.3)*(1+(v.speedBuff>0?.35:0))*(dashing?3:1),m=Math.hypot(dx,dy);
  if(m>cap){dx*=cap/m;dy*=cap/m}
  const a=clamp(.3*(this.accel||1)*(dashing?2.5:1),.08,.75);
  v.vx+=(dx-v.vx)*a;v.vy+=(dy-v.vy)*a;
  this.x=clamp(ox+v.vx,30,w-30);this.y=clamp(oy+v.vy,45,h-50);
  v.bank+=(clamp(v.vx*.05,-.45,.45)-v.bank)*clamp(.16*(this.turn||1),.05,.5);
  this.vx=v.vx;this.vy=v.vy;
  if(v.speedBuff>0)v.speedBuff--;
  const R=(this.energyRegen||1)-1;if(R)this.energy=Math.min(this.maxEnergy,this.energy+R*.06);
});

/* ---------- hull renderer (player, enemies and hangar all share it) ---------- */
const HULLS={
  FIGHTER:{len:30,wid:8,span:26,sweep:12,tip:9,noz:[-4.5,4.5],mnt:[[15,-2]]},
  INTERCEPTOR:{len:34,wid:5.5,span:22,sweep:20,tip:7,noz:[-3,3],mnt:[[10,4]]},
  ASSAULT:{len:30,wid:10,span:28,sweep:8,tip:11,noz:[-7,0,7],mnt:[[21,2],[12,-4]]},
  HEAVY:{len:29,wid:15,span:31,sweep:4,tip:14,noz:[-10,-3.5,3.5,10],mnt:[[25,0]]},
  STEALTH:{len:33,wid:7,span:27,sweep:26,tip:5,noz:[-3.5,3.5],mnt:[[8,6]]},
  SUPPORT:{len:27,wid:11,span:24,sweep:5,tip:12,noz:[-6,6],mnt:[[18,4]]},
  EXPERIMENTAL:{len:35,wid:8.5,span:29,sweep:15,tip:8,noz:[-5,0,5],mnt:[[14,-3]]},
  e_FIGHTER:{len:20,wid:6,span:19,sweep:9,tip:7,noz:[-3,3],mnt:[]},
  e_SWARM:{len:13,wid:4,span:12,sweep:6,tip:5,noz:[0],mnt:[]},
  e_INTERCEPTOR:{len:22,wid:4.5,span:17,sweep:15,tip:5,noz:[-2.5,2.5],mnt:[]},
  e_SNIPER:{len:27,wid:5,span:14,sweep:12,tip:6,noz:[0],mnt:[]},
  e_CARRIER:{len:42,wid:18,span:34,sweep:2,tip:16,noz:[-11,-4,4,11],mnt:[]},
  e_ELITE:{len:26,wid:8,span:24,sweep:10,tip:9,noz:[-4,4],mnt:[]},
  e_BOMBER:{len:28,wid:15,span:26,sweep:4,tip:15,noz:[-8,0,8],mnt:[]},
  e_HUNTER:{len:24,wid:7,span:21,sweep:14,tip:6,noz:[-3,3],mnt:[]},
  e_ASSASSIN:{len:23,wid:4.5,span:20,sweep:22,tip:4,noz:[-2,2],mnt:[]},
  e_SHIELD_DRONE:{len:14,wid:9,span:12,sweep:2,tip:6,noz:[-3,3],mnt:[]}
};
N8.HULLS=HULLS;
function flame(c,x,y,len,wid,col){
  c.save();c.globalCompositeOperation='lighter';
  const g=c.createLinearGradient(x,y,x,y+len);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.25,N8.rgba(col,.85));g.addColorStop(1,N8.rgba(col,0));
  c.fillStyle=g;c.beginPath();c.moveTo(x-wid,y);c.quadraticCurveTo(x-wid*.5,y+len*.5,x,y+len);c.quadraticCurveTo(x+wid*.5,y+len*.5,x+wid,y);c.closePath();c.fill();
  if(N8.q.glow){const r=wid*3.4,g2=c.createRadialGradient(x,y+2,0,x,y+2,r);g2.addColorStop(0,N8.rgba(col,.55));g2.addColorStop(1,N8.rgba(col,0));c.fillStyle=g2;c.fillRect(x-r,y-r+2,r*2,r*2)}
  c.restore()}
N8.drawHull=function(c,P,o){
  const s=o.s||1,col=o.col||'#00f0ff',t=o.t||0,L=P.len,W=P.wid,SP=P.span,SW=P.sweep,base=o.base||'#2a3345',lite=N8.shade(base,.3),dark=N8.shade(base,-.45),hf=o.hf===undefined?1:o.hf;
  c.save();c.scale(s,s);
  const flick=hf<.4&&Math.random()<.25;
  // engine exhaust
  if(o.thrust>0&&!flick){const fl=o.flameCol||col;for(const nx of P.noz){const len=(10+o.thrust*14)*(hf<.4?.6:1)*(.85+Math.random()*.3),wd=(P.noz.length>3?1.9:2.6)+o.thrust*.8;flame(c,nx,L*.6,len,wd,fl)}}
  // wings
  for(const sd of[-1,1]){
    const y0=-L*.12;c.beginPath();c.moveTo(sd*W*.6,y0);c.lineTo(sd*SP,y0+SW);c.lineTo(sd*SP*.94,y0+SW+P.tip);c.lineTo(sd*W*.95,L*.52);c.closePath();
    const g=c.createLinearGradient(0,0,sd*SP,0);g.addColorStop(0,lite);g.addColorStop(1,dark);c.fillStyle=g;c.fill();c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=.8;c.stroke();
    c.fillStyle=N8.rgba(col,.85);c.beginPath();c.moveTo(sd*W*1.25,L*.02);c.lineTo(sd*SP*.8,y0+SW*.88);c.lineTo(sd*SP*.78,y0+SW*.88+2.6);c.lineTo(sd*W*1.25,L*.02+3.4);c.closePath();c.fill();
    c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=.6;c.beginPath();c.moveTo(sd*W*1.1,y0+SW*.25);c.lineTo(sd*SP*.86,y0+SW*.7);c.stroke();
    for(const m of P.mnt){const mx=sd*m[0],my=m[1];c.fillStyle='#10151f';c.fillRect(mx-1.6,my-8,3.2,10);c.fillStyle='#4b5a72';c.fillRect(mx-.8,my-10,1.6,4);if(o.firing>0){c.save();c.globalCompositeOperation='lighter';c.fillStyle=N8.rgba(col,.9);c.beginPath();c.arc(mx,my-11,3+o.firing*2,0,7);c.fill();c.restore()}}
    // nav lights
    const on=flick?Math.random()<.4:Math.sin(t*.09+(sd>0?0:2.2))>-.1;if(on){c.save();c.globalCompositeOperation='lighter';c.fillStyle=sd>0?'#3dff7a':'#ff3a4a';c.beginPath();c.arc(sd*SP*.97,y0+SW+P.tip*.4,1.6,0,7);c.fill();c.restore()}
  }
  // fuselage
  c.beginPath();c.moveTo(0,-L);c.bezierCurveTo(W*.5,-L*.72,W*1.05,-L*.2,W,L*.2);c.lineTo(W*.7,L*.62);c.lineTo(-W*.7,L*.62);c.lineTo(-W,L*.2);c.bezierCurveTo(-W*1.05,-L*.2,-W*.5,-L*.72,0,-L);c.closePath();
  const fg=c.createLinearGradient(-W,0,W,0);fg.addColorStop(0,N8.shade(base,.42));fg.addColorStop(.45,base);fg.addColorStop(1,dark);c.fillStyle=fg;c.fill();
  if(o.light)N8.litFill(c,o.wx,o.wy,o.light,o.self);
  c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=.9;c.stroke();
  c.strokeStyle='rgba(0,0,0,.4)';c.lineWidth=.6;c.beginPath();c.moveTo(0,-L*.8);c.lineTo(0,L*.58);c.moveTo(-W*.85,L*.05);c.lineTo(W*.85,L*.05);c.moveTo(-W*.6,L*.36);c.lineTo(W*.6,L*.36);c.stroke();
  // accent spine
  c.fillStyle=N8.rgba(col,.9);c.beginPath();c.moveTo(0,-L*.55);c.lineTo(W*.22,L*.1);c.lineTo(0,L*.42);c.lineTo(-W*.22,L*.1);c.closePath();c.globalAlpha=.55;c.fill();c.globalAlpha=1;
  // cockpit
  const cg=c.createLinearGradient(0,-L*.5,0,-L*.12);cg.addColorStop(0,'#b9f4ff');cg.addColorStop(.5,'#2a86b0');cg.addColorStop(1,'#07203a');c.fillStyle=cg;c.beginPath();c.ellipse(0,-L*.32,W*.32,L*.19,0,0,7);c.fill();
  c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.ellipse(-W*.09,-L*.4,W*.08,L*.07,-.4,0,7);c.fill();
  // engine block + nozzles
  for(const nx of P.noz){c.fillStyle='#0d121b';c.beginPath();c.moveTo(nx-2.8,L*.52);c.lineTo(nx+2.8,L*.52);c.lineTo(nx+2.2,L*.66);c.lineTo(nx-2.2,L*.66);c.closePath();c.fill();c.fillStyle=N8.rgba(o.flameCol||col,o.thrust>0&&!flick?.95:.25);c.beginPath();c.arc(nx,L*.63,1.6,0,7);c.fill()}
  // damage state
  if(hf<.66){c.fillStyle='rgba(0,0,0,.4)';for(let i=0;i<4;i++){c.beginPath();c.ellipse(Math.sin(i*2.3)*W*.6,-L*.1+i*L*.16,2.5+i,1.6+i*.4,i,0,7);c.fill()}}
  if(hf<.4){c.strokeStyle='rgba(255,140,50,.85)';c.lineWidth=.8;c.beginPath();c.moveTo(-W*.5,-L*.1);c.lineTo(-W*.15,L*.05);c.lineTo(-W*.4,L*.24);c.moveTo(W*.4,L*.0);c.lineTo(W*.12,L*.2);c.stroke()}
  if(o.hit>0){c.globalAlpha=Math.min(.85,o.hit);c.fillStyle='#fff';c.fill()}
  c.restore();
};

/* ---------- player draw ---------- */
PL.prototype.draw=function(c){
  const g=N8.g,v=this.v8;if(!v)return;const P=HULLS[this.cls]||HULLS.FIGHTER,col=this.config.color||'#00f0ff',hf=Math.max(0,this.hp/this.maxHp),t=g?g.v8.t:0,h=v.shHit;
  c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';
  if(g&&g.v8.cine&&g.v8.cine.hidePlayer){c.restore();return}
  // phase-dash afterimages
  for(const gh of v.ghosts){c.save();c.translate(gh.x,gh.y);c.globalAlpha=gh.life*.4;c.rotate(gh.b||0);N8.drawHull(c,P,{col,thrust:0,hf:1,t});c.restore()}
  // acceleration / boost trail ribbons behind each nozzle
  if(N8.q.trail&&v.trail.length>2){c.save();c.globalCompositeOperation='lighter';for(const nx of P.noz){c.beginPath();let first=true;for(let i=0;i<v.trail.length;i++){const q=v.trail[i];const X=q.x+nx*Math.cos(q.b),Y=q.y+P.len*.62+nx*Math.sin(q.b);first?c.moveTo(X,Y):c.lineTo(X,Y);first=false}
      c.strokeStyle=N8.rgba(col,.22+Math.min(.3,Math.hypot(v.vx,v.vy)*.03));c.lineWidth=2;c.stroke()}c.restore()}
  const boost=this.dashTimer>0?1.6:0,thrust=hf<.2&&Math.random()<.3?0:clamp(.55+(-v.vy)*.06+Math.abs(v.vx)*.02+boost,.35,1.8);
  const cloak=v.cloak>0?(v.cloak<40?.35+Math.sin(t)*.2:.28):1;
  c.translate(this.x,this.y+(g?g.v8.recoil:0));c.rotate(v.bank);c.globalAlpha=cloak;
  const light=N8.q.light&&g?N8.lightAt(this.x,this.y,this):null;
  // shield field: hex-grid shimmer + distortion bulge at the impact angle
  const R=34+(this.config.shape==='titan'?4:0);
  N8.drawHull(c,P,{col,thrust,hf,t,light,wx:this.x,wy:this.y,self:this,hit:v.flash>0?v.flash/8:0,firing:this.fireCooldown>0?clamp(this.fireCooldown/6,0,1):0,flameCol:this.cls==='STEALTH'?'#9d7dff':this.cls==='SUPPORT'?'#7dffb5':col});
  if(v.shieldRim>0||this.shield>0){const sf=this.shield/this.maxShield,rim=v.shieldRim>0?1:0;
    c.save();c.globalCompositeOperation='lighter';
    if(rim){c.strokeStyle=N8.rgba(col,Math.min(.9,v.shieldRim/40));c.lineWidth=3;c.beginPath();c.arc(0,0,R-3,0,7);c.stroke()}
    if(this.shield>0){c.strokeStyle=N8.rgba(col,.12+.4*sf);c.lineWidth=1.6;c.beginPath();
      const h=v.shHit;if(h&&h.t>0){for(let i=0;i<=48;i++){const a=i/48*6.2832,d=Math.max(0,Math.cos(a-h.ang))**6*h.t*7;const rr=R-d;i?c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}}else c.arc(0,0,R,0,7);c.closePath();c.stroke();
      const sg=c.createRadialGradient(0,0,R*.6,0,0,R);sg.addColorStop(0,N8.rgba(col,0));sg.addColorStop(1,N8.rgba(col,.1+.18*sf+(h&&h.t>0?h.t*.3:0)));c.fillStyle=sg;c.beginPath();c.arc(0,0,R,0,7);c.fill();
      if(N8.q.glow){c.globalAlpha=.16*sf;c.strokeStyle='#fff';c.lineWidth=.6;for(let i=0;i<6;i++){const a=i*1.0472+t*.004;c.beginPath();c.moveTo(Math.cos(a)*R*.55,Math.sin(a)*R*.55);c.lineTo(Math.cos(a)*R,Math.sin(a)*R);c.stroke()}}}
    c.restore()}
  if(v.fort>0){c.save();c.globalCompositeOperation='lighter';c.strokeStyle='#8fd0ff';c.lineWidth=3;c.globalAlpha=.6+.3*Math.sin(t*.4);c.beginPath();for(let i=0;i<6;i++){const a=i*1.0472,x=Math.cos(a)*68,y=Math.sin(a)*68;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.stroke();c.restore()}
  if(hf<.2){c.save();c.globalCompositeOperation='lighter';c.strokeStyle=`rgba(255,40,60,${.25+.25*Math.sin(t*.4)})`;c.lineWidth=2;c.beginPath();c.arc(0,0,R+4,0,7);c.stroke();c.restore()}
  c.restore();
  // support drones
  if(v.drones>0)for(const d of v.drone){c.save();c.translate(d.x,d.y);c.fillStyle='#0d121b';c.strokeStyle='#7dffb5';c.lineWidth=1.5;c.beginPath();c.arc(0,0,6,0,7);c.fill();c.stroke();c.fillStyle='#7dffb5';c.beginPath();c.arc(0,0,2,0,7);c.fill();c.restore()}
};
N8.addDraw(64.5,(g,c)=>{ /* cloak shimmer ring + fortress flash handled inside player.draw */ });

/* ---------- per-frame ship systems ---------- */
N8.post.push(g=>{
  const p=g.player,v=p&&p.v8;if(!v)return;const V=g.v8;
  v.trail.push({x:p.x,y:p.y,b:v.bank});if(v.trail.length>12)v.trail.shift();
  for(let i=v.ghosts.length-1;i>=0;i--){v.ghosts[i].life-=.06;if(v.ghosts[i].life<=0)v.ghosts.splice(i,1)}
  if(v.shHit){v.shHit.t-=.06;if(v.shHit.t<=0)v.shHit=null}
  if(v.flash>0)v.flash--;if(v.flare>0)v.flare--;if(v.shieldRim>0)v.shieldRim--;
  if(v.ab.cd>0)v.ab.cd--;if(v.cloak>0)v.cloak--;if(v.fort>0)v.fort--;if(v.focus>0)v.focus--;if(v.od>0)v.od--;if(v.dmgBuff>0)v.dmgBuff--;if(v.cdrBuff>0)v.cdrBuff--;
  // dash warp-tunnel + dash trail (base dash() sets dashTimer)
  if(p.dashTimer===11){V.warp=1;v.flare=6;for(let i=0;i<4;i++)v.ghosts.push({x:p.x-(v.vx*i*2),y:p.y-(v.vy*i*2)+i*6,life:.8-i*.15,b:v.bank})}
  // damage state visuals: smoke -> sparks -> fire, damaged-engine sputter
  const hf=p.hp/p.maxHp;V.crit=hf<.25?1:0;
  if(hf<.66&&N8.q.smoke&&V.t%(hf<.4?5:9)===0&&V.fx.length<N8.q.fx)V.fx.push({t:'smoke',x:p.x+rnd(-8,8),y:p.y+rnd(6,20),vx:rnd(-.3,.3),vy:1.2,r:5,gr:.35,life:1,dec:.02});
  if(hf<.4&&V.t%14===0)V.fx.push({t:'spark',x:p.x+rnd(-14,14),y:p.y+rnd(-12,10),n:3});
  if(hf<.2&&V.t%10===0&&V.fx.length<N8.q.fx)V.fx.push({t:'fire',x:p.x+rnd(-10,10),y:p.y+rnd(-6,14),r:8,life:1,dec:.06,c:'#ff7a2e'});
  // fortress: deflect hostile shots
  if(v.fort>0)for(const b of g.bullets){if(!b.isEnemy||b.dead)continue;if(Math.hypot(b.x-p.x,b.y-p.y)<72){b.dead=true;V.fx.push({t:'ring',x:b.x,y:b.y,r:3,max:22,life:1,c:'#8fd0ff'});V.fx.push({t:'spark',x:b.x,y:b.y,n:3})}}
  // repair drones: orbit, heal, shoot
  if(v.drones>0){v.drones--;const hpBefore=p.hp;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.0006);if(v.drone.length<2)v.drone=[{x:p.x,y:p.y,a:0,cd:0},{x:p.x,y:p.y,a:3.14,cd:10}];
    for(const d of v.drone){d.a+=.06;d.x+=((p.x+Math.cos(d.a)*46)-d.x)*.25;d.y+=((p.y+Math.sin(d.a)*30-6)-d.y)*.25;if(--d.cd<=0){d.cd=24;const t=N8.nearest?N8.nearest(g,d.x,d.y,520):null;if(t){const dx=t.x-d.x,dy=t.y-d.y,m=Math.hypot(dx,dy)||1;const b=new Bullet(d.x,d.y,dx/m*12,dy/m*12,'#7dffb5',false,p.damage*1.2*N8.dmgMul(g),3,0,3,0);b.wk='DRONE';g.bullets.push(b)}}}
    if(v.drones===0)v.drone=[]}
  // singularity/other timed ship effects are handled by combat layer
});
N8.dmgMul=g=>{const p=g.player,v=p&&p.v8;if(!v)return 1;let m=1;if(v.focus>0)m*=1.25;if(v.od>0)m*=1.9;if(v.cloak>0)m*=1.6;if(v.dmgBuff>0)m*=1.5;m*=1+v.wlvl*.06;if(g.v8.combo8)m*=1;return m};
N8.rateMul=g=>{const p=g.player,v=p&&p.v8;if(!v)return 1;let m=1;if(v.focus>0)m*=1.35;if(v.od>0)m*=1.9;return m};

/* ---------- damage reception visuals & class mitigation ---------- */
hook(GE.prototype,'applyDamage',function(o,amount){
  const p=this.player;if(!p||this.state!==GAME.PLAYING||!p.v8||p.hitInvuln>0)return o.call(this,amount);
  const v=p.v8;let a=Number(amount)||1;
  if(v.fort>0)a*=.2;if(v.cloak>0)a*=.85;
  if(Math.random()<(p.evasion||0)*.6){a*=.4;this.addText(p.x+20,p.y-30,'GRAZE','#9dffb0',.7)}
  const sh=p.shield,hp=p.hp,hi=this.v8.hitInfo;this.v8.hitInfo=null;
  o.call(this,a);
  const ang=hi&&hi.ang!==undefined?hi.ang:-Math.PI/2;
  if(p.shield<sh){v.shHit={ang:ang-v.bank,t:1};if(this.audio.shieldHit)this.audio.shieldHit(p.x)}
  if(p.hp<hp){v.flash=8;this.v8.hitFlash=6;this.v8.fx.push({t:'spark',x:p.x+Math.cos(ang)*18,y:p.y+Math.sin(ang)*18,n:6});if(this.audio.hullHit)this.audio.hullHit(p.x);N8.shake(this,3)}
  if(N8.addDmgDir&&(p.shield<sh||p.hp<hp))N8.addDmgDir(this,hi,ang);
});

/* ---------- signature abilities (key C / ABILITY button) ---------- */
GE.prototype.useAbility=function(){
  const p=this.player;if(this.state!==GAME.PLAYING||!p||!p.v8)return;const v=p.v8,A=N8.ABIL[p.cls];if(!A)return;
  if(N8.pilot&&N8.pilot.level<3&&!N8.pilot.cheat){this.toast('SHIP ABILITY UNLOCKS AT PILOT LEVEL 3');return}
  if(v.ab.cd>0||p.energy<A.e){if(p.energy<A.e)this.toast('INSUFFICIENT ENERGY');return}
  p.energy-=A.e;v.ab.cd=Math.round(A.cd*(p.cdMul||1));v.ab.max=v.ab.cd;this.audio.special();this.addText(p.x,p.y-52,A.n,p.config.color,1.1);
  const c=p.cls;
  if(c==='FIGHTER'){v.focus=A.dur;this.missileCd=0;v.shieldRim=30}
  else if(c==='INTERCEPTOR'){
    let dx=0,dy=0;const k=this.keys;if(k.ArrowLeft||k.a)dx--;if(k.ArrowRight||k.d)dx++;if(k.ArrowUp||k.w)dy--;if(k.ArrowDown||k.s)dy++;
    if(!dx&&!dy){if(this.mouse.active&&!this.touch){dx=this.mouse.x-p.x;dy=this.mouse.y-p.y}else dy=-1}const m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;
    const x0=p.x,y0=p.y,x1=clamp(p.x+dx*260,30,this.canvas.width-30),y1=clamp(p.y+dy*260,45,this.canvas.height-50);
    for(let i=0;i<6;i++)v.ghosts.push({x:x0+(x1-x0)*i/6,y:y0+(y1-y0)*i/6,life:.9-i*.1,b:v.bank});
    for(const e of N8.hostiles(this)){const t=N8.segDist(e.x,e.y,x0,y0,x1,y1);if(t<(e.size||30)*.7+22)N8.hurt(this,e,p.damage*4*N8.dmgMul(this),'#b56cff')}
    p.x=x1;p.y=y1;p.hitInvuln=Math.max(p.hitInvuln,34);this.v8.warp=1;N8.flash(this,.12,'#b56cff');v.trail.length=0}
  else if(c==='ASSAULT'){v.od=A.dur;this.heat=0;this.overheat=false;N8.shake(this,6)}
  else if(c==='HEAVY'){v.fort=A.dur;v.shieldRim=A.dur;p.shield=p.maxShield;p.hitInvuln=Math.max(p.hitInvuln,12);N8.flash(this,.12,'#8fd0ff')}
  else if(c==='STEALTH'){v.cloak=A.dur}
  else if(c==='SUPPORT'){v.drones=A.dur;v.drone=[];p.energy=Math.min(p.maxEnergy,p.energy+25)}
  else if(c==='EXPERIMENTAL'){N8.spawnSingularity(this,this.mouse.active&&!this.touch?this.mouse.x:p.x,Math.max(130,p.y-300),1.4)}
};
N8.resetFns.push(g=>{});
hook(GE.prototype,'bind',function(o){o.call(this);const g=this;
  window.addEventListener('keydown',e=>{if(e.repeat||g.state!==GAME.PLAYING)return;if((e.key||'').toLowerCase()==='c')g.useAbility()},true)});

/* ---------- enemy renderer ---------- */
Enemy.prototype.draw=function(c){
  const g=N8.g,P=HULLS['e_'+this.role]||HULLS.e_FIGHTER,sec=g?N8.sectorOf(g.level):N8.SECTORS[0],t=g?g.v8.t:0;
  const hf=this.hp/this.maxHp,s=this.size/(P.len*1.75);
  c.save();c.translate(this.x,this.y);
  if(this.v8&&this.v8.cloak>0){c.globalAlpha=.3+.15*Math.sin(t*.3)}
  c.rotate(Math.PI+(this.bankv||0));
  const light=N8.q.light&&g?N8.lightAt(this.x,this.y,this):null,elite=this.type==='ELITE'||this.role==='ELITE';
  if(this.role==='SHIELD_DRONE'){
    c.scale(s,s);const rg=c.createRadialGradient(-3,-3,1,0,0,11);rg.addColorStop(0,'#eaffff');rg.addColorStop(.5,this.color);rg.addColorStop(1,'#06202a');c.fillStyle=rg;c.beginPath();c.arc(0,0,10,0,7);c.fill();
    c.strokeStyle='#dffcff';c.lineWidth=1;for(let i=0;i<2;i++){c.save();c.rotate(t*.05*(i?-1:1)+i);c.beginPath();c.ellipse(0,0,15,5,0,0,7);c.stroke();c.restore()}
  }else{
    N8.drawHull(c,P,{s,col:this.color,base:N8.shade(sec.hull,-.5),thrust:this.stunned>0?0:.8,hf:.5+hf*.5,t:t+this.phase*10,light,wx:this.x,wy:this.y,self:this,hit:this.hitFlash>0?this.hitFlash/6:0,flameCol:this.role==='ASSASSIN'?'#c56bff':this.role==='HUNTER'?'#ff5544':'#ff8a3d'});
    c.save();c.scale(s,s);
    if(this.role==='SNIPER'){c.fillStyle='#10151f';c.fillRect(-1.2,-P.len-14,2.4,16);c.fillStyle=this.color;c.fillRect(-.6,-P.len-15,1.2,3)}
    if(this.role==='BOMBER'){c.fillStyle='#10151f';c.fillRect(-7,-2,14,10);c.fillStyle='#ff8a3d';for(let i=0;i<3;i++){c.beginPath();c.arc(-4+i*4,3,1.6,0,7);c.fill()}}
    if(this.role==='HUNTER'){c.save();c.globalCompositeOperation='lighter';c.fillStyle='#ff3a3a';c.beginPath();c.arc(0,-P.len*.55,2.6+Math.sin(t*.2),0,7);c.fill();c.restore()}
    if(this.role==='CARRIER'){c.fillStyle='#0d121b';c.fillRect(-9,P.len*.05,18,10);c.fillStyle=(Math.floor(t/20)%2)?'#ff7a2d':'#5a2a10';c.fillRect(-7,P.len*.09,14,3)}
    if(elite){c.save();c.globalCompositeOperation='lighter';c.strokeStyle='rgba(255,204,0,.8)';c.lineWidth=1;c.beginPath();c.arc(0,0,P.len*.9,0,7);c.stroke();c.restore()}
    c.restore()}
  c.restore();
  // shield bubble + hp bar (screen-aligned)
  c.save();c.translate(this.x,this.y);
  if(this.sh>0){const f=this.sh/this.maxSh;c.globalCompositeOperation='lighter';c.strokeStyle=`rgba(90,190,255,${.2+.5*f})`;c.lineWidth=1.6;c.beginPath();c.arc(0,0,this.size*.78,0,7);c.stroke();c.fillStyle=`rgba(90,190,255,${.05+.08*f})`;c.fill()}
  if(this.protectedBy&&this.protectedBy>0){c.globalCompositeOperation='lighter';c.strokeStyle='rgba(120,255,240,.6)';c.setLineDash([4,4]);c.lineWidth=1.4;c.beginPath();c.arc(0,0,this.size*.86,0,7);c.stroke();c.setLineDash([])}
  if(hf<.999){c.globalAlpha=.9;c.fillStyle='rgba(0,0,0,.55)';c.fillRect(-this.size*.5,-this.size*.85,this.size,3);c.fillStyle=hf>.5?'#63ff9a':hf>.25?'#ffcc33':'#ff4466';c.fillRect(-this.size*.5,-this.size*.85,this.size*hf,3)}
  if(this.objT){c.globalAlpha=.9;c.strokeStyle='#ffcc00';c.lineWidth=2;c.rotate(t*.04);const r=this.size*.95;c.beginPath();c.moveTo(0,-r);c.lineTo(r,0);c.lineTo(0,r);c.lineTo(-r,0);c.closePath();c.stroke()}
  c.restore();
};
if(!Enemy.prototype.__v8)Enemy.prototype.__v8=1;
N8.addDraw(30,(g,c)=>{for(const q of g.powerUps)q.draw(c)});
N8.addDraw(40,(g,c)=>{for(const e of g.enemies)e.draw(c)});
N8.addDraw(45,(g,c)=>{if(g.boss)g.boss.draw(c)});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v8-ships.js');
