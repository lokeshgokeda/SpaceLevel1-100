'use strict';
/* NEBULA PROTOCOL v14 — richer procedural combat audio, no external assets. */
(()=>{
  const N8=window.N8,GE=window.GameEngine;if(!N8||!GE)return;
  let enabled=true,lastHealth=1,criticalLatch=false,lastWeapon=-1,hum=null;
  const mixv=k=>{const v=Number(N8.v9?.persist?.settings?.[k]);return Number.isFinite(v)?v:1};
  const master=()=>Math.max(.0001,(Number(N8.g?.settings?.volume??50)/100)*.32*mixv('volumeMaster')*mixv('volumeUI'));
  let live=0; // polyphony cap: at most 20 simultaneous UI tones
  function ctx(g){try{g?.audio?.init?.();return g?.audio?.ctx||null}catch{return null}}
  function tone(g,f=440,d=.08,type='sine',v=.14,slide=.55){const ac=ctx(g);if(!ac||!enabled||live>=20)return;live++;const now=ac.currentTime,o=ac.createOscillator(),gain=ac.createGain();o.onended=()=>{live--;try{o.disconnect();gain.disconnect()}catch{}};o.type=type;o.frequency.setValueAtTime(Math.max(30,f),now);o.frequency.exponentialRampToValueAtTime(Math.max(25,f*slide),now+d);gain.gain.setValueAtTime(v*master(),now);gain.gain.exponentialRampToValueAtTime(.001,now+d);o.connect(gain);gain.connect(ac.destination);o.start(now);o.stop(now+d)}
  function chord(g,notes,d=.16){notes.forEach((n,i)=>setTimeout(()=>tone(g,n,d,'triangle',.11,.7),i*35))}
  const S={button:g=>tone(g,680,.045,'square',.08,.9),lock:g=>chord(g,[900,1300],.09),dash:g=>tone(g,180,.18,'sawtooth',.14,2.5),ability:g=>chord(g,[280,760],.13),special:g=>chord(g,[120,350,780],.18),missile:g=>tone(g,250,.24,'sawtooth',.12,1.7),pickup:g=>chord(g,[520,820,1240],.12),shield:g=>tone(g,310,.14,'sine',.13,1.9),hull:g=>tone(g,110,.24,'square',.18,.65),critical:g=>chord(g,[480,220,480],.12),boss:g=>chord(g,[70,110,170],.3),weapon:g=>tone(g,760,.05,'square',.08,.7)};
  function startHum(g){if(hum)return;const ac=ctx(g);if(!ac)return;const o=ac.createOscillator(),l=ac.createOscillator(),gain=ac.createGain(),lp=ac.createBiquadFilter();o.type='sawtooth';o.frequency.value=52;l.type='sine';l.frequency.value=.19;lp.type='lowpass';lp.frequency.value=220;gain.gain.value=.012*master();o.connect(lp).connect(gain);l.connect(gain.gain);gain.connect(ac.destination);o.start();l.start();hum={o,l,gain,lp}}
  function stopHum(){if(!hum)return;for(const o of [hum.o,hum.l]){try{o.stop()}catch{}}try{hum.gain.disconnect()}catch{}hum=null}
  N8.v14Sound={enabled:()=>enabled,toggle:()=>{enabled=!enabled;try{N8.g?.toast(enabled?'SFX ONLINE':'SFX MUTED')}catch{};if(!enabled)stopHum();return enabled},startHum,stopHum,...S};
  const hook=N8.hook;
  hook(GE.prototype,'startGame',function(prev,...args){const r=prev.apply(this,args);if(enabled)startHum(this);return r});
  hook(GE.prototype,'toMenu',function(prev,...args){const r=prev.apply(this,args);stopHum();return r});
  hook(GE.prototype,'exitGame',function(prev,...args){const r=prev.apply(this,args);stopHum();return r});
  hook(GE.prototype,'togglePause',function(prev,...args){const was=this.state===GAME.PLAYING,r=prev.apply(this,args);if(was||this.state===GAME.PLAYING)S.button(this);return r});
  hook(GE.prototype,'cycleWeapon',function(prev,...args){const before=this.wmode;const r=prev.apply(this,args);if(this.wmode!==before)S.weapon(this);return r});
  hook(GE.prototype,'dash',function(prev,...args){const before=this.player?.dashCooldown||0,r=prev.apply(this,args);if(before<=0&&(this.player?.dashCooldown||0)>0)S.dash(this);return r});
  hook(GE.prototype,'useAbility',function(prev,...args){const before=this.player?.v8?.ab?.cd||0,r=prev.apply(this,args);if((this.player?.v8?.ab?.cd||0)>before)S.ability(this);return r});
  hook(GE.prototype,'useSpecial',function(prev,...args){const before=this.player?.energy||0,r=prev.apply(this,args);if((this.player?.energy||0)<before)S.special(this);return r});
  hook(GE.prototype,'fireMissiles',function(prev,...args){const before=this.player?.energy||0,r=prev.apply(this,args);if((this.player?.energy||0)<before)S.missile(this);return r});
  hook(GE.prototype,'collectPower',function(prev,...args){const r=prev.apply(this,args);S.pickup(this);return r});
  hook(GE.prototype,'applyDamage',function(prev,...args){const before=this.player?.hp||0,r=prev.apply(this,args);const after=this.player?.hp||0;if(after<before){S.hull(this);if(after>0&&this.player?.maxHp&&after/this.player.maxHp<.25)S.critical(this)}return r});
  hook(GE.prototype,'defeatBoss',function(prev,...args){const r=prev.apply(this,args);S.boss(this);return r});
  N8.post=N8.post||[];N8.post.push(g=>{if(hum&&g.audio?.ctx&&(g._v15hs=(g._v15hs||0)+1)%30===0)hum.gain.gain.setTargetAtTime(.012*master(),g.audio.ctx.currentTime,.1);if(!g.player)return;const hp=g.player.maxHp?g.player.hp/g.player.maxHp:1;if(hp<.25&&!criticalLatch){criticalLatch=true;S.critical(g)}else if(hp>.3)criticalLatch=false;lastHealth=hp});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v14-audio.js');
