"""Bind actual full-frame Native equality and the actual Git diff; never relabel movie sources."""
import pathlib,json,gzip,hashlib,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
QA=ROOT/'composition-recovery';REPO=pathlib.Path('/workspace/kamen-next')
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes())
git=lambda *args:subprocess.check_output(['git','-C',str(REPO),*args])
current=git('rev-parse','HEAD').decode().strip()
out=QA/('release-'+current[:7]+'-source-correspondence');out.mkdir(exist_ok=True)
def ref(name,obj):
    p=out/name;b=(json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode();p.write_bytes(b)
    return {'path':name,'sha256':sha(b)}
proofs=[]
for number in ['01','02']:
    new=QA/('effectsc043-native-'+number)/'native-source-continuity-dispatch.json.gz';d=read(new)
    old=QA/('supplement5c92-'+number)/'matrix/results.json.gz'
    row=next(r for r in read(old)['rows'] if r['variant']=='v3')
    binding=row['provenance']['finalArtifactVerification']['binding'];native=row['nativeOutputProof']
    groups=[g for g in native['groups'] if g['planHash']==binding['planHash'] and len(g['frames'])==round((binding['outputProfile']['range'][1]-binding['outputProfile']['range'][0])*binding['outputProfile']['fps'])]
    assert len(groups)==1 and d['build']['sourceCommit']==current
    before=groups[0]['frames'];after=d['nativeHashes'];assert before==after and d['sourceContinuity']['mismatches']==[]
    n={'sourceCommit':current,'fromCommit':binding['sourceCommit'],'toCommit':current,'actualNativeFrames':True,'completeOutputFramePopulation':True,'expectedFrameCount':len(before),'inputHash':binding['inputHash'],'outputProfile':binding['outputProfile'],'rendererVersion':binding['rendererVersion'],'selectedPlanHash':binding['planHash'],'originalVideoSHA256':binding['videoSHA256'],'frames':[{'frameIndex':i,'actualNativeTime':a['time'],'beforeRGBA_SHA256':a['sha256'],'afterRGBA_SHA256':b['sha256']} for i,(a,b) in enumerate(zip(before,after))],'rawObservations':[{'path':str(p.relative_to(QA)),'storedSHA256':sha(p.read_bytes())} for p in [old,new]],'scope':'Frozen adopted plan correspondence; all planning/selection changes must separately be excluded by actual Git diff assessment. Original encoded movie remains bound to its original source.'}
    proofs.append(ref('native-comparison-'+number+'.json',n))
old=binding['sourceCommit'];diff=git('diff','--no-ext-diff','--no-renames','--binary',old,current,'--');diffsha=sha(diff)
with gzip.GzipFile(filename=str(out/'actual-source-diff.patch.gz'),mode='wb',mtime=0) as f:f.write(diff)
paths=git('diff','--no-ext-diff','--no-renames','--name-only','-z',old,current,'--').decode().split('\0');paths=sorted(p for p in paths if p)
qa={'dev/pages_e2e.cjs','dev/export_watchdog.cjs','dev/export_watchdog_test.cjs','dev/release_gates.cjs','dev/release_gates_test.cjs'}
reasons={
 'src/11zzm_story_director.js':'Forward real raster progress for unchanged fallback/baseline checks; candidate generation, ranks and rendering calls remain intact.',
 'src/11zzzzzz_video_search.js':'Forward real nested candidate progress without changing search candidates or scores.',
 'src/11zzzzzzzz_cinema_v3.js':'Forward telemetry through nested legacy proxy/readability work and report actual candidate work events; no changed rendering, candidate eligibility, selection score or threshold.',
 'dev/generation_profile.cjs':'Optional test-host profiling instrumentation, not a shipped rendering input.',
 'dev/cinema_nested_progress_test.cjs':'Contract regression for nested progress forwarding, not a shipped renderer.',
 'scripts/run-tests.mjs':'Register additional QA contract tests; production build algorithm unchanged.'
}
assessment=[]
for p in paths:
    if p.startswith('.github/workflows/'):kind='CI_ONLY';reason='CI step budget/instrumentation; existing main-only Pages deployment retained.'
    elif p in qa or p.startswith('docs/qa/'):kind='QA_ONLY';reason='Known non-shipping QA harness/evidence path; Native comparison is still required for the separate runtime telemetry changes.'
    else:
        assert p in reasons,'UNASSESSED_SOURCE_PATH '+p
        kind='TELEMETRY_ONLY';reason=reasons[p]
    assessment.append({'path':p,'classification':kind,'reason':reason,'diffHunkSHA256':sha(git('diff','--no-ext-diff','--no-renames','--binary',old,current,'--',p))})
runtime=ref('runtime-impact-assessment.json',{'sourceCommit':current,'fromCommit':old,'toCommit':current,'gitDiffSHA256':diffsha,'paths':assessment,'classificationNote':'Legacy TELEMETRY_ONLY also covers explicitly listed non-shipping profiler/test registration; these do not use the QA-only tree bypass. Actual complete Native equality remains mandatory.','limits':'Native equality is only observed for the two frozen adopted plans. Telemetry-only runtime assessment must be reviewed independently; it is not inferred from those two plans alone.'})
c=ref('source-correspondence.json',{'sourceCommit':current,'fromCommit':old,'toCommit':current,'gitDiffSHA256':diffsha,'changedPaths':paths,'runtimeAssessment':runtime,'nativeComparison':proofs[0],'additionalNativeComparisons':proofs[1:]})
ref('index.json',{'sourceCommit':current,'correspondence':c,'nativeFrameCounts':[240,240],'originalMovieSourcesPreserved':True})
print(json.dumps({'output':str(out),'sourceCommit':current,'changedPaths':len(paths),'fullNativeCases':len(proofs)}))
