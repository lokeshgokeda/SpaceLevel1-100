'use strict';
/* NEBULA PROTOCOL v15 — UI layer. Extends the v14 Command Matrix HUD (adds a strip into it, no second HUD),
   adds the COMMAND CENTER modal (controls / audio mixer / God Mode), banners, Q weapon switch, mobile ULT. */
(()=>{
const N8=window.N8,V=N8&&N8.v15;if(!N8||!V)return;
const $=id=>document.getElementById(id),G=()=>window.gameEngine,playing=()=>G()&&G().state===GAME.PLAYING;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- banners (boss warning, combo, ultimate, objective…) ---------- */
let bt=0;
const banner=(txt,col)=>{const b=$('v15Banner');if(!b)return;b.textContent=txt;b.style.setProperty('--c',col||'#38d9ff');b.classList.remove('show');void b.offsetWidth;b.classList.add('show');clearTimeout(bt);bt=setTimeout(()=>b.classList.remove('show'),2200)};
N8.v15UI={banner};

/* ---------- audio mixer: Master / Music / SFX / UI → existing v9 channel settings (own storage key survives God sessions) ---------- */
const MIXK='nebula15_mixer',mix=Object.assign({master:1,music:.45,sfx:1,ui:1},(()=>{try{return JSON.parse(localStorage.getItem(MIXK)||'{}')}catch{return{}}})());
const applyMix=()=>{const s=N8.v9&&N8.v9.persist&&(N8.v9.persist.settings=N8.v9.persist.settings||{});if(!s)return;
  s.volumeMaster=mix.master;s.volumeMusic=mix.music;s.volumeWeapons=mix.sfx;s.volumeExplosions=mix.sfx;s.volumeUI=mix.ui;try{localStorage.setItem(MIXK,JSON.stringify(mix))}catch{}};
V.mix=mix;V.applyMix=applyMix;

/* ---------- command center ---------- */
const KEYS=[['MOVE','W A S D / Arrows'],['AIM','Mouse'],['PRIMARY ATTACK','Left Click (hold)'],['SECONDARY','Right Click'],['DASH','Space (or Shift)'],['SPECIAL POWER','E'],['WEAPON SWITCH','Q'],['RECHARGE','R'],['ULTIMATE','F'],['PAUSE','Esc / P'],
  ['POWERS 1–4','1 2 3 4'],['SHIP ABILITY','C'],['SHIP POWER','G'],['TARGET LOCK','T'],['AUTO-FIRE','V']];
const GT=[['hp','Infinite Health'],['shield','Infinite Shield'],['energy','Infinite Energy'],['ammo','Infinite Ammo'],['cd','No Cooldowns'],['rapid','Rapid Fire'],['inv','Invincibility'],['ohk','One-Hit Kill'],['freeze','Enemy Freeze'],['slow','Slow Motion'],['ult','Unlimited Ultimate']];
const GA=[['enemy','SPAWN ENEMY'],['elite','SPAWN ELITE'],['boss','SPAWN BOSS'],['clear','CLEAR ENEMIES'],['score','+10,000 SCORE'],['credits','+1,000 CREDITS']];
const sl=(k,l)=>`<label class="v15-sl"><span>${l}</span><input type="range" min="0" max="100" value="${Math.round(mix[k]*100)}" data-mix="${k}"><b>${Math.round(mix[k]*100)}</b></label>`;
const panelHTML=()=>`
<div class="v15-card" role="dialog" aria-label="Command Center">
 <div class="v15-head"><div><div class="v15-eye">NEBULA PROTOCOL // v15</div><h3>COMMAND CENTER</h3></div><button type="button" class="v15-x" data-v15="close" aria-label="Close">✕</button></div>
 <div class="v15-tabs"><button type="button" data-v15tab="controls" class="on">CONTROLS</button><button type="button" data-v15tab="audio">AUDIO</button><button type="button" data-v15tab="god">GOD MODE</button></div>
 <div class="v15-body" id="v15Body"></div></div>`;
const tabHTML={
 controls:()=>`<div class="v15-keys">${KEYS.map(([a,k])=>`<div><span>${a}</span><b>${k}</b></div>`).join('')}</div>
  <div class="v15-note"><b>MOBILE</b> — left: movement joystick · right: FIRE, SECONDARY (missile), DASH, SPECIAL, ULT · extra: weapon, lock, pause. Scrolling and browser gestures are disabled during play.</div>`,
 audio:()=>`<div class="v15-mix">${sl('master','MASTER')}${sl('music','MUSIC')}${sl('sfx','SFX')}${sl('ui','UI')}</div><div class="v15-note">Changes apply instantly and are remembered.</div>`,
 god:()=>{const g=V.god;return `<div class="v15-warn">⚠ DEBUG / SPECIAL MODE — OFF by default. While a God Mode session is active, progress saving is paused so your normal save cannot be altered. Reload the page to return to normal saving.</div>
  <label class="v15-master"><input type="checkbox" data-god="master" ${g.on?'checked':''}><span>ENABLE GOD MODE</span></label>
  <div class="v15-god ${g.on?'':'off'}"><div class="v15-gt">${GT.map(([k,l])=>`<label><input type="checkbox" data-god="${k}" ${g.t[k]?'checked':''}><span>${l}</span></label>`).join('')}</div>
  <label class="v15-sl"><span>DAMAGE ×</span><input type="range" min="1" max="20" value="${g.dmg}" data-godn="dmg"><b>${g.dmg}</b></label>
  <label class="v15-sl"><span>SPEED ×</span><input type="range" min="10" max="30" value="${Math.round(g.spd*10)}" data-godn="spd"><b>${g.spd.toFixed(1)}</b></label>
  <div class="v15-ga">${GA.map(([a,l])=>`<button type="button" data-goda="${a}">${l}</button>`).join('')}</div>
  <div class="v15-note" id="v15GodNote">Spawn / clear actions work during a mission.</div></div>`}};
let tab='controls';
const render=()=>{const b=$('v15Body');if(!b)return;b.innerHTML=tabHTML[tab]();document.querySelectorAll('[data-v15tab]').forEach(t=>t.classList.toggle('on',t.dataset.v15tab===tab))};
const open=t=>{if(t)tab=t;ensure();$('v15Panel').classList.add('open');render()};
const close=()=>$('v15Panel')&&$('v15Panel').classList.remove('open');
V.openPanel=open;

/* ---------- DOM bootstrap ---------- */
let ready=false;
function ensure(){
  if(ready)return;ready=true;
  document.body.insertAdjacentHTML('beforeend',`<div id="v15Banner" class="v15-banner" aria-live="polite"></div><div id="v15Panel" class="v15-panel">${panelHTML()}</div>`);
  const P=$('v15Panel');
  P.addEventListener('click',e=>{if(e.target===P){close();return}const b=e.target.closest('button');if(!b)return;e.stopPropagation();
    if(b.dataset.v15==='close')close();else if(b.dataset.v15tab){tab=b.dataset.v15tab;render()}
    else if(b.dataset.goda){const ok=V.godAct(b.dataset.goda);const n=$('v15GodNote');if(n)n.textContent=ok?'Done.':(V.god.on?'Start a mission first.':'Enable God Mode first.')}});
  P.addEventListener('input',e=>{const t=e.target;
    if(t.dataset.mix){mix[t.dataset.mix]=t.value/100;t.nextElementSibling.textContent=t.value;applyMix()}
    else if(t.dataset.godn){const k=t.dataset.godn,v=+t.value;V.god[k]=k==='spd'?v/10:v;t.nextElementSibling.textContent=k==='spd'?(v/10).toFixed(1):v}});
  P.addEventListener('change',e=>{const t=e.target;if(t.dataset.god){V.godSet(t.dataset.god,t.checked);if(t.dataset.god==='master'){render();if(t.checked)banner('GOD MODE ENABLED — SAVING PAUSED','#ff5a2d')}}});
  P.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}});
}
function addEntryButtons(){
  const mk=(cls,txt)=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=txt;b.dataset.v15open='1';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open()});return b};
  const sa=document.querySelector('#mainMenu .secondary-actions');if(sa&&!sa.querySelector('[data-v15open]'))sa.appendChild(mk('btn','COMMAND CENTER'));
  const pa=document.querySelector('#pauseOverlay .pause-actions');if(pa&&!pa.querySelector('[data-v15open]'))pa.appendChild(mk('btn','COMMAND CENTER'));
}

