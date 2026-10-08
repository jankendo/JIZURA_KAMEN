/* Processing telemetry contains no project data and never drives the engine. */
(() => {
'use strict';
const jobs = new Map(), listeners = new Set(); let sequence = 0;
const now = () => performance.now();
J.processing = {
  jobs,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  begin(title, stages, options = {}) {
    const state = {id:++sequence,title,status:'running',startTime:now(),lastEvent:now(),endTime:null,
      stages:stages.map(([id,label,weight])=>({id,label,weight,status:'pending',fraction:null})),
      index:-1,detail:'',error:'',retry:options.retry,cancel:options.cancel,compact:!!options.compact};
    jobs.set(state.id,state);
    const emit = () => { state.lastEvent=now(); for(const fn of listeners) fn(state); };
    const handle = {
      state,
      enter(id, detail = '') {
        if(state.status!=='running')return;
        const index=state.stages.findIndex(s=>s.id===id); if(index<0)throw Error('Unknown processing stage: '+id);
        if(index!==state.index){
          if(index>state.index){for(let i=0;i<index;i++)if(state.stages[i].status!=='skipped')Object.assign(state.stages[i],{status:'done',fraction:1});}
          else {for(let i=index;i<state.stages.length;i++)if(state.stages[i].status!=='skipped')Object.assign(state.stages[i],{status:'pending',fraction:null});}
          state.index=index;state.subFraction=null;Object.assign(state.stages[index],{status:'running',fraction:null});
        }
        state.detail=detail;emit();
      },
      update(current,total,detail='') {
        if(state.status!=='running'||state.index<0)return;
        const s=state.stages[state.index];s.fraction=Number.isFinite(current)&&Number.isFinite(total)&&total>0?Math.max(0,Math.min(1,current/total)):null;
        state.detail=detail;emit();
      },
      observe(current,total,detail='') {
        if(state.status!=='running')return;
        state.subFraction=Number.isFinite(current)&&Number.isFinite(total)&&total>0?Math.max(0,Math.min(1,current/total)):null;
        state.detail=detail;emit();
      },
      skip(id) { const s=state.stages.find(s=>s.id===id);if(s){s.status='skipped';s.fraction=0;emit();} },
      complete(detail='完了しました') {
        if(state.status!=='running')return;
        for(const s of state.stages)if(s.status!=='skipped')Object.assign(s,{status:'done',fraction:1});
        state.status='completed';state.detail=detail;state.endTime=now();emit();
        // Briefly acknowledge success; never keep finished jobs over the editor.
        if(state.compact)handle.dismiss();
        else state.dismissTimer=setTimeout(()=>handle.dismiss(),1200);
      },
      fail(error, cancelled=false) {
        if(state.status!=='running')return;
        state.status=cancelled?'cancelled':'error';state.error=String(error?.message||error);state.endTime=now();
        if(state.index>=0)state.stages[state.index].status=state.status;
        console.error('KAMEN processing',state.title,state.stages[state.index]?.id,error);emit();
      },
      dismiss() {if(state.status==='running')return;if(state.dismissTimer){clearTimeout(state.dismissTimer);state.dismissTimer=0;}jobs.delete(state.id);emit();},
    };
    state.handle=handle;
    // Bound retained UI history, without closing active operations or touching saved data.
    for(const [id,s] of jobs)if(jobs.size>8&&s.status!=='running'){if(s.dismissTimer)clearTimeout(s.dismissTimer);jobs.delete(id);}
    emit(); return handle;
  },
  snapshot(s) {
    const included=s.stages.filter(x=>x.status!=='skipped'),weight=included.reduce((n,x)=>n+x.weight,0)||1;
    const fraction=included.reduce((n,x)=>n+x.weight*(x.status==='done'?1:x.fraction??0),0)/weight;
    return {fraction:s.status==='completed'?1:Math.min(.999,fraction),completedSteps:included.filter(x=>x.status==='done').length,
      totalSteps:included.length,stage:s.stages[s.index],elapsed:((s.endTime??now())-s.startTime)/1000};
  },
};
J.processingYield = () => new Promise(resolve=>setTimeout(resolve,0));
})();
