"""Recover only fixed pending controls, using authenticated completed baselines.

No replan or new quality assertion. Each process has a hard deadline and durable receipt.
"""
import pathlib,json,subprocess,hashlib,zipfile,os,sys
specpath,cid,toolpath,sourcepath,outpath=sys.argv[1:]
spec=json.load(open(specpath));c=next(c for c in spec['cases']if c['caseId']==cid)
tools=pathlib.Path(toolpath).resolve();source=pathlib.Path(sourcepath).resolve();out=pathlib.Path(outpath).resolve();out.mkdir(parents=True,exist_ok=True)
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()==spec['sourceCommit']
inputs=out.parent/('inputs-'+cid);inputs.mkdir(exist_ok=True)
def download(a,dest):
 dest.mkdir(parents=True,exist_ok=True);zpath=inputs/(str(a['artifactId'])+'.zip')
 with zpath.open('wb')as f:subprocess.run(['gh','api',f"repos/jankendo/JIZURA_KAMEN/actions/artifacts/{a['artifactId']}/zip"],stdout=f,check=True)
 assert hashlib.file_digest(zpath.open('rb'),'sha256').hexdigest()==a['archiveSHA256'],'ARCHIVE_IDENTITY_MISMATCH'
 with zipfile.ZipFile(zpath)as z:
  assert all(not pathlib.PurePosixPath(n).is_absolute()and '..'not in pathlib.PurePosixPath(n).parts for n in z.namelist());z.extractall(dest)
 zpath.unlink() # Verified redundant download; immutable original remains at its actual artifact ID.
def run(name,tool,args,env,deadline):
 p=subprocess.run([sys.executable,str(tools/'run_bounded_diagnostic.py'),str(out/(name+'-run.json')),str(deadline),str(out/(name+'.log')),'node',str(tools/tool),*map(str,args)],env=env)
 return {'exitCode':p.returncode,'receipt':name+'-run.json','log':name+'.log'}
receipt={'sourceCommit':spec['sourceCommit'],'caseId':cid,'specSHA256':hashlib.sha256(pathlib.Path(specpath).read_bytes()).hexdigest(),'original':c['original'],'controls':[],'semanticStatus':'UNVERIFIED','status':'STARTED'}
def save():
 p=out/'collection-progress.json';temp=p.with_suffix('.tmp');temp.write_text(json.dumps(receipt,indent=2)+'\n');temp.replace(p)
save();original=inputs/'original';download(c['original'],original)
env={**os.environ,'KAMEN_COUNTERFACTUAL_PHASES':'1','KAMEN_COUNTERFACTUAL_NATIVE_HASHES':'1'}
if any(h in ['grammarTemporalRecipe','grammarUniformTranslation']for h in c['additionalOFFHooks']):
 grammar=pathlib.Path(specpath).resolve().parent/'grammar-policy-v2-temporal-recipe-preregistration.json'
 assert grammar.is_file(),'GRAMMAR_CONTROL_SOURCE_SPEC_REQUIRED_BEFORE_RENDER'
 env['KAMEN_GRAMMAR_CONTROL_SPEC']=str(grammar)
native=out/'native';native.mkdir(exist_ok=True)
receipt['native']=run('native','native_dispatch_lineage_trace_v7.cjs',['http://127.0.0.1:4173/',original/'matrix',cid,'v3',native],env,spec['perNativeDeadlineSeconds']);save()
assert receipt['native']['exitCode']==0,'NATIVE_PROCESS_FAILED'
t=json.load(open(native/'native-dispatch-trace.json'));assert t['exactNativeRGBA']and t['videoSHA256']==c['originalVideoSHA256']and t['planHash']==c['planHash']
env['KAMEN_CURRENT_NATIVE_TRACE']=str(native/'native-dispatch-trace.json')
if c['recoveredBaseline']:
 a=c['recoveredBaseline'];dest=inputs/'baseline';download(a,dest);baseline=dest/a['path'];receipt['baselineReuse']=a
else:
 baseline=out/'baseline';baseline.mkdir(exist_ok=True)
 e={**env,'KAMEN_COUNTERFACTUAL_HOOK':c['newBaselineHook']}
 receipt['baseline']=run('baseline','encoded_selected_operator_controls_reuse_original.cjs',['http://127.0.0.1:4173/',original/'matrix',cid,'v3',source,baseline],e,spec['perEncodeProcessDeadlineSeconds']);save()
 assert receipt['baseline']['exitCode']==0,'BASELINE_PROCESS_FAILED'
b=baseline/'effect-counterfactual-report.json';assert b.is_file()
raw=json.load(open(b));receipt['strictOriginalDecodedIdentity']=raw['adoptedMovieReproduced'];receipt['baselineReportSHA256']=hashlib.file_digest(b.open('rb'),'sha256').hexdigest();save()
for idx,hook in enumerate(c['additionalOFFHooks']):
 dest=out/'additional'/str(idx);dest.mkdir(parents=True,exist_ok=True)
 e={**env,'KAMEN_COUNTERFACTUAL_HOOK':hook,'KAMEN_REUSE_BASELINE_REPORT':str(b)}
 result=run('off-'+str(idx),'encoded_selected_operator_off_reuse_original_diagnostic.cjs',['http://127.0.0.1:4173/',original/'matrix',cid,'v3',source,dest],e,spec['perEncodeProcessDeadlineSeconds'])
 receipt['controls'].append({'hook':hook,**result});save()
receipt['status']='COLLECTED_NOT_SEMANTICALLY_CERTIFIED'if all(x['exitCode']==0 for x in receipt['controls'])else'FAILED_CONTROL_PROCESS';save()
print(json.dumps({'caseId':cid,'status':receipt['status'],'strictOriginalDecodedIdentity':receipt['strictOriginalDecodedIdentity'],'controls':len(receipt['controls'])}))
raise SystemExit(0 if receipt['status']=='COLLECTED_NOT_SEMANTICALLY_CERTIFIED'else 1)
