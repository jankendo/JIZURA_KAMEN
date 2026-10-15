import json,gzip,pathlib,hashlib,datetime,urllib.request,statistics
root=pathlib.Path('/workspace/kamen-next-evidence/docs/qa/generalization/composition-recovery')
def load(p):
 return json.load(gzip.open(p,'rt')) if str(p).endswith('.gz') else json.loads(p.read_text())
def compact(r):
 f=r.get('provenance',{}).get('finalArtifactVerification',{}); b=f.get('binding',{}); us=f.get('units',[])
 return {'fixture':r['fixture']['id'],'variant':r['variant'],'status':r['status'],'videoSHA256':r.get('sha256'),'sourceCommit':f.get('verifierIdentity',{}).get('sourceCommit'),'binding':b,'metrics':r.get('decoded',{}).get('metrics',{}),'FAV':{'status':f.get('status'),'unitCount':len(us),'minimumHoldContrast':min((u['minimumContrast'] for u in us if isinstance(u.get('minimumContrast'),(int,float))),default=None),'failures':f.get('failures'),'unavailable':f.get('unavailable'),'motion':f.get('motionSummary')},'referenceAudioSHA256':r.get('referenceInputs',{}).get('audioSHA256'),'inputPCMHash':r.get('sourceInvariant',{}).get('pcmHash'),'errors':r.get('errors')}
report={'generatedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Partial observation only. No QUALITY_GO certification. No current fixed30 summary until all30 complete. Raw metrics are not artistic scores.','runs':[],'artifacts':[],'comparisons':[]}
for run in [38675390891,38675427984,38675660190]:
 base='https://api.github.com/repos/jankendo/JIZURA_KAMEN/actions/runs/'+str(run);d=json.load(urllib.request.urlopen(base));report['runs'].append({k:d[k] for k in ['id','head_sha','status','conclusion','html_url']})
for n in [p.name for p in sorted(root.glob('*5c92-*')) if (p/'archive-manifest.json').exists()]:
 p=root/n; rows=[]
 for part in ['matrix/results.json.gz','previous/results.json.gz']:
  if (p/part).exists():
   for r in load(p/part)['rows']:
    c=compact(r);c['partition']=part;rows.append(c)
 decodes=[]
 for part in ['strict-decode.json.gz','previous-strict-decode.json.gz']:
  if (p/part).exists():decodes.append({'partition':part,'data':load(p/part)})
 report['artifacts'].append({'name':n,'manifest':str((p/'archive-manifest.json').relative_to(root)),'rows':rows,'strictDecode':decodes})
 current=next((x for x in rows if x['partition'].startswith('matrix') and x['variant']=='v3'),None)
 for other in rows:
  if other is current:continue
  equal={k:current[k]==other[k] for k in ['referenceAudioSHA256','inputPCMHash']}
  equal.update({'inputHash':current['binding'].get('inputHash')==other['binding'].get('inputHash'),'outputProfile':current['binding'].get('outputProfile')==other['binding'].get('outputProfile')})
  report['comparisons'].append({'fixture':current['fixture'],'against':other['sourceCommit'],'conditionsEqual':equal,'typography':[other['metrics'].get('typographyDiversity'),current['metrics'].get('typographyDiversity')],'foreground':[other['metrics'].get('lyricForegroundNovelty'),current['metrics'].get('lyricForegroundNovelty')],'interpretation':'Metrics unchanged vs previous is not evidence of new improvement. Lower metrics vs main require real-frame diagnosis; safe HOLD does not establish creative improvement.'})
out=root/'live5c92-independent-partial-review.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
md=['# Current 5c92 independent partial review','',report['scope'],'','| Fixture | Compared source | Typography old → current | Foreground old → current | Conditions match |','|---|---|---:|---:|---|']
for c in report['comparisons']:md.append('| '+c['fixture']+' | '+str(c['against'])[:8]+' | '+' → '.join(map(str,c['typography']))+' | '+' → '.join(map(str,c['foreground']))+' | '+str(all(c['conditionsEqual'].values()))+' |')
md+=['','No final30 lower-tail statistic is computed from an incomplete subset. Full FAV bindings, raw unavailable fields, per-source decode manifests and partial run status are preserved in the paired JSON.','Human evaluation: HUMAN_UNVERIFIED.']
(root/'live5c92-independent-partial-review.md').write_text('\n'.join(md)+'\n')
print(json.dumps({'files':[str(out)],'comparisons':report['comparisons']},ensure_ascii=False))
