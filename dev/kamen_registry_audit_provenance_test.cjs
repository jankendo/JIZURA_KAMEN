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
assert(current.style.every(x=>!x.nativeDispatch.currentBuildVerified),'matching version alone cannot establish current source');
context.window.KAMEN_BUILD_INFO={sourceTreeSHA256:'a'.repeat(64),sourceCommit:'b'.repeat(40)};
Object.assign(J.registryAudit,{sourceTreeSHA256:'a'.repeat(64),sourceCommit:'b'.repeat(40),sourceDirty:false});
assert(J.registrySelectionCatalog().style.every(x=>x.nativeDispatch.currentBuildVerified),'matching complete current-source identity may be current');
J.registryAudit.sourceTreeSHA256='c'.repeat(64);
assert(J.registrySelectionCatalog().style.every(x=>!x.nativeDispatch.currentBuildVerified),'same version with changed renderer source is stale');
delete context.window.KAMEN_APP_INFO;
assert(J.registrySelectionCatalog().style.every(x=>!x.nativeDispatch.currentBuildVerified),'unknown runtime version must remain unverified');
console.log('Registry audit provenance: mismatched, matched, unknown versions PASS');
