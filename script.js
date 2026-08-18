'use strict';

const GAME = Object.freeze({ MENU:0, PLAYING:1, GAMEOVER:2, PAUSED:3 });
const MAX_LEVEL = 10000;
const TOTAL_SHIPS = 300; // 60 original + 240 new ships
const TOTAL_BOSSES = 200; // 200 distinct boss identities

const SHIPS = {
  VIPER:{id:'VIPER',name:'Viper Alpha',cost:0,speed:8,hp:100,shield:55,energy:100,damage:10,color:'#00f0ff',shape:'viper',special:'NOVA BURST',weapon:0,desc:'Balanced tactical interceptor.'},
  AEGIS:{id:'AEGIS',name:'Aegis Sentinel',cost:500,speed:6,hp:190,shield:120,energy:105,damage:13,color:'#7d4dff',shape:'aegis',special:'AEGIS WALL',weapon:1,desc:'Heavy armor and shield specialist.'},
  PHANTOM:{id:'PHANTOM',name:'Phantom Speeder',cost:900,speed:11,hp:78,shield:45,energy:120,damage:9,color:'#ff1768',shape:'phantom',special:'TIME SLICE',weapon:2,desc:'Extreme speed and rapid fire.'},
  SPECTRE:{id:'SPECTRE',name:'Spectre Interceptor',cost:1500,speed:9.5,hp:130,shield:80,energy:125,damage:15,color:'#00ffcc',shape:'spectre',special:'PHASE BEAM',weapon:3,desc:'Critical-hit energy craft.'},
  TITAN:{id:'TITAN',name:'Titan Dreadnought',cost:2600,speed:5,hp:330,shield:170,energy:105,damage:21,color:'#ffae00',shape:'titan',special:'GRAVITY HAMMER',weapon:4,desc:'Slow fortress with huge firepower.'},
  WRAITH:{id:'WRAITH',name:'Wraith Reaper',cost:3900,speed:10,hp:145,shield:95,energy:155,damage:18,color:'#ff4dff',shape:'wraith',special:'VOID DRAIN',weapon:5,desc:'Steals energy from enemy formations.'},
  SOLARIS:{id:'SOLARIS',name:'Solaris Ark',cost:5400,speed:7.5,hp:245,shield:135,energy:185,damage:19,color:'#ffe04d',shape:'solaris',special:'SOLAR FLARE',weapon:6,desc:'Energy carrier with radial weapons.'},
  OMEGA:{id:'OMEGA',name:'Omega Ascendant',cost:7800,speed:9,hp:270,shield:185,energy:210,damage:25,color:'#ffffff',shape:'omega',special:'OMEGA RIFT',weapon:7,desc:'Prototype with exceptional all-round stats.'},
  NOVA:{id:'NOVA',name:'Nova Valkyrie',cost:10500,speed:8.5,hp:220,shield:150,energy:240,damage:29,color:'#62a8ff',shape:'nova',special:'STARFALL',weapon:8,desc:'Late-game carrier with devastating energy output.'},
  QUASAR:{id:'QUASAR',name:'Quasar Monarch',cost:14000,speed:10,hp:310,shield:210,energy:260,damage:34,color:'#8affff',shape:'quasar',special:'QUASAR LANCE',weapon:9,desc:'Final-tier warship built for level 100.'}
};

const BOSS_TYPES = [
  {name:'ABYSSAL LEVIATHAN',shape:'hex',power:'TRIPLE LANCE',color:'#ff0055',pattern:0},
  {name:'VOID BEHEMOTH',shape:'circle',power:'VOID ORBS',color:'#9b4dff',pattern:1},
  {name:'CYBER MANTIS',shape:'mantis',power:'SCISSOR BLADES',color:'#00ff9d',pattern:2},
  {name:'SOLAR DESTROYER',shape:'sun',power:'SOLAR RINGS',color:'#ffae00',pattern:3},
  {name:'NEBULA HYDRA',shape:'hydra',power:'SEEKER FANGS',color:'#00d9ff',pattern:4},
  {name:'PRISM COLOSSUS',shape:'diamond',power:'PRISM RAY',color:'#ff4fd8',pattern:5},
  {name:'ORBITAL FORTRESS',shape:'fortress',power:'ORBITAL MINES',color:'#7d8cff',pattern:6},
  {name:'ECLIPSE REVENANT',shape:'eclipse',power:'DARK PULSES',color:'#aa66ff',pattern:7},
  {name:'SINGULARITY WARDEN',shape:'singularity',power:'GRAVITY WELL',color:'#ffffff',pattern:8},
  {name:'DRAGON NOVA',shape:'dragon',power:'NOVA BREATH',color:'#ff3355',pattern:9},
  {name:'STARFORGE TITAN',shape:'titan',power:'METEOR HAMMER',color:'#ffcc00',pattern:10},
  {name:'QUANTUM SPECTER',shape:'specter',power:'PHASE SWARM',color:'#00ffcc',pattern:11},
  {name:'BIO-NOVA QUEEN',shape:'queen',power:'ACID BLOOM',color:'#7dff42',pattern:12},
  {name:'ION WYRM',shape:'wyrm',power:'ION CHAINS',color:'#42a5ff',pattern:13},
  {name:'RIFT EMPEROR',shape:'emperor',power:'RIFT GATES',color:'#d15cff',pattern:14},
  {name:'BLACKSTAR CORE',shape:'blackstar',power:'EVENT HORIZON',color:'#e6e6ff',pattern:15},
  {name:'GALACTIC JUGGERNAUT',shape:'juggernaut',power:'MISSILE WALL',color:'#ff6b35',pattern:16},
  {name:'PHOTON SERAPH',shape:'seraph',power:'LIGHT SPEARS',color:'#fff38a',pattern:17},
  {name:'VOID DRAGON',shape:'dragon',power:'VOID BREATH',color:'#7a6cff',pattern:18},
  {name:'FRONTIER OMEGA',shape:'omega',power:'OMEGA STORM',color:'#ffffff',pattern:19}
];


// Expand the fleet to 50 unique, playable ships.
const EXTRA_SHIP_COLORS=['#00f0ff','#ff1768','#7d4dff','#00ff9d','#ffae00','#ff4dff','#ffe04d','#62a8ff','#8affff','#ff6b35','#42a5ff','#d15cff','#7dff42','#fff38a','#e6e6ff'];
const EXTRA_SHIP_SHAPES=['viper','aegis','phantom','spectre','titan','wraith','solaris','omega','nova','quasar','arrow','trident','wing','scythe','orbital','sting','diamond','crescent','splitter','blade','hammer','ray','halo','falcon','mantis','spear','shield','comet','cross','xwing','serpent'];
for(let i=Object.keys(SHIPS).length+1;i<=TOTAL_SHIPS;i++){
  const tier=Math.floor((i-1)/20)+1, color=EXTRA_SHIP_COLORS[(i-1)%EXTRA_SHIP_COLORS.length], shape=EXTRA_SHIP_SHAPES[(i-1)%EXTRA_SHIP_SHAPES.length];
  SHIPS['SHIP_'+i]={id:'SHIP_'+i,name:`Frontier ${['Aegis','Nova','Void','Solar','Quantum','Hyperion'][i%6]}-${String(i).padStart(3,'0')}`,cost:900+i*420,speed:5.5+(i%11)*.55,hp:105+i*5.2,shield:60+i*3.2,energy:105+i*2.6,damage:11+i*.72,color,shape,special:['NOVA BURST','PHASE DRIVE','GRAVITY HAMMER','VOID DRAIN','SOLAR FLARE','QUANTUM RIFT','PLASMA FAN','SINGULARITY SHOT'][i%8],weapon:i%24,desc:`Generation-${tier} warship with a distinct frame and weapon profile.`};
}

