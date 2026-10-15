"""Historical entry-phase actual pixel evidence; original UNMEASURED status stays unchanged."""
import pathlib,json,gzip,collections,sys,ijson
root=pathlib.Path(__file__).resolve().parents[1]/'composition-recovery';d=json.load(open(root/'effects5c92-unmeasured-primary-population-breakdown.json'));wanted={x['unitId']:x for x in d['unmeasured'] if x['failureReason']=='NO_MEASURED_PARTIAL_REVEAL_GLYPHS'};out=[]
for part in ['dev-a','dev-b','dev-c','holdout-a','holdout-b','holdout-c']:
 with gzip.open(root/('final5c92-'+part)/'matrix/results.json.gz','rb') as f:
  for v in ijson.items(f,'rows.item.provenance.finalArtifactVerification',use_float=True):
   for unitId,spec in wanted.items():
    if not any(u['unitId']==unitId for u in v['units']):continue
    frames=[f for f in v['frames'] if f['unitId']==unitId and spec['fragmentRange'][0]<=f['actualDecodedTimestamp']<spec['fragmentRange'][1]];entries=[]
    for a in [x for x in frames if x['phase']=='entry']:
     gs=a.get('glyphEvidence') or [];count=collections.Counter();details=[]
     for g in gs:
      expected=g.get('expectedInkPixels',0);native=g.get('nativeInkPixels',0);decoded=g.get('decodedInkPixels',0);neg=g.get('backgroundSamplePixels',0);agreement=g.get('decodedBackgroundAgreement');category='UNRESOLVED'
      if native==0 and expected==0 and decoded==0 and neg>=3 and agreement is not None and agreement>=.95:category='EXPECTED_ZERO_NATIVE_INK_WITH_MATCHED_DECODED_NEGATIVE_CONTROLS'
      elif expected>=3 and g['status']=='FAILED':category='ACTUAL_GLYPH_EVIDENCE_FAILED'
      elif native>0 and g['status']=='UNMEASURED':category='VISIBLE_NATIVE_INK_BUT_INSUFFICIENT_CONTROL'
      elif g['status']=='MEASURED':category='VISIBLE_GLYPH_MEASURED'
      count[category]+=1;details.append({k:g.get(k) for k in ['index','character','row','status','reason','expectedInkPixels','nativeInkPixels','decodedInkPixels','backgroundSamplePixels','decodedBackgroundAgreement']})
     entries.append({'requestedTimestamp':a['requestedTimestamp'],'actualDecodedTimestamp':a['actualDecodedTimestamp'],'elapsedFromUnitStart':a['actualDecodedTimestamp']-spec['fragmentRange'][0],'entryDuration':spec['inDur'],'entryProgress':(a['actualDecodedTimestamp']-spec['fragmentRange'][0])/spec['inDur'] if spec['inDur'] else None,'nativeTexts':a['nativeTexts'],'nativeComplete':a['nativeComplete'],'pixelPresence':a['pixelPresence'],'nativeInkPixels':a['nativeInkPixels'],'decodedInkPixels':a['decodedInkPixels'],'expectedInkPixels':a['expectedInkPixels'],'glyphObservationClasses':dict(count),'glyphs':details,'noGlyphRegionEvidence':not bool(gs)})
    hold=[f for f in frames if f['phase']=='hold'];out.append({'originalUnmeasuredRecord':spec,'binding':v['binding'],'evidenceId':v['evidenceId'],'entryFrames':entries,'entryFrameCount':len(entries),'holdFrameCount':len(hold),'firstHold':{k:hold[0].get(k) for k in ['actualDecodedTimestamp','nativeComplete','pixelPresence','nativeInkPixels','decodedInkPixels']} if hold else None,'explicitZeroEntryInterval':spec['inDur']==0,'interpretation':'ZERO_DURATION_ENTRY_NO_EXECUTABLE_REVEAL_INTERVAL' if spec['inDur']==0 else 'ENTRY_NATIVE_VISIBILITY_AND_DECODED_NEGATIVE_CONTROLS_REPORTED_SEPARATELY','originalStatus':'UNMEASURED','statusPolicy':'No old status changed. Expected-zero candidate observations are separate from visible-glyph realization; missing region evidence remains UNMEASURED.'})
 print(part,len(out),flush=True)
assert len(out)==9
p=pathlib.Path(sys.argv[1]);p.write_text(json.dumps({'schema':1,'records':out,'criteria':'Descriptive existing <=0 ink counts and existing glyph negative-control sample>=3/agreement>=.95; no new quality threshold or old status overwrite.','sourceContracts':['src/05_anim.js:119-130 wipe clip edge follows existing exponential entry progress','src/11zzzzzzzzzaa_final_artifact_v5.js reveal currently requires some MEASURED entry glyph; fully absent intended ink cannot meet that condition'],'human':'HUMAN_UNVERIFIED'},ensure_ascii=False,indent=2)+'\n');print([(x['originalUnmeasuredRecord']['fixture'],x['entryFrameCount'],[f['glyphObservationClasses'] for f in x['entryFrames']]) for x in out])
