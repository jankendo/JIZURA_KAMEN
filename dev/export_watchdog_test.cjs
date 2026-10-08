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
