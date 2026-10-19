"""Fixed, uniform decoded-frame comparisons. No automated artistic verdict."""
import pathlib,json,hashlib,subprocess,tempfile,concurrent.futures
from PIL import Image,ImageDraw
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';O=R/'release-recovery-20261019';F=R/'release-d04c734-frozen';dest=O/'current31-contact-sheets-v2';dest.mkdir(exist_ok=True)
def make(p):
 d=json.loads(p.read_text());case=d['caseId']
 if case=='late-unseen-quiet-16x9':return
 target=dest/(case+'.png')
 if target.exists():return case+' existing'
 b=d['binding'];fps=b['outputProfile']['fps'];start,end=b['outputProfile']['range'];N=int((end-start)*fps+.5);frames=sorted({min(N-1,int((N-1)*x+.5))for x in [.04,.14,.24,.34,.44,.54,.64,.74,.84,.94]})
 if case=='development-04':frames=sorted(set(frames+[round((4.25-start)*fps)]))
 paths=[]
 for version in ['main','previous','current']:
  m=json.loads((F/'comparison-movies'/(case+'-'+version+'.json')).read_text());paths.append((version,m['sourceCommit'],m['videoSHA256']))
 paths.append(('recovery',d['sourceCommit'],d['videoSHA256']))
 W,H=320,240;sheet=Image.new('RGB',(len(frames)*W,4*(H+24)),(24,24,24));draw=ImageDraw.Draw(sheet);movies=[]
 for row,(label,source,h)in enumerate(paths):
  video=Q/'media'/(h+'.mp4');assert hashlib.sha256(video.read_bytes()).hexdigest()==h
  with tempfile.TemporaryDirectory()as temp:
   select='+'.join('eq(n\\,%d)'%n for n in frames);pattern=str(pathlib.Path(temp)/'frame%03d.png');subprocess.run(['ffmpeg','-v','error','-threads','1','-i',str(video),'-vf',f'select={select},scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2','-fps_mode','passthrough','-threads','1',pattern],check=True)
   images=sorted(pathlib.Path(temp).glob('frame*.png'));assert len(images)==len(frames),(case,label,len(images),len(frames))
   for col,(frame,png)in enumerate(zip(frames,images)):
    sheet.paste(Image.open(png),(col*W,row*(H+24)+24));draw.text((col*W+4,row*(H+24)+4),f'{label} {source[:8]} t={start+frame/fps:.3f}',fill='white')
  movies.append({'label':label,'sourceCommit':source,'videoSHA256':h})
 sheet.save(target);(dest/(case+'.json')).write_text(json.dumps({'caseId':case,'movies':movies,'frameIndices':frames,'outputTimestamps':[start+n/fps for n in frames],'sampling':'Fixed 4%,14%,...,94% of complete encoded frame population, plus the previously identified development-04 repair clock. Same frame index for all versions.','scope':'Sparse decoded visual comparison; does not certify unsampled frames, all motion or all semantic intents.'},indent=2)+'\n');return case
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:
  for s in pool.map(make,sorted((O/'current31-results').glob('*/import.json'))):print(s,flush=True)
