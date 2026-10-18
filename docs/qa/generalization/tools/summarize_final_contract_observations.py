"""Summarize immutable e506 rows; mismatch is never included in paired aggregates."""
import pathlib,json,gzip,hashlib,statistics,math
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';SOURCE='e5060bdf523f3996c6bac76fbc2415d7984ba79d'
def read(p):return json.loads(gzip.decompress(p.read_bytes())) if p.suffix=='.gz' else json.loads(p.read_bytes())
def ref(p):return {'path':str(p.relative_to(Q)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
def stats(values):
 v=sorted(x for x in values if isinstance(x,(float,int)))
 return {'measured':len(v),'mean':statistics.mean(v) if v else None,'worst':v[0] if v else None,'lower20SampleCount':max(1,math.ceil(len(v)*.2)) if v else 0,'lower20Mean':statistics.mean(v[:max(1,math.ceil(len(v)*.2))]) if v else None}
base=read(R/'final-source-three-version-comparison.json');baseBy={x['fixture']:x for x in base['rows']};rows=[];traces=[];decode=[]
for part in range(6):
 root=R/f'final-contract30-{part}';corr=read(root/'original-input-correspondence.json.gz');by={x['fixture']:x for x in corr['records']};dec=read(root/'strict-decode.json.gz');decode.extend(dec['entries'])
 for p in sorted((root/'matrix').glob('*-row.json.gz')):
  d=read(p);fid=d['fixture']['id'];b=d['provenance']['finalArtifactVerification']['binding'];assert b['sourceCommit']==SOURCE and b['sourceDirty']==False and d['sha256']==b['videoSHA256'];old=baseBy[fid]
  trace=R/f'final-contract-native-replay-{part}'/fid/'native-dispatch-trace.json.gz';t=read(trace);assert t['exactNativeRGBA'] and t['artifactBinding']==b
  matched=by[fid]['status']=='MATCHED';metrics=d['decoded']['metrics'];prev=old['versions']['previous']['metrics'];main=old['versions']['main']['metrics'];safety=d['provenance']['finalArtifactVerification']['status']
  rows.append({'fixture':fid,'comparisonStatus':by[fid]['status'],'checks':by[fid]['checks'],'binding':b,'videoSHA256':d['sha256'],'rawRow':ref(p),'inputCorrespondence':ref(root/'original-input-correspondence.json.gz'),'completeDecode':next(x['completeDecode'] for x in dec['entries'] if x['fixture']==fid),'lyricSafety':safety,'metrics':{'main':main,'previous':prev,'current':metrics},'pairedEligible':matched,'nativeReplay':{'status':t['dispatchBindingStatus'],'frameCount':t['outputFramesSampled'],'raw':ref(trace)},'directionSelectionMethod':d['directionSelectionMethod'],'manualLockUnchanged':d['manualLockUnchanged'],'semanticTravelDiagnostics':[{k:x[k] for k in ['status','reason','beforeVideoSHA256','afterVideoSHA256'] if k in x} for x in d['semanticTravelDiagnostics']]})
assert len(rows)==30 and len({x['fixture'] for x in rows})==30
paired=[x for x in rows if x['pairedEligible']];keys=sorted(set(k for x in paired for k in x['metrics']['current']))
aggregate={}
for k in keys:
 eligible=[r for r in paired if all(isinstance(r['metrics'][v].get(k),(int,float)) for v in ['main','previous','current'])]
 aggregate[k]={'pairedCount':len(eligible),'versions':{v:stats([r['metrics'][v][k] for r in eligible]) for v in ['main','previous','current']},'vsPrevious':{s:sum((r['metrics']['current'][k]>r['metrics']['previous'][k] if s=='improved' else r['metrics']['current'][k]==r['metrics']['previous'][k] if s=='equal' else r['metrics']['current'][k]<r['metrics']['previous'][k]) for r in eligible) for s in ['improved','equal','declined']}}
independent=[]
for p in sorted(R.glob('final-contract-independent-*')):
 cur=read(next((p/'matrix').glob('*-row.json.gz')));prev=read(next((p/'previous').glob('*-row.json.gz')));check=read(p/'pcm-correspondence.json.gz');independent.append({'fixture':cur['fixture']['id'],'correspondence':check['status'],'currentBinding':cur['provenance']['finalArtifactVerification']['binding'],'previousBinding':prev['provenance']['finalArtifactVerification']['binding'],'currentMetrics':cur['decoded']['metrics'],'previousMetrics':prev['decoded']['metrics'],'currentRaw':ref(next((p/'matrix').glob('*-row.json.gz'))),'previousRaw':ref(next((p/'previous').glob('*-row.json.gz'))),'limitation':'Two actual source versions here; not a substitute for three-version gate. Prior use/adjustment history must remain explicit.'})
out={'schema':1,'sourceCommit':SOURCE,'conditionCount':30,'comparableCount':len(paired),'incomparable':[x['fixture'] for x in rows if not x['pairedEligible']],'decodePASS':sum(x['completeDecode']=='PASS' for x in decode),'lyricSafetyMeasured':sum(x['lyricSafety']=='MEASURED' for x in rows),'exactNativeCases':30,'exactNativeFrames':sum(x['nativeReplay']['frameCount'] for x in rows),'rows':rows,'pairedAggregate':aggregate,'independent':independent,'qualityVerdict':'UNVERIFIED','human':'HUMAN_UNVERIFIED','limits':['Engineering descriptors are not calibrated aesthetic grades.','Development-11 PCM mismatch excludes it from paired aggregates; no waived correspondence.','Native equality is not independent encoded semantic attribution.','Experimental d6fe runtime is not certified by e506 evidence.']}
(R/'e506-final30-observation-summary.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
lines=['# e506 final thirty immutable observations','',f"Source `{SOURCE}`. {len(paired)}/30 input comparisons matched; development-11 PCM differs. All 30 chosen movies completely decoded, FAV measured, and Native replay exactly matched. No independent semantic or artistic certification is inferred.",'','| Condition | Main typography | Previous | e506 | Correspondence |','|---|---:|---:|---:|---|']
for r in rows:lines.append('|'+r['fixture']+'|'+'|'.join(str(r['metrics'][v].get('typographyDiversity')) for v in ['main','previous','current'])+'|'+r['comparisonStatus']+'|')
lines+=['','Paired aggregate excludes mismatched PCM. Full physical descriptors and input/video/source bindings are in the accompanying JSON.']
(R/'e506-final30-observation-summary.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({k:out[k] for k in ['comparableCount','decodePASS','lyricSafetyMeasured','exactNativeCases','exactNativeFrames']}));print(json.dumps(aggregate['typographyDiversity']))
