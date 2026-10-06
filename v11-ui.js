'use strict';
/* NEBULA PROTOCOL v11 — Tactical Mobile Overhaul.
   This module does not replace gameplay. It uses the existing GameEngine APIs and the single N8
   pre/post pipeline, adds a mobile input layer, and exposes the same abilities/weapons/missiles.
*/
(()=>{
  const N8=window.N8||{},GE=window.GameEngine;
  const $=N8.$||((id)=>document.getElementById(id));
  const hook=N8.hook;
  if(!GE||!hook)return;
  const G=()=>window.gameEngine;
  const state=()=>G()?.state;
  const playing=()=>typeof window.GAME==='undefined'||state()===window.GAME.PLAYING;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let init=false,joyActive=false,joyPointer=-1,joyX=0,joyY=0,lastTouchHand='right';
  const firePointers=new Set();

  const MARKUP=`
    <div id="v11MobileLayer" aria-label="Mobile tactical combat controls">
      <div id="v11TopBar">
        <div id="v11Sector" class="v11-chip"><span class="k">SECTOR</span><span id="v11SectorValue" class="v">004 · ASTEROID WARZONE</span><span id="v11SectorSub" class="s">LV 31 · WAVE 1/4</span></div>
        <div id="v11CombatState" class="v11-chip"><span class="k">STATUS</span><span id="v11CombatValue" class="v">COMBAT</span><span id="v11CombatSub" class="s">13 HOSTILES</span></div>
        <div id="v11TopActions"><button id="v11Auto" class="v11-top-btn" type="button">AUTO</button><button id="v11Pause" class="v11-top-btn" type="button">Ⅱ</button></div>
      </div>
      <button id="v11Objective" class="v11-chip" type="button" aria-expanded="false">
        <span class="k">DIRECTIVE</span>
        <div class="v11-objective-body"><b id="v11ObjectiveValue">DESTROY ALL HOSTILES</b></div>
        <div id="v11ObjectiveMeta" class="v11-objective-meta">13 HOSTILES</div>
        <div class="v11-objective-progress"><i id="v11ObjectiveBar"></i></div>
      </button>
      <div id="v11Target" class="v11-chip"><span class="t">TARGET LOCK</span><div id="v11TargetName" class="v11-target-name">NO TARGET</div><div class="v11-target-hp"><i id="v11TargetHp"></i></div></div>
      <div id="v11Status">
        <div class="v11-status-head"><b id="v11Weapon">PULSE BLASTER</b><span id="v11EnergyText">ENERGY 100%</span></div>
        <div class="v11-bars"><div class="v11-bar v11-hp"><i id="v11HpBar"></i></div><div class="v11-bar v11-sh"><i id="v11ShBar"></i></div><div class="v11-bar v11-en"><i id="v11EnBar"></i></div></div>
        <div id="v11StatusNames"><span id="v11HpText">HULL 100</span><span id="v11ShText">SHIELD 100</span><span id="v11EnText">CORE 100</span></div>
      </div>
      <div id="v11LeftDock" class="v11-left-pane">
        <div id="v11Joystick" aria-label="Movement joystick"><div id="v11Stick"></div><span class="v11-joy-label">MOVE</span>
          <div id="v11PowerDock"><button class="v11-action v11-power" data-v11-power="0" type="button">P1</button><button class="v11-action v11-power" data-v11-power="1" type="button">P2</button><button class="v11-action v11-power" data-v11-power="2" type="button">P3</button><button class="v11-action v11-power" data-v11-power="3" type="button">P4</button></div>
        </div>
        <button id="v11PowerBtn" class="v11-round-btn" type="button">POWER</button>
      </div>
      <div id="v11RightDock" class="v11-right-pane">
        <div id="v11ActionGrid">
          <button class="v11-action lock" data-v11-action="lock" type="button">LOCK</button>
          <button class="v11-action ability" data-v11-action="ability" type="button">ABIL</button>
          <button class="v11-action missile" data-v11-action="missile" type="button">MSLE</button>
          <button class="v11-action weapon" data-v11-action="weapon" type="button">WPN</button>
          <button class="v11-action special" data-v11-action="special" type="button">SPEC</button>
          <button class="v11-action auto" data-v11-action="auto" type="button">AUTO</button>
        </div>
        <button id="v11Fire" type="button">FIRE</button>
        <div class="v11-action-caption"><span>HOLD TO FIRE</span><b id="v11ControlHint">TOUCH COMBAT DECK</b></div>
      </div>
      <div class="v11-swipe-hint">DRAG THE LEFT STICK · TAP LOCK · HOLD FIRE</div>
      <div id="v11TargetReticle"><div class="v11-reticle-core"></div><div class="v11-reticle-label">LOCK</div></div>
    </div>`;

  function inject(){
    if(init)return true;
    const hud=$('hud');
    if(!hud)return false;
    if(!$('v11MobileLayer')){hud.insertAdjacentHTML('beforeend',MARKUP);}
    init=!!$('v11MobileLayer');
    if(init&&!inject.wired){inject.wired=true;wire();}
    return init;
  }

  function mobile(){return window.innerWidth<=860||!!window.matchMedia?.('(pointer:coarse)').matches}
  function isPlaying(){return state()===window.GAME?.PLAYING||state()===1||playing()}
  function setFire(on){const g=G();if(!g)return;g.pointerFire=!!on;if(on&&g.audio?.init)g.audio.init()}

  function setMoveFromPoint(clientX,clientY){
    const g=G(),base=$('v11Joystick'),stick=$('v11Stick');if(!g||!base||!stick)return;
    const r=base.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=Math.max(24,r.width*.34);
    let dx=clientX-cx,dy=clientY-cy,d=Math.hypot(dx,dy)||1;
    if(d>max){dx=dx/d*max;dy=dy/d*max;d=max}
    joyX=dx/max;joyY=dy/max;joyActive=true;
    stick.style.transform=`translate(${dx}px,${dy}px)`;
    g.v11Move={x:joyX,y:joyY,active:true};
    if(g.player){g.touch={x:g.player.x+joyX*210,y:g.player.y+joyY*210}}
  }
  function releaseJoy(){const g=G();joyActive=false;joyPointer=-1;joyX=0;joyY=0;if($('v11Stick'))$('v11Stick').style.transform='translate(0,0)';if(g){g.v11Move={x:0,y:0,active:false};g.touch=null}}

  function wire(){
    const layer=$('v11MobileLayer');if(!layer)return;
    const joy=$('v11Joystick');
    joy?.addEventListener('pointerdown',e=>{if(!isPlaying())return;e.preventDefault();e.stopPropagation();joyPointer=e.pointerId;joy.setPointerCapture?.(e.pointerId);setMoveFromPoint(e.clientX,e.clientY)},{passive:false});
    joy?.addEventListener('pointermove',e=>{if(e.pointerId!==joyPointer)return;e.preventDefault();setMoveFromPoint(e.clientX,e.clientY)},{passive:false});
    joy?.addEventListener('pointerup',e=>{if(e.pointerId===joyPointer)releaseJoy()},{passive:false});
    joy?.addEventListener('pointercancel',e=>{if(e.pointerId===joyPointer)releaseJoy()},{passive:false});
    joy?.addEventListener('lostpointercapture',releaseJoy);

    $('v11Fire')?.addEventListener('pointerdown',e=>{if(!isPlaying())return;e.preventDefault();e.stopPropagation();firePointers.add(e.pointerId);e.currentTarget.setPointerCapture?.(e.pointerId);setFire(true)},{passive:false});
    const endFire=e=>{firePointers.delete(e.pointerId);if(firePointers.size===0)setFire(false)};
    ['pointerup','pointercancel','pointerleave'].forEach(ev=>$('v11Fire')?.addEventListener(ev,endFire,{passive:false}));

    layer.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-v11-action],[data-v11-power],#v11PowerBtn,#v11Pause,#v11Auto,#v11Objective');if(!b)return;e.preventDefault();e.stopPropagation();
      const g=G();if(!g)return;
      if(b.id==='v11PowerBtn'){const d=$('v11PowerDock');d?.classList.toggle('open');return}
      if(b.id==='v11Pause'){g.togglePause();return}
      if(b.id==='v11Auto'){g.toggleAutoFire();return}
      if(b.id==='v11Objective'){b.classList.toggle('expanded');b.setAttribute('aria-expanded',String(b.classList.contains('expanded')));return}
      const a=b.dataset.v11Action;if(a==='lock')g.lockNearest?.();else if(a==='ability')g.useAbility?.();else if(a==='missile')g.fireMissiles?.();else if(a==='weapon')g.cycleWeapon?.(1);else if(a==='special')g.useSpecial?.();else if(a==='auto')g.toggleAutoFire?.();
      if(b.dataset.v11Power!==undefined){g.usePower?.(+b.dataset.v11Power);$('v11PowerDock')?.classList.remove('open')}
    },{passive:false,capture:true});

    document.addEventListener('pointerup',()=>{if(firePointers.size)firePointers.clear();setFire(false)},{passive:true});
  }

  function applyHand(){
    const layer=$('v11MobileLayer');if(!layer)return;
    const s=N8.v9?.persist?.settings||{};const hand=s.touchHand==='left'?'left':'right';
    if(hand===lastTouchHand && layer.dataset.hand) return;
    lastTouchHand=hand;layer.dataset.hand=hand;layer.classList.toggle('v11-left',hand==='left');
    $('v11LeftDock')?.classList.toggle('v11-swap',hand==='left');$('v11RightDock')?.classList.toggle('v11-swap',hand==='left');
  }

  function setLayerMode(g){
    const layer=$('v11MobileLayer');if(!layer)return;
    const on=mobile()&&g?.state===window.GAME?.PLAYING;
    layer.style.display=on?'block':'';
    // Disable legacy touch layers while the v11 tactical deck is active.
    $('v9Touch')?.classList.toggle('hidden',on);
    $('mobileControls')?.classList.toggle('hidden',on);
    applyHand();
    const s=N8.v9?.persist?.settings||{};layer.classList.toggle('v11-simplified',!!s.simplifiedHUD);layer.classList.toggle('v11-reduced-motion',!!s.reducedMotion);
    document.body.classList.toggle('v11-high-contrast',!!s.highContrast);
  }

  function updateTop(g){
    const lv=N8.sectorNo?N8.sectorNo(g.level):Math.ceil(g.level/10), sec=N8.sectorOf?N8.sectorOf(g.level):{n:'FRONTIER'};
    $('v11SectorValue')?.replaceChildren(document.createTextNode(`SECTOR ${String(lv).padStart(3,'0')} · ${sec.n}`));
    $('v11SectorSub')?.replaceChildren(document.createTextNode(`LV ${g.level} · WAVE ${g.wave}/${g.wavesPerLevel}`));
    const hostiles=(g.enemies||[]).filter(e=>!e.dead).length+(g.boss&&!g.boss.dead?1:0);
    $('v11CombatValue')?.replaceChildren(document.createTextNode(g.boss?'BOSS CONTACT':g.state===window.GAME?.PAUSED?'HOLD':'COMBAT'));
    $('v11CombatSub')?.replaceChildren(document.createTextNode(`${hostiles} HOSTILE${hostiles===1?'':'S'}`));
    const auto=$('v11Auto');if(auto){auto.classList.toggle('on',!!g.autoFire);auto.textContent=g.autoFire?'AUTO ON':'AUTO'}
  }
  function updateObjective(g){
    const ob=g.v8?.obj;
    let name='DESTROY ALL HOSTILES',meta=`${(g.enemies||[]).length} HOSTILES`,f=(g.enemies||[]).length?0:1;
    if(g.boss){name='DEFEAT COMMANDER';meta='BOSS CONTACT';f=g.boss.maxHp?1-g.boss.hp/g.boss.maxHp:0}
    else if(ob){name=ob.name||name;switch(ob.type){case'SURVIVE':meta=`${Math.max(0,Math.ceil((ob.goal-ob.prog)/60))}s REMAINING`;f=ob.prog/ob.goal;break;case'DESTROY_GENS':meta=`${ob.prog}/${ob.goal} GENERATORS`;f=ob.prog/ob.goal;break;case'COLLECT_CORES':meta=`${ob.prog}/${ob.goal} ENERGY CORES`;f=ob.prog/ob.goal;break;case'CLEAR_ASTEROIDS':meta=`${ob.prog}/${ob.goal} ASTEROIDS`;f=ob.prog/ob.goal;break;case'ESCORT':case'PROTECT_CARRIER':meta=ob.done?'DELIVERED':'ESCORT IN PROGRESS';f=ob.done?1:(g.v8?.ally?.hp/g.v8?.ally?.maxHp||0);break;default:meta=`${(g.enemies||[]).length} HOSTILES`;}}
    $('v11ObjectiveValue')?.replaceChildren(document.createTextNode(name));$('v11ObjectiveMeta')?.replaceChildren(document.createTextNode(meta));if($('v11ObjectiveBar'))$('v11ObjectiveBar').style.width=`${Math.max(0,Math.min(1,f))*100}%`;
  }
  function updateStatus(g){
    const p=g.player;if(!p)return;
    const pct=(v,m)=>Math.max(0,Math.min(1,v/Math.max(1,m)))*100;
    if($('v11HpBar'))$('v11HpBar').style.width=`${pct(p.hp,p.maxHp)}%`;if($('v11ShBar'))$('v11ShBar').style.width=`${pct(p.shield,p.maxShield)}%`;if($('v11EnBar'))$('v11EnBar').style.width=`${pct(p.energy,p.maxEnergy)}%`;
    $('v11HpText')?.replaceChildren(document.createTextNode(`HULL ${Math.ceil(p.hp)}`));$('v11ShText')?.replaceChildren(document.createTextNode(`SHIELD ${Math.ceil(p.shield)}`));$('v11EnText')?.replaceChildren(document.createTextNode(`CORE ${Math.ceil(p.energy)}`));
    const w=N8.W?.[g.wmode|0];$('v11Weapon')?.replaceChildren(document.createTextNode(w?.n||p.config?.name||'WEAPON'));$('v11EnergyText')?.replaceChildren(document.createTextNode(`ENERGY ${Math.round(p.energy/p.maxEnergy*100)}%`));
  }
  function updateTarget(g){
    const t=g.lock?.e;if(t&&!t.dead){$('v11TargetName')?.replaceChildren(document.createTextNode(t.name||t.kind||'HOSTILE TARGET'));const max=t.maxHp||t.hp||1;if($('v11TargetHp'))$('v11TargetHp').style.width=`${Math.max(0,Math.min(1,t.hp/max))*100}%`;$('v11Target')?.classList.remove('hidden');const r=$('v11TargetReticle');if(r){const cr=g.canvas.getBoundingClientRect();r.style.left=`${cr.left+t.x/g.canvas.width*cr.width}px`;r.style.top=`${cr.top+t.y/g.canvas.height*cr.height}px`;r.style.display='block'}}else{$('v11TargetName')?.replaceChildren(document.createTextNode('NO TARGET'));if($('v11TargetHp'))$('v11TargetHp').style.width='0%';$('v11TargetReticle')?.style.setProperty('display','none')}}

  /* Use the existing dash implementation, but feed it the mobile joystick direction when present. */
  hook(GameEngine.prototype,'dash',function(o,...a){const g=this,v=g.v11Move;if(v?.active&&Math.hypot(v.x,v.y)>.16){const old=g.keys;const k={...old};g.keys={ArrowLeft:v.x<-.18,ArrowRight:v.x>.18,ArrowUp:v.y<-.18,ArrowDown:v.y>.18};try{return o.apply(g,a)}finally{g.keys=k}}return o.apply(g,a)});
  hook(GameEngine.prototype,'startGame',function(o,...a){const r=o.apply(this,a);inject();this.v11Move={x:0,y:0,active:false};setLayerMode(this);return r});
  hook(GameEngine.prototype,'exitGame',function(o,...a){releaseJoy();const r=o.apply(this,a);$('v11MobileLayer')?.style.setProperty('display','none');return r});
  hook(GameEngine.prototype,'togglePause',function(o,...a){const r=o.apply(this,a);setLayerMode(this);return r});
  hook(GameEngine.prototype,'bind',function(o,...a){const r=o.apply(this,a);inject();return r});

  if(N8.post)N8.post.push(g=>{
    if(!init)inject();
    if(g.state===window.GAME?.PLAYING){setLayerMode(g);if(joyActive&&g.player){g.v11Move={x:joyX,y:joyY,active:true};g.touch={x:g.player.x+joyX*210,y:g.player.y+joyY*210}}
      if((g.v8?.t||0)%6===0){updateTop(g);updateObjective(g);updateStatus(g);updateTarget(g)}
    }else{setLayerMode(g)}
  });
  // Some mobile browsers report a desktop pointer profile even on touch screens.
  // Never make the combat layer depend on pointer:coarse alone; width + HUD state are enough.
  window.addEventListener('DOMContentLoaded',()=>{
    inject();
    const retry=()=>{
      if(!inject()){window.setTimeout(retry,120);return;}
      const g=G();if(g)setLayerMode(g);
    };
    window.setTimeout(retry,0);
  },{once:true});
  window.setTimeout(()=>{const g=G();if(g){inject();setLayerMode(g)}},250);
  window.addEventListener('resize',()=>{const g=G();if(g){inject();setLayerMode(g)}});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v11-ui.js');
