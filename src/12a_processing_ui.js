(() => {
'use strict';
J.processingErrorGuidance=s=>{
 const code=String(s.errorCode||s.error||'');
 if(/STALE_SONG_NATIVE_PLAN|INPUT_CHANGED|PLAN_CHANGED|TIMING_OR_LOCK|FINAL_PLAN_REQUIRES/.test(code))return '映像演出の整合性を確定できませんでした。入力と演出を確認してMVを作り直してください。保存済みデータを削除する処理は行っていません。';
 if(/保存|save|storage|quota|IndexedDB/i.test(code)||/保存/.test(s.title||''))return 'ブラウザーへの保存に失敗しました。空き容量を確認し、プロジェクト保存でバックアップしてください。';
 if(/画像|image|bitmap/i.test(code))return '画像素材を読み込めませんでした。画像ファイルを確認して選び直してください。';
 if(/ONSET|INSPECTION|OBSERVATION|検査|品質/.test(code)||s.stages?.[s.index]?.id==='quality')return '映像品質検査を完了できませんでした。再試行してください。解消しない場合はエラーの詳細を添えてお知らせください。';
 return /[ぁ-んァ-ヶ一-龠]/u.test(s.error||'')?s.error:'処理を完了できませんでした。再試行してください。';
};
J.mountProcessingUI=()=>{
  const host=document.getElementById('processingPanel');if(!host||host.dataset.mounted)return;
  host.dataset.mounted='true';const cards=new Map();let timer=0,heartbeat=0,lastPaint=0;
  const clock=s=>`${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
  function paint(){
    if(timer)clearTimeout(timer);timer=0;lastPaint=performance.now();
    const jobs=[...J.processing.jobs.values()],active=jobs.filter(s=>s.status==='running');
    // Autosaves are quiet unless unusually slow. A single card keeps the editor usable.
    const foreground=active.filter(s=>!s.compact),background=active.filter(s=>s.compact&&performance.now()-s.startTime>=1000);
    const outcomes=jobs.filter(s=>s.status!=='running'&&(!s.compact||s.status==='error'||s.status==='cancelled'));
    const selected=foreground.at(-1)||background.at(-1)||outcomes.at(-1),visible=selected?[selected]:[];
    for(const [id,card] of cards)if(!visible.some(s=>s.id===id)){card.remove();cards.delete(id);}
    host.hidden=!visible.length;
    for(const s of visible){
      let card=cards.get(s.id);
      if(!card){
        card=document.createElement('section');card.className='processing-card';
        card.innerHTML='<div class="processing-heading"><strong></strong><button type="button" class="processing-close" aria-label="処理結果を閉じる">閉じる</button></div><p class="processing-stage" role="status" aria-live="polite" aria-atomic="true"></p><div class="processing-summary"><span class="processing-percent"></span><span class="processing-time"></span></div><progress class="processing-total" max="100" value="0" aria-label="全体進捗"></progress><p class="processing-current"><span></span></p><p class="processing-heartbeat"></p><details><summary>詳細</summary><ol></ol></details><p class="processing-error" role="alert"></p><div class="processing-actions"><button class="processing-retry" type="button">再試行</button><button class="processing-cancel" type="button">中止</button></div>';
        card.querySelector('strong').textContent=s.title;
        card.querySelector('.processing-close').onclick=()=>s.handle.dismiss();
        card.querySelector('.processing-retry').onclick=()=>{s.handle.dismiss();s.retry?.();};
        card.querySelector('.processing-cancel').onclick=()=>{s.cancel?.();card.querySelector('.processing-cancel').disabled=true;};
        for(const stage of s.stages){const li=document.createElement('li');li.textContent=stage.label;card.querySelector('ol').appendChild(li);}
        host.appendChild(card);cards.set(s.id,card);
      }
      const view=J.processing.snapshot(s),running=s.status==='running',completed=s.status==='completed',percent=completed?100:Math.floor(view.fraction*100);
      card.dataset.status=s.status;
      const stageText=completed?'完了しました':s.status==='error'?`失敗した工程：${view.stage?.label||'準備'}`:s.status==='cancelled'?'処理を中止しました':view.stage?.label||'準備しています';
      const stageNode=card.querySelector('.processing-stage');if(stageNode.textContent!==stageText)stageNode.textContent=stageText;
      const unknown=running&&view.stage?.fraction==null;
      card.querySelector('.processing-percent').textContent=unknown?`工程 ${Math.min(view.completedSteps+1,view.totalSteps)} / ${view.totalSteps}`:`${percent}%`;
      card.querySelector('.processing-time').textContent=`経過 ${clock(view.elapsed)}`;
      const total=card.querySelector('.processing-total');if(unknown)total.removeAttribute('value');else total.value=percent;
      total.setAttribute('aria-valuetext',unknown?`${stageText}・完了 ${view.completedSteps} / ${view.totalSteps}工程`:`${percent}%`);
      const detail=card.querySelector('.processing-current span');detail.textContent=s.detail&&s.detail!==stageText?s.detail:'';
      card.querySelector('.processing-current').hidden=!detail.textContent;
      card.querySelector('.processing-heartbeat').textContent=running&&performance.now()-s.lastEvent>15000?'処理を続行しています…':'';
      [...card.querySelectorAll('li')].forEach((li,i)=>{const st=s.stages[i];li.textContent=`${st.status==='done'?'✓':st.status==='skipped'?'−':st.status==='running'?'●':st.status==='error'?'!':'○'} ${st.label}${st.status==='skipped'?'（対象外）':''}`;});
      card.querySelector('summary').textContent=active.length>1?`詳細（ほか ${active.length-1} 件を処理中）`:'詳細';
      card.querySelector('.processing-error').textContent=s.status==='error'?J.processingErrorGuidance(s):'';
      card.querySelector('.processing-close').hidden=running;
      card.querySelector('.processing-retry').hidden=!(s.status==='error'&&s.retry);
      card.querySelector('.processing-cancel').hidden=!(running&&s.cancel);
    }
    if(active.length){if(!heartbeat)heartbeat=setInterval(paint,1000);}else if(heartbeat){clearInterval(heartbeat);heartbeat=0;}
  }
  const unsubscribe=J.processing.subscribe(()=>{if(!timer)timer=setTimeout(paint,Math.max(0,150-(performance.now()-lastPaint)));});
  paint();
  return ()=>{unsubscribe();if(timer)clearTimeout(timer);if(heartbeat)clearInterval(heartbeat);for(const card of cards.values())card.remove();cards.clear();host.hidden=true;delete host.dataset.mounted;};
};
})();
