'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright-core');
(async()=>{const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const context=await browser.newContext(),page=await context.newPage();await page.goto(process.argv[2]||'http://127.0.0.1:4173/');await page.waitForFunction(()=>J.uiApi&&J.ui.project&&J.ui.plan);
 const result=await page.evaluate(async()=>{
 const J=window.J,S=J.ui,api=J.uiApi,check=(x,m)=>{if(!x)throw Error(m);};
 const original=JSON.parse(JSON.stringify(S.project)),image=document.createElement('canvas');image.width=32;image.height=18;const ix=image.getContext('2d');ix.fillStyle='#122840';ix.fillRect(0,0,32,18);const background=image.toDataURL();
 // Genuine browser storage quota, not a successful setItem stub.
 localStorage.removeItem('jizura.project.ref.v2');
 let quota=false;try{for(let i=0;i<20;i++)localStorage.setItem('quota-test-'+i,'x'.repeat(1024*1024));}catch(e){quota=e.name==='QuotaExceededError';}check(quota,'real localStorage quota not reached');
 let lo=0,hi=1024*1024;while(lo<hi){const mid=Math.ceil((lo+hi)/2);try{localStorage.setItem('quota-tail','q'.repeat(mid));lo=mid;}catch(e){check(e.name==='QuotaExceededError','unexpected localStorage error');hi=mid-1;}}
 let referenceQuota=false;try{localStorage.setItem('jizura.project.ref.v2',JSON.stringify({key:'project-current-v2',revision:1}));}catch(e){referenceQuota=e.name==='QuotaExceededError';}check(referenceQuota,'small project reference must also hit real quota');
 for(const count of [8,50,100]){
 S.project=J.legacyDefaultProject();S.project.lyrics=Array.from({length:count},(_,i)=>`[${String(Math.floor(i/60)).padStart(2,'0')}:${String(i%60).padStart(2,'0')}]日本語の全文 ${i}`).join('\n');
 S.project.customBg={...S.project.customBg,enabled:true,dataUrl:background};S.project.overrides=Object.fromEntries(Array.from({length:count},(_,i)=>[i,{lock:true,layout:'center'}]));
 S.project=api.mergeProject(S.project);S.pendingAudioFile=new File(['audio-'+count],'capacity-'+count+'.mp3',{type:'audio/mpeg',lastModified:123});S.project.audioAsset=J.audioAssetInfo(S.pendingAudioFile);
 const audio={duration:count+1,bpm:120,energyRate:1,energy:new Float32Array(count+1).fill(.4),features:{energy:.4}};
 const set=await J.generateJizuraDirectionV11(S.project,audio);S.project.autoDirection=true;S.project.style=set.recommended.proposal.style;S.project.mood=set.recommended.proposal.mood;S.project.artDirection=J.makeArtDirection(S.project,audio,set.recommended.proposal);S.project.fonts={...S.project.artDirection.typography};S.project.artDirection.testLargeDiagnostic='z'.repeat(6*1024*1024);const plan=J.plan(S.project,audio);await J.searchSongNativeCandidates(plan,null,audio,{ensureFonts:false});J.assertSelectionV9(plan,audio);J.captureSongNativeResolved(S.project,audio,plan);const decisions=J.canonicalJSON(J.songNativeRenderDecisions(plan));
 const before=JSON.stringify(S.project);check(await api.flushSave(),'IDB save with full localStorage '+count+JSON.stringify(S.persistenceError));S.project=await api.loadLocal();check(S.project.lyrics===JSON.parse(before).lyrics&&S.project.artDirection.testLargeDiagnostic===JSON.parse(before).artDirection.testLargeDiagnostic&&J.canonicalJSON(S.project.overrides)===J.canonicalJSON(JSON.parse(before).overrides)&&S.project.customBg.dataUrl===JSON.parse(before).customBg.dataUrl,'roundtrip '+count);check(await S.localAudioSnapshot.file.text()==='audio-'+count,'atomic audio restore '+count);const restored=J.plan(S.project,audio);check(restored.songNativeRestore.status==='RESTORED'&&J.canonicalJSON(J.songNativeRenderDecisions(restored))===decisions,'v11 rendering changed '+count+JSON.stringify({restore:restored.songNativeRestore,identity:restored.songNativeDirection?.sourceIdentity,saved:S.project.artDirection?.songNativeResolved?.sourceIdentity}));
 }
 delete S.project.artDirection.testLargeDiagnostic;await api.flushSave();
 const normalize=q=>{q=JSON.parse(JSON.stringify(q));delete q.migratedFromSchema;return J.canonicalJSON(q);};const prior=normalize(S.project),db=await new Promise((resolve,reject)=>{const r=indexedDB.open('jizura-assets-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 // Abort an actual transaction: atomic rollback protects previous project/assets.
 const tx=db.transaction('assets','readwrite');tx.objectStore('assets').put({broken:true},'project-current-v2');tx.objectStore('assets').put('broken','background');tx.objectStore('assets').put(new Blob(['broken']),'audio');tx.abort();await new Promise(r=>{tx.onabort=r;});db.close();{const read=await api.loadLocal();check(await S.localAudioSnapshot.file.text()==='audio-100','aborted write changed audio');check(normalize(read)===prior,'aborted save destroyed previous project: '+Object.keys({...read,...JSON.parse(prior)}).filter(k=>J.canonicalJSON(read[k])!==J.canonicalJSON(JSON.parse(prior)[k])).join(','));}
 S.project.title='older';const old=api.flushSave();S.project.title='newest';const newest=api.flushSave();await Promise.all([old,newest]);check((await api.loadLocal()).title==='newest','revision ordering');
 for(let i=0;i<20;i++)localStorage.removeItem('quota-test-'+i);localStorage.removeItem('quota-tail');
 S.project=original;await api.flushSave();return {quota,referenceQuota,lines:[8,50,100],atomicAbort:true,revision:true};
 });assert(result.quota);console.log('Persistence v11.1 real Chromium PASS',JSON.stringify(result));
 // Navigation uses a fresh document and actual IndexedDB read.
 await page.reload();await page.waitForFunction(()=>J.uiApi&&J.ui.project&&J.ui.plan);assert.equal(await page.evaluate(()=>J.ui.persistenceRevision>0),true);
 console.log('Persistence reload PASS');
 const peer=await page.context().newPage();await peer.goto(process.argv[2]||'http://127.0.0.1:4173/');await peer.waitForFunction(()=>J.ui?.plan);
 await peer.evaluate(()=>J.uiApi.flushSave());await page.evaluate(()=>J.uiApi.loadLocal());
 const winner=await page.evaluate(async()=>{J.ui.project.title='cross-tab-winner';return {saved:await J.uiApi.flushSave(),error:J.ui.persistenceError,status:document.querySelector('#localSaveStatus').textContent};});assert.equal(winner.saved,true,JSON.stringify(winner));
 assert.equal(await peer.evaluate(async()=>{J.ui.project.title='cross-tab-unsaved';const ok=await J.uiApi.flushSave();return !ok&&J.ui.unsaved&&J.ui.project.title==='cross-tab-unsaved'&&(await J.uiApi.loadLocal()).title==='cross-tab-winner';}),true);
 await peer.close();console.log('Cross-tab optimistic revision guard and unsaved edit protection PASS');
 const legacyContext=await browser.newContext(),legacy=await legacyContext.newPage();
 await legacy.addInitScript(()=>{if(!localStorage.getItem('jizura.project.v1'))localStorage.setItem('jizura.project.v1',JSON.stringify({schemaVersion:3,title:'legacy-preserved',lyrics:'[00:00]旧保存',customBg:{enabled:false}}));});
 await legacy.goto(process.argv[2]||'http://127.0.0.1:4173/');await legacy.waitForFunction(()=>J.ui?.plan);
 assert.equal(await legacy.evaluate(async()=>{const raw=localStorage.getItem('jizura.project.v1');return J.ui.project.title==='legacy-preserved'&&J.ui.persistenceRevision>0&&JSON.parse(raw).title==='legacy-preserved'&&(await J.uiApi.loadLocal()).title==='legacy-preserved';}),true);
 await legacyContext.close();console.log('Legacy migration and original record retention PASS');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
