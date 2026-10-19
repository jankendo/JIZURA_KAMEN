"""The same real shrinking-glyph movie passes v2 centroid-only static proof,
but must not pass a v3 world-static claim. This is never a release manifest.
"""
import pathlib,json,gzip,hashlib,subprocess,os,sys,copy
Q=pathlib.Path(__file__).resolve().parents[1];O=Q/'composition-recovery/release-recovery-20261019';D=O/'static-world-raster-counterexample';D.mkdir(exist_ok=True);repo=pathlib.Path(sys.argv[1])
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def ref(p):return {'path':os.path.relpath(p,D),'sha256':sha(p.read_bytes())}
def write(name,x):p=D/name;p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n');return ref(p)
def raster(values,background,roi):
 bits=[abs(a-b)>=.25 for a,b in zip(values,background)];runs=[];i=0;count=0;sx=0;sy=0
 while i<len(bits):
  if not bits[i]:i+=1;continue
  start=i
  while i<len(bits)and bits[i]:count+=1;sx+=roi[0]+i%roi[2];sy+=roi[1]+i//roi[2];i+=1
  runs.append([start,i-start])
 assert count>0
 return {'origin':roi[:2],'width':roi[2],'height':roi[3],'runs':runs},count,[sx/count,sy/count]
p=read(O/'static-sensor-pilot-preregistration.json');pixels=read(O/'static-sensor-corrected/raw.json.gz');obs=read(O/'static-sensor-corrected/report.json');b=p['binding'];ident=p['intentId'];glyph='0:0:影';target='PRIMARY_LYRIC:'+p['unitId']+':'+p['fragmentId'];roi=obs['roi'];prepared=[]
for i,t in enumerate(p['target']['outputClocks']):
 bg=pixels['native'][1]['samples'][i]['luma'];native=raster(pixels['native'][0]['samples'][i]['luma'],bg,roi);actual=[]
 for movie in pixels['decoded']:
  sample=next(s for s in movie['samples']if abs(s['actualOutputTimestamp']-t)<1e-7);actual.append(raster(sample['luma'],bg,roi))
 prepared.append({'time':t,'native':native,'actual':actual})
movieRefs={}
for label in ['original','control']:
 meta=read(O/'static-contract-validation'/(label+'-movie.json'));moviePath=D/meta['media']['path'];actualFrames=subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=nb_frames','-of','default=nw=1:nk=1',str(moviePath)],text=True);meta['videoFrameCount']=int(actualFrames.strip());movieRefs[label]=write(label+'-movie.json',meta)
sensor=write('coded-sensitivity.json',{'sourceCommit':b['sourceCommit'],'targetId':target,'videoSHA256':obs['controlVideoSHA256'],'movie':movieRefs['control'],'glyphs':[{'id':glyph,'from':prepared[0]['actual'][1][2],'to':prepared[-1]['actual'][1][2],'expectedDisplacementPixels':p['expectedControlDisplacementPixels'],'samples':[{'actualDecodedTimestamp':f['time'],'decodedRaster':f['actual'][1][0]}for f in [prepared[0],prepared[-1]]]}],'raw':ref(O/'static-sensor-corrected/raw.json.gz')})
contract={'intentId':ident,'proofType':'STATIC','target':{'id':target,'layer':'PRIMARY_LYRIC','coordinateFrame':'OUTPUT_PIXELS'},'binding':b,'from':p['from'],'to':p['to'],'fps':b['outputProfile']['fps'],'frameOrigin':b['outputProfile']['range'][0],'tolerancePixels':1,'glyphIds':[glyph],'rasterMethod':'ISOLATED_TARGET_OFF_CONTRAST','glyphROIs':[{'id':glyph,'rect':roi}]};cr=write('invalid-world-static-contract.json',contract)
contractSHA=subprocess.check_output(['node','-e',"const fs=require('fs');process.stdout.write(require('crypto').createHash('sha256').update(JSON.stringify(JSON.parse(fs.readFileSync(process.argv[1])))).digest('hex'))",str(D/cr['path'])],text=True)
frames=[{'frameIndex':round(f['time']*24),'actualDecodedTimestamp':f['time'],'targetId':target,'glyphs':[{'id':glyph,'nativeComplete':True,'pixelPresence':True,'nativeRaster':f['native'][0],'decodedRaster':f['actual'][0][0],'nativeInkPixels':f['native'][1],'decodedInkPixels':f['actual'][0][1],'nativeCentroid':f['native'][2],'decodedCentroid':f['actual'][0][2]}]}for f in prepared]
measurement=write('real-original-invalid-static-claim.json',{'sourceCommit':b['sourceCommit'],'intentId':ident,'proofType':'STATIC','binding':b,'targetId':target,'contractSHA256':contractSHA,'decodedPixels':True,'movie':movieRefs['original'],'decodedFrames':frames,'sensitivityControl':sensor,'rawPixelEvidence':ref(O/'static-sensor-corrected/raw.json.gz'),'scope':'DELIBERATELY_INVALID_WORLD_STATIC_CLAIM: centroid barely moves but complete glyph outline shrinks. Local HOLD identity is not world-space stillness.'})
ledger=write('one-counterexample-fixture-ledger.json',{'sourceCommit':b['sourceCommit'],'expectedImportantIntentIds':[ident],'rows':[{'intentId':ident,'binding':b,'important':True,'naturalSelection':'NATURAL','classification':'INTENTIONAL_STATIC'}],'scope':'ONE_INVALID_CLAIM_FIXTURE_NOT_RELEASE_POPULATION'})
pop=write('one-counterexample-fixture-population.json',{'sourceCommit':b['sourceCommit'],'executionLedger':ledger,'intents':[contract]})
old=O/'static-contract-validation/frozen-v2-evaluator.cjs';old.write_bytes(subprocess.check_output(['git','-C',str(repo),'show',b['sourceCommit']+':dev/release_gates.cjs']))
results=[]
for label,schema,module,expected in [('v2-original-schema',2,old,'PASS'),('v3-rejects-legacy-static',2,repo/'dev/release_gates.cjs','UNVERIFIED'),('v3-complete-raster-contract',3,repo/'dev/release_gates.cjs','FAIL')]:
 operators=write(label+'-fixture-operators.json',{'sourceCommit':b['sourceCommit'],'proofSchema':schema,'importanceClassificationFinalized':True,'expectedImportantIntentIds':[ident],'population':pop,'observations':[{'intentId':ident,'status':'VERIFIED','measurement':measurement}],'scope':'DELIBERATELY_INVALID_CLAIM_IN_A_CONTRACT_TEST_FIXTURE_ONLY'})
 manifest=write(label+'-NOT-A-RELEASE-MANIFEST.json',{'releaseSourceCommit':b['sourceCommit'],'evidence':{'operators':operators},'scope':'REAL_ARTIFACT_FALSE_POSITIVE_COUNTEREXAMPLE_NOT_RELEASE_APPROVAL'})
 run=subprocess.run(['node',str(module),str(D/manifest['path'])],capture_output=True,text=True);g=json.loads(run.stdout);write(label+'-result.json',g);state=next(c['state']for c in g['checks']['quality']if c['name']=='important semantic operators');assert state==expected,g;assert g['RELEASE_GO']!='PASS';results.append({'case':label,'operatorCheck':state,'evaluatorSHA256':sha(module.read_bytes())})
