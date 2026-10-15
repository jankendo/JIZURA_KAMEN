import pathlib,json,gzip,hashlib,shutil,sys
root=pathlib.Path(sys.argv[1]);case=sys.argv[2];out=pathlib.Path(sys.argv[3]);out.mkdir(parents=True,exist_ok=True)
parts={'development-07':'development-b','supplemental-development-13':'development-c'}
assert case in parts
source=root/'formal-b5a46b7';data=json.load(gzip.open(source/(parts[case]+'-results.json.gz'),'rt'));matches=[r for r in data['rows'] if r['fixture']['id']==case and r['variant']=='baseline'];assert len(matches)==1
r=matches[0];assert r['provenance']['finalArtifactVerification']['binding']['sourceCommit']=='2e7ed477f88028dbb63aa609e8a11b4052ea8c00';ref=r['referenceInputs'];files=[]
for kind,path,digest,target,compressed in [('video',root/'media'/(r['sha256']+'.mp4'),r['sha256'],case+'-baseline.mp4',False),('reference',source/(ref['file']+'.gz'),ref['sha256'],ref['file'],True),('audio',root/'inputs'/(ref['audioSHA256']+'.wav'),ref['audioSHA256'],ref['audioFile'],False)]:
 b=gzip.decompress(path.read_bytes()) if compressed else path.read_bytes();assert hashlib.sha256(b).hexdigest()==digest;(out/target).write_bytes(b);files.append({'kind':kind,'SHA256':digest,'bytes':len(b),'source':str(path),'restored':target})
(out/'results.json').write_text(json.dumps({'rows':[r]},ensure_ascii=False));manifest={'scope':'Immutable existing main artifact; no generation or encoding','fixture':case,'sourceCommit':'2e7ed477f88028dbb63aa609e8a11b4052ea8c00','rawMetrics':r['decoded']['metrics'],'files':files};(out/'restore-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
