#!/usr/bin/env python3
"""Separate retained evidence from causal conclusions. Does not re-encode."""
import argparse,hashlib,json,pathlib

def run(root,out):
 p=pathlib.Path(root)/'docs/qa/generalization/composition-recovery/release-recovery-20261019';out=pathlib.Path(out)
 paths=['encoded-mismatches/summary.json','encoder-boundary-development01/summary.json','font-raster-environment/summary.json','native-preconditions/summary.json']
 data=[json.loads((p/n).read_bytes()) for n in paths];encoded,boundary,font,preconditions=data
 current=json.loads((p.parent/'release-current-head/comparisons.json').read_bytes());current_hash={r['id']:r['candidateFreshNaturalMP4'] for r in current['conditions']+current['independent']}
 cases=[]
 for r in encoded['rows']:
  codecpath=p/'encoded-mismatches'/(r['caseId']+'-ORIGINAL-codec.json');codec=json.loads(codecpath.read_bytes());pairs=r['pairs']
  cases.append({'caseId':r['caseId'],'sourceCommit':r['sourceCommit'],'historicalOriginalMP4':codec['videoSHA256'],'recovered5ebMovieSHA256':current_hash.get(r['caseId']),
   'sameHistoricalAnd5ebMovie':codec['videoSHA256']==current_hash.get(r['caseId']),
   'strictOriginalDecodedIdentity':r['strictOriginalDecodedIdentity'],'retainedFullNativePairIdentity':r['sourceNativeRGBAExactForAllOutputFrames'],
   'decodeFailure':False,'decodeFailureBasis':'Both retained streams produced decoded hashes and per-frame PSNR; identity failure is not decoder failure',
   'observed':{'allComparedPacketClocksEqual':all(x['actualPacketClocksEqual'] for x in pairs),'allListedCodecColorPropertiesEqual':all(x['codecAndColorPropertiesEqual'] for x in pairs),'allListedH264HeadersEqual':all(x['h264ListedHeadersEqual'] for x in pairs),'allQPSlicesEqual':all(x['changedQPSlices']==0 for x in pairs),'codedPacketDifferences':[{k:x[k] for k in ['mode','changedCodedPackets','firstChangedCodedPacket']} for x in pairs]},
   'sourceEvidence':{'summaryPath':paths[0],'summarySHA256':hashlib.sha256((p/paths[0]).read_bytes()).hexdigest(),'codecPath':str(codecpath.relative_to(p)),'codecSHA256':hashlib.sha256(codecpath.read_bytes()).hexdigest()},
   'causalConclusion':'UNRESOLVED: matching listed properties/clocks do not identify historical frame-buffer, conversion or encoder-state cause',
   'minimumOperation':'Recover original submitted frame buffers/metadata and exact pipeline settings before any paired decode or generation; preserve original and repeat identities separately'})
 assert len(cases)==6
 report={'schema':1,'cases':cases,'evidence':[{'path':n,'sha256':hashlib.sha256((p/n).read_bytes()).hexdigest()} for n in paths],
  'development01CounterEvidence':{'freshNativeEqualsHistorical':boundary['completeNativeEqualsOriginal'],'freshNativeRepeatsEqual':boundary['nativeRepeatsEqual'],'submittedBuffersAndMetadataEqualBetweenFreshRepeats':boundary['submittedFrameBuffersAndMetadataEqual'],'freshEncoderConfigsEqual':boundary['encoderConfigsEqual'],'freshDecodedRepeatsEqual':boundary['decodedRepeatsEqual'],'finding':boundary['finding'],'audioAnalysisFinding':preconditions['finding']},
  'fontCounterEvidence':{'sharedResources':len(font['commonResourceURLs']) if isinstance(font['commonResourceURLs'],list) else font['commonResourceURLs'],'sharedByteMismatches':font['commonResourceByteMismatches'],'isolatedSamples':font['samples'],'allSampleRastersAndWidthsEqual':font['allSampleRastersAndWidthsEqual'],'finding':font['finding']},
  'established':['All six old original MP4 hashes differ from corresponding recovered 5eb movies.','Listed codec/color/header/QP properties and packet clocks match in retained pairs.','Creation-time metadata differences alone do not explain decoded pixel differences.','Development-01 fresh repeats agree with each other but differ from historical Native in 25/240 frames; this does not isolate an encoder cause.','Shared font bytes/12 isolated raster samples match; full-render context remains unresolved.'],
  'notEstablished':['Historical submitted pixel-buffer equality with fresh probes','Historical pixel/color conversion equality','Full-render font/context equality','Unique encoder cause','Resolution by the distinct Native32 source-5eb run'],
  'newMP4s':0,'newDecodes':0,'currentDecodeFailureImplied':False,'resolvedCases':0,'unresolvedCases':6}
 (out/'historical-six-analysis.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'cases':6,'resolved':0,'sameMoviePairs':sum(c['sameHistoricalAnd5ebMovie'] for c in cases),'newMP4s':0,'newDecodes':0}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('root');p.add_argument('out');a=p.parse_args();run(a.root,a.out)
