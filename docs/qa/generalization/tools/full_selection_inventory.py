"""Inventory every selected renderer component; do not equate unit-motion proof with whole-engine coverage."""
import json,argparse,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('results',type=Path);p.add_argument('output',type=Path);a=p.parse_args();records=[]
for r in json.loads(a.results.read_text())['rows']:
 if r.get('status')!='PASS':continue
 ref=json.loads((a.results.parent/r['referenceInputs']['file']).read_text());plan=ref['plan'];artifact=r['provenance']['finalArtifactVerification'];binding=artifact['binding'];start,end=binding['outputProfile']['range'];selections=[]
 for i,c in enumerate(plan['cuts']):
  if c['start']>=end or c['end']<=start:continue
  manual=bool(c.get('locked') or plan.get('directionOverrides7',{}).get(str(c['line'])) or c.get('semanticIntent') or (c.get('assetScene')or{}).get('locked'))
  for group in ['layout','enter','hold','exit','cam','trans','bg','treat']:
   if c.get(group):selections.append({'cutIndex':i,'line':c['line'],'group':group,'selectedId':c[group],'timeRange':[max(start,c['start']),min(end,c['end'])],'natural':ref['project'].get('autoDirection') is True and not manual,'isolatedEncodedRealization':'UNMEASURED','reason':'Component survival is not isolated by composite glyph-motion observations'})
  for d in c.get('decor',[]):selections.append({'cutIndex':i,'group':'decor','selectedId':d.get('id'),'timeRange':[max(start,c['start']),min(end,c['end'])],'natural':ref['project'].get('autoDirection') is True and not manual,'isolatedEncodedRealization':'UNMEASURED','reason':'Decorative elements excluded from primary glyph certification'})
  if c.get('virtualShot'):selections.append({'cutIndex':i,'group':'virtualShot','selected':c['virtualShot'],'natural':ref['project'].get('autoDirection') is True and not manual,'isolatedEncodedRealization':'UNMEASURED'})
 for group in ['events','hypeTimeline']:
  for i,e in enumerate(plan.get(group,[])):
   if e.get('t',0)>=end or e.get('t',0)+e.get('dur',0)<=start:continue
   selections.append({'group':group,'index':i,'selectedId':e.get('type'),'timeRange':[e.get('t'),e.get('t',0)+e.get('dur',0)],'natural':ref['project'].get('autoDirection') is True and not e.get('manual') and not e.get('directorIntent'),'isolatedEncodedRealization':'UNMEASURED','reason':'No independent event-target correspondence in the current full-resolution glyph audit'})
 record={'fixture':r['fixture']['id'],'variant':r['variant'],'binding':binding,'rawArtifactEvidenceId':artifact['evidenceId'],'scope':'All final-plan renderer selections in export interval. This denominator has a different granularity from composite primary-lyric intents; do not pool success rates.','selectedComponents':len(selections),'automaticComponents':sum(s['natural'] for s in selections),'selections':selections,'primaryCompositeMotionSummary':artifact.get('motionSummary'),'wholeEngineIntentRealizationRate':None,'wholeEngineRateStatus':'UNMEASURED','limits':'Actual MP4 remains hash-bound. Native catalogue dispatch and glyph composite agreement do not independently certify all camera/background/FX intentions or aesthetic merit.'};record['manifestSHA256']=hashlib.sha256(json.dumps(record,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest();records.append(record)
a.output.write_text(json.dumps({'entries':records},ensure_ascii=False,indent=2)+'\n');print(json.dumps({'rows':len(records),'automaticRenderingSelections':sum(r['automaticComponents'] for r in records)}))