# Preserve the same actual moving-MP4 counterexample as well. Its unchanged
# expected Native reference is deliberately paired with coded moving glyphs.
controlBinding=read(O/'static-contract-validation/control-movie.json')['binding'];movingContract=copy.deepcopy(contract);movingContract['binding']=controlBinding
movingContractRef=write('moving-movie-invalid-static-contract.json',movingContract)
movingSHA=subprocess.check_output(['node','-e',"const fs=require('fs');process.stdout.write(require('crypto').createHash('sha256').update(JSON.stringify(JSON.parse(fs.readFileSync(process.argv[1])))).digest('hex'))",str(D/movingContractRef['path'])],text=True)
movingFrames=copy.deepcopy(frames)
for frame,f in zip(movingFrames,prepared):
 g=frame['glyphs'][0];g['decodedRaster']=f['actual'][1][0];g['decodedInkPixels']=f['actual'][1][1];g['decodedCentroid']=f['actual'][1][2]
movingMeasurement=write('moving-movie-invalid-static-claim.json',{'sourceCommit':b['sourceCommit'],'intentId':ident,'proofType':'STATIC','binding':controlBinding,'targetId':target,'contractSHA256':movingSHA,'decodedPixels':True,'movie':movieRefs['control'],'decodedFrames':movingFrames,'sensitivityControl':sensor,'rawPixelEvidence':ref(O/'static-sensor-corrected/raw.json.gz'),'scope':'DELIBERATELY_INVALID_STATIC_CLAIM_ON_THE_KNOWN_CODED_MOVING_QA_CONTROL; not a natural selected output.'})
movingLedger=write('moving-counterexample-ledger.json',{'sourceCommit':b['sourceCommit'],'expectedImportantIntentIds':[ident],'rows':[{'intentId':ident,'binding':controlBinding,'important':True,'naturalSelection':'NATURAL','classification':'INTENTIONAL_STATIC'}],'scope':'INJECTED_INVALID_NATURAL_STATIC_CLAIM_FOR_A_NEGATIVE_TEST_ONLY'})
movingPop=write('moving-counterexample-population.json',{'sourceCommit':b['sourceCommit'],'executionLedger':movingLedger,'intents':[movingContract]})
for label,schema,module,expected in [('v2-coded-moving',2,old,'FAIL'),('v3-legacy-coded-moving',2,repo/'dev/release_gates.cjs','UNVERIFIED'),('v3-raster-coded-moving',3,repo/'dev/release_gates.cjs','FAIL')]:
 operators=write(label+'-fixture-operators.json',{'sourceCommit':b['sourceCommit'],'proofSchema':schema,'importanceClassificationFinalized':True,'expectedImportantIntentIds':[ident],'population':movingPop,'observations':[{'intentId':ident,'status':'VERIFIED','measurement':movingMeasurement}],'scope':'INVALID_CLAIM_NEGATIVE_TEST_ONLY'})
 manifest=write(label+'-NOT-A-RELEASE-MANIFEST.json',{'releaseSourceCommit':b['sourceCommit'],'evidence':{'operators':operators},'scope':'NEGATIVE_TEST_ONLY_NOT_RELEASE_APPROVAL'})
 run=subprocess.run(['node',str(module),str(D/manifest['path'])],capture_output=True,text=True);gate=json.loads(run.stdout);write(label+'-result.json',gate);state=next(c['state']for c in gate['checks']['quality']if c['name']=='important semantic operators');assert state==expected,gate;results.append({'case':label,'operatorCheck':state,'evaluatorSHA256':sha(module.read_bytes())})
write('summary.json',{'rendererSourceCommit':b['sourceCommit'],'intentId':ident,'videoSHA256':b['videoSHA256'],'results':results,'newMP4s':0,'validForFormalStaticRegistration':False,'finding':'Real centroid-only false positive rejected by full output-space glyph shape. No threshold, input, source movie or phase interval changed.'});print(results)
