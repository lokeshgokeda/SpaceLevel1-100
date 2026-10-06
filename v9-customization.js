'use strict';
/* NEBULA PROTOCOL v9 — paint, emblem, trail and module-driven player presentation. */
(()=>{
  const N8=window.N8,V=N8.v9,hook=N8.hook,clamp=N8.clamp;
  const defaults={primary:'#00f0ff',secondary:'#7ddcff',engine:'#38d9ff',shield:'#7dffea',emblem:'N',finish:'SATIN',trail:'ION'};
  V.persist.customization=Object.assign(defaults,V.persist.customization||{});
  V.customization={
    get:()=>V.persist.customization,
    set:(k,v,g)=>{if(!(k in defaults))return;V.persist.customization[k]=String(v);if(g)N8.v9.saveAll(g);V.applyCss()}
  };
  V.applyCss=()=>{const r=document.documentElement,c=V.persist.customization||defaults;r.style.setProperty('--v9-primary',c.primary);r.style.setProperty('--v9-secondary',c.secondary);r.style.setProperty('--v9-engine',c.engine);r.style.setProperty('--v9-shield',c.shield)};
  hook(GameEngine.prototype,'startGame',function(o,...a){const r=o.apply(this,a);if(this.player)this.player.config.color=V.persist.customization.primary;return r});
  const pd=Player.prototype.draw;
  Player.prototype.draw=function(c){const old=this.config?.color;const cc=V.persist.customization||defaults;if(this.config)this.config.color=cc.primary;pd.call(this,c);if(this.config&&old!==undefined)this.config.color=old;};
  N8.addDraw(62,(g,c)=>{const p=g.player,cc=V.persist.customization||defaults;if(!p||g.state!==GAME.PLAYING)return;const t=g.v8?.t||0;const finish={MATTE:{alpha:.72,line:2},SATIN:{alpha:.86,line:2},POLISHED:{alpha:1,line:3},FIELD:{alpha:.92,line:4}}[cc.finish]||{alpha:.86,line:2};c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.12+.08*Math.sin(t*.16);c.strokeStyle=cc.secondary;c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,31+Math.sin(t*.08)*2,0,7);c.stroke();c.globalAlpha=.85;c.fillStyle=cc.engine;c.fillRect(p.x-3,p.y+22,6,12);c.globalCompositeOperation='source-over';c.globalAlpha=finish.alpha;c.strokeStyle=cc.primary;c.lineWidth=finish.line;c.beginPath();c.moveTo(p.x-13,p.y-20);c.lineTo(p.x,p.y-30);c.lineTo(p.x+13,p.y-20);c.lineTo(p.x+10,p.y+16);c.lineTo(p.x,p.y+27);c.lineTo(p.x-10,p.y+16);c.closePath();c.stroke();if(cc.finish==='POLISHED'){c.globalAlpha=.35;c.fillStyle=cc.secondary;c.fill();}else if(cc.finish==='FIELD'){c.globalAlpha=.18;c.fillStyle='#ffffff';c.fill();}c.globalAlpha=1;c.fillStyle=cc.secondary;c.font='800 7px Orbitron';c.textAlign='center';c.fillText(cc.emblem||'N',p.x,p.y+3);c.restore()});
  N8.addDraw(61,(g,c)=>{const p=g.player,cc=V.persist.customization||defaults;if(!p||g.state!==GAME.PLAYING)return;const t=g.v8?.t||0,rules={ION:1,PLASMA:1.25,PULSE:.8,VOID:1.5};const mul=rules[cc.trail]||1;c.save();c.globalCompositeOperation='lighter';for(let i=0;i<3;i++){let a=(t*.03+i*.8);let x=p.x+Math.sin(a)*5,y=p.y+26+i*5;c.globalAlpha=.18-i*.04;c.fillStyle=cc.engine;c.beginPath();c.ellipse(x,y+8*mul,2.5,12*mul,0,0,7);c.fill()}c.restore()});
  V.applyCss();
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v9-customization.js');
