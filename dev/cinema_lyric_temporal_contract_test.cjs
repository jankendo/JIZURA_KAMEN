'use strict';
const assert=require('node:assert/strict');
const {J,createCanvas}=require('./custom_test_support.cjs').engine();
let checks=0;const eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;},near=(a,b,label)=>{assert(Math.abs(a-b)<1e-6,`${label}: ${a} vs ${b}`);checks++;};
const text='光を待つ\n朝の空',plain=s=>s.replace(/\s/gu,'');
function sample(layout,W,H,role,t,mode='trial'){
 const cv=createCanvas(W,H),ctx=cv.getContext('2d');
 const cut={index:0,line:0,start:1,end:5,dur:4,layout,text,lineText:plain(text),params:{font:'embedded_bold',displayText:text},grammar:{mode:'openSky',stage:0,temporal:{role,level:.3,hit:1.3,entry:.2,exit:.2}},seed:17,enter:'cut',hold:'still',exit:'cut',inDur:0,outDur:0};
 const plan={W,H,duration:10,fps:24,cuts:[cut],musicalPhoto:{cinema:{architecture:{}},songProfile:{}},cinemaFinalSemanticTravel:{version:'final-semantic-travel-v1',targets:[J.canonicalJSON([cut.index,cut.line,cut.start,cut.end,cut.lineText])]}};
 if(mode==='baseline')delete plan.cinemaFinalSemanticTravel;
 if(mode==='manual')cut.locked=true;
 if(mode==='override')plan.directionOverrides7={0:{layout}};
 if(mode==='still')cut.grammar.intentionalHold=true;
 if(mode==='quiet')cut.grammar.directionPolicy={quietIntent:true};
 if(mode==='nonCinema')delete plan.musicalPhoto.cinema.architecture;
 if(mode==='neutral')plan.cinemaSemanticNeutral=true;
 const env={W,H,ctx,plan,cut,t,lt:t-cut.start,pIn:1,pOut:0,pass:'main',sc:{fg:'#fff',accent:'#ffaaee'},scale:1};
 const draw=J.drawFx;let item,box,alpha;
 J.drawFx=(e,it)=>{item=it;box=J.measureLyricItemBounds(e,it);const mask=createCanvas(W,H),mx=mask.getContext('2d');J.drawItem({...e,ctx:mx},{...it,shadow:null,stroke:0});alpha=mx.getImageData(0,0,W,H).data;return draw(e,it);};
 try{J.LAYOUTS[layout].render(env);}finally{J.drawFx=draw;}
 assert(item&&alpha,'actual main-item pipeline must reach Native drawing');checks++;
 let n=0,x=0,y=0;for(let j=3;j<alpha.length;j+=4){const a=alpha[j]/255;n+=a;x+=((j-3)/4%W)*a;y+=Math.floor((j-3)/4/W)*a;}
 assert(n>0,'primary glyph pixels must exist');checks++;
 return {plan,cut,env,item,box,alpha,center:[x/n,y/n]};
}
for(const [W,H] of [[640,360],[360,640]])for(const layout of ['photoCondensed','photoBanner','photoFocus'])for(const role of ['light','continuity'])for(const t of [1.8,2.8,4]){
 const a=sample(layout,W,H,role,t,'baseline'),b=sample(layout,W,H,role,t);
 for(const field of ['text','font','size','sx','track','lead','grammarMode'])eq(b.item[field],a.item[field],`${layout} retains authored ${field}`);
 eq(b.item.grammarMode,undefined,'temporal capability does not import grammar typography');
 eq(b.item.charFns.length,a.item.charFns.length+1,'exactly one temporal translation');
 const motion=b.item.cinemaAnchorMotion;assert(motion);checks++;
 const actual=b.item.charFns.at(-1)(0,{li:0});eq(actual,motion,'anchor metadata equals the rendered contribution');
 near(b.box.y0-a.box.y0,motion.dy,'actual bounds include translation');near(b.box.x0-a.box.x0,0,'translation does not move X');
 assert(Math.abs((b.center[1]-a.center[1])-motion.dy)<.55,'actual Native glyph alpha centroid follows declared translation');checks++;
 const anchoredA=J.centerPhotoLyricItem(a.env,a.item),anchoredB=J.centerPhotoLyricItem(b.env,b.item),ab=J.measureLyricItemBounds(a.env,anchoredA),bb=J.measureLyricItemBounds(b.env,anchoredB);
 near(bb.y0-ab.y0,motion.dy,'shape anchoring cannot cancel declared travel');
 const safe=J.measureLyricItemBounds(b.env,J.safeLyricItem(b.env,anchoredB));assert(safe.x0>=W*.11-1e-6&&safe.x1<=W*.89+1e-6&&safe.y0>=H*.08-1e-6&&safe.y1<=H*.92+1e-6);checks++;
 eq(plain(b.item.text),plain(text),'all original characters and line breaks survive');
 // White glyphs on the same black background retain the same interior contrast;
 // this is a Native fixture check, not real photographic/encoded contrast QA.
 eq(b.alpha.reduce((v,a,i)=>i%4===3?Math.max(v,a):v,0),255,'opaque readable glyph interior retained');
}
for(const [W,H] of [[640,360],[360,640]])for(const layout of ['photoCondensed','photoBanner','photoFocus','globalReadableUnit'])for(const mode of ['manual','override','still','quiet','nonCinema','neutral']){
 const a=sample(layout,W,H,'light',2.8,'baseline'),b=sample(layout,W,H,'light',2.8,mode);
 eq(b.item.cinemaAnchorMotion,undefined,`${mode}/${layout} must not gain translation`);
 if(!['manual','override'].includes(mode)){eq(Buffer.from(b.alpha),Buffer.from(a.alpha),'ineligible Native primary pixels retain old rendering');}
}
// Existing grammar already consumes temporal state. The capability must not
// create a second path, even when its final-translation policy is present.
for(const [W,H] of [[640,360],[360,640]]){
 const a=sample('cinemaGrammaropenSky',W,H,'light',2.8,'baseline'),b=sample('cinemaGrammaropenSky',W,H,'light',2.8);
 eq(b.item.charFns.length,a.item.charFns.length,'grammar temporal function count unchanged');
 eq(Buffer.from(b.alpha),Buffer.from(a.alpha),'existing grammar pixels are unchanged by capability dispatch');
 const partial={...b.item,text:'光'},c=J.cinemaLyricTemporalContract({...b.env,cut:{...b.cut,layout:'photoCondensed'}},{...partial,grammarMode:undefined});eq(c.status,'NOT_APPLICABLE','partial decorative text cannot consume complete-primary capability');
}
console.log(JSON.stringify({status:'PASS',checks,profiles:['16:9','9:16'],scope:'Actual layouts -> mainDraw -> typography -> Native glyph pixels, complete text, preserved typography/line breaks, single translation, shape anchor and actual safety fit, grammar compatibility, manual locks, intentional stillness, non-Cinema and static readability fallback. Does not certify encoded MP4 or photographic contrast.'}));
