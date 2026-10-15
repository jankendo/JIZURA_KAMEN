import pathlib,gzip,json,math
root=pathlib.Path('/workspace/kamen-next-evidence/docs/qa/generalization');out=[]
for partition,fixture in [('development-b','development-07'),('development-c','supplemental-development-13')]:
 old=json.load(gzip.open(root/'formal-b5a46b7'/(partition+'-results.json.gz'),'rt'));a=next(r for r in old['rows'] if r['fixture']['id']==fixture and r['variant']=='baseline');del old
 new=json.load(gzip.open(root/'common-observer-b5a46b7'/(partition+'-observations.json.gz'),'rt'));b=next(r for r in new['rows'] if r['fixture']==fixture and r['variant']=='baseline');del new
 da=a['decoded'];db=b['decodedCinema'];av=da.get('typographyVectors',[]);bv=db.get('typographyVectors',[])
 vals=[]
 for i,(x,y) in enumerate(zip(av,bv)):
  vals.append({'index':i,'lineOld':x['line'],'lineNew':y['line'],'old':x['vector'],'new':y['vector'],'absoluteDelta':[abs(v-w) for v,w in zip(x['vector'],y['vector'])]})
 out.append({'fixture':fixture,'sameVideoSHA256':a['sha256']==b['videoSHA256'],'videoSHA256':a['sha256'],'rawResolution':da.get('resolution'),'correctedResolution':db.get('resolution'),'rawFrameCount':da.get('frameCount'),'correctedFrameCount':db.get('frameCount'),'rawTypography':da['metrics']['typographyDiversity'],'correctedTypography':db['metrics']['typographyDiversity'],'rawVectorCount':len(av),'correctedVectorCount':len(bv),'vectors':vals,'rawPrimaryGlyphSampleCount':len(da.get('layerPresence',{}).get('primaryText',{}).get('samples',[])),'correctedPrimaryGlyphSampleCount':len(db.get('layerPresence',{}).get('primaryText',{}).get('samples',[]))})
p=root/'composition-recovery/main-same-video-typography-vector-difference.json';p.write_text(json.dumps({'scope':'Stored observations only, not new decode or isolated causality test. No raw values overwritten.','rows':out},indent=2)+'\n');print(json.dumps([{k:v for k,v in r.items() if k!='vectors'} for r in out]))
