/* ============================================================
   JIZURA — frame renderer: background, chroma passes, HUD, post FX
   ============================================================ */
(() => {
'use strict';
const E = J.E;

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };

J.cutAt = (plan, t) => {
  const cs = plan.cuts; let lo = 0, hi = cs.length - 1, ans = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (cs[m].start <= t) { ans = m; lo = m + 1; } else hi = m - 1; }
  if (ans < 0) return null;
  const c = cs[ans];
  return t < c.end ? c : null;
};

// Keep the drawing clock, but never quantise an active lyric back before its LRC onset.
J.renderTimeWithLyricBoundary=(plan,t,stepDur)=>{const quantised=Math.floor(t/stepDur+1e-6)*stepDur,cut=J.cutAt(plan,t);return cut?.line>=0&&quantised<cut.start?cut.start:quantised;};

J.proceduralTextureVersion = 'seeded-procedural-texture-v1';
class Renderer {
  constructor() {
    this.scratch = mk(2, 2); this.small = mk(2, 2); this.tiny = mk(2, 2);
    this.grain = []; this.textureSeed = null;
    const sl = mk(1, 4), sx = sl.getContext('2d'); sx.fillStyle = '#fff'; sx.fillRect(0, 0, 1, 4); sx.fillStyle = '#000'; sx.fillRect(0, 3, 1, 1);
    this.scan = sl;
    this.paperCache = new Map();
    this.customBgBitmap = null;
    this.customBgSource = '';
    this.filterOK = (() => { try { const c = mk(4, 4).getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch (e) { return false; } })();
  }

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
    const image = this.customBgBitmap, cfg = plan.customBg || {}, cut=J.cutAt(plan,tq), scene=cut?.backgroundScene||null;
    if (!image || !image.width || !image.height) return false;
    const W = plan.W, H = plan.H;
    const chapter=plan.styleArc?.segments?.find(s=>t>=s.from&&t<s.to),phase=chapter&&!plan.musicalPhoto?J.clamp((t-chapter.from)/Math.max(.1,chapter.to-chapter.from)):0;
    const sceneCfg=scene?Object.assign({},cfg,{zoom:J.clamp((+cfg.zoom||1)*(scene.zoom||1)*(1+.025*phase),.5,3),x:J.clamp((+cfg.x||0)+(scene.x||0)+(scene.id==='tight'?2:-1.5)*phase,0,100),y:J.clamp((+cfg.y||0)+(scene.y||0)+phase*.8,0,100),blur:J.clamp((+cfg.blur||0)+(scene.blur||0),0,18),darkness:J.clamp((+cfg.darkness||0)+(scene.darkness||0),0,.8)}):cfg;
    const rect = J.customBgGeometry(image.width, image.height, W, H, sceneCfg);
    if (!rect) return false;
    const { x: dx, y: dy, w: dw, h: dh, blur } = rect;
    let cam = null;
    cam=J.cameraAt?.(plan,t,this.renderRange)||null;
    if (!cam&&cut && J.CAMERA[cut.cam]) {
      try {
        const env = this.makeEnv(ctx, plan, cut, sc, { pass: 'main', t: tq, lt: tq - cut.start, ltb: tq - cut.start, step, scale, allowFilter });
        cam = J.CAMERA[cut.cam].get(env, cut.camP || {}) || null;
      } catch (e) { cam = null; }
    }
    ctx.save();
    if (cam) {
      ctx.translate(W / 2 + (cam.x || 0), H / 2 + (cam.y || 0));
      if (cam.rot) ctx.rotate(cam.rot * J.DEG);
      if (cam.skx) ctx.transform(1, 0, Math.tan(cam.skx * J.DEG), 1, 0, 0);
      const cs = cam.s ?? 1;
      ctx.scale(cs * (cam.sx ?? 1), cs * (cam.sy ?? 1));
      ctx.translate(-W / 2, -H / 2);
    }
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (allowFilter && scene?.filter) ctx.filter=scene.filter;
    if (this.filterOK && blur > 0) ctx.filter = `${ctx.filter&&ctx.filter!=='none'?ctx.filter+' ':''}blur(${(blur * scale).toFixed(1)}px)`;
    ctx.drawImage(image, dx, dy, dw, dh);
    ctx.filter = 'none';
    const darkness = J.clamp(+sceneCfg.darkness || 0, 0, 0.8);
    if (darkness > 0) { ctx.globalAlpha = darkness; ctx.fillStyle = '#000000'; ctx.fillRect(dx, dy, dw, dh); }
    if(allowFilter&&scene?.tint){ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.1;ctx.fillStyle=scene.tint;ctx.fillRect(dx,dy,dw,dh);}
    if(scene?.lightSweep){const p=(t*.22+scene.phase)%1,grad=ctx.createLinearGradient(-W*.15+p*W,H*.15,W*.15+p*W,H*.85);
      grad.addColorStop(0,'rgba(255,255,255,0)');grad.addColorStop(.5,`rgba(255,255,255,${scene.lightSweep})`);grad.addColorStop(1,'rgba(255,255,255,0)');
      ctx.globalCompositeOperation='screen';ctx.globalAlpha=1;ctx.fillStyle=grad;ctx.fillRect(dx,dy,dw,dh);}
    if(scene?.id==='graphic'){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.13;ctx.fillStyle=sc.accent||'#fff';ctx.fillRect(0,H*.13,W*.018,H*.74);ctx.fillRect(W*.96,H*.13,W*.018,H*.74);}
    ctx.restore();
    return true;
  }

