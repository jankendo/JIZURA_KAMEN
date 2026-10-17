'use strict';const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{constants}=require('node:buffer'),{readAdoptedMatrixRow}=require('./read_adopted_matrix_row.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'adopted-row-')),file=path.join(dir,'sample-v3-row.json'),aggregate=path.join(dir,'results.json'),row={fixture:{id:'sample'},variant:'v3',status:'PASS',sha256:'a'.repeat(64)};let checks=0;
try{fs.writeFileSync(file,JSON.stringify(row));fs.writeFileSync(aggregate,'{}');fs.truncateSync(aggregate,constants.MAX_STRING_LENGTH+1);assert.deepEqual(readAdoptedMatrixRow(dir,'sample','v3'),row);checks++;
 for(const change of [r=>r.fixture.id='different',r=>r.variant='baseline',r=>r.status='FAIL']){const v=structuredClone(row);change(v);fs.writeFileSync(file,JSON.stringify(v));assert.throws(()=>readAdoptedMatrixRow(dir,'sample','v3'));checks++;}
 fs.unlinkSync(file);assert.throws(()=>readAdoptedMatrixRow(dir,'sample','v3'),/LARGE_AGGREGATE/);checks++;
 fs.writeFileSync(aggregate,JSON.stringify({rows:[row]}));assert.deepEqual(readAdoptedMatrixRow(dir,'sample','v3'),row);checks++;
 fs.writeFileSync(aggregate,JSON.stringify({rows:[row,row]}));assert.throws(()=>readAdoptedMatrixRow(dir,'sample','v3'),/UNIQUE_ADOPTED/);checks++;
 console.log(JSON.stringify({status:'PASS',checks,scope:'Actual sparse aggregate above Node string limit; exact per-case selection, mismatched/failed/duplicate rejection, legacy bounded fallback.'}));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
