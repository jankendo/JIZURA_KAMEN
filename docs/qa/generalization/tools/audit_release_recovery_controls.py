"""Validate existing controls against immutable media and complete native clocks."""
import pathlib,json,gzip,hashlib,collections
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';O=R/'release-recovery-20261019'
def read(p):
 b=p.read_bytes();return json.loads(gzip.decompress(b)if p.suffix=='.gz'else b)
def digest(p):
 with p.open('rb')as f:return hashlib.file_digest(f,'sha256').hexdigest()
ledger=read(R/'grammar-policy-v2-current32-executed-intent-ledger.json.gz');artifacts={a['caseId']:a for a in ledger['artifacts']}
population=read(R/'grammar-policy-v2-current32-control-population-reconciliation.json');media={};reports={};out=[]
def video(h):
 if h not in media:
  p=Q/'media'/(h+'.mp4');assert digest(p)==h,'ACTUAL_MP4_SHA_MISMATCH';media[h]={'path':str(p),'sha256':h,'bytes':p.stat().st_size}
 return media[h]
for case,operators in population['cases'].items():
 for actor in operators:
  checked=[]
  for ref in actor['rawReports']:
   p=Q/ref['path'];assert digest(p)==ref['SHA256'],'RAW_REPORT_SHA_MISMATCH';r=read(p);a=artifacts[case];binding=a['binding']
   assert r['caseId']==case and r['selectedOperator']==actor['operator']
   assert r['build']['sourceCommit']==ledger['sourceCommit']and r['build']['sourceTreeSHA256']==binding['sourceTreeSHA256']and r['build']['sourceDirty']is False
   assert r['originalVideoSHA256']==binding['videoSHA256']and r['planHash']==binding['planHash']and r['inputSnapshot']['inputHash']==binding['inputHash']
   assert r['referenceSHA256']==a['referenceSHA256'],'ORIGINAL_REFERENCE_MISMATCH'
   audio=Q/'media'/(r['audioWAVSHA256']+'.wav');assert digest(audio)==r['audioWAVSHA256'],'WAV_SHA_MISMATCH'
   proof=r['adoptedNativeProof'];assert proof['profile']==binding['outputProfile']and proof['videoSHA256']==binding['videoSHA256']
   groups=[g for g in proof['groups']if g['planHash']==binding['planHash']and len(g['frames'])==a['nativeFrames']]
   assert groups and all(g['frames']==groups[0]['frames']for g in groups),'AMBIGUOUS_ADOPTED_NATIVE_GROUP'
   expected=groups[0]['frames'];times=[f['time']for f in expected];assert len(times)==len(set(times))
   original=video(r['originalVideoSHA256']);modes={m['mode']:m for m in r['movies']};assert set(modes)=={'ON','OFF','ON_REPEAT'}
   assert r['registeredOriginal']['binding']==binding,'ORIGINAL_FAV_BINDING_MISMATCH'
   observations=[]
   for mode,m in modes.items():
    b=m['modeFinalArtifactVerification']['binding'];assert all(b[k]==binding[k]for k in ['sourceCommit','sourceTreeSHA256','rendererVersion','inputHash','planHash','outputProfile'])
    assert b['sourceDirty']is False and b['videoSHA256']==m['videoSHA256']and m['fullDecode']=='PASS'
    stream=m['ffprobe']['streams'];assert any(s['codec_name']=='h264'for s in stream)and any(s['codec_name']=='aac'for s in stream)
    actual=[f for f in m['nativeFrameHashes']if f['time']in set(times)]
    assert [f['time']for f in actual]==times,'ACTUAL_OUTPUT_CLOCK_MISMATCH'
    if mode!='OFF':assert actual==expected,'FULL_NATIVE_ON_OR_REPEAT_MISMATCH'
    for f in m['modeFinalArtifactVerification']['frames']:
     t=f['actualDecodedTimestamp'];assert isinstance(t,(int,float))and binding['outputProfile']['range'][0]<=t<binding['outputProfile']['range'][1]
    observations.append({'mode':mode,'media':video(m['videoSHA256']),'retainedFullDecode':'PASS','binding':b,'nativeOutputFrameCount':len(actual),'decodedRegisteredFrameCount':len(m['modeFinalArtifactVerification']['frames']),'registeredArtifactStatus':m['modeFinalArtifactVerification']['status'],'reusedFromBaseline':m.get('reusedFromBaseline',False)})
   assert r['fullNativeIdentity']is True and r['nativeONRepeatIdentical']is True
   assert (r['originalDecodedSHA256']==r['onDecodedSHA256'])==r['adoptedMovieReproduced']
   rec={'path':ref['path'],'sha256':ref['SHA256'],'sourceCommit':ledger['sourceCommit'],'caseId':case,'operator':actor['operator'],'original':original,'inputHash':binding['inputHash'],'planHash':binding['planHash'],'rendererVersion':binding['rendererVersion'],'referenceSHA256':r['referenceSHA256'],'audioWAVSHA256':r['audioWAVSHA256'],'outputProfile':binding['outputProfile'],'fontsObservationSHA256':hashlib.sha256(json.dumps(r['fonts'],sort_keys=True).encode()).hexdigest(),'nativeONAndRepeatEqualOriginal':True,'originalDecodedSHA256':r['originalDecodedSHA256'],'onDecodedSHA256':r['onDecodedSHA256'],'strictOriginalDecodedIdentity':r['adoptedMovieReproduced'],'movies':observations,'semanticCertificate':'NOT_INFERRED_FROM_COLLECTION','parameterTraceCount':len(r.get('parameterTrace',[]))}
   reports[ref['path']]=rec;checked.append(ref['path'])
  out.append({'caseId':case,'operator':actor['operator'],'reports':checked,'strictOriginalDecodedIdentity':all(reports[p]['strictOriginalDecodedIdentity']for p in checked),'semanticStatus':'UNVERIFIED_SEPARATE_TARGET_PHASE_MODEL_REQUIRED'})
print('audited pairs',len(out),'reports',len(reports),'media',len(media),flush=True)
result={'schema':1,'sourceCommit':ledger['sourceCommit'],'fixedPairs':out,'reports':list(reports.values()),'media':list(media.values()),'newMP4sGenerated':0,'newFullDecodesPerformed':0,'retainedFullDecodesReused':True,'limits':'Each MP4 byte hash checked locally against the earlier full-decode records. No new decoder execution claimed. Native equality is not semantic or decoded full-frame equality.'}
(O/'control-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
summary={'sourceCommit':ledger['sourceCommit'],'fixedPairs':len(out),'rawReports':len(reports),'actualMP4FilesHashVerified':len(media),'strictDecodedMismatchCases':sorted({r['caseId']for r in reports.values()if not r['strictOriginalDecodedIdentity']}),'pairsWithStrictDecodedMismatch':sum(not r['strictOriginalDecodedIdentity']for r in out),'newMP4sGenerated':0,'controlAuditSHA256':digest(O/'control-audit.json')}
(O/'control-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
