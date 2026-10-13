'use strict';
const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs');
const {J}=engine(),V=J.cinemaV3;
const prior={completed:true,frameCount:10,inputHash:'input',rendererVersion:'renderer',planHash:'incumbent',profileId:'profile',videoSHA256:'prior-video',encodedResolution:[640,360],fps:24,outputProfile:{range:[0,10]},lowerTailQuality:40,metrics:{typographyDiversity:61,lyricForegroundNovelty:60,temporalContrast:30,localContrast:95,motionRealization:100}};
(async()=>{
 for(const root of ['MEASURED_REGISTRY_BASELINE','LEGACY_FINALIST','INCUMBENT']){
  let calls=0;const identical=await V.guardCompositionPromotion(root,'incumbent','incumbent',async()=>{calls++;throw Error('duplicate encode');});assert(identical.allowed);assert.equal(calls,0);
  const next={...prior,planHash:'hybrid',videoSHA256:'next-video',metrics:{...prior.metrics,typographyDiversity:6,localContrast:100}};
  const collapsed=await V.guardCompositionPromotion(root,'hybrid','incumbent',async()=>({next,prior}));assert(!collapsed.allowed,'a changed '+root+' cannot exchange typography for contrast');
  const missing=await V.guardCompositionPromotion(root,'hybrid','incumbent',async()=>({next:{...next,metrics:{...prior.metrics,temporalContrast:null}},prior}));assert(!missing.allowed);
  const improved=await V.guardCompositionPromotion(root,'hybrid','incumbent',async()=>({next:{...next,metrics:{...prior.metrics,typographyDiversity:70}},prior}));assert(improved.allowed);
  const swapped=await V.guardCompositionPromotion(root,'hybrid','incumbent',async()=>({next:{...next,inputHash:'other',metrics:{...prior.metrics,typographyDiversity:70}},prior}));assert(!swapped.allowed);
 }
 // A physically required repair belongs to the shipping baseline. It is
 // retained without pretending an artistic gain or re-adopting unsafe raw p.
 const repaired=await V.guardCompositionPromotion('INCUMBENT','repaired-shipping','repaired-shipping',async()=>{throw Error('repair must not compete against raw unsafe draft');});assert(repaired.allowed);
 const competitor=await V.guardCompositionPromotion('LEGACY_FINALIST','new-hybrid','repaired-shipping',async()=>({next:{...prior,planHash:'new-hybrid',metrics:{...prior.metrics,localContrast:100,typographyDiversity:4}},prior:{...prior,planHash:'repaired-shipping'}}));assert(!competitor.allowed);
 console.log('All composition roots: contrast/typography tradeoff, missing evidence, changed input rejected; measured improvement and unchanged incumbent accepted PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
