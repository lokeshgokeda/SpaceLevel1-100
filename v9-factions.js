'use strict';
/* NEBULA PROTOCOL v9 — fictional faction layer. */
(()=>{
  const N8=window.N8, V=N8.v9||(N8.v9={}), H=(n,s)=>{let h=2166136261^s;for(let i=0;i<n.length;i++){h^=n.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
  V.factions=[
    {id:'TERRAN',name:'TERRAN UNION',color:'#38d9ff',accent:'#9beeff',emblem:'TU',style:'MODULAR',tech:'RAIL',strength:'LOGISTICS',weakness:'OVERCLOCK',hp:1.02,dmg:.98,territory:'.'},
    {id:'VOID',name:'VOID SYNDICATE',color:'#b56cff',accent:'#e0b0ff',emblem:'VS',style:'PHASED',tech:'GRAVITY',strength:'AMBUSH',weakness:'ARMOR',hp:.95,dmg:1.08,territory:'×'},
    {id:'NEBULA',name:'NEBULA COLLECTIVE',color:'#ff5fd8',accent:'#ff9fe9',emblem:'NC',style:'BIO-LATTICE',tech:'SWARM',strength:'REGEN',weakness:'FIREBREAK',hp:.98,dmg:1.04,territory:'✦'},
    {id:'IRON',name:'IRON LEGION',color:'#ff9d2e',accent:'#ffd090',emblem:'IL',style:'SIEGE',tech:'PLASMA',strength:'ARMOR',weakness:'SPEED',hp:1.13,dmg:1.02,territory:'◆'},
    {id:'ASTRAL',name:'ASTRAL DYNASTY',color:'#6fb8ff',accent:'#b9dcff',emblem:'AD',style:'PRECISION',tech:'LANCE',strength:'RANGE',weakness:'HULL',hp:1.0,dmg:1.11,territory:'◇'}
  ];
  V.faction=(id)=>V.factions.find(f=>f.id===id)||V.factions[0];
  V.hash=(n,s=0)=>H(String(n),s|0);
  V.seed=(sector)=>V.hash('GALAXY-'+sector,0x51a7);
  V.factionForSector=(sector)=>V.factions[V.seed(sector)%V.factions.length];
  V.controlFor=(sector)=>{
    const g=V.persist?.galaxy?.sectorControl||{};return g[String(sector)]||null;
  };
  V.setControl=(sector,faction,delta=1)=>{
    const key=String(sector),g=V.persist||{};g.galaxy=g.galaxy||{};g.galaxy.sectorControl=g.galaxy.sectorControl||{};
    const cur=g.galaxy.sectorControl[key]||{owner:V.factionForSector(sector).id,score:50};
    cur.score=Math.max(0,Math.min(100,cur.score+delta));if(cur.score>=100)cur.owner=faction;else if(cur.score<=0)cur.owner=(V.factions[(V.factions.findIndex(f=>f.id===cur.owner)+1)%V.factions.length]||V.factions[0]).id;
    g.galaxy.sectorControl[key]=cur;N8.v9.persist=g;
  };
  V.owner=(sector)=>V.faction(V.controlFor(sector)?.owner||V.factionForSector(sector).id);
  V.markBattle=(sector,attacker,defender,outcome)=>{
    const g=V.persist||{};g.galaxy=g.galaxy||{};g.galaxy.recentBattles=g.galaxy.recentBattles||[];
    g.galaxy.recentBattles.unshift({t:Date.now(),sector,attacker,defender,outcome});g.galaxy.recentBattles=g.galaxy.recentBattles.slice(0,18);N8.v9.persist=g;
  };
  V.driftWarfront=()=>{
    const g=V.persist||{};for(let i=0;i<4;i++){const s=1+(V.hash('DRIFT',((Date.now()/60000)|0)+i)%1000);const a=V.factionForSector(s),b=V.factions[(a===V.factions[4]?0:(V.factions.indexOf(a)+1+((V.hash('D'+s)%3)))%V.factions.length)];const cur=V.controlFor(s);const owner=cur?.owner||a.id;V.setControl(s,b.id,(V.hash('W'+s+Date.now())%7)-3);V.markBattle(s,a.id,b.id,owner===a.id? 'HOLD':'SHIFT');}
  };
  N8.post?.push(g=>{if(g.state!==GAME.PLAYING)return;V.persist=N8.v9.persist;if((g.v8?.t||0)-(+V.lastWarTick||0)>=1800){V.lastWarTick=g.v8.t;V.driftWarfront();}});
  if(N8.resetFns){N8.resetFns.push(g=>{V.lastWarTick=0;V.persist=N8.v9.persist;});}
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v9-factions.js');
