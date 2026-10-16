"""Existing field-box/crop equations; final decoded image feature correspondence diagnostic."""
import pathlib,json,gzip,sys,subprocess,math,hashlib
import numpy as np
from background_crop_ecc_sensor import measure
ROOT=pathlib.Path(__file__).resolve().parents[1]
def read(p):return json.loads(gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes())
def box_for(p,g):
 W,H=p['W'],p['H'];field=g['field'];side=g.get('side');portrait=H>W
 return {'negative':[(W*.64 if side else 0,H*.08,W*.36,H*.84)],'asymmetric':[(0,0,W,H*.5)] if portrait else [(0 if side else W*.5,0,W*.5,H)],'window':[(W*.12,H*.07,W*.76,H*.52)],'band':[(0,H*.07,W,H*.45)],'graphic':[(W*.09,H*.08,W*.82,H*.84)],'arena':[(0,0,W,H)],'hero':[(0,0,W,H)]}.get(field)
def crop(f,box,t,amount):
 sw,sh=f.get('sourceWidth'),f.get('sourceHeight');assert sw and sh,'SOURCE_IMAGE_DIMENSIONS_UNMEASURED'
 x,y,w,h=box;elapsed=max(0,min(1,(t-f['start'])/max(.1,f.get('duration',1))));zoom=max(1,(f.get('zoom') or 1)*(1+(f.get('push') or 0)*elapsed));ar=w/h;baseW=min(sw,sh*ar);cw=baseW/zoom;ch=cw/ar
 sx=max(0,min(1,f['x']+amount*math.sin(t*1.7)))*(sw-cw);sy=max(0,min(1,f['y']))*(sh-ch);return sx,sy,cw,ch

