"""Source-bound adapters; old successful observations keep their original commits."""
import pathlib,json,gzip,hashlib,subprocess,shutil,os,re
SOURCE=pathlib.Path('/workspace/kamen-release');Q=pathlib.Path('/workspace/kamen-evidence/docs/qa/generalization');R=Q/'composition-recovery';A=R/'release-current-head';OUT=R/'release-recovery-20261019';OUT.mkdir(exist_ok=True)
def git(*args):return subprocess.check_output(['git','-C',str(SOURCE),*args])
HEAD=git('rev-parse','HEAD').decode().strip();BEFORE='bea4fca948be2548635a92094716fd89c5947707';MAIN='2e7ed477f88028dbb63aa609e8a11b4052ea8c00'
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):
 b=p.read_bytes();return json.loads(gzip.decompress(b)if p.suffix=='.gz'else b)
def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');return ref(p)
def ref(p):return {'path':os.path.relpath(p,A),'sha256':sha(p.read_bytes())}
if not (R/'release-d04c734-frozen').exists():shutil.copytree(A,R/'release-d04c734-frozen')
if (Q/'final-gates.json').exists()and not(OUT/'previous-final-gates.json').exists():shutil.copyfile(Q/'final-gates.json',OUT/'previous-final-gates.json')
for p in pathlib.Path('/workspace/release-audit').glob('*.json*'):shutil.copyfile(p,OUT/p.name)
shutil.copytree('/workspace/release-audit/encoded-mismatches',OUT/'encoded-mismatches',dirs_exist_ok=True)
shutil.copytree('/workspace/encoder-boundary-dev01',OUT/'encoder-boundary-development01',dirs_exist_ok=True)
for mode in ['REPEAT_A','REPEAT_B']:
 p=OUT/'encoder-boundary-development01'/(mode+'.mp4');h=sha(p.read_bytes());shutil.copyfile(p,Q/'media'/(h+'.mp4'));p.unlink()
replays=[]
for name,dirname in [('superseded-orphan-shift','/workspace/release-replay-development04'),('merged-orphan-fix','/workspace/release-replay-development04-merged')]:
 directory=pathlib.Path(dirname);raw=read(directory/'report.json.gz');b=raw['verification']['binding'];video=directory/'fixed.mp4';h=sha(video.read_bytes());assert h==raw['actualFileSHA256']==b['videoSHA256']and raw['decodeExitCode']==0 and raw['verification']['status']=='MEASURED'and not raw['verification']['failures']
 shutil.copyfile(video,Q/'media'/(h+'.mp4'));shutil.copyfile(directory/'report.json.gz',OUT/(name+'-raw.json.gz'))
 if (directory/'fixed-4.25.png').exists():shutil.copyfile(directory/'fixed-4.25.png',OUT/(name+'-4.25.png'))
 replays.append({'label':name,'sourceCommit':b['sourceCommit'],'binding':b,'decodeComplete':True,'decodeExitCode':0,'media':ref(Q/'media'/(h+'.mp4')),'rawMeasurement':ref(OUT/(name+'-raw.json.gz')),'nativeAndDecodedLyricSafety':raw['verification']['status'],'freshAutomaticSelection':False,'layouts':raw['layout']})
write(OUT/'development04-replays.json',{'sourceCommit':HEAD,'replays':replays,'scope':'Two actually generated saved-plan MP4s. Superseded first fix retained. The final layout merges the orphan row; source text, LRC timing and existing fit-size candidates remain intact. Fresh shipping generation is not claimed.'})
chosen=replays[-1];b=chosen['binding'];assert b['sourceCommit']==BEFORE
qaExact=['dev/pages_e2e.cjs','dev/export_watchdog.cjs','dev/export_watchdog_test.cjs','dev/release_gates.cjs','dev/release_gates_test.cjs'];qaPrefixes=['.github/workflows/','docs/qa/'];shipping=['src','scripts','app','assets','vendor','package.json','package-lock.json']
paths=git('diff','--no-ext-diff','--no-renames','--name-only','-z',BEFORE,HEAD,'--').decode().split('\0');paths=sorted(p for p in paths if p);assert paths and all(p in qaExact for p in paths)
diff=sha(git('diff','--no-ext-diff','--no-renames','--binary',BEFORE,HEAD,'--'))
assessment=write(OUT/'runtime-assessment.json',{'sourceCommit':HEAD,'fromCommit':BEFORE,'toCommit':HEAD,'gitDiffSHA256':diff,'paths':[{'path':p,'classification':'QA_ONLY','reason':'Release evaluator and its counterexample tests only; every shipping input object is identical.','diffHunkSHA256':sha(git('diff','--no-ext-diff','--no-renames','--binary',BEFORE,HEAD,'--',p))}for p in paths]})
def tree(rev):
 rows=[line for line in git('ls-tree','-r','-z',rev).decode().split('\0')if line and line.split('\t')[1]not in qaExact and not any(line.split('\t')[1].startswith(p)for p in qaPrefixes)]
 return sha('\0'.join(rows).encode())
