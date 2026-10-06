'use strict';
/* NEBULA PROTOCOL v9 — tactical AI and adaptive commander extensions. */
(()=>{
  const N8=window.N8,V=N8.v9,hook=N8.hook,clamp=N8.clamp;
  V.bossArchetypes=[{id:'LEVIATHAN',name:'VOID LEVIATHAN',shape:'wyrm',power:'SEEKER FANGS',color:'#9b4dff',attack:'PRESSURE'},{id:'DREADNOUGHT',name:'SOLAR DREADNOUGHT',shape:'sun',power:'SOLAR RINGS',color:'#ffae00',attack:'AREA'},{id:'TITAN',name:'NEBULA TITAN',shape:'titan',power:'METEOR HAMMER',color:'#ff4fd8',attack:'SIEGE'},{id:'DEVOURER',name:'ASTEROID DEVOURER',shape:'diamond',power:'GRAVITY TEETH',color:'#9aa6c0',attack:'CRUSH'},{id:'WARDEN',name:'PHASE WARDEN',shape:'eclipse',power:'PHASE SWARM',color:'#00ffcc',attack:'MIRROR'},{id:'QUEEN',name:'CARRIER QUEEN',shape:'queen',power:'HIVE LANCE',color:'#7dff42',attack:'SWARM'},{id:'OVERMIND',name:'ALIEN OVERMIND',shape:'singularity',power:'SINGULARITY',color:'#ffffff',attack:'ADAPT'}];
  const oldInit=N8.initBoss;if(oldInit&&!oldInit._v9arch){const wrap=function(g,b){const r=oldInit(g,b);const a=V.bossArchetypes[(V.hash('BOSS-'+g.level,b.level)||0)%V.bossArchetypes.length];b.archetype=a;b.def=Object.assign({},b.def,a);b.cls=a.name;b.v9Archetype=a.id;return r};wrap._v9arch=1;N8.initBoss=wrap;}
  function ai(g){
    const p=g.player;if(!p)return;const es=[];const valuable=[];for(const e of (g.enemies||[])){if(e.dead)continue;es.push(e);if(['CARRIER','ELITE','BOMBER'].includes(e.role)||e.type==='ELITE')valuable.push(e)}
    for(const e of es){e.v9ai=e.v9ai||{a:Math.random()*6.28};e.v9ai.a+=.035+(e.speed||1)*.004;
      if(e.hp>0&&e.maxHp&&e.hp/e.maxHp<.18){e.x+=(g.canvas.width/2-e.x)*.012;e.y=Math.max(-50,e.y-1.1);e.v9beh='RETREAT';continue}
      if(e.role==='SNIPER'){const desired=p.x+(e.x<p.x?-170:170);e.x+=(desired-e.x)*.012;e.y+=(Math.min(g.canvas.height*.45,p.y-260)-e.y)*.008;e.v9beh='RANGE'}
      else if(e.role==='ASSASSIN'){e.x+=(p.x+Math.sin(e.v9ai.a*2.2)*130-e.x)*.014;e.y+=(p.y-180-e.y)*.012;e.v9beh='FLANK'}
      else if(e.role==='BOMBER'){const t=g.v9?.capital||valuable[0]||p;e.x+=(t.x-e.x)*.01;e.y+=(t.y+40-e.y)*.009;e.v9beh='OBJECTIVE'}
      else if(e.role==='CARRIER'){const target=g.v9?.capital||p;e.x+=(g.canvas.width/2-e.x)*.006;e.y+=(Math.max(80,target.y-250)-e.y)*.008;e.v9beh='SUPPORT'}
      else if(e.role==='SHIELD_DRONE'){const t=valuable.find(x=>!x.dead)||g.boss;if(t){e.x+=(t.x-e.x)*.018;e.y+=(t.y-e.y)*.018}e.v9beh='PROTECT'}
      else if(e.role==='HUNTER'){e.x+=(p.x-e.x)*.008;e.y+=(p.y-120-e.y)*.006;e.v9beh='HUNT'}
      else{e.x+=Math.sin(e.v9ai.a)*(e.role==='INTERCEPTOR'?1.4:.65);if(es.length>5)e.x+=(p.x-e.x)*.003;e.v9beh='FORMATION'}
      e.x=clamp(e.x,-60,g.canvas.width+60);e.y=clamp(e.y,-80,g.canvas.height+80);
    }
  }
  function applyFactionTuning(g){const owner=V.owner(N8.sectorNo(g.level)),f=owner||V.factions[0];for(const e of (g.enemies||[])){if(e.dead||e.v9Faction)return;e.v9Faction=f.id;e.v9FactionData=f;if(Number.isFinite(e.maxHp)){e.maxHp*=f.hp;e.hp=Math.min(e.maxHp,e.hp*f.hp)}e.v9FactionDmg=f.dmg}}
  const oldShot=N8.eShot;if(oldShot&&!oldShot._v9Faction){const wrap=function(g,kind,x,y,vx,vy,dmg,opt={}){const own=opt?.own;const mul=own?.v9FactionDmg||1;return oldShot(g,kind,x,y,vx,vy,dmg*mul,opt)};wrap._v9Faction=1;N8.eShot=wrap}
  hook(GameEngine.prototype,'updateEnemies',function(o,...a){const r=o.apply(this,a);if(this.state===GAME.PLAYING){applyFactionTuning(this);ai(this)}return r});
  hook(Boss.prototype,'update',function(o,w,g){const r=o.call(this,w,g),b=this,p=g.player;if(!b||!g||g.state!==GAME.PLAYING)return r;b.v9=v9Boss(b);
    if(b.hp/b.maxHp<.36&&!b.v9.repaired){const dead=b.comps.find(c=>c.dead&&c.type!=='GEN');if(dead){dead.dead=false;dead.maxHp=Math.max(1,dead.maxHp*.8);dead.hp=dead.maxHp*.35;b.hp=Math.min(b.maxHp,b.hp+b.maxHp*.07);b.v9.repaired=true;g.toast('BOSS EMERGENCY REPAIR');g.addText(b.x,b.y-b.size-65,'EMERGENCY REPAIR','#ffe066',1);N8.shake(g,6)}}
    if(b.t8%320===0&&!b.v9.called&&b.ph>=1&&g.enemies.length<10){b.v9.called=true;for(let i=0;i<2+b.ph;i++)g.enemies.push(new Enemy(clamp(b.x+(i-1)*90,50,g.canvas.width-50),b.y+b.size*.5,g.level,'STANDARD',i%2?'HUNTER':'SHIELD_DRONE'));g.toast('COMMANDER REINFORCEMENTS');}
    if(b.t8%480===0)b.v9.called=false;
    if(p&&p.shield<p.maxShield*.25&&b.ph>=2&&b.t8%240===0){const dist=Math.hypot(p.x-b.x,p.y-b.y)||1;if(b.archetype?.attack==='MIRROR')N8.eShot?.(g,'WAVE',b.x,b.y,b.vx*.5,3.2,Math.max(18,g.level*.45),{col:b.def.color});else N8.eShot?.(g,'MISSILE',b.x,b.y+b.size*.4,(p.x-b.x)/dist*3.5,(p.y-b.y)/dist*3.5,Math.max(25,g.level),{col:b.def.color,homing:.025});}
    if(b.t8%420===0&&b.ph>=1){const a=b.archetype?.attack,dist=Math.hypot(p.x-b.x,p.y-b.y)||1;if(a==='PRESSURE'){for(let i=-1;i<=1;i++)N8.eShot?.(g,'MISSILE',b.x+i*32,b.y+b.size*.35,(p.x-b.x+i*35)/dist*3.1,(p.y-b.y)/dist*3.1,Math.max(18,g.level*.42),{col:b.def.color,homing:.02});}else if(a==='AREA'){for(let i=0;i<8;i++){const q=i/8*Math.PI*2;N8.eShot?.(g,'PLASMA',b.x,b.y,Math.cos(q)*2.8,Math.sin(q)*2.8,Math.max(14,g.level*.34),{col:b.def.color})}}else if(a==='SIEGE'){N8.eShot?.(g,'PLASMA',b.x,b.y,(p.x-b.x)/dist*2.4,(p.y-b.y)/dist*2.4,Math.max(28,g.level*.65),{col:b.def.color,homing:.008});}else if(a==='CRUSH'&&dist<330){const pull=.035;p.x+=((b.x-p.x)/dist)*pull*dist;p.y+=((b.y-p.y)/dist)*pull*dist;g.addText?.(p.x,p.y-28,'GRAVITY WELL','#b7b9d9',.8);}else if(a==='MIRROR'){b.vx=(-b.vx||1.5);b.x+=b.vx*22;}else if(a==='SWARM'&&g.enemies.length<12){for(let i=0;i<3;i++)g.enemies.push(new Enemy(clamp(b.x+rnd(-70,70),50,g.canvas.width-50),b.y+b.size*.5+i*18,g.level,'STANDARD',i%2?'FIGHTER':'ASSASSIN'));}else if(a==='ADAPT'){const kind=p.shield>p.hull?'PLASMA':'MISSILE';N8.eShot?.(g,kind,b.x,b.y,(p.x-b.x)/dist*3,(p.y-b.y)/dist*3,Math.max(22,g.level*.5),{col:b.def.color,homing:kind==='MISSILE'?.02:0});}}
    return r;
  });
  function v9Boss(b){return b.v9||=({repaired:false,called:false})}
  N8.post.push(g=>{if(g.state!==GAME.PLAYING)return;const b=g.boss;if(b?.comps){const alive=b.comps.filter(c=>!c.dead).map(c=>c.type);b.v9Weakness=alive.includes('GEN')?'BREAK_GENERATORS':alive.includes('ENGINE')?'CRIPPLE_ENGINES':alive.includes('TURRET')?'DISARM':'EXPOSE_CORE';}});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v9-combat.js');