def run(name,from_t,to_t,out):
 qa=ROOT/'composition-recovery'/name;report=read(qa/'temporalCinemaFocus/effect-counterfactual-report.json.gz');ref=read(qa/'adopted/supplemental-holdout-13-v3-reference.json.gz');p=ref['plan'];v=report['registeredOriginal'];profile=report['adoptedNativeProof']['profile'];origin=profile['range'][0];fps=profile['fps'];expectedN=round((profile['range'][1]-origin)*fps);groups=[g for g in report['adoptedNativeProof']['groups'] if g['planHash']==report['planHash'] and len(g['frames'])==expectedN];assert len(groups)==1;native=groups[0]['frames'];ntimes={x['time'] for x in native};selected=[f for f in v['frames'] if from_t<=f['actualDecodedTimestamp']<to_t];assert selected
 w,h=selected[0]['dimensions'];scale=w/p['W'];assert abs(scale-h/p['H'])<1e-10
 manifest=read(qa/'archive-manifest.json');mm={m['member']:m for m in manifest['files']};start_i=math.ceil((from_t-origin)*fps);end_i=min(expectedN,math.ceil((to_t-origin)*fps));frames={}
 for mode in ['ON','OFF','ON_REPEAT','ORIGINAL']:
  m=mm['temporalCinemaFocus/'+mode+'.mp4'] if mode!='ORIGINAL' else {'preserved':'media/'+report['originalVideoSHA256']+'.mp4','SHA256':report['originalVideoSHA256']};path=ROOT/m['preserved'];assert hashlib.sha256(path.read_bytes()).hexdigest()==m['SHA256'];raw=subprocess.check_output(['ffmpeg','-threads','1','-v','error','-xerror','-i',str(path),'-vf',f'select=gte(n\\,{start_i})*lt(n\\,{end_i})','-vsync','0','-pix_fmt','gray','-f','rawvideo','-']);frames[mode]=np.frombuffer(raw,dtype=np.uint8).reshape(-1,h,w);assert len(frames[mode])==end_i-start_i
 rows=[]
 for k in range(start_i,end_i):
  time=origin+k/fps;assert time in ntimes
  c=next(c for c in p['cuts'] if c['start']<=time<c['end']);g=c.get('grammar') or {};tr=[x for x in report['parameterTrace'] if x['time']==time and x['line']==c['line'] and x['unitIndex']==c['index']];boxes=box_for(p,g)
  if len(tr)!=1 or not boxes or len(boxes)!=1:rows.append({'actualDecodedTimestamp':time,'status':'UNMEASURED','reason':'AMBIGUOUS_FOCUS_OR_MULTI_FIELD'});continue
  x=tr[0];box=boxes[0];amount=.002 if g['mode'] in ['voice','ground'] else (g.get('stage') or 1)*.008*(g.get('motion') or 1);offcrop=crop(x['inputFocus'],box,time,amount);oncrop=crop(x['outputFocus'],box,time,amount);bx,by,bw,bh=[v*scale for v in box];sx0,sy0,cw0,ch0=offcrop;sx1,sy1,cw1,ch1=oncrop;ratioX=cw0/cw1;ratioY=ch0/ch1;M=[[ratioX,0,bx*(1-ratioX)+(sx0-sx1)*bw/cw1],[0,ratioY,by*(1-ratioY)+(sy0-sy1)*bh/ch1]]
  mask=np.zeros((h,w),np.uint8);mask[max(0,math.ceil(by)):min(h,math.floor(by+bh)),max(0,math.ceil(bx)):min(w,math.floor(bx+bw))]=255
  # Exclude current registered primary bounds from all internal units, not just one row.
  actual=[f for f in v['frames'] if f['actualDecodedTimestamp']==time]
  for f in actual:
   for glyph in f.get('glyphEvidence',[]):
    for key in ['nativeInkBounds','decodedInkBounds']:
     b=glyph.get(key)
     if b:mask[max(0,b['y0']):min(h,b['y1']+1),max(0,b['x0']):min(w,b['x1']+1)]=0
  i=k-start_i;r=measure(frames['OFF'][i],frames['ON'][i],frames['ON_REPEAT'][i],frames['ORIGINAL'][i],mask,M);r.update({'actualDecodedTimestamp':time,'target':'selected image crop in cinema field, registered primary glyph bounds excluded','selectedMotionPrinciple':g.get('temporal',{}).get('motionPrinciple'),'focusInput':x['inputFocus'],'focusOutput':x['outputFocus'],'nativeExpectedAffineOFFtoON':M,'fieldBoxOutputPixels':[bx,by,bw,bh],'rawONRepeatDifferenceRMS':float(np.sqrt(np.mean((frames['ON'][i].astype(float)-frames['ON_REPEAT'][i])**2))),'semanticCaveat':'Feature ownership beyond registered glyph exclusion can remain confounded by layered foreground. A mismatch here does not by itself establish a rendering defect.'});rows.append(r)
 end=profile['range'][1];lastCut=next(c for c in reversed(p['cuts']) if c.get('line',-1)>=0 and c['start']<end);returnFrom=end-min(.65,max(0,end-lastCut['end'])+lastCut['dur']*.15)
 for item in rows:
  inReturn=item['actualDecodedTimestamp']>=returnFrom;item['scopeContext']='CONFOUNDED_OPENING_BACKGROUND_RETURN_LAYER' if inReturn else 'SINGLE_CROP_MODEL_WITH_UNRESOLVED_LAYER_FEATURE_OWNERSHIP';item['semanticStatus']='CONFOUNDED' if item['status']!='VERIFIED_IMAGE_TRANSFORM' or inReturn else 'VERIFIED_IMAGE_CROP_CORRESPONDENCE_ONLY'
 result={'knownLayerContext':{'backgroundOpeningReturnStarts':returnFrom,'source':'src/11zzp_shot_grammar.js:64-67','finding':'Intentional opening-background return adds another image layer. Raw feature outcomes retained; layer context is interpretation, not a sensor threshold change.'},'scopeCounts':{s:sum(x['semanticStatus']==s for x in rows) for s in sorted({x['semanticStatus'] for x in rows})},'schema':1,'caseId':report['caseId'],'sourceCommit':report['build']['sourceCommit'],'originalVideoSHA256':report['originalVideoSHA256'],'planHash':report['planHash'],'timeRange':[from_t,to_t],'methodPreregistration':'background-crop-ecc-preregistration.json','sensorValidation':'background-crop-ecc-sensor-counterexamples.json','rows':rows,'counts':{s:sum(r['status']==s for r in rows) for s in sorted({r['status'] for r in rows})},'semanticStatus':'DIAGNOSTIC_ONLY_REQUIRES_FEATURE_OWNERSHIP_AND_NOISE_ATTRIBUTION','limits':'Reports strict renderer-equation feature correspondences. Not an aesthetic score, whole-film intent realization or release verdict. Historical primary settle failure remains separate.','human':'HUMAN_UNVERIFIED'};pathlib.Path(out).write_text(json.dumps(result,indent=2)+'\n');print(result['counts'])
if __name__=='__main__':run(sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),sys.argv[4])
