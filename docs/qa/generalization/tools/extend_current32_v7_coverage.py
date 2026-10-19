"""Add newly recovered exact lineage without relabeling incomplete old traces."""
import pathlib,json,gzip,hashlib
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery'
def read(p):return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def main():
 p=R/'grammar-policy-v2-native-v7-recovered-coverage.json';d=read(p);original=read(R/'grammar-policy-v2-final-native-correspondence.json');bycase={c['case']:c for c in original['cases']}
 for cid in ['holdout-05','holdout-11']:
  trace=R/('grammar-policy-v2-bounded-pending-'+cid)/'observations/native/native-dispatch-trace.json.gz';t=read(trace);a=bycase[cid];old=read(Q/a['raw'])
  assert t['exactNativeRGBA']and t['artifactBinding']==a['binding']and t['referenceSHA256']==a['referenceSHA256']
  assert t['nativeFrameHashes']==old['nativeFrameHashes'],'RECOVERED_V7_NOT_SAME_FULL_NATIVE'
  d['cases'][cid]={'frames':len(t['nativeFrameHashes']),'videoSHA256':t['videoSHA256'],'trace':str(trace.relative_to(Q)),'traceFileSHA256':hashlib.sha256(trace.read_bytes()).hexdigest(),'sourceOfLineage':'Recovered bounded current-source diagnostic; no previous missing lineage invented.'}
 d['coverageComplete']=set(d['cases'])==set(bycase);d['scope']='Full32 actual v7 lineage recovered. Original full v5 Native hashes independently match each newly added trace. Earlier missing-lineage checkpoint remains in normal Git history; no old evidence relabeled.'
 p.write_text(json.dumps(d,indent=2)+'\n');print({'cases':len(d['cases']),'coverageComplete':d['coverageComplete']})
if __name__=='__main__':main()
