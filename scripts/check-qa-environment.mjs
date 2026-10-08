import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let canvas='FAIL';try{require('@napi-rs/canvas');canvas='PASS';}catch{}
const tools=Object.fromEntries(['ffmpeg','ffprobe'].map(name=>[name,spawnSync(name,['-version'],{stdio:'ignore'}).status===0?'PASS':'SKIPPED_ENVIRONMENT_MISSING']));
console.log(JSON.stringify({canvas,...tools}));if(canvas==='FAIL')process.exitCode=1;
