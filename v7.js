'use strict';
/* NEBULA PROTOCOL v7 layer — loaded after script.js and v6.js. Same hook pattern as v6; no second game loop. */
(()=>{
const GE=GameEngine,$=id=>document.getElementById(id);
const W=['PULSE','SCATTER','RAILGUN','PLASMA','LASER','NOVA','GRAVITY'];
const HEAT=[2.5,9,18,22,2.2,30,25]; // per shot (laser: per tick)
const POW=[{k:'1',n:'NOVA BLAST',e:35,cd:900},{k:'2',n:'AEGIS',e:30,cd:1200},{k:'3',n:'CHAIN LIGHTNING',e:25,cd:600},{k:'4',n:'GRAVITY WELL',e:28,cd:900}];
const hook=(o,name,fn)=>{const f=o[name];o[name]=function(...a){return fn.call(this,f,...a)}};
const alive=g=>[...(g.boss?[g.boss]:[]),...g.enemies].filter(e=>!e.dead);
const hurt=(g,e,d,col)=>{ // one damage path for enemies and boss
  if(window.N8&&window.N8.hurt){window.N8.hurt(g,e,d,col,{x:e.x,y:e.y});return}
  if(e===g.boss){e.hp-=d;g.addText(e.x+(Math.random()-.5)*40,e.y+30,'-'+Math.round(d),col||'#fff',.8);if(e.hp<=0)g.defeatBoss()}
  else{e.hp-=d;if(e.hp<=0)g.killEnemy(e)}};
const reset=g=>{g.heat=0;g.overheat=false;g.lock=null;g.wells=[];g.fx=[];g.bolts=[];g.laserT=0;g.pcd=[0,0,0,0];g.lastTier=0;g.hudT=0};

const st=document.createElement('style');
st.textContent='.weapon-hud{line-height:1.35;min-width:170px}.v7bar{height:5px;background:#12233a;margin:2px 0 5px}.v7bar i{display:block;height:100%}.v7pw{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}.v7pw span{font:700 .55rem Orbitron,sans-serif;padding:3px 5px;border:1px solid #00f0ff55}.v7pw .rdy{color:#0f8;border-color:#0f8}.v7lock{color:#ffcc00}.v7hot{color:#ff3355}';
document.head.appendChild(st);

hook(GE.prototype,'bind',function(o){
  o.call(this);const g=this;reset(g);
  g.canvas.addEventListener('pointerdown',e=>{if(e.button===1){e.preventDefault();g.lockNearest()}},true);
  window.addEventListener('keydown',e=>{
    if(e.repeat||g.state!==GAME.PLAYING)return;const k=(e.key||'').toLowerCase();
    if(k==='t')g.lockNearest();
    const i=POW.findIndex(p=>p.k===k);if(i>=0)g.usePower(i);
  },true);
});
hook(GE.prototype,'startGame',function(o,...a){o.apply(this,a);reset(this);this.updateWeaponHud()});
hook(GE.prototype,'exitGame',function(o){reset(this);return o.call(this)});

GE.prototype.cycleWeapon=function(){this.wmode=((this.wmode|0)+1)%W.length;this.audio.tone(900,.06,'square',.5);this.toast('WEAPON: '+W[this.wmode])};
GE.prototype.updateWeaponHud=function(){this.hudT=0};
GE.prototype.lockNearest=function(){
  if(this.state!==GAME.PLAYING)return;const m=this.mouse.active?this.mouse:this.player;let t=null,b=1e9;
  for(const e of alive(this)){const d=Math.hypot(e.x-m.x,e.y-m.y);if(d<b){b=d;t=e}}
  if(t){this.lock={e:t,t:0};this.audio.tone(1400,.08,'square',.5)}else this.lock=null};

GE.prototype.usePower=function(i){
  const p=this.player,c=POW[i];if(!p||this.pcd[i]>0||p.energy<c.e)return;
  p.energy-=c.e;this.pcd[i]=c.cd;this.audio.special();this.cameraShake=Math.max(this.cameraShake,6);
  if(i===0){ // NOVA BLAST — x1.5 when detonated inside a Gravity Well (synergy)
    const inWell=this.wells.some(w=>Math.hypot(w.x-p.x,w.y-p.y)<300),m=inWell?1.5:1;
    for(const e of alive(this))if(Math.hypot(e.x-p.x,e.y-p.y)<230*m)hurt(this,e,p.damage*6*m,'#ff9d2e');
    this.fx.push({x:p.x,y:p.y,r:10,max:230*m,life:1,color:'#ff9d2e'});this.explode(p.x,p.y,'#ff9d2e',30);if(inWell)this.addText(p.x,p.y-60,'SYNERGY x1.5','#ff9d2e',1);
  }else if(i===1){p.shield=p.maxShield;p.hitInvuln=Math.max(p.hitInvuln,180);this.fx.push({x:p.x,y:p.y,r:20,max:70,life:1,color:'#7d4dff',follow:1})}
  else if(i===2){ // CHAIN LIGHTNING — jumps to nearest unhit target
    let cur={x:p.x,y:p.y},pts=[[cur.x,cur.y]],hit=new Set();
    for(let n=0;n<6;n++){let t=null,b=n?260:520;for(const e of alive(this)){if(hit.has(e))continue;const d=Math.hypot(e.x-cur.x,e.y-cur.y);if(d<b){b=d;t=e}}
      if(!t)break;hit.add(t);pts.push([t.x,t.y]);hurt(this,t,p.damage*3.2,'#8affff');cur=t}
    this.bolts.push({pts,life:14});
  }else{this.wells.push({x:this.mouse.active?this.mouse.x:p.x,y:Math.max(120,p.y-260),life:200})}
};

/* ---- weapons ---- */
hook(GE.prototype,'fire',function(o){
  const p=this.player,m=this.wmode|0;if(!p||p.fireCooldown>0)return;
  if(this.overheat){if(!this.ohMsg||this.ohMsg<=0){this.toast('WEAPON OVERHEATED');this.ohMsg=90}return}
  const B=(vx,vy,r,d,pierce,st,col)=>{const b=new Bullet(p.x,p.y-24,vx,vy,col,false,d,r,0,st,pierce);this.bullets.push(b);return b};
  if(m<3){const n=this.bullets.length;o.call(this);if(p.fireCooldown>0||this.bullets.length>n)this.heat+=HEAT[m];return}
  if(this.bullets.length>240)return;
  if(m===3&&p.energy>=8){p.fireCooldown=30;p.energy-=8;B(0,-9,9,p.damage*4,2+p.pierce,4,'#7dff42');this.audio.tone(180,.3,'sawtooth',.6)}
  else if(m===4&&p.energy>=.8){ // continuous beam, hits everything in the column each tick
    p.fireCooldown=3;p.energy-=.8;this.laserT=4;
    for(const e of alive(this))if(e.y<p.y&&Math.abs(e.x-p.x)<(e.size||30)*.55+8)hurt(this,e,p.damage*.42,'#ff6bd6');
    if(!this.laserSnd||this.laserSnd<=0){this.audio.tone(520,.1,'sine',.35);this.laserSnd=6}
  }else if(m===5&&p.energy>=18){p.fireCooldown=70;p.energy-=18;const b=B(0,-7,7,0,0,4,'#ff9d2e');b.nova=1;this.audio.tone(110,.4,'square',.7)}
  else if(m===6&&p.energy>=22){p.fireCooldown=120;p.energy-=22;const b=B(0,-8,6,0,0,7,'#b56cff');b.well=1;this.audio.tone(90,.5,'triangle',.7)}
  else return;
  this.heat+=HEAT[m];
});

/* ---- per-frame systems ---- */
hook(GE.prototype,'update',function(o){
  o.call(this);
  if(this.state!==GAME.PLAYING||!this.player)return;const g=this,p=g.player;
  g.heat=Math.max(0,g.heat-(g.overheat?.9:.55));if(g.heat>=100){g.heat=100;if(!g.overheat){g.overheat=true;g.toast('WEAPON OVERHEATED');g.audio.tone(200,.4,'square',.6)}}
  else if(g.overheat&&g.heat<35)g.overheat=false;
  if(g.ohMsg>0)g.ohMsg--;if(g.laserT>0)g.laserT--;if(g.laserSnd>0)g.laserSnd--;
  for(let i=0;i<4;i++)if(g.pcd[i]>0)g.pcd[i]--;
  // lock validity + progress; missiles prefer the locked target
  if(g.lock){if(g.lock.e.dead||(g.lock.e!==g.boss&&!g.enemies.includes(g.lock.e)))g.lock=null;else g.lock.t=Math.min(30,g.lock.t+1)}
  if(g.lock&&g.lock.t>=30)for(const b of g.bullets){if(!b.missile||b.dead)continue;const t=g.lock.e,ca=Math.atan2(b.vy,b.vx);let da=Math.atan2(t.y-b.y,t.x-b.x)-ca;da=Math.atan2(Math.sin(da),Math.cos(da));const na=ca+Math.max(-.16,Math.min(.16,da)),s=Math.hypot(b.vx,b.vy);b.vx=Math.cos(na)*s;b.vy=Math.sin(na)*s}
  // nova / gravity projectiles
  for(const b of g.bullets){if(b.dead)continue;
    if(b.nova&&(b.age>42||alive(g).some(e=>Math.hypot(e.x-b.x,e.y-b.y)<(e.size||30)*.7))){b.dead=true;for(const e of alive(g))if(Math.hypot(e.x-b.x,e.y-b.y)<170)hurt(g,e,p.damage*5,'#ff9d2e');g.fx.push({x:b.x,y:b.y,r:8,max:170,life:1,color:'#ff9d2e'});g.explode(b.x,b.y,'#ff9d2e',26);g.cameraShake=Math.max(g.cameraShake,8);g.audio.boom(true)}
    else if(b.well&&b.age>28){b.dead=true;g.wells.push({x:b.x,y:b.y,life:150})}}
  for(const w of g.wells){w.life--;for(const e of g.enemies){if(e.dead)continue;const dx=w.x-e.x,dy=w.y-e.y,d=Math.hypot(dx,dy);if(d<280&&d>6){e.x+=dx/d*Math.min(4,d);e.y+=dy/d*Math.min(4,d)}if(d<70&&w.life%20===0){e.hp-=p.damage*.6;if(e.hp<=0)g.killEnemy(e)}}}
  g.wells=g.wells.filter(w=>w.life>0);
  for(const f of g.fx){f.r+=(f.max-f.r)*.16+1;f.life-=.045;if(f.follow){f.x=p.x;f.y=p.y}}g.fx=g.fx.filter(f=>f.life>0);
  for(const b of g.bolts)b.life--;g.bolts=g.bolts.filter(b=>b.life>0);
  // combo tier callouts
  const tier=g.combo>=18?4:g.combo>=10?3:g.combo>=5?2:g.combo>=2?1:0;
  if(tier>g.lastTier){const L=['','DOUBLE','MULTI KILL','CHAIN','DOMINATING'][tier];g.addText(p.x,p.y-70,L,'#ffcc00',1.3);g.audio.power()}g.lastTier=tier;
  /* v15: removed unreachable pre-v8 fallbacks (enemy AI + HUD refresh gated on !window.N8; v8-env always defines N8) */
});

/* ---- boss phases + weak point ---- */
hook(Boss.prototype,'update',function(o,w,game){
  o.call(this,w,game);if(this.y<this.targetY)return;
  const r=this.hp/this.maxHp;this.v7t=(this.v7t||0)+1;
  this.wp={x:this.x+Math.cos(this.phase*1.7)*this.size*.62,y:this.y+Math.sin(this.phase*1.7)*this.size*.42};
  if(r<.66&&!this.p2){this.p2=true;game.cameraShake=16;game.toast('PHASE 2 — REINFORCEMENTS INBOUND');game.addText(this.x,this.y-90,'PHASE 2','#ffcc00',1.4);game.audio.boom(true);
    for(let i=0;i<3&&game.enemies.length<30;i++)game.enemies.push(new Enemy(this.x+(i-1)*90,this.y+60,game.level,'STANDARD','INTERCEPTOR'))}
  if(r<.33&&!this.p3){this.p3=true;game.cameraShake=22;game.toast('FINAL PHASE — OVERLOAD RING EVERY 3s');game.addText(this.x,this.y-90,'FINAL PHASE','#ff3355',1.5);game.audio.boom(true)}
  if(this.p3){if(this.v7t%180===120)this.warn=60;if(this.warn>0){this.warn--;if(this.warn===0){const d=20+this.level*.7;for(let i=0;i<16;i++){const a=i*Math.PI/8+this.phase;game.enemyBullet(this.x,this.y,Math.cos(a)*4.5,Math.sin(a)*4.5,'#ff3355',d)}}}}
});
hook(GE.prototype,'handleBulletHits',function(o){ // weak point: hits that land on it deal +200% and show CRITICAL
  const b=this.boss;if(b&&b.wp)for(const q of this.bullets){if(q.dead||q.isEnemy)continue;if(Math.hypot(q.x-b.wp.x,q.y-b.wp.y)<20){b.hp-=q.damage*2;this.addText(b.wp.x,b.wp.y-20,'CRITICAL x3','#ff3355',1.1);this.explode(b.wp.x,b.wp.y,'#ff3355',6)}}
  return o.call(this);
});

/* ---- overlay: crosshair, lock box, beam, rings, bolts, wells, boss weak point ---- */
hook(GE.prototype,'draw',function(o){
  o.call(this);if(this.state!==GAME.PLAYING||!this.player)return;
  const c=this.ctx,p=this.player,g=this;c.save();c.lineWidth=2;
  for(const w of g.wells){c.globalAlpha=Math.min(1,w.life/40)*.7;c.strokeStyle='#b56cff';for(let i=0;i<3;i++){c.beginPath();c.arc(w.x,w.y,(w.life*1.3+i*40)%180+10,0,7);c.stroke()}}
  for(const f of g.fx){c.globalAlpha=Math.max(0,f.life);c.strokeStyle=f.color;c.lineWidth=4;c.beginPath();c.arc(f.x,f.y,f.r,0,7);c.stroke()}
  c.lineWidth=3;for(const b of g.bolts){c.globalAlpha=b.life/14;c.strokeStyle='#8affff';c.shadowBlur=14;c.shadowColor='#8affff';c.beginPath();b.pts.forEach((q,i)=>i?c.lineTo(q[0]+(Math.random()-.5)*10,q[1]+(Math.random()-.5)*10):c.moveTo(q[0],q[1]));c.stroke()}
  c.shadowBlur=0;
  if(g.laserT>0){c.globalAlpha=.85;const gr=c.createLinearGradient(p.x-10,0,p.x+10,0);gr.addColorStop(0,'rgba(255,107,214,0)');gr.addColorStop(.5,'#fff');gr.addColorStop(1,'rgba(255,107,214,0)');c.fillStyle=gr;c.fillRect(p.x-10,0,20,p.y-22)}
  const bs=g.boss;if(bs&&bs.wp){c.globalAlpha=.9;c.strokeStyle='#ff3355';c.lineWidth=2;c.beginPath();c.arc(bs.wp.x,bs.wp.y,14+Math.sin(bs.phase*8)*2,0,7);c.moveTo(bs.wp.x-20,bs.wp.y);c.lineTo(bs.wp.x+20,bs.wp.y);c.moveTo(bs.wp.x,bs.wp.y-20);c.lineTo(bs.wp.x,bs.wp.y+20);c.stroke();
    if(bs.warn>0){c.globalAlpha=.4;c.strokeStyle='#ff3355';c.beginPath();c.arc(bs.x,bs.y,(60-bs.warn)*6,0,7);c.stroke();c.globalAlpha=1;c.fillStyle='#ff3355';c.font='800 14px Orbitron';c.textAlign='center';c.fillText('⚠ OVERLOAD RING',bs.x,bs.y-bs.size-20)}}
  if(g.lock){const e=g.lock.e,s=(e.size||60)*.8+6+(30-g.lock.t)*.6,ok=g.lock.t>=30;c.globalAlpha=1;c.strokeStyle=ok?'#ffcc00':'#ff9d2e';c.lineWidth=2;
    for(const [sx,sy] of[[-1,-1],[1,-1],[1,1],[-1,1]]){c.beginPath();c.moveTo(e.x+sx*s,e.y+sy*(s-12));c.lineTo(e.x+sx*s,e.y+sy*s);c.lineTo(e.x+sx*(s-12),e.y+sy*s);c.stroke()}
    c.fillStyle=c.strokeStyle;c.font='700 11px Orbitron';c.textAlign='left';const nm=e===g.boss?'BOSS TARGET LOCK':'TARGET LOCK';
    c.fillText(`${nm} · ${e===g.boss?e.def.name:e.role} · ${Math.round(Math.hypot(e.x-p.x,e.y-p.y))}m`,e.x+s+6,e.y-6);c.fillText(`HP ${Math.max(0,Math.round(e.hp))}/${Math.round(e.maxHp)}  ${ok?'LOCKED':'LOCKING '+Math.round(g.lock.t/30*100)+'%'}`,e.x+s+6,e.y+10)}
  if(g.mouse.active&&!g.touch){const m=g.mouse;let near=false;for(const e of alive(g))if(Math.hypot(e.x-m.x,e.y-m.y)<(e.size||40)+30){near=true;break}
    const col=g.overheat?'#ff3355':g.lock?'#ffcc00':near?'#ff5577':'#00f0ff',rdy=g.missileCd<=0;c.globalAlpha=.95;c.strokeStyle=col;c.lineWidth=2;
    c.beginPath();c.arc(m.x,m.y,near?12:16,0,7);c.stroke();if(rdy){c.globalAlpha=.4;c.beginPath();c.arc(m.x,m.y,22,0,7);c.stroke();c.globalAlpha=.95}
    c.beginPath();for(const [dx,dy] of[[1,0],[-1,0],[0,1],[0,-1]]){c.moveTo(m.x+dx*6,m.y+dy*6);c.lineTo(m.x+dx*(near?12:10),m.y+dy*(near?12:10))}c.stroke()}
  c.restore();
});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v7.js');
