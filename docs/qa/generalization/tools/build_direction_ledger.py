"""Immutable selected-component ledger. Configuration is not pixel realization."""
import argparse,gzip,hashlib,json,pathlib
p=argparse.ArgumentParser();p.add_argument('inventory');p.add_argument('output');p.add_argument('--source-commit',required=True);a=p.parse_args();root=pathlib.Path(a.inventory);out=pathlib.Path(a.output);out.mkdir(parents=True,exist_ok=True);items=[];contracts=[]
def canonical(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
for f in sorted(root.glob('*-full-selection-inventory.json.gz')):
 for entry in json.loads(gzip.decompress(f.read_bytes()))['entries']:
  if entry['variant']!='v3':continue
  binding=entry['binding'];assert all(binding.get(k) for k in ['inputHash','videoSHA256','planHash','outputProfile','rendererVersion','selectedCandidateId','sourceCommit']), 'INCOMPLETE_ARTIFACT_BINDING';assert binding['sourceCommit']==a.source_commit, 'STALE_SOURCE_COMMIT';assert binding.get('sourceDirty') is False, 'DIRTY_OR_UNKNOWN_SOURCE';assert entry.get('rawArtifactEvidenceId'), 'MISSING_FINAL_ARTIFACT_EVIDENCE_ID'
  contracts.append({'case':entry['fixture'],'binding':binding,'compositePrimaryMotion':entry['primaryCompositeMotionSummary'],'scope':'Composite unit contracts separate from individual component contribution; never pooled'})
  for index,s in enumerate(entry['selections']):
   identity={'binding':binding,'case':entry['fixture'],'selection':s,'ordinal':index};effect_id=hashlib.sha256(canonical(identity)).hexdigest()
   state='UNMEASURED';natural=s.get('natural') is True
   items.append({'evidenceId':effect_id,'finalArtifactEvidenceId':entry['rawArtifactEvidenceId'],'naturalSelection':natural,'case':entry['fixture'],'binding':binding,'sourceInventorySHA256':hashlib.sha256(f.read_bytes()).hexdigest(),'intent':s.get('semanticIntent') or s.get('intent') or 'SEMANTIC_INTENT_NOT_RETAINED','operator':s.get('selectedId'),'target':s.get('group'),'unitIndex':s.get('cutIndex',s.get('index')),'line':s.get('line'),'timeRange':s.get('timeRange'),'expectedMotion':s.get('expectedMotion') or 'NOT_RETAINED_AS_INDEPENDENT_CONTRACT','confidence':None,'measurable':None,'observed':None,'realization':state,'failureReason':s.get('reason') or 'No independent same-condition ON/OFF decoded per-operator evidence. Composite primary agreement cannot substitute.','selection':s,'scope':'Actual hash-bound adopted artifact; component selection alone is not realization proof'})
ids=[x['evidenceId'] for x in items];assert len(ids)==len(set(ids))
ledger={'schema':1,'sourceCommit':a.source_commit,'states':['VERIFIED','FAILED','NOT_APPLICABLE','UNMEASURED','CONFOUNDED','STALE'],'items':items,'compositeContracts':contracts,'humanEvaluation':'HUMAN_UNVERIFIED'}
assert items, 'EMPTY_SELECTED_COMPONENT_POPULATION'
ledger_hash=hashlib.sha256(canonical(ledger)).hexdigest();ledger['ledgerSHA256']=ledger_hash
(out/'direction-intent-ledger.json').write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
counts={s:sum(x['realization']==s for x in items) for s in ledger['states']};report={'schema':1,'ledgerSHA256':ledger_hash,'sourceCommit':ledger['sourceCommit'],'selected':len(items),'automaticSelected':sum(x['naturalSelection'] for x in items),'applicable':len(items)-counts['NOT_APPLICABLE'],'measured':counts['VERIFIED']+counts['FAILED'],'successful':counts['VERIFIED'],'statuses':counts,'actualEncodedClockStatus':'UNMEASURED_FOR_INDIVIDUAL_EFFECTS','realizationRate':None,'qualityGo':'UNVERIFIED','reason':'Individually selected components require isolated decoded effect evidence and intended timing. Existing composite primary motion is separately retained.'};(out/'encoded-effect-realization.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report))
