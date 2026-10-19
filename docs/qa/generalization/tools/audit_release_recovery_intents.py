"""Read every preserved dispatch record; never infer semantic PASS from inventory."""
import pathlib,json,gzip,hashlib,collections,sys
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery'
O=R/'release-recovery-20261019';O.mkdir(exist_ok=True)
def read(p):
 b=p.read_bytes();return json.loads(gzip.decompress(b)if p.suffix=='.gz'else b)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
ledgerFile=pathlib.Path(sys.argv[1])if len(sys.argv)>1 else R/'release-recovery-20261019/clock-complete-ledger.json.gz'
ledger=read(ledgerFile)
operators=read(R/'release-d04c734-frozen/operators.json')
controls=read(R/'grammar-policy-v2-current-control-collection.json')
byvideo={a['binding']['videoSHA256']:a for a in ledger['artifacts']}
registered={r['intentId']:r for r in operators['observations']}
bycontrol=collections.defaultdict(list)
for c in controls['controls']:bycontrol[(c['caseId'],c['operator'])].append(c)
source={
 'LAYOUTS':'src/11zzp_shot_grammar.js; src/11zzs_architecture_cinema.js; src/11zzzzzzzzzb_planner_v5.js; src/09_render.js',
 'CAMERA_HOOK':'src/11zzm_story_director.js; src/11zzu_temporal_direction.js; src/09_render.js',
 'COMPOSITE_HOOK':'src/11zzp_shot_grammar.js; src/11zzs_architecture_cinema.js',
 'LYRIC_TEMPORAL_CONTRACT':'src/11zzu_temporal_direction.js',
 'ENTER':'src/05_anim.js; src/09_render.js',
 'HOLD':'src/05_anim.js; src/09_render.js',
 'EXIT':'src/05_anim.js; src/09_render.js',
 'DECOR':'src/09_render.js', 'TRANS':'src/09_render.js',
 'TREAT':'src/05b_registry.js; src/09_render.js','CAMERA':'src/05_anim.js; src/09_render.js'}
