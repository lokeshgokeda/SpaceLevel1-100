'use strict';
/* NEBULA PROTOCOL v8 — spacecraft combat-computer HUD, radar v2, target lock v2, damage direction, cinematics,
   hangar v2 (rotating ship, compare, loadout), armory tabs, upgrade tree UI, settings (sensitivity/smoothing/assist), mobile, adaptive quality. */
(()=>{
const N8=window.N8,{hook,clamp,rnd,$}=N8,GE=GameEngine,A8=N8.audio;
const F='700 10px Orbitron,system-ui,sans-serif';
const cache=new WeakMap();
const setT=(el,v)=>{if(!el)return;v=String(v);if(el._t!==v){el._t=v;el.textContent=v}};
const setW=(el,f)=>{if(!el)return;const v=(clamp(f,0,1)*100).toFixed(1)+'%';if(el._w!==v){el._w=v;el.style.width=v}};
const setC=(el,cls,on)=>{if(!el)return;on=!!on;if(el['_c'+cls]!==on){el['_c'+cls]=on;el.classList.toggle(cls,on)}};
const setH=(el,h)=>{if(!el)return;if(el._h!==h){el._h=h;el.innerHTML=h}};

/* ================= HUD markup ================= */
const HUD=`<div id="v8Hud">
 <div class="v8-tl"><div class="gl v8-sector"><span class="lbl">SECTOR</span><b id="v8SecName">SECTOR 001</b><span id="v8SecSub"></span></div>
  <div class="gl v8-obj" id="v8Obj"><span class="lbl">OBJECTIVE</span><b id="v8ObjName">DESTROY ALL HOSTILES</b><div class="v8-bar"><i id="v8ObjBar"></i></div><small id="v8ObjTxt"></small></div>
  <div class="gl v8-obj" id="v8Pil"><span class="lbl">PILOT</span><b id="v8PilTxt">LV 1</b><div class="v8-bar"><i id="v8PilBar" style="background:#ffcc33"></i></div><small id="v8PilSub"></small></div></div>
 <div class="v8-tr"><canvas id="v8Radar" width="380" height="380"></canvas>
  <div class="gl v8-tgt" id="v8Tgt"><span class="lbl">TARGET</span><b id="v8TgtName">NO TARGET</b>
   <div class="row"><span>RANGE</span><em id="v8TgtRng">—</em></div>
   <div class="row"><span>HULL</span><em id="v8TgtHp">—</em></div><div class="v8-mini"><i id="v8TgtHpB" style="background:#63ff9a"></i></div>
   <div class="row"><span>SHIELD</span><em id="v8TgtSh">—</em></div><div class="v8-mini"><i id="v8TgtShB" style="background:#5ec8ff"></i></div>
   <div class="st" id="v8TgtSt">[T] / MMB TO LOCK</div></div></div>
 <div class="v8-bc">
  <div class="v8-pw" id="v8Pw"></div>
  <div class="gl v8-wdet"><div class="nm" id="v8WName">PULSE BLASTER</div>
   <div class="cell"><div class="lbl"><span>HEAT</span><b id="v8WHeatT">0%</b></div><div class="v8-mini heat"><i id="v8WHeat"></i></div></div>
   <div class="cell"><div class="lbl"><span>CYCLE</span><b id="v8WCdT">READY</b></div><div class="v8-mini"><i id="v8WCd" style="background:#5ec8ff"></i></div></div>
   <div class="cell"><div class="lbl"><span>AMMO / CHARGE</span><b id="v8WAmmo">∞</b></div><div class="v8-mini"><i id="v8WCh" style="background:#c9a0ff"></i></div></div></div>
  <div class="v8-wstrip" id="v8Ws"></div>
 </div>
 <div id="v8Banner"><b id="v8BanT"></b><span id="v8BanS"></span></div>
 <div id="v8Reward" class="gl"><h3 id="v8RwT">COMMANDER DESTROYED</h3><p id="v8Rw1"></p><p id="v8Rw2"></p><p id="v8Rw3"></p></div>
 <div id="v8Crit"><span>CRITICAL — HULL INTEGRITY LOW</span></div>
 <div id="v8Cine"><div class="bar t"></div><div class="bar b"></div><div class="txt"><div class="warn" id="v8CnW">⚠ BOSS DETECTED ⚠</div><div class="nm" id="v8CnN"></div><div class="cl" id="v8CnC"></div></div></div>
 <div class="v8-mob" id="v8Mob"><button class="touch-btn special-touch" id="v8mAb" type="button">ABILITY</button><button class="touch-btn special-touch" id="v8mWp" type="button">WEAPON</button><button class="touch-btn special-touch" id="v8mLk" type="button">LOCK</button><button class="touch-btn special-touch" id="v8mMs" type="button">MISSILE</button></div>
 <div class="v8-mob v8-mobp" id="v8MobP"><button class="touch-btn special-touch" data-p="0" type="button">P1</button><button class="touch-btn special-touch" data-p="1" type="button">P2</button><button class="touch-btn special-touch" data-p="2" type="button">P3</button><button class="touch-btn special-touch" data-p="3" type="button">P4</button></div>
</div>`;
const PSHORT={'NOVA BLAST':'NOVA','AEGIS':'AEGIS','CHAIN LIGHTNING':'CHAIN','GRAVITY WELL':'GRAV WELL','PLASMA STORM':'PLASMA STORM','SHIELD BURST':'SHIELD BURST','MISSILE BARRAGE':'BARRAGE','OVERDRIVE':'OVERDRIVE','VOID CLOAK':'VOID CLOAK','DRONE SWARM':'DRONES','ORBITAL STRIKE':'ORBITAL','SINGULARITY':'SINGULARITY'};
const WSHORT=['PULSE','SCATTER','RAIL','PLASMA','LASER','NOVA','GRAV','ION','PARTICLE','BARRAGE','ANTIMTR'];
let uiInit=false;
function buildHud(g){
  if(uiInit)return;uiInit=true;
  $('hud').insertAdjacentHTML('beforeend',HUD);
  const sb=document.querySelector?document.querySelector('.status-bars'):null;
  if(sb&&sb.insertAdjacentHTML)sb.insertAdjacentHTML('beforeend','<div class="bar-header"><span>WEAPON HEAT</span><b id="v8HeatTxt">0%</b></div><div class="bar-bg"><div id="v8HeatBar" class="bar-fill" style="background:linear-gradient(90deg,#ffcc33,#ff3d5a)"></div></div>');
  const ws=$('v8Ws');ws.innerHTML=N8.W.map((w,i)=>`<div class="gl v8-w" data-i="${i}" style="--wc:${w.c}"><i>${i<9?'⇧'+(i+1):i===9?'⇧0':'⇧-'}</i><b>${WSHORT[i]}</b></div>`).join('');
  const bc=$('bossHpContainer');if(bc&&bc.insertAdjacentHTML)bc.insertAdjacentHTML('beforeend','<div class="v8-bosscomps" id="v8BossComps"></div>');
  // mobile buttons
  const on=(id,fn)=>{const b=$(id);if(b)b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();fn()})};
  on('v8mAb',()=>g.useAbility());on('v8mWp',()=>g.cycleWeapon(1));on('v8mLk',()=>g.lockNearest());on('v8mMs',()=>g.fireMissiles());
  const mp=$('v8MobP');if(mp&&mp.querySelectorAll)mp.querySelectorAll('button').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();g.usePower(+b.dataset.p)}));
  // guide text
  const gd=$('v6Guide');if(gd&&gd.querySelector){const p=gd.querySelector('p');if(p)p.innerHTML='MOUSE / WASD — move &amp; aim · LEFT CLICK / SPACE — fire<br>RIGHT CLICK — missiles · T / MIDDLE CLICK — target lock<br>Q / WHEEL — next weapon · ⇧Q — previous · ⇧1-0 — direct select · X — swap primary/secondary<br>1-4 — powers · C — ship ability · SHIFT — dash · E — special · R — recharge · F — auto fire<br>P / ESC — pause'}
  const h=gd&&gd.querySelector&&gd.querySelector('h2');if(h)h.textContent='FLIGHT BRIEFING // V8'}
