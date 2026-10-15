"""Restore exact original Git objects; credentials stay inside the Actions runner."""
import os,pathlib,json,hashlib,urllib.request,urllib.parse,zipfile,io,gzip,subprocess
root=pathlib.Path(__file__).parent;spec=json.loads((root/'recipe.json').read_text());repo=os.environ['GITHUB_REPOSITORY'];token=os.environ['GH_TOKEN'];temp=pathlib.Path(os.environ['RUNNER_TEMP'])/'kamen-restore';temp.mkdir(exist_ok=True)
class SafeRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  new=super().redirect_request(req,fp,code,msg,headers,newurl)
  if new and urllib.parse.urlparse(newurl).hostname!=urllib.parse.urlparse(req.full_url).hostname:new.remove_header('Authorization')
  return new
opener=urllib.request.build_opener(SafeRedirect())
def git(*args,input=None):return subprocess.check_output(['git',*args],input=input)
def sha(b):return hashlib.sha256(b).hexdigest()
git('fetch','--no-tags','--depth=1','--filter=blob:none','origin',spec['expectedRemoteBase'])
archives={}
for aid,expected in spec['archiveSources'].items():
 p=temp/(aid+'.zip');req=urllib.request.Request(f'https://api.github.com/repos/{repo}/actions/artifacts/{aid}/zip',headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'})
 h=hashlib.sha256()
 with opener.open(req,timeout=180) as r,p.open('wb') as f:
  for b in iter(lambda:r.read(1048576),b''):h.update(b);f.write(b)
 assert h.hexdigest()==expected['SHA256'],'ARTIFACT_ARCHIVE_HASH_MISMATCH';archives[int(aid)]=p
 print('Immutable artifact verified',aid,flush=True)
cacheKey=None;cached=None;restored=[]
for item in spec['blobs']:
 key=(item['artifactId'],item['member'])
 if key!=cacheKey:
  with zipfile.ZipFile(archives[key[0]]) as z:cached=z.read(key[1])
  assert len(cached)==item['memberBytes'] and sha(cached)==item['memberSHA256'],'ORIGINAL_MEMBER_HASH_MISMATCH';cacheKey=key
 if item['mode']=='RAW_CHUNK':
  data=cached[item['chunkOffset']:item['chunkOffset']+item['chunkBytes']];assert len(data)==item['chunkBytes'] and sha(data)==item['chunkSHA256']
 elif item['mode']=='GZIP':
  out=io.BytesIO()
  with gzip.GzipFile(filename=item['gzipFilename'],mode='wb',mtime=0,fileobj=out) as f:f.write(cached)
  data=out.getvalue()
 else:data=cached
 header=('blob '+str(len(data))+'\0').encode();assert hashlib.sha1(header+data).hexdigest()==item['gitBlobSHA1'],'RECONSTRUCTED_GIT_BLOB_DIFFERS: '+item['path']
 assert git('hash-object','-w','--stdin',input=data).decode().strip()==item['gitBlobSHA1'];restored.append({'path':item['path'],'gitBlobSHA1':item['gitBlobSHA1']})
pack=(root/'metadata.pack').read_bytes();assert len(pack)==spec['packBytes'] and sha(pack)==spec['packSHA256'];git('index-pack','--stdin',input=pack)
checks=git('cat-file','--batch-check',input=('\n'.join(spec['objectInventory'])+'\n').encode()).decode().splitlines()
assert len(checks)==spec['gitObjectsTotal'] and all(' missing' not in line for line in checks),'MISSING_NEW_GIT_OBJECT'
assert [line.split()[0] for line in checks]==spec['objectInventory'],'NEW_OBJECT_INVENTORY_DIFFERS'
head=spec['protectedLocalHead'];assert git('rev-parse',head).decode().strip()==head;subprocess.run(['git','merge-base','--is-ancestor',spec['expectedRemoteBase'],head],check=True);subprocess.run(['git','fsck','--connectivity-only',head],check=True)
remote=git('ls-remote','origin','refs/heads/'+spec['targetBranch']).decode().split()[0];assert remote in [spec['expectedRemoteBase'],head],'REMOTE_MOVED_STOP_WITHOUT_FORCE'
if remote!=head:subprocess.run(['git','-c','pack.threads=2','push','origin',head+':refs/heads/'+spec['targetBranch']],check=True)
assert git('ls-remote','origin','refs/heads/'+spec['targetBranch']).decode().split()[0]==head
(root/'result.json').write_text(json.dumps({'status':'PASS','protectedLocalHead':head,'normalFastForwardPush':True,'restoredBlobs':restored,'sourcePRAndMainChanged':False},indent=2)+'\n');print('Exact local history protected by normal fast-forward push',head)
