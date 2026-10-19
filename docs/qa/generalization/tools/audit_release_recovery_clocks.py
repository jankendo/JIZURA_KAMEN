"""Enrich the frozen ledger from its original traces, preserving every intent ID."""
import pathlib,json,gzip,hashlib,sys,collections,copy
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';O=R/'release-recovery-20261019';sys.path.insert(0,str(Q/'tools'))
from build_important_executed_population import temporal_contract_calls,POLICY
p=R/'grammar-policy-v2-current32-executed-intent-ledger.json.gz';original=p.read_bytes();ledger=json.loads(gzip.decompress(original));ids=[r['intentId']for r in ledger['rows']];repaired=[];domains=collections.Counter();rows=[]
for r in ledger['rows']:
 if r['group']=='LYRIC_TEMPORAL_CONTRACT':
  raw=gzip.decompress((Q/r['trace']).read_bytes());assert hashlib.sha256(raw).hexdigest()==r['traceRawSHA256'];trace=json.loads(raw)
  matches=[c for c in temporal_contract_calls(trace['temporalContracts'])if c['unitKey']==r['dispatch']['unitKey']];assert len(matches)==1
  c=matches[0];assert c['calls']==r['dispatch']['calls']and c['firstTime']==r['dispatch']['firstTime']and c['lastTime']==r['dispatch']['lastTime']
  r['dispatch']=c;repaired.append({'intentId':r['intentId'],'trace':r['trace'],'traceRawSHA256':r['traceRawSHA256'],'actualClockRecords':len(c['clockPairs']),'contractStateRecords':len(c['contractEvidence'])})
 contexts=sorted({e.get('executionContext','UNMEASURED')for e in r['dispatch'].get('executionRecords',[])})
 clocks=r['dispatch'].get('clockPairs',[]);known=[c for c in clocks if isinstance(c.get('sourceTimestamp'),(int,float))and isinstance(c.get('actualOutputTimestamp'),(int,float))]
 relation=collections.Counter('SAME_CLOCK'if c['sourceTimestamp']==c['actualOutputTimestamp']else'REMAPPED_CLOCK'for c in known)
 domain='MIXED_DIRECT_AND_REMAPPED'if set(contexts)=={'ADOPTED_OUTPUT_CLOCK','REMAPPED_SOURCE_CLOCK'}else'DIRECT_ONLY'if contexts==['ADOPTED_OUTPUT_CLOCK']else'REMAPPED_ONLY'if contexts==['REMAPPED_SOURCE_CLOCK']else'UNMEASURED_CONTEXT'
 domains[domain]+=1
 r['phaseProofRequirements']={'executionContexts':contexts,'clockDomain':domain,'actualClockRecords':len(clocks),'knownSourceAndOutputClocks':len(known),'clockRelations':dict(relation),'sourceClockRange':[min(c['sourceTimestamp']for c in known),max(c['sourceTimestamp']for c in known)]if known else None,'outputClockRange':[min(c['actualOutputTimestamp']for c in known),max(c['actualOutputTimestamp']for c in known)]if known else None,'outgoingSnapshotObservationRequired':'REMAPPED_SOURCE_CLOCK'in contexts,'noAutomaticNonApplicabilityOrSemanticCredit':True,'method':'Output clock identifies the completed video frame; source clock identifies the drawn source unit. A frozen outgoing lyric texture is not certified by a different current lyric at the same output frame.'}
 rows.append({'intentId':r['intentId'],'group':r['group'],'operator':r['operator'],'unitId':r['resolvedFinalUnitBinding'].get('unitId'),'fragmentId':r['resolvedFinalUnitBinding'].get('fragmentId'),'videoSHA256':r['videoSHA256'],**r['phaseProofRequirements']})
assert ids==[r['intentId']for r in ledger['rows']]and len(repaired)==6
ledger.update(policy=POLICY,semanticPopulationFinalized=False,derivation={'originalLedgerFile':str(p.relative_to(Q)),'originalLedgerFileSHA256':hashlib.sha256(original).hexdigest(),'repairedSyntheticTemporalRows':6,'removedIntentIds':[],'addedIntentIds':[],'limits':'Clock/state metadata recovery only. Original sources and video hashes retained; this is not a decoded semantic certificate or a current candidate natural population.'})
raw=json.dumps(ledger,ensure_ascii=False,separators=(',',':')).encode();out=O/'clock-complete-ledger.json.gz';out.write_bytes(gzip.compress(raw,mtime=0))
summary={'sourceCommit':ledger['sourceCommit'],'policy':POLICY,'rows':len(rows),'importantIdsUnchanged':ledger['expectedImportantIntentIds'],'classificationFinalized':False,'clockDomains':dict(domains),'repairedSyntheticTemporalRows':repaired,'ledgerFileSHA256':hashlib.sha256(out.read_bytes()).hexdigest(),'newMP4s':0,'newDecodes':0,'rowsByClockDomain':rows}
(O/'clock-population-audit.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print({'rows':len(rows),'clockDomains':dict(domains),'repaired':len(repaired),'clockRecordsRecovered':sum(x['actualClockRecords']for x in repaired),'newMP4s':0})
