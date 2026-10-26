import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const out=path.resolve(process.env.KAMEN_QA_OUT||'/tmp/kamen-browser-qa');await mkdir(out,{recursive:true});
const port=process.env.KAMEN_QA_PORT||'4187',url=`http://127.0.0.1:${port}/`;
const server=spawn(process.execPath,['scripts/serve.mjs','dist','127.0.0.1',port],{stdio:['ignore','pipe','inherit']});
let listening=false,serverFailure=null;
server.stdout.on('data',chunk=>{process.stdout.write(chunk);if(chunk.toString().includes('JIZURA local server:'))listening=true;});
server.on('error',e=>{serverFailure=e;});
const stopped=new Promise(resolve=>server.on('exit',code=>{if(!listening)serverFailure=Error('QA server exited: '+code);resolve();}));
const run=(file,args)=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['dev/'+file,...args],{stdio:'inherit',env:process.env});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(file+' failed: '+code)));});
try{
 for(let i=0;i<60&&!listening&&!serverFailure;i++)await new Promise(r=>setTimeout(r,100));
 if(serverFailure)throw serverFailure;if(!listening||!(await fetch(url)).ok)throw Error('QA server did not start');
 for(const [file,destination]of [['browser_ux_e2e.cjs','ux'],['mv_readability_e2e.cjs','readability'],['workspace_conflicts_e2e.cjs','workspaces.json'],['credits_layout_e2e.cjs','credits'],['upstream_modernization_e2e.cjs','upstream']])await run(file,[url,path.join(out,destination)]);
}finally{
 server.kill();const force=setTimeout(()=>server.kill('SIGKILL'),2000);await stopped;clearTimeout(force);
}
