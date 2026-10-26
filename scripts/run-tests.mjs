import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const tests=['audio_persistence_test.js','upstream_export_regression_test.js','kamen_encoder_liveness_test.cjs','mp4_block_store_test.mjs','project_import_test.cjs'];
const results=[];
for(const name of tests){const result=spawnSync(process.execPath,['dev/'+name],{stdio:'inherit'});results.push({name,status:result.status===0?'PASS':'FAIL'});}
const report={total:results.length,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,skipped:0,tests:results};
if(process.env.JIZURA_TEST_SUMMARY)writeFileSync(process.env.JIZURA_TEST_SUMMARY,JSON.stringify(report,null,2));
console.log(`${report.passed}/${report.total} current-browser regression groups passed; ${report.failed} failed; 0 skipped.`);
if(report.failed)process.exitCode=1;
