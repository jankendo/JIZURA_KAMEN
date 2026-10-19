"""Inspect already saved model failures; never change sensor thresholds or verdicts."""
import pathlib,json,gzip,hashlib,collections
import numpy as np,cv2
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery'
def main():
 rows=[]
 for key in ['0-6','1-6','3-5']:
  root=R/('grammar-policy-v2-focus-native-model-'+key)/'shape';p=root/'focus-native-versus-decoded-model-report.json.gz';report=json.loads(gzip.decompress(p.read_bytes()))
  for f in report['rows']:
   if f['nativeModel']['status']!='FAILED_IMAGE_TRANSFORM':continue
   signal=f['signals'];w,h=signal['width'],signal['height'];arrays={}
   for name in ['nativeON','nativeOFF','mask']:
    item=signal['files'][name];packed=gzip.decompress((root/(item['file']+'.gz')).read_bytes());assert hashlib.sha256(packed).hexdigest()==item['compressedSHA256'];raw=gzip.decompress(packed);assert len(raw)==item['bytes']and hashlib.sha256(raw).hexdigest()==item['SHA256'];arrays[name]=np.frombuffer(raw,dtype=np.uint8 if name=='mask'else'<f4').reshape(h,w)
   off,on=arrays['nativeOFF'],arrays['nativeON'];mask=cv2.erode(arrays['mask'],np.ones((5,5),np.uint8),borderType=cv2.BORDER_CONSTANT,borderValue=0);ys,xs=np.where(mask>0);gx=cv2.Sobel(off,cv2.CV_32F,1,0,ksize=3)[ys,xs].astype(float);gy=cv2.Sobel(off,cv2.CV_32F,0,1,ksize=3)[ys,xs].astype(float);x=xs/w;y=ys/h;A=np.stack([gx*x,gx*y,gx,gy*x,gy*y,gy],axis=1);eigen=np.linalg.eigvalsh(A.T@A);singular=np.sqrt(np.maximum(0,eigen));condition=float(singular[-1]/singular[0])if singular[0]>0 else None
   model=f['nativeModel'];expected=np.asarray(model['expectedAffine'],np.float32);observed=np.asarray(model['observedAffine'],np.float32);rms=lambda a,b:float(np.sqrt(np.mean((a[ys,xs].astype(float)-b[ys,xs].astype(float))**2)))
   aligned=lambda M:cv2.warpAffine(on,M,(w,h),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP)
   a,b=aligned(expected),aligned(observed)
   rows.append({'controlKey':key,'originalVideoSHA256':report['originalVideoSHA256'],'actualDecodedTimestamp':f['actualDecodedTimestamp'],'sourceClock':f['nativeOutputTimestamp'],'normalMatrixSingularValues':singular.tolist(),'normalizedAffineConditionNumber':condition,'gradientEnergyX':float(gx@gx),'gradientEnergyY':float(gy@gy),'expectedMappingResidualLuma':rms(off,a),'ECCMappingResidualLuma':rms(off,b),'expectedVersusECCPredictedImageDifferenceLuma':rms(a,b),'maximumGeometricDisagreementPixels':model['maximumGeometricErrorPixels'],'retainedOriginalStatus':f['status'],'retainedNativeModelStatus':model['status'],'scope':'Diagnostic texture/overlay/affine ambiguity. No automatic identifiability PASS or new cutoff. Original model failure remains; this does not prove a renderer defect or repair encoder behavior.'})
 result={'schema':1,'sourceCommit':'d04c734bc5eb0c0c427a42a196cae3a507b89506','rows':rows,'numpy':np.__version__,'opencv':cv2.__version__,'verdict':'DIAGNOSTIC_ONLY_ORIGINAL_NATIVE_MODEL_FAILURES_RETAINED','qualityGateChanged':False};(R/'grammar-policy-v2-focus-affine-identifiability-diagnostic.json').write_text(json.dumps(result,indent=2)+'\n');print({'frames':len(rows),'conditionRange':[min(x['normalizedAffineConditionNumber']for x in rows if x['normalizedAffineConditionNumber']is not None),max(x['normalizedAffineConditionNumber']for x in rows if x['normalizedAffineConditionNumber']is not None)],'nativeModelFailuresRetained':True})
if __name__=='__main__':main()