  setTextureSeed(seed) {
    this.grain ??= []; this.paperCache ??= new Map();
    const normalized = Number.isFinite(seed) ? seed >>> 0 : 0;
    if (this.textureSeed === normalized && this.grain.length === 4) return;
    for (const canvas of [...this.grain, ...this.paperCache.values()]) canvas.width = canvas.height = 1;
    this.grain = []; this.paperCache.clear(); this.textureSeed = normalized;
    for (let k = 0; k < 4; k++) {
      const random = J.rng(J.h(normalized, 0x47524149, k)), g = mk(256, 256), x = g.getContext('2d'), id = x.createImageData(256, 256);
      for (let i = 0; i < id.data.length; i += 4) { const v = random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      x.putImageData(id, 0, 0); this.grain.push(g);
    }
  }

  paper(W, H) {
    const key = (this.textureSeed ?? 0) + ':' + W + 'x' + H, random = J.rng(J.h(this.textureSeed ?? 0, W, H, 0x50415045));
    let p = this.paperCache.get(key);
    if (p) return p;
    const w = Math.round(W / 2), h = Math.round(H / 2);
    p = mk(w, h); const x = p.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    const lo = mk(Math.ceil(w / 24), Math.ceil(h / 24)), lx = lo.getContext('2d'), ld = lx.createImageData(lo.width, lo.height);
    for (let i = 0; i < ld.data.length; i += 4) { const v = 225 + random() * 30; ld.data[i] = v; ld.data[i + 1] = v - 2; ld.data[i + 2] = v - 6; ld.data[i + 3] = 255; }
    lx.putImageData(ld, 0, 0);
    x.imageSmoothingEnabled = true; x.globalAlpha = 0.9; x.drawImage(lo, 0, 0, w, h); x.globalAlpha = 1;
    const id = x.getImageData(0, 0, w, h);
    for (let i = 0; i < id.data.length; i += 4) { const n = (random() - 0.5) * 22; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
    x.putImageData(id, 0, 0);
    x.strokeStyle = 'rgba(120,110,100,0.18)'; x.lineWidth = 0.7;
    for (let i = 0; i < 900; i++) { const X = random() * w, Y = random() * h, a = random() * J.TAU, L = 4 + random() * 14; x.beginPath(); x.moveTo(X, Y); x.quadraticCurveTo(X + Math.cos(a + 0.5) * L / 2, Y + Math.sin(a + 0.5) * L / 2, X + Math.cos(a) * L, Y + Math.sin(a) * L); x.stroke(); }
    x.fillStyle = 'rgba(60,50,40,0.25)';
    for (let i = 0; i < 1400; i++) { x.fillRect(random() * w, random() * h, random() * 1.6, random() * 1.6); }
    this.paperCache.set(key, p);
    return p;
  }

  ensure(c, w, h) { if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; }

  /* main entry: draw frame at time t into ctx (canvas px = design * scale) */
  frame(ctx, plan, t, opt = {}) {
    this.setTextureSeed(plan.seed);
    this.editorDebug = opt.editorDebug === true && opt.production !== true;
    this._productionFrame = opt.production === true;
    this.renderRange=opt.range||null;
    const W = plan.W, H = plan.H, scale = opt.scale || 1;
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    this.lyricAuditCtx=opt.lyricAuditCtx||null;
    this.lyricAuditItems=opt.lyricAuditItems||null;
    if(this.lyricAuditCtx){const a=this.lyricAuditCtx;a.save();a.setTransform(1,0,0,1,0,0);a.clearRect(0,0,a.canvas.width,a.canvas.height);a.restore();}
    const fx = plan.fx, st = plan.style, fps = plan.fps;
    // motion is quantised to 'koma' drawings per second (24fps timebase); random flicker runs on a <=24Hz clock
    const stepDur = J.stepDur(fx, fps);
    const clock = J.komaOf(fx) > 0 ? stepDur : 1 / 24;
    const tq = J.renderTimeWithLyricBoundary(plan,t,stepDur);
    const mainCut = J.cutAt(plan, tq);
    const mainStyle=mainCut?.style||st;
    const sc = mainStyle.schemes[mainCut ? mainCut.scheme % mainStyle.schemes.length : 0] || mainStyle.schemes[0];
    const allowFilter = this.filterOK && !opt.fast;
    if (J.setLang) J.setLang(plan.lang || 'ja');           // faces follow the plan's lyric language
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
    ctx.clearRect(0, 0, cw, ch);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    // ---------- background ----------
    const key = plan.keyBg && J.KEY_BG && J.KEY_BG[plan.keyBg] ? plan.keyBg : null;   // 合成用: white-on-black, finished in keyFinish()
    const customBgOn = !key && !opt.transparent && plan.customBg && plan.customBg.enabled && this.customBgBitmap;
    if (key && !opt.transparent) { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); }
    else if (!opt.transparent) {
      ctx.fillStyle = sc.bg; ctx.fillRect(0, 0, W, H);
      if (customBgOn) this.drawCustomBackground(ctx, plan, t, tq, Math.floor(tq / clock + 1e-6), sc, scale, allowFilter);
      const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H / 2, Math.hypot(W, H) * 0.6);
      const lift = customBgOn ? 'rgba(255,255,255,0.025)' : (J.lum(sc.bg) < 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.10)');
      g.addColorStop(0, lift); g.addColorStop(1, 'rgba(0,0,0,0)');
      if (customBgOn) ctx.globalAlpha = 0.6;
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      const paperAmt = (sc.paper ? 1 : mainStyle.texture.paper || 0) * (fx.texture ?? 0.6);
      if (paperAmt > 0.02) {
        ctx.globalCompositeOperation = J.lum(sc.bg) < 0.4 ? 'screen' : 'multiply';
        ctx.globalAlpha = customBgOn ? paperAmt * 0.14 : (J.lum(sc.bg) < 0.4 ? paperAmt * 0.06 : paperAmt * 0.85);
        if (J.lum(sc.bg) < 0.4) ctx.filter = 'invert(1)';
        ctx.drawImage(this.paper(W, H), 0, 0, W, H);
        ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    // ---------- camera & chroma amounts ----------
    const u = H / 1080;
    const events = plan.events;
    let spike = 0, shake = 0, beatPulse = 0;
    for (let i = 0; i < events.length; i++) {
      const ev = events[i]; if (ev.t > t) break; const dt = (t - ev.t) * 24;
      if (dt > 14) continue;
      if (ev.type === 'chroma') spike += ev.amp * Math.pow(0.55, dt);
      else if (ev.type === 'shake') shake += ev.amp * Math.pow(0.62, dt);
    }
    if (plan.beats && plan.beats.length) {
      const b = prevBeat(plan.beats, t);
      if (b != null && t - b < 0.25) beatPulse = 0.9 * Math.exp(-(t - b) * 16);
    }
    const chroma = (fx.chroma ?? 0.7) * (mainStyle.ghost ?? 1) * (1 + spike + beatPulse);
    const step = Math.floor(tq / clock + 1e-6);
    const beatInfo = plan.beats && plan.beats.length ? beatAt(plan.beats, tq) : null;
    const energy = plan.energy ? plan.energy[Math.min(plan.energy.length - 1, Math.max(0, Math.floor(t * plan.energyRate)))] : null;
    // ---------- background graphic (per line) ----------
    if (!opt.transparent && !key && mainCut && mainCut.bg && mainCut.bg !== 'none' && J.BG[mainCut.bg]) {
      const env = this.makeEnv(ctx, plan, mainCut, sc, { pass: 'main', t: tq, lt: tq - mainCut.start, ltb: tq - mainCut.start, step, scale, allowFilter, energy, beat: beatInfo, bgOnly: true });
      ctx.save();
      if (customBgOn) ctx.globalAlpha = 0.42;
      try { J.BG[mainCut.bg].draw(env, mainCut.bgP || {}); } catch (e) { console.warn('bg', mainCut.bg, e); }
      ctx.restore();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    }
    if(!opt.backgroundOnly&&J.drawUnifiedMotif&&!key)J.drawUnifiedMotif(ctx,plan,t,opt.graphicAuditCtx);
    const shx = J.rs(step, 71) * shake * 16 * u, shy = J.rs(step, 72) * shake * 11 * u;
    // ---------- content passes ----------
    const passes = [
      { pass: 'B', lag: 1.6 / 24, off: [-3.4 * chroma * u, -1.3 * chroma * u] },
      { pass: 'A', lag: 0.8 / 24, off: [3.2 * chroma * u, 1.9 * chroma * u] },
      { pass: 'main', lag: 0, off: [0, 0] },
    ];
    const ghostOn = !opt.backgroundOnly && (fx.chroma ?? 0.7) > 0.02 && (st.ghost ?? 1) > 0.02 && !opt.noGhost;
    let mainBB = null, mainEnv = null;
    // camera blur (focus pulls etc.) is applied ONCE to the whole content layer — a blur filter on every
    // individual draw call is extremely slow when a layout draws many text rows
    let layerBlur = 0, LX = null;
    if (allowFilter && mainCut && !plan.artDirection?.motionDNA && J.CAMERA[mainCut.cam] && mainCut.cam !== 'push') {
      try {
        const e0 = this.makeEnv(ctx, plan, mainCut, sc, { pass: 'main', t: tq, lt: tq - mainCut.start, ltb: tq - mainCut.start, step, scale, allowFilter, energy, beat: beatInfo });
        const c0 = J.CAMERA[mainCut.cam].get(e0, mainCut.camP || {});
        if (c0 && c0.blur > 0.4) layerBlur = c0.blur;
      } catch (e) {}
      if (layerBlur) {
        const L = this.ensure(this.camLayer || (this.camLayer = mk(2, 2)), cw, ch);
        LX = L.getContext('2d'); LX.setTransform(1, 0, 0, 1, 0, 0); LX.globalAlpha = 1; LX.globalCompositeOperation = 'source-over'; LX.filter = 'none';
        LX.clearRect(0, 0, cw, ch); LX.setTransform(scale, 0, 0, scale, 0, 0);
      }
    }
    for (const P of (opt.backgroundOnly?[]:passes)) {
      if (P.pass !== 'main' && !ghostOn) continue;
      const tp = Math.max(0, tq - P.lag);
      const cut = P.lag ? J.cutAt(plan, tp) : mainCut;
      if (!cut) continue;
      const cutStyle=cut.style||st,csc = cutStyle.schemes[cut.scheme % cutStyle.schemes.length] || cutStyle.schemes[0];
      const lt = tp - cut.start;
      const X = LX || ctx;
      const env = this.makeEnv(X, plan, cut, csc, {
        pass: P.pass, passColor: P.pass === 'A' ? csc.ghostA : P.pass === 'B' ? csc.ghostB : null,
        t: tp, lt, ltb: lt + P.lag, step: Math.floor(tp / clock + 1e-6), scale, allowFilter, energy, beat: beatInfo,
      });
      X.save();
      // camera move for this cut (default: slow push-in)
      let cam = null;
      const CD = J.CAMERA[cut.cam] || J.CAMERA.push;
      try { cam = (plan.artDirection?.realityVersion===2 ? J.lyricsCameraAt(plan,tp) : J.cameraAt?.(plan,tp,this.renderRange))||CD.get(env, cut.camP || {}); } catch (e) { cam = null; }
      cam = cam || {};
      if (P.pass === 'main' && J.cameraMatrix) env.cameraMatrix = J.cameraMatrix(W, H, cam, shx + P.off[0], shy + P.off[1]);
      const cs = cam.s ?? 1;
      X.translate(W / 2 + shx + P.off[0] + (cam.x || 0), H / 2 + shy + P.off[1] + (cam.y || 0));
      if (cam.rot) X.rotate(cam.rot * J.DEG);
      if (cam.skx) X.transform(1, 0, Math.tan(cam.skx * J.DEG), 1, 0, 0);
      X.scale(cs * (cam.sx ?? 1), cs * (cam.sy ?? 1)); X.translate(-W / 2, -H / 2);
      env.st=cutStyle;
      if (P.pass !== 'main') X.globalCompositeOperation = J.lum(csc.bg) > 0.55 ? 'multiply' : 'source-over';
      const drawnBounds=this.drawCut(env);
      if(P.pass==='main'&&opt.qualityCollector&&drawnBounds){
        opt.qualityCollector.push({line:cut.line,layout:cut.layout,text:cut.text,box:{x0:drawnBounds.x0/W,y0:drawnBounds.y0/H,x1:drawnBounds.x1/W,y1:drawnBounds.y1/H}});
      }
      X.restore();
      if (P.pass === 'main') { mainEnv = env; }
    }
    if (LX) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.filter = `blur(${(layerBlur * scale).toFixed(1)}px)`; ctx.drawImage(LX.canvas, 0, 0); ctx.restore();
    }
    // ---------- cut-to-cut transition: composite the previous cut's resting frame with this one ----------
    if (!opt.noTrans && mainCut && mainCut.trans && J.TRANS[mainCut.trans] && mainCut.index > 0) {
      const lt = tq - mainCut.start, dur = mainCut.transDur || 0.35;
      const prev = plan.cuts[mainCut.index - 1];
      if (lt < dur && prev && Math.abs(prev.end - mainCut.start) < 0.06) {
        const A = this.ensure(this.transA || (this.transA = mk(2, 2)), cw, ch), B = this.ensure(this.transB || (this.transB = mk(2, 2)), cw, ch);
        const bx = B.getContext('2d'); bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalCompositeOperation = 'copy'; bx.drawImage(ctx.canvas, 0, 0); bx.globalCompositeOperation = 'source-over';
        this.frame(A.getContext('2d'), plan, Math.max(prev.start, prev.end - 1e-3), Object.assign({}, opt, { noTrans: true, noPost: true, noHud: true }));
        const prevStyle=prev.style||st,psc = prevStyle.schemes[prev.scheme % prevStyle.schemes.length] || prevStyle.schemes[0];
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
        try { J.TRANS[mainCut.trans].draw(ctx, A, B, J.clamp(lt / dur), { cw, ch, sc, scPrev: psc, st:mainStyle, photoReadablePolicy:plan.photoReadablePolicy&&!plan.directionOverrides7?.[mainCut.line]?.trans, P: mainCut.transP || {}, step, t, scale, allowFilter, seed: mainCut.seed | 0, tmp: (w, h) => this.ensure(this.transC || (this.transC = mk(2, 2)), w, h) }); }
        catch (e) { console.warn('trans', mainCut.trans, e); }
        ctx.restore();
      }
    }
    // ---------- HUD ----------
    if (plan.hud && !opt.noHud && !opt.production) {
      const env = this.makeEnv(ctx, plan, mainCut, sc, { pass: 'main', t: tq, lt: 0, ltb: 0, step, scale, allowFilter, energy, beat: beatInfo });
      J.drawHUD(env, plan);
    }
    ctx.restore();
    // ---------- post ----------
    if (!opt.noPost) this.post(ctx, plan, t, tq, step, sc, scale, opt, allowFilter);
    if (key && !opt.noPost) this.keyFinish(ctx, key, opt);
    if (!opt.noHud&&!opt.backgroundOnly) this.drawTitleCredit(ctx, plan, t, scale);
    if (plan.practice && !opt.noHud) this.drawPractice(ctx, plan, t, scale);
  }

  drawPractice(ctx, plan, t, scale) {
    const lines=plan.lines||[];if(!lines.length)return;
    let index=-1;for(let i=0;i<lines.length;i++)if(t>=lines[i].start)index=i;
    const current=lines[Math.max(0,index)],next=lines[index+1];
    const W=plan.W,H=plan.H,portrait=H>W,boxW=W*(portrait?.84:.72),boxH=H*(portrait?.24:.27),x=(W-boxW)/2,y=H*(portrait?.56:.55)-boxH/2;
    ctx.save();ctx.setTransform(scale,0,0,scale,0,0);
    ctx.fillStyle='rgba(6,9,14,.79)';ctx.fillRect(x,y,boxW,boxH);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#FFFFFF';ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=8;
    let size=Math.min(H*(portrait?.055:.07),boxH*.37);ctx.font=`700 ${size}px sans-serif`;
    while(ctx.measureText(current.text).width>boxW*.91 && size>18){size*=.92;ctx.font=`700 ${size}px sans-serif`;}
    ctx.fillText(current.text,W/2,y+boxH*.37,boxW*.91);
    const end=Math.max(current.start+.2,current.end),words=current.wordTimes||[];
    let progress=J.clamp((t-current.start)/(end-current.start));
    if(words.length){
      let active=-1;for(let i=0;i<words.length;i++)if(t>=words[i].start)active=i;
      if(active>=0){
        const from=words[active].start,to=words[active+1]?.start??end;
        progress=J.clamp((active+J.clamp((t-from)/Math.max(.1,to-from)))/words.length);
        const prefix=words.slice(0,active+1).map(w=>w.text).join('');
        const fullWidth=ctx.measureText(current.text).width,scaleX=Math.min(1,boxW*.91/Math.max(1,fullWidth));
        ctx.save();ctx.textAlign='left';ctx.translate(W/2-fullWidth*scaleX/2,0);ctx.scale(scaleX,1);
        ctx.fillStyle='#e5c68f';ctx.fillText(prefix,0,y+boxH*.37);ctx.restore();
      }else progress=0;
    }
    ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(x+boxW*.08,y+boxH*.62,boxW*.84,3);
    ctx.fillStyle='#e5c68f';ctx.fillRect(x+boxW*.08,y+boxH*.62,boxW*.84*progress,3);
    if(next){ctx.globalAlpha=.72;ctx.fillStyle='#FFFFFF';ctx.font=`500 ${Math.max(16,Math.min(size*.42,boxH*.19))}px sans-serif`;ctx.fillText(`次：${next.text}`,W/2,y+boxH*.81,boxW*.88);}
    ctx.restore();
  }

  /* Fixed after all camera, transition and post passes; shared by preview, MP4 and PNG frames. */
  drawTitleCredit(ctx, plan, t, scale) {
    const d = plan.titleDisplay;
    const creditState=J.creditStateAt?.(plan,t);
    if(creditState?.hidden)return;
    if (!d || (!d.title && !d.artist)) return;
    const bottom = d.position[0] === 'b', right = d.position[1] === 'r';
    const x = right ? d.W - d.marginX : d.marginX;
    const size = d.titleSize*(creditState?.scale??1), small = size * .9, gap = size * .46;
    const titleY = bottom ? d.H - d.marginY - (d.artist ? small + gap : 0) : d.marginY + size;
    const artistY = bottom ? d.H - d.marginY : d.marginY + size + gap + small;
    const fit = (str, max) => {
      const value = String(str || '');
      if (ctx.measureText(value).width <= max) return value;
      const chars = [...value]; let lo = 0, hi = chars.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (ctx.measureText(chars.slice(0, mid).join('') + '…').width <= max) lo = mid;
        else hi = mid - 1;
      }
      return chars.slice(0, lo).join('') + '…';
    };
    ctx.save(); ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.textAlign = right ? 'right' : 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = d.color;
    ctx.shadowColor = d.color === '#161719' ? 'rgba(255,255,255,.44)' : 'rgba(0,0,0,.72)';
    ctx.shadowBlur = size * (d.detail > .27 ? .24 : .14);
    ctx.lineJoin='round';ctx.lineWidth=Math.max(1.25,size*.075);
    ctx.strokeStyle=d.color==='#161719'?'rgba(255,255,255,.62)':'rgba(0,0,0,.76)';
    const alpha = J.clamp(t / .65, 0, 1)*(creditState?.opacity??1);
    if(d.scrim){ctx.save();ctx.globalAlpha=d.scrim*alpha;ctx.fillStyle=d.color==='#161719'?'#FFFFFF':'#000000';const left=right?x-d.maxWidth-size*.3:x-size*.3;ctx.fillRect(left,Math.min(titleY,artistY)-size*1.1,d.maxWidth+size*.6,size*2.9);ctx.restore();}
    const drawCredit=(text,fs,y,a)=>{
      ctx.font=J.fontCSS(d.font,fs);const content=fit(text,d.maxWidth);ctx.globalAlpha=a;
      if(typeof ctx.strokeText==='function')ctx.strokeText(content,x,y,d.maxWidth);ctx.fillText(content,x,y,d.maxWidth);
    };
    if (d.title) {
      drawCredit(d.title,size,titleY,d.opacity*alpha);
    }
    if (d.artist) {
      drawCredit(d.artist,small,artistY,d.opacity*.84*alpha);
    }
    ctx.restore();
  }