/* ---------- HUD strip inside the v14 matrix ---------- */
const STRIP=`<div class="v15-strip" id="v15Strip">
 <div class="v15-cell ult" id="v15UltCell"><span>ULTIMATE</span><div class="v15-bar"><i id="v15UltFill"></i></div><b id="v15UltTxt">0%</b></div>
 <div class="v15-cell"><span>COMBO</span><b id="v15Combo">—</b></div>
 <div class="v15-cell"><span>ARMOR</span><b id="v15Armor">0%</b></div>
 <div class="v15-cell"><span>HOSTILES</span><b id="v15Foes">0</b></div>
 <div class="v15-cell"><span>AMMO</span><b id="v15Ammo">∞</b></div>
 <div class="v15-cell"><span>ABILITY</span><div class="v15-bar"><i id="v15AbFill"></i></div><b id="v15AbTxt">—</b></div>
 <div class="v15-cell boss" id="v15BossCell"><span id="v15BossPh">PHASE 1</span><div class="v15-bar sh"><i id="v15BossSh"></i></div></div>
</div>`;
let tk=0;
let mounted=false;
function mountHud(){if(mounted)return true;const u=$('v14CombatUI');if(!u)return false;
  if(!$('v15Strip')){u.insertAdjacentHTML('afterbegin',STRIP);
    const sys=u.querySelector('.v14-system-grid');
    if(sys&&!sys.querySelector('[data-v15="ult"]')){const b=document.createElement('button');b.type='button';b.className='v14-btn v15-ultbtn';b.dataset.v15='ult';b.textContent='ULT';sys.appendChild(b)}
    const m=u.querySelector('.v14-btn.missile');if(m)m.textContent='SECONDARY';
    const ks=u.querySelector('.v14-keystrip');if(ks)ks.innerHTML='MOVE <b>WASD</b> · FIRE <b>LMB</b> · SECONDARY <b>RMB</b> · DASH <b>SPACE</b> · SPECIAL <b>E</b> · WEAPON <b>Q</b> · RECHARGE <b>R</b> · ULT <b>F</b> · PAUSE <b>ESC</b>';
    // v14.css is written for a .v14-bottom grid that v14-ui.js never created (groups were absolutely positioned with inline offsets, so they overlapped on phones). Build the intended grid.
    if(!u.querySelector('.v14-bottom')){const bot=document.createElement('div');bot.className='v14-bottom';
      const mv=u.querySelector('.v14-move'),at=u.querySelector('.v14-attack'),sy=u.querySelector('.v14-systems'),pw=u.querySelector('#v14PowerBar');
      for(const el of[mv,at,sy])if(el){el.removeAttribute('style');bot.appendChild(el)}u.appendChild(bot);if(pw)u.appendChild(pw);
      const top=u.querySelector('.v14-top'),strip=$('v15Strip'),root=document.documentElement.style;
      const measure=()=>{const tb=top?top.getBoundingClientRect().bottom:90,sh=strip?strip.offsetHeight:0;root.setProperty('--v15-top',Math.round(tb+6)+'px');root.setProperty('--v15-sh',sh+'px');root.setProperty('--v15-bh',Math.round(bot.offsetHeight+Math.max(8,parseFloat(getComputedStyle(bot).bottom)||8)+6)+'px')};
      if(window.ResizeObserver){const ro=new ResizeObserver(measure);[top,strip,bot].forEach(x=>x&&ro.observe(x))}window.addEventListener('resize',measure,{passive:true});measure()}
    u.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('[data-v15="ult"]');if(!b)return;e.preventDefault();e.stopPropagation();G()&&G().useUltimate&&G().useUltimate()},{capture:true,passive:false})}
  mounted=!!$('v15Strip')&&!!u.querySelector('.v14-bottom');return true}
