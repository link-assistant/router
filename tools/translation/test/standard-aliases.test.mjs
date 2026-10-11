import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
async function execute(result,assertions){
  assert.deepEqual(result.meta?.refused??result.ir.items.filter(item=>item.term==='fn'&&item.status!=='executable'),[]);
  const directory=mkdtempSync(join(tmpdir(),'router-standard-alias-'));
  try{
    writeRuntimeAssets(directory);const js=join(directory,'src/module.mjs'),ts=join(directory,'src/module.ts');
    writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);execFileSync(process.execPath,['--check',js]);
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'compiled'),ts],{encoding:'utf8'});
    for(const path of [js,join(directory,'compiled/module.js')])assertions((await import(pathToFileURL(path).href)).translated);
  }finally{rmSync(directory,{recursive:true,force:true});}
}
const none=Object.freeze({$:'None'}),some=value=>Object.freeze({$:'Some',field0:value});
test('registered Option aliases and fully qualified owners preserve checked constructors and patterns',async()=>{
  const source='use std::option::Option as Maybe; pub fn create(value:u8)->Maybe<u8>{Maybe::Some(value)} pub fn empty()->std::option::Option<u8>{std::option::Option::None} pub fn read(value:Maybe<u8>)->u8{match value{Maybe::Some(item)=>item,Maybe::None=>9}} pub fn qualified(value:u8)->std::option::Option<u8>{std::option::Option::Some(value)}';
  const result=project(source);await execute(result,api=>{assert.deepEqual(api.create(7n),some(7n));assert.deepEqual(api.empty(),none);assert.equal(api.read(some(3n)),3n);assert.equal(api.read(none),9n);assert.deepEqual(api.qualified(8n),some(8n));assert.throws(()=>api.create(256n),RangeError);});
  const local=translateSource(source,'src/lib.rs',{projectDeclarations:result.executableDeclarations,projectSourceScopes:result.sourceScopes});assert.equal(local.ir.counts.executableFunctions,4);await execute(local,api=>assert.equal(api.read(some(5n)),5n));
});
test('registered Result aliases preserve both variants and checked result callbacks',async()=>{
  const result=project('use std::result::Result as Answer; pub fn success(value:u8)->Answer<u8,u16>{Answer::Ok(value)} pub fn failure(value:u16)->std::result::Result<u8,u16>{std::result::Result::Err(value)} pub fn read(value:Answer<u8,u16>)->u16{match value{Answer::Ok(item)=>item as u16,Answer::Err(error)=>error}} pub fn option(value:Answer<u8,u16>)->Option<u8>{value.ok()}');
  await execute(result,api=>{assert.deepEqual(api.success(7n),{$:'Ok',field0:7n});assert.deepEqual(api.failure(300n),{$:'Err',field0:300n});assert.equal(api.read({$:'Ok',field0:7n}),7n);assert.equal(api.read({$:'Err',field0:300n}),300n);assert.deepEqual(api.option({$:'Ok',field0:7n}),some(7n));assert.deepEqual(api.option({$:'Err',field0:300n}),none);});
});
test('standard alias registration never erases actual source function constructor owners',async()=>{
  const files={'src/lib.rs':'mod owner; use std::option::Option as Maybe; pub fn run(value:u8)->Maybe<u8>{owner::Some(value)}','src/owner.rs':'pub fn Some(value:u8)->Option<u8>{Option::Some(value+1)}'};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});await execute(result,api=>assert.deepEqual(api.run(1n),some(2n)));
});
test('local owners, unknown imports and mismatched layouts cannot acquire standard generic semantics',()=>{
  for(const source of [
    'mod std{} pub fn invented(value:u8)->std::option::Option<u8>{std::option::Option::Some(value)}',
    'mod Option{} pub fn invented(value:u8)->std::option::Option<u8>{Option::Some(value)}',
    'mod other{pub enum Option{None,Some(u8)}} use crate::other::Option as Maybe; pub fn invented(value:Maybe<u8>)->bool{value.is_some_and(|v|v>0)}',
    'use custom::*; pub fn invented()->std::option::Option<u8>{None}',
    'use custom::*; pub fn invented(value:std::option::Option<u8>)->u8{match value{Some(item)=>item,None=>0}}',
    'use std::option::Option as Maybe; pub fn invented(value:u8)->Result<u8,u8>{Maybe::Some(value)}',
    'use std::result::Result as Answer; pub fn invented(value:Option<u8>)->u8{match value{Answer::Some(item)=>item,Answer::None=>0}}',
    'use std::option::Option as Maybe; pub fn invented(value:Maybe<u8,u16>)->bool{true}',
    'use std::result::Result as Answer; pub fn invented(value:Answer<u8>)->bool{true}',
  ])assert.equal(project(source).meta.executable.some(entry=>entry.name==='invented'),false,source);
});

test('explicit standard constructor imports and source reexports retain both namespace identities',async()=>{
  const files={'src/lib.rs':'mod bridge; use crate::bridge::{Present,Absent,Success}; pub fn create(value:u8)->Option<u8>{Present(value)} pub fn read(value:Option<u8>)->u8{match value{Present(item)=>item,Absent=>9}} pub fn result(value:u8)->Result<u8,u16>{Success(value)}','src/bridge.rs':'pub use std::option::Option::{Some as Present,None as Absent}; pub use std::result::Result::Ok as Success;'};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});await execute(result,api=>{assert.deepEqual(api.create(4n),some(4n));assert.equal(api.read(some(7n)),7n);assert.equal(api.read(none),9n);assert.deepEqual(api.result(2n),{$:'Ok',field0:2n});});
  const scope=result.meta.bindingEvidence.scopes.find(scope=>scope.file==='src/lib.rs');for(const name of ['Present','Absent','Success'])assert.deepEqual(scope.bindings.filter(binding=>binding.name===name).map(binding=>binding.namespace).sort(),['type','value']);
});
