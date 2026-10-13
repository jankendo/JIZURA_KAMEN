"""Recover retained stage evidence; never infer missing candidate histories."""
import argparse,glob,hashlib,json,pathlib
ap=argparse.ArgumentParser();ap.add_argument('artifacts');ap.add_argument('output');args=ap.parse_args();rows=[]
for result in sorted(glob.glob(args.artifacts+'/actions-final-b5a46b7-*/matrix/results.json')):
 folder=pathlib.Path(result).parent
 for row in json.loads(pathlib.Path(result).read_text())['rows']:
  if row.get('status')!='PASS':continue
  reference=folder/row['referenceInputs']['file'];raw=reference.read_bytes()
  assert hashlib.sha256(raw).hexdigest()==row['referenceInputs']['sha256']
  p=json.loads(raw)['plan'];s=p.get('artDirection',{}).get('registrySelection') or {};search=(p.get('musicalPhoto') or {}).get('cinema',{}).get('architectureSearch') or {};legacy=search.get('legacyFinalist') or {};binding=row['provenance']['finalArtifactVerification']['binding'];assert binding['videoSHA256']==row['sha256']
  def cut(c):return {k:c.get(k) for k in ['index','line','start','end','layout','styleKey','enter','hold','exit','cam','bg','trans','treat','grammar']}|{'fontId':c.get('params',{}).get('font'),'anchor':c.get('params',{}).get('photoAnchor'),'readabilityRepair':c.get('params',{}).get('cinemaReadabilityRepair')}
  units=[]
  for line in p.get('lines',[]):
   idx=line['index'];entry=s.get('entries',{}).get(str(idx)) or {};generated=[]
   for candidate in s.get('layoutComparisons',[]):
    probes=[x for x in candidate.get('probes',[]) if x.get('line')==idx]
    if probes:generated.append({'layout':candidate['id'],'status':candidate.get('status'),'probes':probes})
   units.append({'line':idx,'sourceText':line['text'],'stages':{'candidateGeneration':{'status':'PARTIAL_RETAINED_PROBES' if generated else 'UNMEASURED','candidates':generated,'limitation':'Representative probes only. Per-phrase rejected candidates and ranked top-six history were not retained.'},'localSelection':entry,'globalStoryboard':[x for x in (s.get('globalStoryboard') or {}).get('decisions',[]) if x.get('line')==idx],'storyDirectorSnapshot':[cut(c) for c in p.get('registryMeasuredCuts',[]) if c.get('line')==idx],'localRepair':{'status':'PARTIAL_RETAINED_SEARCH','compositionRoot':legacy.get('compositionRoot'),'accepted':legacy.get('accepted'),'components':[x for x in legacy.get('components',[]) if x.get('line')==idx]},'finalRendererConfiguration':[cut(c) for c in p['cuts'] if c.get('line')==idx],'encodedMP4':{'status':'BOUND_ARTIFACT_NOT_INDIVIDUAL_EFFECT_PROOF','videoSHA256':row['sha256'],'finalArtifactStatus':row['provenance']['finalArtifactVerification']['status'],'actualDecodedTimestampStatus':'See original finalArtifactVerification units; not inferred from cut start'}}})
  rows.append({'case':row['fixture']['id'],'variant':row['variant'],'binding':binding,'referenceSHA256':hashlib.sha256(raw).hexdigest(),'fontAvailability':'See same-condition observer font evidence; font ID alone is not loaded-face proof','selectedCandidate':search.get('selectedCandidate'),'hybridRoot':legacy.get('compositionRoot'),'hybridAccepted':legacy.get('accepted'),'hybridProposals':[{k:x.get(k) for k in ['root','legacyProtected','incumbentProtected','creativeProtected']} for x in legacy.get('proposals',[])],'units':units})
out=pathlib.Path(args.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps({'schema':1,'source':'Retained frozen plans and bound completed MP4 provenance, no re-encode','causality':'Configuration transitions; isolated ablations still required','rows':rows},ensure_ascii=False,indent=2)+'\n');print(json.dumps({'rows':len(rows),'currentAcceptedHybrids':sum(r['variant']=='v3' and r['hybridAccepted'] is True for r in rows),'output':str(out)}))
