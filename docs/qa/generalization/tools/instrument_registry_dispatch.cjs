'use strict';
// Snapshot original registry entries BEFORE any mutation, and wrap each shared
// entry object once. Sharing a function across distinct entries is not an alias.
function instrumentRegistryDispatch(registry,method,{register,invoke,selectAlias}={}){
 const groups=[],byObject=new Map();
 for(const [id,entry]of Object.entries(registry||{})){
  const original=entry?.[method];if(typeof original!=='function')continue;
  let group=byObject.get(entry);if(!group){group={entry,original,aliases:[],entryObjectId:groups.length+1};byObject.set(entry,group);groups.push(group);}else if(group.original!==original)throw Error('REGISTRY_MUTATED_DURING_SNAPSHOT');group.aliases.push(id);
 }
 for(const g of groups){for(const id of g.aliases)register?.({id,original:g.original,aliases:g.aliases.slice(),entryObjectId:g.entryObjectId});g.entry[method]=function(...args){const selected=selectAlias?.(g.aliases,args),id=g.aliases.includes(selected)?selected:g.aliases[0],meta={id,aliases:g.aliases.slice(),entryObjectId:g.entryObjectId,selectedAliasResolved:g.aliases.includes(selected)};return invoke(meta,args,()=>g.original.apply(this,args));};}
 return {restore(){for(const g of groups)g.entry[method]=g.original;},entryObjects:groups.length};
}
if(typeof module!=='undefined')module.exports={instrumentRegistryDispatch};
