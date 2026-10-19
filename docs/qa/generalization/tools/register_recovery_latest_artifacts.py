"""Normalize only actual latest-source decoded files; preserve original bindings."""
import pathlib,json,gzip,hashlib,os,subprocess
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';A=R/'release-current-head';O=R/'release-recovery-20261019';C=O/'official-ci-0a5c896f';S='0a5c896fcf1a734b4f18d3f2467c285ba7c6a1fc';M='5a38c44766a7a9cb6289d61374bb6257ce2a76e1'
def read(p):return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def ref(p):return {'path':os.path.relpath(p,A),'sha256':sha(p)}
def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');return ref(p)
raw=pathlib.Path('/workspace/current-ci-39257690138/full-decode.json');decode=read(raw);write(C/'independent-full-decode.json',decode)
ui=read(C/'kamen-browser-qa/report.json.gz');retry=read(C/'kamen-browser-qa/cancellation-retry/results.json.gz')['rows'][0];fontRoot=O/'variable-font-browser-0a5c896f';font=read(fontRoot/'report.json.gz')
items=[('latest-ci-ui-save',ui['provenance']['finalArtifactVerification']['binding'],ref(C/'independent-full-decode.json')),('latest-ci-cancel-retry',retry['provenance']['finalArtifactVerification']['binding'],ref(C/'independent-full-decode.json')),('latest-variable-font-export',font['provenance']['finalArtifactVerification']['binding'],ref(fontRoot/'report.json.gz'))];movies=[]
for ident,b,rawref in items:
 h=b['videoSHA256'];assert b['sourceCommit']in[S,M]and b['sourceDirty']is False and sha(Q/'media'/(h+'.mp4'))==h
 if ident.startswith('latest-ci'):assert any(r['videoSHA256']==h and r['fullDecodeExitCode']==0 and not r['stderr']for r in decode)
 else:assert font['independentFullDecode']=='PASS'
 observation=write(A/'finished-artifact-observations'/(ident+'.json'),{'sourceCommit':b['sourceCommit'],'binding':b,'videoSHA256':h,'decodeComplete':True,'decodeExitCode':0,'raw':rawref})
 movies.append({'id':ident,'decodeComplete':True,'decodeExitCode':0,'hashMatches':True,'hasAudio':True,'hasVideo':True,'codecVideo':'h264','codecAudio':'aac',**{k:b[k]for k in ['videoSHA256','inputHash','planHash','outputProfile','rendererVersion','selectedCandidateId']},'observation':observation})
art=read(A/'finished-artifacts.json');art['movies']=movies;write(A/'finished-artifacts.json',art)
context=read(A/'context.json');context['latestCI']={'conclusion':'success','status':'completed','headSha':S,'url':'https://github.com/jankendo/JIZURA_KAMEN/actions/runs/39257690138'};context['currentImportantPopulationFinalized']=False;write(A/'context.json',context)
manifest=read(A/'release-gate-manifest.json')
for key in ['ci','tests','browser','comparisons','operators','safety','artifacts']:
 p=A/('finished-artifacts.json'if key=='artifacts'else key+'.json');manifest['evidence'][key]=ref(p)
write(A/'release-gate-manifest.json',manifest)
r=subprocess.run(['node','/workspace/kamen-release/dev/release_gates.cjs',str(A/'release-gate-manifest.json')],capture_output=True,text=True);g=json.loads(r.stdout);assert g['releaseSourceCommit']==S and g['TECHNICAL_GO']=='PASS'and g['RELEASE_GO']!='PASS';write(Q/'final-gates.json',g);write(O/'candidate-gates.json',g)
remaining=read(R/'grammar-policy-v2-remaining-release-conditions.json');remaining.update({k:g[k]for k in ['TECHNICAL_GO','QUALITY_GO','RELEASE_GO']});remaining['releaseSourceCommit']=S;remaining['currentManifest']['sha256']=sha(A/'release-gate-manifest.json');remaining['currentNaturalCollection']={'runs':[39244958536,39246207521],'expectedComparisonConditions':31,'expectedIntentCoverageConditions':32,'importedConditions':32,'sourceFrozen':'5eb02e6fba86c2104711894dc894b461d2fae922','latestReleaseSource':S,'complete':True,'semanticCredit':False,'latestSourceTransfer':'UNVERIFIED; no single-case correspondence used to transfer all natural films.'};write(R/'grammar-policy-v2-remaining-release-conditions.json',remaining)
print({k:g[k]for k in ['releaseSourceCommit','TECHNICAL_GO','QUALITY_GO','RELEASE_GO']})
