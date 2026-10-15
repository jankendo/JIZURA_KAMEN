'use strict';

// UI clocks and heartbeat text are evidence, not encoder progress.
class ExportWatchdog {
  constructor(started, {stallMs=90000, maximumMs=480000}={}) {
    this.started=started; this.changedAt=started; this.stallMs=stallMs;
    this.maximumMs=maximumMs; this.signature=null;
  }
  observe(state, now) {
    const signature=JSON.stringify({
      calls:state.calls, completed:state.completed, progressCount:state.progressCount,
      progress:state.lastProgress, failures:state.failures,
      picker:state.picker, quality:state.quality, draft:state.draft, links:state.links,
      jobs:state.jobs.filter(j=>j.title==='動画を書き出しています').map(({id,status,stage,detail,error,stages})=>({id,status,stage,detail,error,stages})),
    });
    if(signature!==this.signature){this.signature=signature;this.changedAt=now;}
    if(now-this.started>this.maximumMs)return 'timeout';
    if(now-this.changedAt>this.stallMs)return 'stalled';
    return null;
  }
}
class GenerationWatchdog {
  constructor(started,{stallMs=180000,maximumMs=3600000}={}){Object.assign(this,{started,changedAt:started,stallMs,maximumMs,signature:null});}
  observe(jobs,now){
    // Deliberately exclude elapsed clocks, heartbeat timestamps and unrelated jobs.
    const signature=JSON.stringify(jobs.filter(j=>j.title==='MVを作成しています').map(({id,status,index,detail,error,stages})=>({id,status,index,detail,error,stages:stages.map(({id,status,fraction})=>({id,status,fraction}))})));
    if(signature!==this.signature){this.signature=signature;this.changedAt=now;}
    if(now-this.started>this.maximumMs)return 'timeout';
    if(now-this.changedAt>this.stallMs)return 'stalled';
    return null;
  }
}
module.exports={ExportWatchdog,GenerationWatchdog};
