'use strict';
/* NEBULA PROTOCOL v15.1 — deterministic boot / version integrity layer. */
(()=>{
  const BUILD='15.1.1.20261001';
  const VERSION='v15.1.1';
  const required=[
    'script.js','v6.js','v7.js','v8-env.js','v8-ships.js','v8-weapons.js','v8-powers.js','v8-enemies.js','v8-boss.js','v8-meta.js','v8-ui.js',
    'v9-save.js','v9-factions.js','v9-galaxy.js','v9-loot.js','v9-achievements.js','v9-stats.js','v9-missions.js','v9-capital.js','v9-combat.js','v9-events.js','v9-campaign.js','v9-customization.js','v9-audio.js','v9-ui.js',
    'v11-ui.js','v12-difficulty.js','v12-ui.js','v13-combat.js','v13-ui.js','v14-audio.js','v14-ui.js','v15-core.js','v15-fx.js','v15-ui.js'
  ];
  const loaded=new Set(),failed=new Map();
  const state={version:VERSION,build:BUILD,status:'BOOTING',required,loaded,failed,started:false,ready:false};
  window.NEBULA_BUILD=Object.freeze({version:VERSION,build:BUILD});
  window.NEBULA_BOOT={
    ...state,
    asset(name){loaded.add(name)},
    fail(name,error){failed.set(name,String(error||'asset failed'))},
    module(name){loaded.add(name)},
    isReady(){return failed.size===0&&required.every(x=>loaded.has(x))},
    start(factory){
      if(state.started)return;
      state.started=true;
      const overlay=document.getElementById('nebulaBoot');
      const status=document.getElementById('nebulaBootStatus');
      const detail=document.getElementById('nebulaBootDetail');
      const set=(s,d)=>{state.status=s;if(status)status.textContent=s;if(detail)detail.textContent=d||''};
      const fail=(reason)=>{state.status='ERROR';state.ready=false;set('BOOT ERROR',reason);if(overlay){overlay.classList.add('error');overlay.classList.remove('ready')}window.NEBULA_BOOT_ERROR=reason;console.error('[NEBULA BOOT]',reason)};
      window.addEventListener('error',e=>{if(state.status!=='READY')state.failed.set(e.filename||'runtime',e.message||'runtime error')},{capture:true});
      window.addEventListener('unhandledrejection',e=>{if(state.status!=='READY')state.failed.set('promise',e.reason?.message||String(e.reason||'unhandled rejection'))});
      if(!this.isReady()){
        const missing=required.filter(x=>!loaded.has(x));
        const broken=[...failed.keys()];
        fail(`Missing: ${missing.join(', ')||'none'}${broken.length?` | Failed: ${broken.join(', ')}`:''}`);
        return;
      }
      set('VALIDATING','Checking engine, N8 and v15 modules…');
      const checks=[
        ['N8',()=>!!window.N8],['GameEngine',()=>!!window.GameEngine],['v15 core',()=>!!window.N8?.v15],
        ['v15 FX',()=>!!window.N8?.v15FX],['v15 UI',()=>!!window.N8?.v15UI]
      ];
      const bad=checks.filter(([,fn])=>{try{return !fn()}catch{return true}}).map(x=>x[0]);
      if(bad.length){fail(`Initialization missing: ${bad.join(', ')}`);return;}
      set('READY','All required modules verified.');
      state.status='READY';state.ready=true;
      if(overlay){overlay.classList.add('ready');setTimeout(()=>overlay.remove(),350)}
      try{factory()}catch(err){fail(`Game startup failed: ${err?.message||err}`)}
    }
  };
  document.addEventListener('DOMContentLoaded',()=>{
    const b=document.getElementById('nebulaBoot');
    const v=document.getElementById('nebulaBootVersion');
    if(v)v.textContent=`${VERSION} · BUILD ${BUILD}`;
    if(b)b.classList.add('booting');
  },{once:true});
})();
