'use strict';
/* NEBULA PROTOCOL v8 — progression: pilot XP/levels + unlocks, loot (6 rarities), combo v2, upgrade tree, loadout, v8 missions, persistence. */
(()=>{
const N8=window.N8,{hook,clamp,rnd}=N8,GE=GameEngine,A8=N8.audio;
const ld=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};

/* ---------- pilot ---------- */
const MAXLV=60;
N8.pilot=Object.assign({xp:0,level:1,cheat:false},ld('nebula8_pilot',{}));
N8.xpNeed=l=>Math.round(120*Math.pow(l,1.55));
N8.CLASS_LEVEL={FIGHTER:1,INTERCEPTOR:2,ASSAULT:3,HEAVY:4,STEALTH:6,SUPPORT:8,EXPERIMENTAL:12};
N8.shipLevelReq=s=>N8.CLASS_LEVEL[N8.shipClass(s)]||1;
N8.maxStartSector=g=>Math.max(Math.ceil(((g&&g.bestStage)||1)/10),N8.pilot.level+1);
const V8MISSIONS=[
 {id:'loot',name:'SALVAGE CREW',desc:'Collect 25 loot drops',goal:25,reward:350,lvl:1},
 {id:'obj',name:'TACTICAL OPERATOR',desc:'Complete 5 sector objectives',goal:5,reward:450,lvl:2},
 {id:'comp',name:'SURGICAL STRIKE',desc:'Destroy 6 boss components',goal:6,reward:550,lvl:5},
 {id:'rampage',name:'UNSTOPPABLE',desc:'Reach a RAMPAGE kill streak',goal:1,reward:600,lvl:6}
];
N8.syncMissions=g=>{if(!g.missions)return;let ch=false;for(const m of V8MISSIONS){if(N8.pilot.level>=m.lvl&&!g.missions.find(x=>x.id===m.id)){g.missions.push({id:m.id,name:m.name,desc:m.desc,goal:m.goal,reward:m.reward,progress:0,done:false});ch=true}}if(ch){try{localStorage.setItem('nebula_missions',JSON.stringify(g.missions))}catch{}}};
const unlocksAt=l=>{const u=[];N8.W.forEach(w=>{if(w.lvl===l&&l>1)u.push('WEAPON: '+w.n)});N8.P.forEach(p=>{if(p.lvl===l&&l>1)u.push('POWER: '+p.n)});if(l===3)u.push('SHIP ABILITY');for(const [k,v] of Object.entries(N8.CLASS_LEVEL))if(v===l&&l>1)u.push('SHIP CLASS: '+k);V8MISSIONS.forEach(m=>{if(m.lvl===l&&l>1)u.push('MISSION: '+m.name)});u.push('SECTOR '+String(l+1).padStart(3,'0')+' ACCESS');N8.NODES.forEach(n=>{if(n.lvl===l)u.push('UPGRADE: '+n.name)});return u};
N8.addXP=(g,amt,why)=>{if(!amt||amt<=0)return;const p=N8.pilot;amt=Math.round(amt*(g.player&&g.player.xpMul||1));p.xp+=amt;g.v8.runXp=(g.v8.runXp||0)+amt;
  while(p.level<MAXLV&&p.xp>=N8.xpNeed(p.level)){p.xp-=N8.xpNeed(p.level);p.level++;const u=unlocksAt(p.level);g.coins+=100*p.level;A8.play('LEVELUP');N8.banner&&N8.banner(`PILOT LEVEL ${p.level}`,'#ffcc33',u.slice(0,3).join(' · ')||'');g.toast('PILOT LEVEL '+p.level+(u.length?' — '+u[0]:''));N8.syncMissions(g);sv('nebula8_pilot',p);try{g.save()}catch{}}
  if(p.level>=MAXLV)p.xp=Math.min(p.xp,N8.xpNeed(MAXLV)-1)};

/* ---------- upgrade tree ---------- */
N8.BRANCHES=['OFFENSE','DEFENSE','MOBILITY','ENERGY','WEAPONS','POWERS'];
N8.NODES=[
 {id:'off_dmg',b:'OFFENSE',name:'Weapon Amplifiers',desc:'+6% weapon damage per level',max:5,cost:400,lvl:1,key:'dmg',per:.06,pct:1},
 {id:'off_crit',b:'OFFENSE',name:'Targeting Matrix',desc:'+3% critical chance per level',max:5,cost:600,lvl:3,req:'off_dmg',key:'crit',per:.03,pct:1},
 {id:'off_rate',b:'OFFENSE',name:'Rapid Cyclers',desc:'-4% fire delay per level',max:5,cost:700,lvl:5,req:'off_dmg:2',key:'rate',per:.04,pct:1},
 {id:'off_pierce',b:'OFFENSE',name:'Penetrator Rounds',desc:'+1 pierce per level',max:2,cost:2500,lvl:8,req:'off_crit:2',key:'pierce',per:1},
 {id:'def_hp',b:'DEFENSE',name:'Reinforced Hull',desc:'+8% hull per level',max:5,cost:400,lvl:1,key:'hp',per:.08,pct:1},
 {id:'def_sh',b:'DEFENSE',name:'Shield Capacitors',desc:'+8% shield per level',max:5,cost:400,lvl:2,key:'shield',per:.08,pct:1},
 {id:'def_arm',b:'DEFENSE',name:'Ablative Plating',desc:'+2% damage reduction per level',max:5,cost:900,lvl:4,req:'def_hp:2',key:'armor',per:.02,pct:1},
 {id:'mob_spd',b:'MOBILITY',name:'Thruster Tuning',desc:'+4% top speed per level',max:5,cost:350,lvl:1,key:'speed',per:.04,pct:1},
 {id:'mob_acc',b:'MOBILITY',name:'Inertial Dampers',desc:'+8% acceleration per level',max:5,cost:500,lvl:3,req:'mob_spd',key:'accel',per:.08,pct:1},
 {id:'mob_eva',b:'MOBILITY',name:'Evasion Suite',desc:'+2.5% evasion per level',max:5,cost:1100,lvl:6,req:'mob_acc:2',key:'evasion',per:.025,pct:1},
 {id:'en_cap',b:'ENERGY',name:'Capacitor Banks',desc:'+8% energy per level',max:5,cost:400,lvl:1,key:'energy',per:.08,pct:1},
 {id:'en_reg',b:'ENERGY',name:'Reactor Tuning',desc:'+10% energy regen per level',max:5,cost:600,lvl:3,req:'en_cap',key:'regen',per:.1,pct:1},
 {id:'en_heat',b:'ENERGY',name:'Heat Sinks',desc:'+12% weapon cooling per level',max:5,cost:700,lvl:4,req:'en_cap:2',key:'heat',per:.12,pct:1},
 {id:'wp_msl',b:'WEAPONS',name:'Missile Racks',desc:'+10% missile damage per level',max:5,cost:500,lvl:2,key:'missile',per:.1,pct:1},
 {id:'wp_mag',b:'WEAPONS',name:'Salvage Magnet',desc:'+30 pickup range per level',max:5,cost:450,lvl:2,key:'magnet',per:30},
 {id:'wp_luck',b:'WEAPONS',name:'Salvage Uplink',desc:'+10% loot rarity luck per level',max:5,cost:900,lvl:5,req:'wp_mag:2',key:'luck',per:.1,pct:1},
 {id:'pw_cd',b:'POWERS',name:'Power Regulators',desc:'-5% power/ability cooldowns per level',max:5,cost:600,lvl:3,key:'cd',per:.05,pct:1},
 {id:'pw_dmg',b:'POWERS',name:'Overcharged Circuits',desc:'+8% power damage per level',max:5,cost:800,lvl:5,req:'pw_cd:2',key:'pdmg',per:.08,pct:1},
 {id:'pw_xp',b:'POWERS',name:'Combat Analytics',desc:'+6% XP per level',max:5,cost:1000,lvl:4,key:'xp',per:.06,pct:1}
];
const tl=ld('nebula8_tree',{});
N8.tree={lv:tl,
 level(id){return this.lv[id]||0},
 cost(n){return n.cost*(this.level(n.id)+1)},
 status(n){const l=this.level(n.id);if(l>=n.max)return'MAX';if(N8.pilot.level<n.lvl&&!N8.pilot.cheat)return'LOCK_LVL';if(n.req){const [rid,rl]=n.req.split(':');if(this.level(rid)<(+rl||1))return'LOCK_REQ'}return'OPEN'},
 bonus(){const b={};for(const n of N8.NODES){const l=this.level(n.id);if(l)b[n.key]=(b[n.key]||0)+l*n.per}return b},
 buy(g,id){const n=N8.NODES.find(x=>x.id===id);if(!n)return false;const s=this.status(n);if(s!=='OPEN'){g.toast(s==='MAX'?'ALREADY MAX':s==='LOCK_LVL'?`REQUIRES PILOT LEVEL ${n.lvl}`:'REQUIRES PREVIOUS NODE');return false}
  const c=this.cost(n);if(g.coins<c){g.toast('NOT ENOUGH CREDITS');return false}g.coins-=c;this.lv[id]=this.level(id)+1;sv('nebula8_tree',this.lv);g.save();g.toast(`${n.name.toUpperCase()} LV ${this.lv[id]}`);return true}};

/* ---------- loadout ---------- */
N8.loadout=Object.assign({primary:0,secondary:1,missile:'HOMING',powers:[0,1,2,3]},ld('nebula8_loadout',{}));
N8.MISSILE_LVL={HOMING:1,MICRO:4,HEAVY:7};
N8.saveLoadout=()=>sv('nebula8_loadout',N8.loadout);
(()=>{const l=N8.loadout;if(!Array.isArray(l.powers)||l.powers.length!==4)l.powers=[0,1,2,3];l.powers=l.powers.map(i=>N8.P[i]?i:0);if(!N8.W[l.primary])l.primary=0;if(!N8.W[l.secondary])l.secondary=1;if(!N8.MISSILES[l.missile])l.missile='HOMING'})();
hook(GE.prototype,'save',function(o){o.call(this);sv('nebula8_pilot',N8.pilot);sv('nebula8_tree',N8.tree.lv);sv('nebula8_loadout',N8.loadout)});
hook(GE.prototype,'bind',function(o){o.call(this);N8.syncMissions(this)});
/* gating: ships by pilot level, start sector by pilot level / best stage */
hook(GE.prototype,'buyShip',function(o,id){const s=SHIPS[id],need=s?N8.shipLevelReq(s):1;if(s&&!this.unlockedShips.includes(id)&&N8.pilot.level<need&&!N8.pilot.cheat){this.toast(`${N8.shipClass(s)} CLASS REQUIRES PILOT LEVEL ${need}`);return}return o.call(this,id)});
hook(GE.prototype,'startGame',function(o,lv,mode){const cap=N8.maxStartSector(this)*10;let L=Number(lv)||1;if(L>cap&&!N8.pilot.cheat){L=cap;this.toast(`SECTOR LOCKED — START CAPPED AT LEVEL ${cap} (RAISE PILOT LEVEL)`)}return o.call(this,L,mode)});

/* ---------- loot ---------- */
const RAR=[{n:'COMMON',c:'#cfd8e3',m:1,w:60},{n:'UNCOMMON',c:'#4dff88',m:1.4,w:25},{n:'RARE',c:'#4d9bff',m:2,w:10},{n:'EPIC',c:'#b04dff',m:3,w:4},{n:'LEGENDARY',c:'#ffab2e',m:4.5,w:1.1},{n:'MYTHIC',c:'#ff3d7f',m:7,w:.3}];
N8.RARITY=RAR;
const KINDS=[
 {k:'CREDITS',n:'CREDITS',g:'¢',w:26},{k:'ENERGY',n:'ENERGY CELL',g:'E',w:16},{k:'SHIELD',n:'SHIELD CHARGE',g:'S',w:12},{k:'HEALTH',n:'HULL REPAIR',g:'+',w:10},
 {k:'WEAPON',n:'WEAPON UPGRADE',g:'W',w:6},{k:'POWER',n:'POWER CHARGE',g:'P',w:8},{k:'DAMAGE',n:'DAMAGE BOOST',g:'D',w:8},{k:'SPEED',n:'SPEED BOOST',g:'V',w:7},{k:'COOLDOWN',n:'COOLDOWN REDUCTION',g:'C',w:7}];
N8.LOOTKINDS=KINDS;
function rollRar(g,boost){const lk=(g.player&&g.player.lootLuck||0)+Math.min(.6,g.level*.0015)+boost;let tot=0;const ws=RAR.map((r,i)=>{const w=r.w*(1+i*lk*1.6);tot+=w;return w});let x=Math.random()*tot;for(let i=0;i<ws.length;i++){x-=ws[i];if(x<=0)return i}return 0}
function rollKind(g){const p=g.player;let tot=0;const ws=KINDS.map(k=>{let w=k.w;if(k.k==='HEALTH'&&p.hp/p.maxHp<.4)w*=2.4;if(k.k==='SHIELD'&&p.shield/p.maxShield<.3)w*=1.8;if(k.k==='ENERGY'&&p.energy/p.maxEnergy<.3)w*=2;tot+=w;return w});let x=Math.random()*tot;for(let i=0;i<ws.length;i++){x-=ws[i];if(x<=0)return KINDS[i]}return KINDS[0]}
N8.dropLoot=(g,x,y,boost=0,kindKey)=>{const v=g.v8;v.loot=v.loot||[];if(v.loot.length>=40)return;const r=rollRar(g,boost),k=kindKey?KINDS.find(z=>z.k===kindKey):rollKind(g);
  v.loot.push({x,y,vx:rnd(-1.6,1.6),vy:rnd(-1.4,.2),k,r,life:900,age:0});if(r>=3){A8.voice({f:1200,f2:2400,d:.2,type:'sine',v:.15})}};
N8.applyLoot=(g,l)=>{const p=g.player,v=p.v8,R=RAR[l.r],m=R.m;let txt='';
  switch(l.k.k){
   case'CREDITS':{const n=Math.round((8+g.level*.6)*m*(.8+Math.random()*.5));g.coins+=n;txt=`+${n} CR`;break}
   case'ENERGY':{const n=Math.round(p.maxEnergy*.14*m);p.energy=Math.min(p.maxEnergy,p.energy+n);txt=`+${n} ENERGY`;break}
   case'SHIELD':{const n=Math.round(p.maxShield*.18*m);p.shield=Math.min(p.maxShield,p.shield+n);txt=`+${n} SHIELD`;break}
   case'HEALTH':{const n=Math.round(p.maxHp*.1*m);p.hp=Math.min(p.maxHp,p.hp+n);txt=`+${n} HULL`;break}
   case'WEAPON':{v.wlvl=Math.min(10,v.wlvl+(m>=3?2:1));txt=`WEAPON LV ${v.wlvl} (+${v.wlvl*6}% DMG)`;break}
   case'POWER':{const f=Math.min(1,.25*m);const a=g.v8.pcd||[];for(let i=0;i<a.length;i++)a[i]=Math.round(a[i]*(1-f));v.ab.cd=Math.round(v.ab.cd*(1-f));txt=`POWERS ${Math.round(f*100)}% RECHARGED`;break}
   case'DAMAGE':v.dmgBuff=Math.max(v.dmgBuff,Math.round(420*m));txt=`+50% DAMAGE ${Math.round(420*m/60)}s`;break;
   case'SPEED':v.speedBuff=Math.max(v.speedBuff,Math.round(420*m));txt=`+35% SPEED ${Math.round(420*m/60)}s`;break;
   case'COOLDOWN':v.cdrBuff=Math.max(v.cdrBuff,Math.round(500*m));txt=`-50% COOLDOWNS ${Math.round(500*m/60)}s`;break}
  g.addText(l.x,l.y-16,txt,R.c,1);if(l.r>=2){g.toast(`${R.n} ${l.k.n}`);A8.play('LOOT_R')}else A8.play('LOOT');
  g.v8.fx.push({t:'ring',x:l.x,y:l.y,r:4,max:26+l.r*8,life:1,c:R.c});g.v8.lootN=(g.v8.lootN||0)+1;N8.sessionLoot=(N8.sessionLoot||0)+1;g.updateMission('loot',1);N8.addXP(g,1+l.r*2)};
N8.post.push(g=>{const v=g.v8,p=g.player,H=g.canvas.height;if(!v.loot)return;
  for(let i=v.loot.length-1;i>=0;i--){const l=v.loot[i];l.age++;l.life--;l.vx*=.96;l.vy+=(.9-l.vy)*.04;
    const d=Math.hypot(p.x-l.x,p.y-l.y),mg=70+(p.magnet||0)*.9;if(d<mg&&l.age>18){const f=(1-d/mg)*7+1.2;l.x+=(p.x-l.x)/d*f;l.y+=(p.y-l.y)/d*f}else{l.x+=l.vx;l.y+=l.vy+Math.sin(l.age*.08)*.3}
    if(d<28){N8.applyLoot(g,l);v.loot.splice(i,1);continue}
    if(l.life<=0||l.y>H+30)v.loot.splice(i,1)}
  // streak decay
  const s=v.streak;if(s&&s.n>0&&--s.t<=0){s.n=0;s.tier=0}
  if(v.banT>0)v.banT--});
const KILLW={ELITE:4,CARRIER:5,BOMBER:2.5,HUNTER:2,ASSASSIN:2.5,SNIPER:1.5,INTERCEPTOR:1.2,SHIELD_DRONE:1.3,SWARM:.6};
/* ---------- kills: loot, XP, combo v2 ---------- */
const TIERS=[[2,'DOUBLE','#9fe8ff'],[3,'MULTI KILL','#63ff9a'],[5,'CHAIN','#ffe066'],[8,'DOMINATING','#ffab2e'],[12,'RAMPAGE','#ff6a3d'],[18,'ANNIHILATION','#ff3d7f'],[26,'LEGENDARY','#d98cff']];
N8.TIERS=TIERS;
hook(GE.prototype,'killEnemy',function(o,e){
  if(e.dead)return;const g=this;o.call(g,e);if(!g.v8||!g.player)return;const v=g.v8,role=e.type==='ELITE'?'ELITE':e.role;
  N8.addXP(g,(6+Math.pow(g.level,.55)*1.4)*(KILLW[role]||1)*(e.cmd?6:1));
  const ch=.15+(role==='ELITE'?.5:0)+((role==='CARRIER'||role==='BOMBER')?.45:0)+(e.cmd?1:0)+Math.min(.1,g.level*.0004);
  if(Math.random()<ch)N8.dropLoot(g,e.x,e.y,(role==='ELITE'?.5:0)+(role==='CARRIER'?.6:0)+(e.cmd?2:0));
  // streak
  const s=v.streak=v.streak||{n:0,t:0,tier:0};s.n++;s.t=110;let ti=0;for(let i=0;i<TIERS.length;i++)if(s.n>=TIERS[i][0])ti=i+1;
  if(ti>s.tier){s.tier=ti;const T=TIERS[ti-1];g.coins+=ti*8;g.score+=Math.round(ti*400*g.combo);N8.addXP(g,ti*12);g.player.energy=Math.min(g.player.maxEnergy,g.player.energy+ti*3);
    N8.banner&&N8.banner(T[1],T[2],`x${s.n} STREAK · +${ti*8} CR`);A8.voice({f:500+ti*120,f2:900+ti*200,d:.25,type:'triangle',v:.25});
    if(ti>=5){g.updateMission('rampage',1);N8.dropLoot(g,g.player.x,g.player.y-60,1+ti*.3)}
    if(ti>=7){N8.flash(g,.15,'#d98cff');N8.slowmo(g,20)}}
  else if(ti===TIERS.length&&s.n%5===0){g.coins+=60;N8.dropLoot(g,g.player.x,g.player.y-60,3)}
});
/* boss: damage XP, component/defeat hooks */
N8.onHit=(g,b,e,d,crit)=>{if(e===g.boss&&g.boss.maxHp){const x=Math.min(d,e.maxHp*.02)/e.maxHp*(300+g.level*3);N8.addXP(g,x)}};
N8.onComp=(g,b,c)=>{g.updateMission('comp',1);N8.addXP(g,25+g.level*.5);if(Math.random()<.5)N8.dropLoot(g,c.x,c.y,.6)};
N8.onRock=(g,r)=>{if(Math.random()<.35)N8.dropLoot(g,r.x,r.y,0,'CREDITS')};
N8.onBossDefeat=(g,b)=>{const v=g.v8,xp0=v.runXp||0;const n=5+Math.min(4,Math.floor(g.level/40));for(let i=0;i<n;i++)setTimeout(()=>{if(g.state===GAME.PLAYING&&g.v8===v)N8.dropLoot(g,clamp(b.x+rnd(-b.size,b.size),40,g.canvas.width-40),b.y+rnd(-30,60),2.2+i*.3)},i*160);
  N8.addXP(g,300+g.level*8);N8.rewardPanel&&N8.rewardPanel(g,b,n)};
N8.reward=(g,o)=>{if(o.xp)N8.addXP(g,o.xp);if(o.loot){for(let i=0;i<2;i++)N8.dropLoot(g,clamp((o.x||g.canvas.width/2)+rnd(-60,60),40,g.canvas.width-40),(o.y||300)+rnd(-20,20),1.5)}};
/* mission completion grants XP */
hook(GE.prototype,'updateMission',function(o,id,amt){const m=this.missions.find(x=>x.id===id&&!x.done),was=m&&m.done;o.call(this,id,amt);if(m&&m.done&&!was)N8.addXP(this,80+m.reward*.1)});
hook(GE.prototype,'toMenu',function(o){N8.syncMissions(this);return o.call(this)});
/* loot renderer */
N8.addDraw(35,(g,c)=>{const v=g.v8,t=v.t;if(!v.loot)return;
  for(const l of v.loot){const R=RAR[l.r];if(l.life<120&&Math.floor(l.age/5)%2)continue;let col=R.c;if(l.r===5)col=`hsl(${(t*6)%360},100%,62%)`;
    c.save();c.translate(l.x,l.y);
    if(l.r>=4){c.globalCompositeOperation='lighter';const gr=c.createLinearGradient(0,-70,0,10);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,l.r===5?'rgba(255,90,170,.45)':'rgba(255,171,46,.4)');c.fillStyle=gr;c.fillRect(-5,-70,10,80)}
    c.globalCompositeOperation='lighter';const gl=c.createRadialGradient(0,0,0,0,0,18+l.r*4);gl.addColorStop(0,col);gl.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha=.4+.15*Math.sin(t*.15+l.age);c.fillStyle=gl;c.beginPath();c.arc(0,0,18+l.r*4,0,7);c.fill();
    c.globalCompositeOperation='source-over';c.globalAlpha=1;c.rotate(l.r>=3?t*.03:0);c.fillStyle='#0a0f1a';c.strokeStyle=col;c.lineWidth=1.5+l.r*.3;c.beginPath();
    if(l.r<2){c.rect(-7,-7,14,14)}else if(l.r<4){for(let i=0;i<6;i++){const a=i*1.0472,x=Math.cos(a)*10,y=Math.sin(a)*10;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath()}else{for(let i=0;i<8;i++){const a=i*.7854,rr=i%2?7:12,x=Math.cos(a)*rr,y=Math.sin(a)*rr;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath()}
    c.fill();c.stroke();c.rotate(l.r>=3?-t*.03:0);c.fillStyle=col;c.font='800 10px Orbitron,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(l.k.g,0,1);c.restore()}});
N8.resetFns.push(g=>{const v=g.v8;v.loot=[];v.streak={n:0,t:0,tier:0};v.runXp=0;v.lootN=0});
})();

/* player destruction: sequence + audio before the original game-over screen */
(()=>{const N8=window.N8,GE=GameEngine,hook=N8.hook;hook(GE.prototype,'gameOver',function(o){const g=this;if(g.state!==GAME.GAMEOVER&&g.player&&g.v8){const p=g.player;N8.boom(g,p.x,p.y,3,p.config.color||'#ff9d2e',1.1);N8.audio.play('PLAYER_DEATH',p.x,p.y);N8.flash(g,.5,'#ffffff');N8.shake(g,16);try{localStorage.setItem('nebula8_pilot',JSON.stringify(N8.pilot))}catch{}}return o.call(g)})})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v8-meta.js');
