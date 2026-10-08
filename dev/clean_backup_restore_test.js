const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),pkg=require('../package.json'),lock=require('../package-lock.json');
assert(pkg.devDependencies?.['@napi-rs/canvas']);assert.equal(lock.packages[''].devDependencies['@napi-rs/canvas'],pkg.devDependencies['@napi-rs/canvas']);assert(require.resolve('@napi-rs/canvas').startsWith(path.join(root,'node_modules')),'Raster QA must use declared local dependency');
if(process.env.JIZURA_RESTORE_VERIFY_CHILD==='1'){console.log('clean_backup_restore_test PASS (isolated child dependency verified)');process.exit(0);}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jizura-clean-restore-'));
try{
 fs.cpSync(root,dir,{recursive:true,filter:p=>!['node_modules','.git','.sites-runtime','dist'].some(x=>p===path.join(root,x)||p.startsWith(path.join(root,x)+path.sep))});
 const cache=process.env.JIZURA_QA_CACHE||path.resolve(root,'../npm-cache');
 const env={...process.env,JIZURA_RESTORE_VERIFY_CHILD:'1',npm_config_cache:cache,NPM_CONFIG_CACHE:cache};delete env.NODE_PATH;
 for(const args of [['ci'],['test'],['run','build']]){
  const npmCLI=process.env.npm_execpath||fs.realpathSync(path.join(path.dirname(process.execPath),process.platform==='win32'?'node_modules/npm/bin/npm-cli.js':'npm'));
  const logfile=path.join(root,'../clean_restore_'+args.join('_')+'.log'),fd=fs.openSync(logfile,'w');
  let result;try{result=cp.spawnSync(process.execPath,[npmCLI,'--cache',cache,...args],{cwd:dir,env,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
  assert.equal(result.status,0,'clean '+args.join(' ')+' failed; inspect clean_restore logs');
 }
 console.log('clean_backup_restore_test PASS: npm ci → npm test → npm run build with NODE_PATH removed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
