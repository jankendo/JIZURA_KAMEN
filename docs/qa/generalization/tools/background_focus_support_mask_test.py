import pathlib,json,sys,numpy as np,cv2
from background_focus_support_mask import owned_support,support_radius
from background_focus_flow_sensor import measure
r=support_radius();assert r==102
h,w=720,960;mask=np.zeros((h,w),np.uint8);mask[8:-8,8:-8]=255;mask[330:450,400:560]=0;owned=owned_support(mask);ys,xs=np.where(owned);assert len(xs)>0
for y,x in zip(ys[::37],xs[::37]):assert np.all(mask[y-r:y+r+1,x-r:x+r+1]>0)
rng=np.random.default_rng(831047);off=cv2.GaussianBlur(rng.integers(0,256,(h,w),dtype=np.uint8),(3,3),0);M=np.float32([[1,0,4],[0,1,-3]]);on=cv2.warpAffine(off,M,(w,h));off[330:450,400:560]=255;on[330:450,400:560]=255
positive=measure(off,on,owned,M);assert positive['status']=='VERIFIED_TARGET_CORRESPONDENCE',positive
opposite=cv2.warpAffine(off,np.float32([[1,0,-4],[0,1,3]]),(w,h));negative=measure(off,opposite,owned,M);assert negative['status']!='VERIFIED_TARGET_CORRESPONDENCE'
empty=owned_support(np.zeros_like(mask));assert not np.any(empty);occluded=measure(off,on,empty,M);assert occluded['status']=='UNMEASURED'
d={'schema':1,'status':'PASS','opencvVersion':cv2.__version__,'supportRadius':r,'radiusDerivation':'(half-window+interpolation)*2^pyramidLevel + 5-tap pyramid radii; fixed existing LK parameters','cases':{'everyAllowedPointHasOwnedFullSupport':True,'knownTranslationWithStaticForeground':positive,'oppositeDirection':negative,'fullyOccluded':occluded},'actualMVExamined':False,'thresholdsChanged':False};pathlib.Path(sys.argv[1]).write_text(json.dumps(d,indent=2)+'\n');print({'status':'PASS','cases':4,'supportRadius':r})
