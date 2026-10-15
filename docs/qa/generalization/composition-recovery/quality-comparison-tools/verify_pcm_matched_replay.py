"""Verify comparison conditions; never inject a historical PCM/snapshot value."""
import pathlib,json,sys,re
root=pathlib.Path(sys.argv[1]);rows=[]
for name in ['matrix','previous']:
 p=root/name/'results.json'
 if not p.exists():continue
 d=json.loads(p.read_text())
 for r in d['rows']:
  f=r.get('provenance',{}).get('finalArtifactVerification',{});b=f.get('binding',{})
  rows.append({'fixture':r['fixture'],'variant':r['variant'],'sourceCommit':b.get('sourceCommit'),'status':r['status'],'input':r.get('input'),'audioWAVSHA256':r.get('referenceInputs',{}).get('audioSHA256'),'pcmHash':r.get('sourceInvariant',{}).get('pcmHash'),'outputProfile':b.get('outputProfile'),'videoSHA256':r.get('sha256')})
 del d
sources=sys.argv[2:] or ['2e7ed477f88028dbb63aa609e8a11b4052ea8c00','5e14682249ce690337874214f2ec76fc8e68fa26','5c92e27e6216962d09ec73927fd0df6ce50d0560']
assert len(sources)>=2 and len(set(sources))==len(sources) and all(re.fullmatch('[0-9a-f]{40}',s) for s in sources),'INVALID_EXPECTED_SOURCE_POPULATION'
checks={('threeCompletedSources' if len(sources)==3 else 'completeExpectedSources'):len(rows)==len(sources) and all(sum(r['sourceCommit']==source and r['status']=='PASS' for r in rows)==1 for source in sources)}
for field in ['fixture','input','audioWAVSHA256','pcmHash','outputProfile']:
 vals=[r[field] for r in rows];checks[field]=len(vals)==len(sources) and all(v is not None for v in vals) and all(v==vals[0] for v in vals[1:])
status='MATCHED' if all(checks.values()) else 'CONFOUNDED_OR_INCOMPLETE';(root/'pcm-correspondence.json').write_text(json.dumps({'scope':'Comparison validity only, not QUALITY_GO or artistic certification','status':status,'checks':checks,'rows':rows},ensure_ascii=False,indent=2)+'\n');print(status,checks)
if status!='MATCHED':raise SystemExit(1)
