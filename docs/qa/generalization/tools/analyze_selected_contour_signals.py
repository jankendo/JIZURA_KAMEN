"""Analyze hash-bound actual source-owned contour signals; no source/metric rewrite."""
from pathlib import Path
import json,hashlib,sys,collections
import numpy as np,cv2
from contour_template_sensor import measure,LIMITS
root=Path(sys.argv[1]);source=json.load(open(root/'foreground-shape-realization.json'));rows=[]
for frame in source['rows']:
 if frame['status']!='RAW_CONTOUR_SIGNAL_NO_SEMANTIC_VERDICT':continue
 signal=frame['signals'];w,h=signal['width'],signal['height'];arrays={}
 for key,item in signal['files'].items():
  rel=Path(item['file']);assert not rel.is_absolute()and '..'not in rel.parts;b=(root/rel).read_bytes();assert len(b)==item['bytes']and hashlib.sha256(b).hexdigest()==item['SHA256'];a=np.frombuffer(b,dtype=np.uint8 if key=='mask'else'<f4');assert len(a)==w*h;arrays[key]=a.reshape(h,w)
 result=measure(arrays['native'],arrays['decoded'],arrays['repeatNoise'],arrays['mask']);rows.append({k:frame[k]for k in ['outputFrame','nativeOutputTimestamp','actualDecodedTimestamp','line','cutIndex','derivedLayer']}|{'measurement':result,'signals':signal})
assert rows,'NO_ACTUAL_CONTOUR_SIGNAL'
report={k:source[k]for k in ['sourceCommit','originalVideoSHA256','inputHash','planHash','outputProfile','selectedOperator']};report.update(rows=rows,statusCounts=dict(collections.Counter(r['measurement']['status']for r in rows)),criteria=LIMITS,numpy=np.__version__,opencv=cv2.__version__,scope='Physical signed contour-template correspondence only. Exact source-owned transparent white edge bitmap; same full selected Native ON/OFF and actual completed encoded controls. No camera motion attribution or artistic quality grade.',limits=['Registration or model failure is not by itself a major whole-film rendering defect. All model outcomes retained.','Actual app/gate thresholds and creative metric weights are untouched.','Whole-frame RMS alone is never accepted as semantic success.']);(root/'contour-template-realization.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'sourceCommit':source['sourceCommit'],'frames':len(rows),'statusCounts':report['statusCounts']}))
