'use strict';
/* NEBULA PROTOCOL v9 — capital ships: multi-section targets, turrets, launch bays and staged destruction. */
(()=>{
  const N8=window.N8,V=N8.v9,hook=N8.hook,clamp=N8.clamp,rnd=N8.rnd;
  const TYPES=[
    {type:'DESTROYER',size:115,hp:4200,shield:1300,armor:.16,color:'#ff7650',speed:.55,crew:3},
    {type:'CRUISER',size:145,hp:6500,shield:2100,armor:.2,color:'#7d8cff',speed:.38,crew:4},
    {type:'BATTLESHIP',size:178,hp:9000,shield:2900,armor:.26,color:'#ffb347',speed:.26,crew:5},
    {type:'CARRIER',size:160,hp:7600,shield:2600,armor:.18,color:'#6bffba',speed:.3,crew:8},
    {type:'DREADNOUGHT',size:210,hp:12500,shield:3800,armor:.3,color:'#d98cff',speed:.2,crew:10},
    {type:'SUPER CARRIER',size:198,hp:10600,shield:3400,armor:.24,color:'#5ec8ff',speed:.22,crew:12}
  ];
  class CapitalShip{
    constructor(g,kind='DESTROYER'){
      const t=TYPES.find(x=>x.type===kind)||TYPES[0];Object.assign(this,{kind:kind,def:t,x:-t.size-30,y:130+Math.random()*80,vx:t.speed,hp:t.hp,maxHp:t.hp,shield:t.shield,maxShield:t.shield,armor:t.armor,phase:0,t:0,fireT:90,launchT:180,dead:false,hitFlash:0,stage:0,sections:[],turrets:[],bayOpen:true});
      this.playerFaction='TERRAN';
      this.sections=[
        {id:'ENGINE_L',name:'PORT ENGINE',x:-.68,y:.28,r:.22,hp:t.hp*.14,max:t.hp*.14,dead:false},
        {id:'ENGINE_R',name:'STARBOARD ENGINE',x:.68,y:.28,r:.22,hp:t.hp*.14,max:t.hp*.14,dead:false},
        {id:'SHIELD',name:'SHIELD GENERATOR',x:0,y:-.08,r:.2,hp:t.hp*.1,max:t.hp*.1,dead:false},
        {id:'ARMOR',name:'ARMOR BELT',x:0,y:.42,r:.32,hp:t.hp*.18,max:t.hp*.18,dead:false},
        {id:'WEAPON',name:'FORWARD BATTERY',x:0,y:-.52,r:.2,hp:t.hp*.1,max:t.hp*.1,dead:false}
      ];
      this.turrets=[-1,0,1].map((side,i)=>({x:side*.45,y:-.2+(i%2)*.26,cd:45+i*22,side}));
    }
    sectionAt(px,py){const dx=(px-this.x)/this.def.size,dy=(py-this.y)/this.def.size;let best=null,bd=9;for(const s of this.sections)if(!s.dead){const d=Math.hypot(dx-s.x,dy-s.y);if(d<s.r&&d<bd){bd=d;best=s}}return best}
    damage(g,amount,x,y){if(this.dead)return 0;const sec=this.sectionAt(x,y);let d=Math.max(0,amount)*(1-this.armor);if(this.shield>0){const s=Math.min(this.shield,d);this.shield-=s;d-=s;if(s>0&&Math.random()<.3)g.v8.hitFlash=2;}
      if(sec){sec.hp-=d*1.35;if(sec.hp<=0&&!sec.dead){sec.dead=true;this.stage++;g.addText(secX(this,sec),secY(this,sec)-18,`${sec.name} OFFLINE`,'#ffe066',.8);N8.shake(g,5);this.fireT=Math.max(this.fireT,55)}}else this.hp-=d;
      this.hitFlash=5;if(this.hp<=0){this.hp=0;this.dead=true;g.addText(this.x,this.y- this.def.size-28,`${this.kind} DESTROYED`,'#5dff8a',1.2);g.explode(this.x,this.y,this.def.color,80,true);this.drop(g);return amount}return amount-d;
    }
    drop(g){V.persist.stats.capitalKills=(V.persist.stats.capitalKills||0)+1;V.persist.salvage=(V.persist.salvage||0)+180+this.def.size;V.persist.tech=(V.persist.tech||0)+30+Math.round(this.def.size/10);V.persist.energyCores=(V.persist.energyCores||0)+(this.kind==='DREADNOUGHT'?8:3);g.coins+=250+Math.round(this.def.size*1.7);N8.achievement?.progress(g,'CAPITAL_DESTROYER',1);N8.v9.saveAll(g);try{N8.audio.play('BOOM_L',this.x,this.y)}catch{}}
    update(g){this.t++;this.x+=this.vx*(this.sections.every(s=>s.dead)?1.7:1);this.y=130+Math.sin(this.t*.007)*45;if(this.x>g.canvas.width+this.def.size){this.x=-this.def.size-30}this.shield=Math.min(this.maxShield,this.shield+(this.sections.find(s=>s.id==='SHIELD'&&!s.dead)?this.maxShield*.0007:0));this.fireT--;this.launchT--;
      const p=g.player;if(this.fireT<=0&&p){this.fireT=Math.max(35,115-this.t/70);const targetX=p.x,targetY=p.y;for(const tu of this.turrets)if(!this.sections.find(s=>s.id==='WEAPON')?.dead){const sx=this.x+tu.x*this.def.size,sy=this.y+tu.y*this.def.size,dx=targetX-sx,dy=targetY-sy,m=Math.hypot(dx,dy)||1;N8.eShot(g,this.kind==='DREADNOUGHT'?'PLASMA':'LASER',sx,sy,dx/m*(this.kind==='DREADNOUGHT'?3.2:5.1),dy/m*(this.kind==='DREADNOUGHT'?3.2:5.1),Math.max(15,g.level*.55)*(1+this.stage*.09),{col:this.def.color})}}
      if(this.kind==='CARRIER'||this.kind==='SUPER CARRIER'){if(this.launchT<=0){this.launchT=260;if(g.enemies.length<9){for(let i=0;i<Math.min(this.def.crew,3);i++)g.enemies.push(new Enemy(this.x+rnd(-50,50),this.y+this.def.size*.45+i*18,g.level,'STANDARD',i%2?'INTERCEPTOR':'FIGHTER'))}}}
      if(this.stage>=4)this.vx=Math.max(.12,this.vx*.996);
    }
    draw(c,g){const t=this.def,s=this.def.size;c.save();c.translate(this.x,this.y);c.globalCompositeOperation='lighter';c.globalAlpha=this.hitFlash?1:.55;c.strokeStyle=t.color;c.lineWidth=8;c.beginPath();c.ellipse(0,0,s*1.08,s*.46,0,0,7);c.stroke();c.globalCompositeOperation='source-over';c.globalAlpha=1;c.fillStyle='#101622';c.strokeStyle=t.color;c.lineWidth=3;c.beginPath();c.roundRect(-s,s*.1,s*2,s*.55,14);c.fill();c.stroke();c.fillStyle='#1d2634';c.fillRect(-s*.85,-s*.2,s*1.7,s*.42);c.fillStyle=t.color;c.globalAlpha=.75;for(const tu of this.turrets){c.save();c.translate(tu.x*s,tu.y*s);c.fillRect(-8,-4,16,8);c.fillRect(-2,-14,4,11);c.restore()}c.globalAlpha=1;for(const q of this.sections){const x=q.x*s,y=q.y*s;c.fillStyle=q.dead?'#2d3037':q.id==='SHIELD'?'#48d9ff':t.color;c.globalAlpha=q.dead?.18:.85;c.beginPath();c.arc(x,y,q.r*s*.65,0,7);c.fill();c.globalAlpha=1}
      const hp=this.hp/this.maxHp,sh=this.shield/this.maxShield;c.globalAlpha=.9;c.fillStyle='rgba(0,0,0,.65)';c.fillRect(-s,-s*.84,s*2,6);c.fillStyle='#ff4d6d';c.fillRect(-s,-s*.84,s*2*hp,6);c.fillStyle='#4ecbff';c.fillRect(-s,-s*.74,s*2*sh,4);c.restore();
    }
  }
  function secX(b,s){return b.x+s.x*b.def.size}function secY(b,s){return b.y+s.y*b.def.size}
  V.capital={types:TYPES,CapitalShip};
  N8.resetFns.push(g=>{g.v9=g.v9||{};g.v9.capital=null});
  N8.pre.push(g=>{const b=g.v9?.capital;if(!b||g.state!==GAME.PLAYING)return;b.update(g);if(b.dead){g.v9.capital=null;N8.v9.saveAll(g)}});
  N8.addDraw(58,(g,c)=>{const b=g.v9?.capital;if(b)b.draw(c,g)});
  hook(GameEngine.prototype,'handleBulletHits',function(o,...a){const b=this.v9?.capital,p=this.player;if(b&&!b.dead){for(const bl of this.bullets){if(bl.dead||bl.isEnemy)continue;const d=Math.hypot(bl.x-b.x,bl.y-b.y);if(d<b.def.size*.85){const dmg=bl.damage*(Math.random()<p.crit?2.4:1);b.damage(this,dmg,bl.x,bl.y);this.addText(bl.x,bl.y,`-${Math.round(dmg)}`,dmg>bl.damage?'#fff36b':'#cfe3f5',dmg>bl.damage?1:.7);V.statHit&&V.statHit(this,dmg);if(bl.pierce>0)bl.pierce--;else bl.dead=true}}this.bullets=this.bullets.filter(x=>!x.dead)}return o.apply(this,a)});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v9-capital.js');
