import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as current from '../source-module-views.mjs';
import {prepareModuleTokenLayout} from '../prepare-module-token-layout.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const path='tools/translation/source-module-views.mjs';
const fixture='tools/translation/source-profiles/module-token-layout/original-source.mjs.txt';
const hash=value=>createHash('sha256').update(value).digest('hex');
const originalSource=readFileSync(join(root,fixture),'utf8');
assert.equal(hash(originalSource),'7102dd98986e9ad3965ebfc51ab339079f50da2df6ce35fdb3548859b653ae3e');
let instrumented=originalSource;
for(const name of ['rust-structure.mjs','cfg-profile.mjs'])instrumented=instrumented.replace("'./"+name+"'",JSON.stringify(new URL('../'+name,import.meta.url).href));
const original=await import('data:text/javascript;base64,'+Buffer.from(instrumented).toString('base64'));
function capture(api,source,sourcePath='src/lib.rs',profile=null){
 const result=api.captureSourceModuleViews({source,sourcePath,compilationProfile:profile});
 return {result,items:result.views.map(view=>api.originalModuleViewItems(view,source))};
}
function compare(source,label,profile=null){
 const before=capture(original,source,label,profile),after=capture(current,source,label,profile);
 assert.deepEqual(after,before,label+' complete original views, items, tokens and evidence');
 for(let at=0;at<after.result.views.length;at++){
  const view=after.result.views[at];
  assert.equal(current.isSourceModuleView(view),true);
  assert.equal(current.originalModuleViewItems(view,source),after.items[at]);
  assert.equal(current.originalModuleViewParent(view)?.digest??null,view.parentDigest);
  assert.equal(current.isSourceModuleView(structuredClone(view)),false);
  for(const item of after.items[at])for(const token of item.tokens){
   assert.equal(Object.getPrototypeOf(token),Object.prototype);
   assert.deepEqual(Reflect.ownKeys(token),['type','text','start','end']);
   assert.equal(Object.isFrozen(token),true);
   assert.equal(source.slice(token.start,token.end),token.text);
  }
 }
 return {path:label,sourceSha256:hash(source),sha256:hash(JSON.stringify(after)),views:after.result.views.length};
}
test('token layout producer preserves actual native bindings and complete two-phase CST inverses',{timeout:60000},()=>{
 const row=prepareModuleTokenLayout();
 assert.equal(row.before,row.after);assert.equal(row.after,readFileSync(join(root,path),'utf8'));
 assert.equal(row.original,originalSource);assert.equal(row.inverse,originalSource);
 assert.equal(row.newAcrossInvocationCaches,false);assert.equal(row.originalLexerUnchanged,true);assert.equal(row.originalBoundsUnchanged,true);
 assert.equal(row.sourceAuthority,false);assert.equal(row.runtimeAuthority,false);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.source);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.target);assert.equal(stage.inverse,stage.source);}
 assert.equal(row.native.edits.length,2);assert.equal(row.native.inverseEdits.length,2);
});
test('all complete tracked Router Rust sources match the independently pinned original view implementation',{timeout:60000},t=>{
 const paths=execFileSync('git',['ls-files','-z','--','rust/src/*.rs','rust/src/**/*.rs'],{cwd:root}).toString().split('\0').filter(Boolean);
 assert.ok(paths.length>=567,'complete production source census, including test source');
 const rows=paths.map(path=>compare(readFileSync(join(root,path),'utf8'),path));
 t.diagnostic(JSON.stringify({files:rows.length,completeResultsSha256:hash(JSON.stringify(rows)),scope:'Every tracked rust/src Rust file; no source selection or application parity inference.'}));
});
test('opaque Unicode literals and configuration profiles preserve values and fresh frozen identities',()=>{
 const sources=['','// 🌍\nmod r#type {pub const V:&str=r##"{🌍}"##;}','mod outer{mod inner{fn f(){\'}\';}}}',
  '#[cfg(unix)] mod platform {#![cfg(test)] pub const VALUE:u8=1;}','//\ud800\nmod child {pub const V:u8=1;}'];
 for(const source of sources)for(const profile of [null,{flags:{unix:true,test:false}},{flags:{windows:true,test:true}}])compare(source,'src/example.rs',profile);
 const source='mod child{pub const VALUE:u8=7;}',first=capture(current,source),second=capture(current,source);
 assert.notEqual(first.result.views[0],second.result.views[0]);assert.notEqual(first.items[0],second.items[0]);assert.notEqual(first.items[0][0].tokens[0],second.items[0][0].tokens[0]);
 assert.throws(()=>current.originalModuleViewItems(first.result.views[0],source+' '),/changed/);
 assert.throws(()=>current.originalModuleViewItems(Object.freeze(structuredClone(first.result.views[0])),source),/unsealed/);
});
function observed(api,kind){
 const events=[],symbol=Symbol.for('module-token-layout-observer'),source='pub const VALUE:u8=7;';
 const map=Array.prototype.map,values=Object.values,freeze=Object.freeze,slice=String.prototype.slice;
 const token=value=>value&&typeof value==='object'&&Object.hasOwn(value,'type')&&Object.hasOwn(value,'text')&&Object.hasOwn(value,'start')&&Object.hasOwn(value,'end');
 try{
  if(kind==='map'||kind==='restored-map')Array.prototype.map=function(callback,...args){
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
  if(kind==='values')Object.values=function(value){if(token(value))events.push('values:'+value.text);return values(value);};
  if(kind==='freeze')Object.freeze=function(value){if(token(value))events.push('freeze:'+value.text);return freeze(value);};
  if(kind==='slice')String.prototype.slice=function(...args){events.push('slice');return Reflect.apply(slice,this,args);};
  const result=capture(api,source);
  return {result,events};
 }finally{Array.prototype.map=map;Object.values=values;Object.freeze=freeze;String.prototype.slice=slice;}
}
test('changed hooks getters extra symbol cells and self-restoring hooks retain the complete original fallback',()=>{
 for(const kind of ['map','restored-map','values','freeze','slice']){
  const before=observed(original,kind),after=observed(current,kind);
  assert.deepEqual(after,before,kind+' complete original output and observation order');
  assert.ok(before.events.length,kind+' actually observed');
  if(kind.includes('map')){
   const token=after.result.items[0][0].tokens[0];assert.equal(token.probe,'retained');assert.equal(token[Symbol.for('module-token-layout-observer')],'symbol-value');
  }
 }
});
test('unrelated physical bodies and changed original source pins remain refused',{timeout:60000},()=>{
 const temporary=mkdtempSync(join(tmpdir(),'router-token-layout-'));
 try{
  for(const name of [path,fixture])mkdirSync(join(temporary,name,'..'),{recursive:true});
  writeFileSync(join(temporary,fixture),originalSource);writeFileSync(join(temporary,path),readFileSync(join(root,path),'utf8')+'\n// unrelated body\n');
  assert.throws(()=>prepareModuleTokenLayout({root:temporary}),/physical source differs/);
  writeFileSync(join(temporary,fixture),originalSource+'\n');
  assert.throws(()=>prepareModuleTokenLayout({root:temporary}),/source pin differs/);
 }finally{rmSync(temporary,{recursive:true,force:true});}
});
