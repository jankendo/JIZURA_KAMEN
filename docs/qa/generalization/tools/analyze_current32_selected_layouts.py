"""Apply the existing frozen glyph placement/absence sensor to collected natural layouts.

Strict original decoded reproduction remains mandatory. A failed measurement or guard
is retained as UNMEASURED; no selected-unit denominator is silently removed.
"""
import json,gzip,pathlib,collections,hashlib
from analyze_isolated_layout_presence import analyze
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';S='d04c734bc5eb0c0c427a42a196cae3a507b89506'
def main():
 collection=json.loads((R/'grammar-policy-v2-current-control-collection.json').read_text())
 spec=json.loads((R/'grammar-policy-v2-remaining-controls-preregistration.json').read_text())
 references={c['caseId']:R/c['original']['name']/'matrix'/(c['caseId']+'-v3-reference.json.gz')for g in spec['groups']for c in g['cases']}
 selected={}
 for c in collection['controls']:
  if c['operator'].startswith('registry:LAYOUTS:'):
   k=(c['caseId'],c['operator'])
   if k not in selected or c['strictOriginalDecodedIdentity']:selected[k]=c
 results=[]
 for (cid,operator),c in selected.items():
  if not c['strictOriginalDecodedIdentity']:
   results.append({'caseId':cid,'operator':operator,'status':'UNMEASURED','reason':'STRICT_ORIGINAL_DECODED_REPRODUCTION_FALSE','rawPath':c['rawPath']});continue
  try:
   report=analyze(Q/c['rawPath'],references[cid],S);report['caseId']=cid;report['operator']=operator;report['status']='MEASURED_SENSOR_RESULTS';results.append(report)
  except AssertionError as e:results.append({'caseId':cid,'operator':operator,'status':'UNMEASURED','reason':'EXISTING_SENSOR_GUARD_REJECTED: '+str(e),'rawPath':c['rawPath']})
  print(cid,operator,flush=True)
 units=[u for r in results for u in r.get('rows',[])];counts=collections.Counter(u['status']for u in units)
 out={'schema':1,'sourceCommit':S,'operatorCasePairsWithCollectedControls':len(results),'results':results,'unitStatuses':dict(counts),'criterion':'Existing unchanged analyze_isolated_layout_presence sensor: same completed original Native/decoded ON, exact repeat, actual complete HOLD frame clock population, per-glyph .5pixel and .9 agreement, isolated missing-ink negative control.','scope':'Registered chosen primary glyph placement and isolated absence only. No role-motion, font aesthetic, creative superiority or all-effects PASS. Original text remains an authenticated input/renderer contract, not OCR.','human':'HUMAN_UNVERIFIED'}
 p=R/'grammar-policy-v2-current32-isolated-layout-realization.json.gz';raw=json.dumps(out,ensure_ascii=False,separators=(',',':')).encode();p.write_bytes(gzip.compress(raw,mtime=0))
 summary={k:v for k,v in out.items()if k!='results'};summary.update(units=len(units),actualHOLDFrames=sum(x['actualHOLDFrames']for x in units),glyphObservations=sum(x['glyphObservations']for x in units),guardUnmeasured=[{k:r[k]for k in ['caseId','operator','reason']}for r in results if r['status']=='UNMEASURED'],rawLedgerSHA256=hashlib.sha256(raw).hexdigest())
 (R/'grammar-policy-v2-current32-isolated-layout-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary))
if __name__=='__main__':main()
