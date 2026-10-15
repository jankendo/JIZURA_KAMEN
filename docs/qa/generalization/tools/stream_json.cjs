'use strict';
const fs=require('node:fs'),path=require('node:path');
// Emit bounded tokens; no concatenation of the complete serialized object.
function* jsonTokens(value,space=2){
 const indent=typeof space==='number'?' '.repeat(Math.min(10,Math.max(0,space))):String(space).slice(0,10),seen=new Set();
 function* string(s){yield '"';for(let i=0;i<s.length;){let end=Math.min(s.length,i+32768);if(end<s.length&&s.charCodeAt(end-1)>=0xd800&&s.charCodeAt(end-1)<=0xdbff)end--;yield JSON.stringify(s.slice(i,end)).slice(1,-1);i=end;}yield '"';}
 function prepare(v,key){if(v!==null&&(typeof v==='object'||typeof v==='bigint')&&typeof v.toJSON==='function')v=v.toJSON(key);if(v instanceof Number||v instanceof String||v instanceof Boolean)v=v.valueOf();if(Object.prototype.toString.call(v)==='[object BigInt]')v=v.valueOf();if(typeof v==='bigint')throw new TypeError('Do not know how to serialize a BigInt');return v;}
 function* walk(v,depth){
  if(v===null){yield 'null';return;}switch(typeof v){case 'string':yield*string(v);return;case 'number':yield Number.isFinite(v)?String(v):'null';return;case 'boolean':yield String(v);return;}
  if(seen.has(v))throw new TypeError('Converting circular structure to JSON');seen.add(v);const array=Array.isArray(v),keys=array?Array.from({length:v.length},(_,i)=>String(i)):Object.keys(v);yield array?'[':'{';let count=0;
  for(const k of keys){let item=prepare(v[k],k);if(item===undefined||typeof item==='function'||typeof item==='symbol'){if(!array)continue;item=null;}if(count++)yield ',';if(indent)yield '\n'+indent.repeat(depth+1);if(!array){yield*string(k);yield indent?': ':':';}yield*walk(item,depth+1);}
  if(count&&indent)yield '\n'+indent.repeat(depth);yield array?']':'}';seen.delete(v);
 }
 value=prepare(value,'');if(value===undefined||typeof value==='function'||typeof value==='symbol')return;yield*walk(value,0);
}
function writeJSONAtomic(file,value,space=2){const temp=file+'.tmp-'+process.pid+'-'+Date.now();let fd;try{fd=fs.openSync(temp,'wx');const flush=s=>{const bytes=Buffer.from(s);for(let offset=0;offset<bytes.length;){const count=fs.writeSync(fd,bytes,offset,bytes.length-offset);if(count===0)throw new Error('Short write');offset+=count;}};let buffer='';for(const token of jsonTokens(value,space)){buffer+=token;if(buffer.length>=65536){flush(buffer);buffer='';}}if(buffer)flush(buffer);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(temp,file);const directory=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(directory);}finally{fs.closeSync(directory);}}catch(e){if(fd!==undefined)fs.closeSync(fd);try{fs.unlinkSync(temp);}catch{}throw e;}}
module.exports={jsonTokens,writeJSONAtomic};
