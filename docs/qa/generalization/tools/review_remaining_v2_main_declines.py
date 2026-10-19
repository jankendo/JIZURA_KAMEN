import pathlib,json,hashlib,subprocess,gzip,io
from PIL import Image,ImageDraw
q=pathlib.Path(__file__).resolve().parents[1];r=q/'composition-recovery';out=r/'grammar-policy-v2-remaining-main-decline-frames';out.mkdir(exist_ok=True);d=json.load(open(r/'grammar-policy-v2-three-version-comparison.json'));allSamples=[]
selected={'development-01','development-08','holdout-07','holdout-08','holdout-11','holdout-14','supplemental-development-13'}
for row in d['rows']:
 cid=row['fixture']
 if cid not in selected:continue
 b=gzip.decompress((r/row['currentArchive']/'matrix'/(cid+'-v3-reference.json.gz')).read_bytes());ref=json.loads(b);p=ref['plan'];fps=row['versions']['current']['binding']['outputProfile']['fps'];start=row['versions']['current']['binding']['outputProfile']['range'][0];cuts=[c for c in p['cuts']if c.get('line',-1)>=0];byline={}
 for c in cuts:byline.setdefault(c['line'],c)
 indices=[round(((c['start']+c['end'])/2-start)*fps)for c in list(byline.values())[:3]]
 versions=['main','current'];imgs=[]
 for label in versions:
  bind=row['versions'][label]['binding'];sha=bind['videoSHA256'];v=q/'media'/(sha+'.mp4');assert hashlib.sha256(v.read_bytes()).hexdigest()==sha;pr=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','json',str(v)]))
  for i in indices:
   actual=float(pr['frames'][i]['best_effort_timestamp_time'])+start;raw=subprocess.check_output(['ffmpeg','-threads','1','-v','error','-xerror','-i',str(v),'-vf',f'select=eq(n\\,{i})','-frames:v','1','-f','image2pipe','-vcodec','png','-']);im=Image.open(io.BytesIO(raw)).convert('RGB');imgs.append((label,i,im));allSamples.append({'case':cid,'version':label,'sourceCommit':bind['sourceCommit'],'videoSHA256':sha,'frameIndex':i,'actualDecodedTimestamp':actual,'pixelSHA256':hashlib.sha256(im.tobytes()).hexdigest()})
 w,h=imgs[0][2].size;sheet=Image.new('RGB',(w*len(indices),(h+24)*len(versions)));draw=ImageDraw.Draw(sheet)
 for j,(label,i,im)in enumerate(imgs):
  x=j%len(indices)*w;y=j//len(indices)*(h+24);sheet.paste(im,(x,y+24));draw.text((x+4,y+4),f'{cid} {label} frame{i}',fill='white')
 sheet.save(out/(cid+'.png'))
(out/'manifest.json').write_text(json.dumps({'samples':allSamples,'scope':'AI engineering visual samples from actual completed MP4s. Full safety/decode evidence separate. Neither independent human evaluation nor all-frame artistic verification.'},indent=2)+'\n');print('review sheets',len(selected),'actual frame samples',len(allSamples))
