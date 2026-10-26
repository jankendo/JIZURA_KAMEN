/* One seconds-based range contract for UI, preview and all export backends. */
(()=>{'use strict';
J.validateExportRange=(range,duration,fps=30)=>{
 const invalid=error=>({valid:false,error,range:null});
 if(!Number.isFinite(duration)||duration<=0)return invalid('音源を読み込んでください。');
 if(!range||!Number.isFinite(range.start)||!Number.isFinite(range.end))return invalid('開始秒と終了秒を入力してください。');
 const {start,end}=range;
 if(start<0||end<0||start>duration||end>duration+1e-9)return invalid('音源の長さの範囲内で指定してください。');
 if(end<=start)return invalid('終了秒は開始秒より後にしてください。');
 if(!Number.isFinite(fps)||fps<=0)return invalid('フレームレートを確認してください。');
 if(end-start+1e-9<1/fps)return invalid(`範囲を1フレーム以上（${(1/fps).toFixed(3)}秒以上）にしてください。`);
 return {valid:true,error:'',range:{start,end:Math.min(end,duration)},frames:Math.max(1,Math.round((end-start)*fps)),seconds:end-start};
};
J.requireExportRange=(range,plan,audio)=>{
 const duration=Math.min(plan.duration,audio?.duration??plan.duration),value=J.validateExportRange(range??{start:0,end:duration},duration,plan.fps);
 if(!value.valid)throw Object.assign(new Error('EXPORT_RANGE: '+value.error),{code:'EXPORT_RANGE'});
 return Object.freeze(value.range);
};
})();
