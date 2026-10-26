'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright-core');
const url=process.argv[2],out=path.resolve(process.argv[3]||'/tmp/kamen-readability');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/chromium',args:['--no-sandbox']});try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>document.querySelector('#studioWorkbench'));
const report=await page.evaluate(async()=>{
 const cases=[];
 for(const aspect of ['16:9','9:16','1:1'])for(const light of [true,false]){
  const q=J.defaultProject(),background=document.createElement('canvas');background.width=128;background.height=128;const bx=background.getContext('2d');bx.fillStyle=light?'#fff':'#000';bx.fillRect(0,0,128,128);
  q.aspect=aspect;q.res=720;q.lyrics='[00:00.10]長い日本語の歌詞「明日へ歩こう！」音楽と、記号。';q.timing.snap=false;q.typo=q.kinetic=q.horror=q.unify=false;q.colors={enabled:true,fg:light?'#fff':'#000'};q.credits={mode:'none'};q.customBg={...q.customBg,enabled:true,dataUrl:background.toDataURL(),darkness:0};q.fx={...q.fx,motion:0,texture:0,glitch:0,chroma:0,decor:0,flash:false,hud:'off',bgSwitch:0,koma:0};q.overrides={0:{layout:'center',enter:'cut',hold:'still',exit:'cut',cam:'push',bg:'none',treat:'none',trans:'cut',decor:[]}};
  const p=J.plan(q,{duration:4,bpm:120,beats:[]}),cv=document.createElement('canvas');for(const cut of p.cuts.filter(c=>c.line>=0))Object.assign(cut.params,{accent:false,sub:false,under:false});cv.width=640;cv.height=Math.round(640*p.H/p.W);const ctx=cv.getContext('2d'),r=new J.Renderer(),ratio=cv.width/p.W;await r.loadCustomBackground(q.customBg.dataUrl);await J.ensureFonts(q.lyrics,J.fontsOfPlan(p));
  let outside=0,separation=0,maxDifference=0,glyphCount=0,visible=null;const seen=new Set();
  for(const c of p.cuts.filter(c=>c.line===0&&c.layout!=='interlude')){
   const log=[],options={scale:ratio,glyphLog:log,noCredits:true,noPost:true,noHud:true,noGhost:true,noTrans:true};r.frame(ctx,p,(c.start+c.end)/2,options);const glyphs=log.filter(g=>g.a>.1);if(!glyphs.length)throw Error('no lyric glyphs');glyphCount+=glyphs.length;for(const g of glyphs)seen.add(g.ch);
   for(const g of glyphs){ctx.font=g.font;ctx.textAlign='center';ctx.textBaseline='middle';const m=ctx.measureText(g.ch),x=-(m.actualBoundingBoxLeft||0),y=-(m.actualBoundingBoxAscent||g.px),w=(m.actualBoundingBoxLeft||0)+(m.actualBoundingBoxRight||m.width),h=(m.actualBoundingBoxAscent||g.px)+(m.actualBoundingBoxDescent||0),t=g.m;for(const [a,b]of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]]){const px=t[0]*a+t[2]*b+t[4],py=t[1]*a+t[3]*b+t[5];if(px< -2||py< -2||px>cv.width+2||py>cv.height+2)outside++;}}
   visible??=cv.toDataURL();const pixels=ctx.getImageData(0,0,cv.width,cv.height).data,nativeEnv=r.makeEnv;r.makeEnv=(...args)=>JIZURAUpstream.Renderer.prototype.makeEnv.apply(r,args);r.frame(ctx,p,(c.start+c.end)/2,{...options,glyphLog:[]});r.makeEnv=nativeEnv;const baseline=ctx.getImageData(0,0,cv.width,cv.height).data;
   for(let i=0;i<pixels.length;i+=4){const difference=Math.abs(pixels[i]-baseline[i])+Math.abs(pixels[i+1]-baseline[i+1])+Math.abs(pixels[i+2]-baseline[i+2]);if(difference>60)separation++;maxDifference=Math.max(maxDifference,difference);}
  }
  if(outside)throw Error('long lyric glyph clipping '+aspect+' '+outside);
  if([...J.parseLyrics(q.lyrics).lines[0].text].some(ch=>!seen.has(ch)))throw Error('lyric characters or punctuation missing');
  if(separation<20||maxDifference<180)throw Error('no contrasting lyric separation edge '+aspect+' '+light+' '+separation+' '+maxDifference);
  cases.push({aspect,background:light?'white':'black',glyphs:glyphCount,outside,separation,maxDifference,image:visible});r.disposeAssets();
 }
 return {status:'PASS',version:KAMEN_APP_INFO.version,build:KAMEN_BUILD_INFO,cases};
});
for(const item of report.cases){fs.writeFileSync(path.join(out,item.aspect.replace(':','x')+'-'+item.background+'.png'),Buffer.from(item.image.split(',')[1],'base64'));delete item.image;console.log('PASS long Japanese lyrics and contrasting edge',item.aspect,item.background);}
assert.deepEqual(errors,[]);report.errors=errors;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
