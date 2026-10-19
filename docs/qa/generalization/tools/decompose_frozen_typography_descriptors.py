"""Decompose the unchanged shipped descriptor; never alter scores or infer art grades."""
import pathlib,json,gzip,hashlib,math
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery'
def member(archive,name):
 m=json.load(open(R/archive/'archive-manifest.json'));e=next(x for x in m['files']if x['member']==name);p=Q/e['preserved'];b=p.read_bytes();b=gzip.decompress(b)if p.suffix=='.gz'else b;assert hashlib.sha256(b).hexdigest()==e['SHA256'];return json.loads(b),e['SHA256']
def describe(row):
 vec=row['decoded']['typographyVectors'];pairs=[]
 for a,b in zip(vec,vec[1:]):
  delta=[abs(x-y)for x,y in zip(a['vector'],b['vector'])];assert len(delta)==6;pairs.append({'lines':[a['line'],b['line']],'absoluteAxisDifferences':delta,'structuralFiveAxisSum':sum(delta[:5]),'withinPhraseMotionDifference':delta[5],'meanSixAxisDifference':sum(delta)/6})
 ds=sorted(x['meanSixAxisDifference']for x in pairs);tail=(.5*ds[math.floor((len(ds)-1)*.5)]+.5*sum(ds[:max(1,math.ceil(len(ds)*.2))])/max(1,math.ceil(len(ds)*.2)))if ds else None;score=math.floor(100*max(0,min(1,tail/.15))+.5)if tail is not None else None;assert score==row['decoded']['metrics']['typographyDiversity'],'UNCHANGED_DESCRIPTOR_RECONSTRUCTION_MISMATCH'
 return {'sourceCommit':row['provenance']['finalArtifactVerification']['binding']['sourceCommit'],'videoSHA256':row['sha256'],'originalScore':score,'vectors':vec,'pairs':pairs,'lowerTailDistance':tail}
def main():
 d=json.load(open(R/'grammar-policy-v2-three-version-comparison.json'));rows=[]
 specs=[(x['fixture'],x['currentArchive'],x['historicalCorrespondenceArchive'])for x in d['rows']]
 specs.append(('automatic-unseen-confirmation-20261018','grammar-policy-v2-independent-0','automatic-contract-independent-automatic-unseen-confirmation-20261018'))
 for cid,current,history in specs:
  now,ns=member(current,'matrix/'+cid+'-v3-row.json');old,ps=member(history,'previous/'+cid+'-v3-row.json');n,o=describe(now),describe(old);assert n['sourceCommit']=='d04c734bc5eb0c0c427a42a196cae3a507b89506'and o['sourceCommit']=='5e14682249ce690337874214f2ec76fc8e68fa26';assert now['decoded']['completed']and old['decoded']['completed'];pairs=[]
  if len(n['pairs'])==len(o['pairs']):
   for a,b in zip(o['pairs'],n['pairs']):
    assert a['lines']==b['lines'];pairs.append({'lines':a['lines'],'newMinusPreviousAbsoluteAxisDifferences':[y-x for x,y in zip(a['absoluteAxisDifferences'],b['absoluteAxisDifferences'])],'structuralFiveAxisSumChange':b['structuralFiveAxisSum']-a['structuralFiveAxisSum'],'withinPhraseMotionDifferenceChange':b['withinPhraseMotionDifference']-a['withinPhraseMotionDifference']})
  rows.append({'caseId':cid,'currentRowSHA256':ns,'previousRowSHA256':ps,'previous':o,'current':n,'pairDecomposition':pairs})
 report={'schema':1,'definitionSource':'src/11zzzz_observed_quality.js:13','definition':'Existing mean absolute six-axis pair difference, then unchanged lower-tail formula, divided by original.15 and clamped/rounded. Last axis is WITHIN-phrase alpha displacement difference BETWEEN phrases. Increasing one phrase motion can therefore reduce this diversity descriptor.','axes':['alphaOccupancy','centroidX','centroidY','occupiedWidth','occupiedHeight','withinPhraseAlphaDisplacement'],'scoresChanged':False,'artisticCalibration':False,'rows':rows,'limits':'Numeric decomposition of original descriptor only. It does not establish no major visual regression, independent semantic success or aesthetic quality. Line-based legacy descriptor vectors are not reused as internal-unit lyric safety evidence.'}
 (R/'grammar-policy-v2-typography-descriptor-decomposition.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'cases':len(rows),'declines':[{'case':x['caseId'],'previous':x['previous']['originalScore'],'current':x['current']['originalScore'],'decomposition':x['pairDecomposition']}for x in rows if x['current']['originalScore']<x['previous']['originalScore']]}))
if __name__=='__main__':main()
