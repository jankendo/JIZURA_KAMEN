const assert=require('node:assert/strict');const {chantProject}=require('./hype_test_helpers.cjs');
const {J,p,a,plan}=chantProject();assert.equal(plan.visualEnergyDensity.tier,'HYPER');assert(plan.visualEnergyDensity.chant);
const soft={...p,visualEnergyDensity:'clean'},clean=J.resolveVisualEnergy(soft,{features:{energy:.12,beatStrength:.1,onsetDensity:.08}});assert.equal(clean.tier,'CLEAN');
for(const tier of ['CLEAN','STANDARD','HIGH_ENERGY','HYPER']){const decision=J.resolveVisualEnergy({...p,visualEnergyDensity:tier},a);assert.equal(decision.tier,tier);assert(decision.scale>0&&decision.scale<=1.2);}
assert(plan.hypeAudit.eventRate>=.3&&plan.hypeAudit.bounded);console.log('Automatic, manual and bounded visual-energy tiers pass.');
