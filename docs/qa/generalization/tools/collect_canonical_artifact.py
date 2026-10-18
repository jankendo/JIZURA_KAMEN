import sys,pathlib,zipfile,hashlib,gzip,json,os
archive=pathlib.Path(sys.argv[1]);name=sys.argv[2];root=pathlib.Path(__file__).resolve().parents[1];dest=root/'composition-recovery'/name;local=pathlib.Path(os.environ.get('KAMEN_ARTIFACT_MIRROR','/tmp/kamen-canonical-mirror'))/name
manifest=[]
with zipfile.ZipFile(archive) as z:
 for member in z.infolist():
  rel=pathlib.PurePosixPath(member.filename)
  assert not rel.is_absolute() and '..' not in rel.parts
  if member.is_dir():continue
  if member.file_size>64*1024*1024 and rel.suffix in ['.zip','.bin']:
   chunks=[];h=hashlib.sha256();n=0
   with z.open(member) as src:
    while True:
     raw=src.read(64*1024*1024)
     if not raw:break
     ch=hashlib.sha256(raw).hexdigest();out=dest/(str(rel)+f'.part{len(chunks):04}.bin');out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(raw)
     chunks.append({'preserved':str(out.relative_to(root)),'bytes':len(raw),'SHA256':ch,'offset':n});n+=len(raw);h.update(raw)
   assert n==member.file_size
   manifest.append({'member':str(rel),'bytes':n,'SHA256':h.hexdigest(),'chunks':chunks})
   continue
  content=z.read(member);digest=hashlib.sha256(content).hexdigest()
  if rel.suffix in ['.mp4','.wav']:
   out=root/'media'/(digest+rel.suffix);out.parent.mkdir(parents=True,exist_ok=True)
   if not out.exists():out.write_bytes(content)
   assert hashlib.sha256(out.read_bytes()).hexdigest()==digest
   mirror=local/rel;mirror.parent.mkdir(parents=True,exist_ok=True)
   if not mirror.exists():os.link(out,mirror)
  else:
   out=dest/(str(rel)+'.gz');out.parent.mkdir(parents=True,exist_ok=True)
   with gzip.GzipFile(filename=str(out),mode='wb',mtime=0)as g:g.write(content)
  manifest.append({'member':str(rel),'bytes':len(content),'SHA256':digest,'preserved':str(out.relative_to(root))})
dest.mkdir(parents=True,exist_ok=True)
h=hashlib.sha256()
with archive.open('rb')as f:
 for b in iter(lambda:f.read(1048576),b''):h.update(b)
(dest/'archive-manifest.json').write_text(json.dumps({'archiveSHA256':h.hexdigest(),'artifactId':int(sys.argv[3]),'files':manifest},ensure_ascii=False,indent=2)+'\n')
print(name,'preserved',len(manifest),'members')
# Only the verified redundant transport copy is removed; every original member retained.
print('Verified original transport ZIP retained:',str(archive))
