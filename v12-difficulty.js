'use strict';
/* NEBULA PROTOCOL v12 — Warfront Pressure Director.
   Moderate mechanical escalation; no global stat inflation. */
(()=>{
  const N8=window.N8||{},GE=window.GameEngine,hook=N8.hook,clamp=N8.clamp;
  if(!GE||!hook)return;
  const pressure=g=>clamp(0.96+(Math.max(0,g.level)-1)*0.0009+(Math.max(0,g.wave)-1)*0.018,0.96,1.22);
  const oldShot=N8.eShot;
  if(oldShot&&!oldShot._v12Pressure){
    const wrap=function(g,kind,x,y,vx,vy,dmg,opt={}){const own=opt?.own;const mul=own?.v12Pressure||1;return oldShot(g,kind,x,y,vx,vy,dmg*mul,opt)};
    wrap._v12Pressure=1;N8.eShot=wrap;
  }
  hook(GE.prototype,'spawnWave',function(o,...a){
    const r=o.apply(this,a);const g=this;
    if(g.state!==GAME.PLAYING||g.gameMode==='BOSS_RUSH'||g.level%5===0)return r;
    const p=pressure(g);const list=(g.enemies||[]).filter(e=>!e.dead);for(const e of list){e.v12Pressure=p;e.v12PressureTier=p>=1.16?'HIGH':p>=1.06?'ELEVATED':'STANDARD';e.v12Tactical=true;e.v12BaseSpeed=Number.isFinite(e.speed)?e.speed:1;e.speed=Math.min(5.8,e.v12BaseSpeed*(1+(p-1)*0.55));}
    // Add a small tactical reinforcement on later sectors instead of huge HP multipliers.
    if(typeof Enemy==='function' && g.level>=8 && g.level%3===2 && g.enemies.length<32){
      const n=g.level>=24?2:1;
      for(let i=0;i<n;i++){
        const role=g.level>=15&&i===0?'ASSASSIN':'HUNTER';
        const e=new Enemy(90+i*180,-120-i*50,g.level,role,role);e.v12Pressure=Math.min(1.28,p+0.03);e.v12Tactical=true;e.v12Reinforcement=true;g.enemies.push(e);
      }
      g.addText?.(g.canvas.width/2,g.canvas.height*.25,'REINFORCEMENTS INBOUND','#ff8d7a',.75);
    }
    return r;
  });
  hook(GameEngine.prototype,'updateEnemies',function(o,...a){const r=o.apply(this,a),g=this;if(g.state!==GAME.PLAYING)return r;for(const e of g.enemies||[]){if(e.dead)continue;const tier=e.v12PressureTier;if(tier==='HIGH')e.v12Strafe=1.08;else if(tier==='ELEVATED')e.v12Strafe=1.04;else e.v12Strafe=1}return r;});
  hook(GE.prototype,'spawnBossRushBoss',function(o,...a){const r=o.apply(this,a),g=this,b=g.boss;if(b){b.v12Pressure=clamp(1.04+(g.bossRushStage||1)*.012,1.04,1.24);const ratio=b.maxHp>0?b.hp/b.maxHp:1;b.maxHp*=b.v12Pressure;b.hp=b.maxHp*ratio;g.toast?.('WARFRONT PRESSURE // '+Math.round(b.v12Pressure*100)+'%')};return r});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v12-difficulty.js');
