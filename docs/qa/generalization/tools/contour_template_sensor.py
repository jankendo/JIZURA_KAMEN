"""Signed source-owned contour-template correspondence; not a creative score.
Inherited physical limits: .5px registration, .30..1.8 contrast projection,
95% ink agreement, 1-luma / three-repeat-noise resolved signal.
"""
import cv2,numpy as np
LIMITS={'registrationPixels':.5,'projectionMin':.30,'projectionMax':1.8,'inkAgreement':.95,'minimumLuma':1.,'repeatNoiseMultiplier':3.}
def measure(native,decoded,noise,mask):
 assert native.shape==decoded.shape==noise.shape==mask.shape
 assert native.ndim==2 and all(np.isfinite(x).all()for x in [native,decoded,noise])
 owned=mask>0
 if np.count_nonzero(owned)<3:return {'status':'UNMEASURED','reason':'NO_SOURCE_OWNED_CONTOUR_SUPPORT'}
 rms=lambda x:float(np.sqrt(np.mean(x[owned].astype(float)**2)))
 expected,actual,repeat=rms(native),rms(decoded),rms(noise);floor=max(1.,3*repeat)
 result={'sourceOwnedPixels':int(owned.sum()),'expectedSignalLuma':expected,'actualSignalLuma':actual,'repeatNoiseLuma':repeat,'signalFloorLuma':floor,'limits':LIMITS}
 if expected<=floor or actual<=floor:return {**result,'status':'UNMEASURED','reason':'CONTOUR_NOT_RESOLVED_ABOVE_REPEAT_NOISE'}
 gx=cv2.Sobel(native,cv2.CV_32F,1,0,ksize=3)[owned];gy=cv2.Sobel(native,cv2.CV_32F,0,1,ksize=3)[owned];rank=int(np.linalg.matrix_rank(np.stack([gx,gy],axis=1)));result['translationNormalRank']=rank
 if rank<2:return {**result,'status':'UNMEASURED','reason':'CONTOUR_POSITION_NOT_IDENTIFIABLE'}
 try:correlation,M=cv2.findTransformECC(native.astype(np.float32)/255,decoded.astype(np.float32)/255,np.eye(2,3,dtype=np.float32),cv2.MOTION_TRANSLATION,(cv2.TERM_CRITERIA_COUNT|cv2.TERM_CRITERIA_EPS,100,1e-6),mask.astype(np.uint8),1)
 except cv2.error as e:return {**result,'status':'UNMEASURED','reason':'CONTOUR_REGISTRATION_DID_NOT_CONVERGE','detail':str(e)}
 aligned=cv2.warpAffine(decoded,M,(native.shape[1],native.shape[0]),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP);eligible=owned&(np.abs(native)>floor);count=int(eligible.sum())
 if count<3:return {**result,'status':'UNMEASURED','reason':'INSUFFICIENT_RESOLVED_CONTOUR_INK'}
 ratios=aligned[eligible]/native[eligible];agreement=float(np.mean((ratios>.30)&(ratios<1.8)));shift=float(np.linalg.norm(M[:,2]));gain=float(np.sum(decoded[owned]*native[owned])/np.sum(native[owned]**2));passed=shift<=.5 and agreement>=.95 and .30<gain<1.8
 return {**result,'status':'VERIFIED_CONTOUR_TEMPLATE'if passed else'FAILED_CONTOUR_TEMPLATE_MODEL','reason':None if passed else'SOURCE_OWNED_SIGNED_CONTOUR_GEOMETRY_OR_CONTRAST_DISAGREES','resolvedInkPixels':count,'inkAgreement':agreement,'registrationPixels':shift,'observedAffine':M.tolist(),'signedTemplateGain':gain,'correlation':float(correlation),'scope':'Independent source-edge contour contribution. No camera attribution, aesthetic grade or whole-film verdict.'}
