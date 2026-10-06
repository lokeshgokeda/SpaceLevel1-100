
'use strict';
/* NEBULA PROTOCOL v9 — persistent campaign chapters layered over sector progression. */
(()=>{
  const N8=window.N8,V=N8.v9,hook=N8.hook;
  const chapters=[
    ['FRONTIER AWAKENING','Stabilize the first war corridor and establish a secure command route.'],
    ['RIFT ESCALATION','Track the Void Syndicate through the unstable nebula corridor.'],
    ['IRON SIEGE','Break the heavy fleet blockade and secure salvage lanes.'],
    ['ALIEN FRONT','Survive the swarm push and recover the lost research chain.'],
    ['DYNASTY CROSSING','Escort the deep-space corridor through precision-fire territory.'],
    ['WAR OF FIVE BANNERS','Push the warfront beyond the known frontier.'],
    ['CAPITAL SHADOW','Destroy the first enemy capital group and expose its command network.'],
    ['SINGULARITY RISING','Investigate the anomaly sectors and defeat adaptive commanders.'],
    ['GALACTIC WAR','Hold multiple strategic sectors while the fleets collide.'],
    ['ASCENSION','Secure the final command corridor and prepare the last offensive.'],
    ['LAST FRONT','Break the remaining command bastions beyond the mapped frontier.'],
    ['HYPERION ENDGAME','Consolidate the galaxy and complete the Ascension campaign.']
  ];
  V.campaign=V.campaign||{chapter:1,completed:0,history:[],title:chapters[0][0],briefing:chapters[0][1]};
  const sync=()=>{const c=V.persist.campaign||{};V.campaign=Object.assign(V.campaign,c);const idx=Math.max(1,Math.min(chapters.length,Number(V.campaign.chapter)||1))-1;V.campaign.title=chapters[idx][0];V.campaign.briefing=chapters[idx][1]};
  V.campaignSync=sync;sync();
  hook(GameEngine.prototype,'completeLevel',function(o,...a){const before=this.level;const r=o.apply(this,a);const c=V.persist.campaign||{};if(this.level>before&&before%10===0){c.completed=(c.completed||0)+1;c.chapter=Math.min(chapters.length,Math.floor(c.completed/1)+1);c.history=(c.history||[]).concat({sector:N8.sectorNo(before),at:Date.now()}).slice(-30);V.persist.campaign=c;sync();N8.v9.saveAll(this);this.toast(`CAMPAIGN ADVANCE // ${V.campaign.title}`)}return r});
  N8.resetFns.push(()=>sync());
})();

/* v15.1.1 deterministic asset registration */
window.NEBULA_BOOT?.asset('v9-campaign.js');
