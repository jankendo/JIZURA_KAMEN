'use strict';
function resolveTranslationTargets(units,trace){
 const seen=new Set(),out=[];
 for(const t of trace.filter(x=>x.mode==='ON'&&x.pass==='main'&&x.target==='primary-uniform-translation')){
  if(!Array.isArray(t.range)||t.range.length!==2||!t.range.every(Number.isFinite))throw Error('INVALID_TARGET_RANGE');
  const key=JSON.stringify([t.line,...t.range]);if(seen.has(key))continue;seen.add(key);
  const matches=units.flatMap(u=>(u.line===t.line?u.fragments:[]).filter(f=>f.from===t.range[0]&&f.to===t.range[1]).map(fragment=>({unit:u,fragment})));
  if(matches.length!==1)throw Error('TARGET_FRAGMENT_NOT_UNIQUE');
  out.push({...matches[0],binding:{line:t.line,range:t.range,authoredCutIndex:t.cutIndex,fragmentOrdinal:matches[0].fragment.index}});
 }
 if(!out.length)throw Error('NO_NATURAL_UNIFORM_TRANSLATION_TARGET');return out;
}
module.exports={resolveTranslationTargets};