hook(GE.prototype,'bind',function(o){o.call(this);buildHud(this);buildSettings(this);initHangar(this);autoQuality(this)});

/* ================= banners / cinematics / reward ================= */
N8.banner=(t,col,sub)=>{const b=$('v8Banner');if(!b)return;const bt=$('v8BanT');bt.textContent=t;bt.style.color=col||'#fff';setT($('v8BanS'),sub||'');b.classList.remove('show');void b.offsetWidth;b.classList.add('show')};
N8.rewardPanel=(g,b,n)=>{const bs=g.gameMode==='BOSS_RUSH'?g.bossRushStage:g.level,r=$('v8Reward');if(!r)return;setT($('v8RwT'),'COMMANDER DESTROYED');setT($('v8Rw1'),`${b.def.name} · ${b.cls||''}`);setT($('v8Rw2'),`+${200+bs*18} CREDITS   +${300+g.level*8} XP`);setT($('v8Rw3'),`${n} LOOT DROPS INBOUND`);r.classList.remove('show');void r.offsetWidth;r.classList.add('show')};
function updCine(g){const v=g.v8,c=v.cine,el=$('v8Cine');if(!el)return;const on=!!c;setC(el,'on',on);if(!c)return;
  const t=c.t;const w=$('v8CnW'),n=$('v8CnN'),cl=$('v8CnC');
  if(t<75){setT(w,'⚠ BOSS DETECTED ⚠');setT(n,'');setT(cl,'')}else if(t<180){setT(w,'');setT(n,c.name);n.style.color=c.color;setT(cl,'CLASS: '+c.cls)}else{setT(w,'COMBAT BEGINS');setT(n,'');setT(cl,'')}}

