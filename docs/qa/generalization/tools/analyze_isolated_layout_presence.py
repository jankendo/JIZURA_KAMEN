"""Actual selected layout: registered complete glyph placement and isolated absence control.
Uses the inherited per-glyph positive/negative contrast checks and .5px/.9 agreement.
Not an aesthetic or optimal-composition certificate.
"""
import pathlib,json,gzip,hashlib,math
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';S='d6fe7be2fa53475dc7493f35229af6ad4f57235f'
def read(p):return json.loads(gzip.decompress(p.read_bytes())) if p.suffix=='.gz' else json.loads(p.read_bytes())
def ref(p):return {'path':str(p.relative_to(Q)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
def match_hold_populations(a,b,c,hold):
 clocks=lambda fs:[f['actualDecodedTimestamp']for f in fs]
 assert clocks(a)==clocks(b)==clocks(c),'CONTROL_FRAME_POPULATION_MISMATCH'
 if hold[1]<=hold[0]:
  assert not a,'FRAME_INSIDE_EMPTY_HOLD'
  return 'NOT_APPLICABLE_EMPTY_HOLD'
 assert a,'EXPECTED_HOLD_OBSERVATION_ABSENT'
 return 'PRESENT'
def analyze(report,reference,source=S):
 r=read(report);p=read(reference)['plan'];assert r['build']['sourceCommit']==source and not r['build']['sourceDirty'];assert r['fullNativeIdentity'] and r['nativeONRepeatIdentical'] and r['adoptedMovieReproduced'];assert r['selectedOperator'].startswith('registry:LAYOUTS:');layout=r['selectedOperator'].split(':')[-1];movies={m['mode']:m for m in r['movies']};on=movies['ON']['modeFinalArtifactVerification'];repeat=movies['ON_REPEAT']['modeFinalArtifactVerification'];negative=movies['OFF']['offAgainstOnVerification'];original=r['registeredOriginal'];assert original['status']=='MEASURED';assert negative
 assert all(m['fullDecode']=='PASS' and {'h264','aac'}.issubset({x['codec_name'] for x in m['ffprobe']['streams']}) for m in r['movies'])
 for v in [on,repeat,negative,original]:assert v['binding']['planHash']==r['planHash'] and v['binding']['inputHash']==r['inputSnapshot']['inputHash']
 rows=[]
 for unit in original['units']:
  if unit.get('locked'):continue
  for fragment in unit['fragments']:
   cut=p['cuts'][fragment['index']]
   if cut['layout']!=layout:continue
   frames=lambda v:[f for f in v['frames'] if f['unitId']==unit['unitId'] and f['fragmentIndex']==fragment['index'] and fragment['hold'][0]<=f['actualDecodedTimestamp']<fragment['hold'][1]]
   a,b,c=frames(on),frames(negative),frames(repeat);population=match_hold_populations(a,b,c,fragment['hold'])
   if population=='NOT_APPLICABLE_EMPTY_HOLD':
    actual=[{'phase':f['phase'],'actualDecodedTimestamp':f['actualDecodedTimestamp']}for f in original['frames']if f['unitId']==unit['unitId']and f['fragmentId']==fragment['id']]
    rows.append({'unitId':unit['unitId'],'fragmentId':fragment['id'],'fragmentIndex':fragment['index'],'line':unit['line'],'fragmentRange':[fragment['from'],fragment['to']],'hold':fragment['hold'],'actualHOLDFrames':0,'glyphObservations':0,'status':population,'reason':'This source fragment has no HOLD interval. Its existing entry/exit frames remain recorded; no placement or temporal certificate is inferred from another fragment.','nonHoldOriginalFrames':actual,'nonHoldPlacementStatus':'UNMEASURED','points':[]});continue
   points=[];missing=[];negativeMissing=0;eligible=0
   for f,g,h in zip(a,b,c):
    for ink in f['glyphEvidence']:
     key=(ink['index'],ink['character'],ink['row']);find=lambda v:next((x for x in v['glyphEvidence'] if (x['index'],x['character'],x['row'])==key),None);off,again=find(g),find(h);eligible+=1
     if not off or not again or ink['status']!='MEASURED' or again['status']!='MEASURED' or not ink.get('nativeCentroid') or not ink.get('decodedCentroid') or not again.get('decodedCentroid'):
      missing.append({'actualDecodedTimestamp':f['actualDecodedTimestamp'],'glyph':key,'reason':'POSITIVE_OR_NEGATIVE_GLYPH_MEASUREMENT_ABSENT'});continue
     error=math.dist(ink['nativeCentroid'],ink['decodedCentroid']);repeatError=math.dist(ink['decodedCentroid'],again['decodedCentroid']);absent=off.get('status')=='FAILED' and off.get('reason')=='DECODED_GLYPH_INK_MISSING';negativeMissing+=int(absent)
     points.append({'actualDecodedTimestamp':f['actualDecodedTimestamp'],'glyph':key,'nativeCentroid':ink['nativeCentroid'],'decodedCentroid':ink['decodedCentroid'],'errorPixels':error,'repeatErrorPixels':repeatError,'layoutOffStatus':off.get('status'),'layoutOffReason':off.get('reason'),'layoutOffInkFraction':off.get('decodedInkFraction'),'matchedPlacement':error<=.5 and repeatError<=.5,'isolatedAbsenceObserved':absent})
   matched=sum(x['matchedPlacement'] for x in points);agreement=matched/eligible if eligible else None;absence=negativeMissing/eligible if eligible else None
   status='VERIFIED_LAYOUT_PRIMARY_GLYPH_REALIZATION' if not missing and len(a)>=3 and agreement>=.9 and absence>=.9 else 'UNMEASURED_LAYOUT_PLACEMENT_OR_ABSENCE'
   rows.append({'unitId':unit['unitId'],'fragmentId':fragment['id'],'fragmentIndex':fragment['index'],'line':unit['line'],'fragmentRange':[fragment['from'],fragment['to']],'hold':fragment['hold'],'actualHOLDFrames':len(a),'glyphObservations':eligible,'placementAgreement':agreement,'layoutOffMissingInkFraction':absence,'missing':missing,'status':status,'points':points})
 assert rows,'NO_ACTUALLY_SELECTED_LAYOUT_TARGET'
 return {'schema':1,'sourceCommit':source,'sourceTreeSHA256':r['build']['sourceTreeSHA256'],'originalVideoSHA256':r['originalVideoSHA256'],'planHash':r['planHash'],'inputHash':r['inputSnapshot']['inputHash'],'selectedLayout':layout,'outputProfile':r['adoptedNativeProof']['profile'],'originalNativeAndDecodedONExact':True,'ONRepeatNativeExact':True,'controlVideoSHA256':movies['OFF']['videoSHA256'],'rawControl':ref(report),'selectedReference':ref(reference),'rows':rows,'meaning':'Actual selected primary layout is present with registered native glyph placement, and independently disabling exactly that layout removes the corresponding contrast-bearing ink. Original text correctness remains a separate input/renderer contract; no OCR or aesthetic superiority claim.','controlGlobalFAVStatus':'UNMEASURED: ordinary certification metadata omitted by core-only diagnostic export; all raw statuses preserved','human':'HUMAN_UNVERIFIED'}
if __name__=='__main__':
 reports=[]
 for key,part,case in [('0-0',0,'development-15'),('0-1',0,'development-15'),('2-0',2,'late-unseen-quiet-16x9'),('2-1',2,'late-unseen-quiet-16x9')]:
  report=R/f'automatic-important-controls-{key}/controls/effect-counterfactual-report.json.gz';reference=R/f'automatic-contract-focused-{part}/matrix/{case}-v3-reference.json.gz';d=analyze(report,reference);reports.append(d);print(d['selectedLayout'],[(x['fragmentIndex'],x['status'],x['placementAgreement'],x['layoutOffMissingInkFraction'])for x in d['rows']])
 (R/'automatic-isolated-layout-realization.json').write_text(json.dumps({'schema':1,'sourceCommit':S,'reports':reports,'scope':'Four genuinely selected layout operators in two current-source automatic movies only; not all thirty conditions or all operators.','human':'HUMAN_UNVERIFIED'},ensure_ascii=False,indent=2)+'\n')
