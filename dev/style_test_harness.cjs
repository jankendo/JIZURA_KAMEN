const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const window={},document={getElementById(){return null},createElement(){return {getContext(){return {measureText(s){return {width:String(s).length*20}}}}}},fonts:{load:async()=>[],ready:Promise.resolve()},head:{appendChild(){}}};
const ctx=vm.createContext({window,document,console,Blob,TextEncoder,URL,setTimeout,clearTimeout,performance,requestAnimationFrame(){}});
for(const f of fs.readdirSync(path.join(__dirname,'../src')).filter(x=>x.endsWith('.js')).sort())vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',f),'utf8'),ctx,{filename:f});
module.exports=window.J;
