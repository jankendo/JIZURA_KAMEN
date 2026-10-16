import sys,json,pathlib,subprocess,hashlib
q=pathlib.Path(sys.argv[1]);chunk=int(sys.argv[2]);out=pathlib.Path(sys.argv[3]);d=json.loads((q/'composition-recovery/final-fresh30-selected-artifacts.json').read_text());rows=sorted(d['artifacts'],key=lambda x:x['fixture'])[chunk::6];assert len(rows)==5
for a in rows:
 target=out/'inputs'/a['fixture'];subprocess.run([sys.executable,str(q/'tools/restore_canonical_artifact.py'),str(q),a['archive'],str(target),'--prefix','matrix/'+a['fixture']+'-v3'],check=True);p=target/'matrix'/(a['fixture']+'-v3-row.json');r=json.loads(p.read_text());assert r['sha256']==a['binding']['videoSHA256'] and r['provenance']['finalArtifactVerification']['binding']==a['binding'];(target/'matrix/results.json').write_text(json.dumps({'rows':[r]}))
(out/'fixtures.txt').write_text(''.join(x['fixture']+'\n'for x in rows))