// Expand to 50 distinct boss identities. Patterns cycle through the existing attack engine.
const EXTRA_BOSS_NAMES=['NEON WRAITH','CELESTIAL REAPER','VOID EMPRESS','PLASMA KRAKEN','DARKSTAR PRIME','ION PHANTOM','GALAXY DEVOURER','RADIANT TYRANT','QUANTUM DRAGON','ASTRAL WARLORD','COSMIC HYDRA','NEXUS OVERLORD','STORM COLOSSUS','EON DESTROYER','GRAVITY EMPEROR','NOVA REVENANT','SPECTRAL KING','ORBITAL DEVOURER','STAR EATER','HYPERION PRIME','RIFT TITAN','OMEGA SERAPH','BLACK COMET','VOID MONARCH','CELESTIAL CORE','CHRONO BEAST','SUPERNOVA KING','INFINITY WARDEN','GALACTIC REAPER','FRONTIER DEVOURER','SOLAR PHANTOM','MOONFALL TITAN','DEEP SPACE HYDRA','QUASAR BEAST','ECLIPSE KING','PHOTON DEVOURER','STAR CITADEL','RADIANT LEVIATHAN','COSMIC TITAN','VOID ARCHON','NEBULA EMPEROR','DARK MATTER LORD','HYPERDRIVE REAPER','GALACTIC SERPENT','INFINITE DRAGON','TIME WARDEN','STELLAR COLOSSUS','OMEGA DEVOURER','FRONTIER ASCENDANT','ULTIMATE SINGULARITY'];
const EXTRA_BOSS_COLORS=['#00eaff','#ff3b81','#a56bff','#31ffb5','#ffb52e','#7c9cff','#ff6cf0','#ffffff','#48d8ff','#ff5d45'];
const BOSS_PREFIX=['NEON','VOID','SOLAR','QUANTUM','ASTRAL','ECLIPSE','COSMIC','RIFT','NOVA','HYPERION','GALACTIC','INFINITE','DARK','PRISM','CHRONO','STAR','ION','PLASMA','CELESTIAL','SINGULAR'];
const BOSS_SUFFIX=['WRAITH','REAPER','TITAN','HYDRA','EMPEROR','QUEEN','COLOSSUS','DEVOURER','WARDEN','SERAPH','DRAGON','MANTIS','BEHEMOTH','CORE','OVERLORD','LEVIATHAN','PHANTOM','ARCHON','JUGGERNAUT','SPECTER'];
const BOSS_SHAPES=['hex','circle','mantis','sun','hydra','diamond','fortress','eclipse','singularity','dragon','titan','specter','queen','wyrm','emperor','blackstar','juggernaut','seraph'];
const BOSS_POWERS=['PLASMA STORM','VOID RAIN','QUANTUM BURST','STAR LANCE','GRAVITY PULSE','MISSILE WALL','ION RING','PHASE SWARM','NOVA BREATH','DARK LASER','METEOR SHOWER','RIFT GATES','PRISM BEAM','SINGULARITY WAVE','CHAOS ORBS','SOLAR SPEARS'];
for(let i=BOSS_TYPES.length;i<TOTAL_BOSSES;i++){const name=i<EXTRA_BOSS_NAMES.length+20?EXTRA_BOSS_NAMES[i-20]:`${BOSS_PREFIX[i%BOSS_PREFIX.length]} ${BOSS_SUFFIX[Math.floor(i/BOSS_PREFIX.length)%BOSS_SUFFIX.length]} ${String(i+1).padStart(3,'0')}`;BOSS_TYPES.push({name,shape:BOSS_SHAPES[i%BOSS_SHAPES.length],power:BOSS_POWERS[i%BOSS_POWERS.length],color:EXTRA_BOSS_COLORS[i%EXTRA_BOSS_COLORS.length],pattern:i%24});}

const BACKGROUNDS = [
  ['NEBULA REACH','#050019','#18002e','#00d9ff'],['CRIMSON VOID','#180006','#3b0014','#ff0055'],['CYBER GRID','#001216','#00243a','#00ffcc'],['SOLAR STORM','#1b0a00','#451600','#ffb000'],
  ['CRYSTAL DEEP','#080018','#2a0d45','#a477ff'],['ASTEROID BELT','#0d0b08','#2b1a0d','#ff6b00'],['ION TEMPEST','#00111c','#00294a','#00eaff'],['ECLIPSE','#020204','#170522','#d46cff'],
  ['QUANTUM BLOOM','#001414','#002b25','#62ffca'],['STAR FORGE','#180d00','#352000','#fff08a']
];

const POWERUPS = {
  TRIPLE:{label:'3X',color:'#00f0ff',duration:420}, QUAD:{label:'4X',color:'#ff00ff',duration:420},
  REPAIR:{label:'HP',color:'#00ff66',instant:true}, SHIELD:{label:'SHD',color:'#55aaff',instant:true},
  BOOST:{label:'DMG',color:'#ffcc00',duration:420}, BEAM:{label:'BEAM',color:'#ff3300',duration:300},
  BOMB:{label:'BOMB',color:'#ffffff',instant:true}, RAPID:{label:'RAPID',color:'#00ff9d',duration:420},
  MAGNET:{label:'MAG',color:'#d46cff',duration:420}, NOVA:{label:'NOVA',color:'#ff6688',instant:true}
};

const UPGRADE_META = {
  damage:{name:'Damage Core',icon:'💥',base:120,max:40,desc:'Increase every weapon hit.'},
  fireRate:{name:'Pulse Engine',icon:'⚡',base:130,max:35,desc:'Reduce weapon cooldown.'},
  shield:{name:'Aegis Matrix',icon:'🛡️',base:150,max:35,desc:'Increase maximum shield.'},
  hull:{name:'Hull Plating',icon:'⬢',base:170,max:35,desc:'Increase maximum hull.'},
  speed:{name:'Thruster Array',icon:'🚀',base:160,max:25,desc:'Increase movement speed.'},
  crit:{name:'Crit Processor',icon:'✹',base:210,max:30,desc:'Increase critical hit chance.'},
  energy:{name:'Core Reactor',icon:'◉',base:190,max:30,desc:'Increase special energy.'},
  magnet:{name:'Salvage Field',icon:'🧲',base:180,max:25,desc:'Attract powerups from farther away.'},
  armor:{name:'Titan Armor',icon:'🧱',base:240,max:40,desc:'Reduce incoming damage by up to 40%.'},
  regen:{name:'Nano Repair',icon:'✚',base:260,max:30,desc:'Regenerate hull during combat.'},
  pierce:{name:'Piercing Core',icon:'⚔️',base:300,max:25,desc:'Shots can pass through additional enemies.'}
};

class AudioFX{
  constructor(){this.ctx=null;this.master=.20}
  init(){if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(C)this.ctx=new C()}if(this.ctx?.state==='suspended')this.ctx.resume()}
  tone(f,d=.1,type='sine',v=.2){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,this.ctx.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,f*.3),this.ctx.currentTime+d);g.gain.setValueAtTime(v*this.master,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+d);o.connect(g);g.connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+d)}
  laser(enemy=false,style=0){const base=enemy?220:700+(style%10)*85;const types=['sine','square','sawtooth','triangle'];this.tone(base,.07+(style%4)*.015,types[style%4],enemy?.34:.32)}
  boom(big=false){this.tone(big?75:140,big?.55:.25,'square',big?.8:.35)}
  power(){this.tone(450,.15,'triangle',.5);setTimeout(()=>this.tone(1000,.18,'triangle',.4),60)}
  special(){this.tone(130,.3,'sawtooth',.7);setTimeout(()=>this.tone(800,.35,'sine',.55),80)}
}

