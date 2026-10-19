"""Resolve renderer-cloned cut identities against immutable selected reference + final FAV."""
import pathlib,gzip,json,hashlib

def read(p):
 b=p.read_bytes();return (json.loads(gzip.decompress(b) if p.suffix=='.gz' else b),b)
def text(c):return c.get('text') if c.get('text') is not None else c.get('lineText')
def bind(trace_path,artifact_root):
 t,raw=read(trace_path);root=artifact_root
 rp=root/'matrix'/f"{t['caseId']}-{t['variant']}-row.json.gz";row,_=read(rp);refpath=root/'matrix'/(row['referenceInputs']['file']+'.gz');ref,rb=read(refpath)
 assert hashlib.sha256(gzip.decompress(rb)).hexdigest()==row['referenceInputs']['sha256']==t['referenceSHA256'],'REFERENCE_SHA_MISMATCH'
 return bind_values(t,gzip.decompress(raw) if trace_path.suffix=='.gz'else raw,ref,row['provenance']['finalArtifactVerification'])
def bind_values(t,trace_raw,ref,verification):
 """Same resolver for bounded streaming readers; caller authenticates reference bytes."""
 assert ref['planHash']==t['planHash']==verification['binding']['planHash'],'SELECTED_PLAN_MISMATCH'
 assert verification['binding']==t['artifactBinding'] and t['exactNativeRGBA'],'NATIVE_ARTIFACT_BINDING_MISMATCH'
 assert ref['inputSnapshot']['inputHash']==t['artifactBinding']['inputHash'],'REFERENCE_INPUT_HASH_MISMATCH'
 assert t['build']['sourceCommit']==t['artifactBinding']['sourceCommit'] and t['build']['sourceTreeSHA256']==t['artifactBinding']['sourceTreeSHA256'] and t['build']['sourceDirty']==False,'SOURCE_RENDERER_BINDING_MISMATCH'
 cuts=ref['plan']['cuts'];units=verification['units'];mapping={}
 for key in set([c['unitKey'] for c in t['calls']]+[c['unitKey'] for c in t['temporalContracts']]):
  v=json.loads(key);assert len(v)==6
  if v[1:] == [None]*5:
   mapping[key]={'resolvedUnitKey':key,'domain':'GLOBAL_NO_LYRIC_CUT','unitId':None,'fragmentId':None};continue
  matches=[i for i,c in enumerate(cuts) if [c.get('index'),c.get('line'),c.get('start'),c.get('end'),text(c)]==v[1:]]
  assert len(matches)==1, 'ACTUAL_CUT_CONTRACT_NOT_UNIQUE '+key
  ordinal=matches[0];assert v[0] in [-1,ordinal],'RECORDED_ORDINAL_DISAGREES_WITH_SELECTED_REFERENCE'
  found=[(u,f) for u in units for f in u['fragments'] if f['index']==ordinal]
  assert len(found)<=1,'FINAL_FRAGMENT_NOT_UNIQUE'
  u,f=found[0] if found else ({},{})
  mapping[key]={'resolvedUnitKey':json.dumps([ordinal,*v[1:]],ensure_ascii=False,separators=(',',':')),'domain':'PRIMARY_LYRIC_FRAGMENT' if found else 'NON_LYRIC_SCENE','ordinal':ordinal,'authoredCutIndex':v[1],'unitId':u.get('unitId'),'sourceUnitId':u.get('sourceUnitId'),'fragmentId':f.get('id'),'method':'Unique exact authored-index/line/start/end/text tuple in selected hash-verified plan; never line-only. Original raw key retained.'}
 return {'sourceCommit':t['artifactBinding']['sourceCommit'],'traceRawSHA256':hashlib.sha256(trace_raw).hexdigest(),'referenceSHA256':t['referenceSHA256'],'videoSHA256':t['videoSHA256'],'planHash':t['planHash'],'bindings':mapping,'manualRawUnitKeys':t.get('manualUnitKeys',[])}
