'use strict';
/* NEBULA PROTOCOL v9 — procedural galaxy/map. Canvas only; no thousand-node DOM. */
(()=>{
  const N8=window.N8,V=N8.v9||(N8.v9={}),$=N8.$;
  const clamp=N8.clamp;
  V.galaxy={count:1000,zoom:1,panX:0,panY:0,selected:1,drag:null,seed:0x9a7f};
  const nameA=['AEGIS','ORION','CALDERA','NEXUS','VEGA','LYRA','HELIX','MIRAGE','TALON','UMBRA','KHEPRI','ATLAS','RIFT','POLARIS','CINDER','ECHO'];
  const nameB=['REACH','ASCENT','GATE','DRIFT','CROWN','SPINE','BASIN','WATCH','VAULT','ARRAY','CITADEL','CORRIDOR','EXPANSE','THRESHOLD','GRAVE','DOMAIN'];
  V.sector=(id)=>{
    id=Math.max(1,Math.min(V.galaxy.count,id|0));const seed=V.seed(id),f=V.factionForSector(id),owner=V.owner(id),ctrl=V.controlFor(id),threat=Math.min(10,1+(seed%7)+Math.floor(id/180)),boss=id%5===0||id%37===0,event=id%11===0,resource=id%13===0,complete=(V.persist?.stats?.highestSector||1)>=id;
    const ang=((seed%6283)/1000),ring=(id/ V.galaxy.count),rad=125+ring*820;let x=Math.cos(ang)*rad,y=Math.sin(ang)*rad;
    x+=((V.hash('x'+id)%100)-50);y+=((V.hash('y'+id)%100)-50);
    const discovered=!!V.persist?.galaxy?.discovered?.[String(id)] || id===1;const status=complete?'COMPLETED':((discovered||id<=N8.maxStartSector(N8.g))?'DISCOVERED':'LOCKED');
    const obj=['COMBAT','ESCORT','SALVAGE','SURVIVAL','RECON','DEFENSE','CAPITAL'][seed%7];
    const reward=120+id*12+threat*80+(boss?850:0)+(resource?350:0);
    return {id,name:`${nameA[seed%nameA.length]} ${nameB[(seed>>>4)%nameB.length]}`,x,y,faction:f,owner,threat,boss,event,resource,status,objective:obj,reward,control:ctrl?.score??50};
  };
  V.visibleSectors=()=>{const a=[];for(let i=1;i<=V.galaxy.count;i++){const s=V.sector(i);if(V.galaxy.zoom<.8 && (s.id%3!==0))continue;a.push(s)}return a};
  V.locate=id=>{const s=V.sector(id);return {x:s.x,y:s.y}};
  N8.addDraw(12,(g,c)=>{if(g.state!==GAME.PLAYING)return;const sec=N8.sectorNo(g.level),f=V.owner(sec),t=g.v8?.t||0;c.save();c.globalAlpha=.35;for(let i=0;i<3;i++){const x=(f.id.length*91+i*173+t*(.15+i*.03))% (g.canvas.width+300)-150,y=70+i*62+Math.sin(t*.01+i)*18;c.strokeStyle=f.color;c.beginPath();c.moveTo(x,y);c.lineTo(x+58,y-5);c.lineTo(x+85,y);c.lineTo(x+58,y+5);c.closePath();c.stroke();c.globalAlpha*=.65}c.restore()});
  N8.addDraw(8,(g,c)=>{
    if(!V.mapOpen)return;
    c.save();c.fillStyle='rgba(1,5,13,.94)';c.fillRect(0,0,g.canvas.width,g.canvas.height);
    c.translate(g.canvas.width/2+V.galaxy.panX,g.canvas.height/2+V.galaxy.panY);c.scale(V.galaxy.zoom,V.galaxy.zoom);
    const seen=V.galaxy.selected||1;let nodes=V.visibleSectors();
    c.lineWidth=1/V.galaxy.zoom;c.globalAlpha=.24;c.strokeStyle='#6b8caf';
    for(let i=0;i<nodes.length;i+=2){const a=nodes[i],b=nodes[(i+1)%nodes.length];if(Math.hypot(a.x-b.x,a.y-b.y)<300){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke()}}
    for(const s of nodes){const locked=s.status==='LOCKED',r=(s.id===seen?7:4)/V.galaxy.zoom,col=locked?'#324255':s.owner.color;c.globalAlpha=locked?.28:.85;c.fillStyle=col;c.beginPath();c.arc(s.x,s.y,r,0,7);c.fill();if(s.boss){c.strokeStyle='#ff3355';c.lineWidth=1.5/V.galaxy.zoom;c.beginPath();c.arc(s.x,s.y,r+3/V.galaxy.zoom,0,7);c.stroke()}if(s.event){c.strokeStyle='#ffe66d';c.setLineDash([3,4]);c.beginPath();c.arc(s.x,s.y,r+5/V.galaxy.zoom,0,7);c.stroke();c.setLineDash([])}if(s.resource){c.fillStyle='#7dffcc';c.fillRect(s.x-1,yfix(s.y)-9,2,5)}}
    const ss=V.sector(seen);c.globalAlpha=1;c.strokeStyle='#fff';c.lineWidth=2/V.galaxy.zoom;c.beginPath();c.arc(ss.x,ss.y,13/V.galaxy.zoom,0,7);c.stroke();
    c.restore();
  });
  function yfix(v){return v}
  N8.resetFns.push(g=>{V.mapOpen=false;V.galaxy.drag=null;});
  V.openMap=()=>{V.mapOpen=true;const s=Math.max(1,Math.min(V.galaxy.count,V.galaxy.selected||1));V.galaxy.selected=s;V.renderMap&&V.renderMap();};
  V.closeMap=()=>{V.mapOpen=false;};
  V.selectSector=(id)=>{V.galaxy.selected=Math.max(1,Math.min(V.galaxy.count,id|0));V.renderMap&&V.renderMap();};
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v9-galaxy.js');