rows=[]
for r in ledger['rows']:
 a=byvideo[r['videoSHA256']];b=a['binding'];d=r['dispatch'];u=r['resolvedFinalUnitBinding'];ac=d.get('actuation',{})
 assert r['binding']==b and r['sourceCommit']==b['sourceCommit'] and r['planHash']==b['planHash']
 identity={k:r[k] for k in ['sourceCommit','videoSHA256','planHash','unitKey','group','operator','pass','semanticRoles']}
 assert hashlib.sha256(json.dumps(identity,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()==r['intentId']
 operator='registry:'+r['group']+':'+r['operator']if r['group']in ['LAYOUTS','ENTER','HOLD','EXIT','CAMERA','TREAT','DECOR','TRANS']else 'grammarUniformTranslation'if r['group']=='LYRIC_TEMPORAL_CONTRACT'else r['operator']
 matched=bycontrol[(a['caseId'],operator)]
 cl=r['classification'];proof='LOCAL_STATIC_TARGET_CONTRACT'if cl=='INTENTIONAL_STATIC'else'COMPONENTS_AND_ASSEMBLY'if cl=='COMPOSITE_IMPORTANT'else'ISOLATED_ON_OFF_REPEAT'
 if r['group']=='LAYOUTS':proof='PRIMARY_LAYOUT_GEOMETRY_AND_COMPLETE_TEXT_WITH_ISOLATED_CONTROL'
 reason=[]
 status=registered.get(r['intentId'],{}).get('status','UNVERIFIED')
 if cl in ['MANUAL_LOCKED','NON_EXECUTION_IDENTITY']:status=cl;proof='MANUAL_INVARIANCE'if cl=='MANUAL_LOCKED'else'IDENTITY_IMPLEMENTATION_AND_DISPATCH'
 elif status!='VERIFIED':
  if not matched:reason.append('NO_MATCHED_COMPONENT_CONTROL')
  if any(not c['strictOriginalDecodedIdentity']for c in matched):reason.append('ORIGINAL_DECODED_HASH_MISMATCH')
  reason.append('TARGET_PHASE_SEMANTIC_CERTIFICATE_NOT_REGISTERED')
 if cl=='COMPOSITE_IMPORTANT':reason.append('ASSEMBLY_PIXELS_CANNOT_ATTRIBUTE_CONSTITUENTS')
 if cl=='INTENTIONAL_STATIC':reason.append('LOCAL_STILL_OPERATOR_CANNOT_CERTIFY_COMPOSITE_STILLNESS')
 clocks=sorted(set(p['actualOutputTimestamp']for p in d.get('clockPairs',[])))
 paint={k:ac.get(k,0)for k in ['ownPaintCalls','descendantPaintCalls','ownClipCalls','descendantClipCalls','itemMutationCalls','canvasStateMutationCalls','returnedFalse','returnedTrue','returnedVoid']}
 noPaint=all(not paint[k]for k in ['ownPaintCalls','descendantPaintCalls','ownClipCalls','descendantClipCalls','itemMutationCalls','canvasStateMutationCalls'])
 if noPaint and not ac.get('returnedTransforms')and cl not in ['MANUAL_LOCKED','NON_EXECUTION_IDENTITY','INTENTIONAL_STATIC']:reason.append('DISPATCH_WITHOUT_PAINT_REQUIRES_PLANNED_BRANCH_AUDIT_NOT_AUTOMATIC_EXCLUSION')
 target='PRIMARY_LYRIC_FRAGMENT'if u.get('unitId')and r['group']in ['LAYOUTS','ENTER','HOLD','EXIT','LYRIC_TEMPORAL_CONTRACT']else'BACKGROUND_CAMERA'if r['operator']in ['cameraAt','temporalCinemaFocus']else'LYRIC_CAMERA'if r['operator']=='lyricsCameraAt'else'COMPOSITE_OR_DECOR_TARGET_REQUIRES_LOCALIZATION'
 rows.append({'intentId':r['intentId'],'caseId':a['caseId'],'sourceCommit':r['sourceCommit'],'inputHash':b['inputHash'],'planHash':b['planHash'],'videoSHA256':b['videoSHA256'],'rendererVersion':b['rendererVersion'],'outputProfile':b['outputProfile'],'unitId':u.get('unitId'),'fragmentId':u.get('fragmentId'),'unitKey':r['unitKey'],'group':r['group'],'operator':r['operator'],'pass':r['pass'],'naturalSelection':r['naturalSelection'],'classification':cl,'required':r['important'],'manualLocked':cl=='MANUAL_LOCKED','dispatchCalls':d['calls'],'dispatchInterval':[d['firstTime'],d['lastTime']],'actualOutputClockCount':len(clocks),'actualOutputClockRange':[clocks[0],clocks[-1]]if clocks else None,'observedActuation':paint,'returnedTransformCount':sum(ac.get('returnedTransforms',{}).values()),'targetScope':target,'implementation':r['implementation'],'proofMethod':proof,'sharedContractEquivalence':'UNPROVEN_NO_REUSE_CREDIT','status':status,'blockers':reason,'phaseProofRequirements':r.get('phaseProofRequirements'), 'requiredAdditionalTest':('Bind outgoing source-time texture to its actual output-time composite; 'if r.get('phaseProofRequirements',{}).get('outgoingSnapshotObservationRequired')else'')+proof+' at the exact target and every required phase; preserve full source/input/plan/video and decoded clock binding','codePathsToTrace':source.get(r['group']),'existingControlReports':[{'path':c['rawPath'],'sha256':c['rawSHA256'],'strictOriginalDecodedIdentity':c['strictOriginalDecodedIdentity']}for c in matched],'nativeTrace':{'path':r['trace'],'rawSHA256':r['traceRawSHA256']},'existingCertificate':registered.get(r['intentId'])})
assert len(rows)==1250 and len({r['intentId']for r in rows})==1250
assert set(operators['expectedImportantIntentIds'])==set(r['intentId']for r in rows if r['required'])
(O/'intent-audit.json').write_text(json.dumps({'schema':1,'sourceCommit':ledger['sourceCommit'],'ledgerFileSHA256':sha(ledgerFile),'classificationFinalized':False,'rows':rows},ensure_ascii=False,indent=2)+'\n')
summary={'sourceCommit':ledger['sourceCommit'],'rows':len(rows),'importantPopulation':len(operators['expectedImportantIntentIds']),'classificationFinalized':False,'statuses':dict(collections.Counter(r['status']for r in rows)),'proofMethods':dict(collections.Counter(r['proofMethod']for r in rows if r['required'])),'blockers':dict(collections.Counter(v for r in rows for v in r['blockers'])),'auditSHA256':sha(O/'intent-audit.json'),'sourceFixCandidate':'5eb02e6f','limits':'Complete row binding audit is not a final semantic classification. No existing required intent removed; no whole-hook contribution promoted; original source evidence is not credited to the changed candidate renderer.'}
(O/'intent-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,ensure_ascii=False))
