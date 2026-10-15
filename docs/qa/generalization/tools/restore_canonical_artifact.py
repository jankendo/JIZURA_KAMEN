"""Restore selected immutable archive members, verifying decompressed SHA256."""
import argparse,gzip,hashlib,json
from pathlib import Path,PurePosixPath
p=argparse.ArgumentParser();p.add_argument('qa_root',type=Path);p.add_argument('artifact');p.add_argument('output',type=Path);p.add_argument('--prefix',default='matrix/');a=p.parse_args();manifest=json.loads((a.qa_root/'composition-recovery'/a.artifact/'archive-manifest.json').read_text());count=0
for m in manifest['files']:
 rel=PurePosixPath(m['member'])
 if not str(rel).startswith(a.prefix):continue
 assert not rel.is_absolute() and '..' not in rel.parts
 stored=a.qa_root/m['preserved'];raw=stored.read_bytes();raw=gzip.decompress(raw) if stored.suffix=='.gz' else raw
 assert len(raw)==m['bytes'] and hashlib.sha256(raw).hexdigest()==m['SHA256'], 'CANONICAL_MEMBER_SHA_MISMATCH'
 out=a.output/rel;out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(raw);count+=1
assert count>0,'NO_ARTIFACT_MEMBERS_RESTORED';print(json.dumps({'artifact':a.artifact,'membersRestored':count,'sha256':'ALL_PASS','prefix':a.prefix}))
