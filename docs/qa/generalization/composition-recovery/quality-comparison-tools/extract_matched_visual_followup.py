"""Deterministic actual-PTS follow-up. No media alteration, threshold tuning or human rating."""
import pathlib,json,hashlib,subprocess,bisect,datetime
from PIL import Image,ImageDraw
BASE=pathlib.Path(__file__).resolve().parents[1];MEDIA=BASE.parent/'media'
OUT=BASE/'matched-three-version-visual-followup';OUT.mkdir(exist_ok=True)
TMP=pathlib.Path('/tmp/kamen-matched-visual-followup');TMP.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
paired=json.load(open(BASE/'pcm-paired-comparison-summary.json'));old=json.load(open(BASE/'final5c92-fixed30-complete-summary.json'))
ids=['development-03','development-05','holdout-01','holdout-03','holdout-08','holdout-15']
selection=[]
for id in ids:
    r=next((r for r in paired['replayed'] if r['fixture']==id),None)
    if r:
        assert r['PCMCorrespondence']=='MATCHED' and all(r['sameConditions'].values())
        videos={k:r['versions'][k]['videoSHA256'] for k in ['main','previous5e','current']}
    else:
        r=next(r for r in old['rows'] if r['fixture']==id)
        assert r['conditionMatch']['status']=='MATCHED' and r['mainConditionMatch']['status']=='MATCHED'
        videos={k:r[v] for k,v in [('main','mainVideoSHA256'),('previous5e','previousVideoSHA256'),('current','currentVideoSHA256')]}
    selection.append({'fixture':id,'videoSHA256s':videos})
prereg={'schema':1,'selectedBeforeThisFrameExtraction':True,'selectionBasis':'Exploratory follow-up of user-named weak cases, previous PCM-confounded visual findings and known matched aspect/motion tradeoffs. Not unused holdout, blinded comparison or human evaluation.','createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'nativeSources':{'main':'2e7ed477f88028dbb63aa609e8a11b4052ea8c00','previous5e':'5e14682249ce690337874214f2ec76fc8e68fa26','current':'5c92e27e6216962d09ec73927fd0df6ce50d0560'},'times':'duration fractions 1/6, 1/2, 5/6; requested offsets -0.125, 0, +0.125 seconds; nearest actual decoded frame PTS, including post-lyric frames if present. Central frames shown in contact sheets; every offset frame hash retained.','acceptance':'No automatic creative PASS. Inspect missing/cut/overlap, composition, legibility and known changes; unobserved full-film/music/effect judgments remain unverified.','selection':selection,'HUMAN':'HUMAN_UNVERIFIED'}
pre=OUT/'preregistration.json';assert not pre.exists(),'Preregistration is immutable; choose a new follow-up directory for a new trial';pre.write_text(json.dumps(prereg,ensure_ascii=False,indent=2)+'\n')
manifest=[]
for s in selection:
    center={};portrait=False
    for version,h in s['videoSHA256s'].items():
        video=MEDIA/(h+'.mp4');assert sha(video)==h
        probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time:stream=width,height','-of','json',str(video)]))
        pts=[float(f['best_effort_timestamp_time']) for f in probe['frames']];stream=probe['streams'][0];portrait=stream['height']>stream['width'];duration=pts[-1]+(pts[1]-pts[0]);rows=[]
        for anchor in [1/6,.5,5/6]:
            for delta in [-.125,0,.125]:
                requested=max(0,min(pts[-1],duration*anchor+delta));j=bisect.bisect_left(pts,requested);idx=min([i for i in [j-1,j] if 0<=i<len(pts)],key=lambda i:abs(pts[i]-requested))
                path=TMP/(s['fixture']+'-'+version+'-'+str(idx)+'.png')
                if not path.exists():subprocess.run(['ffmpeg','-v','error','-threads','1','-i',str(video),'-vf',f'select=eq(n\\,{idx})','-frames:v','1',str(path)],check=True)
                rows.append({'anchor':anchor,'offset':delta,'requestedTime':requested,'actualDecodedPTS':pts[idx],'decodedFrameIndex':idx,'PNG_SHA256':sha(path),'temporaryExactFrame':str(path)})
                if delta==0:center[(version,anchor)]=(path,pts[idx])
        manifest.append({'fixture':s['fixture'],'version':version,'videoSHA256':h,'dimensions':[stream['width'],stream['height']],'frames':rows})
    cw,ch=(240,427) if portrait else (320,180);sheet=Image.new('RGB',(cw*3,(ch+22)*3),(20,20,20));draw=ImageDraw.Draw(sheet)
    for y,a in enumerate([1/6,.5,5/6]):
        for x,version in enumerate(['main','previous5e','current']):
            path,pts=center[(version,a)];im=Image.open(path).convert('RGB');im.thumbnail((cw,ch));sheet.paste(im,(x*cw+(cw-im.width)//2,y*(ch+22)+22+(ch-im.height)//2));draw.text((x*cw+3,y*(ch+22)+4),f'{version} PTS {pts:.3f}',fill='white')
    sheet.save(OUT/(s['fixture']+'-contactsheet.jpg'),quality=94)
    print(s['fixture'],'actual frames preserved',flush=True)
(OUT/'decoded-frame-manifest.json').write_text(json.dumps({'preregistrationSHA256':sha(pre),'actualDecodedFrames':True,'measuredSampleCount':sum(len(r['frames']) for r in manifest),'movies':manifest,'HUMAN':'HUMAN_UNVERIFIED','limits':'Contact sheets are scaled previews; original decoded frame PNG hashes and frame indices are listed for exact re-extraction. No whole-film quality or music suitability verdict is inferred.'},ensure_ascii=False,indent=2)+'\n')