/* ================= HUD update ================= */
const KIND_COL={LASER:'#ff5577',PLASMA:'#ffa02e',MISSILE:'#ff6a3d',MINE:'#ff4040',WAVE:'#d488ff',SNIPER:'#c07dff',IMPACT:'#ffffff'};
const KIND_NAME={LASER:'LASER',PLASMA:'PLASMA',MISSILE:'MISSILE',MINE:'MINE',WAVE:'ENERGY WAVE',SNIPER:'SNIPER BEAM',IMPACT:'IMPACT'};
N8.addDmgDir=(g,hi,ang)=>{const v=g.v8;v.dir=v.dir||[];const kind=(hi&&hi.kind)||'IMPACT';for(const d of v.dir){if(d.kind===kind&&Math.abs(Math.atan2(Math.sin(d.ang-ang),Math.cos(d.ang-ang)))<.6){d.ang=ang;d.life=90;d.warn=false;return}}if(v.dir.length<6)v.dir.push({ang,kind,life:90})};
function hudUpdate(g){
  const v=g.v8,p=g.player,t=v.t;if(!p||!p.v8)return;
  const sec=N8.sectorOf(g.level);
  setT($('v8SecName'),`SECTOR ${String(N8.sectorNo(g.level)).padStart(3,'0')} · ${sec.n}`);setT($('v8SecSub'),g.gameMode==='BOSS_RUSH'?`BOSS RUSH · STAGE ${g.bossRushStage||g.level}`:`LEVEL ${g.level} · WAVE ${g.wave}/${g.wavesPerLevel}`);
  const ob=v.obj,oe=$('v8Obj');
  if(g.boss){setT($('v8ObjName'),'DEFEAT THE COMMANDER');const b=g.boss;const n=b.comps?b.comps.filter(c=>c.dead).length:0;setT($('v8ObjTxt'),`${b.comps?n+' / '+b.comps.length+' COMPONENTS DESTROYED':''}`);setW($('v8ObjBar'),b.maxHp?1-b.hp/b.maxHp:0);setC(oe,'done',false);setC(oe,'fail',false)}
  else if(ob){let txt='',f=0;switch(ob.type){
     case'SURVIVE':f=ob.prog/ob.goal;txt=`${Math.max(0,Math.ceil((ob.goal-ob.prog)/60))}s REMAINING`;break;
     case'DESTROY_GENS':f=ob.prog/ob.goal;txt=`${ob.prog} / ${ob.goal} GENERATORS`;break;
     case'CLEAR_ASTEROIDS':f=ob.prog/ob.goal;txt=`${ob.prog} / ${ob.goal} ASTEROIDS`;break;
     case'COLLECT_CORES':f=ob.prog/ob.goal;txt=`${ob.prog} / ${ob.goal} ENERGY CORES`;break;
     case'PROTECT_CARRIER':case'ESCORT':{const a=v.ally;f=a?a.hp/a.maxHp:0;txt=a?`ALLY HULL ${Math.round(f*100)}%`:(ob.done?'DELIVERED':'INBOUND');if(ob.type==='ESCORT'&&a)txt+=` · ${Math.round(a.y/g.canvas.height*100)}% ROUTE`;break}
     default:{f=g.enemies.length?0:1;txt=`${g.enemies.length} HOSTILES`}}
    setT($('v8ObjName'),ob.done?ob.name+' ✓':ob.failed?ob.name+' ✗':ob.name);setT($('v8ObjTxt'),txt);setW($('v8ObjBar'),ob.done?1:f);setC(oe,'done',ob.done);setC(oe,'fail',ob.failed)}
  // pilot
  const pl=N8.pilot,need=N8.xpNeed(pl.level);setT($('v8PilTxt'),`PILOT LV ${pl.level} · ${g.player.cls||''}`);setW($('v8PilBar'),pl.xp/need);setT($('v8PilSub'),`XP ${Math.floor(pl.xp)} / ${need}${v.streak&&v.streak.n>1?' · STREAK x'+v.streak.n:''}`);
  // weapon panel
  const wi=g.wmode|0,W=N8.W[wi];
  if(W){setT($('v8WName'),W.n);$('v8WName').style.color=W.c;
    const heat=clamp(g.heat/100,0,1);setW($('v8WHeat'),heat);setT($('v8WHeatT'),g.overheat?'OVERHEAT':Math.round(heat*100)+'%');setC($('v8WHeatT'),'v7hot',g.overheat);
    const cdm=Math.max(1,p.maxCd||p.fireRate||10),cdr=p.fireCooldown>0?clamp(1-p.fireCooldown/cdm,0,1):1;setW($('v8WCd'),cdr);setT($('v8WCdT'),p.fireCooldown>0?'CYCLING':'READY');
    let ammo='∞',ch=1;if(W.en>0){const n=Math.floor(p.energy/W.en);ammo=n>99?'99+':n+' SHOTS';ch=clamp(p.energy/p.maxEnergy,0,1)}else{ammo='∞';ch=1}
    if(wi===4){ammo=p.energy>2?'BEAM':'NO ENERGY'}setT($('v8WAmmo'),ammo);setW($('v8WCh'),ch)}
  const hk=g.heat/100;setW($('v8HeatBar'),hk);setT($('v8HeatTxt'),g.overheat?'OVERHEAT':Math.round(clamp(hk,0,1)*100)+'%');
  // weapon strip
  const ws=$('v8Ws');if(ws&&ws.children&&ws.children.length){const key=wi+':'+pl.level;if(ws._k!==key){ws._k=key;for(let i=0;i<ws.children.length;i++){const e=ws.children[i];setC(e,'on',i===wi);setC(e,'lk',!N8.weaponUnlocked(i))}}}
  // powers + ability + missile
  const pw=$('v8Pw');if(pw){if(!pw._built||pw._lo!==N8.loadout.powers.join()){pw._built=1;pw._lo=N8.loadout.powers.join();let h='';N8.loadout.powers.forEach((pi,s)=>{const P=N8.P[pi];h+=`<div class="gl v8-slot" id="v8ps${s}" style="border-color:${P.c}44"><span class="k">${s+1}</span><b>${PSHORT[P.n]||P.n}</b><small>${P.e} EN</small><div class="ov" id="v8pso${s}"></div><div class="cd" id="v8psc${s}"></div></div>`});
      const A=N8.ABIL[p.cls]||{n:'ABILITY',e:0};h+=`<div class="gl v8-slot" id="v8psA"><span class="k">C</span><b>${A.n}</b><small>${A.e} EN</small><div class="ov" id="v8psAo"></div></div>`;
      const M=N8.MISSILES[N8.loadout.missile];h+=`<div class="gl v8-slot" id="v8psM"><span class="k">RMB</span><b>${M.n.replace(' MISSILES','')}</b><small>${M.e} EN</small><div class="ov" id="v8psMo"></div></div>`;pw.innerHTML=h}
    N8.loadout.powers.forEach((pi,s)=>{const P=N8.P[pi],cd=(v.pcd&&v.pcd[pi])||0,mx=(v.pcdMax&&v.pcdMax[pi])||P.cd,el=$('v8ps'+s);if(!el)return;const lk=!N8.powerUnlocked(pi);setC(el,'lk',lk);setC(el,'rdy',!lk&&cd<=0&&p.energy>=P.e);setC(el,'ne',!lk&&cd<=0&&p.energy<P.e);const o=$('v8pso'+s);if(o){const f=cd>0?cd/mx:0,tv='scaleY('+f.toFixed(2)+')';if(o._s!==tv){o._s=tv;o.style.transform=tv}}});
    const ae=$('v8psA');if(ae){const A=N8.ABIL[p.cls],cd=p.v8.ab.cd,mx=p.v8.ab.max||A.cd,lk=N8.pilot.level<3&&!N8.pilot.cheat;setC(ae,'lk',lk);setC(ae,'rdy',!lk&&cd<=0&&p.energy>=A.e);setC(ae,'ne',!lk&&cd<=0&&p.energy<A.e);const o=$('v8psAo');if(o){const tv='scaleY('+(cd>0?cd/mx:0).toFixed(2)+')';if(o._s!==tv){o._s=tv;o.style.transform=tv}}}
    const me=$('v8psM');if(me){const M=N8.MISSILES[N8.loadout.missile],cd=g.missileCd||0,mx=v.missMax||M.cd;setC(me,'rdy',cd<=0&&p.energy>=M.e);setC(me,'ne',cd<=0&&p.energy<M.e);const o=$('v8psMo');if(o){const tv='scaleY('+(cd>0?clamp(cd/mx,0,1):0).toFixed(2)+')';if(o._s!==tv){o._s=tv;o.style.transform=tv}}}}
  // target panel
  const L=g.lock,tg=$('v8Tgt');
  if(L&&L.e&&!L.e.dead){const e=L.e,boss=e===g.boss,ok=L.t>=30,d=Math.round(Math.hypot(e.x-p.x,e.y-p.y));
    setT($('v8TgtName'),boss?`${e.def.name} · BOSS`:`${(e.type==='ELITE'?'ELITE ':'')}${(e.role||'HOSTILE').replace('_',' ')}`);setT($('v8TgtRng'),d+' m');setT($('v8TgtHp'),`${Math.max(0,Math.round(e.hp))} / ${Math.round(e.maxHp)}`);setW($('v8TgtHpB'),e.hp/e.maxHp);
    const sh=boss?(N8.bossShieldUp(e)?1:0):(e.maxSh?e.sh/e.maxSh:0);setT($('v8TgtSh'),boss?(N8.bossShieldUp(e)?'GENERATORS ONLINE':'DOWN'):(e.maxSh?`${Math.round(e.sh)} / ${Math.round(e.maxSh)}`:'NONE'));setW($('v8TgtShB'),sh);
    const M=N8.MISSILES[N8.loadout.missile],mr=g.missileCd<=0&&p.energy>=M.e;setT($('v8TgtSt'),!ok?`LOCKING ${Math.round(L.t/30*100)}%`:mr?'TARGET LOCK · MISSILE READY':'LOCKED · MISSILES CHARGING');
    setC(tg,'lock',true);setC(tg,'ready',ok&&mr);setC(tg,'boss',boss)}
  else{setT($('v8TgtName'),'NO TARGET');setT($('v8TgtRng'),'—');setT($('v8TgtHp'),'—');setT($('v8TgtSh'),'—');setW($('v8TgtHpB'),0);setW($('v8TgtShB'),0);setT($('v8TgtSt'),'[T] / MMB TO LOCK');setC(tg,'lock',false);setC(tg,'ready',false);setC(tg,'boss',false)}
  // boss bar: phase + components
  const b=g.boss;if(b&&b.comps){setT($('bossPowerText'),`${b.cls||''} · ${['PHASE 1','PHASE 2','PHASE 3 — ARENA','FINAL PHASE'][b.ph|0]}${N8.bossShieldUp(b)?' · SHIELDED':' · CORE EXPOSED'}`);
    const bc=$('v8BossComps');if(bc){const cls={GEN:'',TURRET:'t',ENGINE:'e',ARMOR:'a'};setH(bc,b.comps.map(c=>`<i class="${c.dead?'x':cls[c.type]}" title="${c.id}"></i>`).join(''))}}
  // critical
  setC($('v8Crit'),'on',p.hp/p.maxHp<.25);
  updCine(g)}
