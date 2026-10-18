"""Register recovered raw observations without manufacturing missing alternatives or semantic verdicts."""
import pathlib,json,gzip,hashlib,subprocess,os
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';A=R/'release-current-head';S='e5060bdf523f3996c6bac76fbc2415d7984ba79d';M='4f4e8aaaf34474e79acfb4b386a3b76284ce5d4f';repo=pathlib.Path('/workspace/kamen-late-semantic-travel')
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):return json.loads(gzip.decompress(p.read_bytes())) if p.suffix=='.gz' else json.loads(p.read_bytes())
def ref(p):return {'path':os.path.relpath(p,A),'sha256':sha(p.read_bytes())}
def write(n,d):
 p=A/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');return ref(p)
def git(*args):return subprocess.check_output(['git','-C',str(repo),*args])
old=Q/'final-gates.json';archive=R/'active-9a1-gates-before-e506-registration.json.gz'
if not archive.exists():archive.write_bytes(gzip.compress(old.read_bytes(),mtime=0))
oldcontext=read(A/'context.json');oldcontext['sourceCommit']=S;write('context.json',oldcontext)
jobs=read(R/'official-e506-ci-recovery-manifest/original-jobs.json')['jobs'];build=next(x for x in jobs if x['name']=='build');steps={x['name']:x for x in build['steps']};print('official build steps',list(steps))
rawroot=R/'official-e506-ci-original';runpath=R/'official-e506-ci-recovery-manifest/original-run.json.gz';run=read(runpath);assert run['head_sha']==S and run['conclusion']=='success'
ci={'sourceCommit':S,'headSha':run['head_sha'],'conclusion':run['conclusion'],'url':run['html_url'],'rawRun':ref(runpath),'rawJobs':ref(R/'official-e506-ci-recovery-manifest/original-jobs.json'),'deployment':'SKIPPED_NORMAL_PR'}
refs={'ci':write('ci.json',ci)}
# Actual synthetic PR merge checkout is retained. The complete Git tree is identical.
assert git('diff','--binary',M,S)==b''
assert git('rev-parse',M+'^{tree}')==git('rev-parse',S+'^{tree}')
diff=git('diff','--no-ext-diff','--no-renames','--binary',M,S,'--');assessment=write('official-merge-runtime-assessment.json',{'sourceCommit':S,'fromCommit':M,'toCommit':S,'gitDiffSHA256':sha(diff),'paths':[],'reason':'Actual full commit Git trees identical; no source/renderer/workflow difference.'})
def nonworkflowtree(rev):
 rows=git('ls-tree','-r','-z',rev).decode().split('\0');rows=[r for r in rows if r and not r.split('\t')[1].startswith('.github/workflows/')];return sha('\0'.join(rows).encode())
proof=write('official-merge-runtime-tree.json',{'sourceCommit':S,'fromCommit':M,'toCommit':S,'beforeRuntimeTreeSHA256':nonworkflowtree(M),'afterRuntimeTreeSHA256':nonworkflowtree(S),'excludedPrefixes':['.github/workflows/'],'fullBeforeGitTree':git('rev-parse',M+'^{tree}').decode().strip(),'fullAfterGitTree':git('rev-parse',S+'^{tree}').decode().strip()})
corr=write('official-merge-source-correspondence.json',{'sourceCommit':S,'fromCommit':M,'toCommit':S,'gitDiffSHA256':sha(diff),'changedPaths':[],'runtimeAssessment':assessment,'runtimeTreeProof':proof})
reportpath=rawroot/'kamen-browser-qa/report.json.gz';report=read(reportpath);binding=report['provenance']['finalArtifactVerification']['binding'];assert binding['sourceCommit']==M and binding['sourceDirty']==False
# An observed successful step supplies exit success; the original per-test JSON supplies each test status.
def step_exit(names):
 found=[x for x in build['steps'] if any(n.lower() in x['name'].lower() for n in names)];assert found,'STEP_NOT_FOUND '+str(names)
 assert all(x['status']=='completed' for x in found)
 return 0 if all(x['conclusion']=='success' for x in found) else 1
rawtests=read(rawroot/'kamen-tests.json.gz');cases=[]
for t in rawtests['tests']:
 c={'id':t['name'],'status':t['status']}
 if t['status']=='SKIP':c.update(reason='Node-only runner: browser APIs absent; formal SKIP retained. Actual exact-source alternative must be supplied separately.')
 else:c['exitCode']=0 if t['status']=='PASS' else 1
 cases.append(c)
tests={'sourceCommit':M,'officialPRHead':S,'cases':cases,'raw':ref(rawroot/'kamen-tests.json.gz'),'install':{'exitCode':step_exit(['Install locked dependencies']),'rawJobs':ci['rawJobs']},'build':{'exitCode':step_exit(['Build production files']),'outputSHA256':report['environment']['runtimeSHA256'],'outputScope':'Actual built runtime HTML response SHA256 from browser runner, not a whole dist tree hash.','rawJobs':ci['rawJobs'],'rawBrowser':ref(reportpath)}}
refs['tests']=write('tests.json',tests)
checks={x['name']:x for x in report['checks']};assert report['status']=='PASS' and not report['pageErrors'] and not report['resourceFailures']
probe=read(rawroot/'kamen-browser-qa/cancellation-retry/probe-summary.json.gz');boundary=read(rawroot/'kamen-browser-qa/ui-boundary/report.json.gz');assert probe['status']=='PASS' and boundary['status']=='PASS'
ops=[]
for ident,check in [('generation','automatic MV generation'),('oneClickExport','UI MP4 export and decode'),('save','UI MP4 export and decode'),('restore','project save and reload')]:
 ops.append({'id':ident,'completed':checks[check]['status']=='PASS','traceSHA256':sha(gzip.decompress(reportpath.read_bytes())),'raw':ref(reportpath)})
