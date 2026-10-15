"""Engineering feature/crop correspondence only; fixed preregistered parameters."""
import cv2,numpy as np,json,pathlib,sys,subprocess,tempfile
DETECT=dict(maxCorners=200,qualityLevel=.01,minDistance=5,blockSize=5)
LK=dict(winSize=(21,21),maxLevel=3,criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,30,.01))
def measure(off,on,mask,expected_affine):
 assert off.shape==on.shape==mask.shape
 pts=cv2.goodFeaturesToTrack(off,mask=mask,**DETECT)
 if pts is None:return {'status':'UNMEASURED','reason':'NO_INDEPENDENT_IMAGE_FEATURES','detected':0}
 q,ok,_=cv2.calcOpticalFlowPyrLK(off,on,pts,None,**LK);back,backok,_=cv2.calcOpticalFlowPyrLK(on,off,q,None,**LK)
 a=pts.reshape(-1,2);b=q.reshape(-1,2);h,w=mask.shape;integer=np.rint(b).astype(int);inside=(integer[:,0]>=0)&(integer[:,0]<w)&(integer[:,1]>=0)&(integer[:,1]<h);valid=ok[:,0].astype(bool)&backok[:,0].astype(bool)&(np.linalg.norm(back.reshape(-1,2)-a,axis=1)<=.5)&inside
 valid[inside]&=mask[integer[inside,1],integer[inside,0]]>0
 a,b=a[valid],b[valid]
 if len(a)<6:return {'status':'UNMEASURED','reason':'INSUFFICIENT_INDEPENDENT_TRACK_SUPPORT','detected':len(pts),'valid':len(a)}
 ys,xs=np.where(mask>0);xmid=(xs.min()+xs.max())/2;ymid=(ys.min()+ys.max())/2
 if len(set(a[:,0]>xmid))<2 or len(set(a[:,1]>ymid))<2:return {'status':'UNMEASURED','reason':'INSUFFICIENT_SPATIAL_SUPPORT','detected':len(pts),'valid':len(a)}
 target=np.c_[a,np.ones(len(a))]@np.asarray(expected_affine).T;delta=np.linalg.norm(target-a,axis=1);err=np.linalg.norm(b-target,axis=1);tol=np.maximum(.5,.1*delta);agreement=float(np.mean(err<=tol))
 rows=[{'offPoint':x.tolist(),'observedOnPoint':y.tolist(),'expectedOnPoint':z.tolist(),'pixelError':float(e),'existingTolerancePixels':float(t),'matched':bool(e<=t)} for x,y,z,e,t in zip(a,b,target,err,tol)]
 return {'status':'VERIFIED_TARGET_CORRESPONDENCE' if agreement>=.9 else 'FAILED_TARGET_CORRESPONDENCE','detected':len(pts),'valid':len(a),'agreement':agreement,'medianErrorPixels':float(np.median(err)),'maximumErrorPixels':float(err.max()),'medianObservedDisplacement':np.median(b-a,axis=0).tolist(),'medianExpectedDisplacement':np.median(target-a,axis=0).tolist(),'features':rows,'scope':'Image crop transform correspondence, not artistic quality or release gate'}
def encode_decode(img,tmp,name):
 h,w=img.shape;p=pathlib.Path(tmp)/(name+'.mp4');subprocess.run(['ffmpeg','-v','error','-f','rawvideo','-pix_fmt','gray','-s',f'{w}x{h}','-r','24','-i','pipe:0','-frames:v','1','-c:v','libx264','-crf','24','-pix_fmt','yuv420p','-threads','1',str(p)],input=img.tobytes(),check=True)
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-pix_fmt','gray','-f','rawvideo','-']);return np.frombuffer(raw,dtype=np.uint8).reshape(h,w)
def selftest(output):
 rng=np.random.default_rng(831047);h,w=256,384;img=cv2.GaussianBlur(rng.integers(0,256,(h,w),dtype=np.uint8),(3,3),0);mask=np.zeros_like(img);mask[24:-24,24:-24]=255;cases=[]
 transforms={'translation':np.float32([[1,0,3],[0,1,-2]]),'zoom_translation':np.float32([[1.025,0,-2],[0,1.025,-3]])}
 for name,M in transforms.items():
  on=cv2.warpAffine(img,M,(w,h));r=measure(img,on,mask,M);assert r['status']=='VERIFIED_TARGET_CORRESPONDENCE',(name,r);cases.append({'case':name,**r})
 M=transforms['translation'];on=cv2.warpAffine(img,M,(w,h))
 with tempfile.TemporaryDirectory(prefix='kamen-flow-') as t:
  a=encode_decode(img,t,'off');b=encode_decode(on,t,'on');r=measure(a,b,mask,M);assert r['status']=='VERIFIED_TARGET_CORRESPONDENCE',r;cases.append({'case':'h264_quantization_noise',**r})
 # Text impostor is high-contrast and static, but excluded from both support domains.
 a=img.copy();b=on.copy();cv2.putText(a,'LYRIC',(90,140),cv2.FONT_HERSHEY_SIMPLEX,1.5,255,4);cv2.putText(b,'LYRIC',(90,140),cv2.FONT_HERSHEY_SIMPLEX,1.5,255,4);m=mask.copy();m[85:160,75:270]=0;r=measure(a,b,m,M);assert r['status']=='VERIFIED_TARGET_CORRESPONDENCE',r;cases.append({'case':'primary_region_exclusion',**r})
 for name,b,m,expected,allowed in [('fully_occluded_target',np.zeros_like(img),mask,M,{'UNMEASURED','FAILED_TARGET_CORRESPONDENCE'}),('brightness_flicker',cv2.convertScaleAbs(img,alpha=.9,beta=15),mask,M,{'UNMEASURED','FAILED_TARGET_CORRESPONDENCE'}),('opposite_direction',cv2.warpAffine(img,np.float32([[1,0,-3],[0,1,2]]),(w,h)),mask,M,{'UNMEASURED','FAILED_TARGET_CORRESPONDENCE'}),('textureless_target',np.full_like(img,128),mask,M,{'UNMEASURED','FAILED_TARGET_CORRESPONDENCE'})]:
  a=img if name!='textureless_target' else np.full_like(img,128);r=measure(a,b,m,expected);assert r['status'] in allowed,(name,r);cases.append({'case':name,**r})
 pathlib.Path(output).write_text(json.dumps({'schema':1,'sensorTests':'PASS','opencvVersion':cv2.__version__,'methodPreregistration':'background-focus-flow-method-preregistration.json','actualMVExamined':False,'cases':cases},indent=2)+'\n');print(json.dumps({'sensorTests':'PASS','cases':len(cases)}))
if __name__=='__main__':selftest(sys.argv[1])
