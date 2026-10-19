"""Import exact current-source Actions bytes; never adjudicate creative regression."""
import argparse,gzip,hashlib,json,pathlib,shutil,zipfile,math
Q=pathlib.Path(__file__).resolve().parents[1]
OUT=Q/'composition-recovery/release-recovery-20261019'
def sha(b):return hashlib.sha256(b).hexdigest()
def raw(p):return gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes()
def read(p):return json.loads(raw(p))
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def main():
 a=argparse.ArgumentParser();a.add_argument('case');a.add_argument('artifact_id',type=int);a.add_argument('archive',type=pathlib.Path);n=a.parse_args()
 spec=read(OUT/'current32-frozen-inputs.json');fixtures={f['id']:f for f in spec['fixtures']};assert n.case in fixtures
 destination=OUT/'current31-results'/n.case;destination.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(n.archive)as z:
  for name in z.namelist():assert not pathlib.PurePosixPath(name).is_absolute()and'..'not in pathlib.PurePosixPath(name).parts,'UNSAFE_ARCHIVE_PATH'
  z.extractall(destination)
 matrix=destination/'matrix';rowfile=matrix/(n.case+'-v3-row.json.gz');row=read(rowfile);assert row['status']=='PASS'and row['variant']=='v3'and row['fixture']==fixtures[n.case]
 fav=row['provenance']['finalArtifactVerification'];b=fav['binding'];assert b['sourceCommit']==spec['sourceCommit']and b['sourceDirty']is False and fav['status']=='MEASURED'and not fav['failures']
 movie=matrix/(n.case+'-v3.mp4');assert sha(movie.read_bytes())==row['sha256']==b['videoSHA256']
 reference=matrix/(row['referenceInputs']['file']+'.gz');wav=matrix/row['referenceInputs']['audioFile'];assert sha(raw(reference))==row['referenceInputs']['sha256']and sha(wav.read_bytes())==row['referenceInputs']['audioSHA256']
 correspondence=read(destination/'original-input-correspondence.json.gz');assert correspondence['status']=='MATCHED'and len(correspondence['records'])==1
 checks=correspondence['records'][0];assert checks['fixture']==n.case and checks['actualBinding']==b and all(v is True for v in checks['checks'].values())
 old=next(c for c in spec['expectedOriginalConditions']if c['fixture']==n.case);assert row['input']==old['input']and row['sourceInvariant']['pcmHash']==old['pcmHash']and b['outputProfile']==old['outputProfile']
 decoded=read(destination/'strict-decode.json.gz');assert decoded['count']==1
 record=decoded['entries'][0];assert record['videoSHA256']==b['videoSHA256']and record['binding']==b and record['completeDecode']=='PASS'and not record['stderr']
 tracefile=destination/'dispatch'/n.case/'native-dispatch-trace.json.gz';trace=read(tracefile);assert trace['exactNativeRGBA']is True and trace['artifactBinding']==b and trace['referenceSHA256']==row['referenceInputs']['sha256']
 proof=row['nativeOutputProof'];assert proof['videoSHA256']==b['videoSHA256']and proof['selectedPlanHash']==b['planHash']and proof['profile']==b['outputProfile']
 frames=math.floor((b['outputProfile']['range'][1]-b['outputProfile']['range'][0])*b['outputProfile']['fps']+.5);groups=[g for g in proof['groups']if g['planHash']==b['planHash']and len(g['frames'])==frames];assert len(groups)==1 and len({f['time']for f in groups[0]['frames']})==frames and groups[0]['frames']==trace['nativeFrameHashes'],'EXACT_COMPLETE_NATIVE_OUTPUT_REQUIRED'
 shutil.copyfile(movie,Q/'media'/(b['videoSHA256']+'.mp4'))
 imported={'caseId':n.case,'sourceCommit':spec['sourceCommit'],'artifactId':n.artifact_id,'runId':39244958536,'archiveSHA256':sha(n.archive.read_bytes()),'videoSHA256':b['videoSHA256'],'binding':b,'inputCorrespondence':'MATCHED','nativeReplay':'EXACT','finalArtifactVerification':fav['status'],'fullDecode':'PASS','referenceSHA256':row['referenceInputs']['sha256'],'traceSHA256':sha(tracefile.read_bytes()),'rawRowSHA256':sha(rowfile.read_bytes()),'importantSemanticProof':'UNVERIFIED','significantRegression':None,'scope':'Completed current-source natural selection and real movie. Semantic/relative creative adjudication is not inferred from technical success.'}
 write(destination/'import.json',imported)
 imports=[read(p)for p in sorted((OUT/'current31-results').glob('*/import.json'))]
 write(OUT/'current31-import-summary.json',{'sourceCommit':spec['sourceCommit'],'runId':39244958536,'expected':len(fixtures),'formalComparisonConditions':31,'imported':len(imports),'complete':len(imports)==len(fixtures),'remainingCaseIds':sorted(set(fixtures)-{r['caseId']for r in imports}),'records':imports,'releaseCredit':False})
 print(json.dumps({'case':n.case,'imported':len(imports),'input':'MATCHED','native':'EXACT','semantic':'UNVERIFIED'}))
if __name__=='__main__':main()
