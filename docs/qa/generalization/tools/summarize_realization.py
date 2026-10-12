"""Separate music-direction observations from automatic readability-repair holds."""
import argparse,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('results',type=Path);p.add_argument('output',type=Path);args=p.parse_args()
records=[]
for row in json.loads(args.results.read_text())['rows']:
    artifact=row['provenance'].get('finalArtifactVerification',{})
    repairs=[d for d in (row['provenance'].get('automaticUnitSafety') or {}).get('decisions',[]) if d['adopted']]
    repaired=set()
    text={u['unitId']:u['text'] for u in artifact.get('inputContract',{}).get('unitTexts',[])}
    for unit in artifact.get('units',[]):
        for d in repairs:
            if d['line']==unit['line'] and d['start']<=unit['timeRange'][0]+1e-6 and d['end']>=unit['timeRange'][1]-1e-6 and text.get(unit['unitId'])==d['text']:
                repaired.add(unit['unitId'])
    music=[m for m in artifact.get('motionObservations',[]) if m.get('naturalSelection') and m['unitId'] not in repaired]
    observed=[m for m in music if m.get('intentObservation',{}).get('status')=='MEASURED']
    successes=[m for m in observed if m['intentObservation'].get('passed')]
    records.append({'fixture':row['fixture']['id'],'variant':row['variant'],'videoSHA256':row['sha256'],'binding':artifact.get('binding'),'rawAutomaticSummary':artifact.get('motionSummary'),'readabilityRepairUnitsExcludedFromMusicProof':sorted(repaired),'musicPopulation':len(music),'musicIntentMeasured':len(observed),'musicIntentSuccessful':len(successes),'musicMeasurableRate':len(observed)/len(music) if music else None,'musicRealizationRate':len(successes)/len(observed) if observed else None,'artisticStatus':'HUMAN_UNVERIFIED','limits':'Measured physical operator realization is separate from artistic merit; unknown semantic, target and timing observations remain unknown.'})
args.output.write_text(json.dumps({'policy':'Normal shipping safety repairs are legitimate, but their forced static holds are not musical-intent improvement proof. Raw export evidence is retained unchanged.','entries':records},ensure_ascii=False,indent=2)+'\n')
print(json.dumps([{k:r[k] for k in ['fixture','variant','musicPopulation','musicIntentMeasured','musicIntentSuccessful']}for r in records]))
