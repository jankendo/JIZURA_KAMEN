import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
export function validateSourceOrder(manifest,actual){
 if(!Array.isArray(manifest)||manifest.some(name=>typeof name!=='string'||!/^\d[^/]*\.js$/.test(name)))throw Error('Invalid source manifest');
 if(new Set(manifest).size!==manifest.length)throw Error('Duplicate source manifest entry');
 const unknown=actual.filter(name=>!manifest.includes(name)),missing=manifest.filter(name=>!actual.includes(name));
 if(unknown.length||missing.length)throw Error('Source manifest mismatch: unknown='+unknown.join(',')+' missing='+missing.join(','));
 if(manifest.some((name,i)=>name!==[...actual].sort()[i]))throw Error('Source load order drift');return manifest;
}
export async function readSourceOrder(root){return validateSourceOrder(JSON.parse(await readFile(path.join(root,'scripts/source-manifest.json'),'utf8')),(await readdir(path.join(root,'src'))).filter(name=>name.endsWith('.js')));}
// Observe function identities after each synchronous module; never wrap or replace them.
export const auditBootstrap=`window.KAMEN_MODULE_AUDIT={modules:[],registrations:[],warnings:[],previous:new Map(),owners:new Map(),observe(moduleId){
 if(this.modules.includes(moduleId))this.warnings.push('DUPLICATE_MODULE:'+moduleId);this.modules.push(moduleId);
 const J=window.J;if(!J)return;const entries=[...Object.entries(J),...Object.entries(J.Renderer?.prototype||{}).map(([k,v])=>['Renderer.prototype.'+k,v])];
 for(const [property,value]of entries){if(typeof value!=='function'||this.previous.get(property)===value)continue;
 const previousId=this.owners.get(property)||null;this.registrations.push({moduleId,property,previousId,registration:this.registrations.length});this.previous.set(property,value);this.owners.set(property,moduleId);}
}};`;
export const auditBoundary=name=>`\nwindow.KAMEN_MODULE_AUDIT.observe(${JSON.stringify(name)});\n`;
