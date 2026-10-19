"""Same fixed crop sensor on exact source Native and final decoded pairs; never hide model failure."""
from pathlib import Path
import json,gzip,hashlib,sys,collections
import numpy as np,cv2
from background_crop_ecc_sensor import measure
root=Path(sys.argv[1]);source=json.load(open(root/'selected-focus-native-signals.json'));rows=[]
for frame in source['rows']:
 if frame['status']!='RAW_FOCUS_NATIVE_AND_ENCODED_SIGNALS_NO_VERDICT':continue
 signal=frame['signals'];w,h=signal['width'],signal['height'];arrays={}
 for key,item in signal['files'].items():
  rel=Path(item['file']);assert not rel.is_absolute()and '..'not in rel.parts;compressed=(root/rel).read_bytes();assert hashlib.sha256(compressed).hexdigest()==item['compressedSHA256'];b=gzip.decompress(compressed);assert len(b)==item['bytes']and hashlib.sha256(b).hexdigest()==item['SHA256'];a=np.frombuffer(b,dtype=np.uint8 if key=='mask'else'<f4');assert len(a)==w*h;arrays[key]=a.reshape(h,w)
 M=frame['expectedAffine'];native=measure(arrays['nativeOFF'],arrays['nativeON'],arrays['nativeON'],arrays['nativeON'],arrays['mask'],M);encoded=measure(arrays['decodedOFF'],arrays['decodedON'],arrays['decodedRepeat'],arrays['decodedON'],arrays['mask'],M)
 if native['status']=='VERIFIED_IMAGE_TRANSFORM'and encoded['status']=='VERIFIED_IMAGE_TRANSFORM':status='SOURCE_AND_DECODED_CROP_VERIFIED'
 elif native['status']!='VERIFIED_IMAGE_TRANSFORM':status='MODEL_UNVERIFIED_ON_NATIVE_NO_APP_FAILURE_CLAIM'
 else:status='DECODED_CROP_UNVERIFIED_AFTER_NATIVE_MODEL_SUCCESS'
 rows.append({k:frame[k]for k in ['outputFrame','nativeOutputTimestamp','actualDecodedTimestamp','line','cutIndex','target','fieldBoxOutputPixels','expectedAffine','ownership','signals']}|{'nativeModel':native,'encodedModel':encoded,'status':status})
assert rows,'NO_NATIVE_AND_ENCODED_FOCUS_SIGNALS'
report={k:source[k]for k in ['sourceCommit','originalVideoSHA256','inputHash','planHash','outputProfile','selectedOperator']};report.update(rows=rows,statusCounts=dict(collections.Counter(r['status']for r in rows)),nativeStatusCounts=dict(collections.Counter(r['nativeModel']['status']for r in rows)),encodedStatusCounts=dict(collections.Counter(r['encodedModel']['status']for r in rows)),numpy=np.__version__,opencv=cv2.__version__,scope='Unchanged half-pixel/10percent/90percent crop sensor on both exact Native and actual decoded pairs, with source-owned non-crop overlay exclusion. No metric/gate/threshold change. Native model failure is retained and bars an encoded certificate.',limits=['A model can fail even on original Native images. This alone is not a renderer defect or an artistic assessment.','No result-based mask selection: source field, all registered primary glyphs and source-rendered non-crop overlays define support.','Sub-resolution signal and remapped/multiple views remain unmeasured/confounded.']);(root/'focus-native-versus-decoded-model-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'case':source['originalVideoSHA256'],'frames':len(rows),'statusCounts':report['statusCounts']}))
