// Original complete module under the receiving engine. Keep its canonical URL
// so all private issuers retain one module instance. No copied public proof.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const project=new URL('../../project.mjs',import.meta.url);
const profile=new URL('../../source-profiles/project-facade-retention/',import.meta.url);
const digest=value=>createHash('sha256').update(value).digest('hex');
const manifest=readFileSync(new URL('manifest.json',profile));
assert.equal(digest(manifest),'435847f54eceedb2506b10cac8cfab73e44a81f75b5044952792a920eaba3b3e');
const pin=JSON.parse(manifest),packed=readFileSync(new URL(pin.archive,profile));
assert.equal(packed.length,pin.archiveBytes);assert.equal(digest(packed),pin.archiveSha256);
const raw=gunzipSync(packed,{maxOutputLength:262144});assert.equal(raw.length,pin.bytes);assert.equal(digest(raw),pin.sha256);
const original=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw);assert.equal(digest(original),pin.sha256);
if(process.versions.bun){
 const {plugin}=await import('bun');
 plugin({name:'complete-original-project-facade',setup(builder){
  builder.onLoad({filter:/\/tools\/translation\/project\.mjs$/},args=>{
   assert.equal(args.path,project.pathname);return {contents:original,loader:'js'};
  });
 }});
}else{
 const {register}=await import('node:module');
 register(new URL('./project-facade-engine-loader.mjs',import.meta.url),{data:{url:project.href,source:original}});
}
const {translateProject}=await import(project.href);
const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=> 'pub fn root(x:u8)->u8{x+1}'});
const facade=result.executableDeclarations.find(row=>row.name==='root');
const observe=fn=>({name:fn.name,length:fn.length,prototype:Object.hasOwn(fn,'prototype'),source:Function.prototype.toString.call(fn)});
console.log(JSON.stringify({originalSha256:pin.sha256,lower:observe(facade.lower),checkedSource:observe(facade.checkedSource)}));
