#!/usr/bin/env python3
"""Deterministic historical inventory. Never promotes legacy VERIFIED to release PASS."""
import argparse, collections, gzip, hashlib, json, pathlib

def load(p):
    b=p.read_bytes()
    return json.loads(gzip.decompress(b) if b[:2]==b'\x1f\x8b' else b)

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def classify(root, out):
    root=pathlib.Path(root); out=pathlib.Path(out);out.mkdir(parents=True,exist_ok=True)
    p=root/'docs/qa/generalization/composition-recovery/release-recovery-20261019'
    names=['intent-audit.json','clock-complete-ledger.json.gz','current31-partial-population.json.gz','existing-mp4-inventory.json','comparison-blockers.json','historical-remaining-release-conditions.json']
    audit,ledger,current,inventory,blockers,historical=[load(p/n) for n in names]
    rows=audit['rows']; bound={r['intentId']:r for r in ledger['rows']}
    assert len(rows)==len(bound)==len({r['intentId'] for r in rows}), 'Duplicate/mismatched Intent population'
    assert set(bound)=={r['intentId'] for r in rows}, 'Audit/clock ledger population mismatch'
    movies={r['videoSHA256']:r for r in inventory['normalBindings']}
    result=[]
    for r in rows:
        b=bound[r['intentId']]; controls=r.get('existingControlReports',[]); required=r['classification'] in ['EXECUTED_IMPORTANT','COMPOSITE_IMPORTANT','INTENTIONAL_STATIC']
        strict=[c for c in controls if c.get('strictOriginalDecodedIdentity') is True]
        reasons=[]
        if required:
            reasons=['IMPORTANCE_AND_TARGET_CONTRACT_NOT_FINALIZED','NO_COMPLETE_V3_SEMANTIC_PHASE_ATTRIBUTION_PROOF','NO_VERIFIED_CURRENT_SOURCE_CORRESPONDENCE']
            # Every historical required row remains E before a contract is frozen.
            # Subsequent jobs are planning hints, never proof that controls suffice.
            work='E';next_work='C' if strict else 'D'
            if b.get('actualDecodedTimestamp') is None: reasons.append('NO_INTENT_BOUND_ACTUAL_DECODED_TIMESTAMP')
        else:
            work='A'; next_work=None
            reasons=['BOOKKEEPING_ONLY_IMPORTANCE_NOT_FINALIZED']
        try:
            unit_tuple=json.loads(r.get('unitKey') or 'null')
            lyric=unit_tuple[5] if isinstance(unit_tuple,list) and len(unit_tuple)>5 else None
        except (ValueError,TypeError): lyric=None
        record={
          'intentId':r['intentId'],'caseId':r['caseId'],'kind':r['classification'],
          'importance':{'candidate':required,'finalized':False,'historicalRequired':r.get('required')},
          'operator':r['operator'],'target':{'unitId':r.get('unitId'),'fragmentId':r.get('fragmentId'),'unitKey':r.get('unitKey'),'scope':r.get('targetScope'),'resolved':b.get('resolvedFinalUnitBinding'),'observedTarget':b.get('observedTarget')},
          'lyrics':{'text':lyric,'source':'exact source-bound unitKey tuple','status':'HISTORICAL_TARGET_ONLY_NOT_FINAL_CONTRACT'},
          'interval':r.get('dispatchInterval'),'phase':r.get('phaseProofRequirements'),
          'binding':{k:r.get(k) for k in ['sourceCommit','inputHash','planHash','videoSHA256','rendererVersion','outputProfile']},
          'ledgerBindingMatches':all(r.get(k)==b.get('binding',{}).get(k) for k in ['sourceCommit','inputHash','planHash','videoSHA256','rendererVersion','outputProfile']),
          'originalMovie':{'inventoryBindingPresent':r['videoSHA256'] in movies,'localMP4Verified':False,'recoveredDecodeRecordOnly':True},
          'controls':controls,'repeat':{'availability':'UNRESOLVED_PER_REPORT','measured':False},
          'encodedStatus':b.get('encodedStatus'),'actualDecodedTimestamp':b.get('actualDecodedTimestamp'),
          'pixelMeasurementComplete':False,'semanticProof':False,'phaseProof':False,'attributionProof':False,
          'legacyStatus':r['status'],'formalCertification':'UNVERIFIED','workClass':work,'afterContractWorkClass':next_work,
          'unprovenReasons':reasons,'historicalBlockers':r.get('blockers',[]),
          'minimumOperation':r.get('requiredAdditionalTest') if required else 'Retain identity/manual-lock record; finalize importance without automatic exclusion',
          'reuseHint': 'Recover exact hash-bound original/control/repeat and evaluate frozen contract' if strict else 'Locate matching retained controls first; generate only after absence is verified',
          'nativeTrace':r.get('nativeTrace'),'historicalCertificate':r.get('existingCertificate')}
        assert record['ledgerBindingMatches'], 'Audit/ledger binding mismatch '+r['intentId']
        result.append(record)
    def jsonl(name, data):
        with (out/name).open('w') as f:
            for row in data:f.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')
    jsonl('intents-1250.jsonl', result)
    required=[r for r in result if r['importance']['candidate']]
    jsonl('important-candidates-1129.jsonl', required)
    # The 5eb population has different source-bound IDs. Keep a separate full
    # classification; names/operators never transfer d04 control credit.
    current_rows=[]
    for r in current['rows']:
        current_required=r['classification'] in ['EXECUTED_IMPORTANT','COMPOSITE_IMPORTANT','INTENTIONAL_STATIC']
        try: unit=json.loads(r.get('unitKey') or 'null')
        except (ValueError,TypeError): unit=None
        trace=r.get('trace','');case=pathlib.PurePosixPath(trace).parent.name if trace else None
        d=r.get('dispatch',{});pairs=d.get('clockPairs',[])
        current_rows.append({'intentId':r['intentId'],'caseId':case,'kind':r['classification'],
          'importance':{'candidate':current_required,'finalized':False},'operator':r['operator'],
          'target':r.get('resolvedFinalUnitBinding'),'lyrics':unit[5] if isinstance(unit,list) and len(unit)>5 else None,
          'interval':[d.get('firstTime'),d.get('lastTime')],
          'phase':{'clockDomain':d.get('executionContext'),'preservedClockPairs':len(pairs),'finalized':False},
          'binding':r.get('binding'),'originalMP4':{'videoSHA256':r['videoSHA256'],'availability':'HASH_BOUND_RECOVERY_RECORD_NOT_NEW_LOCAL_VERIFICATION'},
          'control':{'availability':'UNRESOLVED_FOR_EXACT_SOURCE','legacySourceControlsNotTransferred':True},
          'repeat':{'availability':'UNRESOLVED_FOR_EXACT_SOURCE'},'inputAudioPlan':{'bindingRetained':True,'completeBytesLocallyVerified':False},
          'encodedStatus':r.get('encodedStatus'),'actualDecodedTimestamp':r.get('actualDecodedTimestamp'),
          'pixelMeasurementComplete':False,'semanticProof':False,'phaseProof':False,'attributionProof':False,
          'formalCertification':'UNVERIFIED','workClass':'E' if current_required else 'A',
          'unprovenReasons':[r.get('targetContractBlocker','CONTRACT_NOT_FINALIZED'),'NO_CURRENT_RELEASE_SOURCE_CORRESPONDENCE','EXACT_SOURCE_CONTROL_REPEAT_AND_V3_PROOFS_NOT_ESTABLISHED'] if current_required else ['BOOKKEEPING_ONLY_IMPORTANCE_NOT_FINALIZED'],
          'minimumOperation':'Freeze source-bound target/phase/importance, recover exact original/input/PCM/plan and search same-source controls before measurements or any generation' if current_required else 'Retain manual/identity record pending finalized importance',
          'nativeTrace':{'recordedPath':trace,'rawSHA256':r.get('traceRawSHA256')},'bindingStatus':r.get('bindingStatus')})
    assert len({r['intentId'] for r in current_rows})==len(current_rows)==len(result)
    jsonl('current-intents-1250.jsonl',current_rows)
    jsonl('current-important-candidates-1129.jsonl',[r for r in current_rows if r['importance']['candidate']])
    # Preserve all raw historical condition fields, adding explicit current status.
    canonical_path=p.parent/'release-current-head/comparisons.json'
    canonical=load(canonical_path)
    canonical_rows=canonical['conditions']+canonical['independent']
    assert {r['id'] for r in canonical_rows}=={r['id'] for r in blockers['conditions']}
    comparisons=[{**r,'currentFinalJudgment':'UNVERIFIED','minimumOperation':'Bind original/comparison movies, PCM, lyric timing and full phrase-level review; no proxy-only judgment','proxyMayDecide':False} for r in canonical_rows]
    (out/'regressions-31.json').write_text(json.dumps({'sourceCommit':canonical['sourceCommit'],'canonicalSHA256':digest(canonical_path),'conditions':comparisons},ensure_ascii=False,indent=2)+'\n')
    (out/'historical-six.json').write_text(json.dumps({'historicalEvidence':historical,'currentDecodeFailureImplied':False,'causeEstablished':False,'requiredSeparation':['exact original MP4 hashes and source','encode settings','pixel format and color conversion','font/render environment','source/output clocks and frame boundaries'],'minimumOperation':'Recover six old d04 originals and corresponding encode/native metadata before testing conversion hypotheses; Native32 alone does not resolve encoded identity'},ensure_ascii=False,indent=2)+'\n')
    summary={'schema':1,'inputs':[{ 'path':str((p/n).relative_to(root)), 'sha256':digest(p/n)} for n in names],
      'historicalSource':ledger['sourceCommit'],'currentPartialSource':current['sourceCommit'],
      'population':len(result),'importantCandidates':len(required),'importanceFinalized':False,
      'kinds':dict(collections.Counter(r['kind'] for r in result)), 'workClasses':dict(collections.Counter(r['workClass'] for r in result)),
      'postContractWorkHints':dict(collections.Counter(r['afterContractWorkClass'] for r in required)),
      'formalProvenImportant':0,'formalUnprovenImportant':len(required),'legacyVerifiedNotTransferred':sum(r['legacyStatus']=='VERIFIED' for r in required),
      'currentPopulation':len(current_rows),'currentWorkClasses':dict(collections.Counter(r['workClass'] for r in current_rows)),'currentIDsIntersectHistorical':len(set(bound)&{r['intentId'] for r in current_rows}),'regressions':len(comparisons),'finalRegressionJudgments':sum(r['significantRegression'] is not None for r in comparisons),
      'newVideoLowerBound':0,'newVideoMinimumEstablished':False,
      'minimumLogicalWork':{'pipelineKinds':3,'intentContracts':len(required),'regressionReviews':len(comparisons),'historicalDiagnoses':6},
      'limits':['A means reusable bookkeeping, not quality PASS.','C/D are provisional work hints after E is resolved.','No absence of controls inferred merely from an empty historical row.','No new-video minimum can be proved before exact report/media recovery and contract freeze.','Partial 5eb ledger IDs are source-specific and never joined to d04 IDs by name alone.']}
    (out/'classification-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    return summary
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('root');p.add_argument('out');a=p.parse_args();s=classify(a.root,a.out)
    print(json.dumps({k:s[k] for k in ['population','importantCandidates','workClasses','postContractWorkHints','formalProvenImportant','regressions']}))
