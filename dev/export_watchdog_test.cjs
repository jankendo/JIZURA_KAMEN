'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ExportWatchdog}=require('./export_watchdog.cjs');
const state=()=>({calls:1,completed:0,progressCount:1,lastProgress:{fraction:.1,label:'frames'},picker:[],failures:[],jobs:[],links:[],draft:false});

test('a changing UI clock and unrelated autosave cannot conceal a stalled export',()=>{
  const watchdog=new ExportWatchdog(0), current=state();
  assert.equal(watchdog.observe(current,0),null);
  current.time=95000;current.progressDOM=[{text:'経過 01:35'}];
  current.jobs=[{title:'編集内容を保存しています',lastEvent:95000,status:'completed'}];
  assert.equal(watchdog.observe(current,95000),'stalled');
});
test('a new encoded frame renews the progress deadline',()=>{
  const watchdog=new ExportWatchdog(0),current=state();watchdog.observe(current,0);
  current.progressCount++;current.lastProgress.fraction=.2;
  assert.equal(watchdog.observe(current,85000),null);
  assert.equal(watchdog.observe(current,170000),null);
  assert.equal(watchdog.observe(current,176000),'stalled');
});
test('continuous progress cannot extend the absolute export limit',()=>{
  const watchdog=new ExportWatchdog(0),current=state();watchdog.observe(current,0);
  current.progressCount++;
  assert.equal(watchdog.observe(current,480001),'timeout');
});
test('decoded QA receives its own bounded budget after a progressing encode',()=>{
 const w=new ExportWatchdog(0),s=state();w.observe(s,0);
 s.lastProgress={fraction:.995,label:'decoded frame 1',stage:{stage:'verify',current:1,total:216}};
 assert.equal(w.observe(s,420000),null);
 s.lastProgress.stage.current=100;assert.equal(w.observe(s,500000),null);
 s.lastProgress.stage.current=216;assert.equal(w.observe(s,900001),'timeout');
});
test('verification phase toggles, heartbeat callbacks and timestamps cannot hide a stall',()=>{
 const w=new ExportWatchdog(0),s=state();s.lastProgress={time:1,fraction:.995,label:'verify',stage:{stage:'verify',current:1,total:216}};
 w.observe(s,0);s.progressCount++;s.lastProgress.time=95000;
 assert.equal(w.observe(s,95000),'stalled');
 s.lastProgress.stage.stage='frames';assert.equal(w.observe(s,100000),null);
 s.lastProgress.stage.stage='verify';assert.equal(w.observe(s,480001),'timeout');
});

const {GenerationWatchdog}=require('./export_watchdog.cjs');
test('generation progress survives ten minutes but elapsed heartbeats cannot conceal a stall',()=>{
 const w=new GenerationWatchdog(0),j=[{id:1,title:'MVを作成しています',status:'running',index:4,detail:'candidate 1',stages:[{id:'encode',status:'running',fraction:.1}]}];
 assert.equal(w.observe(j,0),null);for(let t=120000;t<=720000;t+=120000){j[0].stages[0].fraction+=.1;assert.equal(w.observe(j,t),null);}
 j[0].lastEvent=901000;assert.equal(w.observe(j,901000),'stalled');j[0].detail='candidate 2';assert.equal(w.observe(j,3600001),'timeout');
});
