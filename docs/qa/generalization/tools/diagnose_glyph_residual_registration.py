"""Diagnostic only: no production QA threshold or release verdict is created.
NPZ keys: native_on, native_background, decoded, glyph_mask (same 2D float raster).
A native background is a counterfactual reference, not independently decoded background.
"""
import argparse,json,hashlib,numpy as np
from pathlib import Path

def register(native_on,native_background,decoded,glyph_mask,radius=8):
 arrays=[np.asarray(a,dtype=np.float64) for a in [native_on,native_background,decoded,glyph_mask]]
 if len({a.shape for a in arrays})!=1 or arrays[0].ndim!=2 or any(not np.isfinite(a).all() for a in arrays):
  return {'status':'UNMEASURED','reason':'NONFINITE_OR_MISMATCHED_RASTER'}
 on,bg,actual,mask=arrays;mask=mask>0;template=np.where(mask,on-bg,0);residual=actual-bg
 energy=float(np.sum(template**2));h,w=on.shape
 if not mask.any() or energy==0:return {'status':'UNMEASURED','reason':'NO_RESOLVED_NATIVE_FOREGROUND_RESIDUAL','nativeResidualEnergy':energy}
 # Score the complete supplied glyph crop, including padding. It must be the
 # same crop for every shift, rather than hiding omitted foreground by overlap.
 ys,xs=np.where(mask)
 if min(xs)<radius or min(ys)<radius or max(xs)+radius>=w or max(ys)+radius>=h:
  return {'status':'UNMEASURED','reason':'INSUFFICIENT_FIXED_PADDING_FOR_SEARCH'}
 candidates=[]
 for dy in range(-radius,radius+1):
  for dx in range(-radius,radius+1):
   shifted=np.roll(template,(dy,dx),(0,1));error=float(np.sum((shifted-residual)**2));candidates.append({'dx':dx,'dy':dy,'squaredResidualError':error})
 candidates.sort(key=lambda x:x['squaredResidualError']);best=candidates[0];ties=[x for x in candidates if x['squaredResidualError']==best['squaredResidualError']]
 if len(ties)!=1:return {'status':'UNMEASURED','reason':'NON_UNIQUE_INTEGER_TRANSLATION_OPTIMUM','optima':ties,'nativeResidualEnergy':energy}
 return {'status':'DIAGNOSTIC_ONLY_UNIQUE_NUMERIC_OPTIMUM','semanticStatus':'UNMEASURED','bestIntegerTranslation':best,'secondBestSquaredError':candidates[1]['squaredResidualError'],'numericalSeparation':candidates[1]['squaredResidualError']-best['squaredResidualError'],'nativeResidualEnergy':energy,'relativeSquaredResidualError':best['squaredResidualError']/energy,'searchRadius':radius,'existingHoldStillnessThresholdPixels':1,'geometricDisplacementPixels':float(np.hypot(best['dx'],best['dy'])),'limits':['No calibrated registration reliability, contrast, occlusion, or fit-error acceptance threshold exists here. Unique numeric optimum is not certification.','Decoded compression, imperfect counterfactual backgrounds, nontranslation deformation and overlapping glyphs can invalidate this model.','Same stable unit/glyph identity, output raster and actual decoded PTS must be bound externally.','No change to existing 1px stillness threshold; no PASS or release result is emitted.']}

def tests():
 h,w=32,48;mask=np.zeros((h,w));mask[13:19,16:21]=1;mask[13:15,21:24]=1
 bg=np.full((h,w),.5);native=np.where(mask,0,bg);base=register(native,bg,native,mask,4);assert base['bestIntegerTranslation']['dx']==0
 actual=bg+np.roll(native-bg,(0,2),(0,1));shift=register(native,bg,actual,mask,4);assert shift['bestIntegerTranslation']['dx']==2
 varying=np.tile(np.linspace(.15,.6,w),(h,1));static=np.where(mask,0,varying);change=register(static,varying,static,mask,4);assert change['bestIntegerTranslation']['dx']==0
 low=np.where(mask,bg-1e-8,bg);low_result=register(low,bg,low,mask,4);assert low_result['semanticStatus']=='UNMEASURED'
 missing=native.copy();missing[15:19,16:21]=bg[15:19,16:21];partial=register(native,bg,missing,mask,4);assert partial.get('semanticStatus','UNMEASURED')=='UNMEASURED';assert partial['relativeSquaredResidualError']>0
 blank=register(bg,bg,bg,mask,4);assert blank['status']=='UNMEASURED'
 # A one-pixel template and two equal neighboring glyphs have two equal optima.
 single=np.zeros((h,w));single[16,24]=1;on=bg-single*.5;duplicate=bg.copy();duplicate[16,22]=0;duplicate[16,26]=0
 repeated=register(on,bg,duplicate,single,4);assert repeated['reason']=='NON_UNIQUE_INTEGER_TRANSLATION_OPTIMUM'
 return {'schema':1,'purpose':'Diagnostic counterexamples only; not actual-MP4 results or production QA','tests':{'static':base,'actual2PixelTranslation':shift,'varyingBackgroundStaticGlyph':change,'nearZeroContrast':low_result,'partialMissingGlyph':partial,'zeroContrast':blank,'duplicateGlyphAmbiguity':repeated},'PASS':7,'FAIL':0,'productionReleaseGate':'UNCHANGED_UNMEASURED','human':'HUMAN_UNVERIFIED'}

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--self-test',action='store_true');p.add_argument('--input');p.add_argument('--output',required=True);p.add_argument('--radius',type=int,default=8);a=p.parse_args()
 if a.self_test:report=tests()
 else:
  raw=Path(a.input).read_bytes();data=np.load(a.input);report={'inputSHA256':hashlib.sha256(raw).hexdigest(),'result':register(*(data[k] for k in ['native_on','native_background','decoded','glyph_mask']),radius=a.radius)}
 Path(a.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'output':a.output,'status':report.get('PASS',report.get('result',{}).get('status'))}))
