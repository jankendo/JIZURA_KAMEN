'use strict';
// Rendering can clone a cut. Resolve its exact immutable fragment contract,
// never an authored index or line alone. Source/reference hashes are checked by callers.
function resolveActualCutOrdinal(plan,cut){
 if(!cut)return -1;
 const direct=plan.cuts.indexOf(cut);if(direct>=0)return direct;
 const matches=plan.cuts.flatMap((x,i)=>x.index===cut.index&&x.line===cut.line&&x.start===cut.start&&x.end===cut.end&&String(x.text??x.lineText)===String(cut.text??cut.lineText)?[i]:[]);
 if(matches.length!==1)throw Error('ACTUAL_CUT_CONTRACT_NOT_UNIQUE');return matches[0];
}
module.exports={resolveActualCutOrdinal};
