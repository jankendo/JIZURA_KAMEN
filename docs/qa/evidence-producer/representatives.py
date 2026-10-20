#!/usr/bin/env python3
"""Real retained-media diagnostics; semantic contracts remain unfinalized.
Only preregistered historical counterexample and exact decode identities are tested.
"""
import argparse,datetime,gzip,hashlib,json,pathlib,subprocess,time
import numpy as np

def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):
 b=p.read_bytes();return json.loads(gzip.decompress(b) if b[:2]==b'\x1f\x8b' else b)
def run(root,out):
 root=pathlib.Path(root);out=pathlib.Path(out);out.mkdir(parents=True,exist_ok=True)
 p=root/'docs/qa/generalization/composition-recovery';media=root/'docs/qa/generalization/media'
 static=p/'release-recovery-20261019/static-world-raster-counterexample'
 reports=[load(p/f'grammar-policy-v2-important-controls-0-{i}/controls/effect-counterfactual-report.json.gz') for i in [0,1]]
 original=load(static/'original-movie.json');control=load(static/'control-movie.json');contract=load(static/'invalid-world-static-contract.json')
 frozen={'schema':1,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'DIAGNOSTIC_PIPELINE_ONLY_NO_FINAL_IMPORTANCE_OR_SEMANTIC_CONTRACT',
  'static':{'contractSHA256':sha((static/'invalid-world-static-contract.json').read_bytes()),'contract':contract,'expected':'Reject deliberately invalid centered/shrinking world-static claim using unchanged v3 evaluator','rasterSource':sha((static/'real-original-invalid-static-claim.json').read_bytes())},
  'dynamicComposite':[{'operator':r['selectedOperator'],'sourceCommit':r['build']['sourceCommit'],'planHash':r['planHash'],'originalVideoSHA256':r['originalVideoSHA256'],'movies':[{k:m[k] for k in ['mode','videoSHA256']} for m in r['movies']],
   'diagnosticContract':{'originalONRepeat':'exact full decoded RGBA identity','isolatedOFF':'must differ from ON to establish contribution only','audio':'exact full decoded PCM identity','semanticVectors':None,'phaseModel':None,'componentAttributionModel':None},'formalExpected':'UNVERIFIED: no preregistered semantic vectors/complete component contracts'} for r in reports],
  'noThresholdChanges':True,'newMP4GenerationAllowed':False,'decoder':subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0]}
 (out/'preregistered-diagnostics.json').write_text(json.dumps(frozen,ensure_ascii=False,indent=2)+'\n')
 frozenHash=sha((out/'preregistered-diagnostics.json').read_bytes())
 bindings={original['videoSHA256']:original['binding'],control['videoSHA256']:control['binding']}
 for r in reports:
  binding=r['movies'][0]['modeFinalArtifactVerification']['binding']
  for h in [r['originalVideoSHA256']]+[m['videoSHA256'] for m in r['movies']]:bindings[h]=binding
 cache={};selected={};decodeSeconds=0;physicalDecodes=0
 def decode(h):
  nonlocal decodeSeconds,physicalDecodes
  if h in cache:return cache[h]
  file=media/(h+'.mp4');assert sha(file.read_bytes())==h,'MP4 content hash mismatch'
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(file)]))
  v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
  assert v['codec_name']=='h264' and a['codec_name']=='aac'
  profile=bindings[h]['outputProfile'];assert [v['width'],v['height']]==profile['resolution']
  pts=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(file)]))['frames']
  times=[float(f['best_effort_timestamp_time']) for f in pts]
  assert all(abs(t-(profile['range'][0]+i/profile['fps']))<1e-5 for i,t in enumerate(times)),'Unexpected frame clock'
  audiofile=out/(h+'-audio.sha256');errfile=out/(h+'-decode.stderr')
  cmd=['ffmpeg','-v','error','-xerror','-err_detect','explode','-i',str(file),'-map','0:v:0','-pix_fmt','rgba','-fps_mode','passthrough','-f','rawvideo','pipe:1','-map','0:a:0','-c:a','pcm_s16le','-f','hash','-hash','sha256',str(audiofile)]
  start=time.monotonic();frameSize=v['width']*v['height']*4;framehash=[];total=hashlib.sha256();samples={}
  with errfile.open('wb') as err:
   proc=subprocess.Popen(cmd,stdout=subprocess.PIPE,stderr=err)
   while True:
    chunks=[];n=0
    while n<frameSize:
     data=proc.stdout.read(frameSize-n)
     if not data:break
     chunks.append(data);n+=len(data)
    if not n:break
    assert n==frameSize,'Partial decoded frame'
    b=b''.join(chunks);total.update(b);framehash.append(sha(b));i=len(framehash)-1
    if h in [original['videoSHA256'],control['videoSHA256']] and 68<=i<=75:
     arr=np.frombuffer(b,dtype=np.uint8).reshape(v['height'],v['width'],4);samples[i]=arr[275:455,551:727,:3].copy()
   assert proc.wait()==0,'Full media decode failed'
  elapsed=time.monotonic()-start;decodeSeconds+=elapsed;physicalDecodes+=1
  assert len(framehash)==round((profile['range'][1]-profile['range'][0])*profile['fps'])==len(times)
  assert not errfile.stat().st_size
  result={'videoSHA256':h,'bindingSource':bindings[h]['sourceCommit'],'profile':profile,'completeDecode':True,'decodeExitCode':0,'frameCount':len(framehash),'decodedRGBA_SHA256':total.hexdigest(),'decodedPCM_S16LE_SHA256':audiofile.read_text().strip().split('=')[-1],'frameSHA256':framehash,'actualDecodedTimestamps':times,'seconds':elapsed}
  cache[h]=result;selected[h]=samples;return result
 for h in bindings:decode(h)
 diagnostics=[]
 for r in reports:
  on,off,repeat=[decode(next(m['videoSHA256'] for m in r['movies'] if m['mode']==mode)) for mode in ['ON','OFF','ON_REPEAT']];old=decode(r['originalVideoSHA256'])
  diagnostics.append({'operator':r['selectedOperator'],'sourceCommit':r['build']['sourceCommit'],'originalONIdentity':old['decodedRGBA_SHA256']==on['decodedRGBA_SHA256'],'ONRepeatIdentity':on['decodedRGBA_SHA256']==repeat['decodedRGBA_SHA256'],'OFFDiffers':off['decodedRGBA_SHA256']!=on['decodedRGBA_SHA256'],'differentFrameCount':sum(a!=b for a,b in zip(on['frameSHA256'],off['frameSHA256'])),'audioIdentity':len({x['decodedPCM_S16LE_SHA256'] for x in [old,on,off,repeat]})==1,'semantic':'UNVERIFIED','phase':'UNVERIFIED','attribution':'GROUP_CONTRIBUTION_ONLY_COMPONENTS_UNVERIFIED','formalCertification':'UNVERIFIED'})
 raw=load(p/'release-recovery-20261019/static-sensor-corrected/raw.json.gz');luma=[]
 # Retained raw luma uses the existing J.cinemaReferenceLuma weights. Report exact correspondence
 # only; it cannot create a positive world-static certificate.
 for group,h in zip(raw['decoded'],[original['videoSHA256'],control['videoSHA256']]):
  maximum=0
  for s in group['samples']:
   i=round(s['actualOutputTimestamp']*24);rgb=selected[h][i]
   gray=((rgb[:,:,0]*.2126+rgb[:,:,1]*.7152+rgb[:,:,2]*.0722)/255).astype(np.float32).reshape(-1)
   maximum=max(maximum,float(np.max(np.abs(gray-np.array(s['luma'])))))
  luma.append({'label':group['label'],'samples':len(group['samples']),'maximumAbsoluteLumaDifference':maximum,'exactRetainedLumaMatch':maximum==0})
 observation=load(static/'real-original-invalid-static-claim.json');glyphs=[f['glyphs'][0] for f in observation['decodedFrames']]
 summary={'schema':1,'preregisteredContractSHA256':frozenHash,'newMP4s':0,'uniqueMP4s':len(cache),'physicalFullDecodes':physicalDecodes,'totalDecodeSeconds':decodeSeconds,'decodedRawBytesAvoidedOnDisk':sum(x['frameCount']*x['profile']['resolution'][0]*x['profile']['resolution'][1]*4 for x in cache.values()),
  'static':{'intentId':observation['intentId'],'sourceCommit':observation['sourceCommit'],'kind':'REAL_FALSE_POSITIVE_COUNTEREXAMPLE_NOT_POSITIVE_CERTIFICATION','retainedLumaChecks':luma,'decodedInkPixels':[g['decodedInkPixels'] for g in glyphs],'centroidMaximumDriftPixels':max(float(np.linalg.norm(np.array(g['decodedCentroid'])-np.array(glyphs[0]['decodedCentroid']))) for g in glyphs),'formalCertification':'UNVERIFIED','expectedEvaluatorResult':'FAIL'},
  'dynamicComposite':diagnostics,'expansionAuthorizedByEvidence':False,'limitations':['Full decode identity is not semantic or phase proof.','The static record is an intentionally invalid world-static claim and is not a finalized static Intent PASS.','Dynamic/composite diagnostics have no frozen semantic vector model; positive quality experiment remains blocked.']}
 (out/'full-decodes.json').write_text(json.dumps({'decoder':frozen['decoder'],'movies':list(cache.values())},indent=2)+'\n');(out/'representative-results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:summary[k] for k in ['newMP4s','uniqueMP4s','physicalFullDecodes','totalDecodeSeconds','static','dynamicComposite']}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('root');p.add_argument('out');a=p.parse_args();run(a.root,a.out)
