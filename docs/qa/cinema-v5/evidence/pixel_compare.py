import json,subprocess,hashlib,sys
from pathlib import Path
root,out=map(Path,sys.argv[1:3]);out.mkdir(parents=True,exist_ok=True);data=json.loads((root/'results.json').read_text());freeze=json.loads(Path(sys.argv[3]).read_text());pairs=[]
for fid in sorted({r['fixture']['id'] for r in data['rows']}):
 rows={r['variant']:r for r in data['rows'] if r['fixture']['id']==fid and r['status']=='PASS'}
 if not all(v in rows for v in ['baseline','v3']):continue
 old,new=rows['baseline'],rows['v3'];comparable=old['runtimeHTMLSHA256']==freeze['baselineRuntimeSHA256'] and new['runtimeHTMLSHA256']==freeze['runtimeSHA256'] and old['fixture']==new['fixture'] and old['input']==new['input'] and old['sourceInvariant']==new['sourceInvariant'] and old['fixture'].get('baselineCinema') is True
 if not comparable:continue
 hashes={}
 for v in ['baseline','v3']:
  run=subprocess.run(['ffmpeg','-v','error','-i',str(root/f'{fid}-{v}.mp4'),'-map','0:v:0','-pix_fmt','rgb24','-f','framehash','-hash','sha256','-'],text=True,capture_output=True,check=True)
  (out/f'{fid}-{v}.framehash.txt').write_text(run.stdout);hashes[v]=[line.split(',')[-1].strip() for line in run.stdout.splitlines() if not line.startswith('#') and line.strip()]
 same=sum(a==b for a,b in zip(hashes['baseline'],hashes['v3']));pairs.append({'fixture':fid,'sourceAndInputComparable':True,'baselineFrameCount':len(hashes['baseline']),'v5FrameCount':len(hashes['v3']),'sameDecodedRGBFrames':same,'changedDecodedRGBFrames':min(map(len,hashes.values()))-same,'allDecodedFramesIdentical':hashes['baseline']==hashes['v3'],'interpretation':'Pixel identity establishes preservation for these frames; different pixels alone establish neither improvement nor regression.'})
(out/'pixel-comparison.json').write_text(json.dumps({'source':freeze,'method':'FFmpeg decoded RGB24 frame SHA-256; codec timestamps retained in raw framehash files','pairs':pairs,'humanStatus':'HUMAN_UNVERIFIED'},indent=2)+'\n');print(json.dumps(pairs))
