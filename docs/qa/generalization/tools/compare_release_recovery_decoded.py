"""Exact completed-movie equality only. Differences never imply aesthetic regression."""
import argparse,pathlib,json,subprocess,hashlib
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';O=R/'release-recovery-20261019';F=R/'release-d04c734-frozen'
def read(p):return json.loads(p.read_text())
def decoded(p,stream):
 r=subprocess.run(['ffmpeg','-v','error','-xerror','-threads','1','-i',str(p),'-map',stream,'-threads','1','-f','hash','-hash','sha256','-'],capture_output=True,text=True);assert r.returncode==0 and not r.stderr,r.stderr;return r.stdout.strip()
def inspect(source,h):
 p=Q/'media'/(h+'.mp4');assert hashlib.sha256(p.read_bytes()).hexdigest()==h
 clock=subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time,duration_time','-of','json',str(p)])
 return {'sourceCommit':source,'videoSHA256':h,'decodedVideoSHA256':decoded(p,'0:v:0'),'decodedAudioSHA256':decoded(p,'0:a:0'),'decodedVideoClocksSHA256':hashlib.sha256(clock).hexdigest()}
a=argparse.ArgumentParser();a.add_argument('case');n=a.parse_args();current=read(O/'current31-results'/n.case/'import.json');versions={'recovery':inspect(current['sourceCommit'],current['videoSHA256'])}
for version in ['main','previous','current']:
 d=read(F/'comparison-movies'/f'{n.case}-{version}.json');versions[version]=inspect(d['sourceCommit'],d['videoSHA256'])
comparisons=[]
for version in ['main','previous','current']:
 checks={k:versions[version][k]==versions['recovery'][k]for k in ['decodedVideoSHA256','decodedAudioSHA256','decodedVideoClocksSHA256']};comparisons.append({'reference':version,'checks':checks,'result':'EXACT_DECODED_OUTPUT_UNCHANGED'if all(checks.values())else'DIFFERENT_REQUIRES_ADJUDICATION'})
target=O/'current31-decoded-comparisons';target.mkdir(exist_ok=True);p=target/(n.case+'.json');p.write_text(json.dumps({'caseId':n.case,'versions':versions,'comparisons':comparisons,'scope':'All actual decoded video/audio bytes and video frame clocks. Equality proves no completed-output difference against that reference; inequality alone is not a significant-regression verdict. No threshold or semantic release credit.'},indent=2)+'\n');print(n.case,comparisons)
