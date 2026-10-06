'use strict';
/* NEBULA PROTOCOL v12 — Tactical Command Deck.
   Restores the complete mobile action set without bringing back the old overlapping desktop-style touch UI.
   Uses the existing N8/GameEngine loop and existing gameplay methods. */
(()=>{
  const N8=window.N8||{}, GE=window.GameEngine;
  const $=N8.$||((id)=>document.getElementById(id));
  const hook=N8.hook;
  if(!GE||!hook)return;
  const G=()=>window.gameEngine;
  const isPlay=()=>{const g=G();return !!g && (g.state===window.GAME?.PLAYING||g.state===1)};
  const mobile=()=>window.innerWidth<=900 || !!window.matchMedia?.('(pointer:coarse)').matches;
  let ready=false, joyPointer=-1, joyTimer=null;
  const firePointers=new Set();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const shortPower={
    'NOVA BLAST':'NOVA','CHAIN LIGHTNING':'CHAIN','GRAVITY WELL':'GRAV','PLASMA STORM':'PLSM','SHIELD BURST':'SHLD','MISSILE BARRAGE':'BARR','OVERDRIVE':'OVR','ORBITAL STRIKE':'ORB','SINGULARITY':'SING','DRONE SWARM':'DRON'
  };
  const MARKUP=`
  <div id="v12MobileLayer" aria-label="Tactical mobile combat deck">
    <div class="v12-topline">
      <div class="v12-mission-card">
        <span class="v12-k">FRONTLINE</span><b id="v12Sector">SECTOR 001</b><span id="v12Wave">LV 1 · WAVE 1/4</span>
      </div>
      <div class="v12-top-buttons"><button id="v12Pause" class="v12-top-btn" type="button">Ⅱ</button><button id="v12Exit" class="v12-top-btn danger" type="button">EXIT</button></div>
    </div>
    <div id="v12Threat" class="v12-threat"><span id="v12ThreatLabel">WARFRONT</span><b id="v12ThreatValue">THREAT 01</b></div>
    <button id="v12Objective" class="v12-objective" type="button" aria-expanded="false"><span class="v12-k">DIRECTIVE</span><b id="v12ObjName">DESTROY ALL HOSTILES</b><span id="v12ObjMeta">0 HOSTILES</span><i><em id="v12ObjBar"></em></i></button>
    <div class="v12-target"><span>TARGET</span><b id="v12TargetName">NO TARGET</b><i><em id="v12TargetHp"></em></i></div>

    <div id="v12PlayerHud" class="v12-player-hud">
      <div class="v12-pilot"><span id="v12Ship">VIPER</span><b id="v12Pilot">LV 1</b></div>
      <div class="v12-statline"><span><i class="h"></i><b id="v12Hp">100</b></span><span><i class="s"></i><b id="v12Shield">100</b></span><span><i class="e"></i><b id="v12Energy">100</b></span></div>
      <div class="v12-bar"><em id="v12HpBar"></em><em id="v12ShieldBar"></em><em id="v12EnergyBar"></em></div>
    </div>

    <div id="v12PowerRail" class="v12-power-rail" aria-label="Power slots">
      <span class="v12-power-label">POWER BANK</span>
      <button class="v12-power" data-p="0" type="button"><small>P1</small><b>—</b><i></i></button>
      <button class="v12-power" data-p="1" type="button"><small>P2</small><b>—</b><i></i></button>
      <button class="v12-power" data-p="2" type="button"><small>P3</small><b>—</b><i></i></button>
      <button class="v12-power" data-p="3" type="button"><small>P4</small><b>—</b><i></i></button>
    </div>

    <div id="v12Joystick" class="v12-joystick" aria-label="Move joystick"><div id="v12Stick"></div><span>MOVE</span></div>

    <div id="v12ActionDeck" class="v12-action-deck" aria-label="Combat actions">
      <button data-a="lock" type="button" class="lock">LOCK</button>
      <button data-a="ability" type="button" class="ability">ABILITY</button>
      <button data-a="dash" type="button" class="dash">DASH</button>
      <button data-a="missile" type="button" class="missile">MISSILE</button>
      <button data-a="weapon" type="button" class="weapon">WEAPON</button>
      <button data-a="special" type="button" class="special">SPECIAL</button>
      <button data-a="recharge" type="button" class="recharge">RECHARGE</button>
      <button data-a="auto" type="button" class="auto">AUTO</button>
      <button id="v12Fire" type="button" class="fire">FIRE</button>
    </div>

    <div id="v12Active" class="v12-active"></div>
    <div id="v12LockHint" class="v12-lock-hint">TAP LOCK TO SELECT · HOLD FIRE</div>
  </div>`;

  function inject(){
    if(ready)return true;
    const hud=$('hud'); if(!hud)return false;
    if(!$('v12MobileLayer'))hud.insertAdjacentHTML('beforeend',MARKUP);
    ready=!!$('v12MobileLayer'); if(ready&&!inject.wired){inject.wired=true;wire()}
    return ready;
  }
  function stopLegacy(on){
    ['v11MobileLayer','v10MobileLayer','v9Touch','mobileControls','v8Mob','v8MobP'].forEach(id=>{
      const e=$(id); if(e)e.classList.toggle('v12-suppressed',!!on);
    });
  }
  function fire(on){const g=G();if(!g)return;g.pointerFire=!!on;if(on)g.audio?.init?.()}
  function releaseMove(){const g=G();joyPointer=-1;if($('v12Stick'))$('v12Stick').style.transform='translate(0,0)';if(g){g.v12Move={x:0,y:0,active:false};g.touch=null}}
  function setMove(clientX,clientY){const g=G(),base=$('v12Joystick'),stick=$('v12Stick');if(!g||!base||!stick)return;const r=base.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=Math.max(20,r.width*.34);let dx=clientX-cx,dy=clientY-cy,d=Math.hypot(dx,dy)||1;if(d>max){dx=dx/d*max;dy=dy/d*max}const x=dx/max,y=dy/max;stick.style.transform=`translate(${dx}px,${dy}px)`;g.v12Move={x,y,active:true};if(g.player)g.touch={x:g.player.x+x*210,y:g.player.y+y*210}}
  function callAction(a){const g=G();if(!g||!isPlay())return;try{
    if(a==='lock')g.lockNearest?.();
    else if(a==='ability')g.useAbility?.();
    else if(a==='dash')g.dash?.();
    else if(a==='missile')g.fireMissiles?.();
    else if(a==='weapon')g.cycleWeapon?.(1);
    else if(a==='special')g.useSpecial?.();
    else if(a==='recharge')g.recharge?.();
    else if(a==='auto')g.toggleAutoFire?.();
  }catch(err){console.warn('v12 action failed',a,err)} }
  function wire(){
    inject();
    const layer=$('v12MobileLayer'),joy=$('v12Joystick'),fireBtn=$('v12Fire');
    joy?.addEventListener('pointerdown',e=>{if(!isPlay())return;e.preventDefault();e.stopPropagation();joyPointer=e.pointerId;joy.setPointerCapture?.(e.pointerId);setMove(e.clientX,e.clientY)},{passive:false});
    joy?.addEventListener('pointermove',e=>{if(e.pointerId!==joyPointer)return;e.preventDefault();setMove(e.clientX,e.clientY)},{passive:false});
    ['pointerup','pointercancel','pointerleave'].forEach(ev=>joy?.addEventListener(ev,e=>{if(e.pointerId===joyPointer)releaseMove()},{passive:false}));
    fireBtn?.addEventListener('pointerdown',e=>{if(!isPlay())return;e.preventDefault();e.stopPropagation();firePointers.add(e.pointerId);fireBtn.setPointerCapture?.(e.pointerId);fire(true);fireBtn.classList.add('pressed')},{passive:false});
    const end=e=>{firePointers.delete(e.pointerId);if(!firePointers.size)fire(false);fireBtn?.classList.remove('pressed')};
    ['pointerup','pointercancel','pointerleave'].forEach(ev=>fireBtn?.addEventListener(ev,end,{passive:false}));
    layer?.addEventListener('pointerdown',e=>{
      const b=e.target.closest('button');if(!b)return;e.preventDefault();e.stopPropagation();
      if(b.id==='v12Pause'){G()?.togglePause?.();return}
      if(b.id==='v12Exit'){G()?.exitGame?.();return}
      if(b.id==='v12Objective'){b.classList.toggle('open');b.setAttribute('aria-expanded',String(b.classList.contains('open')));return}
      if(b.dataset.p!==undefined){G()?.usePower?.(+b.dataset.p);b.classList.remove('flash');void b.offsetWidth;b.classList.add('flash');return}
      if(b.dataset.a)callAction(b.dataset.a);
    },{capture:true,passive:false});
    document.addEventListener('pointerup',()=>{firePointers.clear();fire(false);releaseMove()},{passive:true});
    window.addEventListener('resize',()=>{if(joyTimer)clearTimeout(joyTimer);joyTimer=setTimeout(()=>syncVisibility(G()),80)},{passive:true});
  }
  function syncVisibility(g){if(!inject())return;const layer=$('v12MobileLayer');const on=mobile()&&g?.state===window.GAME?.PLAYING;layer.style.display=on?'block':'none';stopLegacy(on);applyHand();}
  function applyHand(){const layer=$('v12MobileLayer');if(!layer)return;const s=N8.v9?.persist?.settings||{};layer.classList.toggle('left',s.touchHand==='left')}
  function setText(id,v){const e=$(id);if(e)e.textContent=String(v)}
  function update(g){
    if(!inject())return;syncVisibility(g);if(!mobile()||g?.state!==window.GAME?.PLAYING)return;
    const sec=N8.sectorOf?.(g.level)||{n:'FRONTIER',diff:1,acc:'#5cf6ff'};
    const sn=N8.sectorNo?.(g.level)||Math.ceil(g.level/10);
    setText('v12Sector',`SECTOR ${String(sn).padStart(3,'0')} · ${sec.n}`);setText('v12Wave',`LV ${g.level} · WAVE ${g.wave}/${g.wavesPerLevel}`);
    const enemies=(g.enemies||[]).filter(e=>!e.dead),hostiles=enemies.length+(g.boss&&!g.boss.dead?1:0),pressure=Math.round((sec.diff||1)*100);
    setText('v12ThreatValue',`THREAT ${Math.min(999,pressure)}`);setText('v12ThreatLabel',g.boss?'BOSS CONTACT':'WARFRONT');
    const ob=g.v8?.obj;let name='DESTROY ALL HOSTILES',meta=`${hostiles} HOSTILES`,f=0;if(g.boss){name='DEFEAT COMMANDER';meta='BOSS CONTACT';f=g.boss.maxHp?1-g.boss.hp/g.boss.maxHp:0}else if(ob){name=ob.name||name;switch(ob.type){case'SURVIVE':meta=`${Math.max(0,Math.ceil((ob.goal-ob.prog)/60))}s`;f=ob.prog/ob.goal;break;case'DESTROY_GENS':meta=`${ob.prog}/${ob.goal} GENERATORS`;f=ob.prog/ob.goal;break;case'COLLECT_CORES':meta=`${ob.prog}/${ob.goal} CORES`;f=ob.prog/ob.goal;break;case'CLEAR_ASTEROIDS':meta=`${ob.prog}/${ob.goal} ASTEROIDS`;f=ob.prog/ob.goal;break;default:meta=`${hostiles} HOSTILES`;f=hostiles?0:1;}}
    setText('v12ObjName',name);setText('v12ObjMeta',meta);const bar=$('v12ObjBar');if(bar)bar.style.width=`${Math.max(0,Math.min(1,g.boss?f:(ob?.done?1:f)))*100}%`;
    const t=g.lock?.e&&!g.lock.e.dead?g.lock.e:(g.boss&&!g.boss.dead?g.boss:null);setText('v12TargetName',t?(t.def?.name||t.cls||t.role||'HOSTILE'):'NO TARGET');const th=$('v12TargetHp');if(th)th.style.width=t&&t.maxHp?`${Math.max(0,Math.min(1,t.hp/t.maxHp))*100}%`:'0%';
    const p=g.player;if(p){setText('v12Ship',p.cls||'SHIP');setText('v12Pilot',`LV ${N8.pilot?.level||1}`);setText('v12Hp',Math.ceil(Math.max(0,p.hp)));setText('v12Shield',Math.ceil(Math.max(0,p.shield)));setText('v12Energy',Math.floor(Math.max(0,p.energy)));const hp=$('v12HpBar'),sh=$('v12ShieldBar'),en=$('v12EnergyBar');if(hp)hp.style.width=`${Math.max(0,p.hp/p.maxHp*100)}%`;if(sh)sh.style.width=`${Math.max(0,p.shield/p.maxShield*100)}%`;if(en)en.style.width=`${Math.max(0,p.energy/p.maxEnergy*100)}%`}
    const slots=N8.loadout?.powers||[];const v=g.v8||{};document.querySelectorAll('#v12PowerRail .v12-power').forEach((b,i)=>{const pi=slots[i],P=N8.P?.[pi];b.disabled=!P;const nm=P?shortPower[P.n]||P.n:'EMPTY';const lk=P&&!N8.powerUnlocked?.(pi);const cd=P?(v.pcd?.[pi]||0):0;const mx=P?(v.pcdMax?.[pi]||P.cd):1;b.classList.toggle('ready',!!P&&!lk&&!cd&&p&&p.energy>=P.e);b.classList.toggle('locked',!!lk);b.classList.toggle('cool',!!cd);b.title=P?`${P.n} · ${P.e} ENERGY · ${P.lvl?'LV '+P.lvl:'READY'}`:'EMPTY';const bb=b.querySelector('b');if(bb)bb.textContent=nm;const ov=b.querySelector('i');if(ov)ov.style.setProperty('--cd',String(cd/mx));b.querySelector('small').textContent='P'+(i+1) });
    const active=$('v12Active');if(active){const acts=p?.active||{};const names=[];for(const [k,val] of Object.entries(acts)){if(val>0)names.push(`${(window.POWERUPS?.[k]?.label||k)} ${Math.ceil(val/60)}s`)}if(v.cloak>0)names.push(`CLOAK ${Math.ceil(v.cloak/60)}s`);if(v.od>0)names.push(`OVERDRIVE ${Math.ceil(v.od/60)}s`);active.textContent=names.slice(0,4).join(' · ')}
    const auto=$('#v12ActionDeck [data-a="auto"]');if(auto){auto.classList.toggle('on',!!g.autoFire);auto.textContent=g.autoFire?'AUTO ON':'AUTO'}
  }
  hook(GE.prototype,'bind',function(o,...a){const r=o.apply(this,a);inject();return r});
  hook(GE.prototype,'startGame',function(o,...a){const r=o.apply(this,a);inject();syncVisibility(this);return r});
  hook(GE.prototype,'exitGame',function(o,...a){fire(false);releaseMove();const r=o.apply(this,a);const l=$('v12MobileLayer');if(l)l.style.display='none';stopLegacy(false);return r});
  hook(GE.prototype,'togglePause',function(o,...a){const r=o.apply(this,a);setTimeout(()=>syncVisibility(this),0);return r});
  N8.post.push(g=>update(g));
  window.addEventListener('orientationchange',()=>setTimeout(()=>syncVisibility(G()),120),{passive:true});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v12-ui.js');
