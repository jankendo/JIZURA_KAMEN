"""Register recovered raw observations without manufacturing missing alternatives or semantic verdicts."""
import pathlib,json,gzip,hashlib,subprocess,os,argparse
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';A=R/'release-current-head';repo=Q.parents[2]
a=argparse.ArgumentParser();a.add_argument('--source',required=True);a.add_argument('--ci-directory',required=True);a.add_argument('--font-directory',required=True);args=a.parse_args();S=args.source;rawroot=R/'release-recovery-20261019'/args.ci_directory;M=json.loads(gzip.decompress((rawroot/'kamen-browser-qa/report.json.gz').read_bytes()))['provenance']['finalArtifactVerification']['binding']['sourceCommit']
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):return json.loads(gzip.decompress(p.read_bytes())) if p.suffix=='.gz' else json.loads(p.read_bytes())
def ref(p):return {'path':os.path.relpath(p,A),'sha256':sha(p.read_bytes())}
def write(n,d):
 p=A/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');return ref(p)
def git(*args):return subprocess.check_output(['git','-C',str(repo),*args])
oldcontext=read(A/'context.json');oldcontext['sourceCommit']=S;write('context.json',oldcontext)
jobs=read(rawroot/'jobs.json.gz')['jobs'];build=next(x for x in jobs if x['name']=='build');steps={x['name']:x for x in build['steps']};print('official build steps',list(steps))
runpath=rawroot/'run.json.gz';run=read(runpath);assert run['head_sha']==S and run['conclusion']=='success'
ci={'sourceCommit':S,'headSha':run['head_sha'],'conclusion':run['conclusion'],'url':run['html_url'],'rawRun':ref(runpath),'rawJobs':ref(rawroot/'jobs.json.gz'),'deployment':'SKIPPED_NORMAL_PR'}
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

fontroot=R/'release-recovery-20261019'/args.font_directory;font=read(fontroot/'report.json.gz');assert font['status']=='PASS'and font['build']['sourceCommit']==S and font['independentFullDecode']=='PASS'
for c in tests['cases']:
 if c['status']!='SKIP':continue
 logfile='variable-font-wrapper.log.gz'if c['id']=='variable_font_browser_test.js'else'browser-export-wrapper.log.gz'if c['id']=='browser_export_e2e_test.js'else None
 assert logfile and b'PASS'in gzip.decompress((fontroot/logfile).read_bytes())
 c['browserAlternative']=write('skip-alternatives/'+c['id']+'.json',{'sourceCommit':S,'testId':c['id'],'actualBrowser':True,'exitCode':0,'rawReport':ref(fontroot/'report.json.gz'),'rawWrapper':ref(fontroot/logfile),'scope':'Formal Node SKIP remains SKIP; separately completed actual browser wrapper and ordinary export fallback alternative.'})
refs['tests']=write('tests.json',tests)
context=read(A/'context.json');context['formalRegressionCounts']={'PASS':rawtests['passed'],'FAIL':rawtests['failed'],'SKIP':rawtests['skipped']};write('context.json',context)
manifest=read(A/'release-gate-manifest.json');assert manifest['releaseSourceCommit']==S;manifest['sourceCorrespondence']=[r for r in manifest.get('sourceCorrespondence',[]) if r!=corr]+[corr];manifest['evidence'].update(refs);write('release-gate-manifest.json',manifest)
print({'sourceCommit':S,'CI':run['conclusion'],'formal':context['formalRegressionCounts'],'actualBrowserAlternatives':sum(t['status']=='SKIP'for t in tests['cases']),'wholeGitTreeIdentical':True})
