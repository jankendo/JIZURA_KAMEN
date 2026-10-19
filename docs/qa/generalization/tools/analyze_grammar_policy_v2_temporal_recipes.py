"""Isolated selected recipe contribution, never a certificate for each constituent or aesthetics."""
import json,gzip,pathlib,hashlib,math,collections
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';S='d04c734bc5eb0c0c427a42a196cae3a507b89506'
def read(p):return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def checked(archive,member):
 m=read(R/archive/'archive-manifest.json');e=next(x for x in m['files']if x['member']==member);b=(Q/e['preserved']).read_bytes();b=gzip.decompress(b)if e['preserved'].endswith('.gz')else b;assert hashlib.sha256(b).hexdigest()==e['SHA256'];return json.loads(b),e['SHA256']
def resolve_recipe_target(units,line,start,end):
 matches=[(u,f)for u in units for f in u['fragments']if u['line']==line and abs(f['from']-start)<1e-7 and abs(f['to']-end)<1e-7]
 assert len(matches)==1,'AMBIGUOUS_OR_MISSING_INTERNAL_UNIT'
 return matches[0]
def main():
 rows=[]
 for key in ['legacy-intro','square','quiet']:
  archive='grammar-policy-v2-temporal-recipe-'+key;r,rawsha=checked(archive,'controls/effect-counterfactual-report.json');assert r['build']['sourceCommit']==S and r['selectedOperator']=='grammarTemporalRecipe';assert r['fullNativeIdentity']and r['nativeONRepeatIdentical']and r['adoptedMovieReproduced'];assert all(m['fullDecode']=='PASS'for m in r['movies'])
  modes={m['mode']:m['modeFinalArtifactVerification']for m in r['movies']}
  for m in r['movies']:assert modes[m['mode']]['binding']['videoSHA256']==m['videoSHA256']and modes[m['mode']]['binding']['planHash']==r['planHash']
  # Exact line AND fragment range bijection. Same-line fragments may not share target evidence.
  targets={}
  for t in r['parameterTrace']:
   if t.get('mode')=='ON'and t.get('kind')=='isolatedGrammarTemporalRecipe'and t.get('pass')=='main':targets[(t['cutIndex'],t['line'],*t['range'])]=t
  for (ordinal,line,start,end),t in targets.items():
   unit,f=resolve_recipe_target(modes['ON']['units'],line,start,end);points=[];missing=[];phases=collections.Counter()
   maps={mode:{(x['unitId'],x['actualDecodedTimestamp']):x for x in v['frames']}for mode,v in modes.items()}
   for (uid,time),a in maps['ON'].items():
    if uid!=unit['unitId']or a['fragmentId']!=f['id']:continue
    b=maps['OFF'].get((uid,time));c=maps['ON_REPEAT'].get((uid,time))
    if not b or not c:missing.append({'time':time,'reason':'CONTROL_CLOCK_ABSENT'});continue
    phases[a['phase']]+=1
    for g in a.get('glyphEvidence',[]):
     def match(frame):return next((h for h in frame.get('glyphEvidence',[])if(h['index'],h['row'],h['character'])==(g['index'],g['row'],g['character'])),None)
     h,j=match(b),match(c)
     if not h or not j or not all(z.get('nativeCentroid')and z.get('decodedCentroid')for z in [g,h,j]):missing.append({'time':time,'index':g['index'],'reason':'REGISTERED_GLYPH_ABSENT'});continue
     expected=[x-y for x,y in zip(g['nativeCentroid'],h['nativeCentroid'])];observed=[x-y for x,y in zip(g['decodedCentroid'],h['decodedCentroid'])];signal=math.hypot(*expected);error=math.dist(expected,observed);noise=math.dist(g['decodedCentroid'],j['decodedCentroid']);tol=max(.5,.1*signal)
     points.append({'actualDecodedTimestamp':time,'phase':a['phase'],'glyphIndex':g['index'],'row':g['row'],'expectedONminusOFF':expected,'observedONminusOFF':observed,'expectedPixels':signal,'errorPixels':error,'repeatErrorPixels':noise,'matched':error<=tol and noise<=tol})
   pos=[x for x in points if x['expectedPixels']>=.5];frames=len({x['actualDecodedTimestamp']for x in pos});agreement=sum(x['matched']for x in pos)/len(pos)if pos else None
   status='UNMEASURED'if frames<3 or missing else'VERIFIED_RECIPE_CONTRIBUTION'if agreement>=.9 else'FAILED'
   rows.append({'caseId':r['caseId'],'unitId':unit['unitId'],'sourceUnitId':unit['sourceUnitId'],'fragmentId':f['id'],'finalOrdinal':f['index'],'reportedCutIndexNotFinalOrdinal':ordinal,'targetBindingMethod':'Unique line plus complete source fragment range; raw cut.index explicitly differs from final ordinal when present.','line':line,'range':[start,end],'role':t['role'],'motionPrinciple':t['state']['motionPrinciple'],'grammarMode':t['grammarMode'],'originalVideoSHA256':r['originalVideoSHA256'],'planHash':r['planHash'],'inputHash':r['inputSnapshot']['inputHash'],'outputProfile':r['adoptedNativeProof']['profile'],'rawSHA256':rawsha,'controlVideos':[{'mode':m['mode'],'videoSHA256':m['videoSHA256'],'fullDecode':m['fullDecode']}for m in r['movies']],'positivePoints':len(pos),'matchedPoints':sum(x['matched']for x in pos),'measuredFrames':frames,'agreement':agreement,'phaseFrames':dict(phases),'missing':missing,'status':status,'reason':None if status!='UNMEASURED'else'INSUFFICIENT_ABOVE_HALF_PIXEL_SIGNAL_OR_MISSING_GLYPH','semanticIntendedMotion':'UNVERIFIED_SEPARATE_ROLE_MODEL_REQUIRED','points':points})
 report={'schema':1,'sourceCommit':S,'criteria':'Preregistered >=.5pixel signal, >=3actual decoded frame clocks, error/repeat <=max(.5,.1*expected), agreement>=.9. No score/threshold change.','scope':'Only whole selected temporal charFn contribution. Not separate HOLD/entry/camera attribution, not artistic grade, and native-predicted geometry is not OCR. Role-specific semantic success remains separate.','human':'HUMAN_UNVERIFIED','rows':rows,'statuses':dict(collections.Counter(x['status']for x in rows))}
 b=json.dumps(report,ensure_ascii=False,separators=(',',':')).encode();(R/'grammar-policy-v2-isolated-temporal-recipe-contributions.json.gz').write_bytes(gzip.compress(b,mtime=0));summary={k:v for k,v in report.items()if k!='rows'};summary['rows']=[{k:v for k,v in x.items()if k!='points'}for x in rows];(R/'grammar-policy-v2-isolated-temporal-recipe-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'statuses':report['statuses'],'rows':[(x['caseId'],x['role'],x['positivePoints'],x['measuredFrames'],x['status'])for x in rows]}))
if __name__=='__main__':main()
