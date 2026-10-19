"""Localize strict encoded-original mismatches; no release-credit or threshold change."""
import pathlib,json,gzip,hashlib
from registered_reproduction_geometry import measure
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery'
def main():
 c=json.loads((R/'grammar-policy-v2-current-control-collection.json').read_text());selected={}
 for row in c['controls']:
  if not row['strictOriginalDecodedIdentity']:selected.setdefault(row['caseId'],row)
 rows=[]
 for cid,row in selected.items():
  p=Q/row['rawPath'];assert hashlib.sha256(p.read_bytes()).hexdigest()==row['rawSHA256'];raw=gzip.decompress(p.read_bytes());r=json.loads(raw)
  assert r['fullNativeIdentity']and r['nativeONRepeatIdentical']and not r['adoptedMovieReproduced']
  original=r['registeredOriginal'];assert original['status']=='MEASURED'and original['binding']['videoSHA256']==r['originalVideoSHA256']
  modes={m['mode']:m for m in r['movies']};observations=[]
  for mode in ['ON','ON_REPEAT']:
   movie=modes[mode];v=movie['modeFinalArtifactVerification'];assert movie['fullDecode']=='PASS'and v['binding']['planHash']==r['planHash']and v['binding']['videoSHA256']==movie['videoSHA256']and v['binding']['inputHash']==original['binding']['inputHash']
   observations.append({'mode':mode,'videoSHA256':movie['videoSHA256'],**measure(original,v)})
  rows.append({'caseId':cid,'sourceCommit':r['build']['sourceCommit'],'originalBinding':original['binding'],'originalEvidenceId':original['evidenceId'],'originalDecodedSHA256':r['originalDecodedSHA256'],'reproducedDecodedSHA256':r['onDecodedSHA256'],'strictOriginalDecodedIdentity':False,'fullOriginalNativeIdentity':True,'NativeONRepeatIdentity':True,'rawReport':row['rawPath'],'rawReportSHA256':row['rawSHA256'],'observations':observations,'status':'DIAGNOSTIC_ONLY_NOT_RELEASE_CERTIFICATE','limits':'Primary registered HOLD geometry only; no non-primary image/FX or artistic whole-film equality. Encoded hash mismatch stays false, strict shared-baseline guard remains unchanged, and encoding-internal cause is unresolved.'})
 report={'schema':1,'sourceCommit':c['sourceCommit'],'rows':rows,'scope':'Actual original vs ON/repeat at stable unit+fragment+actual decoded clocks, existing half-pixel glyph criterion. Rendering-state difference and encoded variation are distinguished without claiming exact decoded reproduction.','QUALITY_GO':'UNVERIFIED'}
 raw=json.dumps(report,ensure_ascii=False,separators=(',',':')).encode();(R/'grammar-policy-v2-all-original-reproduction-geometry-diagnostic.json.gz').write_bytes(gzip.compress(raw,mtime=0))
 summary={'sourceCommit':c['sourceCommit'],'scope':report['scope'],'rows':[{k:v for k,v in r.items()if k!='observations'}|{'modes':[{k:v for k,v in o.items()if k not in ['points','missing']}|{'missingCount':len(o['missing'])}for o in r['observations']]}for r in rows]};(R/'grammar-policy-v2-all-original-reproduction-geometry-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
if __name__=='__main__':main()
