import numpy as np,cv2,json,pathlib,sys,tempfile
from background_crop_ecc_sensor import measure
from background_focus_flow_sensor import encode_decode
rng=np.random.default_rng(831047);h,w=360,640;off=cv2.GaussianBlur(rng.integers(0,256,(h,w),dtype=np.uint8),(3,3),0);mask=np.zeros_like(off);mask[32:-32,32:-32]=255;cases=[]
for name,M in [('translation',np.float32([[1,0,4],[0,1,-3]])),('zoom_translation',np.float32([[1.025,0,-4],[0,1.025,-3]]))]:
 on=cv2.warpAffine(off,M,(w,h));r=measure(off,on,on,on,mask,M);assert r['status']=='VERIFIED_IMAGE_TRANSFORM',(name,r);cases.append({'case':name,**r})
M=np.float32([[1,0,4],[0,1,-3]]);on=cv2.warpAffine(off,M,(w,h));a=off.copy();b=on.copy();a[130:220,220:400]=255;b[130:220,220:400]=255;m=mask.copy();m[130:220,220:400]=0;r=measure(a,b,b,b,m,M);assert r['status']=='VERIFIED_IMAGE_TRANSFORM',r;cases.append({'case':'excluded_static_foreground_with_kernel_halo',**r})
with tempfile.TemporaryDirectory()as t:
 a=encode_decode(off,t,'off');b=encode_decode(on,t,'on');r=measure(a,b,b,b,mask,M);assert r['status']=='VERIFIED_IMAGE_TRANSFORM',r;cases.append({'case':'actual_h264_quantization',**r})
for name,b,m in [('opposite_direction',cv2.warpAffine(off,np.float32([[1,0,-4],[0,1,3]]),(w,h)),mask),('stationary',off.copy(),mask),('brightness_only',cv2.convertScaleAbs(off,alpha=.8,beta=20),mask),('occluded',on,np.zeros_like(mask))]:
 r=measure(off,b,b,b,m,M);assert r['status']!='VERIFIED_IMAGE_TRANSFORM',(name,r);cases.append({'case':name,**r})
r=measure(np.full_like(off,120),np.full_like(off,120),np.full_like(off,120),np.full_like(off,120),mask,M);assert r['status']=='UNMEASURED';cases.append({'case':'textureless',**r})
d={'schema':1,'status':'PASS','opencvVersion':cv2.__version__,'actualMVExamined':False,'cases':cases,'method':'Direct known-transform-initialized affine ECC, full-rank geometry, all owned pixels, fixed existing0.5px/10%/90% agreement and max(1,3noise) signal floor. No scoring change.'};pathlib.Path(sys.argv[1]).write_text(json.dumps(d,indent=2)+'\n');print({'status':'PASS','cases':len(cases)})
