'use strict';
const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs');
(async()=>{
 const {J,context}=engine(),fonts=context.document.fonts;
 fonts.load=async spec=>spec.startsWith('900 ')?[]:[{family:spec.includes('JIZURA')?'JIZURA Noto CJK JP':'Noto Sans JP',status:'loaded'}];
 // Use the same local family with independent weights to prove a loaded bold
 // cannot accidentally establish availability for an unavailable black face.
 J.FONTS.availability_black={family:'"JIZURA Noto CJK JP"',weight:900,kind:'gothic'};
 await J.ensureFonts('青黒 We are',['embedded_bold','availability_black']);
 assert.equal(J.fontLoadEvidence.get('embedded_bold').status,'LOADED');
 assert.equal(J.fontLoadEvidence.get('availability_black').status,'REQUESTED_FACE_UNAVAILABLE');
 assert.equal(J.FONTS.embedded_bold.gf,undefined,'embedded family is never substituted by a later network face');
 fonts.load=async()=>{throw Error('font unavailable')};
 await J.ensureFonts('歌詞',['embedded_bold']);assert.equal(J.fontLoadEvidence.get('embedded_bold').status,'LOAD_FAILED');
 console.log('Independent font weights, unavailable face reporting and stable embedded fallback PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
