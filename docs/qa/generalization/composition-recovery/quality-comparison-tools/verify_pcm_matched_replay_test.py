import pathlib,tempfile,json,subprocess,sys
script=pathlib.Path(__file__).with_name('verify_pcm_matched_replay.py');sources=['2e7ed477f88028dbb63aa609e8a11b4052ea8c00','5e14682249ce690337874214f2ec76fc8e68fa26','5c92e27e6216962d09ec73927fd0df6ce50d0560']
def row(source):return {'fixture':{'id':'contract-only'},'variant':'v3','status':'PASS','input':{'fps':24},'sha256':source,'referenceInputs':{'audioSHA256':'audio'},'sourceInvariant':{'pcmHash':'pcm'},'provenance':{'finalArtifactVerification':{'binding':{'sourceCommit':source,'outputProfile':{'fps':24}}}}}
count=0
for mode in ['matched','differentPCM','missingPCM','differentProfile','differentInput','missingSource','duplicateSource','failed']:
 with tempfile.TemporaryDirectory(prefix='pcm-contract-') as directory:
  p=pathlib.Path(directory);a,b,c=map(row,sources)
  if mode=='differentPCM':c['sourceInvariant']['pcmHash']='other'
  if mode=='missingPCM':del c['sourceInvariant']['pcmHash']
  if mode=='differentProfile':c['provenance']['finalArtifactVerification']['binding']['outputProfile']['fps']=30
  if mode=='differentInput':c['input']['fps']=30
  if mode=='missingSource':del c['provenance']['finalArtifactVerification']['binding']['sourceCommit']
  if mode=='duplicateSource':c['provenance']['finalArtifactVerification']['binding']['sourceCommit']=sources[0]
  if mode=='failed':c['status']='FAIL'
  for name,rows in [('matrix',[a,c]),('previous',[b])]:
   (p/name).mkdir();(p/name/'results.json').write_text(json.dumps({'rows':rows}))
  r=subprocess.run([sys.executable,str(script),str(p)],capture_output=True,text=True);d=json.loads((p/'pcm-correspondence.json').read_text());assert (r.returncode==0)==(mode=='matched'),(mode,r.stderr);assert d['status']==('MATCHED' if mode=='matched' else 'CONFOUNDED_OR_INCOMPLETE');count+=1
print(json.dumps({'status':'PASS','counterexamples':count,'scope':'Comparison contract only; synthetic rows never counted as rendered MP4 evidence'}))
