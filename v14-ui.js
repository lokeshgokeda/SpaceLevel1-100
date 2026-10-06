'use strict';
/* NEBULA PROTOCOL v14 — structured controls + readable combat telemetry. */
(()=>{
  const N8=window.N8,GE=window.GameEngine,$=id=>document.getElementById(id); if(!N8||!GE)return;
  const G=()=>window.gameEngine, GAME=window.GAME;
  const MOBILE=()=>window.innerWidth<=900 || (window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);
  const MARKUP=`
  <section id="v14CombatUI" aria-label="Tactical command matrix">
    <div class="v14-top">
      <div class="v14-panel v14-vitals">
        <div class="v14-brandline"><b id="v14Ship">VIPER</b><span id="v14Role">TACTICAL FRAME</span></div>
        <div class="v14-health-row"><label>HULL</label><div class="v14-health-track"><i id="v14Hull" class="v14-health-fill v14-hull"></i></div><strong id="v14HullText">100 / 100</strong></div>
        <div class="v14-health-row"><label>SHIELD</label><div class="v14-health-track"><i id="v14Shield" class="v14-health-fill v14-shield"></i></div><strong id="v14ShieldText">55 / 55</strong></div>
        <div class="v14-health-row"><label>ENERGY</label><div class="v14-health-track"><i id="v14Energy" class="v14-health-fill v14-energy"></i></div><strong id="v14EnergyText">100 / 100</strong></div>
      </div>
      <div class="v14-panel v14-center">
        <div class="micro" id="v14Sector">SECTOR 001 · FRONTIER</div>
        <div class="mission" id="v14Mission">DESTROY ALL HOSTILES</div>
        <div class="sub" id="v14MissionMeta">WAVE 1/4 · 0 HOSTILES</div>
        <div class="v14-bossbar" id="v14BossBar"><div class="v14-bossname" id="v14BossName">COMMANDER</div><div class="v14-boss-track"><i id="v14BossFill" class="v14-boss-fill"></i></div></div>
      </div>
      <div class="v14-top-actions">
        <button class="v14-btn" data-v14="pause">PAUSE</button><button class="v14-btn warn" data-v14="exit">EXIT</button>
      </div>
      <div class="v14-panel v14-status"><span>WEAPON <b id="v14Weapon">PULSE BLASTER</b></span><span>HEAT <b id="v14Heat">0%</b></span><span>COMBO <b id="v14Combo">x1.0</b></span></div>
    </div>
    <div class="v14-panel v14-target"><div class="micro">TARGET TRACK</div><b id="v14Target">NO TARGET</b><span id="v14TargetMeta">LOCK: —</span></div>
    <div class="v14-flash" id="v14Flash"></div><div class="v14-crit" id="v14Crit">HULL IMPACT</div>
    <div class="v14-panel v14-group v14-move" style="position:absolute;left:8px;bottom:max(8px,env(safe-area-inset-bottom))"><div class="v14-title">MOVE</div><div id="v14Joystick" class="v14-joystick"><div id="v14Stick" class="v14-stick"></div></div></div>
    <div class="v14-panel v14-group v14-attack" style="position:absolute;left:134px;bottom:max(8px,env(safe-area-inset-bottom));width:min(42vw,470px)">
      <div class="v14-title">ATTACK CONTROL</div>
      <div class="v14-attack-grid">
        <button class="v14-btn fire" data-a="fire">FIRE</button>
        <button class="v14-btn weapon" data-a="weapon">WEAPON</button>
        <button class="v14-btn missile" data-a="missile">MISSILE</button>
        <button class="v14-btn" data-a="weaponPrev">PREV</button>
        <div class="v14-attack-readout"><span>ACTIVE</span><b id="v14WeaponReadout">PULSE BLASTER</b><span id="v14Ammo">READY</span></div>
      </div>
    </div>
    <div class="v14-panel v14-group v14-systems" style="position:absolute;right:8px;bottom:max(8px,env(safe-area-inset-bottom));width:min(28vw,250px)">
      <div class="v14-title">TACTICAL SYSTEMS</div>
      <div class="v14-system-grid">
        <button class="v14-btn" data-a="lock">LOCK</button><button class="v14-btn" data-a="dash">DASH</button>
        <button class="v14-btn" data-a="ability">ABILITY</button><button class="v14-btn" data-a="special">SPECIAL</button>
        <button class="v14-btn" data-a="ship">SHIP POWER</button><button class="v14-btn" data-a="recharge">RECHARGE</button>
        <button class="v14-btn" data-a="auto">AUTO</button><button class="v14-btn" data-a="sound">SFX</button>
      </div>
    </div>
    <div id="v14PowerBar" class="v14-powerbar">
      <button class="v14-btn v14-power" data-p="0"><span class="slot">P1</span><span class="name">—</span><span class="cost"></span><i class="cool"></i></button>
      <button class="v14-btn v14-power" data-p="1"><span class="slot">P2</span><span class="name">—</span><span class="cost"></span><i class="cool"></i></button>
      <button class="v14-btn v14-power" data-p="2"><span class="slot">P3</span><span class="name">—</span><span class="cost"></span><i class="cool"></i></button>
      <button class="v14-btn v14-power" data-p="3"><span class="slot">P4</span><span class="name">—</span><span class="cost"></span><i class="cool"></i></button>
    </div>
    <div class="v14-keystrip">MOVE <b>WASD</b> · FIRE <b>LMB / SPACE</b> · MISSILE <b>RMB</b> · LOCK <b>T</b> · POWERS <b>1–4</b> · DASH <b>SHIFT</b> · ABILITY <b>C</b> · SPECIAL <b>E</b></div>
  </section>`;
  let ready=false,joyId=null,fireIds=new Set(),tick=0;
  const legacy=['v13CommandDeck','v12MobileLayer','v11MobileLayer','v10MobileLayer','v9Touch','mobileControls','mobileDash','v8Mob','v8MobP'];
  const show=(e,on)=>e?.classList.toggle('v14-hidden',on);
  function inject(){if(ready)return true;const hud=$('hud');if(!hud)return false;hud.insertAdjacentHTML('beforeend',MARKUP);ready=true;wire();return true}
  function playing(){return G()?.state===GAME?.PLAYING}
  function setMove(clientX,clientY){const g=G(),el=$('v14Joystick'),stick=$('v14Stick');if(!g||!el||!stick)return;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=Math.max(16,r.width*.36);let dx=clientX-cx,dy=clientY-cy,d=Math.hypot(dx,dy)||1;if(d>max){dx=dx/d*max;dy=dy/d*max}stick.style.transform=`translate(${dx}px,${dy}px)`;const x=dx/max,y=dy/max;g.v14Move={x,y,active:true};if(g.player)g.touch={x:g.player.x+x*190,y:g.player.y+y*190}}
  function releaseMove(){const g=G();joyId=null;const s=$('v14Stick');if(s)s.style.transform='translate(0,0)';if(g){g.v14Move={x:0,y:0,active:false};g.touch=null}}
  function pulse(btn){btn?.classList.add('pressed');setTimeout(()=>btn?.classList.remove('pressed'),90)}
  function action(a){const g=G();if(!g||!playing())return;try{if(a==='weapon')g.cycleWeapon(1);else if(a==='weaponPrev')g.cycleWeapon(-1);else if(a==='missile')g.fireMissiles();else if(a==='lock')g.lockNearest();else if(a==='dash')g.dash();else if(a==='ability')g.useAbility?.();else if(a==='special')g.useSpecial();else if(a==='ship')g.useShipPower?.();else if(a==='recharge')g.recharge?.();else if(a==='auto')g.toggleAutoFire?.();else if(a==='sound')window.N8?.v14Sound?.toggle?.()}catch(err){console.warn('v14 action',a,err)}}
  function fire(on){const g=G();if(!g)return;g.pointerFire=!!on;if(on)g.audio?.init?.()}
  function wire(){const root=$('v14CombatUI'),joy=$('v14Joystick'),fireBtn=root?.querySelector('[data-a="fire"]');
    joy?.addEventListener('pointerdown',e=>{if(!playing())return;e.preventDefault();e.stopPropagation();joyId=e.pointerId;joy.setPointerCapture?.(e.pointerId);setMove(e.clientX,e.clientY)},{passive:false});
    joy?.addEventListener('pointermove',e=>{if(e.pointerId!==joyId)return;e.preventDefault();setMove(e.clientX,e.clientY)},{passive:false});
    ['pointerup','pointercancel','pointerleave'].forEach(ev=>joy?.addEventListener(ev,e=>{if(e.pointerId===joyId)releaseMove()},{passive:false}));
    fireBtn?.addEventListener('pointerdown',e=>{if(!playing())return;e.preventDefault();e.stopPropagation();fireIds.add(e.pointerId);fireBtn.setPointerCapture?.(e.pointerId);fire(true);pulse(fireBtn)},{passive:false});
    const end=e=>{fireIds.delete(e.pointerId);if(!fireIds.size)fire(false)};['pointerup','pointercancel','pointerleave'].forEach(ev=>fireBtn?.addEventListener(ev,end,{passive:false}));
    root?.addEventListener('pointerdown',e=>{const b=e.target.closest?.('button');if(!b)return;e.preventDefault();e.stopPropagation();pulse(b);if(b.dataset.v14==='pause'){G()?.togglePause();return}if(b.dataset.v14==='exit'){G()?.exitGame();return}if(b.dataset.p!==undefined){G()?.usePower?.(+b.dataset.p);return}const a=b.dataset.a;if(a==='fire')return;action(a)},{capture:true,passive:false});
    document.addEventListener('pointerup',()=>{fireIds.clear();fire(false);releaseMove()},{passive:true});
    window.addEventListener('resize',()=>sync(G()),{passive:true});
  }
  function sync(g){if(!inject())return;const ui=$('v14CombatUI'),on=playing();ui?.classList.toggle('visible',on);document.body.classList.toggle('v14-combat',on);if(on)legacy.forEach(id=>$(id)?.classList.add('v14-hidden'));else legacy.forEach(id=>$(id)?.classList.remove('v14-hidden'));}
  const pct=(v,m)=>m?Math.max(0,Math.min(1,v/m)):0;
  function width(id,f){const e=$(id);if(e)e.style.width=`${pct(f,1)*100}%`}
  function fmt(v,m){return `${Math.ceil(Math.max(0,v))} / ${Math.ceil(Math.max(0,m||0))}`}
  function update(g){if(!inject())return;sync(g);if(!playing()||!g.player)return;if((tick++%2)!==0)return;const p=g.player;
    const sec=N8.sectorOf?.(g.level)||{n:'FRONTIER'};const sn=N8.sectorNo?.(g.level)||Math.ceil(g.level/10);$('v14Sector').textContent=`SECTOR ${String(sn).padStart(3,'0')} · ${sec.n}`;$('v14Mission').textContent=g.boss?'DEFEAT COMMANDER':(g.v8?.obj?.name||'DESTROY ALL HOSTILES');$('v14MissionMeta').textContent=`WAVE ${g.wave}/${g.wavesPerLevel} · ${(g.enemies||[]).filter(e=>!e.dead).length+(g.boss&&!g.boss.dead?1:0)} HOSTILES`;
    $('v14Ship').textContent=p.config?.name||p.config?.id||'SHIP';$('v14Role').textContent=`${p.cls||'TACTICAL'} FRAME`;$('v14HullText').textContent=fmt(p.hp,p.maxHp);$('v14ShieldText').textContent=fmt(p.shield,p.maxShield);$('v14EnergyText').textContent=fmt(p.energy,p.maxEnergy);width('v14Hull',p.hp/p.maxHp);width('v14Shield',p.shield/p.maxShield);width('v14Energy',p.energy/p.maxEnergy);
    const wi=g.wmode|0,w=N8.W?.[wi];$('v14Weapon').textContent=w?.n||'PULSE BLASTER';$('v14WeaponReadout').textContent=w?.n||'PULSE BLASTER';const heat=Math.max(0,Math.min(100,g.heat||0));$('v14Heat').textContent=`${Math.round(heat)}%`;$('v14Combo').textContent=`x${(g.combo||1).toFixed(1)}`;$('v14Ammo').textContent=g.overheat?'OVERHEAT':(p.fireCooldown>0?`CYCLE ${Math.ceil(p.fireCooldown/60)}s`:'READY');
    const t=g.lock?.e&&!g.lock.e.dead?g.lock.e:null;$('v14Target').textContent=t?(t.def?.name||t.role||t.type||'HOSTILE'):'NO TARGET';$('v14TargetMeta').textContent=g.lock?(g.lock.t>=30?'LOCK CONFIRMED':'ACQUIRING'): 'LOCK: —';
    const bb=$('v14BossBar');bb?.classList.toggle('show',!!g.boss);if(g.boss){$('v14BossName').textContent=g.boss.def?.name||g.boss.name||'COMMANDER';$('v14BossFill').style.width=`${pct(g.boss.hp,g.boss.maxHp)*100}%`}
    const powers=N8.loadout?.powers||[];for(let i=0;i<4;i++){const b=document.querySelector(`#v14PowerBar [data-p="${i}"]`),pi=powers[i],P=N8.P?.[pi];if(!b)continue;b.querySelector('.name').textContent=P?.n||'LOCKED';b.querySelector('.cost').textContent=P?.e!=null?`${P.e}E`:'';const cd=g.pcd?.[i]||g.v8?.pcd?.[i]||0,mx=g.pcdMax?.[i]||g.v8?.pcdMax?.[i]||P?.cd||1;b.querySelector('.cool').style.transform=`scaleX(${cd>0?Math.max(0,Math.min(1,cd/mx)):0})`;b.disabled=!P||!!N8.powerUnlocked&&!N8.powerUnlocked(i)||p.energy<(P?.e||0)||cd>0;b.classList.toggle('ready',!b.disabled);}
    const critical=p.hp/p.maxHp<.25;$('v14HullText').classList.toggle('critical',critical);$('v14Flash').style.opacity=critical?.12:0;
  }
  N8.addDraw?.(63.55,(g,c)=>{const p=g.player;if(!p||g.state!==GAME.PLAYING)return;const f=p.maxHp?p.hp/p.maxHp:1;c.save();c.translate(p.x,p.y+44);c.globalCompositeOperation='lighter';c.strokeStyle=f<.25?'#ff4c78':f<.55?'#ffc457':'#64e9ff';c.lineWidth=2;c.globalAlpha=.8;c.beginPath();c.arc(0,0,27,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,f));c.stroke();c.restore()});
  N8.post=N8.post||[];N8.post.push(g=>update(g));
  N8.v14UI={sync,update};
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v14-ui.js');
