"""Reconcile actual completed, source-bound controls to the fixed238 actor-case set."""
import json,pathlib,collections,hashlib
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery'
def main():
 p=R/'grammar-policy-v2-current-control-collection.json';d=json.loads(p.read_text());sp=R/'grammar-policy-v2-remaining-controls-preregistration.json';s=json.loads(sp.read_text());assert s['sourceCommit']==d['sourceCommit']
 expected={(c['caseId'],o)for g in s['groups']for c in g['cases']for o in c['candidates']}
 actual=collections.defaultdict(list)
 for c in d['controls']:actual[c['caseId'],c['operator']].append(c)
 missing=expected-set(actual);assert len(expected)==238
 bycase=collections.defaultdict(list)
 for (cid,op),observations in actual.items():
  if (cid,op)not in expected:continue
  assert all(o['fullNativeIdentity']and o['NativeONRepeatIdentical']for o in observations)
  bycase[cid].append({'operator':op,'collected':True,'strictOriginalDecodedIdentity':all(o['strictOriginalDecodedIdentity']for o in observations),'rawReports':[{'path':o['rawPath'],'SHA256':o['rawSHA256']}for o in observations],'semanticStatus':'UNVERIFIED_BY_COLLECTION_ALONE'})
 report={'schema':1,'sourceCommit':d['sourceCommit'],'fixedActorCasePairs':238,'collectedFixedPairs':len(expected)-len(missing),'missing':[list(k)for k in sorted(missing)],'collectionComplete':not missing,'caseCount':len(bycase),'cases':dict(sorted(bycase.items())),'diagnosticUniqueCompletelyDecodedMP4s':d['completeUniqueDiagnosticMP4s'],'additionalControlsNotAddedToFrozenPopulation':[list(k)for k in sorted(set(actual)-expected)],'strictOriginalDecodedMismatchCases':sorted({cid for (cid,op),obs in actual.items()if any(not o['strictOriginalDecodedIdentity']for o in obs)}),'specSHA256':hashlib.sha256(sp.read_bytes()).hexdigest(),'sourceCollectionSHA256':hashlib.sha256(p.read_bytes()).hexdigest(),'scope':'Completed fixed controls only, source/input/plan/profile/original hashes and current full Native validated. Five calibration cameras and two focused uniform component controls are additional, not denominator changes. Decoded-original mismatch retained; diagnostic-only data cannot confer automatic release credit.238actor-case pairs and1129provisional intent IDs are different populations.','QUALITY_GO':'UNVERIFIED','human':'HUMAN_UNVERIFIED'}
 (R/'grammar-policy-v2-current32-control-population-reconciliation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print({k:report[k]for k in ['fixedActorCasePairs','collectedFixedPairs','collectionComplete','caseCount','diagnosticUniqueCompletelyDecodedMP4s','strictOriginalDecodedMismatchCases']})
if __name__=='__main__':main()