const pct=(a,m)=>m?Math.max(0,Math.min(100,a/m*100)):0;
const WTXT=(g,p)=>{const W=N8.W[g.wmode|0];if(!W)return'—';if(V.god.on&&V.god.t.ammo)return'∞';if(W.en>0)return Math.floor(p.energy/Math.max(.1,W.en))+' SHOTS';return'∞'};
/* DOM writes only when a value changes (keeps the HUD cheap on mobile) */
const cache=new Map(),els={};
const el=id=>els[id]||(els[id]=$(id));
const T=(id,t)=>{if(cache.get(id)!==t){cache.set(id,t);const e=el(id);if(e)e.textContent=t}};
const Wd=(id,p)=>{p=Math.round(p);const k=id+'w';if(cache.get(k)!==p){cache.set(k,p);const e=el(id);if(e)e.style.width=p+'%'}};
const C=(id,cls,on)=>{const k=id+cls;if(cache.get(k)!==on){cache.set(k,on);const e=el(id);if(e)e.classList.toggle(cls,on)}};
N8.post.push(g=>{
  if(!mountHud())return;if((tk++%3)!==0)return;
  const p=g.player,v=g.v15,on=g.state===GAME.PLAYING;if(!on||!p||!v)return;
  Wd('v15UltFill',pct(v.ult,v.ultMax));T('v15UltTxt',v.ultReady?'READY · F':Math.floor(v.ult)+'%');C('v15UltCell','rdy',!!v.ultReady);
  T('v15Combo',v.streak>1?`x${v.streak} · ${V.TMULT[v.tier].toFixed(2)}×`:'—');
  T('v15Armor',Math.round((p.armor||0)*100)+'%');
  let foes=0;for(const e of g.enemies)if(!e.dead)foes++;T('v15Foes',String(foes+(g.boss&&g.boss.hp>0?1:0)));
  T('v15Ammo',WTXT(g,p));
  const A=N8.ABIL&&N8.ABIL[p.cls],ab=p.v8&&p.v8.ab;if(A&&ab){const mx=ab.max||A.cd,r=ab.cd>0?1-ab.cd/mx:1;Wd('v15AbFill',r*100);T('v15AbTxt',ab.cd>0?Math.ceil(ab.cd/60)+'s':(p.energy>=A.e?A.n:'LOW ENERGY'))}
  const b=g.boss,bo=!!(b&&b.hp>0);C('v15BossCell','show',bo);
  if(bo){T('v15BossPh',(['PHASE 1','PHASE 2','PHASE 3','ENRAGED'][b.ph|0]||'PHASE 1')+(N8.bossShieldUp&&b.comps&&N8.bossShieldUp(b)?' · SHIELDED':''));
    let hp=0,mh=0;for(const c of(b.comps||[]))if(c.type==='GEN'&&!c.dead){hp+=c.hp;mh+=c.maxHp}Wd('v15BossSh',mh?pct(hp,mh):0)}
});

