"""Validate one real typed static contract and its moving-MP4 negative claim.
These are contract test fixtures, explicitly not full-population release manifests.
"""
import pathlib,json,gzip,hashlib,subprocess,os,copy,sys
Q=pathlib.Path(__file__).resolve().parents[1];O=Q/'composition-recovery/release-recovery-20261019';D=O/'static-contract-validation';D.mkdir(exist_ok=True)
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def ref(p):return {'path':os.path.relpath(p,D),'sha256':sha(p.read_bytes())}
def write(n,x):p=D/n;p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n');return ref(p)
pilot=read(O/'static-sensor-pilot-preregistration.json');r=read(O/'static-sensor-corrected/report.json');control=read(O/'static-sensor-pilot/report.json.gz');assert r['staticObserved']and r['sensitivityMatches'];b=pilot['binding'];ident=pilot['intentId'];target='PRIMARY_LYRIC:'+pilot['unitId']+':'+pilot['fragmentId'];glyph='0:0:影'
assert all(x['native']['inkPixels']>0 and x['actual'][0]['inkPixels']>0 for x in r['observations'])
movies={}
for label,h,bind in [('original',b['videoSHA256'],b),('control',r['controlVideoSHA256'],control['verification']['binding'])]:
 p=Q/'media'/(h+'.mp4');assert sha(p.read_bytes())==h;run=subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(p),'-map','0:v:0','-pix_fmt','rgba','-f','hash','-hash','sha256','-'],capture_output=True,text=True);assert run.returncode==0 and not run.stderr;decoded=run.stdout.strip().split('=')[1];movies[label]=write(label+'-movie.json',{'sourceCommit':b['sourceCommit'],'binding':bind,'videoSHA256':h,'decodedRGBA_SHA256':decoded,'decodeComplete':True,'decodeExitCode':0,'codecVideo':'h264','codecAudio':'aac','media':ref(p)})
