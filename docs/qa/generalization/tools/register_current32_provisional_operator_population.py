"""Replace partial4 dispatch denominator with authenticated32 conservative inventory.

Preserve both actual precise certificates and all historical partial data. This is
an explicit UNVERIFIED checkpoint, not final importance classification or GO.
"""
import pathlib,json,gzip,hashlib
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';A=R/'release-current-head'
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
 p=A/'operators.json';oldraw=p.read_bytes();old=json.loads(oldraw)
 ledgerfile=R/'grammar-policy-v2-current32-executed-intent-ledger.json.gz';ledger=json.loads(gzip.decompress(ledgerfile.read_bytes()))
 assert ledger['artifactCount']==32 and ledger['exactNativeFrames']==10628 and ledger['semanticPopulationFinalized']is False
 assert ledger['sourceCommit']==old['sourceCommit'] and not ledger['warnings'] and not ledger['unknownNaturalPopulation']
 expected=ledger['expectedImportantIntentIds'];assert len(expected)==len(set(expected))
 assert all(x['intentId']in expected for x in old['observations']),'EXISTING_CERTIFICATE_ID_NOT_IN_ACTUAL_CURRENT_POPULATION'
 historical=R/'grammar-policy-v2-partial4-operators-before-current32.json.gz'
 if not historical.exists():historical.write_bytes(gzip.compress(oldraw,mtime=0))
 result={'sourceCommit':ledger['sourceCommit'],'expectedImportantIntentIds':expected,'observations':old['observations'],'completeFinalThirtyPopulation':False,'completeCurrent32NativeDispatchPopulation':True,'importanceClassificationFinalized':False,'ledger':{'path':'../'+ledgerfile.name,'sha256':sha(ledgerfile.read_bytes())},'scope':'Authenticated current32 actual-dispatch conservative inventory. Stable final units, original Native and source/input/plan/profile/video bound. Two existing precise uniform-translation certificates retain identical IDs and raw files. Complete important semantic classification and other independent component/phase models remain UNVERIFIED. This conservative denominator is not a finalized artistic realization-rate population. Successful control collection and partial HOLD layout/crop certificates are not automatically promoted to full-intent PASS.','historicalPartial4':{'path':'../'+historical.name,'sha256':sha(historical.read_bytes())}}
 raw=(json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode();p.write_bytes(raw)
 mpath=A/'release-gate-manifest.json';m=json.loads(mpath.read_text());m['evidence']['operators']={'path':'operators.json','sha256':sha(raw)};mpath.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'actualArtifacts':32,'provisionalConservativeIds':len(expected),'retainedPreciseCertificates':len(result['observations']),'semanticClassificationFinalized':False}))
if __name__=='__main__':main()
