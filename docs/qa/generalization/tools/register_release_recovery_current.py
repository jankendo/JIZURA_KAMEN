"""Register imported current-source films without inventing pending quality verdicts."""
import pathlib,json,gzip,hashlib,os,subprocess,sys
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';A=R/'release-current-head';O=R/'release-recovery-20261019';F=R/'release-d04c734-frozen'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def ref(p):return {'path':os.path.relpath(p,A),'sha256':sha(p)}
def write(p,x):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n');return ref(p)
imports=[read(p)for p in sorted((O/'current31-results').glob('*/import.json'))];art=read(A/'finished-artifacts.json');art['movies']=[m for m in art['movies']if not m['id'].startswith('current-natural:')];comparisons=read(A/'comparisons.json');lookup={c['id']:c for c in comparisons['conditions']+comparisons['independent']}
for i in imports:
 case=i['caseId'];directory=O/'current31-results'/case;row=read(directory/'matrix'/(case+'-v3-row.json.gz'));b=row['provenance']['finalArtifactVerification']['binding'];assert i['binding']==b and i['sourceCommit']==comparisons['sourceCommit']and i['fullDecode']=='PASS'
 decoded=write(A/'finished-artifact-observations'/(case+'.json'),{'sourceCommit':b['sourceCommit'],'videoSHA256':b['videoSHA256'],'decodeComplete':True,'decodeExitCode':0,'raw':ref(directory/'strict-decode.json.gz'),'importRecord':ref(directory/'import.json')})
 art['movies'].append({'id':'current-natural:'+case,'decodeComplete':True,'decodeExitCode':0,'hashMatches':True,'hasAudio':True,'hasVideo':True,'codecVideo':'h264','codecAudio':'aac',**{k:b[k]for k in ['videoSHA256','inputHash','planHash','outputProfile','rendererVersion','selectedCandidateId']},'observation':decoded})
 if case not in lookup:assert case=='late-unseen-quiet-16x9';continue
 c=lookup[case];c.update(candidateFreshNaturalMP4=b['videoSHA256'],currentNaturalImport=ref(directory/'import.json'),sameInput=True,sameSeed=True,sameProfile=True,shippedPipelines=True,actualDecodedComparison=True,currentActivePrimaryFAV='MEASURED',currentActivePrimaryFAVScope='All declared active units and full decoded HOLD clocks; outgoing-layer/independent operator completeness remains separate.',reason='Current natural movie/input/PCM/profile/decode/Native binding complete. Significant-regression adjudication and complete layer/phase semantic coverage remain pending; no null safety/creative verdict was changed to false.')
 movies=[]
 for version in ['main','previous']:
  p=F/'comparison-movies'/(case+'-'+version+'.json');m=read(p);movies.append({**ref(p),'expectedSourceCommit':m['sourceCommit']})
 metadata=write(A/'comparison-movies'/(case+'-current.json'),{'sourceCommit':b['sourceCommit'],'videoSHA256':b['videoSHA256'],'decodeComplete':True,'decodeExitCode':0,'binding':b,'raw':ref(directory/'strict-decode.json.gz'),'actualNative':ref(directory/'dispatch'/case/'native-dispatch-trace.json.gz'),'inputCorrespondence':ref(directory/'original-input-correspondence.json.gz')});movies.append({**metadata,'expectedSourceCommit':b['sourceCommit']});c['movies']=movies
art['scope']=f'{len(imports)} imported current-source natural films plus the previously measured saved-plan wrapping repair. Expected Intent coverage: 32 conditions. This subset does not certify all target paths or creative regression judgments.'
write(A/'finished-artifacts.json',art);write(A/'comparisons.json',comparisons)
ops=read(A/'operators.json');population=read(O/'current31-partial-population.json.gz');ops.update(currentPartialPopulation=ref(O/'current31-partial-population.json.gz'),importedCurrentConditions=len(imports),expectedCurrentIntentCoverageConditions=32,provisionalCurrentImportantIntents=len(population['expectedImportantIntentIds']),canonicalImportanceClassificationFinalized=False)
if (O/'static-contract-validation/summary.json').exists():ops['individualContractValidation']=ref(O/'static-contract-validation/summary.json');ops['individualContractFormalRegistration']='WITHDRAWN_WORLD_STATIC_CLAIM_V2_FALSE_POSITIVE: actual glyph shrinks while its centroid remains stable. Preserve the v2 result as a counterexample; v3 full-raster check rejects the same movie. No formal static or population approval.'
write(A/'operators.json',ops)
manifest=read(A/'release-gate-manifest.json')
for key,file in [('artifacts','finished-artifacts.json'),('comparisons','comparisons.json'),('operators','operators.json')]:manifest['evidence'][key]=ref(A/file)
write(A/'release-gate-manifest.json',manifest)
run=subprocess.run(['node',str(pathlib.Path(sys.argv[1])/'dev/release_gates.cjs'),str(A/'release-gate-manifest.json')],capture_output=True,text=True);g=json.loads(run.stdout);assert g['TECHNICAL_GO']=='PASS'and g['RELEASE_GO']!='PASS';write(Q/'final-gates.json',g);write(O/'candidate-gates.json',g)
remaining=read(R/'grammar-policy-v2-remaining-release-conditions.json');remaining.update({k:g[k]for k in ['TECHNICAL_GO','QUALITY_GO','RELEASE_GO']});remaining['currentManifest']['sha256']=sha(A/'release-gate-manifest.json');remaining['currentNaturalCollection']={'runs':[39244958536,39246207521],'expectedComparisonConditions':31,'expectedIntentCoverageConditions':32,'importedConditions':len(imports),'sourceFrozen':g['releaseSourceCommit'],'complete':len(imports)==32,'semanticCredit':False};write(R/'grammar-policy-v2-remaining-release-conditions.json',remaining)
print({'imported':len(imports),'provisionalImportant':ops['provisionalCurrentImportantIntents'],'TECHNICAL_GO':g['TECHNICAL_GO'],'QUALITY_GO':g['QUALITY_GO']})
