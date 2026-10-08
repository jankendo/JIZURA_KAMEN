/* Optional progress events are scoped per call, including nested pixel audits. */
(() => {
'use strict';
const analyze=J.analyzeRenderedFrames;
J.analyzeRenderedFrames=async(plan,range,audio,telemetry={})=>{
  let own;
  if(!telemetry.onProgress){
    own=J.processing.begin('映像の品質を検査しています',[['quality','映像・歌詞・動き・画像を検査しています',1]]);
    own.enter('quality');telemetry={onProgress:e=>own.observe(e.current,e.total,[e.label,e.detail,e.total?`${e.current} / ${e.total}`:''].filter(Boolean).join(' · '))};
  }
  try{const result=await analyze(plan,range,audio,telemetry);if(own){if(result.completed)own.complete('映像の検査が完了しました');else own.fail(new Error('この環境では画質検査を完了できませんでした'));}return result;}
  catch(error){own?.fail(error);throw error;}
};
const optimize=J.optimizeDirectionCandidatesRendered;
J.optimizeDirectionCandidatesRendered=async(project,audio,image,max=3,telemetry={})=>{
  let own;
  if(!telemetry.onProgress){own=J.processing.begin('演出案を作成しています',[['direction','歌詞・曲構成・演出案を生成・検査しています',1]]);own.enter('direction');telemetry={onProgress:e=>own.update(null,null,[e.label,e.detail].filter(Boolean).join(' · '))};}
  try{const result=await optimize(project,audio,image,max,telemetry);own?.complete('演出案を作成しました');return result;}catch(error){own?.fail(error);throw error;}
};
J.audioProgressStages=[['read','音源ファイルを読み込んでいます',3],['decode','音源をデコードしています',12],['wave','波形・音楽の強弱・アタックを解析しています',20],['beat','BPMと拍の位置を解析しています',10],['spectrum','周波数・曲の展開を解析しています',45],['features','音楽の特徴量をまとめています',5],['save','音源と解析後のプロジェクトを保存しています',5]];
J.audioProgressEvent=task=>e=>{task.enter(e.stage);task.update(e.current,e.total,e.detail+(e.total?` · ${e.current} / ${e.total}`:''));};
})();
