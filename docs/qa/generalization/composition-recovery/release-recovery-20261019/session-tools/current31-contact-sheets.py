import pathlib,json,hashlib,subprocess,tempfile
from PIL import Image,ImageDraw
Q=pathlib.Path('/workspace/kamen-evidence/docs/qa/generalization');R=Q/'composition-recovery';O=R/'release-recovery-20261019';F=R/'release-d04c734-frozen'
for case in ['development-01','development-06']:
 paths=[]
 for version in ['main','previous','current']:
  d=json.loads((F/'comparison-movies'/f'{case}-{version}.json').read_text());paths.append((version,d['sourceCommit'],Q/'media'/(d['videoSHA256']+'.mp4')))
 d=json.loads((O/'current31-results'/case/'import.json').read_text());paths.append(('recovery',d['sourceCommit'],Q/'media'/(d['videoSHA256']+'.mp4')))
 times=[.5,1.25,2.5,3.5,4.25,5.5,6.5,7.25,8.5];W,H=320,180;sheet=Image.new('RGB',(len(times)*W,4*(H+28)),(28,28,28));draw=ImageDraw.Draw(sheet);records=[]
 for row,(label,source,p)in enumerate(paths):
  digest=hashlib.sha256(p.read_bytes()).hexdigest();assert digest==p.stem
  for col,t in enumerate(times):
   frame=round(t*24)
   with tempfile.TemporaryDirectory()as z:
    out=pathlib.Path(z)/'frame.png';subprocess.run(['ffmpeg','-v','error','-threads','1','-i',str(p),'-vf',f'select=eq(n\\,{frame}),scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2','-frames:v','1','-threads','1',str(out)],check=True)
    sheet.paste(Image.open(out),(col*W,row*(H+28)+28))
   draw.text((col*W+5,row*(H+28)+5),f'{label} {source[:8]} t={frame/24:.3f}',fill='white')
  records.append({'label':label,'sourceCommit':source,'videoSHA256':digest})
 target=O/'current31-contact-sheets';target.mkdir(exist_ok=True);sheet.save(target/(case+'.png'));(target/(case+'.json')).write_text(json.dumps({'caseId':case,'movies':records,'outputTimestamps':times,'frameIndices':[round(t*24)for t in times],'scope':'Exact output-frame extracts for engineering comparison; no new MP4 or automatic creative adjudication.'},indent=2)+'\n')
 print(case,flush=True)
