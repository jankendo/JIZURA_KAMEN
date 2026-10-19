"""Recover the existing preliminary ranks without changing the selector or seeds."""
import pathlib,json,gzip,hashlib,subprocess,io,ijson,collections,math
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';O=R/'release-recovery-20261019'
coverage=json.load(open(R/'grammar-policy-v2-photo-target-coverage-final.json'));rows=[]
def stored(e):
 p=Q/e['preserved'];b=p.read_bytes()if p.exists()else subprocess.check_output(['git','-C',str(Q.parents[2]),'show','e5728cd330f1f2854a5ccb2e6f9ce280fac246fc:docs/qa/generalization/'+e['preserved']]);
 with gzip.GzipFile(fileobj=io.BytesIO(b))as f:assert hashlib.file_digest(f,'sha256').hexdigest()==e['SHA256']
 return b
for case in coverage['cases']:
 cid=case['caseId'];archive=case['rawArchive'];manifest=json.load(open(R/archive/'archive-manifest.json'));rowe=next(e for e in manifest['files']if e['member']=='matrix/'+cid+'-v3-row.json');raw=stored(rowe)
 def at(prefix):
  with gzip.GzipFile(fileobj=io.BytesIO(raw))as f:return next(ijson.items(f,prefix,use_float=True),None)
 selection=at('provenance.registrySelection');story=selection.get('storySearch')or{};styles={r['id']:r for r in selection.get('styleComparisons',[])};candidates=[]
 for i,c in enumerate(story.get('candidates',[])):
  rank=[-1 if c.get('glyphFailures')else 1,1 if c.get('stylePixels',{}).get('passed')else 0,c.get('worldScore'),styles.get(c['style'],{}).get('rank')];full=c.get('acceptance')is not None
  candidates.append({'style':c['style'],'font':c.get('font'),'variant':c['variant'],'preliminaryRankReconstructedFromRecordedOperands':rank,'actualGlyphFailures':c.get('glyphFailures'),'preliminaryOrder':i,'detailedQA':full,'earlyExclusionReason':None if full else'ACTUAL_GLYPH_FAILURE'if c.get('glyphFailures')else'NONFINITE_PRELIMINARY_EVIDENCE'if not all(isinstance(v,(int,float))and math.isfinite(v)for v in rank)else'TOP_TWO_PRELIMINARY_LIMIT','fullQARank':c.get('rank'),'fullQAFailures':[{'key':v.get('key'),'kind':v.get('kind'),'score':v.get('score')}for v in (c.get('acceptance')or{}).get('failures',[])]})
 legacy=at('provenance.compositionSearch.legacyFinalist')or{};v3=at('provenance.compositionSearch.v3Selection')or{}
 ranked=[{k:r.get(k)for k in ['id','eligible','reason','missing','rankVector']}for r in v3.get('ranked',[])]
 rows.append({'caseId':cid,'sourceCommit':case['sourceCommit'],'videoSHA256':case['binding']['videoSHA256'],'rawRowSHA256':rowe['SHA256'],'inputHash':case['binding']['inputHash'],'planHash':case['binding']['planHash'],'finalSelectedCuts':case['selectedCuts'],'registryPlannedEntries':[{k:e.get(k)for k in ['layout','enter','hold']}for e in selection.get('entries',{}).values()],'storyCandidates':candidates,'storySelected':story.get('selected'),'initialProposalRank':story.get('initialProposalRank'),'shippingIncumbentRank':story.get('shippingIncumbentRank'),'legacyFinalist':{'status':legacy.get('status'),'selectedComposition':legacy.get('selectedComposition'),'unitAlternativeReasons':dict(collections.Counter(e.get('reason')for e in legacy.get('unitAlternativeTrace',[])))},'compositionSelection':{'status':v3.get('status'),'selectedId':v3.get('selectedId'),'ranked':ranked},'limits':'Reconstruction uses the recorded rank operands and source formula; it does not invent missing finished MP4s for candidates excluded before full QA. Grammar selection alone does not establish a selector defect or a requirement to force photo.'})
(O/'photo-selection-audit.json').write_text(json.dumps({'schema':1,'sourceCommit':coverage['sourceCommit'],'cases':rows,'selectorChanged':False,'seedSearchPerformed':False,'newPhotoSelectionCertified':False},ensure_ascii=False,indent=2)+'\n');print([(r['caseId'],len(r['storyCandidates']),sum(c['detailedQA']for c in r['storyCandidates']),r['legacyFinalist'])for r in rows])