N8.post.push(g=>{const v=g.v8;if(v.t%3===0)hudUpdate(g);if(v.t%2===0)drawRadar(g)});

/* ================= radar v2 ================= */
function drawRadar(g){
  const cv=$('v8Radar');if(!cv||!cv.getContext)return;const c=cv.getContext('2d'),S=cv.width,R=S/2-6,p=g.player,W=g.canvas.width,H=g.canvas.height,range=Math.max(W,H)*.62,v=g.v8,t=v.t;
  c.clearRect(0,0,S,S);c.save();c.translate(S/2,S/2);
  c.strokeStyle='rgba(140,190,230,.28)';c.lineWidth=1.5;for(const f of[1,.66,.33]){c.beginPath();c.arc(0,0,R*f,0,7);c.stroke()}
  c.beginPath();c.moveTo(-R,0);c.lineTo(R,0);c.moveTo(0,-R);c.lineTo(0,R);c.globalAlpha=.4;c.stroke();c.globalAlpha=1;
  const sw=(t*.05)%6.2832;c.fillStyle='rgba(94,200,255,.12)';c.beginPath();c.moveTo(0,0);c.arc(0,0,R,sw-.5,sw);c.closePath();c.fill();
  c.font='700 20px Orbitron,sans-serif';c.textAlign='center';
  const P=(x,y)=>{let dx=(x-p.x)/range*R,dy=(y-p.y)/range*R;const d=Math.hypot(dx,dy);let edge=false;if(d>R-4){dx*=(R-4)/d;dy*=(R-4)/d;edge=true}return[dx,dy,edge,Math.atan2(dy,dx)]};
  const tri=(x,y,s,col,ang,fill)=>{c.save();c.translate(x,y);c.rotate(ang+Math.PI/2);c.beginPath();c.moveTo(0,-s);c.lineTo(s*.8,s*.8);c.lineTo(-s*.8,s*.8);c.closePath();c.fillStyle=col;c.strokeStyle=col;c.lineWidth=2;fill?c.fill():c.stroke();c.restore()};
  const dia=(x,y,s,col)=>{c.beginPath();c.moveTo(x,y-s);c.lineTo(x+s,y);c.lineTo(x,y+s);c.lineTo(x-s,y);c.closePath();c.strokeStyle=col;c.fillStyle=col;c.lineWidth=2;c.fill()};
  const sq=(x,y,s,col,fill)=>{c.strokeStyle=col;c.fillStyle=col;c.lineWidth=2;fill?c.fillRect(x-s,y-s,s*2,s*2):c.strokeRect(x-s,y-s,s*2,s*2)};
  const lockE=g.lock&&g.lock.e&&!g.lock.e.dead?g.lock.e:null;
  // loot & pickups
  for(const l of v.loot||[]){const q=P(l.x,l.y);sq(q[0],q[1],4,N8.RARITY[l.r].c,true)}
  for(const u of g.powerUps||[]){const q=P(u.x,u.y);c.strokeStyle='#4dff9a';c.lineWidth=2;c.beginPath();c.moveTo(q[0]-5,q[1]);c.lineTo(q[0]+5,q[1]);c.moveTo(q[0],q[1]-5);c.lineTo(q[0],q[1]+5);c.stroke()}
  // objectives
  for(const k of v.cores||[]){const q=P(k.x,k.y);dia(q[0],q[1],7,'#ffcc00')}
  for(const r of v.rocks||[]){const q=P(r.x,r.y);c.strokeStyle='#ffb34a';c.lineWidth=2;c.beginPath();c.arc(q[0],q[1],5,0,7);c.stroke()}
  if(v.ally&&v.ally.hp>0){const q=P(v.ally.x,v.ally.y);c.strokeStyle='#66ff99';c.lineWidth=3;c.beginPath();c.arc(q[0],q[1],9,0,7);c.stroke();c.fillStyle='#66ff99';c.fillText('A',q[0],q[1]+7)}
  // enemy missiles / mines
  for(const b of g.bullets){if(!b.isEnemy)continue;const k=N8.shotKind(b);if(k!=='MISSILE'&&k!=='MINE')continue;const q=P(b.x,b.y);if(k==='MISSILE'){const a=.55+.45*Math.sin(t*.4);c.globalAlpha=a;tri(q[0],q[1],6,'#ff6a3d',Math.atan2(b.vy,b.vx),true);c.globalAlpha=1}else{c.strokeStyle='#ff4040';c.lineWidth=2;c.beginPath();c.arc(q[0],q[1],4,0,7);c.stroke()}}
  // hostiles
  for(const e of g.enemies){if(e.dead)continue;const q=P(e.x,e.y),elite=e.type==='ELITE'||e.role==='ELITE';
    if(e.objT){sq(q[0],q[1],8,'#ffcc00',false)}
    if(elite)dia(q[0],q[1],8,'#ffcc00');else if(e.role==='CARRIER'||e.role==='BOMBER'){sq(q[0],q[1],6,'#ff8a3d',true)}else if(e.role==='SHIELD_DRONE'){c.strokeStyle='#5ffff0';c.lineWidth=2;c.beginPath();c.arc(q[0],q[1],5,0,7);c.stroke()}else tri(q[0],q[1],q[2]?5:6,e.role==='ASSASSIN'?'#c56bff':'#ff3355',Math.PI/2,true)}
  // boss
  if(g.boss){const q=P(g.boss.x,g.boss.y);c.strokeStyle='#ff3355';c.fillStyle='rgba(255,51,85,.35)';c.lineWidth=3;c.beginPath();for(let i=0;i<6;i++){const a=i*1.0472+t*.02;const x=q[0]+Math.cos(a)*13,y=q[1]+Math.sin(a)*13;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.fill();c.stroke()}
  // locked target bracket
  if(lockE){const q=P(lockE.x,lockE.y),s=12+Math.sin(t*.3)*1.5;c.strokeStyle='#ffffff';c.lineWidth=2;for(const [sx,sy] of[[-1,-1],[1,-1],[1,1],[-1,1]]){c.beginPath();c.moveTo(q[0]+sx*s,q[1]+sy*(s-6));c.lineTo(q[0]+sx*s,q[1]+sy*s);c.lineTo(q[0]+sx*(s-6),q[1]+sy*s);c.stroke()}}
  // player
  tri(0,0,9,'#5ec8ff',-Math.PI/2,true);
  c.restore()}

/* ================= canvas overlays: target lock v2 (world) + crosshair / damage direction / warnings (screen) ================= */
N8.addDraw(72,(g,c)=>{
  const L=g.lock;if(!L||!L.e||L.e.dead)return;const e=L.e,p=g.player,t=g.v8.t,boss=e===g.boss,prog=clamp(L.t/30,0,1),ok=prog>=1;
  const s=(e.size||60)*(boss?.95:.8)+10+(1-prog)*30,col=boss?(ok?'#ff3355':'#ff7a8a'):(ok?'#ffcc00':'#ff9d2e');
  c.save();c.translate(e.x,e.y);c.strokeStyle=col;c.fillStyle=col;c.lineWidth=2;c.globalAlpha=.95;
  if(boss){for(let k=0;k<2;k++){c.save();c.rotate(t*.02*(k?-1:1));c.beginPath();const r=s*(1+k*.16);for(let i=0;i<6;i++){const a=i*1.0472;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.globalAlpha=k?.4:.9;c.stroke();c.restore()}
    c.globalAlpha=.9;for(let i=0;i<4;i++){c.save();c.rotate(i*1.5708);c.beginPath();c.moveTo(0,-s-22);c.lineTo(0,-s-8);c.stroke();c.restore()}}
  else{for(const [sx,sy] of[[-1,-1],[1,-1],[1,1],[-1,1]]){c.beginPath();c.moveTo(sx*s,sy*(s-14));c.lineTo(sx*s,sy*s);c.lineTo(sx*(s-14),sy*s);c.stroke()}}
  c.globalAlpha=.95;c.lineWidth=3;c.beginPath();c.arc(0,0,s+9,-Math.PI/2,-Math.PI/2+prog*6.2832);c.stroke();
  if(ok){c.globalAlpha=.5+.3*Math.sin(t*.35);c.lineWidth=2;c.beginPath();c.arc(0,0,s+15+Math.sin(t*.35)*3,0,7);c.stroke()}
  c.globalAlpha=1;c.font=F;c.textAlign='center';
  const d=Math.round(Math.hypot(e.x-p.x,e.y-p.y)),M=N8.MISSILES[N8.loadout.missile],mr=ok&&g.missileCd<=0&&p.energy>=M.e;
  c.fillText(`${boss?e.def.name:(e.role||'HOSTILE').replace('_',' ')} · ${d}m`,0,-s-12-(boss?22:0));
  if(ok){c.fillStyle=mr?'#4dff9a':col;c.font='800 11px Orbitron,sans-serif';c.globalAlpha=mr?.6+.4*Math.sin(t*.4):1;c.fillText(mr?'TARGET LOCK · MISSILE READY':'TARGET LOCK',0,s+32)}else{c.globalAlpha=1;c.fillText('LOCKING '+Math.round(prog*100)+'%',0,s+32)}
  c.globalAlpha=1;const bw=Math.max(50,s*1.3);c.fillStyle='rgba(0,0,0,.6)';c.fillRect(-bw/2,s+12,bw,4);c.fillStyle='#63ff9a';c.fillRect(-bw/2,s+12,bw*clamp(e.hp/e.maxHp,0,1),3);
  if(!boss&&e.maxSh>0){c.fillStyle='#5ec8ff';c.fillRect(-bw/2,s+17,bw*clamp(e.sh/e.maxSh,0,1),2)}
  c.restore()});
N8.addDraw(96,(g,c)=>{
  const p=g.player,v=g.v8,t=v.t;if(!p)return;
  // incoming missile warnings feed the damage-direction list before it is drawn
  if(t%6===0){for(const b of g.bullets){if(!b.isEnemy||N8.shotKind(b)!=='MISSILE')continue;const d=Math.hypot(b.x-p.x,b.y-p.y);if(d<380){const ang=Math.atan2(b.y-p.y,b.x-p.x);v.dir=v.dir||[];let f=null;for(const q of v.dir)if(q.kind==='MISSILE'&&Math.abs(Math.atan2(Math.sin(q.ang-ang),Math.cos(q.ang-ang)))<.6){f=q;break}if(f){f.ang=ang;f.life=Math.max(f.life,18);f.warn=true}else if(v.dir.length<6){v.dir.push({ang,kind:'MISSILE',life:18,warn:true});if(!v.mslBeep||v.mslBeep<=0){A8.play('LOCK');v.mslBeep=30}}}}}
  if(v.mslBeep>0)v.mslBeep--;
  // damage direction indicators
  if(v.dir&&v.dir.length){c.save();c.font='800 11px Orbitron,sans-serif';c.textAlign='center';const AR=['→','↘','↓','↙','←','↖','↑','↗'];
    for(let i=v.dir.length-1;i>=0;i--){const d=v.dir[i];d.life--;if(d.life<=0){v.dir.splice(i,1);continue}
      const a=clamp(d.life/40,0,1),col=KIND_COL[d.kind]||'#fff',R=92,x=p.x+Math.cos(d.ang)*R,y=p.y+Math.sin(d.ang)*R;
      c.globalAlpha=a*(d.warn?.6+.4*Math.sin(t*.6):1);c.fillStyle=col;c.save();c.translate(x,y);c.rotate(d.ang);c.beginPath();c.moveTo(15,0);c.lineTo(-7,-11);c.lineTo(-2,0);c.lineTo(-7,11);c.closePath();c.fill();c.restore();
      const idx=(Math.round(d.ang/(Math.PI/4))+8)%8,lx=p.x+Math.cos(d.ang)*(R+42),ly=p.y+Math.sin(d.ang)*(R+34);c.fillStyle='rgba(0,0,0,.55)';const txt=`${AR[idx]} ${d.warn?'INCOMING ':''}${KIND_NAME[d.kind]||d.kind}`;const w=c.measureText(txt).width+12;c.fillRect(clamp(lx-w/2,4,g.canvas.width-w-4),ly-11,w,17);c.fillStyle=col;c.fillText(txt,clamp(lx,w/2+4,g.canvas.width-w/2-4),ly+2)}c.restore()}
  // low-hull vignette flicker handled in DOM (#v8Crit); crosshair
  const m=g.mouse;if(m.active&&!g.touch){let near=false;for(const e of N8.hostiles(g))if(Math.hypot(e.x-m.x,e.y-m.y)<(e.size||40)+30){near=true;break}
    const col=g.overheat?'#ff3355':g.lock?'#ffcc00':near?'#ff5577':'#5ec8ff',rdy=g.missileCd<=0;c.save();c.globalAlpha=.9;c.strokeStyle=col;c.lineWidth=1.6;c.beginPath();c.arc(m.x,m.y,near?11:15,0,7);c.stroke();if(rdy){c.globalAlpha=.35;c.beginPath();c.arc(m.x,m.y,21,0,7);c.stroke();c.globalAlpha=.9}
    c.beginPath();for(const [dx,dy] of[[1,0],[-1,0],[0,1],[0,-1]]){c.moveTo(m.x+dx*5,m.y+dy*5);c.lineTo(m.x+dx*(near?11:9),m.y+dy*(near?11:9))}c.stroke();c.restore()}
  // weapon swap toast (screen)
  if(v.wsw>0){v.wsw--;const W=v.wswT;if(W){c.save();c.globalAlpha=Math.min(1,v.wsw/20);c.fillStyle=W.c;c.font='800 14px Orbitron,sans-serif';c.textAlign='center';c.fillText('▸ '+W.n,p.x,p.y+62);c.restore()}}});
/* auto-acquire target when Assist Mode is on; lock updates are v7's */
N8.pre.push(g=>{if(g.settings.assist&&(!g.lock||g.lock.e.dead)&&g.v8.t%120===0&&N8.hostiles(g).length)g.lockNearest()});

/* ================= aim: sensitivity / smoothing / assist ================= */
const raw={x:0,y:0,has:false};
hook(GE.prototype,'bind',function(o){o.call(this);const g=this,upd=e=>{const r=g.canvas.getBoundingClientRect();raw.x=(e.clientX-r.left)*(g.canvas.width/(r.width||1));raw.y=(e.clientY-r.top)*(g.canvas.height/(r.height||1));raw.has=true};
  window.addEventListener('mousemove',upd,true);window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')upd(e)},true)});
N8.pre.push(g=>{const m=g.mouse,S=g.settings,p=g.player;if(!m.active||g.touch||!raw.has||!p)return;
  const sens=(S.sens||100)/100,sm=clamp((S.smooth||0)/100,0,.9),asst=!!S.aimassist;if(sens===1&&sm===0&&!asst){m.sx=undefined;return}
  let tx=p.x+(raw.x-p.x)*sens,ty=p.y+(raw.y-p.y)*sens;
  if(asst){const T=g.lock&&g.lock.e&&!g.lock.e.dead?g.lock.e:N8.nearest(g,tx,p.y-200,700);if(T&&T.y<p.y-30){const dx=T.x-tx;if(Math.abs(dx)<(T.size||40)+90)tx+=dx*(g.pointerFire||g.autoFire?.24:.1)}}
  if(m.sx===undefined){m.sx=tx;m.sy=ty}m.sx+=(tx-m.sx)*(1-sm);m.sy+=(ty-m.sy)*(1-sm);m.x=m.sx;m.y=m.sy});

/* ================= settings + quality ================= */
function buildSettings(g){
  const sl=$('settingsMenu')&&$('settingsMenu').querySelector?$('settingsMenu').querySelector('.settings-list'):null;if(!sl||!sl.insertAdjacentHTML)return;
  sl.insertAdjacentHTML('beforeend',`<label><span>MOUSE SENSITIVITY</span><input id="v8Sens" type="range" min="50" max="200"></label><label><span>AIM SMOOTHING</span><input id="v8Smooth" type="range" min="0" max="90"></label><label><span>AIM ASSIST</span><input id="v8Aim" type="checkbox"></label><label><span>ADAPTIVE QUALITY</span><input id="v8AutoQ" type="checkbox"></label>`);
  const s=g.settings,a=$('v8Sens'),b=$('v8Smooth'),c=$('v8Aim'),d=$('v8AutoQ');
  a.value=s.sens||100;b.value=s.smooth||0;c.checked=!!s.aimassist;d.checked=s.autoq!==false;
  a.oninput=()=>g.setSetting('sens',+a.value);b.oninput=()=>g.setSetting('smooth',+b.value);c.onchange=()=>g.setSetting('aimassist',c.checked);d.onchange=()=>g.setSetting('autoq',d.checked)}
const QORD=['ULTRA','HIGH','MEDIUM','LOW'];
function autoQuality(g){
  let seen=null;try{seen=localStorage.getItem('nebula8_qinit')}catch{}
  if(!seen){const coarse=window.matchMedia&&matchMedia('(pointer:coarse)').matches,cores=navigator.hardwareConcurrency||4;let q=null;if(coarse)q=cores<=4?'LOW':'MEDIUM';else if(cores<=4)q='MEDIUM';if(q){g.setSetting('quality',q);const sel=$('qualitySel');if(sel)sel.value=q}try{localStorage.setItem('nebula8_qinit','1')}catch{}}}
let ft=[],slowWin=0;
hook(GE.prototype,'loop',function(o,now){const g=this;if(g.lastTime&&g.state===GAME.PLAYING&&!document.hidden){const d=now-g.lastTime;if(d>0&&d<250){ft.push(d);if(ft.length>=120){const avg=ft.reduce((a,b)=>a+b,0)/ft.length;ft=[];if(avg>26&&g.settings.autoq!==false){if(++slowWin>=2){slowWin=0;const i=QORD.indexOf(g.settings.quality);if(i>=0&&i<QORD.length-1){const nq=QORD[i+1];g.setSetting('quality',nq);const sel=$('qualitySel');if(sel)sel.value=nq;g.toast('ADAPTIVE QUALITY → '+nq)}}}else slowWin=0}}}else{ft=[]}
  return o.call(g,now)});

/* ================= hangar v2 ================= */
N8.armTab='PRIMARY';N8.viewShip=null;N8.cmpShip=null;
const STATS=[['hp','HULL'],['shield','SHIELD'],['armor','ARMOR',1],['speed','SPEED'],['accel','ACCEL'],['turn','TURN'],['damage','DAMAGE'],['energy','ENERGY'],['regen','REGEN'],['evasion','EVASION',1]];
let smax=null;const statMax=()=>{if(smax)return smax;smax={};for(const s of Object.values(SHIPS)){const t=N8.stats(s);for(const [k] of STATS)smax[k]=Math.max(smax[k]||0,t[k])}return smax};
const fmt=(k,v,pc)=>pc?Math.round(v*100)+'%':(k==='accel'||k==='turn'||k==='regen')?'x'+v.toFixed(2):k==='speed'||k==='damage'?v.toFixed(1):Math.round(v);
function shipPanel(g){
  const el=$('v8ShipInfo');if(!el)return;const s=SHIPS[N8.viewShip||g.selectedShip]||SHIPS[g.selectedShip],st=N8.stats(s),mx=statMax(),cs=N8.cmpShip&&SHIPS[N8.cmpShip]?N8.stats(SHIPS[N8.cmpShip]):null,A=st.ability,req=N8.shipLevelReq(s),own=g.unlockedShips.includes(s.id);
  let h=`<div style="color:${s.color};font-size:.85rem;letter-spacing:.14em;margin-bottom:2px">${s.name}</div><div class="lbl" style="font-size:.58rem;color:#7f96ad;margin-bottom:8px">${st.cls} CLASS · ${own?'OWNED':'LOCKED'} · REQUIRES PILOT LV ${req}${cs?' · COMPARING WITH '+SHIPS[N8.cmpShip].name.toUpperCase():''}</div>`;
  for(const [k,nm,pc] of STATS){const v=st[k],w=clamp(v/(mx[k]||1),0,1),cv=cs?cs[k]:null;const d=cs?v-cv:0;h+=`<div class="v8-stat"><span>${nm}</span><div class="tr"><i style="width:${(w*100).toFixed(0)}%"></i>${cs?`<u style="width:${(clamp(cv/(mx[k]||1),0,1)*100).toFixed(0)}%;height:2px;top:1px;bottom:auto"></u>`:''}</div><em class="${cs?(d>0?'up':d<0?'dn':''):''}">${fmt(k,v,pc)}${cs&&Math.abs(d)>1e-6?(d>0?' ▲':' ▼'):''}</em></div>`}
  h+=`<div style="margin-top:8px;font-size:.62rem;color:#ffcc33;letter-spacing:.1em">SPECIAL · ${A.n} <span style="color:#7f96ad">(${A.e} EN · ${(A.cd/60).toFixed(0)}s${cs&&cs.ability.n!==A.n?' · vs '+cs.ability.n:''})</span></div><div style="font-size:.58rem;color:#7f96ad;margin:3px 0 8px;line-height:1.5">${A.d}</div>`;
  const L=N8.loadout;h+=`<div class="lbl" style="font-size:.55rem;color:#7f96ad;letter-spacing:.14em">EQUIPPED LOADOUT</div><div style="font-size:.58rem;line-height:1.7;color:#cfe3f5">PRIMARY: <b>${N8.W[L.primary].n}</b> · SECONDARY: <b>${N8.W[L.secondary].n}</b><br>MISSILE: <b>${N8.MISSILES[L.missile].n}</b><br>POWERS: <b>${L.powers.map(i=>N8.P[i].n).join(' · ')}</b></div>`;
  h+=`<div class="v8-sub" style="margin-top:8px">${own?'':`<button data-a="buy" data-id="${s.id}">UNLOCK ${Math.round(s.cost).toLocaleString()} CR</button>`}<button data-a="equip" data-id="${s.id}" ${own?'':'disabled'}>${g.selectedShip===s.id?'EQUIPPED':'EQUIP SHIP'}</button><button data-a="cmp" data-id="${s.id}">${N8.cmpShip===s.id?'CLEAR COMPARE':'COMPARE'}</button></div>`;
  setH(el,h)}
function pilotHdr(g){const e=$('v8PilHdr');if(!e)return;const p=N8.pilot,n=N8.xpNeed(p.level);setH(e,`PILOT LEVEL <b style="color:#ffcc33">${p.level}</b> &nbsp;·&nbsp; XP ${Math.floor(p.xp)} / ${n} &nbsp;·&nbsp; MAX START SECTOR <b>${N8.maxStartSector(g)}</b> &nbsp;·&nbsp; LOOT COLLECTED THIS SESSION ${N8.sessionLoot||0}`)}
function renderArmory(g){
  const body=$('v8ArmBody');if(!body)return;const tab=N8.armTab,L=N8.loadout,lv=N8.pilot.level;let h='';
  const tabs=['PRIMARY','SECONDARY','MISSILES','POWERS','SHIP SPECIAL'];
  setH($('v8ArmSub'),tabs.map(t=>`<button data-a="atab" data-id="${t}" class="${t===tab?'on':''}">${t}</button>`).join(''));
  const card=(o)=>`<div class="v8-card" style="--c:${o.c||'#cfe3f5'}"><h4>${o.n}</h4><p>${o.fx||''}</p>${o.kv.map(([a,b])=>`<div class="kv"><span>${a}</span><em>${b}</em></div>`).join('')}<div class="btns">${o.btns.join('')}</div></div>`;
  if(tab==='PRIMARY'||tab==='SECONDARY'){const key=tab==='PRIMARY'?'primary':'secondary';h=N8.W.map((w,i)=>{const lk=lv<w.lvl&&!N8.pilot.cheat;return card({n:w.n,c:w.c,fx:w.fx,kv:[['DAMAGE',w.dmg],['FIRE RATE',w.rate],['ENERGY',w.en?w.en+' / shot':'none'],['HEAT',w.heat+(i===4?' / tick':' / shot')],['RANGE',w.rng],['UNLOCK','PILOT LV '+w.lvl]],btns:[`<button data-a="wp" data-k="${key}" data-id="${i}" class="${L[key]===i?'on':''}" ${lk?'disabled':''}>${lk?'LOCKED LV '+w.lvl:L[key]===i?'EQUIPPED':'EQUIP '+tab}</button>`]})}).join('')}
  else if(tab==='MISSILES'){h=Object.entries(N8.MISSILES).map(([k,m])=>{const need=N8.MISSILE_LVL[k],lk=lv<need&&!N8.pilot.cheat;return card({n:m.n,c:'#ff7a2e',fx:m.d,kv:[['DAMAGE',m.dmg],['ENERGY',m.e],['COOLDOWN',(m.cd/60).toFixed(1)+'s'],['UNLOCK','PILOT LV '+need]],btns:[`<button data-a="ms" data-id="${k}" class="${L.missile===k?'on':''}" ${lk?'disabled':''}>${lk?'LOCKED LV '+need:L.missile===k?'EQUIPPED':'EQUIP'}</button>`]})}).join('')}
  else if(tab==='POWERS'){h=N8.P.map((P,i)=>{const lk=lv<P.lvl&&!N8.pilot.cheat;return card({n:P.n,c:P.c,fx:P.d,kv:[['ENERGY',P.e],['COOLDOWN',(P.cd/60).toFixed(0)+'s'],['UNLOCK','PILOT LV '+P.lvl],['SLOT',L.powers.indexOf(i)>=0?'KEY '+(L.powers.indexOf(i)+1):'—']],btns:[0,1,2,3].map(s=>`<button data-a="pw" data-id="${i}" data-s="${s}" class="${L.powers[s]===i?'on':''}" ${lk?'disabled':''}>${lk?'LV '+P.lvl:'KEY '+(s+1)}</button>`)})}).join('')}
  else{const cur=Object.values(SHIPS).find(s=>s.id===g.selectedShip),ck=N8.shipClass(cur);h=Object.entries(N8.ABIL).map(([k,A])=>{const C=N8.CLASSES[k];return card({n:`${A.n} — ${k}`,c:k===ck?'#ffcc33':'#cfe3f5',fx:A.d,kv:[['ENERGY',A.e],['COOLDOWN',(A.cd/60).toFixed(0)+'s'],['DURATION',A.dur?(A.dur/60).toFixed(0)+'s':'instant'],['CLASS',C.desc]],btns:[`<button disabled class="${k===ck?'on':''}">${k===ck?'YOUR SHIP':'UNLOCK: OWN A '+k+' SHIP'}</button>`]})}).join('')}
  setH(body,`<div class="v8-grid">${h}</div>`)}
function renderTree(g){
  const el=$('v8TreeBody');if(!el)return;let h='<div class="v8-tree">';
  for(const b of N8.BRANCHES){h+=`<div class="v8-col"><h4>${b}</h4>`;for(const n of N8.NODES.filter(x=>x.b===b)){const l=N8.tree.level(n.id),st=N8.tree.status(n),pips=Array.from({length:n.max},(_,i)=>`<i class="${i<l?'on':''}"></i>`).join('');
      const reason=st==='LOCK_LVL'?`LOCKED · PILOT LV ${n.lvl}`:st==='LOCK_REQ'?`LOCKED · NEEDS ${N8.NODES.find(z=>z.id===n.req.split(':')[0]).name} ${n.req.split(':')[1]||1}`:'';
      h+=`<div class="v8-node ${st==='MAX'?'max':st.startsWith('LOCK')?'lock':''}"><b>${n.name}</b>${n.desc}<div class="v8-pips">${pips}</div>${st==='MAX'?'<span style="color:#4dff9a">MAXED</span>':`<button data-a="node" data-id="${n.id}" ${st!=='OPEN'?'disabled':''} style="width:100%;padding:6px;font:700 .55rem Orbitron;background:rgba(94,200,255,.08);border:1px solid rgba(140,190,230,.3);color:#cfe3f5;cursor:pointer">${st==='OPEN'?'UPGRADE '+N8.tree.cost(n).toLocaleString()+' CR':reason}</button>`}</div>`}h+='</div>'}
  setH(el,h+'</div>')}
N8.hangarAction=(a,id,extra)=>{const g=N8.g||window.gameEngine;if(!g)return;
  if(a==='equip')g.selectShip(id);else if(a==='buy')g.buyShip(id);else if(a==='cmp')N8.cmpShip=N8.cmpShip===id?null:id;else if(a==='view')N8.viewShip=id;
  else if(a==='atab')N8.armTab=id;
  else if(a==='wp'){const i=+id;if(extra.k==='primary'){N8.loadout.primary=i;if(N8.loadout.secondary===i)N8.loadout.secondary=(i+1)%N8.W.length}else{N8.loadout.secondary=i;if(N8.loadout.primary===i)N8.loadout.primary=(i+1)%N8.W.length}N8.saveLoadout()}
  else if(a==='ms'){N8.loadout.missile=id;N8.saveLoadout()}
  else if(a==='pw'){const i=+id,s=+extra.s,L=N8.loadout.powers,cur=L.indexOf(i);if(cur>=0&&cur!==s){L[cur]=L[s]}L[s]=i;N8.saveLoadout()}
  else if(a==='node'){N8.tree.buy(g,id)}
  refreshHangar(g)};
function refreshHangar(g){pilotHdr(g);shipPanel(g);renderArmory(g);renderTree(g);setT($('shopCoins'),g.coins.toLocaleString())}
function initHangar(g){
  const um=$('upgradeMenu');if(!um||!um.insertAdjacentHTML)return;
  const st=$('shipsTab');
  if(st&&st.insertAdjacentHTML)st.insertAdjacentHTML('afterbegin',`<div id="v8PilHdr" class="gl v8-pil" style="border:1px solid rgba(140,190,230,.22)"></div><div class="v8-hg"><div><canvas id="v8Prev" width="340" height="280"></canvas></div><div id="v8ShipInfo"></div></div>`);
  const tabs=um.querySelector?um.querySelector('.tabs'):null;
  if(tabs&&tabs.insertAdjacentHTML)tabs.insertAdjacentHTML('beforeend','<button class="tab" data-v8tab="armory">ARMORY</button><button class="tab" data-v8tab="tree">UPGRADE TREE</button>');
  const anchor=$('upgradesTab');
  if(anchor&&anchor.insertAdjacentHTML)anchor.insertAdjacentHTML('afterend',`<div id="v8ArmoryTab" class="tab-content hidden"><div class="section-title">ARMORY // LOADOUT</div><div id="v8ArmSub" class="v8-sub"></div><div id="v8ArmBody"></div></div><div id="v8TreeTab" class="tab-content hidden"><div class="section-title">UPGRADE TREE // OFFENSE · DEFENSE · MOBILITY · ENERGY · WEAPONS · POWERS</div><div id="v8TreeBody"></div></div>`);
  const show=name=>{for(const [id,n] of[['shipsTab','ships'],['upgradesTab','upgrades'],['v8ArmoryTab','armory'],['v8TreeTab','tree']]){const e=$(id);if(e)e.classList.toggle('hidden',n!==name)}
    if(um.querySelectorAll)um.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',(b.dataset.tab||b.dataset.v8tab)===name));refreshHangar(g)};
  if(um.querySelectorAll)um.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>show(b.dataset.tab||b.dataset.v8tab)));
  const click=e=>{const b=e.target&&e.target.closest?e.target.closest('[data-a]'):null;if(!b)return;N8.hangarAction(b.dataset.a,b.dataset.id,{k:b.dataset.k,s:b.dataset.s})};
  for(const id of['v8ShipInfo','v8ArmSub','v8ArmBody','v8TreeBody']){const e=$(id);if(e)e.addEventListener('click',click)}
  // ship cards: class badge + view/compare (cards are rebuilt by renderShips every time)
  hook(GE.prototype,'renderShips',function(o){o.call(this);const c=$('shipCards');if(!c||!c.children)return;const ships=Object.values(SHIPS),gg=this;
    for(let i=0;i<c.children.length&&i<ships.length;i++){const el=c.children[i],s=ships[i];if(!el||!el.insertAdjacentHTML)continue;const req=N8.shipLevelReq(s);
      el.insertAdjacentHTML('beforeend',`<div class="v8-sub" style="margin:4px 0 0"><span style="font-size:.5rem;color:#7f96ad;align-self:center">${N8.shipClass(s)} · LV ${req}</span><button data-a="view" data-id="${s.id}" style="padding:3px 6px;font-size:.5rem">VIEW</button><button data-a="cmp" data-id="${s.id}" style="padding:3px 6px;font-size:.5rem">CMP</button></div>`);
      const bs=el.querySelectorAll?el.querySelectorAll('[data-a]'):[];bs.forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();N8.hangarAction(b.dataset.a,b.dataset.id,{})}))}
    refreshHangar(gg)});
  hook(GE.prototype,'openHangar',function(o){o.call(this);N8.viewShip=this.selectedShip;show('ships')});
  hook(GE.prototype,'selectShip',function(o,id){o.call(this,id);if(id===this.selectedShip)N8.viewShip=id;refreshHangar(this)});
  hook(GE.prototype,'buyUpgrade',function(o,k){o.call(this,k);refreshHangar(this)});
}
/* rotating hologram of the viewed ship (drawn inside the single main loop while the hangar is open) */
let spin=0;
N8.menuDraw=(g)=>{const um=$('upgradeMenu');if(!um||um.classList.contains('hidden'))return;const cv=$('v8Prev');if(!cv||!cv.getContext)return;const c=cv.getContext('2d'),W=cv.width,H=cv.height;
  const s=SHIPS[N8.viewShip||g.selectedShip]||SHIPS[g.selectedShip];if(!s)return;const P=N8.HULLS[N8.shipClass(s)]||N8.HULLS.FIGHTER;spin+=.012;
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);const gr=c.createRadialGradient(W/2,H*.45,10,W/2,H/2,W*.7);gr.addColorStop(0,'#16304d');gr.addColorStop(1,'#050a12');c.fillStyle=gr;c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(94,200,255,.15)';c.lineWidth=1;for(let i=1;i<9;i++){const y=H*.6+(H*.4)*(i/9)**1.6;c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}for(let i=-6;i<=6;i++){c.beginPath();c.moveTo(W/2+i*8,H*.6);c.lineTo(W/2+i*44,H);c.stroke()}
  c.save();c.translate(W/2,H*.47);c.rotate(Math.sin(spin*.5)*.35+spin*.6);
  N8.drawHull(c,P,{s:2.5,col:s.color||'#5ec8ff',thrust:.75,hf:1,t:spin*60,base:'#2a3345'});c.restore();
  c.globalAlpha=.5;c.fillStyle='rgba(94,200,255,.18)';const sy=((spin*90)%H);c.fillRect(0,sy,W,2);c.globalAlpha=1;
  c.fillStyle='#7f96ad';c.font='700 10px Orbitron,sans-serif';c.textAlign='left';c.fillText(N8.shipClass(s)+' // '+s.name.toUpperCase(),10,H-10)};
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v8-ui.js');
