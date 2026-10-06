'use strict';
/* NEBULA PROTOCOL v9 — versioned local save/migration layer. */
(()=>{
  const N8=window.N8;
  const STORE='nebula9_save';
  const safeParse=(raw,fallback)=>{try{const v=JSON.parse(raw);return v??fallback}catch{return fallback}};
  const read=(k,f)=>safeParse(localStorage.getItem(k),f);
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
  const num=(k,d=0)=>{const n=Number(localStorage.getItem(k));return Number.isFinite(n)?n:d};
  const clone=v=>safeParse(JSON.stringify(v),v);
  const legacy={
    coins:num('nebula_coins',0),bestScore:num('nebula_best_score',0),bestStage:num('nebula_best_stage',1),
    upgrades:read('nebula_upgrades',{damage:1,fireRate:1,shield:1,hull:1,speed:1,crit:1,energy:1,magnet:1,armor:1,regen:1,pierce:1}),
    ships:read('nebula_ships',['VIPER']),selectedShip:localStorage.getItem('nebula_selected_ship')||'VIPER',
    missions:read('nebula_missions',[]),missionStreak:num('nebula_mission_streak',0),settings:read('nebula_settings',{crt:true,particles:false,shake:true}),
    pilot:read('nebula8_pilot',{xp:0,level:1,cheat:false}),tree:read('nebula8_tree',{}),loadout:read('nebula8_loadout',{primary:0,secondary:1,missile:'HOMING',powers:[0,1,2,3]})
  };
  function baseState(){return {
    version:9,migratedFrom:8,lastSaved:new Date().toISOString(),
    pilot:clone(legacy.pilot),tree:clone(legacy.tree),loadout:clone(legacy.loadout),
    credits:legacy.coins,salvage:0,tech:0,energyCores:0,
    bestScore:legacy.bestScore,bestStage:legacy.bestStage,
    ships:clone(legacy.ships),selectedShip:legacy.selectedShip,upgrades:clone(legacy.upgrades),settings:Object.assign({reducedMotion:false,highContrast:false,simplifiedHUD:false,uiScale:1,touchHand:'right',volumeMaster:1,volumeMusic:.45,volumeWeapons:1,volumeExplosions:1,volumeUI:1},clone(legacy.settings)),
    missions:clone(legacy.missions),missionStreak:legacy.missionStreak,
    galaxy:{sectorControl:{},discovered:{'1':true},recentBattles:[],activeEvents:[]},
    modules:{inventory:[],equipped:{HULL:null,ENGINE:null,SHIELD:null,REACTOR:null,'WEAPON CORE':null,ARMOR:null,COMPUTER:null,'SPECIAL MODULE':null}},
    loadouts:{},achievements:{},daily:{date:'',items:[]},customization:{primary:'#00f0ff',secondary:'#7ddcff',engine:'#38d9ff',shield:'#7dffea',emblem:'N',finish:'SATIN',trail:'ION'},
    campaign:{chapter:1,completed:0,history:[],title:'FRONTIER AWAKENING',briefing:'Stabilize the first war corridor and establish a secure command route.'},stats:{kills:0,bossKills:0,capitalKills:0,shotsHit:0,damageDealt:0,damageReceived:0,sectorsCompleted:0,missionsCompleted:0,creditsEarned:0,lootCollected:0,highestCombo:1,highestStreak:0,longestSurvival:0,playTime:0,favoriteShip:'VIPER',favoriteWeapon:'PULSE',favoritePower:'NOVA BURST',highestSector:1,energyShots:0,perfectSectors:0}
  }}
  function migrate(){
    const cur=read(STORE,null);
    if(cur&&cur.version===9)return cur;
    let s=baseState();
    /* v5→v8 were historically split across keys; migrate the durable public keys into v9. */
    for(const k of ['nebula5_save','nebula6_save','nebula7_save','nebula8_save']){
      const old=read(k,null);if(old&&typeof old==='object')s={...s,...old,version:9,migratedFrom:Math.max(5,Math.min(8,Number(old.version)||8))};
    }
    if(cur&&typeof cur==='object')s={...s,...cur,version:9};
    s.credits=Number.isFinite(+s.credits)?+s.credits:legacy.coins;
    s.bestScore=Math.max(+s.bestScore||0,legacy.bestScore);s.bestStage=Math.max(+s.bestStage||1,legacy.bestStage);
    s.pilot=Object.assign(baseState().pilot,legacy.pilot,s.pilot||{});
    s.modules=s.modules&&typeof s.modules==='object'?s.modules:baseState().modules;
    s.modules.inventory=Array.isArray(s.modules.inventory)?s.modules.inventory.filter(x=>x&&typeof x==='object').slice(0,80):[];
    s.modules.equipped=Object.assign({},baseState().modules.equipped,s.modules.equipped&&typeof s.modules.equipped==='object'?s.modules.equipped:{});
    s.loadouts=s.loadouts&&typeof s.loadouts==='object'?s.loadouts:{};s.campaign=s.campaign&&typeof s.campaign==='object'?s.campaign:baseState().campaign;
    s.galaxy=s.galaxy&&typeof s.galaxy==='object'?s.galaxy:baseState().galaxy;
    s.galaxy.sectorControl=s.galaxy.sectorControl&&typeof s.galaxy.sectorControl==='object'?s.galaxy.sectorControl:{};s.galaxy.discovered=s.galaxy.discovered&&typeof s.galaxy.discovered==='object'?s.galaxy.discovered:{'1':true};s.galaxy.recentBattles=Array.isArray(s.galaxy.recentBattles)?s.galaxy.recentBattles.slice(0,18):[];s.galaxy.activeEvents=Array.isArray(s.galaxy.activeEvents)?s.galaxy.activeEvents.slice(0,8):[];
    s.stats=Object.assign(baseState().stats,s.stats||{});s.campaign=Object.assign(baseState().campaign,s.campaign||{});s.settings=Object.assign(baseState().settings,s.settings||{});
    write(STORE,s);
    return s;
  }
  N8.v9=N8.v9||{};N8.ver='v9';
  N8.v9.saveKey=STORE;
  N8.v9.persist=migrate();
  N8.v9.safeParse=safeParse;
  N8.v9.readLegacy=read;
  N8.v9.write=write;
  N8.v9.ensure=(g)=>{
    const s=N8.v9.persist||baseState();
    if(g&&typeof g.coins==='number')s.credits=g.coins;
    return s;
  };
  N8.v9.syncFromGame=(g)=>{
    const s=N8.v9.persist||baseState();
    s.version=9;s.lastSaved=new Date().toISOString();s.credits=Number(g?.coins)||0;
    s.bestScore=Math.max(Number(s.bestScore)||0,Number(g?.bestScore)||0);s.bestStage=Math.max(Number(s.bestStage)||1,Number(g?.bestStage)||1);
    s.ships=clone(g?.unlockedShips||s.ships);s.selectedShip=g?.selectedShip||s.selectedShip;s.upgrades=clone(g?.upgrades||s.upgrades);
    s.missions=clone(g?.missions||s.missions);s.missionStreak=Number(g?.missionStreak)||s.missionStreak;
    if(window.N8.pilot)s.pilot=clone(window.N8.pilot);if(window.N8.tree?.lv)s.tree=clone(window.N8.tree.lv);if(window.N8.loadout)s.loadout=clone(window.N8.loadout);
    N8.v9.persist=s;write(STORE,s);
    return s;
  };
  N8.v9.saveAll=(g)=>{try{N8.v9.syncFromGame(g);return true}catch(e){console.warn('v9 save failed',e);return false}};
  N8.v9.exportString=(g)=>JSON.stringify(N8.v9.syncFromGame(g),null,2);
  N8.v9.importString=(g,raw)=>{
    const incoming=safeParse(raw,null);if(!incoming||typeof incoming!=='object')throw new Error('Invalid JSON save');
    const cur=baseState();const s={...cur,...incoming,version:9};
    s.pilot=Object.assign(cur.pilot,incoming.pilot||{});s.stats=Object.assign(cur.stats,incoming.stats||{});s.customization=Object.assign(cur.customization,incoming.customization||{});
    s.modules=Object.assign(cur.modules,incoming.modules||{});s.galaxy=Object.assign(cur.galaxy,incoming.galaxy||{});s.loadouts=Object.assign({},incoming.loadouts||{});s.campaign=Object.assign(cur.campaign,incoming.campaign||{});
    s.credits=Math.max(0,Number(s.credits)||0);s.bestStage=Math.max(1,Number(s.bestStage)||1);s.bestScore=Math.max(0,Number(s.bestScore)||0);
    if(g){g.coins=s.credits;g.bestStage=s.bestStage;g.bestScore=s.bestScore;g.unlockedShips=Array.isArray(s.ships)?s.ships.slice():['VIPER'];g.selectedShip=s.selectedShip||'VIPER';g.upgrades=Object.assign(g.upgrades||{},s.upgrades||{});g.missions=Array.isArray(s.missions)?s.missions.slice():g.missions;g.missionStreak=Number(s.missionStreak)||0;g.save()}
    if(window.N8.pilot)Object.assign(window.N8.pilot,s.pilot);if(window.N8.tree?.lv)Object.assign(window.N8.tree.lv,s.tree||{});if(window.N8.loadout)Object.assign(window.N8.loadout,s.loadout||{});
    localStorage.setItem('nebula_coins',String(s.credits));localStorage.setItem('nebula_best_stage',String(s.bestStage));localStorage.setItem('nebula_best_score',String(s.bestScore));
    localStorage.setItem('nebula_ships',JSON.stringify(g?.unlockedShips||s.ships));localStorage.setItem('nebula_selected_ship',g?.selectedShip||s.selectedShip);localStorage.setItem('nebula_upgrades',JSON.stringify(g?.upgrades||s.upgrades));
    if(window.N8.pilot)localStorage.setItem('nebula8_pilot',JSON.stringify(window.N8.pilot));if(window.N8.tree?.lv)localStorage.setItem('nebula8_tree',JSON.stringify(window.N8.tree.lv));if(window.N8.loadout)localStorage.setItem('nebula8_loadout',JSON.stringify(window.N8.loadout));
    N8.v9.persist=s;write(STORE,s);return true;
  };
  N8.v9.reset=()=>{try{localStorage.removeItem(STORE)}catch{} };
  if(typeof GameEngine!=='undefined'&&N8.hook){
    N8.hook(GameEngine.prototype,'save',function(o,...a){const r=o.call(this,...a);N8.v9.saveAll(this);return r});
  }
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v9-save.js');
