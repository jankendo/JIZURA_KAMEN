"""Adapt an authenticated local current-renderer capture, preserving cohort identity."""
import argparse, gzip, hashlib, json, os, pathlib

def main():
    a=argparse.ArgumentParser();a.add_argument('capture');a.add_argument('audio');a.add_argument('output')
    n=a.parse_args();capture=pathlib.Path(n.capture);out=pathlib.Path(n.output);out.mkdir(parents=True,exist_ok=True)
    r=json.load(gzip.open(capture/'report.json.gz'));fav=r['provenance']['finalArtifactVerification'];b=fav['binding']
    assert r['scope']=='HISTORICAL_NATURALLY_SELECTED_PLAN_CURRENT_PUBLIC_API_EXPORT_COMPATIBILITY'
    assert not r['freshAutomaticSelection'] and r['locksUnchanged'] and r['independentFullDecode']=='PASS'
    assert fav['status']=='MEASURED' and b['sourceCommit']=='d04c734bc5eb0c0c427a42a196cae3a507b89506'
    assert r['nativeOutputProof']['selectedPlanHash']==b['planHash']==r['adoptedReference']['planHash']
    sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
    assert sha(capture/'current.mp4')==b['videoSHA256']==r['videoSHA256']
    assert sha(n.audio)==r['audioSHA256']
    case='historical-natural-photo-development-15';variant='current';prefix=case+'-'+variant
    reference=out/(prefix+'-reference.json');reference.write_text(json.dumps(r['adoptedReference'],ensure_ascii=False,separators=(',',':')))
    for src,dst in [(capture/'current.mp4',out/(prefix+'.mp4')),(pathlib.Path(n.audio),out/(prefix+'-input.wav'))]:
        if not dst.exists():os.link(src,dst)
        assert sha(src)==sha(dst)
    row={'fixture':{'id':case},'variant':variant,'status':'PASS','statusScope':'Completed current-renderer compatibility artifact, not fresh automatic selection or QUALITY_GO',
         'directionSelectionMethod':r['scope'],'freshAutomaticSelection':False,'historicalSourceCommit':r['historicalSourceCommit'],'historicalVideoSHA256':r['historicalVideoSHA256'],
         'sha256':r['videoSHA256'],'provenance':r['provenance'],'validation':r['validation'],'nativeOutputProof':r['nativeOutputProof'],
         'referenceInputs':{'file':reference.name,'sha256':sha(reference),'audioFile':prefix+'-input.wav','audioSHA256':r['audioSHA256']}}
    target=out/(prefix+'-row.json');target.write_text(json.dumps(row,ensure_ascii=False,separators=(',',':')))
    print(json.dumps({'case':case,'variant':variant,'rowSHA256':sha(target),'referenceSHA256':sha(reference),'freshAutomaticSelection':False}))

if __name__=='__main__':main()
