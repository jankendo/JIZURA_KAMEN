#!/usr/bin/env python3
"""Fixed actual-execution population; reused ON/repeat remain explicitly historical measurements."""
import argparse,hashlib,json,os,pathlib,subprocess,zipfile,time
p=argparse.ArgumentParser();p.add_argument('spec');p.add_argument('key');p.add_argument('tools');p.add_argument('source');p.add_argument('output');a=p.parse_args()
spec=json.load(open(a.spec));g=next(x for x in spec['groups']if x['key']==a.key);tools=pathlib.Path(a.tools).resolve();source=pathlib.Path(a.source).resolve();out=pathlib.Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()==spec['sourceCommit']
root=out/'inputs';root.mkdir(exist_ok=True)
def archive(s,dest):
 dest.mkdir(parents=True,exist_ok=True);zpath=root/(str(s['artifactId'])+'.zip')
 with zpath.open('wb')as f:subprocess.run(['gh','api',f"repos/jankendo/JIZURA_KAMEN/actions/artifacts/{s['artifactId']}/zip"],stdout=f,check=True)
 assert hashlib.sha256(zpath.read_bytes()).hexdigest()==s['archiveSHA256'],'ARCHIVE_IDENTITY_MISMATCH'
 with zipfile.ZipFile(zpath)as z:
  assert all(not pathlib.PurePosixPath(n).is_absolute()and '..'not in pathlib.PurePosixPath(n).parts for n in z.namelist());z.extractall(dest)
 # Transport only. Every original artifact remains remote and manifest-bound; relevant reports/videos copied by collectors.
 zpath.unlink()
def node(tool,args,env,log):
 with log.open('w')as f:
  t=time.monotonic();r=subprocess.run(['node',str(tools/tool),*map(str,args)],env=env,stdout=f,stderr=subprocess.STDOUT)
 return {'exitCode':r.returncode,'seconds':round(time.monotonic()-t,3),'log':str(log.relative_to(out))}
original=root/'original';archive(g['original'],original)
(out/'preregistered-group.json').write_text(json.dumps(g,indent=2))
env={**os.environ,'KAMEN_COUNTERFACTUAL_PHASES':'1','KAMEN_COUNTERFACTUAL_NATIVE_HASHES':'1','KAMEN_GRAMMAR_CONTROL_SPEC':str(pathlib.Path(a.spec).parent/'grammar-policy-v2-temporal-recipe-preregistration.json')}
receipts=[]
for c in g['cases']:
 cid=c['caseId'];caseout=out/'cases'/cid;caseout.mkdir(parents=True,exist_ok=True);trace=caseout/'native';trace.mkdir()
 r={'caseId':cid,'originalVideoSHA256':c['originalVideoSHA256'],'completedControlsReusedByReference':c['completedControls'],'controls':[]};receipts.append(r)
 r['native']=node('native_dispatch_lineage_trace_v7.cjs',['http://127.0.0.1:4173/',original/'matrix',cid,'v3',trace],env,caseout/'native.log')
 if r['native']['exitCode']!=0:r['status']='FAILED_NATIVE';continue
 d=json.load(open(trace/'native-dispatch-trace.json'))
 if not d['exactNativeRGBA']:r['status']='FAILED_CURRENT_NATIVE_IDENTITY';continue
 baseline=caseout/'baseline'
 if c['baseline']:archive(c['baseline'],baseline);baseline=baseline/'controls';r['baselineMode']='REUSED_ACTUAL_TRIAD'
 else:
  baseline.mkdir();e={**env,'KAMEN_COUNTERFACTUAL_HOOK':c['newBaselineHook']}
  r['newBaseline']=node('encoded_selected_operator_controls.cjs',['http://127.0.0.1:4173/',original/'matrix',cid,'v3',source,baseline],e,caseout/'baseline.log');r['baselineMode']='NEW_ON_OFF_ON_REPEAT'
  if r['newBaseline']['exitCode']!=0:r['status']='FAILED_BASELINE';continue
 b=baseline/'effect-counterfactual-report.json';assert b.is_file()
 for idx,hook in enumerate(c['additionalOFFHooks']):
  dest=caseout/'additional'/str(idx);dest.mkdir(parents=True)
  e={**env,'KAMEN_COUNTERFACTUAL_HOOK':hook,'KAMEN_REUSE_BASELINE_REPORT':str(b),'KAMEN_CURRENT_NATIVE_TRACE':str(trace/'native-dispatch-trace.json')}
  result=node('encoded_selected_operator_off_with_baseline.cjs',['http://127.0.0.1:4173/',original/'matrix',cid,'v3',source,dest],e,caseout/('off-'+str(idx)+'.log'))
  result.update(hook=hook,scope='New OFF only; ON/repeat explicitly reused from actual same-case full baseline; no semantic success inferred.');r['controls'].append(result)
  (out/'collection-progress.json').write_text(json.dumps({'sourceCommit':spec['sourceCommit'],'receipts':receipts},indent=2))
 r['status']='COLLECTED_NOT_SEMANTICALLY_CERTIFIED'if all(x['exitCode']==0 for x in r['controls'])else'FAILED_ADDITIONAL_OFF'
report={'schema':1,'sourceCommit':spec['sourceCommit'],'specSHA256':hashlib.sha256(pathlib.Path(a.spec).read_bytes()).hexdigest(),'receipts':receipts,'semanticRealization':'UNVERIFIED','scope':'Fixed actual executed candidate families. Successful collection is not independent operator-realization success or creative improvement.'}
(out/'collection-progress.json').write_text(json.dumps(report,indent=2));print(json.dumps({'cases':len(receipts),'statusCounts':{s:sum(x.get('status')==s for x in receipts)for s in {x.get('status')for x in receipts}}}))
raise SystemExit(0 if all(x.get('status')=='COLLECTED_NOT_SEMANTICALLY_CERTIFIED'for x in receipts)else 1)
