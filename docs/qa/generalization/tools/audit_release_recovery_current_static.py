"""Measure all 77 provisional static targets from existing full decoded FAVs."""
import pathlib,json,gzip,subprocess,hashlib,io,ijson,math,collections
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';O=R/'release-recovery-20261019'
ledger=json.load(gzip.open(O/'current31-partial-population.json.gz','rt'));artifacts={};favCache={};out=[]
for p in (O/'current31-results').glob('*/import.json'):
 a=json.loads(p.read_text());t=json.load(gzip.open(p.parent/'dispatch'/a['caseId']/'native-dispatch-trace.json.gz','rt'));a['nativeFrames']=len(t['nativeFrameHashes']);artifacts[a['videoSHA256']]=a
def fav(artifact):
 cid=artifact['caseId']
 if cid not in favCache:
  row=json.load(gzip.open(O/'current31-results'/cid/'matrix'/(cid+'-v3-row.json.gz'),'rt'));v=row['provenance']['finalArtifactVerification'];assert v['binding']==artifact['binding']and v['status']=='MEASURED';favCache[cid]=v
 return favCache[cid]
for r in ledger['rows']:
 if r['classification']!='INTENTIONAL_STATIC':continue
 a=artifacts[r['videoSHA256']];v=fav(a);u=r['resolvedFinalUnitBinding'];b=a['binding'];frames=[f for f in v['frames']if f['unitId']==u.get('unitId')and f['fragmentId']==u.get('fragmentId')and f['phase']=='hold'];issues=[];native=[];decoded=[];nativeBounds=[];decodedBounds=[]
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
    for field,values in [('nativeInkBounds',nativeBounds),('decodedInkBounds',decodedBounds)]:
     x,y=g.get(field),h.get(field)
     if not x or not y:issues.append('GLYPH_OUTLINE_BOUNDS_UNMEASURED');continue
     values.append(max(math.hypot(x['x0']-y['x0'],x['y0']-y['y0']),math.hypot(x['x1']-y['x1'],x['y1']-y['y1'])))
  units=[unit for unit in v['units']if unit['unitId']==u.get('unitId')];fragment=next((f for unit in units for f in unit['fragments']if f['id']==u.get('fragmentId')),None)
  if fragment:
   start,end=fragment['hold'];origin=b['outputProfile']['range'][0];fps=b['outputProfile']['fps'];expected=[origin+i/fps for i in range(a['nativeFrames'])if start<=origin+i/fps<end];actual=[f['actualDecodedTimestamp']for f in frames]
   if len(actual)!=len(expected)or any(abs(x-y)>1e-7 for x,y in zip(actual,expected)):issues.append('FULL_HOLD_CLOCK_COVERAGE_MISMATCH')
  else:issues.append('FINAL_FRAGMENT_NOT_BOUND')
 maxNative=max(native,default=None);maxDecoded=max(decoded,default=None)
 status='UNMEASURED'if issues else'CENTROID_AND_BOUNDS_STABLE_FULL_RASTER_UNVERIFIED'if maxNative is not None and maxDecoded is not None and maxNative<=1 and maxDecoded<=1 and max(nativeBounds,default=math.inf)<=1 and max(decodedBounds,default=math.inf)<=1 else'COMPOSITE_MOTION_REQUIRES_LOCAL_VS_ASSEMBLED_CONTRACT_AUDIT'
 out.append({'intentId':r['intentId'],'caseId':a['caseId'],'sourceCommit':r['sourceCommit'],'videoSHA256':r['videoSHA256'],'unitId':u.get('unitId'),'fragmentId':u.get('fragmentId'),'operator':r['operator'],'nativeMaximumGlyphDriftPixels':maxNative,'decodedMaximumGlyphDriftPixels':maxDecoded,'nativeMaximumBoundsCornerDriftPixels':max(nativeBounds,default=None),'decodedMaximumBoundsCornerDriftPixels':max(decodedBounds,default=None),'observedHOLDFrames':len(frames),'issues':sorted(set(issues)),'status':status,'formalReleaseStatus':'UNVERIFIED_NO_INDEPENDENT_STATIC_SENSOR_CONTROL_OR_FINALIZED_CONTRACT','criterion':'Centers and bbox corners may refute static claims; their stability cannot certify unchanged full ink shape. World-space raster and independent sensitivity control remain required. An identity HOLD setting does not imply composite stillness.'})
assert len(out)==sum(r['classification']=='INTENTIONAL_STATIC'for r in ledger['rows'])
summary={'sourceCommit':ledger['sourceCommit'],'targets':len(out),'statuses':dict(collections.Counter(r['status']for r in out)),'rows':out,'additionalMP4s':0,'additionalDecodes':0,'releaseCredit':False}
(O/'current-static-target-audit.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print({k:v for k,v in summary.items()if k!='rows'})
