import json,hashlib,subprocess
from pathlib import Path
p=Path('/workspace/kamen-next-evidence/docs/qa/generalization/composition-recovery/release-eb60-observations')
def ref(n):return {'path':n,'sha256':hashlib.sha256((p/n).read_bytes()).hexdigest()}
def dump(n,d):
 (p/n).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');return ref(n)
m=json.loads((p/'release-observation-manifest.json').read_text());source=m['releaseSourceCommit'];m['gitRepository']='/workspace/kamen-quality-root';m['sourceCorrespondence']=[];m['evidence']['ci']=ref('current-ci.json')
counts={};fixture_counts={};historical_fixed=[]
for s,rf in m['observationGroupsByOriginalSourceCommit'].items():
 a=json.loads((p/rf['path']).read_text());movies=a['movies'];counts[s]={'movies':len(movies),'fullDecodedH264AAC':sum(x['decodeComplete'] and x['codecVideo']=='h264' and x['codecAudio']=='aac' for x in movies)}
 fixed=sorted({x['fixtureId'] for x in movies if x['fixtureId'].startswith(('development-','holdout-','supplemental-development-','supplemental-holdout-'))});fixture_counts[s]={'fixedConditionIds':fixed,'fixedConditionCount':len(fixed),'otherConditionIds':sorted({x['fixtureId'] for x in movies if x['fixtureId'] not in fixed})}
 if s.startswith('5c92'):historical_fixed=fixed
base={'sourceCommit':source,'observationStatus':'UNVERIFIED','scope':'Finaleb60 source only; historical movies and operations are not relabeled as current execution.'}
m['evidence']['tests']=dump('current-tests.json',{**base,'cases':[],'reason':'Exacteb60 final CI remains in progress at captured snapshot.'})
m['evidence']['browser']=dump('current-browser.json',{**base,'actualBrowser':None,'operations':[],'reason':'Finaleb60 actual UI result not captured yet.9f failed harness deadline;987 remains historical.'})
m['evidence']['artifacts']=dump('current-artifacts.json',{**base,'movies':[],'historicalGroups':m['observationGroupsByOriginalSourceCommit'],'reason':'No certified finaleb60 raw movie/source correspondence in this manifest.'})
m['evidence']['comparisons']=dump('current-comparisons.json',{**base,'expectedConditionIds':historical_fixed,'conditions':[],'independent':[],'historicalCoverage':fixture_counts,'reason':'Frozen5c92 30-condition recovery is retained without claiming finaleb60 provenance, comparability or tradeoff resolution.'})
m['evidence']['operators']=dump('current-operators.json',{**base,'expectedImportantIntentIds':[],'observations':[],'reason':'Finaleb60 important semantic population/isolated encoded-control proof incomplete.'})
m['evidence']['safety']=dump('current-safety.json',{**base,'knownMajorDefects':None,'lyricMissing':None,'audioBroken':None,'manualLocksChanged':None,'allTargetPathsBound':None,'finalArtifactMatchesSource':None,'pathObservations':[],'reason':'No observed quality failure fabricated from insufficient source/path correspondence.'})
m['historicalAndProposalRefs']=[ref(n) for n in ['checkpoint-run-index.json','qa-only-source-correspondence-proposal.json']]
mp=p/'release-gate-manifest.json';mp.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
r=subprocess.run(['node','/workspace/kamen-quality-root/dev/release_gates.cjs',str(mp)],capture_output=True,text=True);assert r.returncode in(0,2),r.stderr;g=json.loads(r.stdout);(p/'generated-candidate-gates.json').write_text(r.stdout)
dump('summary.json',{'releaseSourceCommit':source,'TECHNICAL_GO':g['TECHNICAL_GO'],'QUALITY_GO':g['QUALITY_GO'],'RELEASE_GO':g['RELEASE_GO'],'normalizedMovieCountsByOriginalSource':counts,'fixtureCounts':fixture_counts,'incompleteAttempts':len(m['failedOrIncompleteAttempts']),'currentEquivalentMovieCount':0,'issues':g['issues'],'sourceCorrespondence':'UNVERIFIED_QA_ONLY_PROPOSAL_NOT_ACCEPTED_OR_SILENTLY_RECLASSIFIED','human':'HUMAN_UNVERIFIED'})
(p/'README.md').write_text('''# Finaleb60 observation checkpoint

`release-gate-manifest.json` is the hash-bound input to unchanged `dev/release_gates.cjs`; `generated-candidate-gates.json` is machine output. Canonical completed movies retain originalsource and JSON pointers. Historical5c92 fixed30 recovery and additional04 cases are normalized without relabeling them finaleb60 execution.

Finaleb60 CI remains in progress at captured GitHub snapshot. Historical9f CI failed due to harness timeout, while historical987 CI succeeded; neither is silently substituted for finaleb60 CI. QA-only change correspondence is a documented proposal with actual Git diff/tree checks, not a gate override. Final source/artifact/UI correspondence, PCM comparability, known tradeoffs and important semantic controls still require evidence. No deployment or artistic100 certification is implied.
''')
print(json.dumps({'counts':counts,'fixedCounts':{k:v['fixedConditionCount'] for k,v in fixture_counts.items()},'gates':{k:g[k]for k in ['TECHNICAL_GO','QUALITY_GO','RELEASE_GO']}}))
