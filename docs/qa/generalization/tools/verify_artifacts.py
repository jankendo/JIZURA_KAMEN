"""Replay strict full-decode/hash checks; PASS applies only to listed completed videos."""
import argparse, hashlib, json, subprocess
from pathlib import Path
parser = argparse.ArgumentParser()
parser.add_argument('results_directory', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
rows = json.loads((args.results_directory/'results.json').read_text())['rows']
verified = []
for row in rows:
    fixture = row['fixture']
    video = args.results_directory/(fixture['id']+'-'+row['variant']+'.mp4')
    digest = hashlib.sha256(video.read_bytes()).hexdigest()
    assert digest == row['sha256'], 'Video changed after observation'
    binding = row['provenance']['finalArtifactVerification']['binding']
    assert digest == binding['videoSHA256'], 'QA belongs to another video'
    probe = subprocess.run(['ffprobe','-v','error','-count_frames','-show_streams','-of','json',str(video)],capture_output=True,text=True,check=True)
    assert not probe.stderr.strip(), probe.stderr
    streams = json.loads(probe.stdout)['streams']
    v = next(s for s in streams if s['codec_type']=='video')
    a = next(s for s in streams if s['codec_type']=='audio')
    assert v['codec_name']=='h264' and a['codec_name']=='aac'
    assert [v['width'],v['height']]==binding['outputProfile']['resolution']
    assert v['avg_frame_rate']==str(binding['outputProfile']['fps'])+'/1'
    expected = round((binding['outputProfile']['range'][1]-binding['outputProfile']['range'][0])*binding['outputProfile']['fps'])
    assert int(v['nb_read_frames'])==expected, (v['nb_read_frames'],expected)
    assert abs(float(v['duration'])-float(a['duration'])) < .15
    decode = subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(video),'-map','0:v:0','-map','0:a:0','-f','null','-'],capture_output=True,text=True)
    assert decode.returncode==0 and not decode.stderr.strip(), decode.stderr
    verified.append({'fixture':fixture['id'],'variant':row['variant'],'videoSHA256':digest,'binding':binding,'frames':expected,'codec':'H.264/AAC','completeDecode':'PASS','stderr':'','lyricSafety':row['provenance']['finalArtifactVerification']['status']})
args.output.write_text(json.dumps({'scope':'Only completed, hash-bound listed artifacts; not pending fixtures or artistic quality','count':len(verified),'entries':verified},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'completeDecode':len(verified),'failures':0}))
