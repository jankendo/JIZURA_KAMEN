"""Keep original artifact identities while assembling final-source observations."""
import pathlib,json,gzip,hashlib,statistics,math,collections
QA=pathlib.Path(__file__).resolve().parents[1];R=QA/'composition-recovery'
def read(p):return json.loads(gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes())
def rawsha(p):
 h=hashlib.sha256()
 with (gzip.open(p,'rb') if p.suffix=='.gz' else p.open('rb')) as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
spec=read(R/'final-word-source-refresh-preregistration.json');base=read(R/'pcm-paired-comparison-summary.json');qualification=read(R/'final-word-source-input-qualification.json');qs={x['fixture']:x for x in qualification['cases']};refresh={f['id'] for f in spec['fixtures']};rows=[];pending=[]
for old in base['all30']:
 case=old['fixture'];new=R/('word-source-refresh-'+case)/'archive-manifest.json'
 if case in refresh:
  if not new.exists():pending.append(case);continue
  manifest=read(new);members={x['member']:x for x in manifest['files']}
  for x in members.values():assert rawsha(QA/x['preserved'])==x['SHA256'],'CANONICAL_MEMBER_SHA_MISMATCH'
  pcm=read(QA/members['pcm-correspondence.json']['preserved']);assert pcm['status']=='MATCHED' and all(pcm['checks'].values()),'PCM_OR_INPUT_CONFOUNDED'
  trials=[];decodes=[]
  for name in ['matrix/results.json','previous/results.json']:trials+=read(QA/members[name]['preserved'])['rows']
  for name in ['strict-decode.json','previous-strict-decode.json']:decodes+=read(QA/members[name]['preserved'])['entries']
  assert len(trials)==3 and all(t['fixture']['id']==case and t['fixture']==next(f for f in spec['fixtures'] if f['id']==case) for t in trials)
  vs={}
  for t in trials:
   fav=t['provenance']['finalArtifactVerification'];b=fav['binding'];key=next(k for k,v in {'main':'2e7ed477f88028dbb63aa609e8a11b4052ea8c00','previous':'5e14682249ce690337874214f2ec76fc8e68fa26','current':spec['sourceCommit']}.items() if v==b['sourceCommit']);assert key not in vs
   decoded=[x for x in decodes if x['fixture']==case and x['variant']==t['variant'] and x['videoSHA256']==t['sha256']];assert len(decoded)==1 and decoded[0]['completeDecode']=='PASS' and decoded[0]['codec']=='H.264/AAC';assert t['status']=='PASS' and b['videoSHA256']==t['sha256'];assert key!='current' or fav['status']=='MEASURED','Final-source lyric safety not measured'
   vs[key]={'sourceCommit':b['sourceCommit'],'videoSHA256':t['sha256'],'binding':b,'metrics':t['decoded']['metrics'],'lyricSafety':fav['status'],'fullDecode':'PASS'}
  rows.append({'fixture':case,'observationStatus':'FRESH_FINAL_SOURCE_THREE_VERSION_MEASURED','versions':vs,'PCM':'MATCHED','archiveManifestSHA256':hashlib.sha256(new.read_bytes()).hexdigest()})
 else:
  q=qs[case];assert q['status']=='INPUT_BRANCH_FALSE_AND_EXACT_FROZEN_NATIVE_IDENTITY';currentVideo=old['versions']['current']['videoSHA256'] if 'versions' in old else old['currentVideoSHA256'];assert currentVideo==q['originalEncodedArtifactBinding']['videoSHA256']
  if 'versions' in old:vs={'main':old['versions']['main'],'previous':old['versions']['previous5e'],'current':old['versions']['current']}
  else:vs={k:{'metrics':old[v],'videoSHA256':old[vh],'sourceCommit':source} for k,v,vh,source in [('main','main','mainVideoSHA256','2e7ed477f88028dbb63aa609e8a11b4052ea8c00'),('previous','previous5e','previousVideoSHA256','5e14682249ce690337874214f2ec76fc8e68fa26'),('current','current','currentVideoSHA256',old['currentSourceCommit'])]}
  rows.append({'fixture':case,'observationStatus':'ORIGINAL_PAIRED_MOVIES_WITH_INPUT_SCOPED_FINAL_RENDER_IDENTITY','versions':vs,'finalSourceQualification':q,'PCM':'MATCHED','limitation':'Actual encoded source fields unchanged. Frozen renderer identity and conservative all-split branch proof do not independently prove planning/candidate/UI equivalence; full source-diff review remains required.'})
def stats(v):
 a=sorted(v);return {'n':len(a),'mean':statistics.mean(a),'worst':a[0],'lower20Mean':statistics.mean(a[:max(1,math.ceil(len(a)*.2))])} if a else {'n':0}
result={'schema':1,'finalSourceCommit':spec['sourceCommit'],'declaredConditions':30,'availableConditions':len(rows),'freshConditionsPending':pending,'observationStates':dict(collections.Counter(r['observationStatus'] for r in rows)),'sourceDiffPlanningEquivalenceReview':'UNVERIFIED','rows':rows,'statistics':{},'QUALITY_GO':'UNVERIFIED','human':'HUMAN_UNVERIFIED'}
for metric in ['typographyDiversity','lyricForegroundNovelty','temporalContrast','localContrast','motionRealization','perceptualNovelty','hookNovelty']:
 vals={k:[r['versions'][k]['metrics'].get(metric) for r in rows] for k in ['main','previous','current']};result['statistics'][metric]={k:stats([x for x in v if isinstance(x,(int,float)) and math.isfinite(x)]) for k,v in vals.items()};pairs=[(a,b) for a,b in zip(vals['previous'],vals['current']) if isinstance(a,(int,float)) and isinstance(b,(int,float))];result['statistics'][metric]['versusPrevious']={'improved':sum(b>a for a,b in pairs),'same':sum(b==a for a,b in pairs),'lower':sum(b<a for a,b in pairs)}
(R/'final-word-source-matrix-summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['availableConditions','freshConditionsPending','observationStates']}))
