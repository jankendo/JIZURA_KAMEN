"""Restore immutable archive members, verifying every raw chunk and whole SHA256."""
import argparse,gzip,hashlib,json
from pathlib import Path,PurePosixPath

def safe(root,rel):
 p=PurePosixPath(rel)
 assert not p.is_absolute() and '..' not in p.parts,'UNSAFE_MANIFEST_PATH'
 return root/p

def restore(root,manifest,output,prefix='matrix/'):
 count=0
 for m in manifest['files']:
  if not m['member'].startswith(prefix):continue
  out=safe(output,m['member']);out.parent.mkdir(parents=True,exist_ok=True)
  temporary=out.with_name(out.name+'.restoring');h=hashlib.sha256();n=0
  try:
   with temporary.open('wb') as dst:
    if 'chunks' in m:
     for c in m['chunks']:
      assert c['offset']==n,'CANONICAL_CHUNK_OFFSET_MISMATCH'
      raw=safe(root,c['preserved']).read_bytes()
      assert len(raw)==c['bytes'] and hashlib.sha256(raw).hexdigest()==c['SHA256'],'CANONICAL_CHUNK_SHA_MISMATCH'
      dst.write(raw);h.update(raw);n+=len(raw)
    else:
     stored=safe(root,m['preserved'])
     with (gzip.open(stored,'rb') if stored.suffix=='.gz' else stored.open('rb')) as src:
      for raw in iter(lambda:src.read(1048576),b''):
       dst.write(raw);h.update(raw);n+=len(raw)
   assert n==m['bytes'] and h.hexdigest()==m['SHA256'],'CANONICAL_MEMBER_SHA_MISMATCH'
   temporary.replace(out);count+=1
  finally:
   if temporary.exists():temporary.unlink()
 assert count>0,'NO_ARTIFACT_MEMBERS_RESTORED'
 return count

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('qa_root',type=Path);p.add_argument('artifact');p.add_argument('output',type=Path);p.add_argument('--prefix',default='matrix/');a=p.parse_args()
 manifest=json.loads(safe(a.qa_root,'composition-recovery/'+a.artifact+'/archive-manifest.json').read_text());count=restore(a.qa_root,manifest,a.output,a.prefix)
 print(json.dumps({'artifact':a.artifact,'membersRestored':count,'sha256':'ALL_PASS','prefix':a.prefix}))
