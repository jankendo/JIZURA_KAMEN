import json,gzip,hashlib,datetime,urllib.request
from pathlib import Path
p=Path('/workspace/kamen-next-evidence/docs/qa/generalization/composition-recovery');out=p/'release9f-current-observations';source='9f805e269e1e34ffb232117a5cb19a699ae0b94d'
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,d):
 b=(json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode();(out/n).write_bytes(b);return {'path':n,'sha256':sha(b)}
def locator(path):
 b=path.read_bytes();return {'path':str(path),'sha256':sha(b)}
api='https://api.github.com/repos/jankendo/JIZURA_KAMEN/actions/runs/'
runs={}
for rid in [38693458381,38693303491,38678201061]:
 raw=urllib.request.urlopen(api+str(rid)).read();d=json.loads(raw);rf=dump('github-run-'+str(rid)+'.json',d)
 jobs=json.load(urllib.request.urlopen(api+str(rid)+'/jobs?per_page=100'));jf=dump('github-jobs-'+str(rid)+'.json',jobs)
 runs[rid]={'sourceCommit':d['head_sha'],'headSha':d['head_sha'],'status':d['status'],'conclusion':d['conclusion'],'url':d['html_url'],'rawRun':rf,'rawJobs':jf}
ci=dump('current-ci.json',runs[38693458381]);dump('historical-ci987.json',runs[38678201061]);dump('interrupted-matrix-recovery.json',runs[38693303491])
archive=json.loads((p/'ci987-validation/archive-manifest.json').read_text());root=p.parent
files={f['member']:f for f in archive['files']}
def readmember(n):
 f=files[n];path=root/f['preserved'];stored=path.read_bytes();b=gzip.decompress(stored) if path.suffix=='.gz' else stored
 assert sha(b)==f['SHA256'] and len(b)==f['bytes'];return json.loads(b),{**locator(path),'uncompressedSHA256':sha(b),'archiveMember':n}
tests,tref=readmember('kamen-tests.json');report,rref=readmember('kamen-browser-qa/report.json');probe,pref=readmember('kamen-browser-qa/cancellation-retry/probe-summary.json');boundary,bref=readmember('kamen-browser-qa/ui-boundary/report.json')
trace=[f for f in archive['files'] if f['member'].startswith('trace-parts/')]
for f in trace:
 b=(root/f['preserved']).read_bytes();assert sha(b)==f['SHA256'] and len(b)==f['bytes']
dump('historical-ci987-observations.json',{'sourceCommit':runs[38678201061]['sourceCommit'],'sourceRole':'HISTORICAL_NOT_CURRENT_RELEASE_PROOF','testCounts':{k:tests[k] for k in ['total','passed','failed','skipped']},'perTestRaw':tref,'browserRaw':rref,'browserStatus':report.get('status'),'browserChecks':report.get('checks'),'oneClick':report.get('oneClick'),'pageErrors':report.get('pageErrors'),'cancellationRetryRaw':pref,'cancellationRetryStatus':probe.get('status'),'retryFullDecode':probe.get('retryFullDecode'),'uiBoundaryRaw':bref,'uiBoundaryStatus':boundary.get('status'),'uiBoundaryScope':boundary.get('evidence'),'traceParts':trace,'limitations':['No source correspondence from historical987 to release9f has been established here.','Synthetic UI boundary acceptance is separate from actual completed UI export.']})
dump('current-coverage-context.json',{'releaseSourceCommit':source,'sourceCommit':source,'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'frozenFixed30Historical':locator(p/'final5c92-fixed30-partial28-summary.json'),'sourceNative987Historical':locator(p/'effects987-native-source-continuity-summary.json'),'qualityLimitations':['28/30 fixed5c92 completed comparisons, holdout14 and15 recovery in progress at recorded GitHub snapshot.','18/28 comparison PCM conditions nonmatched or confounded.','Known metric tradeoffs require actual frame assessment; significant regression resolution is unverified, not automatically FAILED.','No complete release9f important semantic isolated encoded control population is certified.','Historical5c92 movie sourceCommit is retained; Native987 continuity alone does not certify final9f planning, QA or UI.','HUMAN_UNVERIFIED']})
print('supplemental snapshots prepared')
