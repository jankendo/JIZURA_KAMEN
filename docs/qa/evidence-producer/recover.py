#!/usr/bin/env python3
"""Recover only an explicit reviewed inventory; verify Git path/blob + SHA-256."""
import argparse,base64,concurrent.futures,hashlib,json,pathlib,re,subprocess,time

def run(index,root,budget):
 index=json.loads(pathlib.Path(index).read_bytes());repo=index['repository'];commit=index['commit']
 assert re.fullmatch(r'[\w.-]+/[\w.-]+',repo) and re.fullmatch('[a-f0-9]{40}',commit)
 tree=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/git/trees/{commit}?recursive=1']))
 assert tree.get('truncated') is False,'Incomplete Git tree'
 entries={x['path']:x for x in tree['tree'] if x['type']=='blob'}
 root=pathlib.Path(root);root.mkdir(parents=True,exist_ok=True);root=root.resolve();pending=[];reused=0
 for row in index['files']:
  name=row['path'];assert not pathlib.PurePosixPath(name).is_absolute() and '\\' not in name and all(p not in ['.','..',''] for p in name.split('/'))
  t=entries[name];assert t['sha']==row['gitBlobSHA'] and t['size']==row['size'],'Immutable tree mismatch'
  file=root/name
  for ancestor in [file,*file.parents]:
   if ancestor==root:break
   assert not ancestor.is_symlink(),'Symlink rejected'
  if file.exists() and hashlib.sha256(file.read_bytes()).hexdigest()==row['sha256']:reused+=1;continue
  pending.append(row)
 total=sum(r['size'] for r in pending);assert total<=budget,'Recovery exceeds explicit byte budget'
 def get(r):
  obj=json.loads(subprocess.check_output(['gh','api',f"repos/{repo}/git/blobs/{r['gitBlobSHA']}"]))
  b=base64.b64decode(obj['content']);assert len(b)==r['size'] and hashlib.sha256(b).hexdigest()==r['sha256']
  assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==r['gitBlobSHA']
  f=root/r['path'];f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(b)
 start=time.monotonic()
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:list(ex.map(get,pending))
 print(json.dumps({'downloadedFiles':len(pending),'downloadedBytes':total,'reusedFiles':reused,'seconds':time.monotonic()-start}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('inventory');p.add_argument('root');p.add_argument('--max-bytes',type=int,default=64*1024*1024);a=p.parse_args();run(a.inventory,a.root,a.max_bytes)