  /* 合成用の背景: make the finished frame monochrome (white text + effects only) and put it on the key colour.
     black: as rendered (black = empty).  green: screened onto #00FF00, so black → green, white stays white and
     the soft greys (ghosts, glow, fades) turn into partial transparency when keyed — the same result as
     screen-blending the black version. */
  keyFinish(ctx, key, opt) {
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
    if (opt.transparent) {
      // keep the alpha: desaturate through a copy
      const S = this.ensure(this.scratch, cw, ch), sx = S.getContext('2d');
      sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalAlpha = 1; sx.globalCompositeOperation = 'copy';
      if (this.filterOK) { sx.filter = 'grayscale(1)'; sx.drawImage(ctx.canvas, 0, 0); sx.filter = 'none'; }
      else {
        sx.drawImage(ctx.canvas, 0, 0); sx.globalCompositeOperation = 'saturation'; sx.fillStyle = '#808080'; sx.fillRect(0, 0, cw, ch);
        sx.globalCompositeOperation = 'destination-in'; sx.drawImage(ctx.canvas, 0, 0);
      }
      sx.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'copy'; ctx.drawImage(S, 0, 0);
    } else {
      // opaque frame: the 'saturation' blend with any grey keeps luminosity and drops colour
      ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, cw, ch);
      if (key === 'green') { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = J.KEY_BG.green; ctx.fillRect(0, 0, cw, ch); }
    }
    ctx.restore();
  }

  makeEnv(ctx, plan, cut, sc, o) {
    const W = plan.W, H = plan.H;
    const env = Object.assign({ ctx, W, H, sc, st: cut?.style||plan.style, fx: plan.fx, fps: plan.fps, cut, plan, production:this._productionFrame===true,lyricAuditCtx:this.lyricAuditCtx,lyricAuditItems:this.lyricAuditItems }, o);
    if (cut) {
      // A zero-duration cut has no entrance fade, including its exact first frame.
      env.pIn = cut.inDur > 0 ? J.clamp(o.lt / Math.max(0.01, cut.inDur)) : (o.lt >= 0 ? 1 : 0);
      env.pOut = cut.outDur > 0 ? J.clamp((o.lt - (cut.dur - cut.outDur)) / cut.outDur) : 0;
    } else { env.pIn = 1; env.pOut = 0; }
    const ghost = env.pass !== 'main';
    const colOf = (c, g) => (ghost ? (g === false ? null : env.passColor) : c);
    // Layout packs may contain internal indices and timestamps. They are editor diagnostics,
    // never content; suppress them in ordinary previews and every production render.
    env.draw = it => {
      const label=String(it?.text||'').trim();
      const debugFlag=it?.debug===true||it?.internalTiming===true||it?.layer==='debug';
      // Match diagnostics only on non-lyric items; a user may sing "LINE 1" or coordinates.
      const lyric=env.cut?.line>=0&&String(env.cut.lineText||env.cut.text||'').includes(label);
      const debugText=!lyric&&/(?:\bLINE\s*\d+\b|^LINE$|^TIME$|\bNo\.\d+\b|\b\d{2}:\d{2}\.\d{2}\b|^X-?\d+\s+Y-?\d+$)/iu.test(label);
      if((env.production&&(debugFlag||debugText))||(!this.editorDebug&&(debugFlag||debugText)))return null;
      const adjusted=J.adjustLocalReadability?J.adjustLocalReadability(env,it):it;
      if(env.lyricAuditCtx&&env.pass==='main'&&env.cut?.line>=0&&label&&String(env.cut.lineText||env.cut.text||'').includes(label)){
        const audit=env.lyricAuditCtx,auditEnv={...env,ctx:audit,inLayer:true,allowFilter:false,lyricAuditCtx:null};
        audit.save();const m=env.ctx.getTransform();audit.setTransform(m.a,m.b,m.c,m.d,m.e,m.f);
        J.drawItem(auditEnv,{...adjusted,shadow:null,blur:0,pre:null,post:null,blend:null});audit.restore();
        env.lyricAuditItems?.push({line:env.cut.line,bounds:J.measureLyricItemBounds(env,adjusted)});
      }
      return J.drawItem(env,adjusted);
    };
    env.rect = (x, y, w, h, c, a = 1, g = true) => { const col = colOf(c, g); if (!col || a <= 0) return; ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; };
    env.line = (pts, c, lw = 1, a = 1, g = true) => {
      const col = colOf(c, g); if (!col || a <= 0 || pts.length < 2) return;
      ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); ctx.globalAlpha = 1;
    };
    env.polyPartial = (pts, e, c, lw = 1, a = 1, g = true) => {
      if (e <= 0) return;
      let L = 0; const seg = [];
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
      let rem = L * J.clamp(e); const out = [pts[0]];
      for (let i = 1; i < pts.length && rem > 0; i++) {
        const d = seg[i - 1];
        if (rem >= d) { out.push(pts[i]); rem -= d; }
        else { const k = rem / d; out.push([J.lerp(pts[i - 1][0], pts[i][0], k), J.lerp(pts[i - 1][1], pts[i][1], k)]); rem = 0; }
      }
      env.line(out, c, lw, a, g);
    };
    env.circle = (cx, cy, r, fill, stroke, lw = 1, a = 1, g = true) => {
      if (r <= 0 || a <= 0) return;
      const f = fill ? colOf(fill, g) : null, s = stroke ? colOf(stroke, g) : null;
      if (!f && !s) return;
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(cx, cy, r, 0, J.TAU);
      if (f) { ctx.fillStyle = f; ctx.fill(); }
      if (s) { ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.stroke(); }
      ctx.globalAlpha = 1;
    };
    env.arc = (cx, cy, r, a0, a1, c, lw = 1, a = 1, g = true) => {
      const col = colOf(c, g); if (!col || a <= 0 || r <= 0) return;
      ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx, cy, r, a0 * J.DEG, a1 * J.DEG); ctx.stroke(); ctx.globalAlpha = 1;
    };
    env.rrect = (x, y, w, h, r, fill, a = 1, g = true, stroke, lw = 1) => {
      if (a <= 0 || w <= 0 || h <= 0) return;
      const f = fill ? (ghost ? colOf(fill, g) : fill) : null, s = stroke ? colOf(stroke, g) : null;
      if (!f && !s) return;
      r = Math.min(r, w / 2, h / 2);
      ctx.globalAlpha = a; ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
      if (f) { ctx.fillStyle = f; ctx.fill(); }
      if (s) { ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.stroke(); }
      ctx.globalAlpha = 1;
    };
    env.poly = (pts, c, a = 1, g = true) => {
      const col = colOf(c, g); if (!col || a <= 0) return;
      ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    };
    env.blob = (pts, c, a = 1, g = true) => {
      const col = colOf(c, g); if (!col || a <= 0) return;
      ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath();
      const n = pts.length, mid = (i) => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
      const m0 = mid(0); ctx.moveTo(m0[0], m0[1]);
      for (let i = 1; i <= n; i++) { const p = pts[i % n], m = mid(i); ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    };
    return env;
  }

  drawCut(env) {
    const cut = env.cut, L = J.LAYOUTS[cut.layout] || J.LAYOUTS.center;
    const decor = cut.decor || [];
    for (const d of decor) { const D = J.DECOR[d.id]; if (D && D.layer === 'back') try { D.draw(env, null, d); } catch (e) { console.warn(e); } }
    let bb = null;
    try { bb = L.render(env); } catch (e) { console.warn('layout', cut.layout, e); }
    for (const d of decor) { const D = J.DECOR[d.id]; if (D && D.layer === 'front') try { D.draw(env, bb, d); } catch (e) { console.warn(e); } }
    return bb;
  }

  post(ctx, plan, t, tq, step, sc, scale, opt, allowFilter) {
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    const fx = plan.fx, st = J.cutAt(plan,tq)?.style||plan.style;
    const active = plan.events.filter(ev => t >= ev.t && t < ev.t + Math.max(ev.dur, 1 / plan.fps));
    const needScratch = active.some(ev => ['slice', 'block', 'zoom', 'mosaic'].includes(ev.type) || (J.FXE[ev.type] && J.FXE[ev.type].scratch)) || (!opt.fast && (st.glow || 0) > 0);
    const S = needScratch ? this.ensure(this.scratch, cw, ch) : null;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const copy = () => { const sx = S.getContext('2d'); sx.globalCompositeOperation = 'copy'; sx.drawImage(ctx.canvas, 0, 0); sx.globalCompositeOperation = 'source-over'; };
    const clock24 = Math.floor(t * 24);           // glitch randomness changes at most 24 times a second at any output fps
    for (const ev of active) {
      const k = (t - ev.t) / Math.max(ev.dur, 1e-3);
      const st2 = clock24;
      const D = J.FXE[ev.type];
      if (D && D.draw) {
        if (D.scratch) copy();
        try {
          D.draw(ctx, ev, k, { cw, ch, S, sc, st: plan.style, step: st2, t, scale, renderer: this, allowFilter, opt, photoReadablePolicy:plan.photoReadablePolicy, tmp: (w, h) => this.ensure(this.tiny, w, h), tmp2: (w, h) => this.ensure(this.small2 || (this.small2 = mk(2, 2)), w, h) });
        } catch (e) { console.warn('fx', ev.type, e); }
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.imageSmoothingEnabled = true;
        continue;
      }
      if (ev.type === 'slice') {
        copy();
        const n = 6 + (J.h(st2, 3) % 7);
        let y = 0;
        for (let i = 0; i < n && y < ch; i++) {
          const h = Math.max(2, ch * J.rr(0.01, 0.12, st2, i, 1));
          const dx = (J.r(st2, i, 2) < 0.55 ? J.rs(st2, i, 3) * cw * 0.06 * ev.amp : 0);
          if (dx) ctx.drawImage(S, 0, y, cw, h, dx, y, cw, h);
          y += h + ch * J.rr(0, 0.08, st2, i, 4);
        }
      } else if (ev.type === 'block') {
        copy();
        for (let i = 0; i < 9; i++) {
          const w = cw * J.rr(0.05, 0.3, st2, i, 5), h = ch * J.rr(0.01, 0.07, st2, i, 6);
          const x = J.r(st2, i, 7) * (cw - w), y = J.r(st2, i, 8) * (ch - h);
          const sx = J.clamp(x + J.rs(st2, i, 9) * cw * 0.08, 0, cw - w), sy = J.clamp(y + J.rs(st2, i, 10) * ch * 0.04, 0, ch - h);
          ctx.drawImage(S, sx, sy, w, h, x, y, w, h);
          if (J.r(st2, i, 11) < 0.35) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = J.r(st2, i, 12) < 0.5 ? sc.ghostA : sc.ghostB; ctx.fillRect(x, y, w, h); ctx.globalCompositeOperation = 'source-over'; }
        }
      } else if (ev.type === 'invert') {
        ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch); ctx.globalCompositeOperation = 'source-over';
      } else if (ev.type === 'flash') {
        const cap=plan.photoReadablePolicy?0.06:0.92;
        ctx.globalAlpha = Math.pow(1 - k, 1.5) * Math.min(cap,0.92*J.clamp(ev.amp??1)); ctx.fillStyle = J.lum(sc.bg) < 0.5 ? sc.fg : '#ffffff'; ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1;
      } else if (ev.type === 'zoom') {
        copy();
        const a = ev.amp * (1 - k);
        for (let i = 1; i <= 6; i++) {
          const s = 1 + i * 0.022 * a; ctx.globalAlpha = 0.2 * (1 - i / 7) * Math.min(1, a * 1.3);
          ctx.drawImage(S, cw / 2 - cw * s / 2, ch / 2 - ch * s / 2, cw * s, ch * s);
        }
        ctx.globalAlpha = 1;
      } else if (ev.type === 'mosaic') {
        copy();
        const T = this.ensure(this.tiny, Math.max(8, Math.round(cw / 42)), Math.max(8, Math.round(ch / 42))), tx = T.getContext('2d');
        tx.imageSmoothingEnabled = true; tx.drawImage(S, 0, 0, T.width, T.height);
        ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.85 * (1 - k); ctx.drawImage(T, 0, 0, cw, ch); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true;
      }
    }
    // bloom
    const glow = (st.glow || 0.6) * 0.5 * (fx.texture ?? 0.6);
    if (!opt.fast && allowFilter && glow > 0.05 && !opt.transparent) {
      const sw = Math.round(cw / 4), sh = Math.round(ch / 4);
      const Sm = this.ensure(this.small, sw, sh), sx = Sm.getContext('2d');
      sx.filter = `blur(${Math.max(2, Math.round(sw / 160))}px)`; sx.globalCompositeOperation = 'copy'; sx.drawImage(ctx.canvas, 0, 0, sw, sh); sx.filter = 'none'; sx.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = glow * 0.55; ctx.drawImage(Sm, 0, 0, cw, ch); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (!opt.transparent && !plan.keyBg) {
      // scanlines
      const scan = (st.texture.scan || 0) * (fx.texture ?? 0.6);
      if (scan > 0.03) {
        const pat = ctx.createPattern(this.scan, 'repeat');
        const k = Math.max(1, Math.round(ch / 540));
        ctx.save(); ctx.scale(k, k); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = scan * 0.28; ctx.fillStyle = pat; ctx.fillRect(0, 0, cw / k, ch / k); ctx.restore();
      }
      // grain
      const gr = (st.texture.grain || 0) * (fx.texture ?? 0.6);
      if (gr > 0.02) {
        const img = this.grain[((step % 4) + 4) % 4];
        const pat = ctx.createPattern(img, 'repeat');
        const k = Math.max(1, ch / 1080);
        const ox = J.r(step, 1) * 256, oy = J.r(step, 2) * 256;
        ctx.save(); ctx.scale(k, k); ctx.translate(-ox, -oy);
        ctx.fillStyle = pat;
        ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = gr * 0.2; ctx.fillRect(0, 0, cw / k + 256, ch / k + 256);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = gr * 0.035; ctx.fillRect(0, 0, cw / k + 256, ch / k + 256);
        ctx.restore();
      }
      // vignette
      const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.hypot(cw, ch) * 0.62);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.28 * (fx.texture ?? 0.6)})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
    }
    ctx.restore();
  }
}
/* beat context at time t: time since the previous beat, beat length and index */
function beatAt(beats, t) {
  let lo = 0, hi = beats.length - 1, i = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (beats[m] <= t) { i = m; lo = m + 1; } else hi = m - 1; }
  if (i < 0) return null;
  const len = i + 1 < beats.length ? beats[i + 1] - beats[i] : (i > 0 ? beats[i] - beats[i - 1] : 0.5);
  return { since: t - beats[i], len: Math.max(0.2, len), index: i };
}
function prevBeat(beats, t) {
  let lo = 0, hi = beats.length - 1, ans = null;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (beats[m] <= t) { ans = beats[m]; lo = m + 1; } else hi = m - 1; }
  return ans;
}
J.Renderer = Renderer;
})();
