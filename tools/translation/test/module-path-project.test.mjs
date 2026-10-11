import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const options=(files,profile=null)=>({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>{assert.ok(Object.hasOwn(files,path));return files[path];},compilationProfile:profile});

test('explicit path modules follow physical directories instead of logical non-mod-rs directories',()=>{
  const files={'src/lib.rs':'mod owner;','src/owner.rs':'#[path="actual.rs"]pub mod renamed;',
    'src/actual.rs':'pub const VALUE:u8=7;','src/owner/actual.rs':'pub const WRONG:u8=9;'};
  const graph=resolveModuleGraph(options(files));assert.deepEqual(graph.diagnostics,[]);
  assert.deepEqual(graph.modules.map(module=>module.file),['src/lib.rs','src/owner.rs','src/actual.rs']);
  assert.deepEqual(graph.modules.at(-1).path,['owner','renamed']);assert.equal(graph.modules.at(-1).source,files['src/actual.rs']);
  const selected=graph.edges.find(edge=>edge.to==='src/actual.rs').pathSelection;
  assert.equal(selected.explicitPath,'actual.rs');assert.equal(selected.namespaceAuthority,false);assert.equal(selected.runtimeAuthority,false);
});

test('path-included files resolve ordinary children as siblings in JavaScript and strict TypeScript',async()=>{
  const files={'src/lib.rs':'#[path="actual.rs"]mod renamed;pub fn result()->u8{renamed::child::value()}',
    'src/actual.rs':'pub mod child;','src/child.rs':'pub fn value()->u8{7}','src/actual/child.rs':'pub fn value()->u8{9}'};
  const result=translateProject(options(files));assert.deepEqual(result.meta.moduleDiagnostics,[]);assert.deepEqual(result.meta.refused,[]);
  assert.ok(result.meta.moduleEdges.some(edge=>edge.to==='src/child.rs'));assert.equal(result.meta.moduleEdges.some(edge=>edge.to==='src/actual/child.rs'),false);
  await verifyTypedTargets(result,api=>assert.equal(api.result(),7n));
});

test('inline path attributes use the actual root-file and non-mod-rs directories',()=>{
  for(const [ownerFile,ownerDirectory]of [['src/lib.rs','src'],['src/owner.rs','src/owner']]){
    const body='pub mod inline {#[path="other.rs"]pub mod inner;}';
    const files=ownerFile==='src/lib.rs'?{'src/lib.rs':body}:{'src/lib.rs':'mod owner;',[ownerFile]:body};
    files[ownerDirectory+'/inline/other.rs']='pub const VALUE:u8=7;';
    const graph=resolveModuleGraph(options(files));assert.deepEqual(graph.diagnostics,[]);
    const selected=graph.modules.find(module=>module.file===ownerDirectory+'/inline/other.rs');assert.ok(selected);
    const inline=graph.modules.find(module=>module.file===ownerFile&&module.path.at(-1)==='inline');assert.equal(inline.source,body);
    for(const item of originalSourceModuleItems(inline))for(const token of item.tokens)assert.equal(body.slice(token.start,token.end),token.text);
  }
});

test('inline path directory overrides govern nested explicit children without rewriting either file',async()=>{
  const files={'src/lib.rs':'mod owner;pub fn result()->u8{owner::thread::data::value()}',
    'src/owner.rs':'#[path="thread_files"]pub mod thread {#[path="tls.rs"]pub mod data;}',
    'src/thread_files/tls.rs':'pub fn value()->u8{7}','src/owner/thread_files/tls.rs':'pub fn value()->u8{9}'};
  const result=translateProject(options(files));assert.deepEqual(result.meta.moduleDiagnostics,[]);assert.deepEqual(result.meta.refused,[]);
  assert.ok(result.meta.moduleEdges.some(edge=>edge.to==='src/thread_files/tls.rs'));assert.equal(result.meta.moduleEdges.some(edge=>edge.to==='src/owner/thread_files/tls.rs'),false);
  await verifyTypedTargets(result,api=>assert.equal(api.result(),7n));
});

test('inactive unknown or transformed path declarations never read or execute their children',()=>{
  for(const declaration of ['#[cfg(test)]#[path="actual.rs"]mod child;','#[cfg(unix)]#[path="actual.rs"]mod child;','#[replace]#[path="actual.rs"]mod child;']){
    const files={'src/lib.rs':declaration,'src/actual.rs':'pub const HIDDEN:u8=7;'},read=[];
    const result=translateProject({...options(files,PRODUCTION_PROFILE),readSource:path=>{read.push(path);return files[path];}});
    assert.deepEqual(read,['src/lib.rs']);assert.equal(result.meta.executable.some(entry=>entry.name.includes('HIDDEN')),false);
    if(!declaration.startsWith('#[cfg(test)]'))assert.ok(result.meta.moduleDiagnostics.length);
  }
});

test('circular literal paths are diagnosed before repeated whole-file reads',()=>{
  for(const files of [{'src/lib.rs':'#[path="lib.rs"]mod again;'},
    {'src/lib.rs':'#[path="actual.rs"]mod child;','src/actual.rs':'#[path="lib.rs"]mod parent;'}]){
    const read=[],graph=resolveModuleGraph({...options(files),readSource:path=>{read.push(path);return files[path];}});
    assert.ok(graph.diagnostics.some(entry=>entry.message.includes('Circular tracked module')));assert.equal(read.length,Object.keys(files).length);
    assert.equal(new Set(read).size,read.length);assert.ok(graph.diagnostics.find(entry=>entry.cycle).cycle.at(-1)==='src/lib.rs');
  }
});

test('whole unchanged deployment graph follows all five original literal-file edges and facade views',()=>{
  const path='src/deploy.rs',source=readFileSync(new URL(path,root),'utf8');assert.equal(hash(source),'0acc07b144b6b63a32e337d38c4d74685b04c83d0f202b193ba999f160f9435a');
  const paths=execFileSync('git',['ls-files','-z','--','src'],{cwd:root,encoding:'utf8'}).split('\0').filter(path=>path.endsWith('.rs'));
  const graph=resolveModuleGraph({entry:path,paths,compilationProfile:PRODUCTION_PROFILE,readSource:path=>readFileSync(new URL(path,root),'utf8')});
  for(const name of ['instance','registry','runtime','step','operations']){
    const target=`src/deploy/${name}.rs`,edge=graph.edges.find(edge=>edge.from===path&&edge.to===target);assert.ok(edge,name);
    const module=graph.modules.find(module=>module.file===target&&module.path.join('.')===name);assert.ok(module);assert.equal(module.source,readFileSync(new URL(target,root),'utf8'));
    assert.equal(edge.pathSelection.sourceSha256,hash(source));assert.equal(edge.pathSelection.declarationSha256,hash(source.slice(edge.pathSelection.span.start,edge.pathSelection.span.end)));
    assert.equal(edge.pathSelection.namespaceAuthority,false);assert.equal(edge.pathSelection.runtimeAuthority,false);
  }
  for(const name of ['local','host','remote','staging','checkpoint'])assert.ok(graph.modules.some(module=>module.file===path&&module.path.join('.')===name));
  assert.equal(graph.diagnostics.some(entry=>entry.file===path),false);
});
