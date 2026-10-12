'use strict';
const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs');
const {J,context}=engine();
assert(J.registryAudit&&J.registryAudit.version);
context.window.KAMEN_APP_INFO={version:'99.99.99'};
const stale=J.registrySelectionCatalog();
for(const [group,entries] of Object.entries(stale)){
 for(const entry of entries){
  assert.equal(entry.nativeDispatch.currentBuildVerified,false,group+'.'+entry.id);
  assert.equal(entry.nativeDispatch.evidenceStatus,'STALE_OR_UNKNOWN_VERSION',group+'.'+entry.id);
  assert.equal(entry.nativeDispatch.auditedVersion,J.registryAudit.version);
 }
}
context.window.KAMEN_APP_INFO={version:J.registryAudit.version};
const current=J.registrySelectionCatalog();
assert(current.style.every(x=>x.nativeDispatch.currentBuildVerified),'exact matching versions may be labelled current');
delete context.window.KAMEN_APP_INFO;
assert(J.registrySelectionCatalog().style.every(x=>!x.nativeDispatch.currentBuildVerified),'unknown runtime version must remain unverified');
console.log('Registry audit provenance: mismatched, matched, unknown versions PASS');
