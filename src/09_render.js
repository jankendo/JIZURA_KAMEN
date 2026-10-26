/* Source-image support shared by preview, MP4 and PNG. Native JIZURA owns lyric rendering. */
(()=>{
const U=window.JIZURAUpstream;
class Renderer extends U.Renderer {
  constructor(){super();this.customBgBitmap=null;this.customBgSource='';}
  loadCustomBackground(source) {
    const task = (this._backgroundLoadQueue || Promise.resolve()).catch(() => {}).then(() => this.decodeCustomBackground(source));
    this._backgroundLoadQueue = task;
    return task;
  }

  async decodeCustomBackground(source) {
    if(this._assetsDisposed)return null;
    source = source || '';
    if (source === this.customBgSource && (this.customBgBitmap || !source)) return this.customBgBitmap;
    if (!source) {
      if (this.customBgBitmap && this.customBgBitmap.close) this.customBgBitmap.close();
      this.customBgBitmap = null; this.customBgSource = '';
      return null;
    }
    if (!/^data:image\/(?:png|jpeg|webp);base64,/i.test(source)) throw new Error('画像を読み込めませんでした');
    let next;
    try {
      if (typeof createImageBitmap === 'function') {
        const response = await fetch(source);
        if (!response.ok) throw new Error('画像を読み込めませんでした');
        next = await createImageBitmap(await response.blob());
      } else {
        next = new Image(); next.decoding = 'async'; next.src = source;
        if (next.decode) await next.decode();
        else await new Promise((resolve, reject) => { next.onload = resolve; next.onerror = reject; });
      }
      if (!next.width || !next.height) throw new Error('画像を読み込めませんでした');
    } catch (e) {
      if (next && next.close) next.close();
      throw new Error('画像を読み込めませんでした');
    }
    const prev = this.customBgBitmap;
    if(this._assetsDisposed){next.close?.();return null;}
    this.customBgBitmap = next; this.customBgSource = source;
    if (prev && prev.close) prev.close();
    return next;
  }

  drawCustomBackground(ctx, plan, t, tq, step, sc, scale, allowFilter) {
    const image=this.customBgBitmap,cfg=plan.customBg||{};
    if(!image||!cfg.enabled)return false;
    const rect=J.customBgGeometry(image.width,image.height,plan.W,plan.H,cfg);
    if(!rect)return false;
    const cut=J.cutAt(plan,tq);let cam=null;
    if(cut&&J.CAMERA[cut.cam]){try{cam=J.CAMERA[cut.cam].get(this.makeEnv(ctx,plan,cut,sc,{pass:'main',t:tq,lt:tq-cut.start,ltb:tq-cut.start,step,scale,allowFilter}),cut.camP||{});}catch{}}
    ctx.save();
    if(cam){ctx.translate(plan.W/2+(cam.x||0),plan.H/2+(cam.y||0));if(cam.rot)ctx.rotate(cam.rot*J.DEG);if(cam.skx)ctx.transform(1,0,Math.tan(cam.skx*J.DEG),1,0,0);ctx.scale((cam.s??1)*(cam.sx??1),(cam.s??1)*(cam.sy??1));ctx.translate(-plan.W/2,-plan.H/2);}
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    if(allowFilter&&rect.blur>0)ctx.filter=`blur(${(rect.blur*scale).toFixed(1)}px)`;
    ctx.drawImage(image,rect.x,rect.y,rect.w,rect.h);ctx.filter='none';
    const darkness=J.clamp(+cfg.darkness||0,0,.8);if(darkness){ctx.globalAlpha=darkness;ctx.fillStyle='#000';ctx.fillRect(rect.x,rect.y,rect.w,rect.h);}
    ctx.restore();return true;
  }
  makeEnv(...args){const env=super.makeEnv(...args);env.kamenPhoto=!!env.plan.customBg?.enabled&&!env.plan.keyBg;return env;}
  disposeAssets(){this._assetsDisposed=true;this.customBgBitmap?.close?.();this.customBgBitmap=null;this.customBgSource='';}
}
// Native layouts dispatch primary text directly through drawItem, including layered effects.
const drawItem=U.drawItem;
U.drawItem=(env,item)=>{
  const text=String(Array.isArray(item.text)?item.text.join(''):item.text||'').replace(/\s/gu,''),lyric=String(env.cut?.lineText||env.cut?.text||'').replace(/\s/gu,'');
  if(env.kamenPhoto&&!env.inLayer&&env.pass==='main'&&env.cut?.line>=0&&item.fill!==false&&item.ghost!==false&&text&&lyric.includes(text)){
    const edge=J.lum(item.color||env.sc.fg||'#fff')>.48?'0,0,0':'255,255,255';
    item={...item,stroke:Math.max(item.stroke||0,J.clamp((item.size||24)*.018,1,4)),strokeUnder:true,strokeColor:`rgba(${edge},.9)`,shadow:{...item.shadow,color:`rgba(${edge},.78)`,blur:Math.max(item.shadow?.blur||0,2),dx:0,dy:1}};
  }
  return drawItem(env,item);
};
J.Renderer=Renderer;
U.drawCustomBackground=(renderer,...args)=>renderer.drawCustomBackground?.(...args);
})();
