'use strict';
/* NEBULA PROTOCOL v13 — structured command-deck UI, health display, mobile + desktop. */
(()=>{
  const N8=window.N8,GE=window.GameEngine,$=N8?.$||((id)=>document.getElementById(id));
  if(!N8||!GE)return;
  const G=()=>window.gameEngine;
  const isMobile=()=>window.innerWidth<=900||window.matchMedia?.('(pointer: coarse)').matches;
  const escapeHtml=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const MARKUP=`
  <section id="v13CommandDeck" aria-label="V13 tactical command deck">
    <div class="v13-topbar">
      <div class="v13-brand"><span>ASCENSION V13</span><b>TACTICAL COMMAND</b></div>
      <div class="v13-top-actions"><button type="button" data-v13="pause">PAUSE</button><button type="button" data-v13="exit" class="danger">EXIT</button></div>
    </div>
    <div class="v13-metrics">
      <div class="v13-card mission"><small>MISSION</small><b id="v13Mission">DESTROY ALL HOSTILES</b><span id="v13MissionMeta">0 HOSTILES</span></div>
      <div class="v13-card sector"><small>SECTOR / WAVE</small><b id="v13Sector">001 · FRONTIER</b><span id="v13Wave">LV 1 · 1/4</span></div>
      <div class="v13-card target"><small>TARGET</small><b id="v13Target">NO TARGET</b><span id="v13TargetMeta">LOCK: —</span></div>
    </div>
    <div class="v13-vitals">
      <div class="v13-shipname"><span id="v13ShipName">VIPER</span><b id="v13ShipPower">NOVA BURST</b></div>
      <div class="v13-health"><label><span>HULL</span><strong id="v13HpText">100 / 100</strong></label><div><i id="v13HpBar"></i></div></div>
      <div class="v13-health shield"><label><span>SHIELD</span><strong id="v13ShieldText">55 / 55</strong></label><div><i id="v13ShieldBar"></i></div></div>
      <div class="v13-health energy"><label><span>ENERGY</span><strong id="v13EnergyText">100 / 100</strong></label><div><i id="v13EnergyBar"></i></div></div>
      <div class="v13-health state"><label><span>WEAPON</span><strong id="v13Weapon">PULSE BLASTER</strong></label><div class="v13-weapon-line"><i id="v13HeatBar"></i></div></div>
    </div>
    <div class="v13-crosshair" id="v13Crosshair"><span></span></div>
    <div class="v13-dock">
      <div class="v13-group move-group"><span class="v13-group-title">MOVE</span><div id="v13Joystick" class="v13-joystick"><div id="v13Stick"></div></div></div>
      <div class="v13-group attack-group"><span class="v13-group-title">ATTACK</span><div class="v13-actions attack"><button type="button" data-a="fire" class="fire">FIRE</button><button type="button" data-a="weapon">ATTACK</button><button type="button" data-a="missile">MISSILE</button></div></div>
      <div class="v13-group system-group"><span class="v13-group-title">SYSTEMS</span><div class="v13-actions"><button type="button" data-a="lock">LOCK</button><button type="button" data-a="dash">DASH</button><button type="button" data-a="special">SPECIAL</button><button type="button" data-a="ship">SHIP POWER</button><button type="button" data-a="recharge">RECHARGE</button><button type="button" data-a="auto">AUTO</button></div></div>
      <div class="v13-group power-group"><span class="v13-group-title">POWER BANK</span><div class="v13-powers"><button type="button" data-p="0"><b>P1</b><span>—</span><i></i></button><button type="button" data-p="1"><b>P2</b><span>—</span><i></i></button><button type="button" data-p="2"><b>P3</b><span>—</span><i></i></button><button type="button" data-p="3"><b>P4</b><span>—</span><i></i></button></div></div>
    </div>
    <div class="v13-help"><span id="v13ControlHint">FIRE hold · ATTACK cycle weapon · LOCK target · POWER 1-4 · DASH · SPECIAL · SHIP POWER</span><b id="v13Warning"></b></div>
  </section>`;

  let inserted=false,joyId=-1,fireIds=new Set(),tick=0;
  function inject(){if(inserted)return !!$('v13CommandDeck');const hud=$('hud');if(!hud)return false;hud.insertAdjacentHTML('beforeend',MARKUP);inserted=true;wire();return true}
  function hideLegacy(on){['v12MobileLayer','v11MobileLayer','v10MobileLayer','v9Touch','mobileControls','v8Mob','v8MobP'].forEach(id=>{const e=$(id);if(e)e.classList.toggle('v13-hidden',on)})}
  function play(){const g=G();return !!g&&g.state===window.GAME?.PLAYING}
  function call(a){const g=G();if(!g||!play())return;try{
    if(a==='weapon')g.cycleWeapon(1);else if(a==='missile')g.fireMissiles();else if(a==='lock')g.lockNearest();else if(a==='dash')g.dash();else if(a==='special')g.useSpecial();else if(a==='ship')g.useShipPower?.();else if(a==='recharge')g.recharge();else if(a==='auto')g.toggleAutoFire();
  }catch(e){console.warn('v13 action',a,e)}}
  function fire(on){const g=G();if(!g)return;g.pointerFire=!!on;if(on)g.audio?.init?.()}
  function setMove(x,y){const g=G(),el=$('v13Joystick'),stick=$('v13Stick');if(!g||!el||!stick)return;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,mx=Math.max(18,r.width*.36);let dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy)||1;if(d>mx){dx=dx/d*mx;dy=dy/d*mx}stick.style.transform=`translate(${dx}px,${dy}px)`;const nx=dx/mx,ny=dy/mx;g.v13Move={x:nx,y:ny,active:true};if(g.player)g.touch={x:g.player.x+nx*190,y:g.player.y+ny*190}}
  function releaseMove(){const g=G();joyId=-1;const s=$('v13Stick');if(s)s.style.transform='translate(0,0)';if(g){g.v13Move={x:0,y:0,active:false};g.touch=null}}
  function wire(){
    const root=$('v13CommandDeck'),joy=$('v13Joystick'),f=root&&root.querySelector('[data-a="fire"]');
    joy?.addEventListener('pointerdown',e=>{if(!play())return;e.preventDefault();e.stopPropagation();joyId=e.pointerId;joy.setPointerCapture?.(e.pointerId);setMove(e.clientX,e.clientY)},{passive:false});
    joy?.addEventListener('pointermove',e=>{if(e.pointerId!==joyId)return;e.preventDefault();setMove(e.clientX,e.clientY)},{passive:false});
    ['pointerup','pointercancel','pointerleave'].forEach(ev=>joy?.addEventListener(ev,e=>{if(e.pointerId===joyId)releaseMove()},{passive:false}));
    f?.addEventListener('pointerdown',e=>{if(!play())return;e.preventDefault();e.stopPropagation();fireIds.add(e.pointerId);f.setPointerCapture?.(e.pointerId);fire(true);f.classList.add('pressed')},{passive:false});
    const end=e=>{fireIds.delete(e.pointerId);if(!fireIds.size)fire(false);f?.classList.remove('pressed')};['pointerup','pointercancel','pointerleave'].forEach(ev=>f?.addEventListener(ev,end,{passive:false}));
    root?.addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(!b)return;e.preventDefault();e.stopPropagation();const a=b.dataset.a;if(a==='fire')return;if(b.dataset.v13==='pause'){G()?.togglePause();return}if(b.dataset.v13==='exit'){G()?.exitGame();return}if(b.dataset.p!==undefined){G()?.usePower?.(+b.dataset.p);return}if(a)call(a)},{capture:true,passive:false});
    window.addEventListener('resize',()=>sync(G()),{passive:true});document.addEventListener('pointerup',()=>{fireIds.clear();fire(false);releaseMove()},{passive:true});
  }
  function sync(g){inject();const el=$('v13CommandDeck');if(!el)return;const on=isMobile()&&g?.state===window.GAME?.PLAYING;el.classList.toggle('visible',on);hideLegacy(on)}
  function setW(id,f){const e=$(id);if(e)e.style.width=`${Math.max(0,Math.min(1,f))*100}%`}
  function update(g){if(!inject())return;sync(g);if(g?.state!==window.GAME?.PLAYING)return;if((tick++%2)!==0)return;const p=g.player;if(!p)return;
    const sec=N8.sectorOf?.(g.level)||{n:'FRONTIER'};const sn=N8.sectorNo?.(g.level)||Math.ceil(g.level/10);
    $('v13Sector').textContent=`${String(sn).padStart(3,'0')} · ${sec.n}`;$('v13Wave').textContent=`LV ${g.level} · ${g.wave}/${g.wavesPerLevel}`;
    const host=(g.enemies||[]).filter(e=>!e.dead).length+(g.boss&&!g.boss.dead?1:0),ob=g.v8?.obj;
    $('v13Mission').textContent=g.boss?'DEFEAT THE COMMANDER':(ob?.name||'DESTROY ALL HOSTILES');$('v13MissionMeta').textContent=g.boss?'BOSS CONTACT':`${host} HOSTILES`;
    const target=g.lock?.e&&!g.lock.e.dead?g.lock.e:null;$('v13Target').textContent=target?(target.def?.name||target.role||'HOSTILE'):'NO TARGET';$('v13TargetMeta').textContent=g.lock?(g.lock.t>=30?'LOCKED':'ACQUIRING'):'LOCK: —';
    $('v13ShipName').textContent=p.config?.name||p.config?.id||p.cls||'SHIP';$('v13ShipPower').textContent=N8.v13ShipPower?.(p)||p.config?.special||'SHIP POWER';
    $('v13HpText').textContent=`${Math.ceil(Math.max(0,p.hp))} / ${p.maxHp}`;$('v13ShieldText').textContent=`${Math.ceil(Math.max(0,p.shield))} / ${p.maxShield}`;$('v13EnergyText').textContent=`${Math.floor(Math.max(0,p.energy))} / ${p.maxEnergy}`;$('v13Weapon').textContent=N8.W[g.wmode|0]?.n||'PULSE BLASTER';
    setW('v13HpBar',p.maxHp?p.hp/p.maxHp:0);setW('v13ShieldBar',p.maxShield?p.shield/p.maxShield:0);setW('v13EnergyBar',p.maxEnergy?p.energy/p.maxEnergy:0);setW('v13HeatBar',Math.max(0,Math.min(1,(g.heat||0)/100)));
    $('v13Warning').textContent=p.hp/p.maxHp<.25?'⚠ HULL CRITICAL':g.overheat?'⚠ WEAPON OVERHEAT':g.lock?.t>=30?'LOCK CONFIRMED':'';
    const powers=N8.loadout?.powers||[];powers.slice(0,4).forEach((pi,i)=>{const P=N8.P?.[pi],b=rootButton(i);if(!b||!P)return;b.querySelector('span').textContent=(P.n||'POWER').replace(/\s+/g,' ').slice(0,9);const cd=(g.v8?.pcd?.[pi]||0),mx=(g.v8?.pcdMax?.[pi]||P.cd||1),fill=b.querySelector('i');fill.style.transform=`scaleX(${cd>0?cd/mx:0})`;b.classList.toggle('ready',cd<=0&&p.energy>=P.e);b.classList.toggle('locked',!(N8.powerUnlocked?.(pi)));});
    const cross=$('v13Crosshair');if(cross)cross.classList.toggle('locked',!!target);
  }
  function rootButton(i){return document.querySelector(`#v13CommandDeck [data-p="${i}"]`)}
  N8.addDraw?.(63.5,(g,c)=>{const p=g.player;if(!p)return;const f=p.maxHp?p.hp/p.maxHp:0;if(f>=1)return;c.save();c.translate(p.x,p.y+45);c.globalCompositeOperation='lighter';c.strokeStyle=f<.25?'#ff456b':f<.55?'#ffcb55':'#5cf6ff';c.lineWidth=2;c.globalAlpha=.85;c.beginPath();c.arc(0,0,26,-Math.PI/2,-Math.PI/2+Math.PI*2*f);c.stroke();c.globalAlpha=.2;c.lineWidth=6;c.beginPath();c.arc(0,0,28,-Math.PI/2,-Math.PI/2+Math.PI*2*f);c.stroke();c.restore()});
  N8.post=N8.post||[];N8.post.push(update);
  window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>sync(G()),0),{once:true});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v13-ui.js');
