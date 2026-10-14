import pathlib,json,subprocess,numpy as np,gzip,hashlib,sys
local=pathlib.Path(sys.argv[1]);qa=pathlib.Path(sys.argv[2]);original=local/'adopted/supplemental-holdout-13-v3.mp4'
def decoded(path,w,h):
 data=subprocess.check_output(['ffmpeg','-v','error','-xerror','-i',str(path),'-map','0:v:0','-vf',f'scale={w}:{h}:flags=bilinear','-pix_fmt','rgb24','-f','rawvideo','-']);rgb=np.frombuffer(data,dtype=np.uint8).reshape(-1,h,w,3)
 pixels=rgb[:,:,:,0].astype(np.float32)*.2126+rgb[:,:,:,1].astype(np.float32)*.7152+rgb[:,:,:,2].astype(np.float32)*.0722
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(path)]));pts=np.array([float(f['best_effort_timestamp_time']) for f in probe['frames']]);assert len(pts)==len(pixels);return pixels,pts
reports=[]
for hook in ['temporalCinemaFocus','drawCinemaAccent']:
 report=json.load(open(local/hook/'effect-counterfactual-report.json'));profile=report['adoptedNativeProof']['profile'];expected=int(round((profile['range'][1]-profile['range'][0])*profile['fps']));matches=[g for g in report['adoptedNativeMatches'] if g['frameCount']==expected];assert len(matches)==1 and matches[0]['exactNativeRGBA'] and report['nativeONRepeatIdentical']
 w,h=report['sampleWidth'],report['sampleHeight'];streams={}
 for mode,path in [('ORIGINAL',original),('ON',local/hook/'ON.mp4'),('OFF',local/hook/'OFF.mp4'),('ON_REPEAT',local/hook/'ON_REPEAT.mp4')]:
  pixels,pts=decoded(path,w,h);assert len(pixels)==expected;streams[mode]=(pixels,pts)
 pts=streams['ORIGINAL'][1];assert all(np.array_equal(x[1],pts) for x in streams.values())
 rms=lambda a,b:np.sqrt(np.mean((streams[a][0]-streams[b][0])**2,axis=(1,2)))
 originalNoise=rms('ORIGINAL','ON');repeatNoise=rms('ON','ON_REPEAT');effect=rms('ORIGINAL','OFF');noise=np.maximum(originalNoise,repeatNoise);threshold=np.maximum(1,3*noise);verified=effect>threshold
 frames=[{'actualDecodedTimestamp':float(t)+profile['range'][0],'originalVsOFFRMS':float(effect[i]),'originalVsONNoiseRMS':float(originalNoise[i]),'ONRepeatNoiseRMS':float(repeatNoise[i]),'requiredContributionRMS':float(threshold[i]),'status':'VERIFIED_COMPOSITE_CONTRIBUTION' if verified[i] else 'UNMEASURED_OR_NO_VISIBLE_CONTRIBUTION'} for i,t in enumerate(pts)]
 nativeSame=report['movies'][0]['nativeFrameHashes']==report['movies'][1]['nativeFrameHashes']
 result={'hook':hook,'sourceCommit':report['build']['sourceCommit'],'originalVideoSHA256':report['originalVideoSHA256'],'planHash':report['planHash'],'referenceSHA256':report['referenceSHA256'],'audioWAVSHA256':report['audioWAVSHA256'],'nativeFullOutputFrameMatch':matches,'nativeONRepeatIdentical':True,'decodedOriginalAndONIdentical':report['adoptedMovieReproduced'],'mismatchClassification':'ENCODER_VARIATION (same actual shipping native RGBA, profile and actual frame times)','method':'Independent FFmpeg RGB decoding at identical actual PTS, identical bilinear raster. Existing contribution floor max(1,3*noise) is strengthened by including adopted-original/ON noise as well as ON-repeat noise. No equality/noise threshold is relaxed.','status':'VERIFIED_COMPOSITE_CONTRIBUTION' if verified.any() else 'NO_VISIBLE_CONTRIBUTION','measuredFrames':expected,'contributionFrames':int(verified.sum()),'nativeONOFFIdentical':nativeSame,'scope':'Named hook composite contribution; not independent component semantics, artistic quality or whole-film QUALITY_GO','frames':frames}
 if hook=='drawCinemaAccent':
  ref=json.loads(gzip.decompress((qa/'results/adopted/supplemental-holdout-13-v3-reference.json.gz').read_bytes()));p=ref['plan'];f=p['musicalPhoto']['cinema'];cuts=p['cuts'];assert f['introEnd']<=.75 and all(c.get('cinema',{}).get('meaning')!='pride' and (c.get('cinema',{}).get('stage') or 0)<=1 and c.get('grammar',{}).get('temporal',{}).get('role')!='echo' for c in cuts);assert nativeSame
  result['status']='NOT_APPLICABLE';result['reason']='No pride/stage>1/echo/intro accent intent in adopted range; global hook dispatch is not a selected effect. Whole-frame native ON/OFF equality independently confirms inactivity.'
 reports.append(result);print(hook,result['status'],'frames',expected,'contribution',result['contributionFrames'])
(qa/'adopted-decoded-attribution.json').write_text(json.dumps({'reports':reports,'human':'HUMAN_UNVERIFIED'},ensure_ascii=False,indent=2)+'\n')
