"""Localize six mismatches after complete native RGBA identity, preserving failures."""
import pathlib,json,subprocess,re,hashlib
Q=pathlib.Path('/workspace/kamen-evidence/docs/qa/generalization');O=pathlib.Path('/workspace/release-audit/encoded-mismatches');O.mkdir(exist_ok=True)
reports=json.load(open('/workspace/release-audit/control-audit.json'))['reports'];cases={}
for r in reports:
 if not r['strictOriginalDecodedIdentity']:cases.setdefault(r['caseId'],r)
def observe(h,cid,mode):
 file=Q/'media'/(h+'.mp4');probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_streams','-show_packets','-show_entries','stream=codec_name,profile,width,height,pix_fmt,color_range,color_space,color_transfer,color_primaries,nb_frames,avg_frame_rate:packet=pts_time,dts_time,duration_time,flags,size,data_hash','-show_data_hash','sha256','-of','json',str(file)]))
 r=subprocess.run(['ffmpeg','-v','verbose','-i',str(file),'-map','0:v:0','-c','copy','-bsf:v','trace_headers','-f','null','-'],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 assert r.returncode==0
 keys=['pic_init_qp_minus26','slice_qp_delta','slice_type','colour_primaries','transfer_characteristics','matrix_coefficients','video_full_range_flag']
 fields={k:[int(v)for v in re.findall(r'\b'+k+r'\s+[^\n]*?=\s*(-?\d+)\s*$',r.stderr,re.M)]for k in keys}
 result={'videoSHA256':h,'probe':probe,'h264Fields':fields};(O/(cid+'-'+mode+'-codec.json')).write_text(json.dumps(result,indent=2)+'\n');return result
rows=[]
for cid,r in cases.items():
 original=observe(r['original']['sha256'],cid,'ORIGINAL');modes={m['mode']:m for m in r['movies']};pairs=[]
 for mode in ['ON','ON_REPEAT']:
  control=observe(modes[mode]['media']['sha256'],cid,mode);a=original['probe']['packets'];b=control['probe']['packets']
  clocks=lambda p:[{k:v for k,v in x.items()if k in ['pts_time','dts_time','duration_time','flags']}for x in p]
  headerEqual=original['probe']['streams']==control['probe']['streams']
  frameClocksEqual=clocks(a)==clocks(b)
  packetChanged=[i for i,(x,y)in enumerate(zip(a,b))if x.get('data_hash')!=y.get('data_hash')]
  qa=original['h264Fields']['slice_qp_delta'];qb=control['h264Fields']['slice_qp_delta'];changedQP=[i for i,(x,y)in enumerate(zip(qa,qb))if x!=y]
  stats=O/(cid+'-'+mode+'-psnr.txt');run=subprocess.run(['ffmpeg','-v','info','-i',r['original']['path'],'-i',modes[mode]['media']['path'],'-filter_complex','[0:v][1:v]psnr=stats_file='+str(stats),'-an','-f','null','-'],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  assert run.returncode==0;line=next((l for l in run.stderr.splitlines()if 'PSNR y:'in l),None)
  pairs.append({'mode':mode,'videoSHA256':control['videoSHA256'],'streamPropertiesEqual':headerEqual,'actualPacketClocksEqual':frameClocksEqual,'originalPackets':len(a),'controlPackets':len(b),'changedCodedPackets':len(packetChanged),'firstChangedCodedPacket':packetChanged[0]if packetChanged else None,'originalQPSlices':len(qa),'controlQPSlices':len(qb),'changedQPSlices':len(changedQP),'firstChangedQPSlice':changedQP[0]if changedQP else None,'PSNR':line,'perFramePSNRFile':str(stats),'perFramePSNRSHA256':hashlib.sha256(stats.read_bytes()).hexdigest()})
 row={'caseId':cid,'sourceCommit':r['sourceCommit'],'sourceNativeRGBAExactForAllOutputFrames':r['nativeONAndRepeatEqualOriginal'],'originalDecodedSHA256':r['originalDecodedSHA256'],'onDecodedSHA256':r['onDecodedSHA256'],'strictOriginalDecodedIdentity':False,'pairs':pairs,'localization':'The saved opaque-canvas RGBA agrees over the complete output. The first observed difference lies downstream in the coded stream. Slice quantization/header evidence is recorded separately; exact cause inside VideoFrame conversion versus the encoder backend is not inferred from glyph agreement.','releaseCredit':False};rows.append(row);print(cid,pairs,flush=True)
(O/'summary.json').write_text(json.dumps({'schema':1,'rows':rows,'newMP4sGenerated':0,'reasonForAdditionalDecoding':'Full-frame PSNR and H264 headers needed to localize the six known mismatches; previous complete-decode success remains reused.'},indent=2)+'\n')
