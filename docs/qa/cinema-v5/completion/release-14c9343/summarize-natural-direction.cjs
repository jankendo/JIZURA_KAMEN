const fs=require('node:fs'),path=require('node:path');
const root='/workspace/kamen-v5-results',clips=[];
const routeDir=path.join(root,'legacy-routes-e0ee14a');
for(const id of ['natural-calm','natural-chant']){
 const name=fs.readdirSync(routeDir).find(n=>n.startsWith(id+'-v3-final-reobserved-')&&n.endsWith('.json')&&JSON.parse(fs.readFileSync(path.join(routeDir,n))).artifact.verifierIdentity.sourceCommit==='7fad8cb6f0d62b31dba72c608401a8c577ffc949');
 const row=JSON.parse(fs.readFileSync(path.join(routeDir,'results.json'))).rows.find(r=>r.fixture.id===id);clips.push({id,row,artifact:JSON.parse(fs.readFileSync(path.join(routeDir,name))).artifact});
}
const row=JSON.parse(fs.readFileSync(path.join(root,'natural-no-image-7fad8cb/results.json'))).rows[0];clips.push({id:'natural-no-image',row,artifact:row.provenance.finalArtifactVerification});
const ui=JSON.parse(fs.readFileSync(path.join(root,'formal-ui-14c9343/report.json')));clips.push({id:'formal-shipping-UI-14c9343',row:ui,artifact:ui.provenance.finalArtifactVerification});
let allSelected=0,applicable=0,measured=0,success=0,notApplicable=0;const observations=[];
for(const {id,row,artifact:a}of clips){
 const [start,end]=a.binding.outputProfile.range,selected=row.provenance.plannedOperatorContracts.units.filter(c=>c.naturalSelection),outside=selected.filter(c=>c.start>=end||c.end<=start);
 allSelected+=selected.length;notApplicable+=outside.length;
 for(const m of a.motionObservations.filter(m=>m.naturalSelection)){
  applicable++;const i=m.intentObservation;if(i.status==='MEASURED'){measured++;if(i.passed)success++;}
  observations.push({clip:id,videoSHA256:a.binding.videoSHA256,planHash:a.binding.planHash,unitId:m.unitId,intent:m.intent,operator:m.operator,target:m.target,expectedMotion:m.expectedMotion,confidence:m.confidence,measurable:m.measurable,expected:i.expected??null,observed:i.observed??null,timeRange:m.timeRange,status:i.status,passed:i.passed??null,realization:i.realization??null,failureReason:i.failureReason??null,method:i.method??null});
 }
 for(const c of outside)observations.push({clip:id,operator:c.operator,timeRange:[c.start,c.end],status:'NOT_APPLICABLE',reason:'Outside the actual selected MP4 export range; not an unmeasured in-video effect'});
}
const d={scope:'Normal shipping optimizeDirectionCandidatesRendered only; fixed initial style comparisons and forced controls excluded',allSelectedPlanUnits:allSelected,exportApplicablePopulation:applicable,notApplicableOutsideExport:notApplicable,intentMeasured:measured,intentSuccessful:success,measurableRateOfApplicable:measured/applicable,measurableRateOfAllSelected:measured/allSelected,realizationSuccessRate:success/measured,unmeasuredApplicable:applicable-measured,humanStatus:'HUMAN_UNVERIFIED',aestheticExcellenceClaim:false,observations};
fs.writeFileSync(path.join(root,'natural-direction-census.json'),JSON.stringify(d,null,2));console.log(JSON.stringify({allSelected,applicable,notApplicable,measured,success}));
