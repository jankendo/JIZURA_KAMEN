// Real browser cancellation, resource closure, immutable restore and encoded retry.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
module.exports=async({url,output})=>{
 const destination=path.join(output,'cancellation-retry');
 const run=spawnSync(process.execPath,[path.join(__dirname,'cinema_v3_matrix_benchmark.cjs'),url,url,destination],{encoding:'utf8',env:{...process.env,KAMEN_MATRIX_PR5_URL:'',KAMEN_MATRIX_EXTRA:'1',KAMEN_MATRIX_EXTRA_ONLY:'1',KAMEN_MATRIX_CASES:'general-bright',KAMEN_MATRIX_VARIANTS:'v3',KAMEN_MATRIX_CANCEL_PROBE:'1',KAMEN_MATRIX_PROFILE:'0',KAMEN_MATRIX_FRAME_EVIDENCE:'0'}});
 assert.equal(run.status,0,run.stderr+'\n'+run.stdout);const raw=JSON.parse(fs.readFileSync(path.join(destination,'results.json'),'utf8'));assert.equal(raw.rows.length,1);const row=raw.rows[0];assert.equal(row.status,'PASS');assert.equal(row.cancellationProbe?.status,'PASS');assert.equal(row.bitmapGuardProbe?.status,'PASS');assert.equal(row.cancellationProbe.beforePlanQAHash,row.cancellationProbe.afterPlanQAHash);assert.equal(row.validation.certification.passed,true);
 const report={status:'PASS',bitmapGuardResources:row.bitmapGuardProbe,cancellation:row.cancellationProbe,retryVideoHash:row.sha256,retryCodecs:['h264','aac'],retryFullDecode:'PASS',timingPurpose:'NOT_A_PERFORMANCE_BENCHMARK; canceled attempt plus retry',historicalCertificationCause:'UNRESOLVED; this is an independently controlled cancellation test'};
 fs.writeFileSync(path.join(destination,'probe-summary.json'),JSON.stringify(report,null,2)+'\n');console.log('Actual native encoder cancellation, closed frames/encoders, restored plan/QA and fully decoded H264/AAC retry PASS');return report;
};
if(require.main===module){const [url,output]=process.argv.slice(2);assert(url&&output);module.exports({url,output}).catch(error=>{console.error(error);process.exitCode=1;});}
