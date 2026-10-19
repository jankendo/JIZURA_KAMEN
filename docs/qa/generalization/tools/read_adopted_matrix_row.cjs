'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{constants}=require('node:buffer');
function readAdoptedMatrixRow(input,caseId,variant){
 assert(/^[a-zA-Z0-9._-]+$/.test(caseId)&&/^[a-zA-Z0-9._-]+$/.test(variant),'INVALID_CASE_OR_VARIANT');
 const file=path.join(input,caseId+'-'+variant+'-row.json');let row;
 if(fs.existsSync(file))row=JSON.parse(fs.readFileSync(file,'utf8'));
 else{const aggregate=path.join(input,'results.json');assert(fs.statSync(aggregate).size<=constants.MAX_STRING_LENGTH,'LARGE_AGGREGATE_REQUIRES_PER_CASE_ROW');const rows=JSON.parse(fs.readFileSync(aggregate,'utf8')).rows.filter(r=>r.fixture?.id===caseId&&r.variant===variant);assert.equal(rows.length,1,'UNIQUE_ADOPTED_ROW_REQUIRED');row=rows[0];}
 assert.equal(row.fixture?.id,caseId,'ROW_CASE_MISMATCH');assert.equal(row.variant,variant,'ROW_VARIANT_MISMATCH');assert.equal(row.status,'PASS','ADOPTED_ROW_NOT_COMPLETED');return row;
}
module.exports={readAdoptedMatrixRow};