class Particle{
  constructor(x,y,color,speed=7,size=2,life=1){this.x=x;this.y=y;this.color=color;const a=Math.random()*Math.PI*2,s=Math.random()*speed;this.vx=Math.cos(a)*s;this.vy=Math.sin(a)*s;this.size=size;this.life=life;this.decay=.015+Math.random()*.025}
  update(){this.x+=this.vx;this.y+=this.vy;this.vx*=.985;this.vy*=.985;this.life-=this.decay}
  draw(c){c.save();c.globalAlpha=Math.max(0,this.life);c.fillStyle=this.color;c.shadowBlur=10;c.shadowColor=this.color;c.beginPath();c.arc(this.x,this.y,this.size,0,Math.PI*2);c.fill();c.restore()}
}
class FloatText{
  constructor(x,y,text,color='#fff',scale=1){this.x=x;this.y=y;this.text=text;this.color=color;this.life=1;this.vy=-1.1;this.scale=scale}
  update(){this.y+=this.vy;this.life-=.02}
  draw(c){c.save();c.globalAlpha=Math.max(0,this.life);c.fillStyle=this.color;c.font=`900 ${Math.round(15*this.scale)}px Orbitron`;c.textAlign='center';c.fillText(this.text,this.x,this.y);c.restore()}
}
class Bullet{
  constructor(x,y,vx,vy,color,enemy=false,damage=10,radius=3.5,homing=0,style=0,pierce=0){this.hitCooldown=0;Object.assign(this,{x,y,vx,vy,color,isEnemy:enemy,damage,radius,homing,age:0,style:style%24,pierce})}
  update(player){this.age++;if(this.homing&&player){const dx=player.x-this.x,dy=player.y-this.y,d=Math.hypot(dx,dy)||1;this.vx+=(dx/d)*this.homing;this.vy+=(dy/d)*this.homing;const s=Math.hypot(this.vx,this.vy);if(s>10){this.vx=this.vx/s*10;this.vy=this.vy/s*10}}this.x+=this.vx;this.y+=this.vy}
  draw(c){c.save();c.translate(this.x,this.y);c.rotate(Math.atan2(this.vy,this.vx)+Math.PI/2);c.fillStyle=this.color;c.strokeStyle=this.color;c.shadowBlur=14;c.shadowColor=this.color;const r=this.radius,s=this.style;
    c.beginPath();
    if(s===0){c.arc(0,0,r,0,Math.PI*2);c.fill()}
    else if(s===1){if(c.roundRect)c.roundRect(-r*.65,-r*2.8,r*1.3,r*5.6,r*.5);else c.rect(-r*.65,-r*2.8,r*1.3,r*5.6);c.fill()}
    else if(s===2){c.moveTo(0,-r*3.2);c.lineTo(r*1.4,r*2.2);c.lineTo(0,r*1.2);c.lineTo(-r*1.4,r*2.2);c.closePath();c.fill()}
    else if(s===3){c.moveTo(0,-r*3);c.lineTo(r*2.2,0);c.lineTo(0,r*3);c.lineTo(-r*2.2,0);c.closePath();c.fill()}
    else if(s===4){c.arc(0,0,r*1.4,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,0,r*.45,0,Math.PI*2);c.fill()}
    else if(s===5){for(let i=0;i<6;i++){const a=i*Math.PI/3;c.lineTo(Math.cos(a)*r*2.8,Math.sin(a)*r*2.8)}c.closePath();c.fill()}
    else if(s===6){c.moveTo(-r*1.2,-r*3);c.lineTo(r*1.2,-r*3);c.lineTo(r*.55,r*3);c.lineTo(-r*.55,r*3);c.closePath();c.fill()}
    else if(s===7){c.arc(0,0,r*1.5,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(-r*2.8,0);c.lineTo(r*2.8,0);c.moveTo(0,-r*2.8);c.lineTo(0,r*2.8);c.stroke()}
    else if(s===8){c.moveTo(0,-r*3.4);c.lineTo(r*1.1,r);c.lineTo(r*2.6,r*2.7);c.lineTo(0,r*1.5);c.lineTo(-r*2.6,r*2.7);c.lineTo(-r*1.1,r);c.closePath();c.fill()}
    else if(s===9){c.arc(0,0,r*1.1,0,Math.PI*2);c.fill();c.globalCompositeOperation='destination-out';c.beginPath();c.arc(0,-r*.4,r*.65,0,Math.PI*2);c.fill();c.globalCompositeOperation='source-over';c.strokeStyle=this.color;c.beginPath();c.arc(0,0,r*1.5,0,Math.PI*2);c.stroke()}
    else if(s===10){c.moveTo(-r*2,-r*2);c.lineTo(r*2,-r*2);c.lineTo(r*2,r*2);c.lineTo(-r*2,r*2);c.closePath();c.stroke();c.beginPath();c.arc(0,0,r*.65,0,Math.PI*2);c.fill()}
    else if(s===11){c.moveTo(0,-r*3);c.lineTo(r*2,r*2);c.lineTo(0,r);c.lineTo(-r*2,r*2);c.closePath();c.stroke();c.beginPath();c.arc(0,0,r*.5,0,Math.PI*2);c.fill()}
    else if(s===12){c.arc(0,0,r*2.1,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(-r*2.5,-r*1.2);c.lineTo(r*2.5,r*1.2);c.stroke()}
    else if(s===13){c.moveTo(0,-r*3);c.bezierCurveTo(r*3,-r,r*3,r,0,r*3);c.bezierCurveTo(-r*3,r,-r*3,-r,0,-r*3);c.fill()}
    else if(s===14){c.moveTo(0,-r*3);for(let i=1;i<10;i++){const a=-Math.PI/2+i*Math.PI/4.5,rr=i%2?r*1.3:r*3;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}c.closePath();c.fill()}
    else {c.beginPath();c.arc(0,0,r*2,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,0,r*.35,0,Math.PI*2);c.fill();}
    c.restore()}
}
class PowerUp{
  constructor(x,y,type){this.x=x;this.y=y;this.type=type;this.cfg=POWERUPS[type];this.vy=1.6;this.phase=Math.random()*Math.PI*2}
  update(){this.y+=this.vy;this.phase+=.08}
  draw(c){c.save();c.translate(this.x,this.y+Math.sin(this.phase)*3);c.fillStyle=this.cfg.color;c.strokeStyle='#fff';c.lineWidth=1.5;c.shadowBlur=18;c.shadowColor=this.cfg.color;c.beginPath();c.arc(0,0,16,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#000';c.font='900 9px Orbitron';c.textAlign='center';c.textBaseline='middle';c.fillText(this.cfg.label,0,0);c.restore()}
}
class Enemy{
  constructor(x,y,level,type='STANDARD'){
    this.x=x;this.y=y;this.type=type;this.size=type==='ELITE'?50:38;
    const L=Math.min(1000,Math.max(1,level));
    this.maxHp=(type==='ELITE'?90:28)+level*11;this.hp=this.maxHp;
    this.speed=Math.min(3.35,(Math.random()*1.05+.75)+Math.sqrt(L)*.045);
    this.timer=45+Math.random()*90;this.color=type==='ELITE'?'#ffcc00':'#ff1768';
    this.phase=Math.random()*Math.PI*2;this.drift=(Math.random()*.55+.25)*(Math.random()<.5?-1:1);this.dead=false;
  }
  update(w,h){
    this.phase+=.025;this.y+=this.speed;this.x+=Math.sin(this.phase)*.55+this.drift*.16;
    if(this.x<this.size){this.x=this.size;this.drift=Math.abs(this.drift)}
    if(this.x>w-this.size){this.x=w-this.size;this.drift=-Math.abs(this.drift)}
    this.timer--;if(this.y>h+this.size)this.dead=true;
  }
  canShoot(){if(this.timer<=0&&this.y>20){this.timer=65+Math.random()*100;return true}return false}
  draw(c){c.save();c.translate(this.x,this.y);c.rotate(Math.sin(this.phase)*.08);c.fillStyle=this.color;c.strokeStyle=this.color;c.shadowBlur=10;c.shadowColor=this.color;c.beginPath();c.moveTo(0,this.size/2);c.lineTo(-this.size/2,-this.size/3);c.lineTo(0,-this.size/6);c.lineTo(this.size/2,-this.size/3);c.closePath();c.fill();c.stroke();if(this.type==='ELITE'){c.strokeStyle='#fff';c.beginPath();c.arc(0,0,this.size*.32,0,Math.PI*2);c.stroke()}c.restore()}
}
class Boss{
  constructor(w,level){this.level=level;this.def=BOSS_TYPES[(Math.floor(level/5)-1)%BOSS_TYPES.length];this.x=w/2;this.y=-130;this.targetY=105;this.vx=2.2+Math.min(2,level*.015);this.phase=0;this.timer=45;this.specialTimer=120;this.enraged=false;this.maxHp=Math.round(1400+level*650+level*level*12);this.hp=this.maxHp;this.size=92+Math.min(35,level*.22)}
  update(w,game){if(this.y<this.targetY){this.y+=2.5;return}this.phase+=.035;this.x+=this.vx;if(this.x<this.size||this.x>w-this.size)this.vx*=-1;this.timer--;this.specialTimer--;if(this.hp<this.maxHp*.35&&!this.enraged){this.enraged=true;game.addText(this.x,this.y-80,'ENRAGED', '#ff0055',1.2);game.toast('BOSS ENRAGED — ATTACK PATTERN CHANGED');}if(this.timer<=0){this.timer=Math.max(14,42-Math.floor(this.level/8));this.fire(game)}if(this.specialTimer<=0){this.specialTimer=Math.max(70,145-Math.floor(this.level*.35));this.special(game)}}
  fire(game){const p=this.def.pattern%6;const d=16+this.level*.7;if(p===0){[-1,0,1].forEach(v=>game.enemyBullet(this.x+v*28,this.y+45,v*1.4,6,this.def.color,d))}else if(p===1){for(let i=0;i<6;i++){const a=i*Math.PI/3+this.phase;game.enemyBullet(this.x,this.y,Math.cos(a)*3,Math.sin(a)*3+2,this.def.color,d)}}else if(p===2){[-2,-1,0,1,2].forEach(v=>game.enemyBullet(this.x,this.y, v*1.2,6,this.def.color,d))}else if(p===3){for(let i=0;i<10;i++){const a=i*Math.PI/5+this.phase;game.enemyBullet(this.x,this.y,Math.cos(a)*4,Math.sin(a)*4,this.def.color,d)}}else if(p===4){for(let i=-2;i<=2;i++)game.enemyBullet(this.x+i*24,this.y+35,0,5,this.def.color,d,3,.025)}else{for(let i=0;i<7;i++)game.enemyBullet(this.x+(i-3)*22,this.y+40,(i-3)*.8,5.5,this.def.color,d)}}
  special(game){const d=25+this.level;const pattern=this.def.pattern%8;if(pattern===0||pattern===5){for(let i=0;i<12;i++){const a=i*Math.PI/6;game.enemyBullet(this.x,this.y,Math.cos(a)*5,Math.sin(a)*5,this.def.color,d,3,.01)}}else if(pattern===1){for(let i=0;i<4;i++)game.enemyBullet(Math.random()*game.canvas.width,0,0,5.5,this.def.color,d,5,.02)}else if(pattern===2){for(let i=0;i<5;i++)game.enemyBullet(this.x+(i-2)*30,this.y+50,(i-2)*1.7,7,this.def.color,d)}else if(pattern===3){for(let i=0;i<16;i++){const a=i*Math.PI/8;game.enemyBullet(this.x,this.y,Math.cos(a)*6,Math.sin(a)*6,this.def.color,d)}}else if(pattern===4){for(let i=0;i<3;i++)game.enemyBullet(this.x+(Math.random()-.5)*80,this.y+40,0,6,this.def.color,d,5,.04)}else if(pattern===6){for(let i=0;i<8;i++)game.enemyBullet(this.x,this.y,Math.cos(i)*4,4+i*.35,this.def.color,d,4,.015)}else{for(let i=0;i<8;i++){const a=i*Math.PI/4+this.phase;game.enemyBullet(this.x,this.y,Math.cos(a)*7,Math.sin(a)*7,this.def.color,d)}}game.addText(this.x,this.y+75,this.def.power,this.def.color,.75);game.audio.laser(true)}
  draw(c){c.save();c.translate(this.x,this.y);c.rotate(Math.sin(this.phase)*.05);c.strokeStyle=this.def.color;c.fillStyle=this.def.color;c.shadowBlur=28;c.shadowColor=this.def.color;c.lineWidth=3;const s=this.size;const sh=this.def.shape;c.beginPath();
    if(sh==='circle'||sh==='singularity'||sh==='blackstar'){c.arc(0,0,s*.7,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='#fff';c.beginPath();c.arc(0,0,s*.38,0,Math.PI*2);c.stroke()}
    else if(sh==='diamond'||sh==='eclipse'){c.moveTo(0,-s);c.lineTo(s*.75,0);c.lineTo(0,s);c.lineTo(-s*.75,0);c.closePath();c.fill();c.stroke();c.strokeStyle='#fff';c.beginPath();c.arc(0,0,s*.35,0,Math.PI*2);c.stroke()}
    else if(sh==='sun'||sh==='seraph'){for(let i=0;i<12;i++){const a=i*Math.PI/6;c.moveTo(Math.cos(a)*s*.45,Math.sin(a)*s*.45);c.lineTo(Math.cos(a)*s,Math.sin(a)*s)}c.stroke();c.beginPath();c.arc(0,0,s*.5,0,Math.PI*2);c.fill()}
    else if(sh==='mantis'||sh==='hydra'||sh==='dragon'||sh==='wyrm'){c.moveTo(0,-s);c.lineTo(s*.95,-s*.15);c.lineTo(s*.45,s*.7);c.lineTo(0,s*.35);c.lineTo(-s*.45,s*.7);c.lineTo(-s*.95,-s*.15);c.closePath();c.fill();c.stroke();c.strokeStyle='#fff';c.beginPath();c.moveTo(-s*.45,0);c.lineTo(-s*1.15,s*.35);c.moveTo(s*.45,0);c.lineTo(s*1.15,s*.35);c.stroke()}
    else if(sh==='fortress'||sh==='juggernaut'||sh==='titan'){c.rect(-s*.85,-s*.55,s*1.7,s*1.1);c.fill();c.stroke();c.strokeStyle='#fff';c.beginPath();c.rect(-s*.45,-s*.3,s*.9,s*.6);c.stroke()}
    else {c.moveTo(0,-s);c.lineTo(s*.8,s*.5);c.lineTo(s*.3,s*.35);c.lineTo(0,s);c.lineTo(-s*.3,s*.35);c.lineTo(-s*.8,s*.5);c.closePath();c.fill();c.stroke()}
    c.restore()}
}

class Player{
  constructor(w,h,up,ship){this.config=ship;this.width=46;this.height=46;this.x=w/2;this.y=h-105;this.vx=0;this.vy=0;this.speed=ship.speed+up.speed*.32;this.maxHp=ship.hp+up.hull*13;this.hp=this.maxHp;this.maxShield=ship.shield+(up.shield-1)*30;this.shield=this.maxShield;this.maxEnergy=ship.energy+(up.energy-1)*9;this.energy=this.maxEnergy;this.damage=ship.damage*(1+up.damage*.11);this.fireRate=Math.max(2,10-(up.fireRate-1)*.22);this.crit=Math.min(.6,.03+up.crit*.025);this.magnet=65+up.magnet*14;this.armor=Math.min(.4,(up.armor-1)*.0125);this.regen=.015+(up.regen-1)*.012;this.pierce=Math.max(0,Math.floor((up.pierce-1)/5));this.fireCooldown=0;this.specialCooldown=0;this.hitInvuln=0;this.active={}}
  update(keys,touch,w,h){if(touch){this.x+=(touch.x-this.x)*.18;this.y+=(touch.y-this.y)*.18}else{let dx=0,dy=0;if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;const m=Math.hypot(dx,dy)||1;this.vx=dx/m*this.speed;this.vy=dy/m*this.speed;if(!dx)this.vx*=.82;if(!dy)this.vy*=.82;this.x+=this.vx;this.y+=this.vy}this.x=Math.max(30,Math.min(w-30,this.x));this.y=Math.max(45,Math.min(h-50,this.y));if(this.fireCooldown>0)this.fireCooldown--;if(this.specialCooldown>0)this.specialCooldown--;if(this.hitInvuln>0)this.hitInvuln--;this.energy=Math.min(this.maxEnergy,this.energy+.06);/* Hull is not passively regenerated during combat. */for(const k of Object.keys(this.active)){this.active[k]--;if(this.active[k]<=0)delete this.active[k]}}
  draw(c){
    // Chrome-safe renderer: reset the canvas state before drawing the player so
    // filters/transforms from other entities can never make the ship invisible.
    c.save();
    c.setTransform(1,0,0,1,0,0);
    c.globalAlpha=1;
    c.globalCompositeOperation='source-over';
    c.translate(this.x,this.y);
    c.rotate(Math.max(-.35,Math.min(.35,this.vx*.035)));
    const col=this.config.color || '#00f0ff';
    const shape=this.config.shape || 'viper';

    // Bright outer silhouette (always visible even when canvas shadows are disabled).
    c.shadowBlur=0;
    c.fillStyle='rgba(2,8,18,.96)';
    c.strokeStyle=col;
    c.lineWidth=4;
    c.lineJoin='round';
    c.beginPath();
    this.shipPath(c,shape);
    c.fill();
    c.stroke();

    // Inner energy frame.
    c.strokeStyle='#ffffff';
    c.lineWidth=1.5;
    c.beginPath();
    this.corePath(c,shape);
    c.stroke();

    // Reactor core.
    c.fillStyle=col;
    c.beginPath();
    c.arc(0,3,5,0,Math.PI*2);
    c.fill();

    // Engine flame.
    c.fillStyle='#ffffff';
    c.beginPath();
    c.moveTo(-7,19);
    c.lineTo(0,38+Math.random()*8);
    c.lineTo(7,19);
    c.closePath();
    c.fill();
    c.fillStyle=col;
    c.beginPath();
    c.moveTo(-4,20);
    c.lineTo(0,34+Math.random()*6);
    c.lineTo(4,20);
    c.closePath();
    c.fill();

    // Shield ring.
    if(this.shield>0){
      c.strokeStyle=`rgba(0,240,255,${Math.max(.2,Math.min(.8,.2+.55*this.shield/this.maxShield))})`;
      c.lineWidth=2;
      c.beginPath();
      c.arc(0,0,32,0,Math.PI*2);
      c.stroke();
    }
    c.restore();
  }
  shipPath(c,s){if(s==='titan'||s==='aegis'){c.moveTo(0,-28);c.lineTo(24,8);c.lineTo(18,24);c.lineTo(0,16);c.lineTo(-18,24);c.lineTo(-24,8);c.closePath()}else if(s==='phantom'||s==='wraith'){c.moveTo(0,-28);c.lineTo(28,22);c.lineTo(0,13);c.lineTo(-28,22);c.closePath()}else if(s==='solaris'||s==='nova'){c.moveTo(0,-30);c.lineTo(10,-4);c.lineTo(28,10);c.lineTo(10,12);c.lineTo(0,25);c.lineTo(-10,12);c.lineTo(-28,10);c.lineTo(-10,-4);c.closePath()}else if(s==='omega'||s==='quasar'){c.moveTo(0,-31);c.lineTo(26,17);c.lineTo(10,11);c.lineTo(0,27);c.lineTo(-10,11);c.lineTo(-26,17);c.closePath()}else{c.moveTo(0,-30);c.lineTo(24,22);c.lineTo(0,12);c.lineTo(-24,22);c.closePath()}}
  corePath(c,s){if(s==='quasar'){c.moveTo(-16,8);c.lineTo(0,-17);c.lineTo(16,8);c.moveTo(0,-4);c.lineTo(0,17)}else{c.moveTo(0,-19);c.lineTo(0,15);c.moveTo(-12,11);c.lineTo(0,5);c.lineTo(12,11)}}
}

class GameEngine{
  constructor(){this.canvas=document.getElementById('gameCanvas');this.ctx=this.canvas.getContext('2d');this.audio=new AudioFX();this.state=GAME.MENU;this.keys={};this.touch=null;this.pointerFire=false;this.level=1;this.wave=1;this.wavesPerLevel=4;this.gameMode='ENDLESS';this.selectedStartLevel=1;this.score=0;this.coins=Number(localStorage.getItem('nebula_coins')||0);this.bestScore=Number(localStorage.getItem('nebula_best_score')||0);this.bestStage=Number(localStorage.getItem('nebula_best_stage')||1);this.bossesDefeated=0;this.combo=1;this.bestCombo=1;this.comboTimer=0;this.upgrades=this.load('nebula_upgrades',{damage:1,fireRate:1,shield:1,hull:1,speed:1,crit:1,energy:1,magnet:1,armor:1,regen:1,pierce:1});this.unlockedShips=this.load('nebula_ships',['VIPER']);this.selectedShip=localStorage.getItem('nebula_selected_ship')||'VIPER';if(!this.unlockedShips.includes('VIPER'))this.unlockedShips.unshift('VIPER');this.player=null;this.enemies=[];this.bullets=[];this.powerUps=[];this.particles=[];this.texts=[];this.boss=null;this.maxParticles=700;this.transition=false;this.damageCooldown=0;this.damageFlash=0;this.backgroundIndex=0;this.stars=[];this.resize();this.lastTime=0;this.accumulator=0;this.bind();this.renderShips();this.renderUpgrades();this.updateMenu();requestAnimationFrame(t=>this.loop(t))}
  load(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
  save(){localStorage.setItem('nebula_coins',String(this.coins));localStorage.setItem('nebula_upgrades',JSON.stringify(this.upgrades));localStorage.setItem('nebula_ships',JSON.stringify(this.unlockedShips));localStorage.setItem('nebula_selected_ship',this.selectedShip);localStorage.setItem('nebula_best_score',String(this.bestScore));localStorage.setItem('nebula_best_stage',String(this.bestStage))}
  resize(){const oldW=this.canvas.width||window.innerWidth,oldH=this.canvas.height||window.innerHeight;this.canvas.width=Math.max(320,window.innerWidth);this.canvas.height=Math.max(480,window.innerHeight);if(!this.stars.length){this.stars=Array.from({length:180},()=>({x:Math.random()*this.canvas.width,y:Math.random()*this.canvas.height,z:Math.random()*1.8+.2,s:Math.random()*1.6+.2}))}else{const sx=this.canvas.width/oldW,sy=this.canvas.height/oldH;for(const star of this.stars){star.x=Math.max(0,Math.min(this.canvas.width,star.x*sx));star.y=Math.max(0,Math.min(this.canvas.height,star.y*sy))}}}
  bind(){window.addEventListener('resize',()=>this.resize());window.addEventListener('keydown',e=>{this.keys[e.key]=true;if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();if(!e.repeat&&(e.key==='p'||e.key==='P'))this.togglePause();if(!e.repeat&&(e.key==='e'||e.key==='E'))this.useSpecial()});window.addEventListener('keyup',e=>this.keys[e.key]=false);const move=e=>{if(this.state===GAME.PLAYING&&e.touches[0])this.touch={x:e.touches[0].clientX,y:e.touches[0].clientY}};this.canvas.addEventListener('touchstart',move,{passive:true});this.canvas.addEventListener('touchmove',move,{passive:true});this.canvas.addEventListener('touchend',()=>this.touch=null);this.canvas.addEventListener('pointerdown',e=>{if(this.state===GAME.PLAYING){this.audio.init();this.pointerFire=true}});this.canvas.addEventListener('pointerup',()=>this.pointerFire=false);this.canvas.addEventListener('pointercancel',()=>this.pointerFire=false);document.getElementById('startBtn').onclick=()=>{this.audio.init();this.startGame(1,'ENDLESS')};document.getElementById('levelSelectBtn').onclick=()=>this.openLevelSelect();document.getElementById('levelPageGo').onclick=()=>this.renderLevelSelect();document.getElementById('levelPage').onchange=()=>this.renderLevelSelect();document.getElementById('prevLevelPage').onclick=()=>this.changeLevelPage(-1);document.getElementById('nextLevelPage').onclick=()=>this.changeLevelPage(1);document.getElementById('pauseBtn').onclick=()=>this.togglePause();document.getElementById('closeLevelSelectBtn').onclick=()=>this.toMenu();document.getElementById('restartBtn').onclick=()=>{this.audio.init();this.startGame(this.selectedStartLevel,this.gameMode)};document.getElementById('nextLevelBtn').onclick=()=>this.startNextLevel();document.getElementById('menuBtn').onclick=()=>this.toMenu();document.getElementById('upgradeBtn').onclick=()=>this.openHangar();document.getElementById('closeHangarBtn').onclick=()=>this.toMenu();document.getElementById('resumeBtn').onclick=()=>this.togglePause();document.getElementById('resetBtn').onclick=()=>{if(confirm('Reset all progress?')){localStorage.clear();location.reload()}};document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>this.switchTab(t.dataset.tab))}
  switchTab(tab){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));document.getElementById('shipsTab').classList.toggle('hidden',tab!=='ships');document.getElementById('upgradesTab').classList.toggle('hidden',tab!=='upgrades')}
  openLevelSelect(){document.getElementById('mainMenu').classList.add('hidden');document.getElementById('upgradeMenu').classList.add('hidden');document.getElementById('levelSelectMenu').classList.remove('hidden');this.renderLevelSelect()}
  changeLevelPage(delta){const el=document.getElementById('levelPage');const page=Math.max(1,Math.min(100,(Number(el.value)||1)+delta));el.value=page;this.renderLevelSelect()}
  renderLevelSelect(){const grid=document.getElementById('levelGrid');const page=Math.max(1,Math.min(100,Number(document.getElementById('levelPage')?.value||1)));document.getElementById('levelPage').value=page;const start=(page-1)*100+1;const end=Math.min(MAX_LEVEL,start+99);grid.innerHTML='';const frag=document.createDocumentFragment();for(let i=start;i<=end;i++){const b=document.createElement('button');b.className='level-btn'+(i%5===0?' boss':'');b.innerHTML=`LEVEL ${i}<span>${i%5===0?'BOSS SECTOR':'SECTOR'}</span>`;b.onclick=()=>{this.audio.init();this.selectedStartLevel=i;this.startGame(i,'SELECTED')};frag.appendChild(b)}grid.appendChild(frag);const info=document.getElementById('levelPageInfo');if(info)info.textContent=`LEVELS ${start.toLocaleString()}–${end.toLocaleString()} / ${MAX_LEVEL.toLocaleString()}`;}
  openHangar(){document.getElementById('mainMenu').classList.add('hidden');document.getElementById('upgradeMenu').classList.remove('hidden');this.renderShips();this.renderUpgrades()}
  toMenu(){clearTimeout(this.bannerTimer);clearTimeout(this.toastTimer);clearTimeout(this.transitionTimer);this.transition=false;this.state=GAME.MENU;document.getElementById('hud').classList.add('hidden');document.getElementById('levelSelectMenu').classList.add('hidden');document.getElementById('gameOverMenu').classList.add('hidden');document.getElementById('pauseOverlay').classList.add('hidden');document.getElementById('upgradeMenu').classList.add('hidden');document.getElementById('mainMenu').classList.remove('hidden');this.updateMenu()}
  shipSVG(s){const paths={viper:'M50 2 L89 68 L50 53 L11 68 Z',aegis:'M50 4 L88 55 L70 72 L50 61 L30 72 L12 55 Z',phantom:'M50 3 L95 68 L50 54 L5 68 Z',spectre:'M50 2 L82 20 L94 65 L50 50 L6 65 L18 20 Z',titan:'M50 2 L94 55 L72 76 L50 62 L28 76 L6 55 Z',wraith:'M50 2 L98 70 L50 52 L2 70 Z',solaris:'M50 2 L66 30 L94 45 L65 49 L50 75 L35 49 L6 45 L34 30 Z',omega:'M50 2 L91 61 L63 52 L50 77 L37 52 L9 61 Z',nova:'M50 2 L72 25 L98 38 L68 48 L50 78 L32 48 L2 38 L28 25 Z',quasar:'M50 2 L96 58 L65 51 L50 78 L35 51 L4 58 Z',arrow:'M50 1 L91 73 L50 57 L9 73 Z',trident:'M50 2 L50 30 L88 72 L60 58 L50 78 L40 58 L12 72 L50 30 Z',wing:'M50 4 L98 30 L68 38 L88 72 L50 54 L12 72 L32 38 L2 30 Z',scythe:'M50 2 Q92 10 88 64 L60 46 L50 78 L42 46 L12 64 Q8 10 50 2 Z',orbital:'M50 2 C82 2 98 22 88 40 C78 58 22 58 12 40 C2 22 18 2 50 2 Z',sting:'M50 1 L72 36 L58 44 L50 79 L42 44 L28 36 Z',diamond:'M50 2 L96 40 L50 78 L4 40 Z',crescent:'M72 3 Q18 18 28 58 Q35 77 62 73 Q38 53 44 31 Q50 12 72 3 Z',splitter:'M50 2 L63 33 L94 72 L58 53 L50 79 L42 53 L6 72 L37 33 Z',blade:'M50 2 L84 76 L50 57 L16 76 Z',hammer:'M18 5 L82 5 L72 35 L60 35 L60 76 L40 76 L40 35 L28 35 Z',ray:'M50 1 L68 28 L94 50 L64 49 L50 79 L36 49 L6 50 L32 28 Z',halo:'M50 3 A34 34 0 1 1 49.9 3 M50 22 L74 70 L50 57 L26 70 Z',falcon:'M50 2 L97 55 L68 48 L50 77 L32 48 L3 55 Z',mantis:'M50 2 L70 30 L98 62 L62 48 L50 78 L38 48 L2 62 L30 30 Z',spear:'M50 1 L68 72 L50 56 L32 72 Z',shield:'M50 2 L92 25 L82 62 L50 78 L18 62 L8 25 Z',comet:'M80 4 L97 22 L62 34 L88 55 L50 78 L55 48 L22 62 L40 36 L5 29 L45 20 Z',cross:'M38 2 L62 2 L62 30 L91 30 L91 52 L62 52 L62 78 L38 78 L38 52 L9 52 L9 30 L38 30 Z',xwing:'M50 2 L61 30 L96 8 L72 40 L96 72 L61 50 L50 78 L39 50 L4 72 L28 40 L4 8 L39 30 Z',serpent:'M50 2 Q82 16 70 39 Q58 62 94 76 Q52 78 50 48 Q48 78 6 76 Q42 62 30 39 Q18 16 50 2 Z'};const d=paths[s.shape]||paths.viper;return `<svg viewBox="0 0 100 80" aria-hidden="true"><path d="${d}" fill="rgba(0,0,0,.82)" stroke="${s.color}" stroke-width="3" stroke-linejoin="round"/><path d="M50 15 L50 62 M27 54 L50 43 L73 54" stroke="#fff" stroke-width="2"/><circle cx="50" cy="42" r="5" fill="${s.color}"/></svg>`}
  renderShips(){const c=document.getElementById('shipCards');c.innerHTML='';Object.values(SHIPS).forEach(s=>{const unlocked=this.unlockedShips.includes(s.id),selected=this.selectedShip===s.id;const el=document.createElement('article');el.className=`ship-card ${selected?'selected':''}`;el.innerHTML=`<div class="ship-art" style="--ship:${s.color}">${this.shipSVG(s)}</div><h3 style="color:${s.color}">${s.name}</h3><p>${s.desc}</p><div class="ship-stats">SPD ${s.speed.toFixed(1)} · HP ${Math.round(s.hp)} · DMG ${Math.round(s.damage)}<br><strong>${s.special}</strong></div><button class="btn mini ${selected?'primary':''}">${unlocked?(selected?'EQUIPPED':'EQUIP'):`UNLOCK ${s.cost.toLocaleString()}`}</button>`;el.querySelector('button').onclick=()=>unlocked?this.selectShip(s.id):this.buyShip(s.id);c.appendChild(el)})}

  renderUpgrades(){const c=document.getElementById('upgradesGrid');c.innerHTML='';for(const [key,m] of Object.entries(UPGRADE_META)){const lvl=this.upgrades[key]||1,cost=m.base*lvl,max=lvl>=m.max;const el=document.createElement('article');el.className='upgrade-card';el.innerHTML=`<div class="upgrade-icon">${m.icon}</div><div class="upgrade-info"><h3>${m.name}</h3><p>${m.desc}</p><span>LEVEL ${lvl} / ${m.max}</span></div><button class="btn mini" ${max?'disabled':''}>${max?'MAX':`UPGRADE ${cost.toLocaleString()}`}</button>`;el.querySelector('button').onclick=()=>this.buyUpgrade(key);c.appendChild(el)}document.getElementById('shopCoins').textContent=this.coins.toLocaleString()}
  buyShip(id){const s=SHIPS[id];if(!s||this.unlockedShips.includes(id)||this.coins<s.cost)return;this.coins-=s.cost;this.unlockedShips.push(id);this.selectedShip=id;this.save();this.renderShips();this.renderUpgrades();this.toast(`${s.name.toUpperCase()} ONLINE`)}
  selectShip(id){if(!this.unlockedShips.includes(id))return;this.selectedShip=id;this.save();this.renderShips();this.toast(`${SHIPS[id].name.toUpperCase()} EQUIPPED`)}
  buyUpgrade(k){const m=UPGRADE_META[k],lvl=this.upgrades[k]||1;if(lvl>=m.max)return;const cost=m.base*lvl;if(this.coins<cost)return;this.coins-=cost;this.upgrades[k]=lvl+1;this.save();this.renderUpgrades();this.toast(`${m.name.toUpperCase()} LV ${lvl+1}`)}
  updateMenu(){document.getElementById('bestScore').textContent=this.bestScore.toLocaleString();document.getElementById('bestStage').textContent=`${this.bestStage} / ${MAX_LEVEL}`;document.getElementById('fleetCount').textContent=`${this.unlockedShips.length} / ${Object.keys(SHIPS).length}`;document.getElementById('shopCoins').textContent=this.coins.toLocaleString()}
  startGame(startLevel=1,mode='ENDLESS'){this.audio.init();this.state=GAME.PLAYING;this.gameMode=mode;this.selectedStartLevel=Math.max(1,Math.min(MAX_LEVEL,Number(startLevel)||1));this.level=this.selectedStartLevel;this.wave=1;this.score=0;this.combo=1;this.bestCombo=1;this.comboTimer=0;this.bossesDefeated=0;this.transition=false;this.backgroundIndex=0;this.player=new Player(this.canvas.width,this.canvas.height,this.upgrades,SHIPS[this.selectedShip]||SHIPS.VIPER);this.enemies=[];this.bullets=[];this.powerUps=[];this.particles=[];this.texts=[];this.boss=null;document.getElementById('mainMenu').classList.add('hidden');document.getElementById('upgradeMenu').classList.add('hidden');document.getElementById('levelSelectMenu').classList.add('hidden');document.getElementById('gameOverMenu').classList.add('hidden');document.getElementById('pauseOverlay').classList.add('hidden');document.getElementById('hud').classList.remove('hidden');this.spawnLevel()}
  spawnLevel(){if(this.state!==GAME.PLAYING||this.transition)return;this.backgroundIndex=(this.level-1)%BACKGROUNDS.length;this.wave=1;this.boss=null;this.enemies=[];this.bullets=this.bullets.filter(b=>!b.isEnemy);document.getElementById('bossHpContainer').classList.add('hidden');this.showLevelBanner(`LEVEL ${this.level} / ${MAX_LEVEL} · ${BACKGROUNDS[this.backgroundIndex][0]}`);this.spawnWave()}
  spawnWave(){if(this.state!==GAME.PLAYING||this.transition)return;this.enemies=[];if(this.level%5===0){this.boss=new Boss(this.canvas.width,this.level);document.getElementById('bossName').textContent=`${this.boss.def.name} // LV ${this.level}`;document.getElementById('bossPowerText').textContent=this.boss.def.power;document.getElementById('bossHpContainer').classList.remove('hidden');this.addText(this.canvas.width/2,this.canvas.height*.32,'BOSS DETECTED',this.boss.def.color,1.4);this.audio.boom(true);return}const count=Math.min(24,5+this.wave*2+Math.floor(Math.sqrt(this.level)*.8));for(let i=0;i<count;i++){const elite=Math.random()<Math.min(.45,.10+this.level*.003);this.enemies.push(new Enemy(Math.random()*(this.canvas.width-100)+50,-80-i*42-Math.random()*80,this.level,elite?'ELITE':'STANDARD'))}}
  nextWave(){if(this.transition||this.state!==GAME.PLAYING)return;this.wave++;if(this.wave>this.wavesPerLevel){this.completeLevel()}else{this.spawnWave()}}
  completeLevel(){if(this.gameMode==='SELECTED'){this.transition=false;this.levelCompleteSelected();return}if(this.level>=MAX_LEVEL){this.victory();return}this.transition=true;this.score+=this.level*500;this.coins+=40+this.level*8;this.level++;this.bestStage=Math.max(this.bestStage,this.level);this.save();this.addText(this.canvas.width/2,this.canvas.height*.5,`LEVEL ${this.level} UNLOCKED`,'#00ff9d',1.35);this.transitionTimer=setTimeout(()=>{if(this.state===GAME.PLAYING){this.transition=false;this.spawnLevel()}},1400)}
  levelCompleteSelected(){this.score+=this.level*500;this.coins+=40+this.level*8;this.bestStage=Math.max(this.bestStage,this.level);this.bestScore=Math.max(this.bestScore,this.score);this.save();this.state=GAME.GAMEOVER;document.getElementById('gameOverTitle').textContent=`LEVEL ${this.level} CLEARED`;document.getElementById('gameOverReason').textContent=`SECTOR ${this.level} COMPLETE — CHOOSE ANOTHER LEVEL OR REDEPLOY.`;this.fillGameOver();document.getElementById('nextLevelBtn').classList.toggle('hidden',this.level>=MAX_LEVEL);document.getElementById('hud').classList.add('hidden');document.getElementById('bossHpContainer').classList.add('hidden');document.getElementById('gameOverMenu').classList.remove('hidden')}
  startNextLevel(){if(this.state!==GAME.GAMEOVER||this.level>=MAX_LEVEL)return;this.audio.init();this.selectedStartLevel=this.level+1;this.startGame(this.selectedStartLevel,'SELECTED')}
  victory(){this.state=GAME.GAMEOVER;this.bestScore=Math.max(this.bestScore,this.score);this.bestStage=MAX_LEVEL;this.save();document.getElementById('gameOverTitle').textContent='FRONTIER CONQUERED';document.getElementById('gameOverReason').textContent=`LEVEL ${MAX_LEVEL} COMPLETE — THE HYPERION FRONTIER IS YOURS.`;this.fillGameOver();document.getElementById('nextLevelBtn').classList.add('hidden');document.getElementById('hud').classList.add('hidden');document.getElementById('gameOverMenu').classList.remove('hidden')}
  enemyBullet(x,y,vx,vy,color,dmg,radius=4,homing=0,style=0){const enemyCount=this.bullets.reduce((n,b)=>n+(b.isEnemy?1:0),0);if(enemyCount>=90)return;this.bullets.push(new Bullet(x,y,vx,vy,color,true,dmg,radius,homing,style));if(enemyCount<55)this.audio.laser(true,style)}
  fire(){const p=this.player;if(!p||p.fireCooldown>0)return;if(this.bullets.length>240)return;const w=p.config.weapon||0;const mult=p.active.BOOST?2.4:1;const rapid=p.active.RAPID?Math.max(2,p.fireRate*.45):p.fireRate;p.fireCooldown=rapid;const shots=2+(p.active.QUAD?2:p.active.TRIPLE?1:0);for(let i=0;i<shots;i++){const center=(shots-1)/2;const spread=i-center;let x=p.x+spread*13,y=p.y-22,vx=0,vy=-14,r=3.7,d=p.damage*mult,style=w;switch(w){case 0:vx=spread*.45;vy=-15;r=3.4;break;case 1:vx=spread*.2;vy=-12;r=5;break;case 2:vx=spread*1.5;vy=-16;r=2.8;break;case 3:vx=spread*.7;vy=-13;r=4.2;break;case 4:vx=spread*.25;vy=-10;r=6;d*=1.35;break;case 5:vx=spread*1.1;vy=-14;r=4.5;break;case 6:vx=spread*2;vy=-13;r=3.2;break;case 7:vx=spread*.55;vy=-17;r=4;break;case 8:vx=spread*1.25;vy=-14;r=5;break;case 9:vx=spread*.35;vy=-18;r=3.5;d*=1.2;break;case 10:vx=spread*2.2;vy=-12;r=4.8;break;case 11:vx=spread*.8;vy=-15;r=5.2;break;case 12:vx=spread*1.8;vy=-13;r=3;break;case 13:vx=spread*.3;vy=-16;r=4.5;break;case 14:vx=spread*1.35;vy=-14;r=3.8;break;default:vx=spread*.65;vy=-15;r=4.2;d*=1.15;break}this.bullets.push(new Bullet(x,y,vx,vy,p.config.color,false,d,r,0,style,p.pierce))}this.audio.laser(false,w)}
  useSpecial(){const p=this.player;if(this.state!==GAME.PLAYING||!p||p.specialCooldown>0||p.energy<35)return;p.energy-=35;p.specialCooldown=100;this.audio.special();this.addText(p.x,p.y-45,p.config.special,p.config.color,1.05);if(p.config.id==='AEGIS'){p.shield=p.maxShield;p.active.SHIELD=240;this.bullets=this.bullets.filter(b=>!b.isEnemy)}else if(p.config.id==='PHANTOM'){p.active.RAPID=330;p.active.TRIPLE=330}else if(p.config.id==='SPECTRE'){p.active.BEAM=250;this.bullets.push(new Bullet(p.x,p.y-20,0,-24,'#00ffcc',false,p.damage*7,11))}else if(p.config.id==='TITAN'){for(const e of this.enemies)e.hp-=p.damage*5;if(this.boss)this.boss.hp-=p.damage*7;this.shockwave(p.x,p.y,p.config.color)}else if(p.config.id==='WRAITH'){const gain=(this.enemies.length*5)+(this.boss?120:0);p.hp=Math.min(p.maxHp,p.hp+gain);p.shield=Math.min(p.maxShield,p.shield+gain)}else if(p.config.id==='SOLARIS'||p.config.id==='NOVA'){for(let i=0;i<24;i++){const a=i*Math.PI/12;this.bullets.push(new Bullet(p.x,p.y,Math.cos(a)*7,Math.sin(a)*7,p.config.color,false,p.damage*2.5,5))}}else if(p.config.id==='OMEGA'){this.triggerBomb(true);if(this.boss)this.boss.hp-=p.damage*15}else if(p.config.id==='QUASAR'){this.activeNova();if(this.boss)this.boss.hp-=p.damage*20}else{for(let i=-4;i<=4;i++)this.bullets.push(new Bullet(p.x,p.y-15,i*1.8,-16,p.config.color,false,p.damage*3,5))}}
  activeNova(){for(let i=0;i<40;i++){const a=i*Math.PI*2/40;this.bullets.push(new Bullet(this.player.x,this.player.y,Math.cos(a)*8,Math.sin(a)*8,'#8affff',false,this.player.damage*2.5,5))}for(const e of this.enemies)e.hp-=this.player.damage*4;this.shockwave(this.player.x,this.player.y,'#8affff')}
  shockwave(x,y,color){for(let i=0;i<35;i++)this.particles.push(new Particle(x,y,color,12,Math.random()*4+1,.9))}
  triggerBomb(mega=false){for(let i=this.enemies.length-1;i>=0;i--){const e=this.enemies[i];this.explode(e.x,e.y,e.color,8);this.score+=Math.round(120*this.combo);this.coins+=5;this.enemies.splice(i,1)}if(this.boss)this.boss.hp-=this.boss.maxHp*(mega?.2:.08);this.addText(this.canvas.width/2,this.canvas.height*.45,mega?'OMEGA NOVA':'CLUSTER BOMB','#fff',1.25)}
  applyDamage(amount){
    const p=this.player;
    if(!p || this.state!==GAME.PLAYING) return;
    if(p.hitInvuln>0) return;
    const damage=Math.max(1,Number(amount)||1)*Math.max(.25,1-(p.armor||0));
    const shieldBefore=p.shield;
    const shieldHit=Math.min(p.shield,damage);
    p.shield=Math.max(0,p.shield-shieldHit);
    const hullHit=Math.max(1,damage-shieldHit);
    p.hp=Math.max(0,p.hp-hullHit);
    p.hitInvuln=5;
    this.damageFlash=10;
    this.addText(p.x,p.y-42,`-${Math.ceil(hullHit)} HP`,'#ff3b6b',1);
    this.explode(p.x,p.y,'#ff1768',6);
    this.updateHUD();
    if(p.hp<=0)this.gameOver();
}
  explode(x,y,color,count=16,big=false){const room=Math.max(0,this.maxParticles-this.particles.length);const n=Math.min(count,room);for(let i=0;i<n;i++)this.particles.push(new Particle(x,y,color,big?15:9,Math.random()*3+1,big?1.1:1));this.audio.boom(big)}
  addText(x,y,t,c='#fff',s=1){this.texts.push(new FloatText(x,y,t,c,s))}
  toast(t){const el=document.getElementById('toast');el.textContent=t;el.classList.remove('hidden');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>el.classList.add('hidden'),1800)}
  showLevelBanner(t){const el=document.getElementById('levelBanner');el.textContent=t;el.classList.remove('hidden');clearTimeout(this.bannerTimer);this.bannerTimer=setTimeout(()=>el.classList.add('hidden'),1500)}
  update(){if(this.state!==GAME.PLAYING)return;if(this.damageCooldown>0)this.damageCooldown--;if(this.damageFlash>0)this.damageFlash--;const p=this.player;p.update(this.keys,this.touch,this.canvas.width,this.canvas.height);if((this.keys[' ']||this.touch||this.pointerFire)&&!this.transition)this.fire();if(this.keys['e']||this.keys['E']){this.keys['e']=false;this.keys['E']=false;this.useSpecial()}
    for(const b of this.bullets){b.update(p);if(b.hitCooldown>0)b.hitCooldown--;}this.bullets=this.bullets.filter(b=>b.x>-60&&b.x<this.canvas.width+60&&b.y>-80&&b.y<this.canvas.height+80);
    if(this.comboTimer>0)this.comboTimer--;else this.combo=Math.max(1,this.combo-.01);this.bestCombo=Math.max(this.bestCombo,this.combo);
    for(let i=this.powerUps.length-1;i>=0;i--){const q=this.powerUps[i];q.update();const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<p.magnet){q.x+=(p.x-q.x)*.08;q.y+=(p.y-q.y)*.08}if(d<28){this.collectPower(q.type);this.powerUps.splice(i,1)}else if(q.y>this.canvas.height+30)this.powerUps.splice(i,1)}
    if(this.boss)this.updateBoss();else this.updateEnemies();this.handleBulletHits();
    for(let i=this.particles.length-1;i>=0;i--){this.particles[i].update();if(this.particles[i].life<=0)this.particles.splice(i,1)}for(let i=this.texts.length-1;i>=0;i--){this.texts[i].update();if(this.texts[i].life<=0)this.texts.splice(i,1)}
    if(!this.boss&&this.enemies.length===0&&!this.transition)this.nextWave();this.updateHUD();
  }
  handleEnemyCollisions(){
    const p=this.player;
    if(!p)return;
    for(const shot of this.bullets){
      if(!shot.isEnemy || shot.dead)continue;
      if(Math.hypot(shot.x-p.x,shot.y-p.y)<p.width*.72+shot.radius){
        shot.dead=true;
        this.explode(shot.x,shot.y,shot.color,8);
        this.applyDamage(shot.damage);
      }
    }
    this.bullets=this.bullets.filter(b=>!b.dead);
  }
  updateBoss(){const b=this.boss;b.update(this.canvas.width,this);this.handleEnemyCollisions()}
  updateEnemies(){for(const e of this.enemies){e.update(this.canvas.height);if(e.canShoot(this.canvas.height))this.enemyBullet(e.x,e.y+18,0,5.5,e.color,Math.max(8,Math.min(120,8+this.level*.15)));if(Math.hypot(e.x-this.player.x,e.y-this.player.y)<34){this.explode(e.x,e.y,e.color,18);e.dead=true;this.applyDamage(25+Math.min(80,this.level*.3),null)}}this.enemies=this.enemies.filter(e=>!e.dead&&e.y<=this.canvas.height+e.size);this.handleEnemyCollisions()}
  handleBulletHits(){const p=this.player;for(const b of this.bullets){if(b.dead||b.isEnemy)continue;if(this.boss){const d=Math.hypot(b.x-this.boss.x,b.y-this.boss.y);if(d<this.boss.size*.8){let dmg=b.damage;if(Math.random()<p.crit)dmg*=2.4;this.boss.hp-=dmg;b.dead=true;this.addText(b.x,b.y,`-${Math.round(dmg)}`,dmg>b.damage?'#fff36b':'#ffcc00',dmg>b.damage?1:.75);if(this.boss.hp<=0){this.defeatBoss();return}}}for(const e of this.enemies){if(b.dead||e.dead)break;if(Math.hypot(b.x-e.x,b.y-e.y)<e.size*.7){let dmg=b.damage;if(Math.random()<p.crit)dmg*=2.4;e.hp-=dmg;if(b.pierce>0)b.pierce--;else b.dead=true;this.addText(b.x,b.y,`-${Math.round(dmg)}`,dmg>b.damage?'#fff36b':'#fff',dmg>b.damage?1:.75);if(e.hp<=0)this.killEnemy(e);}}}this.bullets=this.bullets.filter(b=>!b.dead)}
  killEnemy(e){if(e.dead)return;e.dead=true;this.explode(e.x,e.y,e.color,e.type==='ELITE'?25:14);this.score+=Math.round((e.type==='ELITE'?450:140)*this.combo);this.coins+=e.type==='ELITE'?25:7;this.combo=Math.min(20,this.combo+.12);this.comboTimer=150;this.bestCombo=Math.max(this.bestCombo,this.combo);if(Math.random()<.24)this.powerUps.push(new PowerUp(e.x,e.y,Object.keys(POWERUPS)[Math.floor(Math.random()*Object.keys(POWERUPS).length)]))}
  collectPower(type){const p=this.player;p&&this.audio.power();const q=POWERUPS[type];if(q.instant){if(type==='REPAIR')p.hp=Math.min(p.maxHp,p.hp+55);if(type==='SHIELD')p.shield=Math.min(p.maxShield,p.shield+65);if(type==='BOMB')this.triggerBomb(false);if(type==='NOVA')this.activeNova()}else p.active[type]=q.duration;this.addText(p.x,p.y-30,`${q.label} ACTIVE`,q.color,.8)}
  defeatBoss(){const b=this.boss;if(!b)return;this.explode(b.x,b.y,b.def.color,100,true);this.boss=null;this.bossesDefeated++;this.score+=Math.round((5000+this.level*900)*this.combo);this.coins+=200+this.level*12;this.combo=Math.min(20,this.combo+1.5);this.bestCombo=Math.max(this.bestCombo,this.combo);this.bullets=this.bullets.filter(x=>!x.isEnemy);document.getElementById('bossHpContainer').classList.add('hidden');this.addText(this.canvas.width/2,this.canvas.height*.5,`BOSS ${this.level} DESTROYED`,'#00ff9d',1.3);this.save();this.transition=true;this.transitionTimer=setTimeout(()=>{if(this.state===GAME.PLAYING){this.transition=false;this.completeLevel()}},1500)}

  runHealthDamageTest(){
    const p=this.player;
    if(!p)return {ok:false,error:'No player'};
    const oldState=this.state, oldHp=p.hp, oldShield=p.shield, oldInv=p.hitInvuln;
    p.hitInvuln=0;
    const before=p.hp;
    this.applyDamage(20);
    const after=p.hp;
    const ok=after<before;
    p.hp=oldHp; p.shield=oldShield; p.hitInvuln=oldInv;
    this.updateHUD();
    console.assert(ok,'Health damage test failed: HP did not decrease');
    return {ok,before,after};
  }
  updateHUD(){const p=this.player;if(!p)return;document.getElementById('scoreVal').textContent=String(Math.floor(this.score)).padStart(7,'0');document.getElementById('levelVal').textContent=`${String(this.level).padStart(2,'0')} / ${MAX_LEVEL}`;document.getElementById('waveVal').textContent=`${Math.min(this.wave,this.wavesPerLevel)} / ${this.wavesPerLevel}`;document.getElementById('coinVal').textContent=this.coins.toLocaleString();document.getElementById('comboVal').textContent=`x${this.combo.toFixed(1)}`;document.getElementById('hpBar').style.width=`${Math.max(0,p.hp/p.maxHp*100)}%`;document.getElementById('shieldBar').style.width=`${Math.max(0,p.shield/p.maxShield*100)}%`;document.getElementById('energyBar').style.width=`${Math.max(0,p.energy/p.maxEnergy*100)}%`;document.getElementById('hpText').textContent=`${Math.ceil(Math.max(0,p.hp))} / ${p.maxHp}`;document.getElementById('shieldText').textContent=`${Math.ceil(Math.max(0,p.shield))} / ${p.maxShield}`;document.getElementById('energyText').textContent=`${Math.floor(p.energy)} / ${p.maxEnergy}`;if(this.boss)document.getElementById('bossHpBar').style.width=`${Math.max(0,this.boss.hp/this.boss.maxHp*100)}%`;const pc=document.getElementById('activePowerups');pc.innerHTML='';for(const [k,v] of Object.entries(p.active)){const d=document.createElement('div');d.className='powerup-badge';d.textContent=`${POWERUPS[k]?.label||k} ${Math.ceil(v/60)}s`;pc.appendChild(d)}}
  gameOver(){if(this.state===GAME.GAMEOVER)return;this.state=GAME.GAMEOVER;this.bestScore=Math.max(this.bestScore,this.score);this.bestStage=Math.max(this.bestStage,this.level);this.save();document.getElementById('gameOverTitle').textContent='RUN TERMINATED';document.getElementById('gameOverReason').textContent='THE FRONTIER CLAIMED YOUR SHIP.';this.fillGameOver();document.getElementById('nextLevelBtn').classList.add('hidden');document.getElementById('hud').classList.add('hidden');document.getElementById('bossHpContainer').classList.add('hidden');document.getElementById('gameOverMenu').classList.remove('hidden')}
  fillGameOver(){document.getElementById('finalWave').textContent=`${this.level} / ${MAX_LEVEL}`;document.getElementById('finalScore').textContent=Math.floor(this.score).toLocaleString();document.getElementById('finalCoins').textContent=this.coins.toLocaleString();document.getElementById('finalBosses').textContent=this.bossesDefeated;document.getElementById('finalCombo').textContent=`x${this.bestCombo.toFixed(1)}`}
  togglePause(){if(this.state===GAME.PLAYING){this.state=GAME.PAUSED;document.getElementById('pauseOverlay').classList.remove('hidden')}else if(this.state===GAME.PAUSED){this.state=GAME.PLAYING;document.getElementById('pauseOverlay').classList.add('hidden')}}
  drawBackground(){this.ctx.setTransform(1,0,0,1,0,0);this.ctx.globalAlpha=1;this.ctx.globalCompositeOperation='source-over';const b=BACKGROUNDS[this.backgroundIndex];const g=this.ctx.createLinearGradient(0,0,this.canvas.width,this.canvas.height);g.addColorStop(0,b[1]);g.addColorStop(.55,b[2]);g.addColorStop(1,'#010107');this.ctx.fillStyle=g;this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);const ctx=this.ctx;for(const s of this.stars){s.y+=s.s*(this.state===GAME.PLAYING?1.6:.3);if(s.y>this.canvas.height)s.y=-2;ctx.globalAlpha=.18+s.z*.38;ctx.fillStyle=b[3];ctx.fillRect(s.x,s.y,Math.max(1,s.z*1.25),Math.max(1,s.z*1.25))}ctx.globalAlpha=1;if(this.backgroundIndex===2||this.backgroundIndex===8){ctx.strokeStyle='rgba(0,240,255,.045)';ctx.lineWidth=1;for(let x=0;x<this.canvas.width;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,this.canvas.height);ctx.stroke()}for(let y=0;y<this.canvas.height;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(this.canvas.width,y);ctx.stroke()}}}
  draw(){this.drawBackground();if(this.state===GAME.PLAYING||this.state===GAME.PAUSED){this.ctx.globalCompositeOperation='source-over';this.bullets.forEach(b=>b.draw(this.ctx));this.enemies.forEach(e=>e.draw(this.ctx));if(this.boss)this.boss.draw(this.ctx);this.powerUps.forEach(q=>q.draw(this.ctx));this.particles.forEach(x=>x.draw(this.ctx));this.texts.forEach(x=>x.draw(this.ctx));if(this.player)this.player.draw(this.ctx);if(this.damageFlash>0){this.ctx.fillStyle=`rgba(255,20,80,${this.damageFlash/28})`;this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height)}}}
  loop(now){const STEP=1000/60;if(!this.lastTime)this.lastTime=now;const dt=Math.min(50,now-this.lastTime);this.lastTime=now;this.accumulator+=dt;let steps=0;while(this.accumulator>=STEP&&steps<4){this.update();this.accumulator-=STEP;steps++}this.draw();requestAnimationFrame(t=>this.loop(t))}
}
window.addEventListener('DOMContentLoaded',()=>{window.gameEngine=new GameEngine()});
