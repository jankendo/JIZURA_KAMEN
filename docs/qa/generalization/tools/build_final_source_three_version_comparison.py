"""Exact-source comparison; incomplete correspondence never enters aggregates."""
import json,pathlib,hashlib,statistics,gzip
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery'
def read(n):return json.loads((R/n).read_text())
def member(archive,name):
 m=read(archive+'/archive-manifest.json');x=next(x for x in m['files'] if x['member']==name);p=Q/x['preserved'];b=gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes();assert hashlib.sha256(b).hexdigest()==x['SHA256'];return json.loads(b),x['SHA256']
def invariant(row):return {'fixture':row['fixture'],'input':row['input'],'audioWAVSHA256':row.get('audioWAVSHA256',row.get('referenceInputs',{}).get('audioSHA256')),'pcmHash':row.get('pcmHash',row.get('sourceInvariant',{}).get('pcmHash')),'outputProfile':row.get('outputProfile',row.get('provenance',{}).get('finalArtifactVerification',{}).get('binding',{}).get('outputProfile'))}
old=read('final-word-source-matrix-summary.json');progress=read('final-source-current23-progress.json');selected=read('final-fresh30-selected-artifacts.json');current={a['fixture']:a for a in selected['artifacts']};historical={a['fixture']:a for a in old['rows']};initial=set(progress['initialFreshFinalSourceConditions']);accepted={a['fixture'] for a in progress['additionalFreshCompleted'] if a['originalInputCorrespondence']=='MATCHED'};replays={a['fixture']:a for a in progress['strictSameRunnerReplays']};sources={'main':'2e7ed477f88028dbb63aa609e8a11b4052ea8c00','previous':'5e14682249ce690337874214f2ec76fc8e68fa26','current':selected['sourceCommit']};rows=[]
for case,a in sorted(current.items()):
 if case in replays:versions=replays[case]['versions'];method='STRICT_SAME_RUNNER_THREE_SOURCE_REPLAY'
 elif case in initial or case in accepted:
  versions={v:historical[case]['versions'][v] for v in ['main','previous']};versions['current']={'binding':a['binding'],'fullDecode':a['fullDecode'],'lyricSafety':a['FAVStatus'],'metrics':a['currentMetrics']};method='ORIGINAL_INPUT_WAV_PCM_PROFILE_MATCH_VERIFIED'
 else:rows.append({'fixture':case,'status':'PENDING_IDENTICAL_INPUT_PCM_COMPARISON','currentOnlyBinding':a['binding'],'crossVersionMetrics':None});continue
 for v,d in versions.items():
  assert d['binding']['sourceCommit']==sources[v] and d.get('fullDecode',d.get('decode'))=='PASS'
  video=Q/'media'/(d['binding']['videoSHA256']+'.mp4');assert hashlib.sha256(video.read_bytes()).hexdigest()==d['binding']['videoSHA256']
 assert versions['current']['binding']['videoSHA256']==a['binding']['videoSHA256']
 assert all(versions[v]['binding']['outputProfile']==a['binding']['outputProfile'] for v in sources)
 archive=replays[case]['archive']if case in replays else 'word-source-refresh-'+case if case in initial else 'pcm-paired-'+case
 corr,corrSHA=member(archive,'pcm-correspondence.json');assert corr['status']=='MATCHED' and all(corr['checks'].values())
 for v in ['main','previous']:
  c=[x for x in corr['rows']if x['sourceCommit']==sources[v]];assert len(c)==1 and c[0]['videoSHA256']==versions[v]['binding']['videoSHA256']
 actual,actualSHA=member(a['archive'],'matrix/'+case+'-v3-row.json');iv=invariant(actual);assert all(v is not None for v in iv.values())
 for c in corr['rows']:
  other=invariant(c);assert iv==other,(case,'AUTHORED_INPUT_WAV_PCM_PROFILE_MISMATCH')
 proof={'archive':archive,'correspondenceSHA256':corrSHA,'actualCurrentRowSHA256':actualSHA,'authoredInputWAVPCMProfileAllEqual':True,'rendererBoundInputHashes':{v:versions[v]['binding']['inputHash']for v in sources},'inputHashCaveat':'Each immutable inputHash also contains rendererVersion. Cross-source hashes are preserved separately; actual fixture/input/WAV/PCM/profile fields are checked independently, never rewritten.'}

 rows.append({'fixture':case,'status':'MATCHED','method':method,'inputCorrespondenceProof':proof,'versions':versions})
complete=[r for r in rows if r['status']=='MATCHED'];assert len(complete)==progress['matchedComparisonConditionCount'];assert len(rows)==30
stats=None
if len(complete)==30:
 stats={}
 for metric in sorted({k for r in complete for d in r['versions'].values()for k in d['metrics']}):
  values={v:[r['versions'][v]['metrics'].get(metric)for r in complete]for v in sources};counts={v:sum(isinstance(x,(int,float))for x in xs)for v,xs in values.items()};entry={'measuredCounts':counts,'status':'MEASURED'if all(n==30 for n in counts.values())else'UNMEASURED_OR_INCOMPLETE'}
  if entry['status']=='MEASURED':
   entry['versions']={v:{'mean':statistics.mean(xs),'worst':min(xs),'lower20Mean':statistics.mean(sorted(xs)[:6])}for v,xs in values.items()}
   for v in ['main','previous']:
    delta=[a-b for a,b in zip(values['current'],values[v])];entry['currentVs'+v.title()]={'improved':sum(x>0 for x in delta),'equal':sum(x==0 for x in delta),'declined':sum(x<0 for x in delta)}
  stats[metric]=entry
report={'schema':1,'sourceCommits':sources,'fixedConditionCount':30,'matchedConditionCount':len(complete),'all30Comparable':len(complete)==30,'aggregateStatistics':stats,'rows':rows,'scope':'Engineering descriptors and FAV states, not calibrated artistic grades. No aggregate cross-version claim until all 30 match. Previous failures and input mismatches remain preserved.','QUALITY_GO':'UNVERIFIED','HUMAN':'HUMAN_UNVERIFIED'};(R/'final-source-three-version-comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
lines=['30-condition exact-source comparison. Pending rows are excluded; no partial-population aggregate claim.','', '|Condition|main typography|previous typography|current typography|correspondence|','|---|---:|---:|---:|---|']
for r in rows:
 vals=[str(r['versions'][v]['metrics'].get('typographyDiversity','UNMEASURED'))for v in sources]if r['status']=='MATCHED'else['UNVERIFIED']*3;lines.append('|'+ '|'.join([r['fixture'],*vals,r['status']])+'|')
(R/'final-source-three-version-comparison.md').write_text('\n'.join(lines)+'\n');print({'matched':len(complete),'total':30,'all30Comparable':len(complete)==30,'statistics':stats})
