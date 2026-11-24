import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareRustTokenLayout} from './prepare-rust-token-layout.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const path='tools/translation/rust-structure.mjs';
const fixture='experiments/issue-784/rust-token-original-source.mjs.txt';
const hash=value=>createHash('sha256').update(value).digest('hex');
const originalSource=readFileSync(join(root,fixture),'utf8');
assert.equal(hash(originalSource),'ea09bde0452ff0e8021454e2c0040b6bdd8493163b0ab48cea496353e6b92261');
async function load(source){
 for(const name of ['vendor/formal-ai/lexer.mjs','rust-item-boundaries.mjs','original-json-intrinsics.mjs'])source=source.replace("'./"+name+"'",JSON.stringify(new URL('../../tools/translation/'+name,import.meta.url).href));
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const original=await load(originalSource),proposal=prepareRustTokenLayout(),current=await load(proposal.after);
function capture(api,source){
 try{return {tokens:api.rustTokens(source),items:api.sourceItems(source)};}
 catch(error){return {error:{name:error.name,message:error.message}};}
}
function compare(source,label){
 const before=capture(original,source),after=capture(current,source);
 assert.deepEqual(after,before,label+' complete original tokens, items or refusal');
 for(const token of after.tokens??[]){
  assert.equal(Object.getPrototypeOf(token),Object.prototype);
  assert.deepEqual(Reflect.ownKeys(token),['type','text','start','end']);
  assert.equal(source.slice(token.start,token.end),token.text);
  for(const key of Reflect.ownKeys(token)){
   const field=Object.getOwnPropertyDescriptor(token,key);
   assert.ok(Object.hasOwn(field,'value')&&field.enumerable&&field.configurable&&field.writable);
  }
 }
 return {path:label,sourceSha256:hash(source),resultSha256:hash(JSON.stringify(after)),refused:!!after.error};
}
test('uninstalled Rust token proposal retains genuine native bindings and both complete CST inverses',{timeout:60000},()=>{
 const row=prepareRustTokenLayout();assert.equal(row.before,row.original);
 assert.notEqual(row.after,readFileSync(join(root,path),'utf8'));
 assert.equal(row.original,originalSource);assert.equal(row.inverse,originalSource);
 assert.equal(row.newAcrossInvocationCaches,false);assert.equal(row.originalLexerUnchanged,true);
 assert.equal(row.originalBoundsUnchanged,true);assert.equal(row.sourceAuthority,false);assert.equal(row.runtimeAuthority,false);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.source);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.target);
  assert.equal(stage.inverse,stage.source);
 }
 assert.equal(row.native.edits.length,2);assert.equal(row.native.inverseEdits.length,2);
});
test('every complete tracked Rust source preserves original tokens items and refusals',{timeout:60000},t=>{
 const paths=execFileSync('git',['ls-files','-z','--','*.rs'],{cwd:root}).toString().split('\0').filter(Boolean);
 assert.ok(paths.length>=847,'complete tracked Rust source census');
 const rows=paths.map(path=>compare(readFileSync(join(root,path),'utf8'),path));
 t.diagnostic(JSON.stringify({files:rows.length,completeResultsSha256:hash(JSON.stringify(rows)),refused:rows.filter(row=>row.refused).length,
  scope:'Every tracked Rust file, including retained malformed inputs. No executable or native parity claim.'}));
});
test('opaque nested literals malformed input and fresh mutable tokens preserve the old API',()=>{
 for(const source of ['', '\uFEFF// 😀é\r\npub const V:&str=r##"{🌍}"##;',
  "mod child{fn f(){'}';}}",'/* outer /* inner */ end */ fn f(){}',
  '//\ud800\nfn f(){}','const V:&str="unterminated','/* missing','const V:&str=r##"missing'])compare(source,'fixture.rs');
 const first=current.rustTokens('pub fn f(){}'),second=current.rustTokens('pub fn f(){}');
 assert.notEqual(first,second);assert.notEqual(first[0],second[0]);
 first[0].text='changed';assert.equal(second[0].text,'pub');
 const items=current.sourceItems('pub fn f(){}');assert.equal(items[0].term,'fn');assert.equal(items[0].name,'f');
});
function observed(api,kind){
 const map=Array.prototype.map,slice=String.prototype.slice,events=[],symbol=Symbol.for('rust-token-layout-observer');
 const token=value=>value&&typeof value==='object'&&Object.hasOwn(value,'type')&&Object.hasOwn(value,'text')&&Object.hasOwn(value,'start')&&Object.hasOwn(value,'end');
 try{
  if(kind.includes('map'))Array.prototype.map=function(callback,...args){
   if(this.length&&token(this[0])){
    events.push('map:'+this.length);
    for(const value of this)if(token(value)&&!Object.hasOwn(value,'probe')){
     Object.defineProperty(value,'probe',{enumerable:true,configurable:true,get(){events.push('get:'+this.text);return 'retained';}});
     value[symbol]='symbol-value';
    }
    if(kind==='restored-map')Array.prototype.map=map;
   }
   return Reflect.apply(map,this,[callback,...args]);
  };
  if(kind==='slice')String.prototype.slice=function(...args){events.push('slice');return Reflect.apply(slice,this,args);};
  return {tokens:api.rustTokens('pub const VALUE:u8=7;'),events};
 }finally{Array.prototype.map=map;String.prototype.slice=slice;}
}
test('customized and self-restoring hooks preserve extra getters symbols and complete operation order',()=>{
 for(const kind of ['map','restored-map','slice']){
  const before=observed(original,kind),after=observed(current,kind);
  assert.deepEqual(after,before,kind+' complete values and observation order');
  assert.ok(before.events.length);
  if(kind.includes('map')){assert.equal(after.tokens[0].probe,'retained');assert.equal(after.tokens[0][Symbol.for('rust-token-layout-observer')],'symbol-value');}
 }
});
test('changed complete physical sources and original source pins remain refused',{timeout:60000},()=>{
 const temporary=mkdtempSync(join(tmpdir(),'router-rust-token-layout-'));
 try{
  for(const name of [path,fixture])mkdirSync(join(temporary,name,'..'),{recursive:true});
  writeFileSync(join(temporary,fixture),originalSource);
  writeFileSync(join(temporary,path),readFileSync(join(root,path),'utf8')+'\n// unrelated body\n');
  assert.throws(()=>prepareRustTokenLayout({root:temporary}),/physical source differs/);
  writeFileSync(join(temporary,fixture),originalSource+'\n');
  assert.throws(()=>prepareRustTokenLayout({root:temporary}),/source pin differs/);
 }finally{rmSync(temporary,{recursive:true,force:true});}
});
