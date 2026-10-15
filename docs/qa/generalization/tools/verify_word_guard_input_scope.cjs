'use strict';
// Input-scoped branch proof, never unconditional whole-program equivalence.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const [source,input,caseId,variant,output]=process.argv.slice(2);
const {J}=require(path.resolve(source,'dev/custom_test_support.cjs')).engine(source),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const rows=JSON.parse(fs.readFileSync(path.join(input,'results.json'))).rows,selected=rows.filter(r=>r.fixture.id===caseId&&r.variant===variant);assert.equal(selected.length,1);
const r=selected[0],bytes=fs.readFileSync(path.join(input,r.referenceInputs.file));assert.equal(sha(bytes),r.referenceInputs.sha256);const ref=JSON.parse(bytes),p=ref.plan;
const inputLines=J.parseLyrics(ref.project.lyrics).lines.map(l=>l.text);assert.equal(JSON.stringify(inputLines),JSON.stringify(p.lines.map(l=>l.text)),'Input/source-line contract differs');
const tests=[];
for(const text of new Set([...inputLines,...p.cuts.filter(c=>c.line>=0).map(c=>String(c.lineText||c.text||''))])){
 const chars=Array.from(text),unsafe=[];
 for(let i=1;i<chars.length;i++){const parts=chars.slice(0,i).join('')+'\n'+chars.slice(i).join('');if(J.climaxSplitNeedsProtection(text,parts))unsafe.push(i);}
 tests.push({sourceText:text,sourceTextSHA256:sha(Buffer.from(text)),testedCodePointBoundaries:Math.max(0,chars.length-1),unsafeBoundaries:unsafe});
}
const result={schema:1,sourceCommit:require('child_process').execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),fixture:caseId,variant,videoSHA256:r.sha256,originalArtifactBinding:r.provenance.finalArtifactVerification.binding,referenceSHA256:r.referenceInputs.sha256,planHash:ref.planHash,guardImplementationSHA256:sha(fs.readFileSync(path.join(source,'src/11zzv_climax_realization.js'))),allTestedSplitsKeepExistingBranch:tests.every(t=>!t.unsafeBoundaries.length),tests,scope:'Every possible inserted code-point boundary of original lyric lines and selected unit source strings is tested, not just the selected row split. This only establishes that the new protection branch cannot apply to these strings. Full output Native equality and the remaining source-diff assessment are separate mandatory evidence; this does not certify other inputs, planning changes or artistic quality.'};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({fixture:caseId,allTestedSplitsKeepExistingBranch:result.allTestedSplitsKeepExistingBranch,testedBoundaries:tests.reduce((n,t)=>n+t.testedCodePointBoundaries,0)}));assert(result.allTestedSplitsKeepExistingBranch,'INPUT_MAY_REQUIRE_RENDERING_CHANGE_FRESH_MP4_REQUIRED');
