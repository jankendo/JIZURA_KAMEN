"""Independent direct-image alignment. Not an artistic score or LK replacement."""
import cv2,numpy as np
CRITERIA=(cv2.TERM_CRITERIA_COUNT|cv2.TERM_CRITERIA_EPS,100,1e-6)
def measure(off,on,repeat,original,mask,expected):
 h,w=off.shape;assert all(x.shape==off.shape for x in [on,repeat,original,mask]);mask=cv2.erode(mask,np.ones((5,5),np.uint8),borderType=cv2.BORDER_CONSTANT,borderValue=0);ys,xs=np.where(mask>0)
 if not len(xs):return {'status':'UNMEASURED','reason':'NO_OWNED_PIXEL_SUPPORT'}
 gradx=cv2.Sobel(off.astype(np.float32),cv2.CV_32F,1,0,ksize=3);grady=cv2.Sobel(off.astype(np.float32),cv2.CV_32F,0,1,ksize=3);gx=gradx[ys,xs];gy=grady[ys,xs];x=xs/w;y=ys/h;A=np.stack([gx*x,gx*y,gx,gy*x,gy*y,gy],axis=1);rank=int(np.linalg.matrix_rank(A))
 if rank<6:return {'status':'UNMEASURED','reason':'AFFINE_NOT_IDENTIFIABLE','normalRank':rank}
 expected=np.asarray(expected,np.float32);points=np.stack([xs,ys,np.ones(len(xs))],axis=1);target=points@expected.T;delta=np.linalg.norm(target-points[:,:2],axis=1)
 if np.median(delta)<.5:return {'status':'UNMEASURED','reason':'DECLARED_DISPLACEMENT_NOT_RESOLVED','medianExpectedPixels':float(np.median(delta))}
 try:correlation,observed=cv2.findTransformECC(off.astype(np.float32)/255,on.astype(np.float32)/255,expected.copy(),cv2.MOTION_AFFINE,CRITERIA,mask,1)
 except cv2.error as e:return {'status':'UNMEASURED','reason':'ALIGNMENT_DID_NOT_CONVERGE','detail':str(e)}
 predicted=points@observed.T;error=np.linalg.norm(predicted-target,axis=1);tol=np.maximum(.5,.1*delta);agreement=float(np.mean(error<=tol));aligned=cv2.warpAffine(on.astype(np.float32),observed,(w,h),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP);rms=lambda a,b:float(np.sqrt(np.mean((a[ys,xs].astype(float)-b[ys,xs].astype(float))**2)));noise=max(rms(on,repeat),rms(on,original));raw=rms(off,on);residual=rms(off,aligned);gain=raw-residual;resolved=gain>max(1,noise*3)
 return {'status':'VERIFIED_IMAGE_TRANSFORM'if agreement>=.9 and resolved else'UNMEASURED'if not resolved else'FAILED_IMAGE_TRANSFORM','reason':None if agreement>=.9 and resolved else'NO_INDEPENDENT_GAIN_ABOVE_ENCODING_NOISE'if not resolved else'ACTUAL_TRANSFORM_DISAGREES','normalRank':rank,'ownedPixels':len(xs),'expectedAffine':expected.tolist(),'observedAffine':observed.tolist(),'correlation':float(correlation),'agreement':agreement,'medianGeometricErrorPixels':float(np.median(error)),'maximumGeometricErrorPixels':float(error.max()),'medianExpectedPixels':float(np.median(delta)),'rawRMS':raw,'alignedResidualRMS':residual,'alignmentGainRMS':gain,'encodingNoiseRMS':noise,'noiseCriterion':max(1,3*noise),'scope':'Full-rank image-only affine correspondence plus independent gain above existing encoding-noise floor; not aesthetics.'}
