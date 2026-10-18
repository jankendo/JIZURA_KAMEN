"""Preserve source-bound three-version inputs and partial completion; no aesthetic verdict."""
from pathlib import Path
import json,gzip,hashlib,statistics
Q=Path(__file__).resolve().parents[1];R=Q/'composition-recovery';S='d04c734bc5eb0c0c427a42a196cae3a507b89506';SOURCES={'main':'2e7ed477f88028dbb63aa609e8a11b4052ea8c00','previous':'5e14682249ce690337874214f2ec76fc8e68fa26','current':S}
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def member(archive,name):
 m=read(R/archive/'archive-manifest.json');e=next(x for x in m['files']if x['member']==name);p=Q/e['preserved'];raw=gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes();assert sha(raw)==e['SHA256'];return json.loads(raw),e['SHA256']
def invariant(d):return {'fixture':d['fixture'],'input':d['input'],'audioWAVSHA256':d.get('audioWAVSHA256',d.get('referenceInputs',{}).get('audioSHA256')),'pcmHash':d.get('pcmHash',d.get('sourceInvariant',{}).get('pcmHash')),'outputProfile':d.get('outputProfile',d.get('provenance',{}).get('finalArtifactVerification',{}).get('binding',{}).get('outputProfile'))}
def version(d):return {'binding':d['provenance']['finalArtifactVerification']['binding'],'fullDecode':'PASS','lyricSafety':d['provenance']['finalArtifactVerification']['status'],'metrics':d['decoded']['metrics']}
spec=read(R/'grammar-policy-v2-final30-frozen-inputs.json');assert spec['sourceCommit']==S;population=[x['id']for x in spec['fixtures']];assert len(population)==len(set(population))==30
old={x['fixture']:x for x in read(R/'final-source-three-version-comparison.json')['rows']};current={}
for root in sorted(R.glob('grammar-policy-v2-focused-*'))+sorted(R.glob('grammar-policy-v2-final30-*')):
 if not root.is_dir()or not(root/'archive-manifest.json').is_file():continue
 for p in sorted((root/'matrix').glob('*-v3-row.json.gz')):
  name=p.name.removesuffix('-v3-row.json.gz')
  if name not in population:continue
  assert name not in current,'DUPLICATE_CURRENT_CHOSEN_CASE';d,rawsha=member(root.name,'matrix/'+p.name.removesuffix('.gz'));assert d['fixture']['id']==name;current[name]=(root,d,rawsha)
rows=[]
for case in population:
 if case not in current:rows.append({'fixture':case,'status':'UNVERIFIED_CURRENT_MOVIE_PENDING'});continue
 root,d,rawsha=current[case];v=version(d);assert v['binding']['sourceCommit']==S and d['sha256']==v['binding']['videoSHA256']and d['status']=='PASS'and v['lyricSafety']=='MEASURED'
 decode,_=member(root.name,'strict-decode.json');entry=next(x for x in decode['entries']if x['fixture']==case);assert entry['completeDecode']=='PASS'and entry['videoSHA256']==d['sha256'];corrnew,_=member(root.name,'original-input-correspondence.json');nc=next(x for x in corrnew['records']if x['fixture']==case);assert nc['status']=='MATCHED'and all(nc['checks'].values())
 trace,_=member(root.name,'dispatch/'+case+'/native-dispatch-trace.json');assert trace['exactNativeRGBA']and trace['videoSHA256']==d['sha256']and trace['artifactBinding']==v['binding']
 if case=='development-11':
  archive='automatic-contract-pcm-development-11';previous,_=member(archive,'previous/'+case+'-v3-row.json');main,_=member(archive,'matrix/'+case+'-baseline-row.json');versions={'main':version(main),'previous':version(previous),'current':v}
 else:
  assert old[case]['status']=='MATCHED';archive=old[case]['inputCorrespondenceProof']['archive'];versions={k:old[case]['versions'][k]for k in ['main','previous']};versions['current']=v
 corr,correspondenceSHA=member(archive,'pcm-correspondence.json');assert corr['status']=='MATCHED'and all(corr['checks'].values());iv=invariant(d);checks={}
 for label in ['main','previous']:
  source=SOURCES[label];matched=[x for x in corr['rows']if x['sourceCommit']==source];assert len(matched)==1;other=matched[0];checks[label]=iv==invariant(other);assert other['videoSHA256']==versions[label]['binding']['videoSHA256']
 for label,x in versions.items():
  b=x['binding'];assert b['sourceCommit']==SOURCES[label];assert x.get('fullDecode',x.get('decode'))=='PASS';assert sha((Q/'media'/(b['videoSHA256']+'.mp4')).read_bytes())==b['videoSHA256']
 status='MATCHED'if all(checks.values())else'CONFOUNDED';rows.append({'fixture':case,'status':status,'checks':checks,'versions':versions,'currentArchive':root.name,'currentRowSHA256':rawsha,'historicalCorrespondenceArchive':archive,'historicalCorrespondenceSHA256':correspondenceSHA,'nativeFrames':trace['outputFramesSampled'],'inputHashCaveat':'Renderer-bound inputHash retained separately; direct authored fixture/input/WAV/PCM/profile correspondence is checked. Different renderer hashes are never rewritten.'})
