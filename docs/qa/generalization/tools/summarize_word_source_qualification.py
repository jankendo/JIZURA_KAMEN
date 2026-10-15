"""Conservative per-input proof. Does not relabel an old movie's encoded source."""
import pathlib,json,gzip,hashlib,collections
QA=pathlib.Path(__file__).resolve().parents[1];ROOT=QA/'composition-recovery'
def read(p):
 b=p.read_bytes();return json.loads(gzip.decompress(b) if p.suffix=='.gz' else b)
def raw(p):return gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes()
def sha(b):return hashlib.sha256(b).hexdigest()
p=ROOT/'climax-unaffected-input-scope-preregistration.json';spec=read(p);cases={c['fixtureId']:c for c in spec['cases']};observed={};archives=[]
for mf in sorted(ROOT.glob('word-scope-*/archive-manifest.json')):
 m=read(mf);archives.append({'path':str(mf.relative_to(QA)),'SHA256':sha(mf.read_bytes()),'artifactId':m['artifactId']});members={x['member']:x for x in m['files']}
 for x in members.values():assert sha(raw(QA/x['preserved']))==x['SHA256'],'CANONICAL_MEMBER_SHA_MISMATCH'
 for case,c in cases.items():
  key=case+'/input-scope.json'
  if key not in members:continue
  assert case not in observed,'DUPLICATE_INPUT_OBSERVATION';scope=read(QA/members[key]['preserved']);assert scope['sourceCommit']==spec['releaseSourceCommit'];assert scope['fixture']==case and scope['variant']==c['variant'];assert scope['videoSHA256']==c['expectedVideoSHA256'];assert scope['originalArtifactBinding']['videoSHA256']==c['expectedVideoSHA256'];assert scope['planHash']==scope['originalArtifactBinding']['planHash']
  r={'fixture':case,'archive':c['archive'],'originalEncodedArtifactBinding':scope['originalArtifactBinding'],'finalSourceCommit':spec['releaseSourceCommit'],'inputScopeObservationSHA256':members[key]['SHA256'],'scopeGuardPassed':scope['allTestedSplitsKeepExistingBranch'],'status':'FRESH_FINAL_SOURCE_MP4_REQUIRED','reason':None}
  if not scope['allTestedSplitsKeepExistingBranch']:r['reason']='Protected word/grapheme branch may apply; reuse rejected even if selected old split might be safe.'
  else:
   nk=case+'/native-source-continuity-dispatch.json'
   if nk not in members:r['reason']='No completed full-output Native identity proof.'
   else:
    n=read(QA/members[nk]['preserved']);assert n['build']['sourceCommit']==spec['releaseSourceCommit'] and n['build']['sourceDirty'] is False;assert n['videoSHA256']==scope['videoSHA256'] and n['referenceSHA256']==scope['referenceSHA256'] and n['planHash']==scope['planHash'];assert n['artifactBinding']==scope['originalArtifactBinding'];s=n['sourceContinuity'];r['nativeObservationSHA256']=members[nk]['SHA256'];r['expectedFrames']=s['expectedFullFrames'];r['actualFrames']=s['actualFullFrames'];r['mismatches']=len(s['mismatches'])
    if s['status']=='EXACT_NATIVE_RGBA_ALL_OUTPUT_FRAMES' and not s['mismatches'] and s['expectedFullFrames']==s['actualFullFrames']==n['outputFramesSampled']==len(n['nativeHashes']):
     assert len({f['time'] for f in n['nativeHashes']})==len(n['nativeHashes']);r['status']='INPUT_BRANCH_FALSE_AND_EXACT_FROZEN_NATIVE_IDENTITY';r['reason']='Narrow rendering input qualification only. Original encoded source/video/input/profile retained unchanged. Planning, source-diff assessment, fresh final encoding and whole-effect semantics are separate.'
    else:r['reason']='One or more actual output RGBA hashes differ; no tolerance allowed and no new-source qualification.'
  observed[case]=r
result={'schema':1,'finalSourceCommit':spec['releaseSourceCommit'],'preregistrationSHA256':sha(p.read_bytes()),'caseCount':len(cases),'observed':len(observed),'statuses':dict(collections.Counter(r['status'] for r in observed.values())),'cases':list(observed.values()),'unobserved':sorted(cases.keys()-observed.keys()),'archives':archives,'extraWordTargetCases':['development-15','holdout-15'],'historicalEncodedSourcePolicy':'Never overwrite actual sourceCommit in old evidence. This is input-scoped frozen-plan rendering proof only, not whole-program equivalence or artistic certification. All rejection evidence remains.','QUALITY_GO':'UNVERIFIED','human':'HUMAN_UNVERIFIED'};(ROOT/'final-word-source-input-qualification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['caseCount','observed','statuses','unobserved']}))
