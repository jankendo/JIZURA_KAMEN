const assert=require('node:assert/strict');const {chantProject}=require('./hype_test_helpers.cjs');
const {J,p,a,plan}=chantProject(),range={start:0,end:plan.duration};
const good=J.hypeQuality(p,plan,a,range,{metrics:{motionEnergy:.12}}),bad=J.hypeQuality(p,plan,a,range,{metrics:{motionEnergy:.5}});
assert(good.hookStrength>=80&&good.scrollStopPower>=75&&good.socialShareability>=75);assert(bad.hardFail);assert(bad.visualEnergyDensity<good.visualEnergyDensity);
const report=J.checkMVQuality(p,plan,{...a,buffer:{}},range,{completed:true,metrics:{motionEnergy:.5}},{webCodecs:true,h264:true,aac:true});assert(report.issues.some(x=>x.code==='motion_excess'&&x.severity==='ERROR'));assert(!report.quality.hardGates.passed);console.log('Scroll-stop metrics reward a strong hook while motion excess hard-fails.');
