"""Separate strict immutable-input controls from visual-only PCM-mismatched controls."""
import pathlib,json,gzip,hashlib,math,collections
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT/'composition-recovery'
def read(p):return json.loads(gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
refs={}
for mf in BASE.rglob('archive-manifest.json'):
    try:m=read(mf)
    except Exception:continue
    for f in m.get('files',[]):
        if f.get('member','').endswith('-reference.json') and 'preserved' in f:refs.setdefault(f['SHA256'],ROOT/f['preserved'])
rows=[]
for folder in sorted([*BASE.glob('effects5c92-*'),BASE/'original-failed-duo-component',BASE/'current-matched-duo-component']):
    for file in folder.rglob('effect-counterfactual-report.json.gz'):
        d=read(file);row={'report':str(file.relative_to(BASE)),'reportStoredSHA256':sha(file),'sourceCommit':d.get('build',{}).get('sourceCommit'),'originalVideoSHA256':d.get('originalVideoSHA256'),'planHash':d.get('planHash'),'referenceSHA256':d.get('referenceSHA256')}
        try:
            refFile=refs[d['referenceSHA256']];raw=gzip.decompress(refFile.read_bytes()) if refFile.suffix=='.gz' else refFile.read_bytes();assert hashlib.sha256(raw).hexdigest()==d['referenceSHA256'];ref=json.loads(raw);assert ref['planHash']==d['planHash']
            original=ref['inputSnapshot'];controlled=d['inputSnapshot'];different=sorted(k for k in original.keys()|controlled.keys() if original.get(k)!=controlled.get(k));proof=d['adoptedNativeProof'];assert proof['videoSHA256']==d['originalVideoSHA256'];n=math.floor((proof['profile']['range'][1]-proof['profile']['range'][0])*proof['profile']['fps']+.5);groups=[g for g in proof['groups'] if g['planHash']==d['planHash'] and len(g['frames'])==n];assert len(groups)==1
            expected=groups[0]['frames'];times={f['time'] for f in expected};assert len(times)==n
            modes={m['mode']:m for m in d['movies']};on=[f for f in modes['ON']['nativeFrameHashes'] if f['time'] in times];repeat=[f for f in modes['ON_REPEAT']['nativeFrameHashes'] if f['time'] in times];exact=len(on)==n and on==expected;repeatExact=len(repeat)==n and repeat==on
            row.update({'originalInputHash':original.get('inputHash'),'controlInputHash':controlled.get('inputHash'),'originalAudioHash':original.get('audioHash'),'controlAudioHash':controlled.get('audioHash'),'differingImmutableFields':different,'fullOutputNativeFrameCount':n,'actualOriginalNativeEquality':exact,'actualONRepeatNativeEquality':repeatExact,'allControlH264AACFullDecode':all(m['fullDecode']=='PASS' and any(s.get('codec_name')=='h264' for s in m['ffprobe']['streams']) and any(s.get('codec_name')=='aac' for s in m['ffprobe']['streams']) for m in modes.values()),'referenceEvidence':str(refFile.relative_to(ROOT)),'originalRawConfigurationUnchangedClaim':d.get('configurationUnchanged')})
            if not exact or not repeatExact:row['classification']='STALE_OR_UNMATCHED_NATIVE_ENVIRONMENT'
            elif not different:row['classification']='STRICT_ORIGINAL_INPUT_MATCHED'
            elif set(different)<= {'audioHash','inputHash'}:row['classification']='VISUAL_ONLY_FROZEN_NATIVE_EQUIVALENT_PCM_MISMATCH'
            else:row['classification']='UNVERIFIED_NONAUDIO_INPUT_MISMATCH'
            row['originalBlobRecertificationScope']='NOT_A_NEW_AUDIO_INPUT_CERTIFICATE' if different else 'Original immutable input matches; semantic interpretation still separate'
        except Exception as e:row.update(classification='UNVERIFIED_BINDING',error=str(e))
        rows.append(row)
result={'schema':1,'scope':'Audit of existing raw reports, not replacement data. A raw configurationUnchanged:true must not be interpreted as strict immutable-input equality when the old PCM hash differs. Full visual Native identity may support visual-only interpretation, but never a new audio/source-input certificate or full matched quality comparison. Old raw reports and failures remain untouched.','reports':rows,'counts':dict(collections.Counter(r['classification'] for r in rows)),'QUALITY_GO':'UNVERIFIED','human':'HUMAN_UNVERIFIED'}
(BASE/'effect-control-input-binding-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result['counts']))
