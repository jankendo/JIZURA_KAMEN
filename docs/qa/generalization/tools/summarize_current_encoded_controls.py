"""Count actual complete source-bound diagnostic MP4s without treating collection as semantic PASS."""
from pathlib import Path
import json,gzip,hashlib,collections
Q=Path(__file__).resolve().parents[1];R=Q/'composition-recovery';S='d04c734bc5eb0c0c427a42a196cae3a507b89506';T='f9f242449118e137534f399426a1de3a82c2ff7e302bcadc492fe5a80faae278'
def read(p):return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def digest(p):return hashlib.file_digest(p.open('rb'),'sha256').hexdigest()
files=sorted(R.glob('grammar-policy-v2-*/**/effect-counterfactual-report.json.gz'));movies={};controls=[]
for p in files:
 r=read(p)
 if r.get('build',{}).get('sourceCommit')!=S:continue
 assert r['build']['sourceTreeSHA256']==T and r['build']['sourceDirty']is False
 record={'caseId':r['caseId'],'operator':r['selectedOperator'],'rawPath':str(p.relative_to(Q)),'rawSHA256':digest(p),'originalVideoSHA256':r['originalVideoSHA256'],'planHash':r['planHash'],'inputHash':r['inputSnapshot']['inputHash'],'fullNativeIdentity':r['fullNativeIdentity'],'NativeONRepeatIdentical':r['nativeONRepeatIdentical'],'strictOriginalDecodedIdentity':r['adoptedMovieReproduced'],'newEncodeModes':r.get('sameSourceBaselineReuse',{}).get('newEncodeModes',['ON','OFF','ON_REPEAT']),'semanticVerdict':'UNVERIFIED_BY_COLLECTION_ALONE'}
 for m in r['movies']:
  if m.get('fullDecode')!='PASS':continue
  streams=m['ffprobe']['streams'];assert any(x['codec_name']=='h264'for x in streams)and any(x['codec_name']=='aac'for x in streams)
  b=m['modeFinalArtifactVerification']['binding'];assert b['videoSHA256']==m['videoSHA256']and b['planHash']==r['planHash']and b['inputHash']==r['inputSnapshot']['inputHash'];assert b['sourceCommit']==S and b['sourceTreeSHA256']==T
  sha=m['videoSHA256'];path=Q/'media'/(sha+'.mp4');assert path.is_file()
  if sha not in movies:assert digest(path)==sha;movies[sha]={'videoSHA256':sha,'path':str(path.relative_to(Q)),'fullDecode':'PASS','videoCodec':'h264','audioCodec':'aac','actualContexts':[]}
  movies[sha]['actualContexts'].append({'caseId':r['caseId'],'mode':m['mode'],'operator':r['selectedOperator'],'planHash':r['planHash'],'inputHash':b['inputHash'],'diagnosticFAVStatus':m['modeFinalArtifactVerification']['status']})
 controls.append(record)
newest={}
for c in controls:
 key=(c['caseId'],c['operator']);newest.setdefault(key,[]).append(c)
summary={'schema':1,'sourceCommit':S,'sourceTreeSHA256':T,'completeUniqueDiagnosticMP4s':len(movies),'rawControlReports':len(controls),'distinctCaseOperatorPairs':len(newest),'strictDecodedReproductionFailures':[{k:c[k]for k in ['caseId','operator','rawPath','strictOriginalDecodedIdentity']}for c in controls if not c['strictOriginalDecodedIdentity']],'actualNormalMoviePopulation':32,'normalPopulationScope':'Separate frozen32 final natural movies; this diagnostic count is not added to or substituted for their lyric-safety gate.','qualityVerdict':'UNVERIFIED','controls':controls,'movies':list(movies.values()),'limits':'Only actual complete H264/AAC decodes with present SHA-verified media are counted. Reused mode files and duplicate pilot records deduplicate by content hash while all input/plan/case contexts remain distinct. Diagnostic top-level FAV UNMEASURED is retained; successful collection/codec decode never establishes semantic or artistic PASS.'}
(R/'grammar-policy-v2-current-control-collection.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:summary[k]for k in ['completeUniqueDiagnosticMP4s','rawControlReports','distinctCaseOperatorPairs','qualityVerdict']}))
