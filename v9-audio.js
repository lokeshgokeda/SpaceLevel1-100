'use strict';
/* NEBULA PROTOCOL v9 — procedural audio mixer + lightweight ambient music. */
(()=>{
  const N8=window.N8,V=N8.v9,hook=N8.hook;
  V.persist.settings=Object.assign({volumeMaster:1,volumeMusic:.45,volumeWeapons:1,volumeExplosions:1,volumeUI:1},V.persist.settings||{});
  const A=N8.audio;
  const category=(k)=>{
    if(/PULSE|SCATTER|RAILGUN|PLASMA|LASER|ION|PARTICLE|NOVA|GRAVITY|BARRAGE|ANTIMATTER|MISSILE|ENEMY_LASER|ENEMY_PLASMA|ENEMY_SNIPER/.test(k))return 'volumeWeapons';
    if(/BOOM|PLAYER_DEATH|STORM|HULL|SHIELD/.test(k))return 'volumeExplosions';
    return 'volumeUI';
  };
  if(A?.play&&!A.play._v9mix){
    const oldPlay=A.play.bind(A),oldVoice=A.voice.bind(A);
    A.voice=function(o){const key=this._v9Category||'volumeUI',mul=Number(V.persist.settings?.[key]??1);const q=Object.assign({},o,{v:(Number(o?.v)||0)*mul});return oldVoice(q)};
    A.play=function(k,...args){const prev=this._v9Category;this._v9Category=category(k);try{return oldPlay(k,...args)}finally{this._v9Category=prev}};
    A.play._v9mix=true;
  }
  function startMusic(g){if(!g?.audio?.ctx||A._v9Music)return;const ac=g.audio.ctx;if(ac.state==='closed')return;const master=ac.createGain(),o1=ac.createOscillator(),o2=ac.createOscillator(),lfo=ac.createOscillator(),lg=ac.createGain();o1.type='sine';o2.type='triangle';o1.frequency.value=58;o2.frequency.value=87;lfo.frequency.value=.08;lg.gain.value=6;lfo.connect(lg).connect(master.gain);master.gain.value=.012*(Number(V.persist.settings?.volumeMaster??1))*(Number(V.persist.settings?.volumeMusic??.45));o1.connect(master);o2.connect(master);master.connect(ac.destination);o1.start();o2.start();lfo.start();A._v9Music={master,o1,o2,lfo};}
  function stopMusic(){const m=A._v9Music;if(!m)return;for(const o of [m.o1,m.o2,m.lfo]){try{o.stop()}catch{}}try{m.master.disconnect()}catch{}A._v9Music=null;}
  function syncMusic(g){const m=A._v9Music;if(!m?.master)return;const s=V.persist.settings||{};m.master.gain.setTargetAtTime(.012*(Number(s.volumeMaster??1))*(Number(s.volumeMusic??.45)),g.audio.ctx.currentTime,.08)}
  V.audio={startMusic,stopMusic,syncMusic};
  hook(GameEngine.prototype,'startGame',function(o,...a){const r=o.apply(this,a);this.audio.init();startMusic(this);return r});
  hook(GameEngine.prototype,'toMenu',function(o,...a){const r=o.apply(this,a);stopMusic();return r});
  hook(GameEngine.prototype,'exitGame',function(o,...a){const r=o.apply(this,a);stopMusic();return r});
  N8.post.push(g=>{if(g.audio?.ctx)syncMusic(g)});
  N8.resetFns.push(()=>{V.persist.settings=Object.assign({volumeMaster:1,volumeMusic:.45,volumeWeapons:1,volumeExplosions:1,volumeUI:1},V.persist.settings||{})});
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v9-audio.js');