complete=[x for x in rows if x['status']=='MATCHED'];stats=None
if len(complete)==30:
 stats={}
 for metric in sorted({k for row in complete for x in row['versions'].values()for k in x['metrics']}):
  measured=[row for row in complete if all(isinstance(row['versions'][v]['metrics'].get(metric),(int,float))for v in SOURCES)];item={'jointlyMeasuredConditions':len(measured),'population':30,'status':'MEASURED'if len(measured)==30 else'UNMEASURED_OR_INCOMPLETE'}
  if len(measured)==30:
   values={v:[row['versions'][v]['metrics'][metric]for row in measured]for v in SOURCES};item['versions']={v:{'mean':statistics.mean(xs),'worst':min(xs),'lower20Count':6,'lower20Mean':statistics.mean(sorted(xs)[:6])}for v,xs in values.items()}
   item['currentComparedWith']={v:{'improved':sum(a>b for a,b in zip(values['current'],values[v])),'equal':sum(a==b for a,b in zip(values['current'],values[v])),'declined':sum(a<b for a,b in zip(values['current'],values[v]))}for v in ['main','previous']}
  stats[metric]=item
report={'schema':1,'sourceCommits':SOURCES,'frozenPopulation':population,'completedCurrent':len(current),'matchedComparisons':len(complete),'all30Comparable':len(complete)==30,'rows':rows,'aggregateStatistics':stats,'QUALITY_GO':'UNVERIFIED','HUMAN':'HUMAN_UNVERIFIED','limits':['No final-population aggregate until all30 match.','Engineering descriptors are not calibrated artistic grades. Lower numerical score alone is not automatically a major visual defect.','Current source runtime outputs are fresh; only unchanged historical main/previous movies with exact matched conditions are reused.','Independent unused confirmation is reported separately; it is not substituted for an original condition.']};(R/'grammar-policy-v2-three-version-comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
lines=['# Final v2 source-bound original30 comparison','',f"Source {S}; {len(complete)}/30 matched. No quality PASS or population aggregate inferred from incomplete results.",'','|Condition|main typography|previous typography|v2 typography|correspondence|','|---|---:|---:|---:|---|']
for x in rows:
 values=[str(x['versions'][v]['metrics'].get('typographyDiversity','UNMEASURED'))for v in SOURCES]if 'versions'in x else ['UNVERIFIED']*3;lines.append('|'+ '|'.join([x['fixture'],*values,x['status']])+'|')
(R/'grammar-policy-v2-three-version-comparison.md').write_text('\n'.join(lines)+'\n');print(json.dumps({'completedCurrent':len(current),'matched':len(complete),'total':30,'statistics':stats}))
