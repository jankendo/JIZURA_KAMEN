"""Preserve historical rows; substitute only newly completed, matched three-version trials."""
import gzip,hashlib,json,math,pathlib,statistics
ROOT=pathlib.Path(__file__).resolve().parents[1]
QA=ROOT.parent
def read(p):
    return json.loads(gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes())
def digest(p):
    h=hashlib.sha256()
    with (gzip.open(p,'rb') if p.suffix=='.gz' else p.open('rb')) as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()
def stats(xs):
    a=sorted(x for x in xs if isinstance(x,(int,float)) and math.isfinite(x))
    return {'n':len(a),'mean':statistics.mean(a) if a else None,'worst':min(a) if a else None,'lower20Mean':statistics.mean(a[:max(1,math.ceil(len(a)*.2))]) if a else None}
prereg=read(ROOT/'pcm-matched-replay-preregistration.json')
expected={f['id'] for f in prereg['fixtures']}
historical=read(ROOT/'final5c92-fixed30-complete-summary.json')
rows={r['fixture']:{**r,'comparisonOrigin':'PREVIOUSLY_MATCHED_TRIAL_PRESERVED'} for r in historical['rows'] if r['conditionMatch']['status']=='MATCHED' and r['mainConditionMatch']['status']=='MATCHED'}
replayed=[];incomplete=[];verified_members=0
for fixture in sorted(expected):
    d=ROOT/('pcm-paired-'+fixture);mf=d/'archive-manifest.json'
    if not mf.exists():incomplete.append(fixture);continue
    manifest=read(mf);members={m['member']:m for m in manifest['files']}
    for m in members.values():
        p=QA/m['preserved'];assert digest(p)==m['SHA256'],str(p);verified_members+=1
    pcm=read(QA/members['pcm-correspondence.json']['preserved'])
    trials=[]
    for name in ['matrix/results.json','previous/results.json']:
        for r in read(QA/members[name]['preserved'])['rows']:
            if r['fixture']['id']==fixture:trials.append(r)
    assert len(trials)==3,fixture
    decoded=[]
    for name in ['strict-decode.json','previous-strict-decode.json']:
        decoded+=read(QA/members[name]['preserved'])['entries']
    normalized={}
    for r in trials:
        fav=r.get('provenance',{}).get('finalArtifactVerification',{});binding=fav.get('binding',{})
        source=binding.get('sourceCommit');kind=next(k for k,v in prereg['sources'].items() if v==source)
        match=[x for x in decoded if x['fixture']==fixture and x['variant']==r['variant'] and x['videoSHA256']==r['sha256']]
        assert len(match)==1 and match[0]['completeDecode']=='PASS' and match[0]['codec']=='H.264/AAC'
        assert binding['videoSHA256']==r['sha256']
        normalized[kind]={'sourceCommit':source,'videoSHA256':r['sha256'],'binding':binding,'metrics':r.get('decoded',{}).get('metrics',{}),'lyricSafety':fav.get('status'),'decode':'PASS','decodeFrames':match[0]['frames']}
    row={'fixture':fixture,'comparisonOrigin':'NEW_SAME_RUNNER_THREE_VERSION_TRIAL','PCMCorrespondence':pcm['status'],'sameConditions':pcm['checks'],'versions':normalized,'archiveManifest':str(mf.relative_to(ROOT)),'archiveManifestSHA256':hashlib.sha256(mf.read_bytes()).hexdigest()}
    replayed.append(row)
    if pcm['status']=='MATCHED' and all(pcm['checks'].values()):rows[fixture]=row
report={'scope':'Input/profile/seed/PCM-matched actual shipping MP4 comparisons; scores remain descriptive engineering observations, not calibrated artistic quality. Original trials and failed attempts are untouched. Observer-code differences and aesthetic tradeoffs are not silently resolved.','expectedReplayConditions':len(expected),'completedReplayConditions':len(replayed),'pendingReplayConditions':incomplete,'matchedTotalConditions':len(rows),'verifiedCanonicalMembers':verified_members,'replayed':replayed,'all30':list(rows.values()),'statistics':{},'HUMAN':'HUMAN_UNVERIFIED','QUALITY_GO':'UNVERIFIED'}
# The historical matched twelve retain their raw main/previous/current metric
# fields; newly paired rows retain explicit source-version bindings.
for metric in ['typographyDiversity','lyricForegroundNovelty','temporalContrast','localContrast','motionRealization','perceptualNovelty','hookNovelty']:
    groups={'main':[],'previous':[],'current':[]}
    for row in rows.values():
        if 'versions' in row:
            vs=row['versions']
            for key,source in prereg['sources'].items():
                target='main' if source.startswith('2e7ed477') else 'previous' if source.startswith('5e146822') else 'current'
                groups[target].append(vs[key]['metrics'].get(metric))
        else:
            for target,key in [('main','main'),('previous','previous5e'),('current','current')]:groups[target].append(row[key].get(metric))
    pairs=[(a,b) for a,b in zip(groups['previous'],groups['current']) if isinstance(a,(int,float)) and isinstance(b,(int,float))]
    report['statistics'][metric]={k:stats(v) for k,v in groups.items()}|{'improved':sum(b>a for a,b in pairs),'same':sum(b==a for a,b in pairs),'lower':sum(b<a for a,b in pairs)}
out=ROOT/'pcm-paired-comparison-summary.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['completedReplayConditions','pendingReplayConditions','matchedTotalConditions','verifiedCanonicalMembers','statistics']},ensure_ascii=False))
