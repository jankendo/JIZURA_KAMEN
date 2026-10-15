"""Read one gzip partition at a time. No tests/gates/sampling thresholds changed."""
import pathlib,json,gzip,sys,statistics,math
root=pathlib.Path('/workspace/kamen-next-evidence/docs/qa/generalization/composition-recovery')
load=lambda p:json.load(gzip.open(p,'rt')) if str(p).endswith('.gz') else json.loads(p.read_text())
def small(r):
 f=r.get('provenance',{}).get('finalArtifactVerification',{});b=f.get('binding',{});units=f.get('units',[])
 return {'fixture':r['fixture'],'sourceCommit':f.get('verifierIdentity',{}).get('sourceCommit'),'status':r['status'],'videoSHA256':r.get('sha256'),'input':r.get('input'),'audioWAVSHA256':r.get('referenceInputs',{}).get('audioSHA256'),'pcmHash':r.get('sourceInvariant',{}).get('pcmHash'),'binding':b,'metrics':r.get('decoded',{}).get('metrics',{}),'lyricSafety':f.get('status'),'holdMinimumContrasts':[u.get('minimumContrast') for u in units],'motionSummary':f.get('motionSummary'),'failures':f.get('failures'),'unavailable':f.get('unavailable')}
prior={}
for p in sorted((root/'final5e').glob('*/results.json.gz')):
 for r in load(p)['rows']:
  if r['variant']=='v3':prior[r['fixture']['id']]=small(r)
main={}
for p in sorted((root.parent/'formal-b5a46b7').glob('*-results.json.gz')):
 for r in load(p)['rows']:
  if r['variant']=='baseline':main[r['fixture']['id']]=small(r)
current={}
for d in sys.argv[1:]:
 for p in (root/d).rglob('results.json.gz'):
  for r in load(p)['rows']:
   if r['variant']=='v3':
    k=r['fixture']['id'];assert k not in current,'duplicate current fixture '+k;current[k]=small(r)
historical={r['fixture']:r for r in load(root/'30-condition-comparison.json')['rows']}
rows=[]
for k in sorted(prior):
 a=prior[k];c=current.get(k);h=historical.get(k,{})
 row={'fixture':k,'previous5e':a,'mainHistoricalMetrics':h.get('mainMetrics'),'mainHistoricalVideoSHA256':h.get('mainVideoSHA256'),'mainActual':main.get(k),'mainEligibility':'UNVERIFIED_CURRENT_NOT_AVAILABLE','current':c}
 if c:
  fields={'fixture':a['fixture']==c['fixture'],'input':a['input']==c['input'],'audioWAVSHA256':a['audioWAVSHA256']==c['audioWAVSHA256'],'pcmHash':a['pcmHash']==c['pcmHash'],'outputProfile':a['binding'].get('outputProfile')==c['binding'].get('outputProfile')}
  row['comparisonEligibility']={'checks':fields,'status':'MATCHED' if all(fields.values()) else 'NONMATCHED_OR_CONFOUNDED'}
  if k in main:
   m=main[k];mf={"fixture":m['fixture']==c['fixture'],"input":m['input']==c['input'],"audioWAVSHA256":m['audioWAVSHA256']==c['audioWAVSHA256'],"pcmHash":m['pcmHash']==c['pcmHash'],"outputProfile":m['binding'].get('outputProfile')==c['binding'].get('outputProfile')}
   row['mainEligibility']={'checks':mf,'status':'MATCHED' if all(mf.values()) else 'NONMATCHED_OR_CONFOUNDED'}
 rows.append(row)
def stats(values):
 v=sorted(x for x in values if isinstance(x,(int,float)) and math.isfinite(x));n=max(1,math.ceil(len(v)*.2));return {'measuredCount':len(v),'mean':statistics.mean(v) if v else None,'worst':min(v) if v else None,'lower20Mean':statistics.mean(v[:n]) if v else None}
complete=len(current)==30 and set(current)==set(prior)
out={'scope':'Raw engineering metrics, not artistic certification. Missing or nonmatched conditions are not silently pooled. Main bindings require independent verification.','complete30':complete,'expected':len(prior),'collected':len(current),'rows':rows,'statistics':{}}
if complete:
 for metric in ['typographyDiversity','lyricForegroundNovelty','temporalContrast','localContrast','motionRealization']:
  before=[r['previous5e']['metrics'].get(metric) for r in rows];after=[r['current']['metrics'].get(metric) for r in rows]
  pairs=[(a,b) for a,b in zip(before,after) if isinstance(a,(int,float)) and isinstance(b,(int,float))]
  out['statistics'][metric]={'previous5e':stats(before),'current':stats(after),'improved':sum(b>a for a,b in pairs),'same':sum(b==a for a,b in pairs),'lower':sum(b<a for a,b in pairs),'pairedCount':len(pairs),'allPairsConditionsMatched':all(r['comparisonEligibility']['status']=='MATCHED' for r in rows)}
p=root/'live5c92-fixed30-correspondence.json';p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'complete30':complete,'collected':len(current),'statistics':out['statistics']}))
