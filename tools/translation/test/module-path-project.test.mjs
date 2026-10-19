import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {MODULE_PATH_PROFILE} from '../module-paths.mjs';
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

test('unknown path sources remain carried while inactive or transformed declarations cannot read children',()=>{
  for(const declaration of ['#[cfg(test)]#[path="actual.rs"]mod child;','#[cfg(unix)]#[path="actual.rs"]mod child;','#[replace]#[path="actual.rs"]mod child;']){
    const files={'src/lib.rs':declaration,'src/actual.rs':'pub const HIDDEN:u8=7;'},read=[];
    const result=translateProject({...options(files,PRODUCTION_PROFILE),readSource:path=>{read.push(path);return files[path];}});
    const unknown=declaration.startsWith('#[cfg(unix)]');assert.deepEqual(read,unknown?['src/lib.rs','src/actual.rs']:['src/lib.rs']);assert.equal(result.meta.executable.some(entry=>entry.name.includes('HIDDEN')),false);
    if(unknown){assert.ok(result.meta.refused.some(entry=>entry.file==='src/actual.rs'&&entry.message==='unknown crate compilation condition'));const edge=result.meta.moduleEdges.find(edge=>edge.to==='src/actual.rs');assert.equal(edge.pathSelection.configurationCondition,'unknown');assert.equal(edge.pathSelection.availabilitySelected,false);}
    if(!declaration.startsWith('#[cfg(test)]'))assert.ok(result.meta.moduleDiagnostics.length);
  }
  const files={'src/lib.rs':'#[cfg(unix)]#[path="unix.rs"]mod child;#[cfg(windows)]#[path="windows.rs"]mod child;','src/unix.rs':'pub struct Candidate;','src/windows.rs':'pub trait Candidate{fn from(value:bool)->Self;}'};
  const read=[],result=translateProject({...options(files,PRODUCTION_PROFILE),readSource:path=>{read.push(path);return files[path];}});
  assert.deepEqual(read,['src/lib.rs']);assert.equal(result.meta.moduleEdges.length,0);assert.equal(result.meta.executable.length,0);
  assert.equal(result.meta.moduleDiagnostics.filter(row=>row.message.includes('competing original declaration alternatives')).length,2);
});

test('circular literal paths are diagnosed before repeated whole-file reads',()=>{
  for(const files of [{'src/lib.rs':'#[path="lib.rs"]mod again;'},
    {'src/lib.rs':'#[path="actual.rs"]mod child;','src/actual.rs':'#[path="lib.rs"]mod parent;'}]){
    const read=[],graph=resolveModuleGraph({...options(files),readSource:path=>{read.push(path);return files[path];}});
    assert.ok(graph.diagnostics.some(entry=>entry.message.includes('Circular tracked module')));assert.equal(read.length,Object.keys(files).length);
    assert.equal(new Set(read).size,read.length);assert.ok(graph.diagnostics.find(entry=>entry.cycle).cycle.at(-1)==='src/lib.rs');
  }
});

test('long acyclic external chains stop before reading beyond their explicit source depth bound',()=>{
  for(const inline of [false,true]){
    const files={},read=[],limit=MODULE_PATH_PROFILE.limits.externalDepth;
    for(let index=0;index<limit+3;index++){
      const file=index===0?'src/lib.rs':`src/node${index}.rs`,child=`#[path="node${index+1}.rs"]mod next;`;
      files[file]=inline?`#[path="."]mod layer {${child}}`:child;
    }
    const graph=resolveModuleGraph({...options(files),readSource:path=>{read.push(path);return files[path];}});
    const refusal=graph.diagnostics.find(entry=>entry.message.includes('bounded external-file depth'));assert.ok(refusal);
    assert.equal(refusal.limit,limit);assert.equal(refusal.target,`src/node${limit}.rs`);assert.equal(read.length,limit);
    assert.equal(graph.edges.some(edge=>edge.to===refusal.target),false);assert.equal(new Set(read).size,read.length);
  }
});

test('combined inline and external depth has a bound independent of file and module counts',()=>{
  const files={},read=[],depth=MODULE_PATH_PROFILE.limits.graphDepth;
  for(let index=0;index<MODULE_PATH_PROFILE.limits.externalDepth;index++){
    const file=index===0?'src/lib.rs':`src/node${index}.rs`;
    files[file]=`#[path="."]mod a {#[path="."]mod b {#[path="."]mod c {#[path="node${index+1}.rs"]mod next;}}}`;
  }
  const graph=resolveModuleGraph({...options(files),readSource:path=>{read.push(path);return files[path];}});
  const refusal=graph.diagnostics.find(entry=>entry.message.includes('bounded combined module depth'));assert.ok(refusal);
  assert.equal(refusal.limit,depth);assert.equal(refusal.module.length,depth+1);
  assert.ok(read.length<MODULE_PATH_PROFILE.limits.externalDepth);assert.ok(graph.modules.length<MODULE_PATH_PROFILE.limits.modules);
  assert.equal(graph.edges.some(edge=>edge.module.length>depth),false);assert.equal(graph.diagnostics.some(entry=>entry.message.includes('bounded external-file depth')),false);
});

test('whole unchanged deployment graph follows all five original literal-file edges and facade views',()=>{
  const path='src/deploy.rs',source=readFileSync(repositorySourceURL(path,root),'utf8');assert.equal(hash(source),'0acc07b144b6b63a32e337d38c4d74685b04c83d0f202b193ba999f160f9435a');
  const paths=execFileSync('git',['ls-files','-z','--','src'],{cwd:root,encoding:'utf8'}).split('\0').filter(path=>path.endsWith('.rs'));
  const graph=resolveModuleGraph({entry:path,paths,compilationProfile:PRODUCTION_PROFILE,readSource:path=>readFileSync(repositorySourceURL(path,root),'utf8')});
  for(const name of ['instance','registry','runtime','step','operations']){
    const target=`src/deploy/${name}.rs`,edge=graph.edges.find(edge=>edge.from===path&&edge.to===target);assert.ok(edge,name);
    const module=graph.modules.find(module=>module.file===target&&module.path.join('.')===name);assert.ok(module);assert.equal(module.source,readFileSync(new URL(target,root),'utf8'));
    assert.equal(edge.pathSelection.sourceSha256,hash(source));assert.equal(edge.pathSelection.declarationSha256,hash(source.slice(edge.pathSelection.span.start,edge.pathSelection.span.end)));
    assert.equal(edge.pathSelection.namespaceAuthority,false);assert.equal(edge.pathSelection.runtimeAuthority,false);
  }
  for(const name of ['local','host','remote','staging','checkpoint'])assert.ok(graph.modules.some(module=>module.file===path&&module.path.join('.')===name));
  assert.equal(graph.diagnostics.some(entry=>entry.file===path),false);
});