assert tree(BEFORE)==tree(HEAD)
inputs=[]
for p in shipping:
 before=git('rev-parse',BEFORE+':'+p).decode().strip();after=git('rev-parse',HEAD+':'+p).decode().strip();assert before==after;inputs.append({'path':p,'beforeGitObject':before,'afterGitObject':after})
treeProof=write(OUT/'runtime-tree.json',{'sourceCommit':HEAD,'fromCommit':BEFORE,'toCommit':HEAD,'beforeRuntimeTreeSHA256':tree(BEFORE),'afterRuntimeTreeSHA256':tree(HEAD),'excludedExactPaths':qaExact,'excludedPrefixes':qaPrefixes,'shippingInputs':inputs})
correspondence=write(OUT/'source-correspondence.json',{'sourceCommit':HEAD,'fromCommit':BEFORE,'toCommit':HEAD,'gitDiffSHA256':diff,'changedPaths':paths,'runtimeAssessment':assessment,'runtimeTreeProof':treeProof})
rawDecode=write(OUT/'development04-fixed-decode.json',{'sourceCommit':BEFORE,'videoSHA256':b['videoSHA256'],'decodeComplete':True,'decodeExitCode':0,'rawMeasurement':chosen['rawMeasurement'],'scope':'Actual FFmpeg -xerror complete decode and measured browser final-artifact report; original source binding retained.'})
artifacts={'sourceCommit':HEAD,'movies':[{'id':'development-04-saved-plan-replay','decodeComplete':True,'decodeExitCode':0,'hashMatches':True,'hasAudio':True,'hasVideo':True,'codecVideo':'h264','codecAudio':'aac','videoSHA256':b['videoSHA256'],'inputHash':b['inputHash'],'planHash':b['planHash'],'outputProfile':b['outputProfile'],'rendererVersion':b['rendererVersion'],'selectedCandidateId':b['selectedCandidateId'],'observation':rawDecode}],'scope':'Targeted saved-plan candidate only; no claim that all 32 natural current-source films have been generated.'}
write(A/'finished-artifacts.json',artifacts)
run=json.loads(subprocess.check_output(['gh','run','view','39220369311','--json','status,conclusion,headSha,url'],cwd=SOURCE));assert run['headSha']==HEAD
write(A/'ci.json',{'sourceCommit':HEAD,'headSha':run['headSha'],'conclusion':run['conclusion']or run['status'],'url':run['url']})
focus=read(OUT/'focused-tests.json');known={r['id']:r for r in focus['cases']};testIds=list(dict.fromkeys(re.findall(r"'([^']+_test\.(?:js|cjs))'",(SOURCE/'scripts/run-tests.mjs').read_text())))
write(A/'tests.json',{'sourceCommit':HEAD,'install':{'exitCode':0,'scope':'npm ci completed in candidate checkout'},'build':{'exitCode':0,'outputSHA256':sha((SOURCE/'dist/index.html').read_bytes())},'cases':[{'id':t,'status':known[t]['status']if t in known else'UNVERIFIED','exitCode':known[t]['exitCode']if t in known else None,'reason':None if t in known else'Formal latest-head suite still running; historical broad PASS is not transferred across the rendering fix.'}for t in testIds],'focusedRaw':ref(OUT/'focused-tests.json'),'formalCI':run['url']})
write(A/'browser.json',{'sourceCommit':HEAD,'actualBrowser':True,'operations':[],'scope':'Targeted saved-plan encode/certification/decode completed. Latest-head one-click generation/save/restore/cancel/retry/invalid-MP4 UI coverage awaits formal CI; no invented UI traces.'})
old=read(R/'release-d04c734-frozen/comparisons.json');audit=read(OUT/'intent-audit.json');bycase={}
for i in audit['rows']:
 if i['required']and i['status']!='VERIFIED':bycase.setdefault(i['caseId'],[]).append(i['intentId'])