sensor=write('sensitivity-control.json',{'sourceCommit':b['sourceCommit'],'targetId':target,'videoSHA256':r['controlVideoSHA256'],'movie':movies['control'],'glyphs':[{'id':glyph,'from':r['observations'][0]['actual'][1]['centroid'],'to':r['observations'][-1]['actual'][1]['centroid'],'expectedDisplacementPixels':pilot['expectedControlDisplacementPixels']}],'preregistration':ref(O/'static-sensor-pilot-preregistration.json'),'method':ref(O/'static-sensor-corrected-observation-preregistration.json'),'rawPixelObservations':ref(O/'static-sensor-corrected/report.json'),'rawPixels':ref(O/'static-sensor-corrected/raw.json.gz'),'oldImpreciseObservation':ref(O/'static-sensor-pilot/report.json.gz')})
contract={'intentId':ident,'proofType':'STATIC','target':{'id':target,'layer':'PRIMARY_LYRIC','unitId':pilot['unitId'],'fragmentId':pilot['fragmentId']},'from':pilot['from'],'to':pilot['to'],'fps':b['outputProfile']['fps'],'frameOrigin':b['outputProfile']['range'][0],'tolerancePixels':1,'glyphIds':[glyph],'binding':b}
snapshot=D/'source-population-snapshot.json.gz'
if not snapshot.exists():snapshot.write_bytes((O/'current31-partial-population.json.gz').read_bytes())
row=next(x for x in read(snapshot)['rows']if x['intentId']==ident);assert row['classification']=='INTENTIONAL_STATIC'and row['naturalSelection']=='NATURAL'
outputs=[]
for scenario in ['original-static','moving-movie-invalid-static-claim']:
 c=copy.deepcopy(contract);binding=b if scenario=='original-static'else control['verification']['binding'];c['binding']=binding
 contractRef=write(scenario+'-contract.json',c)
 digest=subprocess.check_output(['node','-e',"const fs=require('fs'),c=JSON.parse(fs.readFileSync(process.argv[1]));process.stdout.write(require('crypto').createHash('sha256').update(JSON.stringify(c)).digest('hex'))",str(D/contractRef['path'])],text=True)
 frames=[]
 for index,f in enumerate(r['observations']):
  actual=f['actual'][0 if scenario=='original-static'else 1];native=f['native']['centroid'];shift=0 if scenario=='original-static'else 6*index/(len(r['observations'])-1)
  frames.append({'frameIndex':round((f['time']-c['frameOrigin'])*c['fps']),'actualDecodedTimestamp':f['time'],'targetId':target,'glyphs':[{'id':glyph,'nativeComplete':True,'pixelPresence':True,'nativeCentroid':[native[0]+shift,native[1]],'decodedCentroid':actual['centroid'],'nativeInkPixels':f['native']['inkPixels'],'decodedInkPixels':actual['inkPixels']}]})
 measurement=write(scenario+'-measurement.json',{'sourceCommit':b['sourceCommit'],'binding':binding,'intentId':ident,'proofType':'STATIC','contractSHA256':digest,'targetId':target,'decodedPixels':True,'movie':movies['original'if scenario=='original-static'else'control'],'decodedFrames':frames,'sensitivityControl':sensor,'rawPixelObservations':ref(O/'static-sensor-corrected/report.json'),'scope':'Actual original static contract'if scenario=='original-static'else'COUNTEREXAMPLE: deliberately invalid claim that the known QA moving control is static. Never a natural-selection observation.'})
 ledgerRow=copy.deepcopy(row);ledgerRow['binding']=binding
 ledger=write(scenario+'-fixture-ledger.json',{'sourceCommit':b['sourceCommit'],'expectedImportantIntentIds':[ident],'rows':[ledgerRow],'scope':'ONE_CONTRACT_VALIDATION_FIXTURE_ONLY_NOT_THE_RELEASE_POPULATION','sourcePopulationSnapshot':ref(snapshot)})
 population=write(scenario+'-fixture-population.json',{'sourceCommit':b['sourceCommit'],'executionLedger':ledger,'intents':[c],'scope':'ONE_CONTRACT_VALIDATION_FIXTURE_ONLY'})
 operators=write(scenario+'-fixture-operators.json',{'sourceCommit':b['sourceCommit'],'proofSchema':2,'importanceClassificationFinalized':True,'expectedImportantIntentIds':[ident],'population':population,'observations':[{'intentId':ident,'status':'VERIFIED','measurement':measurement}],'scope':'Isolated contract test fixture; canonical importanceClassificationFinalized remains false. Negative fixture intentionally injects a claim that must fail.'})
 manifest=write(scenario+'-NOT-A-RELEASE-MANIFEST.json',{'releaseSourceCommit':b['sourceCommit'],'evidence':{'operators':operators},'scope':'CONTRACT_TEST_ONLY; technical and other quality domains intentionally absent. No release approval possible.'})
 run=subprocess.run(['node',str(pathlib.Path(sys.argv[1])/'dev/release_gates.cjs'),str(D/manifest['path'])],capture_output=True,text=True);gate=json.loads(run.stdout);write(scenario+'-gate-result.json',gate);state=next(x['state']for x in gate['checks']['quality']if x['name']=='important semantic operators');assert state==('PASS'if scenario=='original-static'else'FAIL'),gate;assert gate['RELEASE_GO']!='PASS';outputs.append({'scenario':scenario,'contractCheck':state,'releaseGO':gate['RELEASE_GO']})
write('summary.json',{'sourceCommit':b['sourceCommit'],'intentId':ident,'results':outputs,'canonicalImportanceClassificationFinalized':False,'canonicalPopulationNotReplaced':True,'newMP4s':0,'scope':'One real static contract passes the unchanged v2 validator; the actual moving-target MP4 remains a failing static counterexample. Canonical all-population gates are separate.'});print(outputs)
