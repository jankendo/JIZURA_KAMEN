import json,hashlib,subprocess
from pathlib import Path
p=Path('/workspace/kamen-next-evidence/docs/qa/generalization/composition-recovery/release9f-current-observations')
def ref(n):return {'path':n,'sha256':hashlib.sha256((p/n).read_bytes()).hexdigest()}
m=json.loads((p/'release-observation-manifest.json').read_text());m['gitRepository']='/workspace/kamen-quality-root';m['evidence']['ci']=ref('current-ci.json');m['historicalObservationRefs']=[ref('historical-ci987.json'),ref('historical-ci987-observations.json'),ref('current-coverage-context.json'),ref('interrupted-matrix-recovery.json')];m['sourceCorrespondence']=[]
def dumpref(n,d):
 (p/n).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');return ref(n)
source=m['releaseSourceCommit']; base={'sourceCommit':source,'observationStatus':'UNVERIFIED','scope':'Current release source only; historical observations are separately retained.'}
summary=json.loads((p.parent/'final5c92-fixed30-partial28-summary.json').read_text())
expected=[r['fixture'] for r in summary['rows']]+summary['missing']
m['evidence']['tests']=dumpref('current-tests.json',{**base,'cases':[],'reason':'Exact final9f regression/install/build run has not completed at snapshot.'})
m['evidence']['browser']=dumpref('current-browser.json',{**base,'actualBrowser':None,'operations':[],'reason':'Actual987 browser evidence remains historical pending final9f execution or valid correspondence.'})
m['evidence']['artifacts']=dumpref('current-artifacts.json',{**base,'movies':[],'historicalGroups':m['observationGroupsByOriginalSourceCommit'],'reason':'No final9f completed movie or unique source correspondence certified.'})
m['evidence']['comparisons']=dumpref('current-comparisons.json',{**base,'expectedConditionIds':expected,'conditions':[],'independent':[],'historicalCoverageRef':ref('current-coverage-context.json'),'reason':'Fixed5c92 population remains28/30; final9f correspondence and significant regression assessment incomplete.'})
m['evidence']['operators']=dumpref('current-operators.json',{**base,'expectedImportantIntentIds':[],'observations':[],'reason':'Final9f important semantic intent population with isolated encoded controls not established.'})
m['evidence']['safety']=dumpref('current-safety.json',{**base,'knownMajorDefects':None,'lyricMissing':None,'audioBroken':None,'manualLocksChanged':None,'allTargetPathsBound':None,'finalArtifactMatchesSource':None,'pathObservations':[],'reason':'No observed major defect is invented; current all-path safety correspondence remains unverified.'})
mp=p/'release-gate-manifest.json';mp.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
r=subprocess.run(['node','/workspace/kamen-quality-root/dev/release_gates.cjs',str(mp)],capture_output=True,text=True);assert r.returncode in (0,2),r.stderr;g=json.loads(r.stdout);(p/'generated-candidate-gates.json').write_text(r.stdout)
counts={}
for s,rf in m['observationGroupsByOriginalSourceCommit'].items():
 a=json.loads((p/rf['path']).read_text());counts[s]={'movies':len(a['movies']),'completeDecode':sum(x['decodeComplete'] is True for x in a['movies']),'codecsH264AAC':sum(x['codecVideo']=='h264' and x['codecAudio']=='aac' for x in a['movies'])}
summary={'releaseSourceCommit':m['releaseSourceCommit'],'TECHNICAL_GO':g['TECHNICAL_GO'],'QUALITY_GO':g['QUALITY_GO'],'RELEASE_GO':g['RELEASE_GO'],'normalizedMovieCountsByOriginalSource':counts,'incompleteAttempts':len(m['failedOrIncompleteAttempts']),'currentSourceEquivalentMovieCount':0,'gateIssues':g['issues'],'normalizationPolicy':m['normalizationPolicy']};(p/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,ensure_ascii=False))
(p/'README.md').write_text('''# Final9f current observation checkpoint

Generated using `build_release_observations.py` and `dev/release_gates.cjs`; original source commits and archive JSON pointers remain unchanged. `release-gate-manifest.json` is the adapter input; `generated-candidate-gates.json` is machine output, not a hand-entered release decision.

Current9f CI is still in progress at the recorded GitHub snapshot. Historical987 CI and actual browser results are stored separately. No final9f source correspondence is asserted, so preserved5c92 movies cannot certify current artifacts. Complete30 population, PCM-confounded comparisons, metric tradeoffs and important isolated semantic controls still require resolution. These gaps are UNVERIFIED, not invented failures. No merge or deployment is implied.
''')
