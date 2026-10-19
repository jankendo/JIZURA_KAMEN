"""Actual isolated selected focus crop; source crop equation + decoded affine registration."""
import pathlib,json,gzip,sys,subprocess,math,hashlib,collections
import base64,struct
import numpy as np
from background_crop_ecc_sensor import measure
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery'
def read(p):return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def crop(f,box,t,amount):
 sw,sh=f.get('sourceWidth'),f.get('sourceHeight')
 if not sw or not sh:raise ValueError('SOURCE_IMAGE_DIMENSIONS_UNMEASURED')
 x,y,w,h=box;u=max(0,min(1,(t-f['start'])/max(.1,f.get('duration',1))));z=max(1,(f.get('zoom')or 1)*(1+(f.get('push')or 0)*u));ar=w/h;cw=min(sw,sh*ar)/z;ch=cw/ar
 return max(0,min(1,f['x']+amount*math.sin(t*1.7)))*(sw-cw),max(0,min(1,f['y']))*(sh-ch),cw,ch

def run(archive,out,reference=None):
 m=read(R/archive/'archive-manifest.json');files={x['member']:x for x in m['files']}
 def raw(member):
  e=files[member];p=Q/e['preserved'];b=p.read_bytes();b=gzip.decompress(b)if p.suffix=='.gz'else b;assert hashlib.sha256(b).hexdigest()==e['SHA256'];return b
 r=json.loads(raw('controls/effect-counterfactual-report.json'));assert r['build']['sourceCommit']=='d04c734bc5eb0c0c427a42a196cae3a507b89506';assert r['selectedOperator']=='temporalCinemaFocus';assert r['fullNativeIdentity']and r['nativeONRepeatIdentical']and r['adoptedMovieReproduced'];assert all(x['fullDecode']=='PASS'for x in r['movies']);profile=r['adoptedNativeProof']['profile'];w,h=profile['resolution'];fps=profile['fps'];start,end=profile['range'];n=round((end-start)*fps);frames={};videoRefs=[]
 for mode in ['ON','OFF','ON_REPEAT']:
  entry=files['controls/'+mode+'.mp4'];p=Q/entry['preserved'];assert hashlib.sha256(p.read_bytes()).hexdigest()==entry['SHA256'];videoRefs.append({'mode':mode,'videoSHA256':entry['SHA256']})
  b=subprocess.check_output(['ffmpeg','-threads','1','-v','error','-xerror','-i',str(p),'-pix_fmt','gray','-f','rawvideo','-']);frames[mode]=np.frombuffer(b,np.uint8).reshape(-1,h,w);assert len(frames[mode])==n
  ff=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','json',str(p)]));ts=[float(x['best_effort_timestamp_time'])for x in ff['frames']];assert len(ts)==n and all(abs(x-i/fps)<1e-6 for i,x in enumerate(ts)),'UNMATCHED_ACTUAL_DECODED_CLOCK'
 # Only actual encoder ON callback entries, excluding later audit/replay callbacks with absent output timestamps.
 trace=collections.defaultdict(dict)
 for t in r['parameterTrace']:
  if isinstance(t.get('actualOutputTimestamp'),(float,int)):
   key=(t['actualOutputTimestamp'],t.get('unitOrdinal'));trace[key][json.dumps(t,sort_keys=True)]=t
 sourceImage=None
 if reference:
  rb=pathlib.Path(reference).read_bytes();rb=gzip.decompress(rb)if str(reference).endswith('.gz')else rb;assert hashlib.sha256(rb).hexdigest()==r['referenceSHA256'],'REFERENCE_IDENTITY_MISMATCH';ref=json.loads(rb);p=ref['plan'];asset=p.get('customBg')or{};assets=p.get('visualAssets')or[]
  if asset.get('enabled')and len(assets)<=1 and(not assets or assets[0].get('dataUrl')==asset.get('dataUrl'))and asset.get('dataUrl','').startswith('data:image/png;base64,'):
   b=base64.b64decode(asset['dataUrl'].split(',',1)[1],validate=True);assert b[:8]==b'\x89PNG\r\n\x1a\n'and b[12:16]==b'IHDR';sw,sh=struct.unpack('>II',b[16:24]);assert sw>0 and sh>0;sourceImage={'width':sw,'height':sh,'encodedImageSHA256':hashlib.sha256(b).hexdigest(),'referenceSHA256':r['referenceSHA256'],'method':'Actual immutable single source PNG IHDR, not an inferred subject size or guessed ratio.'}
 registered=r['registeredOriginal'];rows=[];maxUnitEnd=max((f['to']for u in registered['units']for f in u['fragments']),default=end);lastStart=max((f['from']for u in registered['units']for f in u['fragments']),default=start);returnFrom=end-min(.65,max(0,end-maxUnitEnd)+(maxUnitEnd-lastStart)*.15)
 for (time,ordinal),unique in trace.items():
  rec={'actualDecodedTimestamp':time,'finalUnitOrdinal':ordinal,'status':'UNMEASURED'};rows.append(rec)
  if len(unique)!=1:rec['reason']='MULTIPLE_ON_FOCUS_INVOCATIONS';continue
  t=next(iter(unique.values()));rec['motionPrinciple']=t.get('selectedMotionPrinciple');rec['rendererRole']=t.get('rendererRole');source=t['sourceTimestamp'];rec['sourceTimestamp']=source
  if abs(source-time)>1e-7 or time>=returnFrom:rec.update(status='CONFOUNDED',reason='REMAPPED_OR_OPENING_RETURN_LAYER');continue
  boxes=t.get('fieldBoxes')or[]
  if len(boxes)!=1:rec['reason']='MULTI_FIELD_OR_UNKNOWN_OWNERSHIP';continue
  W,H=t['planDimensions'];scale=w/W
  if abs(scale-h/H)>1e-9:rec['reason']='NON_UNIFORM_OUTPUT_SCALE';continue
  b=boxes[0];box=[b[x]for x in ['x','y','w','h']]
  fi,fo=dict(t['inputFocus']),dict(t['outputFocus'])
  if sourceImage:
   for focus in [fi,fo]:
    if not focus.get('sourceWidth')or not focus.get('sourceHeight'):focus.update(sourceWidth=sourceImage['width'],sourceHeight=sourceImage['height'])
  try:off=crop(fi,box,source,t['tileAmount']);on=crop(fo,box,source,t['tileAmount'])
  except ValueError as ex:rec['reason']=str(ex);continue
  bx,by,bw,bh=[x*scale for x in box];sx0,sy0,cw0,ch0=off;sx1,sy1,cw1,ch1=on;rx,ry=cw0/cw1,ch0/ch1;M=[[rx,0,bx*(1-rx)+(sx0-sx1)*bw/cw1],[0,ry,by*(1-ry)+(sy0-sy1)*bh/ch1]]
  idx=round((time-start)*fps)
  if not(0<=idx<n)or abs(start+idx/fps-time)>1e-7:rec['reason']='ACTUAL_OUTPUT_CLOCK_NOT_A_FRAME';continue
  mask=np.zeros((h,w),np.uint8);mask[max(0,math.ceil(by)):min(h,math.floor(by+bh)),max(0,math.ceil(bx)):min(w,math.floor(bx+bw))]=255
  for f in registered['frames']:
   if abs(f['actualDecodedTimestamp']-time)>1e-7:continue
   for glyph in f.get('glyphEvidence',[]):
    for name in ['nativeInkBounds','decodedInkBounds']:
     b=glyph.get(name)
     if b:mask[max(0,b['y0']-4):min(h,b['y1']+5),max(0,b['x0']-4):min(w,b['x1']+5)]=0
  result=measure(frames['OFF'][idx],frames['ON'][idx],frames['ON_REPEAT'][idx],frames['ON'][idx],mask,M);rec.update(result);rec.update(fieldBoxOutputPixels=[bx,by,bw,bh],sourceFocusInput=t['inputFocus'],sourceFocusOutput=t['outputFocus'],expectedAffineOFFtoON=M)
  # A generic image/foreground ownership mask is not a proof of all layered scene attribution.
  rec['semanticStatus']='VERIFIED_CROP_GEOMETRY_ONLY'if result['status']=='VERIFIED_IMAGE_TRANSFORM'else'CONFOUNDED_OR_UNMEASURED'
 report={'schema':1,'sourceCommit':r['build']['sourceCommit'],'sourceTreeSHA256':r['build']['sourceTreeSHA256'],'caseId':r['caseId'],'planHash':r['planHash'],'inputHash':r['inputSnapshot']['inputHash'],'outputProfile':profile,'originalVideoSHA256':r['originalVideoSHA256'],'rawReportSHA256':hashlib.sha256(raw('controls/effect-counterfactual-report.json')).hexdigest(),'controlVideos':videoRefs,'sourceImageDimensionsEvidence':sourceImage,'method':'Exact source crop equation; actual ffprobe frame timestamps; full-rank affine geometry with inherited half-pixel/10percent,90percent agreement and independent gain above repeat noise. Primary glyphs excluded.','rows':rows,'statuses':dict(collections.Counter(x['status']for x in rows)),'limits':['Successful crop geometry is not a certificate for whole camera/FX/scene or aesthetics.','A failure of a single-crop model under unknown layered ownership is not automatically an app rendering defect.','Missing source image dimensions and remapped output clocks remain unmeasured/confounded.'],'human':'HUMAN_UNVERIFIED'}
 pathlib.Path(out).write_bytes(gzip.compress(json.dumps(report,separators=(',',':')).encode(),mtime=0));print(json.dumps({'case':r['caseId'],'statuses':report['statuses']}))
if __name__=='__main__':run(sys.argv[1],sys.argv[2],sys.argv[3]if len(sys.argv)>3 else None)
