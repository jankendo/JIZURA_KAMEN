/* Persistence projection: diagnostics are not renderer decisions. Keep entry
   cuts, safety evidence, identities, locks and resolved patches byte-equivalent.
   Apply the same projection to both direction copies to preserve restore's
   direction equality contract. Live diagnostic catalogs remain in memory. */
(()=>{'use strict';
const J=window.J;
J.compactPersistentProjectV111=project=>{
 const q=JSON.parse(JSON.stringify(project));
 const compact=d=>{
  if(d?.optimizerVersion!==11)return;
  const trace=t=>{
   delete t.candidates;delete t.exclusions;
   if(t.creative){delete t.creative.catalog;delete t.creative.exclusions;}
  };
  const s=d.selection;if(!s)return;
  for(const t of s.traces||[])trace(t);
  for(const alt of s.alternatives||[]){for(const t of alt.traces||[])trace(t);}
 };
 compact(q.artDirection?.songNativeDirection);compact(q.artDirection?.songNativeResolved?.direction);
 return q;
};
// Legacy direction inspection assumes one global vocabulary. v11 instead
// validates the committed per-line registry choices and bound safety evidence.
const inspect=J.inspectDirection;
J.inspectDirection=p=>{
 if(!J.isSongDerivedV11(p))return inspect(p);
 const state=J.selectionIntegrityV9(p),violations=[...state.errors];
 for(const c of p.cuts.filter(c=>c.line>=0)){
  if(!J.STYLES[c.styleKey])violations.push('UNKNOWN_STYLE_'+c.line);
  for(const g of ['layout','enter','hold','exit','cam','bg','treat','trans'])if(c[g]&&!(g==='trans'&&c[g]==='cut')&&!J.registry(g)[c[g]])violations.push('UNKNOWN_'+g+'_'+c.line);
  for(const dec of c.decor||[])if(!J.registry('decor')[dec.id])violations.push('UNKNOWN_DECOR_'+c.line);
  if(c.registryFxV9&&!J.FXE[c.registryFxV9])violations.push('UNKNOWN_FX_'+c.line);
 }
 return {coherent:!violations.length,violations:[...new Set(violations)],contract:'v9 selected per-line registry and Canvas safety'};
};
})();
