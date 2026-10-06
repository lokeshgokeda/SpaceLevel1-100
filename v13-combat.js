'use strict';
/* NEBULA PROTOCOL v13 — Arsenal & Ship Power Layer.
   Extends the existing v8/v9 combat pipeline. No second loop, no engine, no backend. */
(()=>{
  const N8=window.N8, GE=window.GameEngine, hook=N8&&N8.hook;
  if(!N8||!GE||!hook)return;
  const baseWeapons=[
    {k:'ARC',n:'ARC RIFLE',c:'#66f7ff',lvl:2,en:5.5,heat:7,dmg:'2.2x ×3',rate:'BURST',rng:'LONG',fx:'Three ion arcs with mild seeking.',mz:11},
    {k:'BURST',n:'BURST CANNON',c:'#ffcb55',lvl:3,en:2.5,heat:8,dmg:'1.2x ×5',rate:'BURST',rng:'MED',fx:'Five-round tactical fan.',mz:10},
    {k:'SHOCK',n:'SHOCK LAUNCHER',c:'#55e6ff',lvl:4,en:8,heat:11,dmg:'3.1x + pulse',rate:'MED',rng:'LONG',fx:'Piercing rounds detonate an EMP pulse.',mz:13},
    {k:'PHOTON',n:'PHOTON LANCE',c:'#fff4a8',lvl:5,en:12,heat:17,dmg:'8.2x',rate:'CHARGE',rng:'EXTREME',fx:'Fast piercing lance with huge impact.',mz:18},
    {k:'TORPEDO',n:'DRONE TORPEDO',c:'#7dffb5',lvl:6,en:16,heat:14,dmg:'6.5x',rate:'SEEKING',rng:'SEEKING',fx:'Slow smart torpedo with strong homing.',mz:16},
    {k:'VORTEX',n:'VORTEX REPEATER',c:'#c58bff',lvl:7,en:4,heat:9,dmg:'1.7x ×2',rate:'FAST',rng:'MED',fx:'Twin spiraling bolts that bend in flight.',mz:12},
    {k:'FLUX',n:'FLUX MINIGUN',c:'#ff6bd6',lvl:8,en:1.1,heat:4, dmg:'0.42x',rate:'VERY FAST',rng:'LONG',fx:'Extremely rapid energy fire.',mz:8}
  ];
  // Do not duplicate on hot reloads or repeated script injection.
  N8.V13_WEAPONS=N8.V13_WEAPONS||baseWeapons;
  const existing=new Set(N8.W.map(w=>w.k));
  for(const w of N8.V13_WEAPONS)if(!existing.has(w.k))N8.W.push(w);
  N8.WK=N8.W.map(w=>w.k);

  const mk=(g,p,vx,vy,damage,r,style,kind,opts={})=>{
    if(g.bullets.length>300)return null;
    const b=new Bullet(p.x+(opts.ox||0),p.y+(opts.oy??-24),vx,vy,opts.color||p.config.color||'#fff',false,damage,r,opts.homing||0,style||0,opts.pierce||0);
    Object.assign(b,{wk:kind,v13:kind,lifeCap:opts.lifeCap||0,armAge:opts.armAge||0,spin:opts.spin||0,splash:opts.splash||0,pulse:opts.pulse||0});
    g.bullets.push(b);return b;
  };
  const unlocked=i=>N8.weaponUnlocked?N8.weaponUnlocked(i):true;
  const fire13=(g,p,k)=>{
    const W=N8.W[k], color=W.c, dm=(p.active.BOOST?2.4:1)*(p.active.OVERDRIVE?1.9:1);
    const energy=W.en||0; if(energy>0&&p.energy<energy){if(!g.v13EnergyMsg||g.v13EnergyMsg<=0){g.toast('INSUFFICIENT ENERGY');g.v13EnergyMsg=45}return false}
    const aim=g.lock&&g.lock.e&&!g.lock.e.dead?g.lock.e:null;
    if(energy)p.energy-=energy;
    switch(W.k){
      case'ARC':{
        p.fireCooldown=Math.max(10,p.fireRate*1.2); const offsets=[-12,0,12];
        offsets.forEach((o,i)=>{const a=-Math.PI/2+(o/12)*.06;mk(g,p,Math.cos(a)*.7,Math.sin(a)*14,p.damage*2.2*dm,3.8,8,'ARC',{ox:o,homing:i===1?.045:0,color})});break;
      }
      case'BURST':{
        p.fireCooldown=Math.max(12,p.fireRate*.95); for(let i=-2;i<=2;i++){mk(g,p,i*1.25,-13,p.damage*1.2*dm,3.2,14,'BURST',{ox:i*8,color})} break;
      }
      case'SHOCK':{
        p.fireCooldown=Math.max(18,p.fireRate*1.45); const b=mk(g,p,0,-12,p.damage*3.1*dm,5.2,4,'SHOCK',{pierce:2+p.pierce,color,pulse:78}); if(b)b.shock=1; break;
      }
      case'PHOTON':{
        p.fireCooldown=Math.max(32,p.fireRate*2.25); const b=mk(g,p,0,-23,p.damage*8.2*dm,7.5,12,'PHOTON',{pierce:99,color}); if(b)b.lance=1; break;
      }
      case'TORPEDO':{
        p.fireCooldown=Math.max(34,p.fireRate*2.0); let vx=0,vy=-6.2;if(aim){const dx=aim.x-p.x,dy=aim.y-p.y,d=Math.hypot(dx,dy)||1;vx=dx/d*6.2;vy=dy/d*6.2} const b=mk(g,p,vx,vy,p.damage*6.5*dm,6.5,13,'TORPEDO',{homing:.16,color});if(b)b.torpedo=1;break;
      }
      case'VORTEX':{
        p.fireCooldown=Math.max(8,p.fireRate*.72);for(const s of[-1,1]){const b=mk(g,p,s*.7,-13,p.damage*1.7*dm,3.8,9,'VORTEX',{color,spin:s*1.9});if(b)b.vy=-13}
        break;
      }
      case'FLUX':{
        p.fireCooldown=Math.max(2,p.fireRate*.27); const side=(Math.random()-.5)*8;mk(g,p,side*.12,-17,p.damage*.42*dm,2.7,1,'FLUX',{ox:side,color}); break;
      }
      default:return false;
    }
    g.heat+=(W.heat||0); p.v8&&(p.v8.recoil=Math.max(p.v8.recoil,W.mz>15?4:1));
    if(p.v8&&W.mz)g.v8.fx.push({t:'muz',x:p.x,y:p.y-25,r:W.mz,c:W.c,life:1});
    try{N8.audio?.play?.(W.k,p.x,p.y)}catch{}
    return true;
  };

  // Last-loaded hook intercepts only v13 weapons; v8 handles everything else.
  hook(GE.prototype,'fire',function(prev){
    const g=this,p=g.player,k=g.wmode|0;
    if(k>=11 && k<N8.W.length){
      if(!p||g.state!==GAME.PLAYING||p.fireCooldown>0)return;
      if(g.overheat){if(!g.ohMsg||g.ohMsg<=0){g.toast('WEAPON OVERHEATED');g.ohMsg=75}return}
      if(!unlocked(k)){g.toast(`${N8.W[k].n} UNLOCKS AT PILOT LEVEL ${N8.W[k].lvl}`);return}
      fire13(g,p,k);return;
    }
    return prev.call(this);
  });

  const drawKind=(self,c)=>{
    const k=self.v13,r=self.radius,a=self.age||0;c.save();c.translate(self.x,self.y);c.rotate(Math.atan2(self.vy,self.vx)+Math.PI/2);
    c.globalCompositeOperation='lighter';c.lineWidth=Math.max(1.2,r*.55);c.strokeStyle=self.color;c.fillStyle=self.color;
    if(k==='ARC'){
      c.beginPath();c.arc(0,0,r*1.4,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,-r*.8,r*.55,0,Math.PI*2);c.fill();
      c.globalAlpha=.28;c.beginPath();c.moveTo(-r*1.8,0);c.lineTo(r*1.8,-r*4.2);c.stroke();
    }else if(k==='BURST'){
      c.beginPath();c.moveTo(0,-r*4);c.lineTo(r*1.6,r);c.lineTo(0,r*2);c.lineTo(-r*1.6,r);c.closePath();c.fill();
      c.globalAlpha=.65;c.beginPath();c.moveTo(0,r*2);c.lineTo(0,r*4.5);c.stroke();
    }else if(k==='SHOCK'){
      c.beginPath();c.moveTo(0,-r*4);c.lineTo(r*1.5,0);c.lineTo(0,r*4);c.lineTo(-r*1.5,0);c.closePath();c.stroke();
      c.beginPath();c.arc(0,0,r*.45,0,Math.PI*2);c.fill();
      if(a%6<3){c.globalAlpha=.35;c.beginPath();c.arc(0,0,r*2.8,0,Math.PI*2);c.stroke()}
    }else if(k==='PHOTON'){
      c.fillRect(-r*.5,-r*5,r,r*10);c.globalAlpha=.55;c.strokeRect(-r*1.5,-r*6,r*3,r*12);c.globalAlpha=.25;c.beginPath();c.arc(0,0,r*3.5,0,Math.PI*2);c.stroke();
    }else if(k==='TORPEDO'){
      c.beginPath();c.arc(0,0,r*1.5,0,Math.PI*2);c.fill();c.globalAlpha=.7;c.beginPath();c.arc(0,0,r*2.4,0,Math.PI*2);c.stroke();c.globalAlpha=.32;c.beginPath();c.moveTo(0,r*2);c.lineTo(0,r*6);c.stroke();
    }else if(k==='VORTEX'){
      c.rotate(a*.12);c.beginPath();c.arc(0,0,r*2.2,0,Math.PI*1.6);c.stroke();c.beginPath();c.arc(0,0,r*.7,0,Math.PI*2);c.fill();
    }else if(k==='FLUX'){
      c.fillRect(-r*.65,-r*3.6,r*1.3,r*7.2);c.globalAlpha=.35;c.fillRect(-r*2,-r*1.2,r*4,r*2.4);
    }
    c.restore();
  };
  hook(Bullet.prototype,'draw',function(prev,c){if(this.v13){drawKind(this,c);return}return prev.call(this,c)});

  // Projectile behaviors and impact pulses are inserted after the existing update.
  hook(GE.prototype,'update',function(prev){
    const g=this;const before=g.v13?.impacts||[];g.v13=g.v13||{};g.v13EnergyMsg=Math.max(0,(g.v13EnergyMsg||0)-1);if(g.v13?.phaseVeil>0){g.v13.phaseVeil--;if(g.v13.phaseVeil<=0&&g.player.v13OldEvasion!==undefined){g.player.evasion=g.player.v13OldEvasion;delete g.player.v13OldEvasion;}}
    const out=prev.call(this);
    if(g.state!==GAME.PLAYING||!g.player)return out;
    const p=g.player;
    for(const b of g.bullets){if(!b.v13||b.dead)continue;
      if(b.spin){const ca=Math.atan2(b.vy,b.vx),s=Math.hypot(b.vx,b.vy),na=ca+b.spin*.025;b.vx=Math.cos(na)*s;b.vy=Math.sin(na)*s}
      if(b.shock&&b.age%8===0&&g.v8?.fx?.length<N8.q.fx){g.v8.fx.push({t:'ring',x:b.x,y:b.y,r:5,max:26,life:.7,c:'#55e6ff'})}
      if(b.torpedo&&b.age%7===0&&g.v8?.fx?.length<N8.q.fx){g.v8.fx.push({t:'smoke',x:b.x-b.vx*.5,y:b.y-b.vy*.5,vx:0,vy:0,r:2.5,gr:.15,life:.55,dec:.05})}
      if(b.lance&&b.age%3===0&&g.v8?.fx?.length<N8.q.fx){g.v8.fx.push({t:'streak',x:b.x,y:b.y,vx:0,vy:3,life:.4,dec:.12})}
    }
    return out;
  });

  // A real shock pulse on the current player projectile hit path; keep damage controlled.
  hook(GE.prototype,'handleBulletHits',function(prev){
    const g=this; const result=prev.call(this);
    if(g.state!==GAME.PLAYING||!g.player)return result;
    // Use surviving v13 shock rounds to create a tactical proximity field; collision itself is still N8/base damage.
    for(const b of g.bullets){if(!b.v13||!b.shock||b.dead)continue;if(b.age%22===0)N8.aoe(g,b.x,b.y,52,g.player.damage*.55,b.color,{hullMul:.75,x:b.x,y:b.y})}
    return result;
  });

  // New ship signature powers for generated fleet frames. Existing named ships keep their established v8 powers.
  const generatedPower=(id)=>{
    if(!/^SHIP_\d+$/.test(id||''))return null;
    const n=+id.slice(5);return ['STARFALL','AFTERBURNER','PHASE VEIL','WARDEN DRONES','TORPEDO SWARM','VORTEX CORE','ION BARRAGE','QUANTUM LANCE'][n%8];
  };
  const powerDefs={
    STARFALL:{e:38,cd:240},AFTERBURNER:{e:30,cd:180},'PHASE VEIL':{e:35,cd:300},'WARDEN DRONES':{e:42,cd:330},'TORPEDO SWARM':{e:45,cd:360},'VORTEX CORE':{e:44,cd:330},'ION BARRAGE':{e:48,cd:400},'QUANTUM LANCE':{e:55,cd:480}
  };
  const namedUlt={
    VIPER:'NOVA BURST',AEGIS:'AEGIS WALL',PHANTOM:'TIME SLICE',SPECTRE:'PHASE BEAM',TITAN:'GRAVITY HAMMER',WRAITH:'VOID DRAIN',SOLARIS:'SOLAR FLARE',OMEGA:'OMEGA RIFT',NOVA:'STARFALL',QUASAR:'QUASAR LANCE'
  };
  const ultimateFor=(id)=>generatedPower(id)||namedUlt[id]||null;
  const ultimateCost={ 'NOVA BURST':38,'AEGIS WALL':36,'TIME SLICE':34,'PHASE BEAM':42,'GRAVITY HAMMER':44,'VOID DRAIN':40,'SOLAR FLARE':46,'OMEGA RIFT':52,'STARFALL':50,'QUASAR LANCE':58 };
  GE.prototype.useShipPower=function(){
    const g=this,p=g.player,id=p?.config?.id,name=ultimateFor(id);if(!name){g.toast?.('SHIP POWER PROFILE NOT INSTALLED');return false;}
    const eCost=powerDefs[name]?.e??ultimateCost[name]??45,cd=powerDefs[name]?.cd??420;g.v13=g.v13||{};
    if(g.state!==GAME.PLAYING||p.specialCooldown>0||p.energy<eCost)return false;
    p.energy-=eCost;p.specialCooldown=cd;g.audio.special();g.addText(p.x,p.y-48,name,p.config.color,1.05);g.v13.shipPower=name;
    const col=p.config.color||'#fff';
    if(name==='NOVA BURST'){N8.aoe(g,p.x,p.y,240,p.damage*5.2,col,{x:p.x,y:p.y});if(g.v8?.fx)g.v8.fx.push({t:'ring',x:p.x,y:p.y,r:12,max:240,life:1,c:col});g.cameraShake=Math.max(g.cameraShake,9)}
    else if(name==='AEGIS WALL'){p.shield=p.maxShield;p.hitInvuln=180;g.bullets=g.bullets.filter(b=>!b.isEnemy);if(g.v8?.fx)g.v8.fx.push({t:'ring',x:p.x,y:p.y,r:20,max:120,life:1,c:col})}
    else if(name==='TIME SLICE'){p.v8.speedBuff=180;p.active.RAPID=300;g.v8.slow=120;p.hitInvuln=90}
    else if(name==='PHASE BEAM'){const b=mk(g,p,0,-24,p.damage*10,11,12,'SHIP_POWER',{pierce:99,color:col});if(b)b.lance=1}
    else if(name==='GRAVITY HAMMER'){N8.aoe(g,p.x,p.y-150,210,p.damage*7.0,col,{stun:70,x:p.x,y:p.y-150});g.wells=g.wells||[];g.wells.push({x:p.x,y:p.y-150,life:180,r:170,v13:1})}
    else if(name==='VOID DRAIN'){let gain=0;for(const e of g.enemies){if(e.dead)continue;const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<320){const amt=p.damage*4;N8.hurt(g,e,amt,col,{x:e.x,y:e.y});gain+=7}}p.hp=Math.min(p.maxHp,p.hp+gain);p.shield=Math.min(p.maxShield,p.shield+gain*1.4)}
    else if(name==='SOLAR FLARE'){for(let i=0;i<28;i++){const a=i*Math.PI*2/28;mk(g,p,Math.cos(a)*8,Math.sin(a)*8,p.damage*2.8,4,5,'SHIP_POWER',{oy:0,color:col})}g.cameraShake=Math.max(g.cameraShake,8)}
    else if(name==='OMEGA RIFT'){g.triggerBomb(true);g.v8.slow=150;g.cameraShake=Math.max(g.cameraShake,12)}
    else if(name==='QUASAR LANCE'){const b=mk(g,p,0,-26,p.damage*15,11,12,'SHIP_POWER',{pierce:99,color:col});if(b)b.lance=1;N8.flash(g,.1,col)}
    else if(name==='STARFALL')for(let i=0;i<10;i++){const x=p.x+(i-4.5)*34;mk(g,p,0,-10,p.damage*3.1,4,14,'SHIP_POWER',{ox:x-p.x,color:col})}
    else if(name==='AFTERBURNER'){p.active.RAPID=240;p.v8.speedBuff=180;p.hitInvuln=25;N8.flash(g,.08,col)}
    else if(name==='PHASE VEIL'){const old=p.evasion||0;p.v13OldEvasion=old;p.v8.cloak=210;p.hitInvuln=210;p.evasion=Math.min(.65,old+.18);g.v13.phaseVeil=90}
    else if(name==='WARDEN DRONES'){p.v8.drones=360;p.v8.drone=[]}
    else if(name==='TORPEDO SWARM'){for(let i=0;i<4;i++){const a=(i-1.5)*.18;mk(g,p,Math.sin(a)*5.8,-Math.cos(a)*5.8,p.damage*4.6,5.5,13,'SHIP_POWER',{homing:.2,color:col})}}
    else if(name==='VORTEX CORE'){g.wells=g.wells||[];g.wells.push({x:p.x,y:p.y-170,life:260,r:170,v13:1})}
    else if(name==='ION BARRAGE'){for(let i=0;i<7;i++){const x=80+(i/(7-1))*(g.canvas.width-160);const b=new Bullet(x,-14,0,6,col,false,p.damage*.9,4,0,7,1);b.wk='SHIP_POWER';b.v13='SHIP_POWER';g.bullets.push(b)}}
    else if(name==='QUANTUM LANCE'){const b=mk(g,p,0,-25,p.damage*13,10,12,'SHIP_POWER',{pierce:99,color:col});if(b)b.lance=1}
    return true;
  };
  window.addEventListener('keydown',e=>{if(e.repeat||e.key.toLowerCase()!=='g')return;const g=window.gameEngine;if(g?.state===GAME.PLAYING)g.useShipPower?.()},{capture:true});
  // Ensure the new generated ship powers have readable labels and real cooldown data for the command UI.
  N8.v13ShipPower=(p)=>generatedPower(p?.config?.id)||p?.config?.special||'SHIP POWER';
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v13-combat.js');
