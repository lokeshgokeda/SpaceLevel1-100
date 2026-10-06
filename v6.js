'use strict';
/* NEBULA PROTOCOL v6 layer — loaded after script.js. Patches GameEngine/Player prototypes so the v5 systems stay intact.
   Adds: input fixes, weapon modes, missiles, energy recharge, settings (volume/quality/assist), control guide, pause-restart. */
(()=>{
const GE=GameEngine, PL=Player, $=id=>document.getElementById(id);
const MODES=['PULSE','SCATTER','RAILGUN'], QUALITY={LOW:200,MEDIUM:450,HIGH:700,ULTRA:1100};
const hook=(name,fn)=>{const o=GE.prototype[name];GE.prototype[name]=function(...a){return fn.call(this,o,...a)}};

/* FIX: once the mouse moved, WASD was ignored, and holding Shift made keys uppercase (dash + WASD broke). */
const pu=PL.prototype.update;
PL.prototype.update=function(keys,touch,mouse,w,h){
  const kb=keys.a||keys.d||keys.w||keys.s||keys.ArrowLeft||keys.ArrowRight||keys.ArrowUp||keys.ArrowDown;
  if(kb&&!touch){pu.call(this,keys,null,null,w,h);const g=window.gameEngine;if(g){g.mouse.x=this.x;g.mouse.y=this.y}}
  else pu.call(this,keys,touch,mouse,w,h);
};

hook('bind',function(o){
  o.call(this);const g=this;
  g.settings.volume??=50;g.settings.assist??=false;
  g.settings.quality??=(matchMedia('(pointer:coarse)').matches?((navigator.hardwareConcurrency||4)>4?'MEDIUM':'LOW'):'HIGH');
  g.applySettings();
  // lowercase key mirror (capture) + Q / R shortcuts
  window.addEventListener('keydown',e=>{
    if(e.key&&e.key.length===1)g.keys[e.key.toLowerCase()]=true;
    if(e.repeat||g.state!==GAME.PLAYING)return;const k=(e.key||'').toLowerCase();
    if(k==='q')g.cycleWeapon();else if(k==='r')g.recharge();
  },true);
  window.addEventListener('keyup',e=>{if(e.key&&e.key.length===1)g.keys[e.key.toLowerCase()]=false},true);
  // right click = homing missiles (never starts primary fire)
  g.canvas.addEventListener('contextmenu',e=>e.preventDefault());
  g.canvas.addEventListener('pointerdown',e=>{if(e.button===2){e.stopImmediatePropagation();g.fireMissiles()}},true);
  // HUD weapon readout, mobile dash, control guide
  $('hud').insertAdjacentHTML('beforeend','<div id="weaponHud" class="weapon-hud"></div>');
  $('mobileControls').insertAdjacentHTML('afterbegin','<button id="mobileDash" class="touch-btn special-touch" type="button">DASH</button>');
  $('mobileDash').addEventListener('pointerdown',e=>{e.preventDefault();g.dash()});
  $('pauseExitBtn').insertAdjacentHTML('beforebegin','<button id="pauseRestartBtn" class="btn" type="button">RESTART</button>');
  $('pauseRestartBtn').onclick=()=>{g.state=GAME.PLAYING;$('pauseOverlay').classList.add('hidden');g.startGame(g.selectedStartLevel,g.gameMode)};
  $('uiContainer').insertAdjacentHTML('beforeend',`<div id="v6Guide" class="pause-overlay hidden"><div class="pause-box cyber-panel"><div class="eyebrow">PC CONTROL GUIDE</div><h2>FLIGHT BRIEFING</h2>
   <p>MOUSE / WASD — move &amp; aim<br>LEFT CLICK / SPACE — fire<br>RIGHT CLICK — homing missiles<br>Q — switch weapon · R — recharge energy<br>SHIFT — dash · E — special · F — auto fire<br>P / ESC — pause</p><button id="guideOk" class="btn primary" type="button">UNDERSTOOD</button></div></div>`);
  $('guideOk').onclick=()=>g.togglePause();
  // settings controls
  $('settingsMenu').querySelector('.settings-list').insertAdjacentHTML('beforeend',`<label><span>MASTER VOLUME</span><input id="volRange" type="range" min="0" max="100"></label>
   <label><span>GRAPHICS</span><select id="qualitySel">${Object.keys(QUALITY).map(q=>`<option>${q}</option>`).join('')}</select></label>
   <label><span>ASSIST MODE</span><input id="assistToggle" type="checkbox"></label><label><span>FULLSCREEN</span><button id="fsBtn" class="btn mini" type="button">TOGGLE</button></label>`);
  const v=$('volRange'),q=$('qualitySel'),a=$('assistToggle');
  v.value=g.settings.volume;q.value=g.settings.quality;a.checked=!!g.settings.assist;
  v.oninput=()=>g.setSetting('volume',Number(v.value));q.onchange=()=>g.setSetting('quality',q.value);a.onchange=()=>g.setSetting('assist',a.checked);
  if(!document.documentElement.requestFullscreen)$('fsBtn').closest('label').remove();
  else $('fsBtn').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{});
});

GE.prototype.applySettings=function(){
  this.maxParticles=QUALITY[this.settings.quality]||700;
  this.audio.master=Math.max(.0001,this.settings.volume/100*.4);
};
hook('setSetting',function(o,k,v){o.call(this,k,v);this.applySettings()});
hook('enemyBullet',function(o,x,y,vx,vy,...r){const s=this.settings.assist?.75:1;return o.call(this,x,y,vx*s,vy*s,...r)});

GE.prototype.updateWeaponHud=function(){$('weaponHud').innerHTML=`WEAPON <b>${MODES[this.wmode|0]}</b> [Q]<br>MISSILES [RMB] · RECHARGE [R]`};
GE.prototype.cycleWeapon=function(){this.wmode=((this.wmode|0)+1)%MODES.length;this.updateWeaponHud();this.audio.tone(900,.06,'square',.5);this.toast('WEAPON: '+MODES[this.wmode])};
GE.prototype.recharge=function(){const p=this.player;if(!p||this.rechargeCd>0||p.energy>=p.maxEnergy)return;p.energy=Math.min(p.maxEnergy,p.energy+45);this.rechargeCd=360;this.addText(p.x,p.y-40,'+ENERGY','#38d9ff');this.audio.power()};
GE.prototype.fireMissiles=function(){
  const p=this.player;if(this.state!==GAME.PLAYING||!p||this.missileCd>0||p.energy<12)return;
  p.energy-=12;this.missileCd=90;
  for(const s of[-1,1]){const b=new Bullet(p.x+s*14,p.y-10,s*3,-7,'#ff7a2e',false,p.damage*3.2,4.5,0,3,0);b.missile=true;this.bullets.push(b)}
  this.audio.tone(320,.35,'sawtooth',.5);
};
const nearest=(g,x,y)=>{let t=null,best=1e9;for(const e of(g.boss?[g.boss,...g.enemies]:g.enemies)){if(e.dead)continue;const d=Math.hypot(e.x-x,e.y-y);if(d<best){best=d;t=e}}return t};

hook('fire',function(o){
  const p=this.player;if(!p||p.fireCooldown>0)return;
  const m=this.wmode|0,n0=this.bullets.length,c=p.config.color;
  if(m===1&&p.energy>=2&&n0<240){
    p.fireCooldown=Math.max(14,p.fireRate*2.2);p.energy-=2;
    for(let i=-2;i<=2;i++){const a=i*.16;this.bullets.push(new Bullet(p.x,p.y-20,Math.sin(a)*13,-Math.cos(a)*13,'#ffb02e',false,p.damage*.7,3.2,0,1,0))}
    this.audio.tone(260,.12,'square',.6);
  }else if(m===2&&p.energy>=10&&n0<240){
    p.fireCooldown=50;p.energy-=10;
    this.bullets.push(new Bullet(p.x,p.y-24,0,-26,'#8affff',false,p.damage*6,5,0,2,99));
    this.audio.tone(1200,.25,'sawtooth',.6);this.cameraShake=Math.max(this.cameraShake,2);
  }else o.call(this);
  if(this.settings.assist){const t=nearest(this,p.x,p.y-200);if(t)for(let i=n0;i<this.bullets.length;i++){const b=this.bullets[i];b.vx+=Math.max(-1.2,Math.min(1.2,(t.x-b.x)/90))}}
});

hook('update',function(o){
  if(this.state===GAME.PLAYING){
    if(this.missileCd>0)this.missileCd--;if(this.rechargeCd>0)this.rechargeCd--;
    for(const b of this.bullets){ // missile steering toward nearest hostile
      if(!b.missile||b.dead)continue;const t=nearest(this,b.x,b.y);if(!t)continue;
      const ca=Math.atan2(b.vy,b.vx);let da=Math.atan2(t.y-b.y,t.x-b.x)-ca;da=Math.atan2(Math.sin(da),Math.cos(da));
      const na=ca+Math.max(-.12,Math.min(.12,da)),s=Math.min(14,Math.hypot(b.vx,b.vy)+.5);b.vx=Math.cos(na)*s;b.vy=Math.sin(na)*s;
    }
  }
  return o.call(this);
});

hook('startGame',function(o,...a){
  clearTimeout(this.transitionTimer); // FIX: stale level-transition timers survived restart
  this.wmode=0;this.missileCd=0;this.rechargeCd=0;o.apply(this,a);this.updateWeaponHud();
  if(!localStorage.getItem('nebula_guide_seen')&&!matchMedia('(pointer:coarse)').matches){this.state=GAME.PAUSED;$('v6Guide').classList.remove('hidden')}
});
hook('togglePause',function(o){const gd=$('v6Guide');if(!gd.classList.contains('hidden')){gd.classList.add('hidden');try{localStorage.setItem('nebula_guide_seen','1')}catch{}}return o.call(this)});
hook('exitGame',function(o){$('v6Guide').classList.add('hidden');return o.call(this)});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v6.js');
