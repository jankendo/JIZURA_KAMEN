"""Hash-bound frozen-plan control replay; contribution is not semantic certification."""
import pathlib, json, gzip, hashlib, subprocess, sys
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
def read(p):
 b=p.read_bytes();return json.loads(gzip.decompress(b) if p.suffix=='.gz' else b)
def full_group(d):
 p=d['adoptedNativeProof'];q=p['profile'];n=round((q['range'][1]-q['range'][0])*q['fps'])
 groups=[g for g in p['groups'] if g['planHash']==d['planHash'] and len(g['frames'])==n]
 assert len(groups)==1,'REQUIRE_UNIQUE_ADOPTED_FULL_GROUP'
 original=groups[0]['frames']; assert len({x['time'] for x in original})==n
 assert all(x['time']==q['range'][0]+i/q['fps'] for i,x in enumerate(original)),'ORIGINAL_NOT_EXACT_OUTPUT_CLOCK'
 return q,original
def output_only(hashes,original):
 times={x['time'] for x in original}; selected=[x for x in hashes if x['time'] in times]
 assert len(selected)==len(original),'MISSING_OR_DUPLICATED_OUTPUT_CLOCK'
 assert [x['time'] for x in selected]==[x['time'] for x in original],'OUTPUT_CLOCK_ORDER'
 return selected,len(hashes)-len(selected)
def decode(p,w,h):
 raw=subprocess.check_output(['ffmpeg','-threads','1','-v','error','-xerror','-i',str(p),'-map','0:v:0','-vf',f'scale={w}:{h}:flags=bilinear','-pix_fmt','rgb24','-f','rawvideo','-'])
 rgb=np.frombuffer(raw,dtype=np.uint8).reshape(-1,h,w,3).astype(np.float32)
 lum=rgb[:,:,:,0]*.2126+rgb[:,:,:,1]*.7152+rgb[:,:,:,2]*.0722
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(p)]))
 pts=np.array([float(x['best_effort_timestamp_time']) for x in probe['frames']]);assert len(pts)==len(lum)
 return lum,pts

def main(name):
 qa=ROOT/'composition-recovery'/name;manifest=read(qa/'archive-manifest.json'); index={x['member']:x for x in manifest['files']};reports=[]
 def member(k):
  m=index[k];p=ROOT/m['preserved'];assert hashlib.sha256(p.read_bytes()).hexdigest()==m['SHA256'];return p
 for rp in sorted(qa.glob('**/effect-counterfactual-report.json.gz')):
  d=read(rp);q,original=full_group(d);n=len(original);native={};excluded={}
  for m in d['movies']:
   native[m['mode']],excluded[m['mode']]=output_only(m['nativeFrameHashes'],original)
  assert native['ON']==original and native['ON_REPEAT']==original,'NATIVE_OUTPUT_MISMATCH'
  originalPath=ROOT/'media'/(d['originalVideoSHA256']+'.mp4');assert hashlib.sha256(originalPath.read_bytes()).hexdigest()==d['originalVideoSHA256']
  relative=str(rp.relative_to(qa)).removesuffix('/effect-counterfactual-report.json.gz')
  streams={'ORIGINAL':decode(originalPath,d['sampleWidth'],d['sampleHeight'])}
  for mode in ['ON','OFF','ON_REPEAT']:
   m=next(x for x in d['movies'] if x['mode']==mode);path=member(relative+'/'+m['file']);assert hashlib.sha256(path.read_bytes()).hexdigest()==m['videoSHA256'];streams[mode]=decode(path,d['sampleWidth'],d['sampleHeight'])
  pts=streams['ORIGINAL'][1];assert len(pts)==n and all(np.array_equal(x[1],pts) for x in streams.values())
  rms=lambda a,b:np.sqrt(np.mean((streams[a][0]-streams[b][0])**2,axis=(1,2)))
  origNoise=rms('ORIGINAL','ON');repNoise=rms('ON','ON_REPEAT');effect=rms('ORIGINAL','OFF');threshold=np.maximum(1,3*np.maximum(origNoise,repNoise));ok=effect>threshold
  r={'caseId':d['caseId'],'hook':rp.parent.name,'sourceCommit':d['build']['sourceCommit'],'sourceTreeSHA256':d['build']['sourceTreeSHA256'],'originalVideoSHA256':d['originalVideoSHA256'],'planHash':d['planHash'],'referenceSHA256':d['referenceSHA256'],'inputSnapshot':d['inputSnapshot'],'outputProfile':q,'nativeOutputFrames':n,'nativeOutputExact':True,'nativeONRepeatExact':True,'nonOutputNativeCallsExcluded':excluded,'exclusionRule':'Only exact original output times; no tolerance or duplicate output frame removal. All raw capture retained.','nativeONOFFEqual':native['ON']==native['OFF'],'originalDecodedONExact':d['adoptedMovieReproduced'],'contributionFrames':int(ok.sum()),'status':'VERIFIED_COMPOSITE_CONTRIBUTION' if ok.any() else 'NO_MEASURABLE_COMPOSITE_CONTRIBUTION','semanticIntentStatus':'UNMEASURED','method':'Existing RMS floor max(1,3*noise), strengthened with maximum original-vs-ON and ON-vs-ON_REPEAT noise; all identical actual PTS decoded independently with FFmpeg.','scope':'Composite hook only; no independent operator semantics, aesthetic certification or release QUALITY_GO.','frames':[{'actualDecodedTimestamp':float(t)+q['range'][0],'originalVsOFFRMS':float(effect[i]),'originalVsONNoiseRMS':float(origNoise[i]),'ONRepeatNoiseRMS':float(repNoise[i]),'requiredContributionRMS':float(threshold[i]),'contribution':bool(ok[i])} for i,t in enumerate(pts)]}
  reports.append(r);print(name,r['hook'],n,r['contributionFrames'],r['status'],flush=True)
 (qa/'decoded-original-noise-attribution.json').write_text(json.dumps({'schema':1,'reports':reports,'human':'HUMAN_UNVERIFIED'},ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':
 for name in sys.argv[1:]:main(name)
