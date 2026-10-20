#!/usr/bin/env python3
"""Reobserve eight frozen clocks with the existing contrast/luma method.
Reuse full-decode records. Do not treat FFmpeg and browser color conversion as identical.
"""
import argparse,gzip,hashlib,json,pathlib,subprocess,time
import numpy as np

def load(p):
 b=p.read_bytes();return json.loads(gzip.decompress(b) if b[:2]==b'\x1f\x8b' else b)
def run(root,out):
 root=pathlib.Path(root);out=pathlib.Path(out);p=root/'docs/qa/generalization/composition-recovery/release-recovery-20261019'
 raw=load(p/'static-sensor-corrected/raw.json.gz');old=load(p/'static-world-raster-counterexample/real-original-invalid-static-claim.json');moving=load(p/'static-world-raster-counterexample/moving-movie-invalid-static-claim.json');contracts=[load(p/'static-world-raster-counterexample'/n) for n in ['invalid-world-static-contract.json','moving-movie-invalid-static-contract.json']]
 h=[load(p/'static-world-raster-counterexample'/n)['videoSHA256'] for n in ['original-movie.json','control-movie.json']]
 checks=[];framesets=[];start=time.monotonic()
 for label,hash_,measurement,contract in zip(raw['decoded'],h,[old,moving],contracts):
  file=root/'docs/qa/generalization/media'/(hash_+'.mp4');assert hashlib.sha256(file.read_bytes()).hexdigest()==hash_
  # Same frozen actual frames 68..75; this is a partial observation, not another full decode.
  buf=subprocess.check_output(['ffmpeg','-v','error','-xerror','-i',str(file),'-vf','select=between(n\\,68\\,75),format=rgb24,crop=176:180:551:275','-fps_mode','passthrough','-pix_fmt','rgb24','-f','rawvideo','pipe:1'])
  arr=np.frombuffer(buf,dtype=np.uint8).reshape(8,180,176,3)
  checksForMovie=[];newframes=[]
  for i,(s,rgb,bg) in enumerate(zip(label['samples'],arr,raw['native'][1]['samples'])):
   gray=((rgb[:,:,0]*.2126+rgb[:,:,1]*.7152+rgb[:,:,2]*.0722)/255).astype(np.float32).reshape(-1)
   maximum=float(np.max(np.abs(gray-np.array(s['luma']))))
   mask=np.abs(gray-np.array(bg['luma']))>=.25 # exact existing contrast threshold
   ink=np.flatnonzero(mask);center=[float(551+np.mean(ink%176)),float(275+np.mean(ink//176))]
   runs=[]
   for index in ink:
    index=int(index)
    if runs and runs[-1][0]+runs[-1][1]==index:runs[-1][1]+=1
    else:runs.append([index,1])
   g=measurement['decodedFrames'][i]['glyphs'][0]
   newframes.append({**measurement['decodedFrames'][i],'glyphs':[{**g,'decodedInkPixels':len(ink),'decodedCentroid':center,'decodedRaster':{'origin':[551,275],'width':176,'height':180,'runs':runs}}]})
   checksForMovie.append({'frameIndex':68+i,'actualDecodedTimestamp':s['actualOutputTimestamp'],'maximumRetainedBrowserLumaDifference':maximum,'inkPixels':len(ink),'centroid':center,'retainedInkPixels':g['decodedInkPixels']})
  updated={**measurement,'decodedFrames':newframes,'scope':'FFMPEG_REOBSERVATION_OF_EXISTING_INVALID_STATIC_CLAIM_NOT_RELEASE_PROOF'}
  f=out/('static-original-ffmpeg-measurement.json' if hash_==h[0] else 'static-moving-ffmpeg-measurement.json');f.write_text(json.dumps(updated,separators=(',',':'))+'\n')
  checks.append({'videoSHA256':hash_,'label':label['label'],'samples':checksForMovie,'measurementSHA256':hashlib.sha256(f.read_bytes()).hexdigest(),'method':'existing .2126/.7152/.0722 float32 luma and .25 target-OFF contrast','decoder':'FFmpeg; differs from retained Chromium VideoDecoder/Canvas path; no equivalence assertion'})
  framesets.append(newframes)
 report={'schema':1,'additionalFullDecodes':0,'partialEightFrameObservations':2,'newMP4s':0,'seconds':time.monotonic()-start,'checks':checks,'supersedes':'representatives.py initial arithmetic-mean luma comparison; it was an observer formula error, not evidence of source tampering','formalQualityClaim':False}
 (out/'static-pixel-reobservation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'seconds':report['seconds'],'inkPixelRanges':[[m['glyphs'][0]['decodedInkPixels'] for m in f] for f in framesets],'maxBrowserLumaDifferences':[max(s['maximumRetainedBrowserLumaDifference'] for s in c['samples']) for c in checks]}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('root');p.add_argument('out');a=p.parse_args();run(a.root,a.out)
