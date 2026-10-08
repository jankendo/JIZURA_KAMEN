'use strict';const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs');
(async()=>{const {J}=engine(),V=J.cinemaV3,project=J.defaultProject();project.lyrics='[00:00.00]朝の光\n[00:02.00]新しい空';const pcm=new Float32Array([.1,.2,.3]),audio={duration:4,buffer:{sampleRate:48000,numberOfChannels:1,length:3,getChannelData:()=>pcm}},p=J.plan(project,audio),snapshot=await V.snapshot(project,audio,p);
 assert.equal(snapshot.inputHash,(await V.snapshot(project,audio,p)).inputHash);assert(Object.isFrozen(snapshot.outputProfile));assert(!Object.isFrozen(pcm));
 pcm[1]=.4;await assert.rejects(V.assertSnapshot(snapshot,project,audio,p),/INPUT_CHANGED/);assert.equal(p.lastPixelQA,null);pcm[1]=.2;
 for(const mutate of [q=>q.lyrics+='変更',q=>q.timing.lineTimes={0:1},q=>q.customBg.dataUrl='data:image/png;base64,changed',q=>q.overrides={0:{lock:true,font:'embedded_regular'}}]){const q=V.clone(project);mutate(q);assert.notEqual(snapshot.inputHash,(await V.snapshot(q,audio,p)).inputHash);}
 const session=await V.createPlan(project,audio);session.working.cuts[0].params.font='embedded_bold';await V.confirm(session,project,audio);assert.notEqual(session.confirmed,session.working);assert.equal(session.planHash,await V.planHash(session.confirmed));session.working.cuts[0].params.font='embedded_regular';assert.equal(session.confirmed.cuts[0].params.font,'embedded_bold');
 const other=V.clone(p);other.W=720;other.H=1280;assert.notEqual(snapshot.inputHash,(await V.snapshot(project,audio,other)).inputHash);
 assert.equal(project.lyrics,'[00:00.00]朝の光\n[00:02.00]新しい空');console.log('Cinema V3 full PCM/LRC/image/manual settings/aspect invalidation and confirmed-copy isolation PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
