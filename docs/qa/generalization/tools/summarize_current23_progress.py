"""Partial fresh-source progress; rejected historical inputs remain recorded."""
import pathlib,json,gzip,hashlib,collections
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery'
def read(p):return json.loads(gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes())
def members(folder):
 m=read(folder/'archive-manifest.json');items={x['member']:x for x in m['files']}
 def load(name):
  x=items[name];raw=gzip.decompress((Q/x['preserved']).read_bytes());assert hashlib.sha256(raw).hexdigest()==x['SHA256'];return json.loads(raw)
 return load
SOURCES={'2e7ed477f88028dbb63aa609e8a11b4052ea8c00':'main','5e14682249ce690337874214f2ec76fc8e68fa26':'previous','b002cdd75845d189221312a82456c33a131f5e8d':'current'}
spec=read(R/'final-source-current23-preregistration.json');completed=[];rejected=[];strictReplays=[]
for folder in sorted(R.glob('final-source-current23-*')):
 if not (folder/'archive-manifest.json').exists():continue
 load=members(folder);rows=load('matrix/results.json')['rows'];corr=load('original-input-correspondence.json');decode=load('strict-decode.json')['entries'];by={r['fixture']:r for r in corr['records']}
 for row in rows:
  case=row['fixture']['id'];f=row['provenance']['finalArtifactVerification'];b=f['binding'];assert SOURCES[b['sourceCommit']]=='current' and row['sha256']==b['videoSHA256'];d=[d for d in decode if d['fixture']==case and d['videoSHA256']==row['sha256']];assert len(d)==1 and d[0]['completeDecode']=='PASS' and d[0]['codec']=='H.264/AAC';assert f['status']=='MEASURED';c=by[case];assert c['videoSHA256']==row['sha256'];record={'fixture':case,'archive':folder.name,'binding':b,'fullDecode':'PASS','lyricSafety':f['status'],'metrics':row['decoded']['metrics'],'originalInputCorrespondence':c['status'],'originalChecks':c['checks']};completed.append(record)
  if c['status']!='MATCHED':rejected.append(record)
for folder in sorted(R.glob('final-pcm-replay-*')):
 if not (folder/'archive-manifest.json').exists():continue
 load=members(folder);pcm=load('pcm-correspondence.json');assert pcm['status']=='MATCHED' and all(pcm['checks'].values());rows=load('matrix/results.json')['rows']+load('previous/results.json')['rows'];decode=load('strict-decode.json')['entries']+load('previous-strict-decode.json')['entries'];versions={}
 for row in rows:
  f=row['provenance']['finalArtifactVerification'];b=f['binding'];v=SOURCES[b['sourceCommit']];assert row['sha256']==b['videoSHA256'];d=[d for d in decode if d['fixture']==row['fixture']['id'] and d['variant']==row['variant'] and d['videoSHA256']==row['sha256']];assert len(d)==1 and d[0]['completeDecode']=='PASS' and d[0]['codec']=='H.264/AAC';assert v!='current' or f['status']=='MEASURED';assert v not in versions;versions[v]={'binding':b,'fullDecode':'PASS','lyricSafety':f['status'],'metrics':row['decoded']['metrics'],'pcmFormat':row['sourceInvariant'].get('pcmFormat')}
 assert len(versions)==3;strictReplays.append({'fixture':rows[0]['fixture']['id'],'archive':folder.name,'PCM':'MATCHED','versions':versions,'supersedesHistoricalCorrespondenceRejectionOnly':True})
initial=read(R/'final-word-source-matrix-summary.json');initialCases={r['fixture'] for r in initial['rows'] if r['observationStatus'].startswith('FRESH')};new={r['fixture'] for r in completed};replayed={r['fixture'] for r in strictReplays};accepted={r['fixture'] for r in completed if r['originalInputCorrespondence']=='MATCHED'}|replayed
report={'schema':1,'sourceCommit':spec['sourceCommit'],'fixedConditionCount':30,'initialFreshFinalSourceConditions':sorted(initialCases),'additionalFreshCompleted':completed,'historicalCorrespondenceRejected':rejected,'strictSameRunnerReplays':strictReplays,'freshFinalSourceConditionCount':len(initialCases|new|replayed),'matchedComparisonConditionCount':len(initialCases|accepted),'pendingFinalSourceConditions':sorted({f['id'] for f in spec['fixtures']}-new-replayed),'scope':'Current-only movie success and matched cross-version comparison are separate. A rejected historical PCM binding never becomes matched by ignoring audio; it requires an actual same-runner replay. Metrics do not confer artistic or important-effect certification.','TECHNICAL_GO':'PASS_EXISTING_EXACT_SOURCE_CI','QUALITY_GO':'UNVERIFIED','HUMAN':'HUMAN_UNVERIFIED'};(R/'final-source-current23-progress.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print({k:report[k] for k in ['freshFinalSourceConditionCount','matchedComparisonConditionCount','pendingFinalSourceConditions']})
