'use strict';
/* NEBULA PROTOCOL v9 — runtime statistics, daily rollovers and contract telemetry. */
(()=>{
  const N8=window.N8,V=N8.v9,hook=N8.hook;
  const day=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  function dailySeed(){const s=day();return N8.v9.hash(s,0x4419)}
  function buildDaily(){const types=[
    {id:'d_kill',name:'WARTIME PURGE',desc:'Destroy 100 hostiles.',goal:100,type:'kills',reward:450},
    {id:'d_boss',name:'COMMANDER HUNT',desc:'Defeat 2 bosses.',goal:2,type:'boss',reward:650},
    {id:'d_sector',name:'FRONTLINE ADVANCE',desc:'Complete 3 sectors.',goal:3,type:'sector',reward:800},
    {id:'d_streak',name:'BREAKTHROUGH',desc:'Reach a 15-kill streak.',goal:15,type:'streak',reward:700},
    {id:'d_energy',name:'ENERGY DOCTRINE',desc:'Fire 40 energy-consuming shots.',goal:40,type:'energy',reward:550}
  ];const sd=dailySeed();const a=types[sd%types.length],b=types[(sd>>>3)%types.length],c=types[(sd>>>7)%types.length];return [a,b.id===a.id?types[(sd+2)%types.length]:b,c.id===a.id||c.id===b.id?types[(sd+4)%types.length]:c].map(x=>({...x,progress:0,done:false}));}
  function ensureDaily(){if(V.persist.daily?.date!==day()){V.persist.daily={date:day(),items:buildDaily(),paid:false};N8.v9.write(N8.v9.saveKey,V.persist)}V.persist.daily.items=Array.isArray(V.persist.daily.items)?V.persist.daily.items:buildDaily();return V.persist.daily.items}
  V.daily={ensure:ensureDaily,today:day};
  V.stat=(g,k,v=1)=>{V.persist.stats=V.persist.stats||{};V.persist.stats[k]=(Number(V.persist.stats[k])||0)+v};
  V.statSet=(g,k,v)=>{V.persist.stats=V.persist.stats||{};V.persist.stats[k]=v};
  V.record=(g,type,amt=1)=>{const items=ensureDaily();for(const d of items){if(d.done)continue;let add=0;if(d.type===type)add=amt;if(type==='streak'&&d.type==='streak')add=amt;if(add){d.progress=Math.min(d.goal,(d.progress||0)+add);if(d.progress>=d.goal){d.progress=d.goal;d.done=true;g.coins+=d.reward;g.toast(`DAILY COMPLETE // ${d.name} +${d.reward} CR`);try{N8.audio.play('MISSION')}catch{}}}}N8.v9.saveAll(g)};
  hook(GameEngine.prototype,'startGame',function(o,...a){const r=o.apply(this,a);ensureDaily();V.persist.stats.favoriteShip=this.selectedShip;V.persist.stats.sectorDamage=0;this.v9RunTime=0;this._v9CoinsSeen=Number(this.coins)||0;return r});
  hook(GameEngine.prototype,'applyDamage',function(o,amount,...a){V.stat(this,'damageReceived',Math.max(0,Number(amount)||0));V.statSet(this,'sectorDamage',(Number(V.persist.stats.sectorDamage)||0)+Math.max(0,Number(amount)||0));return o.call(this,amount,...a)});
  hook(GameEngine.prototype,'completeLevel',function(o,...a){const r=o.apply(this,a);V.record(this,'sector',1);return r});
  hook(GameEngine.prototype,'defeatBoss',function(o,...a){const r=o.apply(this,a);V.record(this,'boss',1);return r});
  hook(GameEngine.prototype,'killEnemy',function(o,e){const r=o.call(this,e);V.record(this,'kills',1);if(this.v8?.streak?.n)V.record(this,'streak',this.v8.streak.n);return r});
  const oldApply=N8.applyLoot;if(oldApply&&!oldApply._v9stats){const wrap=function(g,l){const r=oldApply(g,l);V.persist.stats.lootCollected=(V.persist.stats.lootCollected||0)+1;V.record(g,'loot',1);V.contractProgress?.(g,'loot',1);return r};wrap._v9stats=1;N8.applyLoot=wrap;}
  hook(GameEngine.prototype,'fire',function(o,...a){const beforeN=this.bullets?.length||0,beforeE=this.player?.energy||0,mode=this.wmode|0;const r=o.apply(this,a);const afterN=this.bullets?.length||0,afterE=this.player?.energy||0;if(this.state===GAME.PLAYING){const created=Math.max(0,afterN-beforeN);if(created>0)V.stat(this,'shotsFired',created);else if(afterE<beforeE)V.stat(this,'shotsFired',1);if(afterE<beforeE&&N8.W?.[mode]?.en>0)V.record(this,'energy',1);if(created>0||afterE<beforeE)V.persist.stats.favoriteWeapon=N8.W?.[mode]?.k||V.persist.stats.favoriteWeapon}return r});
  hook(GameEngine.prototype,'fireMissiles',function(o,...a){const before=this.bullets?.length||0;const r=o.apply(this,a);const created=Math.max(0,(this.bullets?.length||0)-before);if(this.state===GAME.PLAYING&&created>0){V.stat(this,'shotsFired',created);V.persist.stats.favoriteWeapon='MISSILES'}return r});
  hook(GameEngine.prototype,'handleBulletHits',function(o,...a){const before=this.bullets?.filter(b=>!b.dead&&!b.isEnemy).length||0;const r=o.apply(this,a);const after=this.bullets?.filter(b=>!b.dead&&!b.isEnemy).length||0;V.stat(this,'shotsHit',Math.max(0,before-after));return r});
  const oldHurt=N8.hurt; if(oldHurt&&!oldHurt._v9stats){const wrap=function(g,e,d,col,o){const dealt=oldHurt(g,e,d,col,o);if(g?.state===GAME.PLAYING&&dealt>0){V.stat(g,'damageDealt',dealt);V.contractProgress?.(g,'kill',0)}return dealt};wrap._v9stats=1;N8.hurt=wrap;}
  hook(GameEngine.prototype,'usePower',function(o,...a){const slot=a[0];const r=o.apply(this,a);const key=typeof slot==='number'?N8.P?.[slot]?.k:N8.P?.[slot]?.k||String(slot||'');if(r!==false&&key)V.persist.stats.favoritePower=key;return r});
  N8.post.push(g=>{if(g.state!==GAME.PLAYING)return;V.persist.stats.playTime=(V.persist.stats.playTime||0)+1/60;g.v9RunTime=(g.v9RunTime||0)+1/60;V.persist.stats.longestSurvival=Math.max(V.persist.stats.longestSurvival||0,g.v9RunTime);const coinNow=Number(g.coins)||0;if(!Number.isFinite(g._v9CoinsSeen))g._v9CoinsSeen=coinNow;const coinDelta=coinNow-g._v9CoinsSeen;if(coinDelta>0)V.persist.stats.creditsEarned=(V.persist.stats.creditsEarned||0)+coinDelta;g._v9CoinsSeen=coinNow;V.persist.stats.highestCombo=Math.max(V.persist.stats.highestCombo||1,g.bestCombo||g.combo||1);if(g.v8?.streak)V.persist.stats.highestStreak=Math.max(V.persist.stats.highestStreak||0,g.v8.streak.n||0);if((g.v8?.t||0)%120===0)N8.v9.saveAll(g)});
  N8.resetFns.push(g=>ensureDaily());
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v9-stats.js');
