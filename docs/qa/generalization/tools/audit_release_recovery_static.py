"""Measure all 77 provisional static targets from existing full decoded FAVs."""
import pathlib,json,gzip,subprocess,hashlib,io,ijson,math,collections
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';O=R/'release-recovery-20261019'
ledger=json.load(gzip.open(R/'grammar-policy-v2-current32-executed-intent-ledger.json.gz','rt'));spec=json.load(open(R/'grammar-policy-v2-remaining-controls-preregistration.json'))
originals={c['caseId']:c['original']['name']for g in spec['groups']for c in g['cases']};artifacts={a['binding']['videoSHA256']:a for a in ledger['artifacts']};favCache={};out=[]
def fav(artifact):
 cid=artifact['caseId']
 if cid not in favCache:
  m=json.load(open(R/originals[cid]/'archive-manifest.json'));e=next(e for e in m['files']if e['member']=='matrix/'+cid+'-v3-row.json');p=Q/e['preserved']
  raw=p.read_bytes()if p.exists()else subprocess.check_output(['git','-C',str(Q.parents[2]),'show','e5728cd330f1f2854a5ccb2e6f9ce280fac246fc:docs/qa/generalization/'+e['preserved']])
  with gzip.GzipFile(fileobj=io.BytesIO(raw))as f:assert hashlib.file_digest(f,'sha256').hexdigest()==e['SHA256']
  with gzip.GzipFile(fileobj=io.BytesIO(raw))as f:v=next(ijson.items(f,'provenance.finalArtifactVerification',use_float=True))
  assert v['binding']==artifact['binding']and v['status']=='MEASURED';favCache[cid]=v
 return favCache[cid]
for r in ledger['rows']:
 if r['classification']!='INTENTIONAL_STATIC':continue
 a=artifacts[r['videoSHA256']];v=fav(a);u=r['resolvedFinalUnitBinding'];b=a['binding'];frames=[f for f in v['frames']if f['unitId']==u.get('unitId')and f['fragmentId']==u.get('fragmentId')and f['phase']=='hold'];issues=[];native=[];decoded=[]
 if not frames:issues.append('NO_BOUND_PRIMARY_HOLD_FRAMES')
 elif frames:
  first={(g['index'],g['row'],g['character']):g for g in frames[0].get('glyphEvidence',[])}
  for f in frames:
   if f.get('pixelPresence')is not True or f.get('nativeComplete')is not True:issues.append('GLYPH_PRESENCE_OR_NATIVE_COMPLETENESS')
   current={(g['index'],g['row'],g['character']):g for g in f.get('glyphEvidence',[])}
   if set(first)!=set(current):issues.append('GLYPH_IDENTITY_POPULATION_CHANGED')
   for key,g in current.items():
    h=first.get(key)
    if not h:continue
    for field,values in [('nativeCentroid',native),('decodedCentroid',decoded)]:
     if not g.get(field)or not h.get(field):issues.append('GLYPH_CENTROID_UNMEASURED');continue
     values.append(math.dist(g[field],h[field]))
  units=[unit for unit in v['units']if unit['unitId']==u.get('unitId')];fragment=next((f for unit in units for f in unit['fragments']if f['id']==u.get('fragmentId')),None)
  if fragment:
   start,end=fragment['hold'];origin=b['outputProfile']['range'][0];fps=b['outputProfile']['fps'];expected=[origin+i/fps for i in range(a['nativeFrames'])if start<=origin+i/fps<end];actual=[f['actualDecodedTimestamp']for f in frames]
   if len(actual)!=len(expected)or any(abs(x-y)>1e-7 for x,y in zip(actual,expected)):issues.append('FULL_HOLD_CLOCK_COVERAGE_MISMATCH')
  else:issues.append('FINAL_FRAGMENT_NOT_BOUND')
 maxNative=max(native,default=None);maxDecoded=max(decoded,default=None)
 status='UNMEASURED'if issues else'PRIMARY_COMPOSITE_STATIC_OBSERVED'if maxNative is not None and maxDecoded is not None and maxNative<=1 and maxDecoded<=1 else'COMPOSITE_MOTION_REQUIRES_LOCAL_VS_ASSEMBLED_CONTRACT_AUDIT'
 out.append({'intentId':r['intentId'],'caseId':a['caseId'],'sourceCommit':r['sourceCommit'],'videoSHA256':r['videoSHA256'],'unitId':u.get('unitId'),'fragmentId':u.get('fragmentId'),'operator':r['operator'],'nativeMaximumGlyphDriftPixels':maxNative,'decodedMaximumGlyphDriftPixels':maxDecoded,'observedHOLDFrames':len(frames),'issues':sorted(set(issues)),'status':status,'formalReleaseStatus':'UNVERIFIED_NO_INDEPENDENT_STATIC_SENSOR_CONTROL_OR_FINALIZED_CONTRACT','criterion':'Existing Q.measureFinalOperatorIntent hold <=1 output pixel. This records primary composite motion; an identity HOLD setting does not imply composite stillness.'})
assert len(out)==77
summary={'sourceCommit':ledger['sourceCommit'],'targets':len(out),'statuses':dict(collections.Counter(r['status']for r in out)),'rows':out,'additionalMP4s':0,'additionalDecodes':0,'releaseCredit':False}
(O/'static-target-audit.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print({k:v for k,v in summary.items()if k!='rows'})
