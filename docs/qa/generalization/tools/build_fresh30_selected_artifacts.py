"""Selected shipping movies, all generated naturally by the actual final source."""
import pathlib,json,gzip,hashlib,collections
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery'
def sha(b):return hashlib.sha256(b).hexdigest()
def jsonfile(p):return json.loads(p.read_text())
cache={}
def load(archive,member):
 if archive not in cache:cache[archive]={m['member']:m for m in jsonfile(R/archive/'archive-manifest.json')['files']}
 m=cache[archive][member];p=Q/m['preserved'];b=gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes();assert sha(b)==m['SHA256'];return json.loads(b),m
old=jsonfile(R/'final-word-source-matrix-summary.json');spec=jsonfile(R/'final-source-current23-preregistration.json');cases={r['fixture'] for r in old['rows']};assert len(cases)==30;source=spec['sourceCommit'];selected={}
for row in old['rows']:
 if row['observationStatus'].startswith('FRESH'):selected[row['fixture']]='word-source-refresh-'+row['fixture']
for folder in sorted(R.glob('final-source-current23-*')):
 if not (folder/'archive-manifest.json').exists():continue
 m=jsonfile(folder/'archive-manifest.json')
 for item in m['files']:
  if item['member'].startswith('matrix/') and item['member'].endswith('-v3-row.json'):selected[pathlib.Path(item['member']).name.removesuffix('-v3-row.json')]=folder.name
# Fixed priority: completed strict same-runner comparison supersedes a historical
# input-confounded current-only observation, irrespective of its measured scores.
for folder in sorted(R.glob('final-pcm-replay-*')):
 if not (folder/'archive-manifest.json').exists():continue
 pcm,_=load(folder.name,'pcm-correspondence.json');assert pcm['status']=='MATCHED' and all(pcm['checks'].values())
 m=jsonfile(folder/'archive-manifest.json')
 for item in m['files']:
  if item['member'].startswith('matrix/') and item['member'].endswith('-v3-row.json'):selected[pathlib.Path(item['member']).name.removesuffix('-v3-row.json')]=folder.name
assert selected.keys()==cases,('Incomplete final-source population',sorted(cases-selected.keys()))
artifacts=[];population=[];settingRows=[]
for case,archive in sorted(selected.items()):
 row,m=load(archive,'matrix/'+case+'-v3-row.json');fav=row['provenance']['finalArtifactVerification'];b=fav['binding'];assert b['sourceCommit']==source and b['sourceDirty'] is False;assert b['videoSHA256']==row['sha256'] and fav['status']=='MEASURED' and row['status']=='PASS';video=Q/'media'/(row['sha256']+'.mp4');assert sha(video.read_bytes())==row['sha256'];ref,rm=load(archive,'matrix/'+case+'-v3-reference.json');assert ref['planHash']==b['planHash'];decode,_=load(archive,'strict-decode.json');valid=[x for x in decode['entries'] if x['fixture']==case and x['variant']=='v3' and x['videoSHA256']==row['sha256']];assert len(valid)==1 and valid[0]['completeDecode']=='PASS' and valid[0]['codec']=='H.264/AAC'
 artifacts.append({'fixture':case,'archive':archive,'rowSHA256':m['SHA256'],'referenceSHA256':rm['SHA256'],'binding':b,'artifactEvidenceId':fav['evidenceId'],'FAVStatus':fav['status'],'fullDecode':'PASS','currentMetrics':row['decoded']['metrics'],'directionSelectionMethod':row['directionSelectionMethod'],'naturalShippingGeneration':True,'frozenPlanControl':False})
 units={u['unitId']:u for u in fav['units']}
 for motion in fav.get('motionObservations',[]):
  assert motion['unitId'] in units;observation=motion.get('intentObservation') or {};state='VERIFIED' if observation.get('status')=='MEASURED' and observation.get('passed') is True else 'FAILED' if observation.get('status')=='MEASURED' and observation.get('passed') is False else observation.get('status','UNMEASURED');identity={'binding':b,'artifactEvidenceId':fav['evidenceId'],'unitId':motion['unitId'],'fragmentIndex':motion['fragmentIndex'],'fragmentRange':motion['fragmentRange']};population.append({'evidenceId':sha(json.dumps(identity,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()),'fixture':case,**identity,'naturalSelection':motion.get('naturalSelection') is True,'operator':motion.get('operator'),'mode':motion.get('mode'),'expectedMotion':motion.get('expectedMotion'),'semanticState':state,'intentObservation':observation,'scope':'Actual selected final-source movie only; primary composite observation, not independent nonprimary realization or aesthetic grade.'})
 for cut in ref['plan']['cuts']:
  if cut.get('line',-1)<0:continue
  ident={'binding':b,'cutIndex':cut['index'],'line':cut['line'],'start':cut['start'],'end':cut['end'],'sourceText':cut.get('text')};settingRows.append({'settingEvidenceId':sha(json.dumps(ident,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()),'fixture':case,**ident,'settings':{k:cut.get(k) for k in ['layout','enter','hold','exit','inDur','outDur','stagger','params','treat','treatP','bg','bgP','cam','camP','decor','trans','transP','transDur','grammar','cinemaV5Direction','cinemaV3Typography','cinemaV3Shot','worldIntent','photoExit','assetScene','locked']},'semanticState':'UNMEASURED','reason':'Configuration inventory is not independent encoded semantic attribution.'})
 del row,fav,units,ref
natural=[p for p in population if p['naturalSelection']]
common={'schema':1,'sourceCommit':source,'QUALITY_GO':'UNVERIFIED','HUMAN':'HUMAN_UNVERIFIED'}
(R/'final-fresh30-selected-artifacts.json').write_text(json.dumps({**common,'conditionCount':len(artifacts),'allFAVMeasured':True,'allH264AACFullyDecoded':True,'oldSourceMovieReuseCount':0,'selectionPolicy':'Strict same-runner comparison current movie, then fresh final-source current-only movie, then initial seven final-source comparison movies. No score-based choice. Original alternate observations/failures retained.','artifacts':artifacts},ensure_ascii=False,indent=2)+'\n')
(R/'final-fresh30-primary-population.json').write_text(json.dumps({**common,'primaryIntervalCount':len(population),'naturalIntervalCount':len(natural),'naturalStatuses':dict(collections.Counter(p['semanticState'] for p in natural)),'population':population,'nonPrimaryImportantEffects':'UNVERIFIED_NOT_INCLUDED'},ensure_ascii=False,indent=2)+'\n')
(R/'final-fresh30-direction-intent-ledger.json').write_text(json.dumps({**common,'artifactCount':len(artifacts),'cutSettingCount':len(settingRows),'settingsAreIndependentEffects':False,'selectedCutSettings':settingRows,'scope':'Exact final-source actual selected cut configurations; not an independently active effect denominator or realized-effect certificate.'},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'artifacts':len(artifacts),'naturalIntervals':len(natural),'naturalStatuses':dict(collections.Counter(p['semanticState'] for p in natural))}))
