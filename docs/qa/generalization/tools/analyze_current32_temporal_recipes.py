"""Expand the frozen recipe-contribution sensor; no semantic or threshold substitution."""
import pathlib,json,gzip,hashlib,collections
from analyze_grammar_policy_v2_temporal_recipes import analyze_report,checked
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery'
def main():
 collection=json.loads((R/'grammar-policy-v2-current-control-collection.json').read_text());selected={}
 spec=json.loads((R/'grammar-policy-v2-remaining-controls-preregistration.json').read_text());archives={c['caseId']:c['original']['name']for g in spec['groups']for c in g['cases']}
 for c in collection['controls']:
  if c['operator']=='grammarTemporalRecipe':
   if c['caseId']not in selected or c['strictOriginalDecodedIdentity']:selected[c['caseId']]=c
 rows=[];unmeasured=[]
 for cid,c in selected.items():
  if not c['strictOriginalDecodedIdentity']:
   unmeasured.append({'caseId':cid,'raw':c['rawPath'],'status':'UNMEASURED','reason':'STRICT_ORIGINAL_DECODED_REPRODUCTION_FALSE'});continue
  p=Q/c['rawPath'];assert hashlib.sha256(p.read_bytes()).hexdigest()==c['rawSHA256'];raw=gzip.decompress(p.read_bytes());d=json.loads(raw)
  try:
   ref,refsha=checked(archives[cid],'matrix/'+cid+'-v3-reference.json');assert refsha==d['referenceSHA256']and ref['planHash']==d['planHash'],'IMMUTABLE_SELECTED_REFERENCE_MISMATCH'
   got=analyze_report(d,hashlib.sha256(raw).hexdigest(),ref['plan']);assert got,'NO_ACTUAL_TARGET_TRACE';rows.extend(got)
  except AssertionError as e:unmeasured.append({'caseId':cid,'raw':c['rawPath'],'status':'UNMEASURED','reason':'SENSOR_GUARD_REJECTED: '+str(e)})
  print(cid,flush=True)
 report={'schema':1,'sourceCommit':collection['sourceCommit'],'rows':rows,'unmeasuredControls':unmeasured,'statuses':dict(collections.Counter(x['status']for x in rows)),'criteria':'Existing unchanged whole-recipe contribution sensor: >=.5pixel source signal,>=3actual frames, .5pixel/10percent error and repeat tolerance,>=.9agreement; missing glyphs retained.','scope':'Whole selected pre-existing recipe charFn contribution only; no constituent HOLD/entry/camera attribution or artistic grade. All intended-role semantic verdicts remain explicitly separate. Strict original decoded mismatch prevents certificate.','human':'HUMAN_UNVERIFIED'}
 raw=json.dumps(report,ensure_ascii=False,separators=(',',':')).encode();p=R/'grammar-policy-v2-current32-temporal-recipe-contributions.json.gz';p.write_bytes(gzip.compress(raw,mtime=0))
 summary={k:v for k,v in report.items()if k!='rows'};summary.update(caseControls=len(selected),fragmentObservations=len(rows),positiveGlyphPoints=sum(x['positivePoints']for x in rows),measuredFrames=sum(x['measuredFrames']for x in rows),rawSHA256=hashlib.sha256(raw).hexdigest(),unitSummary=[{k:v for k,v in row.items()if k not in ['points','missing']}for row in rows]);(R/'grammar-policy-v2-current32-temporal-recipe-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print({k:summary[k]for k in ['caseControls','fragmentObservations','statuses','positiveGlyphPoints','measuredFrames']})
if __name__=='__main__':main()
