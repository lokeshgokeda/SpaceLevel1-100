'use strict';
/* NEBULA PROTOCOL v9 — procedural contracts layered above the legacy mission system. */
(()=>{
  const N8=window.N8,V=N8.v9,hook=N8.hook;
  const cats=['COMBAT','ESCORT','DEFENSE','ASSASSINATION','SALVAGE','RECON','SURVIVAL','BOSS','CONVOY','CAPITAL SHIP','RESOURCE HUNT'];
  const nouns=['VOID HUNTERS','IRON RAIDERS','NEBULA SWARM','PHASE STALKERS','SIEGE BOMBERS','RIFT GUARDS'];
  const make=(g,i=0)=>{const sec=N8.sectorNo(g.level),seed=N8.v9.hash(`CONTRACT-${sec}-${i}-${N8.pilot?.level||1}`,33);const cat=cats[seed%cats.length],target=nouns[(seed>>>5)%nouns.length],goal=['SURVIVAL','DEFENSE','ESCORT','CONVOY'].includes(cat)?90+(seed%91):cat==='CAPITAL SHIP'?1+(seed%2):cat==='BOSS'?1+(seed%2):cat==='RESOURCE HUNT'?4+(seed%5):8+(seed%12);const reward=180+sec*22+goal*14+(cat==='CAPITAL SHIP'?650:0)+(cat==='BOSS'?420:0);const desc=['SURVIVAL','DEFENSE'].includes(cat)?`Hold the defensive corridor for ${goal} seconds in ${N8.sectorLabel(g.level)}.`:['ESCORT','CONVOY'].includes(cat)?`Protect the convoy until extraction; maintain the corridor for ${goal} seconds.`:cat==='SALVAGE'?`Recover ${goal} wreck cores before the sector closes.`:cat==='RECON'?`Clear ${goal} hostile signatures during the reconnaissance sweep.`:cat==='CAPITAL SHIP'?`Destroy ${goal} capital ship${goal>1?'s':''}.`:cat==='BOSS'?`Defeat ${goal} sector commander${goal>1?'s':''}.`:`Destroy ${goal} ${target.toLowerCase()}.`;return {id:`C${sec}-${i}`,category:cat,name:`${cat} // ${target}`,desc,goal,reward,progress:0,done:false,seed,type:cat};};
  V.contracts={ensure:g=>{const s=N8.sectorNo(g.level);if(V.persist.contractSector!==s||!Array.isArray(V.persist.contracts)||V.persist.contracts.length!==3){V.persist.contractSector=s;V.persist.contracts=[make(g,0),make(g,1),make(g,2)];N8.v9.saveAll(g)}return V.persist.contracts},refresh:g=>{V.persist.contractSector=0;return V.contracts.ensure(g)}};
  V.contractProgress=(g,category,amt=1)=>{const cs=V.contracts.ensure(g);for(const c of cs){if(c.done)continue;let add=0;if(category==='kill'&&['COMBAT','ASSASSINATION','RECON'].includes(c.category))add=amt;if(category==='boss'&&c.category==='BOSS')add=amt;if(category==='capital'&&c.category==='CAPITAL SHIP')add=amt;if(category==='loot'&&['SALVAGE','RESOURCE HUNT'].includes(c.category))add=amt;if(category==='survive'&&['SURVIVAL','ESCORT','CONVOY','DEFENSE'].includes(c.category))add=amt;if(add){c.progress=Math.min(c.goal,c.progress+add);if(c.progress>=c.goal){c.done=true;g.coins+=c.reward;V.persist.salvage=(V.persist.salvage||0)+Math.round(c.reward*.18);V.persist.tech=(V.persist.tech||0)+Math.round(c.reward/180);V.persist.stats.missionsCompleted=(V.persist.stats.missionsCompleted||0)+1;g.toast(`CONTRACT COMPLETE // +${c.reward} CR`);N8.audio.play('MISSION')}}}N8.v9.saveAll(g)};
  hook(GameEngine.prototype,'startGame',function(o,...a){const r=o.apply(this,a);V.contracts.ensure(this);return r});
  hook(GameEngine.prototype,'killEnemy',function(o,e){const r=o.call(this,e);V.contractProgress(this,'kill',1);return r});
  hook(GameEngine.prototype,'defeatBoss',function(o,...a){const r=o.apply(this,a);V.contractProgress(this,'boss',1);return r});
  N8.post.push(g=>{if(g.state!==GAME.PLAYING)return;const e=g.v9?.event;if(e?.type==='survive')V.contractProgress(g,'survive',1/60);if((g.v8?.t||0)%60===0&&g.v9?.event?.type==='loot')V.contractProgress(g,'loot',0)});
  N8.resetFns.push(g=>{V.contractSector=0});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v9-missions.js');
