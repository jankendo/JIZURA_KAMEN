"""Register actual selected effects conservatively; one isolated leaf cannot certify all effects."""
import pathlib,json,hashlib,statistics,os
from build_important_executed_population import build
from bind_actual_dispatch_units import bind
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';A=R/'release-current-head';S='d6fe7be2fa53475dc7493f35229af6ad4f57235f';os.chdir(Q)
def sha(b):return hashlib.sha256(b).hexdigest()
def ref(p):return {'path':os.path.relpath(p,A),'sha256':sha(p.read_bytes())}
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');return ref(p)
traces=sorted(R.glob('automatic-contract-focused-*/dispatch/*/native-dispatch-trace.json.gz'))
assert len(traces)==3
unit_bindings={str(p.relative_to(Q)):bind(p,p.parents[2]) for p in traces};write(R/'automatic-contract-dispatch-unit-bindings.json',unit_bindings)
ledger=build([str(p.relative_to(Q)) for p in traces],S,unit_bindings);ledger['completeFinalThirtyPopulation']=False;ledger['scope']='Three actually completed current-source focused cases only; exact-source current27 and three-source development11 not yet collected. All nonidentity dispatched intent contracts retained conservatively; no whole-population realization inferred.'
write(R/'direction-intent-ledger.json',ledger)
control=R/'automatic-contract-chosen-photo-isolated/registered-uniform-translation.json';d=json.loads(control.read_text());assert d['sourceCommit']==S and d['originalNativeMatched'] and d['originalDecodedMatched']
selected=[r for r in ledger['rows'] if r['group']=='LYRIC_TEMPORAL_CONTRACT' and r['operator']=='UNIFORM_TRANSLATION' and r['videoSHA256']==d['originalVideoSHA256']]
assert len(selected)==1;leaf=selected[0];unit=d['rows'][0];assert unit['status']=='VERIFIED' and unit['targetBinding']['fragmentOrdinal']==json.loads(leaf['unitKey'])[0];assert unit['targetBinding']['line']==json.loads(leaf['unitKey'])[2]
points=[p for p in unit['points'] if p['expectedPixels']>=.5];assert points and all(p['matched'] for p in points)
off=next(x for x in d['controlVideos'] if x['mode']=='OFF');at=points[0]['actualDecodedTimestamp'];measurement={'sourceCommit':S,'intentId':leaf['intentId'],'videoSHA256':d['originalVideoSHA256'],'controlVideoSHA256':off['videoSHA256'],'actualDecodedTimestamp':at,'isolatedControl':True,'measuredValues':[unit['matchedPoints'],unit['positivePoints'],unit['measuredFrames'],unit['agreement'],statistics.mean(p['errorPixels'] for p in points)],'raw':ref(control),'expectedIntent':'Primary glyph uniform light travel while retaining chosen photo typography.','observedTarget':unit['unitId'],'observedChange':'Decoded glyph ON-minus-OFF displacement agrees with same-clock native target displacement; repeated ON and original full decoded video match.','rawFAVLimit':'Full original shipping FAV MEASURED; core-only diagnostic FAV has every unit MEASURED but global status UNMEASURED because ordinary certification metadata was omitted. All control MP4s independently H264AAC full-decoded.'}
mr=write(R/'automatic-contract-chosen-photo-isolated/important-intent-measurement.json',measurement)
obs={'intentId':leaf['intentId'],'status':'VERIFIED','counterfactual':True,'decodedPixels':True,'videoSHA256':d['originalVideoSHA256'],'controlVideoSHA256':off['videoSHA256'],'actualDecodedTimestamp':at,'measurement':mr}
operators={'sourceCommit':S,'expectedImportantIntentIds':ledger['expectedImportantIntentIds'],'observations':[obs],'completeFinalThirtyPopulation':False,'ledger':ref(R/'direction-intent-ledger.json'),'scope':'One actually chosen uniform-translation leaf has an isolated encoded semantic measurement. All other current observed contracts remain unverified. Do not infer universal completeness from this conservative partial inventory.'}
ore=write(A/'operators.json',operators)
realization={'schema':1,'sourceCommit':S,'populationComplete':False,'populationScope':'Only three current shipping cases; remaining thirty-condition population not collected','observedImportantContracts':len(ledger['expectedImportantIntentIds']),'verifiedIndependentContracts':1,'unmeasuredOrCompositeContracts':len(ledger['expectedImportantIntentIds'])-1,'observations':[obs],'status':'UNVERIFIED','human':'HUMAN_UNVERIFIED'};write(R/'encoded-effect-realization.json',realization)
write(R/'effect-counterfactual-report.json',{'sourceCommit':S,'completedControls':[{'originalVideoSHA256':d['originalVideoSHA256'],'raw':ref(control),'verdict':'VERIFIED_UNIFORM_TRANSLATION_ONLY'}],'missing':'Other primary operators, image/camera/background/FX/transition independently isolated semantic observations remain missing. Dispatch, aliases, settings and whole-frame RMS are not substituted.','status':'UNVERIFIED','human':'HUMAN_UNVERIFIED'})
p=A/'release-gate-manifest.json';m=json.loads(p.read_text());assert m['releaseSourceCommit']==S;m['evidence']['operators']=ore;write(p,m)
print(json.dumps({'currentCases':3,'observedImportantContracts':len(ledger['expectedImportantIntentIds']),'independentSemanticVerified':1,'remainingNotVerified':len(ledger['expectedImportantIntentIds'])-1}))
