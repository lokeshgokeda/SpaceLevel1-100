'use strict';
/* NEBULA PROTOCOL v9 — persistent achievement tracker. */
(()=>{
  const N8=window.N8,V=N8.v9,hook=N8.hook;
  const defs=[
    ['FIRST_BLOOD','FIRST BLOOD','Destroy your first hostile.',1,100],['KILLS_100','HUNDRED MARK','Destroy 100 hostiles.',100,250],['KILLS_1000','THOUSAND MARK','Destroy 1,000 hostiles.',1000,900],
    ['FIRST_BOSS','COMMANDER DOWN','Defeat your first boss.',1,400],['BOSS_SLAYER','BOSS SLAYER','Defeat 10 bosses.',10,1200],['NO_DAMAGE','NO DAMAGE','Complete a sector without taking hull damage.',1,500],
    ['PERFECT_SECTOR','PERFECT SECTOR','Complete a sector without receiving damage.',1,650],['LEGENDARY_DROP','FORTUNE OF WAR','Acquire a Legendary module.',1,350],['MYTHIC_DROP','MYTHIC SIGNAL','Acquire a Mythic module.',1,1200],
    ['ALL_WEAPONS','FULL ARMORY','Unlock every v8/v9 weapon.',1,1000],['ALL_POWERS','FULL ARSENAL','Unlock every power.',1,1000],['MASTER_PILOT','MASTER PILOT','Reach Pilot Level 25.',25,1500],
    ['SECTOR_100','SECTOR CONQUEROR','Reach Sector 100.',100,2200],['RAMPAGE','RAMPAGE','Reach a 12-kill streak.',12,500],['ANNIHILATION','ANNIHILATION','Reach a 26-kill streak.',26,1000],['CAPITAL_DESTROYER','CAPITAL DESTROYER','Destroy a capital ship.',1,1200]
  ].map(([id,name,desc,goal,reward])=>({id,name,desc,goal,reward}));
  V.achievementDefs=defs;
  const store=()=>V.persist.achievements||(V.persist.achievements={});
  N8.achievement={
    progress(g,id,amt=1){const d=defs.find(x=>x.id===id);if(!d)return;const a=store()[id]||{progress:0,done:false};if(a.done)return;a.progress=Math.min(d.goal,(a.progress||0)+amt);if(a.progress>=d.goal){a.progress=d.goal;a.done=true;g.coins+=d.reward;g.toast(`ACHIEVEMENT // ${d.name} +${d.reward} CR`);try{N8.audio.play('MISSION')}catch{}V.persist.stats.missionsCompleted=(V.persist.stats.missionsCompleted||0);N8.v9.saveAll(g)}store()[id]=a;},
    unlock(g,id){const d=defs.find(x=>x.id===id);if(!d)return;const a=store()[id];if(a?.done)return;this.progress(g,id,d.goal)},
    setProgress(g,id,value){const d=defs.find(x=>x.id===id);if(!d)return;const a=store()[id]||{progress:0,done:false};if(a.done)return;a.progress=Math.min(d.goal,Math.max(Number(a.progress)||0,Number(value)||0));if(a.progress>=d.goal){a.progress=d.goal;a.done=true;g.coins+=d.reward;g.toast(`ACHIEVEMENT // ${d.name} +${d.reward} CR`);try{N8.audio.play('MISSION')}catch{}N8.v9.saveAll(g)}store()[id]=a},
    inspect(g){const s=store();this.setProgress(g,'KILLS_100',V.persist.stats.kills||0);this.setProgress(g,'KILLS_1000',V.persist.stats.kills||0);this.setProgress(g,'BOSS_SLAYER',V.persist.stats.bossKills||0);this.setProgress(g,'SECTOR_100',V.persist.stats.highestSector||1);this.setProgress(g,'RAMPAGE',V.persist.stats.highestStreak||0);this.setProgress(g,'ANNIHILATION',V.persist.stats.highestStreak||0);this.setProgress(g,'MASTER_PILOT',N8.pilot?.level||1);return defs.map(d=>({...d,state:s[d.id]||{progress:0,done:false}}))}
  };
  function countUnlocks(){
    const w=N8.W?.filter((x,i)=>N8.pilot?.level>=x.lvl||N8.pilot?.cheat).length||0,p=N8.P?.filter((x)=>N8.pilot?.level>=x.lvl||N8.pilot?.cheat).length||0;return {w,p};
  }
  hook(GameEngine.prototype,'killEnemy',function(o,e){const r=o.call(this,e);if(!e)return r;V.persist.stats.kills=(V.persist.stats.kills||0)+1;N8.achievement.progress(this,'FIRST_BLOOD',1);N8.achievement.setProgress(this,'KILLS_100',V.persist.stats.kills);N8.achievement.setProgress(this,'KILLS_1000',V.persist.stats.kills);if(this.v8?.streak?.n) {V.persist.stats.highestStreak=Math.max(V.persist.stats.highestStreak||0,this.v8.streak.n);N8.achievement.setProgress(this,'RAMPAGE',V.persist.stats.highestStreak);N8.achievement.setProgress(this,'ANNIHILATION',V.persist.stats.highestStreak)}return r});
  hook(GameEngine.prototype,'defeatBoss',function(o,...a){const before=this.boss;const r=o.apply(this,a);if(before){V.persist.stats.bossKills=(V.persist.stats.bossKills||0)+1;N8.achievement.progress(this,'FIRST_BOSS',1);N8.achievement.setProgress(this,'BOSS_SLAYER',V.persist.stats.bossKills)}return r});
  hook(GameEngine.prototype,'completeLevel',function(o,...a){const completedLevel=Math.max(1,Number(this.level)||1);const perfect=(Number(V.persist.stats.sectorDamage)||0)<=0;const r=o.apply(this,a);V.persist.stats.sectorsCompleted=(V.persist.stats.sectorsCompleted||0)+1;const completedSector=N8.sectorNo(completedLevel);const nextSector=Math.min(1000,completedSector+1);V.persist.stats.highestSector=Math.max(V.persist.stats.highestSector||1,completedSector);if(perfect){N8.achievement.progress(this,'NO_DAMAGE',1);N8.achievement.progress(this,'PERFECT_SECTOR',1);V.persist.stats.perfectSectors=(V.persist.stats.perfectSectors||0)+1}V.persist.galaxy=V.persist.galaxy||{};V.persist.galaxy.discovered=V.persist.galaxy.discovered||{};V.persist.galaxy.discovered[String(completedSector)]=true;V.persist.galaxy.discovered[String(nextSector)]=true;const u=countUnlocks();if(u.w===N8.W.length)N8.achievement.unlock(this,'ALL_WEAPONS');if(u.p===N8.P.length)N8.achievement.unlock(this,'ALL_POWERS');N8.v9.saveAll(this);return r});
  N8.resetFns.push(g=>{V.persist.stats.sectorDamage=0;V.persist.stats.longestSurvival=0});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v9-achievements.js');