/* ---------- input: scroll / gesture guards, ESC closes panel first (Q = weapon switch and R = recharge are handled by v6) ---------- */
window.addEventListener('keydown',e=>{
  if(e.repeat)return;const k=(e.key||'').toLowerCase(),t=e.target&&e.target.tagName;if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;
  if(k==='escape'&&$('v15Panel')&&$('v15Panel').classList.contains('open')){e.stopImmediatePropagation();close()}
},true);
['touchmove','gesturestart','gesturechange'].forEach(ev=>document.addEventListener(ev,e=>{if(playing()&&e.cancelable)e.preventDefault()},{passive:false}));
document.addEventListener('contextmenu',e=>{if(playing())e.preventDefault()});
document.addEventListener('dblclick',e=>{if(playing())e.preventDefault()});
document.addEventListener('DOMContentLoaded',()=>{ensure();addEntryButtons();applyMix()});
if(document.readyState!=='loading'){ensure();addEntryButtons();applyMix()}
setTimeout(()=>{addEntryButtons();applyMix()},1200); // once, after v9-save has finished loading persist.settings
N8.hook(GameEngine.prototype,'startGame',function(o,...a){applyMix();return o.apply(this,a)});
window.NEBULA_BOOT?.module('v15-ui');
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v15-ui.js');
