import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {regenerate} from '../bulk.mjs';
import {loadJavaScript,writeRuntimeAssets} from './artifact-loader.mjs';
const project=files=>translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});
const options=result=>({projectDeclarations:result.executableDeclarations,projectSourceScopes:result.sourceScopes});
function strict(result){const directory=mkdtempSync(join(tmpdir(),'router-scoped-meta-'));try{writeRuntimeAssets(directory);const path=join(directory,'src/module.ts');writeFileSync(path,result.typescript);execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--noEmit',path],{encoding:'utf8'});}finally{rmSync(directory,{recursive:true,force:true});}}
test('local globs and reexports select checked source bodies in project and per-file translation',{timeout:30_000},async()=>{
  const files={'src/lib.rs':'mod model; mod bridge; use crate::bridge::*; pub fn run(value:u8)->u8{increment(value)}','src/model.rs':'pub fn increment(value:u8)->u8{value+1}','src/bridge.rs':'pub use crate::model::increment;'};
  const result=project(files);assert.deepEqual(result.meta.refused,[]);strict(result);assert.equal((await loadJavaScript(result.javascript)).translated.run(7n),8n);
  const local=translateSource(files['src/lib.rs'],'src/lib.rs',options(result));assert.equal(local.ir.counts.executableFunctions,1);strict(local);assert.equal((await loadJavaScript(local.javascript)).translated.run(7n),8n);
  const raw=translateSource(files['src/lib.rs'],'src/lib.rs');assert.equal(raw.ir.counts.executableFunctions,0,'standalone unknown glob remains refused');
});
test('source function and type owners outrank standard prelude shortcuts through globs',{timeout:30_000},async()=>{
  const files={'src/lib.rs':'mod model; use crate::model::*; pub fn run(value:u8)->Option<u8>{Some(value)} pub fn text()->u8{String::new()}','src/model.rs':'pub fn Some(value:u8)->Option<u8>{Option::Some(value+1)} pub struct String; impl String {pub fn new()->u8{9}}'};
  const result=project(files);assert.deepEqual(result.meta.refused,[]);strict(result);
  for(const output of [result,translateSource(files['src/lib.rs'],'src/lib.rs',options(result))]){const api=(await loadJavaScript(output.javascript)).translated;assert.deepEqual(api.run(1n),{$:'Some',field0:2n});assert.equal(api.text(),9n);strict(output);}
});
test('unknown globs, derive macros and ambiguous crate contexts cannot supply namespace proof',()=>{
  for(const source of ['use custom::*; pub fn invented()->String{String::new()}','use custom::Debug; #[derive(Debug)] struct Named; pub fn invented()->String{String::new()}']){
    const result=project({'src/lib.rs':source});assert.equal(result.meta.executable.some(entry=>entry.name==='invented'),false);
    assert.equal(translateSource(source,'src/lib.rs',options(result)).ir.items.find(item=>item.name==='invented').status,'carried');
  }
  const files={'src/lib.rs':'pub fn run()->u8{1}'},left=project(files),right=project(files);
  const ambiguous=translateSource(files['src/lib.rs'],'src/lib.rs',{projectDeclarations:[...left.executableDeclarations,...right.executableDeclarations],projectSourceScopes:[...left.sourceScopes,...right.sourceScopes]});assert.equal(ambiguous.ir.counts.executableFunctions,0);
});
test('scope and declaration closures never supply stale source text at equal spans',async()=>{
  const files={'src/lib.rs':'mod model; use crate::model::*; pub fn run()->u8{value()}','src/model.rs':'pub fn value()->u8{1}'},result=project(files);
  const changed=files['src/lib.rs'].replace('value()','other()');assert.equal(changed.length,files['src/lib.rs'].length);
  const stale=translateSource(changed,'src/lib.rs',options(result));assert.equal(stale.ir.counts.executableFunctions,0);
});
test('complete tracked repository generation consumes local bindings and repeats deterministically',{timeout:30_000},async()=>{
  const directory=mkdtempSync(join(tmpdir(),'router-scoped-repo-'));
  const files={'src/lib.rs':'mod model; use crate::model::*; pub fn run(value:u8)->u8{next(value)}','src/model.rs':'pub fn next(value:u8)->u8{value+1}'};
  try{
    for(const [path,source] of Object.entries(files)){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);}
    execFileSync('git',['init','--quiet'],{cwd:directory});execFileSync('git',['add','src'],{cwd:directory});
    regenerate({root:directory});const checked=regenerate({root:directory,check:true});assert.deepEqual(checked.failures,[]);
    const meta=JSON.parse(readFileSync(join(directory,'tools/translation/meta/src/lib.meta.json'),'utf8'));assert.equal(meta.counts.executableFunctions,1);
    const javascript=readFileSync(join(directory,'js/generated/rust-draft/src/lib.mjs'),'utf8');assert.equal((await loadJavaScript(javascript)).translated.run(7n),8n);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
