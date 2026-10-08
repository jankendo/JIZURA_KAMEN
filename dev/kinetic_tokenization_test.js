const assert=require('node:assert/strict');const {chantProject}=require('./hype_test_helpers.cjs');
const {J,plan}=chantProject();assert.deepEqual(Array.from(J.tokenizeKinetic('アレアレガンバエー')),['アレ','アレ','ガンバエー']);
const lyric=plan.lines[0].text,cut=plan.cuts.find(c=>c.line===0);assert.equal(cut.text,lyric);assert.equal(cut.lineText,lyric);assert.deepEqual(Array.from(cut.kineticTokens),['アレ','アレ','ガンバエー']);
assert.deepEqual(Array.from(J.tokenizeKinetic('青い夜を越えて')),['青','い','夜','を','越','え','て']);console.log('Word and mora tokenization preserves the original lyric string.');
