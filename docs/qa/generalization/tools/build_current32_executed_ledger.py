"""Authenticated whole-population dispatch ledger, explicitly not a semantic certificate.

Streams FAV from large original row JSON to avoid loading unused candidate histories.
All raw members are authenticated before extracting a current final artifact binding.
Requires ijson3.3.0. No new render, frame sampling, threshold or importance exemption.
"""
import pathlib,json,gzip,hashlib,collections,ijson
from bind_actual_dispatch_units import bind_values
from build_important_executed_population import build
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery'
S='d04c734bc5eb0c0c427a42a196cae3a507b89506'
def read(p):return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def member(archive,name):
 m=read(R/archive/'archive-manifest.json');e=next(x for x in m['files']if x['member']==name);p=Q/e['preserved']
 with gzip.open(p,'rb')as f:assert hashlib.file_digest(f,'sha256').hexdigest()==e['SHA256'],'ARCHIVE_MEMBER_SHA_MISMATCH'
 return p,e
def main():
 spec=read(R/'grammar-policy-v2-remaining-controls-preregistration.json')
 native=read(R/'grammar-policy-v2-final-native-correspondence.json')
 latest=read(R/'grammar-policy-v2-native-v7-recovered-coverage.json')['cases']
 originals={c['caseId']:c['original']['name']for g in spec['groups']for c in g['cases']}
 traces=[];bindings={};artifacts=[]
 for case in native['cases']:
  name=case['case'];archive=originals[name]
  trace_path=Q/(latest[name]['trace']if name in latest else case['raw'])
  trace_raw=gzip.decompress(trace_path.read_bytes());t=json.loads(trace_raw)
  assert t['artifactBinding']==case['binding'] and t['exactNativeRGBA']
  assert len(t['nativeFrameHashes'])==case['fullNativeFrames']
  rp,re=member(archive,'matrix/'+name+'-v3-reference.json');ref=read(rp)
  assert re['SHA256']==t['referenceSHA256']==case['referenceSHA256']
  rowpath,rowentry=member(archive,'matrix/'+name+'-v3-row.json')
  with gzip.open(rowpath,'rb')as f:verification=next(ijson.items(f,'provenance.finalArtifactVerification',use_float=True))
  assert verification['status']=='MEASURED'
  binding=bind_values(t,trace_raw,ref,verification)
  traces.append(trace_path);bindings[str(trace_path)]=binding
  artifacts.append({'caseId':name,'binding':case['binding'],'finalArtifactEvidenceId':verification['evidenceId'],'trace':str(trace_path.relative_to(Q)),'traceRawSHA256':binding['traceRawSHA256'],'originalRowSHA256':rowentry['SHA256'],'referenceSHA256':re['SHA256'],'nativeFrames':case['fullNativeFrames'],'traceVersion':'v7'if name in latest else'v5','stableUnitBindings':list(binding['bindings'].values())})
  print(name,'bound',flush=True)
 assert len(artifacts)==len(originals)==32
 ledger=build(traces,S,bindings)
 assert not ledger['warnings'] and not ledger['unknownNaturalPopulation']
 ids=[x['intentId']for x in ledger['rows']];assert len(ids)==len(set(ids)),'DUPLICATE_FINAL_INTENT_ID'
 for row in ledger['rows']:
  row['trace']=str(pathlib.Path(row['trace']).relative_to(Q))
  row['binding']=next(a['binding']for a in artifacts if a['binding']['videoSHA256']==row['videoSHA256'])
 ledger.update(artifactCount=32,artifacts=artifacts,exactNativeFrames=sum(a['nativeFrames']for a in artifacts),semanticPopulationFinalized=False,scope='Complete32 actual dispatched conservative inventory, with stable selected-reference and final FAV units. Actual importance/role semantics remain provisional; no registered/unexecuted technique added, no whole-hook RMS treated as realization. Trace version counts are explicit; original exact v5 Native remains independently preserved.',traceVersions=dict(collections.Counter(a['traceVersion']for a in artifacts)))
 raw=json.dumps(ledger,ensure_ascii=False,separators=(',',':')).encode();p=R/'grammar-policy-v2-current32-executed-intent-ledger.json.gz';p.write_bytes(gzip.compress(raw,mtime=0))
 summary={k:ledger[k]for k in ['sourceCommit','artifactCount','exactNativeFrames','classificationCounts','traceVersions','semanticPopulationFinalized','independentSemanticStatus','scope','human']}
 summary.update(dispatchRows=len(ledger['rows']),conservativeImportantIntents=len(ledger['expectedImportantIntentIds']),rawLedgerSHA256=hashlib.sha256(raw).hexdigest(),ledgerFileSHA256=hashlib.sha256(p.read_bytes()).hexdigest(),semanticVerifiedByInventory=0,limits='Whole population inventory completeness is not independent semantic completeness. Historical partial four-case certificate is retained separately; this does not replace release operators.json with automatic PASS.')
 (R/'grammar-policy-v2-current32-executed-intent-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary))
if __name__=='__main__':main()