conditions=[]
for c in old['conditions']+old['independent']:
 conditions.append({'id':c['id'],'significantRegression':None,'lyricSafetyFailed':False if c['id']=='development-04'else None,'lyricSafetyScope':'SAVED_PLAN_REPLAY'if c['id']=='development-04'else'UNVERIFIED_CURRENT_NATURAL','historicalSourceCommit':old['sourceCommit'],'historicalLyricSafetyFailed':c['lyricSafetyFailed'],'historicalUnprovenIntentIds':bycase.get(c['id'],[]),'candidateSavedPlanMP4':b['videoSHA256']if c['id']=='development-04'else None,'candidateFreshNaturalMP4':None,'reason':'Current-source naturally selected completed comparison and target-semantic adjudication are not complete. Existing historical comparison/decode records are preserved in release-d04c734-frozen.','requiredAdditionalEvidence':['Current-source natural output and source/input/plan/profile correspondence','All required target/phase semantic contracts for this condition','Completed engineering visual/music-fit adjudication under the existing preregistration']})
write(OUT/'comparison-blockers.json',{'sourceCommit':HEAD,'conditions':conditions,'independent97to59Judgment':'No artistic major-regression verdict inferred from the proxy decrease. Four exact-clock prior/current samples were inspected; final music/phrase-level adjudication remains incomplete. No source adjustment was made to increase this metric.','newThresholdsInvented':False})
write(A/'comparisons.json',{'sourceCommit':HEAD,'expectedConditionIds':old['expectedConditionIds'],'conditions':conditions[:30],'independent':conditions[30:],'compositionAssessment':{'significantRegressionsResolved':None,'observations':[]},'historicalComparisonManifest':ref(R/'release-d04c734-frozen/comparisons.json'),'candidateBlockers':ref(OUT/'comparison-blockers.json')})
write(A/'operators.json',{'sourceCommit':HEAD,'proofSchema':2,'importanceClassificationFinalized':False,'expectedImportantIntentIds':[],'observations':[],'historicalProvisionalPopulation':1129,'historicalVerified':2,'historicalUnverified':1127,'historicalAudit':ref(OUT/'intent-audit.json'),'scope':'Historical d04 dispatch IDs and the two original-source certificates are preserved, not relabelled as current-source semantic proof. The changed renderer population and target contracts are not finalized.'})
write(A/'safety.json',{'sourceCommit':HEAD,'knownMajorDefects':0,'lyricMissing':0,'audioBroken':0,'manualLocksChanged':0,'allTargetPathsBound':False,'finalArtifactMatchesSource':True,'pathObservations':[{'id':'development04-saved-plan','binding':b,'sourceCorrespondence':correspondence}],'scope':'Observed targeted artifact has measured lyric/audio safety. Entire current-source path population remains incomplete; historical 32 are preserved separately.'})
manifest={'releaseSourceCommit':HEAD,'gitRepository':'../../../../..','sourceCorrespondence':[correspondence],'evidence':{k:ref(A/f)for k,f in {'ci':'ci.json','tests':'tests.json','browser':'browser.json','artifacts':'finished-artifacts.json','comparisons':'comparisons.json','operators':'operators.json','safety':'safety.json'}.items()},'scope':'Current candidate checkpoint, not a release approval. Old source successes are retained separately; only QA-identical source correspondence may transfer the targeted fixed MP4.'}
write(A/'release-gate-manifest.json',manifest)
result=subprocess.run(['node',str(SOURCE/'dev/release_gates.cjs'),str(A/'release-gate-manifest.json')],stdout=subprocess.PIPE,stderr=subprocess.PIPE);g=json.loads(result.stdout);assert g['releaseSourceCommit']==HEAD and g['RELEASE_GO']!='PASS'
write(Q/'final-gates.json',g);write(OUT/'candidate-gates.json',g)
write(OUT/'context.json',{'applicationHead':HEAD,'runtimeArtifactSourceCommit':BEFORE,'runtimeRendererSHA256':b['rendererVersion'],'mainSHA':MAIN,'PR':13,'isDraft':True,'latestCI':run,'oldSource':old['sourceCommit'],'scope':'No merge/deploy/current-production generation has occurred. No automatic approval rejection; release conditions are not met.'})
write(A/'context.json',{'sourceCommit':HEAD,'mainSHA':MAIN,'releaseManifest':'release-gate-manifest.json','runtimeArtifactSourceCommit':BEFORE,'rendererSHA256':b['rendererVersion'],'currentImportantPopulationFinalized':False,'currentNaturalComparisonPopulationComplete':False,'historicalContext':ref(R/'release-d04c734-frozen/context.json'),'latestCI':run,'scope':'Only the measured saved-plan artifact transfers through exact QA-only Git correspondence. Historical d04 observations remain separately source-bound.'})
print({'sourceCommit':HEAD,'TECHNICAL_GO':g['TECHNICAL_GO'],'QUALITY_GO':g['QUALITY_GO'],'checks':g['checks'],'newMP4s':4})