for ident in ['cancel','retry']:
 ok=probe['cancellation']['status']=='PASS' if ident=='cancel' else probe['retryFullDecode']=='PASS'
 ops.append({'id':ident,'completed':ok,'traceSHA256':sha(gzip.decompress((rawroot/'kamen-browser-qa/cancellation-retry/probe-summary.json.gz').read_bytes())),'raw':ref(rawroot/'kamen-browser-qa/cancellation-retry/probe-summary.json.gz')})
invalid=next(x for x in boundary['cases'] if x.get('state')=='INVALID_MP4');ops.append({'id':'rejectInvalidMP4','completed':invalid['outcome']['fileState']=='FAILED_TECHNICAL','traceSHA256':sha(gzip.decompress((rawroot/'kamen-browser-qa/ui-boundary/report.json.gz').read_bytes())),'raw':ref(rawroot/'kamen-browser-qa/ui-boundary/report.json.gz'),'scope':'Real browser UI boundary; validated MP4 reused and invalid MP4 injected. Not a separate fresh encode.'})
refs['browser']=write('browser.json',{'sourceCommit':M,'actualBrowser':True,'browser':report['browser'],'operations':ops,'raw':ref(reportpath),'saveMeaning':'Download saved and independently decoded; SAVE_AVAILABLE alone is not an OS picker completion claim.'})
summary=read(R/'e506-final30-observation-summary.json');movies=[]
for row in summary['rows']:
 b=row['binding'];p=Q/'media'/str(b['videoSHA256']+'.mp4');assert sha(p.read_bytes())==b['videoSHA256'] and row['completeDecode']=='PASS'
 raw={'sourceCommit':S,'videoSHA256':b['videoSHA256'],'decodeExitCode':0,'decodeComplete':True,'rawDecode':ref(R/f"final-contract30-{next(i for i in range(6) if (R/f'final-contract30-{i}/matrix'/f'{row["fixture"]}-v3-row.json.gz').exists())}"/'strict-decode.json.gz'),'rawRow':{'path':os.path.relpath(Q/row['rawRow']['path'],A),'sha256':row['rawRow']['sha256']}}
 rawref=write('movies/'+row['fixture']+'.json',raw)
 movies.append({'id':row['fixture'],'videoSHA256':b['videoSHA256'],'inputHash':b['inputHash'],'planHash':b['planHash'],'outputProfile':b['outputProfile'],'rendererVersion':b['rendererVersion'],'selectedCandidateId':b['selectedCandidateId'],'decodeExitCode':0,'decodeComplete':True,'codecVideo':'h264','codecAudio':'aac','hasVideo':True,'hasAudio':True,'hashMatches':True,'observation':rawref})
refs['artifacts']=write('finished-artifacts.json',{'sourceCommit':S,'movies':movies,'scope':'Thirty actual chosen e506 movies; rejected trial clips preserved separately, not counted as chosen.'})
refs['comparisons']=write('comparisons.json',{'sourceCommit':S,'expectedConditionIds':[x['fixture'] for x in summary['rows']],'conditions':[{'id':x['fixture'],'sameInput':x['pairedEligible'],'sameSeed':x['checks']['fixture'],'sameProfile':x['checks']['outputProfile'],'actualDecodedComparison':True,'significantRegression':None,'lyricSafetyFailed':None,'movies':[],'observedDescriptors':x['metrics'],'reason':'Descriptor and Native observations do not by themselves establish resolution of creative regressions; development-11 PCM mismatch remains.'} for x in summary['rows']],'independent':summary['independent'],'raw':ref(R/'e506-final30-observation-summary.json')})
# Preserve an explicit missing population/measurement state until the executed inventory is registered.
refs['operators']=write('operators.json',{'sourceCommit':S,'expectedImportantIntentIds':[],'observations':[],'reason':'Executed Native inventory available; encoded isolated semantic controls and full important population not yet registered. No implicit PASS.'})
refs['safety']=write('safety.json',{'sourceCommit':S,'knownMajorDefects':None,'lyricMissing':None,'audioBroken':None,'manualLocksChanged':0 if all(x['manualLockUnchanged'] for x in summary['rows']) else None,'allTargetPathsBound':None,'finalArtifactMatchesSource':True,'pathObservations':[],'reason':'All thirty chosen FAV MEASURED and decode PASS, but this does not certify complete target-path safety or unresolved important semantic intent.'})
write('release-gate-manifest.json',{'releaseSourceCommit':S,'gitRepository':os.path.relpath(repo,A),'sourceCorrespondence':[corr],'evidence':refs,'scope':'Raw successful observations registered, missing measurements remain UNVERIFIED. Experimental d6fe is separate and has no release credit.'})
print('Registered seven real/missing observation families for unchanged evaluator')
