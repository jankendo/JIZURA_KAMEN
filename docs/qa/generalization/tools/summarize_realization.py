"""Report raw render contracts and conservative logical-unit musical realization separately."""
import argparse,json,collections
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('results',type=Path);p.add_argument('output',type=Path);args=p.parse_args();records=[]
for row in json.loads(args.results.read_text())['rows']:
 if row.get('status')!='PASS':
  records.append({'fixture':row['fixture']['id'],'variant':row['variant'],'status':'UNEXECUTED','error':row.get('error')});continue
 artifact=row['provenance'].get('finalArtifactVerification',{});repairs=[d for d in (row['provenance'].get('automaticUnitSafety') or {}).get('decisions',[]) if d['adopted']];repaired=set()
 text={u['unitId']:u['text'] for u in artifact.get('inputContract',{}).get('unitTexts',[])}
 for unit in artifact.get('units',[]):
  for d in repairs:
   if d['line']==unit['line'] and d['start']<unit['timeRange'][1] and d['end']>unit['timeRange'][0] and text.get(unit['unitId'])==d['text']:repaired.add(unit['unitId'])
 automatic=[m for m in artifact.get('motionObservations',[]) if m.get('naturalSelection')];music=[m for m in automatic if m['unitId'] not in repaired]
 def summary(items):
  groups=collections.defaultdict(list)
  for m in items:groups[m['unitId']].append(m)
  measured=[v for v in groups.values() if all(m.get('intentObservation',{}).get('status')=='MEASURED' for m in v)]
  successful=[v for v in measured if all(m['intentObservation'].get('passed') for m in v)]
  rawmeasured=[m for m in items if m.get('intentObservation',{}).get('status')=='MEASURED']
  return {'rawFragmentContracts':len(items),'rawMeasured':len(rawmeasured),'rawSuccessful':sum(bool(m['intentObservation'].get('passed')) for m in rawmeasured),'logicalUnitPopulation':len(groups),'logicalUnitsFullyMeasured':len(measured),'logicalUnitsFullyRealized':len(successful),'measurableRate':len(measured)/len(groups) if groups else None,'realizationRate':len(successful)/len(measured) if measured else None}
 records.append({'fixture':row['fixture']['id'],'variant':row['variant'],'videoSHA256':row['sha256'],'binding':artifact.get('binding'),'rawAutomaticSummary':artifact.get('motionSummary'),'readabilityRepairUnitsExcludedFromMusicProof':sorted(repaired),'allAutomatic':summary(automatic),'musicOnly':summary(music),'artisticStatus':'HUMAN_UNVERIFIED','limits':'All fragment contracts of a logical unit must be measured and realized before counting that unit; no fragment multiplicity credit. Physical operator realization does not certify aesthetic merit.'})
args.output.write_text(json.dumps({'policy':'Automatic safety repairs retained in allAutomatic; forced readability holds excluded from musicOnly. Unknown and unexecuted remain explicit. Raw export evidence unchanged.','entries':records},ensure_ascii=False,indent=2)+'\n');print(json.dumps({'rows':len(records)}))
