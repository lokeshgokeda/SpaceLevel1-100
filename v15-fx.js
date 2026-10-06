'use strict';
/* NEBULA PROTOCOL v15 — effects layer. Pure rendering on top of the existing N8 draw pipeline (no second loop).
   Uses additive blends and cached glow sprites; counts are capped by N8.q (quality tier) so mobile stays smooth. */
(()=>{
const N8=window.N8,V=N8&&N8.v15;if(!N8||!V)return;
const {clamp}=N8,TAU=6.2832;
const PL=g=>g.state===GAME.PLAYING&&g.player&&g.v15;

/* ---- update ripples / streaks inside the existing frame step ---- */
const streaks=[];
N8.post.push(g=>{
  const v=g.v15;if(!v||g.state!==GAME.PLAYING)return;
  for(const r of v.ripples){r.r+=(r.max-r.r)*(r.t==='ult'?.09:.2)+1;r.life-=r.t==='ult'?.025:.07}
  v.ripples=v.ripples.filter(r=>r.life>0);
  const want=N8.q.fx>=100?(g.v8.warp>0?10:3):0;
  if(streaks.length<want&&Math.random()<.25)streaks.push({x:Math.random()*g.canvas.width,y:-20,l:20+Math.random()*50,s:9+Math.random()*10,a:.1+Math.random()*.25});
  for(const s of streaks)s.y+=s.s;
  for(let i=streaks.length-1;i>=0;i--)if(streaks[i].y-streaks[i].l>g.canvas.height)streaks.splice(i,1);
});

/* ---- z 58: ripples, shockwaves, shield distortion rings ---- */
N8.addDraw(58,(g,c)=>{
  const v=g.v15;if(!PL(g))return;
  c.save();c.globalCompositeOperation='lighter';
  for(const r of v.ripples){const a=clamp(r.life,0,1);
    if(r.t==='ult'){c.globalAlpha=a*.55;c.lineWidth=10*a+2;c.strokeStyle=r.c;c.beginPath();c.arc(r.x,r.y,r.r,0,TAU);c.stroke();c.globalAlpha=a*.25;c.lineWidth=3;c.strokeStyle='#fff';c.beginPath();c.arc(r.x,r.y,r.r*.86,0,TAU);c.stroke();
      const gr=c.createRadialGradient(r.x,r.y,r.r*.6,r.x,r.y,r.r);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,r.c);c.globalAlpha=a*.12;c.fillStyle=gr;c.beginPath();c.arc(r.x,r.y,r.r,0,TAU);c.fill()}
    else{c.globalAlpha=a*.7;c.lineWidth=2.5;c.strokeStyle=r.c;c.beginPath();c.arc(r.x,r.y,r.r,0,TAU);c.stroke();c.globalAlpha=a*.3;c.lineWidth=1;c.beginPath();c.arc(r.x,r.y,r.r*1.18,0,TAU);c.stroke()}}
  c.restore()});

/* ---- z 62: omega beam / devastation column ---- */
N8.addDraw(62,(g,c)=>{
  const v=g.v15,p=g.player,bm=v&&v.beam;if(!PL(g)||!bm)return;
  const f=bm.t/bm.max,grow=Math.min(1,(bm.max-bm.t)/10),w=bm.w*(bm.burst?f:Math.min(1,f*3))*grow,t=g.v8.t||0;
  c.save();c.globalCompositeOperation='lighter';
  const x=p.x,bot=p.y-18,gr=c.createLinearGradient(x-w,0,x+w,0);
  gr.addColorStop(0,'rgba(255,90,40,0)');gr.addColorStop(.3,'rgba(255,140,60,.55)');gr.addColorStop(.5,'rgba(255,255,255,.95)');gr.addColorStop(.7,'rgba(255,140,60,.55)');gr.addColorStop(1,'rgba(255,90,40,0)');
  c.globalAlpha=.75+.25*Math.sin(t*1.7);c.fillStyle=gr;c.fillRect(x-w,0,w*2,bot);
  c.globalAlpha=.9;c.fillStyle='#fff';c.fillRect(x-w*.14,0,w*.28,bot);
  if(N8.q.glow&&w>4){const m=N8.glow('#ff7a2e',Math.max(20,Math.round(w*1.1)));c.globalAlpha=.8;c.drawImage(m,x-w*1.1,bot-w*1.1,w*2.2,w*2.2)}
  if(N8.q.fx>=100)for(let i=0;i<5;i++){const yy=(t*34+i*210)%Math.max(1,bot);c.globalAlpha=.5;c.fillStyle='#ffd9a0';c.fillRect(x-w*.9+Math.sin(yy*.05+i)*w*.9,bot-yy,3,16)}
  c.restore()});

/* ---- z 70: time-break tint, charge ring, ultimate-ready aura, weak-point + stealth markers ---- */
N8.addDraw(70,(g,c)=>{
  const v=g.v15,p=g.player;if(!PL(g))return;const W=g.canvas.width,H=g.canvas.height,t=g.v8.t||0;
  if(v.tb>0){c.save();c.globalCompositeOperation='lighter';c.fillStyle='#2a6a78';c.globalAlpha=Math.min(1,v.tb/40)*.18;c.fillRect(0,0,W,H);
    const vg=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(125,255,232,.35)');c.globalAlpha=Math.min(1,v.tb/30);c.fillStyle=vg;c.fillRect(0,0,W,H);c.restore()}
  if(v.chg>0){const f=v.chg/60;c.save();c.globalCompositeOperation='lighter';c.strokeStyle='#ff8cf0';c.globalAlpha=.4+.5*f;c.lineWidth=2+f*3;c.beginPath();c.arc(p.x,p.y-22,34-f*22,0,TAU*f);c.stroke();
    if(f>=.98){c.globalAlpha=.5+.4*Math.sin(t*.8);c.beginPath();c.arc(p.x,p.y-22,38,0,TAU);c.stroke()}c.restore()}
  if(v.ultReady){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.25+.15*Math.sin(t*.25);c.strokeStyle='#ffcc33';c.lineWidth=2;c.setLineDash([6,8]);c.lineDashOffset=-t;c.beginPath();c.arc(p.x,p.y,42,0,TAU);c.stroke();c.restore()}
  if(N8.q.fx>=100){c.save();c.globalCompositeOperation='lighter';c.strokeStyle='#ff6680';c.lineWidth=1.5;
    for(const e of g.enemies){if(e.dead||e.y<0||!(e.role==='TANK'||e.role==='MINIBOSS'||e.role==='SNIPER'||e.role==='CARRIER'))continue;
      if(e.v8&&e.v8.cloak>0)continue;const r=7+Math.sin(t*.3+e.phase)*1.5,wy=e.y-e.size*.38;c.globalAlpha=.55;c.beginPath();c.arc(e.x,wy,r,0,TAU);c.moveTo(e.x-r-4,wy);c.lineTo(e.x+r+4,wy);c.moveTo(e.x,wy-r-4);c.lineTo(e.x,wy+r+4);c.stroke()}
    c.restore()}
  for(const e of g.enemies)if(!e.dead&&e.role==='STEALTH'&&e.v8&&e.v8.cloak>0){c.save();c.globalAlpha=.18+.1*Math.sin(t*.4+e.phase);c.strokeStyle='#9d7dff';c.setLineDash([4,6]);c.beginPath();c.arc(e.x,e.y,e.size*.55,0,TAU);c.stroke();c.restore()}});

/* ---- z 5 (behind gameplay): energy streaks ---- */
N8.addDraw(5,(g,c)=>{if(!streaks.length||!PL(g))return;c.save();c.globalCompositeOperation='lighter';c.strokeStyle='#9fd8ff';c.lineWidth=1;for(const s of streaks){c.globalAlpha=s.a;c.beginPath();c.moveTo(s.x,s.y);c.lineTo(s.x,s.y-s.l);c.stroke()}c.restore()});
N8.v15FX={ready:true};
window.NEBULA_BOOT?.module('v15-fx');
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v15-fx.js');
