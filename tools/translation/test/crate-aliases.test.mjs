import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {sourceItems} from '../rust-structure.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateSource,sha256} from '../translate.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const modules=entries=>Object.entries(entries).map(([name,source])=>({file:name?`src/${name.replaceAll('::','/')}.rs`:'src/lib.rs',path:name?name.split('::'):[],source,items:sourceItems(source)}));
const resolve=(entries,options={})=>resolveModuleBindings({modules:modules(entries),...options});
const scope=(result,name='')=>result.scopes.find(scope=>scope.path.join('::')===name);
const type=(result,name,owner='')=>scope(result,owner).bindings.find(binding=>binding.name===name&&binding.namespace==='type');
async function both(result,assertions){
  const directory=mkdtempSync(join(tmpdir(),'router-crate-alias-'));
  try{writeRuntimeAssets(directory);const js=join(directory,'src/module.mjs'),ts=join(directory,'src/module.ts');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);execFileSync(process.execPath,['--check',js],{timeout:30_000});
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'compiled'),ts],{encoding:'utf8',timeout:30_000});
    for(const path of [js,join(directory,'compiled/module.js')])assertions((await import(pathToFileURL(path).href)).translated);
  }finally{rmSync(directory,{recursive:true,force:true});}
}
test('root self aliases bind only the actual crate type namespace and enter the extern prelude',()=>{
  const result=resolve({'':'extern crate self as router; pub mod model;',model:'pub struct Item; use router::model::Item as Alias;'});assert.deepEqual(result.diagnostics,[]);
  for(const owner of ['', 'model']){assert.deepEqual(type(result,'router',owner).target,['crate']);assert.equal(type(result,'router',owner).externCrateSelf,true);assert.equal(scope(result,owner).unresolvedTypeScope,false);assert.equal(scope(result,owner).unresolvedMacroScope,false);}
  assert.deepEqual(type(result,'Alias','model').target,['crate','model','Item']);assert.equal(scope(result).bindings.some(binding=>binding.name==='router'&&binding.namespace!=='type'),false);
});
test('nested self aliases remain local while absolute root aliases bypass a local shadow',()=>{
  const result=resolve({'':'extern crate self as router; pub struct Root; mod child;',child:'extern crate self as local; mod router; use local::Root as LocalRoot; use ::router::Root as AbsoluteRoot;', 'child::router':'pub struct Own;'});assert.deepEqual(result.diagnostics,[]);
  assert.deepEqual(type(result,'router','child').target,['crate','child','router']);assert.deepEqual(type(result,'local','child').target,['crate']);assert.equal(type(result,'local'),undefined);assert.deepEqual(type(result,'LocalRoot','child').target,['crate','Root']);assert.deepEqual(type(result,'AbsoluteRoot','child').target,['crate','Root']);
});
test('underscores introduce no binding and exact raw aliases retain their source name',()=>{
  const result=resolve({'':'extern crate self as _; extern crate self as r#match; pub struct Root; use r#match::Root as Alias;'});assert.deepEqual(result.diagnostics,[]);assert.equal(type(result,'_'),undefined);assert.deepEqual(type(result,'match').target,['crate']);assert.deepEqual(type(result,'Alias').target,['crate','Root']);
});
test('conditional self aliases require the exact supplied compilation profile',()=>{
  const source='#[cfg(not(test))] extern crate self as active; #[cfg(test)] extern crate self as inactive; #[cfg(unix)] extern crate self as maybe;';
  const result=resolve({'':source}, {compilationProfile:PRODUCTION_PROFILE});assert.deepEqual(type(result,'active').target,['crate']);assert.equal(type(result,'inactive'),undefined);assert.equal(type(result,'maybe').status,'unresolved');assert.equal(type(result,'maybe').target,null);
  assert.equal(resolve({'':source}).externPrelude.every(binding=>binding.status==='unresolved'),true);
});
test('real dependencies malformed aliases and unknown attributes never acquire self identity',()=>{
  for(const source of ['extern crate dependency as router;','extern crate std;','extern crate dependency;']){const result=resolve({'':source});assert.equal(result.externPrelude.every(binding=>binding.status==='unresolved'),true);assert.equal(result.scopes[0].bindings.every(binding=>binding.target===null),true);assert.ok(result.diagnostics.some(item=>item.message.includes('dependency identity remains unresolved')));}
  for(const source of ['extern crate self;','extern crate self as crate;','extern crate self as Name extra;','#[rewrite] extern crate self as router;']){const result=resolve({'':source});assert.equal(result.externPrelude.some(binding=>binding.status==='resolved'),false);assert.equal(result.scopes[0].unresolvedTypeScope,true);}
  const missing=resolveModuleBindings({modules:modules({child:'extern crate self as router;'})});assert.equal(missing.scopes[0].bindings.length,0);assert.equal(missing.scopes[0].unresolvedTypeScope,true);assert.ok(missing.diagnostics.some(item=>item.message.includes('actual tracked crate root')));
});
test('root alias imports and direct qualified calls execute checked source functions in both targets',{timeout:30_000},async()=>{
  const original=readFileSync(new URL('../../../src/lib.rs',import.meta.url),'utf8'),item=sourceItems(original).find(item=>item.start===442&&item.end===485),alias=original.slice(item.start,item.end);assert.equal(sha256(alias),'3471e8b9f454e4409592c8a71b8ba1d3d184dd12b68da16fab1190910ec382b4');
  const files={'src/lib.rs':alias+'\npub mod model; pub mod child; pub fn run(value:u8)->u8{child::read(value)}','src/model.rs':'pub fn next(value:u8)->u8{value+1}','src/child.rs':'use link_assistant_router::model::next; pub fn read(value:u8)->u8{next(value)} pub fn direct(value:u8)->u8{link_assistant_router::model::next(value)}'},result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});assert.deepEqual(result.meta.refused,[]);
  await both(result,api=>{assert.equal(api.run(7n),8n);assert.equal(api['child.direct'](2n),3n);assert.throws(()=>api.run(255n),RangeError);});
  const local=translateSource(files['src/child.rs'],'src/child.rs',{projectDeclarations:result.executableDeclarations,projectSourceScopes:result.sourceScopes});assert.equal(local.ir.counts.executableFunctions,2);assert.equal(local.ir.items.map(item=>item.source).join(''),files['src/child.rs']);await both(local,api=>assert.equal(api.direct(8n),9n));
});
test('unknown dependency aliases and self aliases to std cannot acquire registered host owners',()=>{
  for(const source of ['extern crate std; pub fn invented(value:u8)->std::option::Option<u8>{std::option::Option::Some(value)}','extern crate self as std; pub fn invented(value:u8)->std::option::Option<u8>{std::option::Option::Some(value)}','extern crate missing as router; pub fn invented()->u8{router::value()}']){const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.equal(result.meta.executable.some(item=>item.name==='invented'),false);}
});
test('nested aliases never enter unrelated child scopes and public aliases retain reexport visibility',()=>{
  const result=resolve({'':'pub extern crate self as router; pub struct Root; mod inner;',inner:'extern crate self as local; pub mod child;', 'inner::child':'pub use router as exported; use local::Root as Unproven;'});
  assert.equal(type(result,'local','inner::child'),undefined);assert.equal(type(result,'Unproven','inner::child').status,'unresolved');assert.deepEqual(type(result,'exported','inner::child').target,['crate']);
  const privateAlias=resolve({'':'extern crate self as router; mod child;',child:'pub use router as exported;'});assert.equal(type(privateAlias,'exported','child').status,'unresolved');
});
test('macro_use on unresolved external dependencies retains macro uncertainty without fabricated names',()=>{
  const result=resolve({'':'#[macro_use] extern crate missing as helper; mod child;',child:'pub fn plain(){}'});assert.equal(type(result,'helper','child').status,'unresolved');assert.equal(scope(result).unresolvedMacroScope,true);assert.equal(result.externPrelude.some(binding=>binding.namespace==='macro'),false);
});
