import test from 'node:test';
import assert from 'node:assert/strict';
import {HostRustParser,checkProgram} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {configureParserSourceScope} from '../source-scopes.mjs';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {normalizeGeneratedTypeOwner} from '../extensions/generated-type-owners.mjs';
import {originalSourceTypeOwner} from '../extensions/source-namespaces.mjs';
import {linkParsedFile} from '../extensions/source-links.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
const api='mod api{mod hidden{pub enum Mode{Ready,Paused}}pub use hidden::Mode;}';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const tag=$=>Object.freeze({$}),some=field0=>Object.freeze({$:'Some',field0}),none=tag('None');

test('original public enum owners survive Option normalization through private implementation modules',{timeout:30000},async()=>{
  const result=project(api+'use api::Mode;pub fn choose(ready:bool)->Option<Mode>{if ready{Some(Mode::Ready)}else{None}}');
  assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,js=>{assert.deepEqual(js.choose(true),some(tag('Ready')));assert.deepEqual(js.choose(false),none);});
});

test('nested Result Option and tuple metadata copies retain the same original public owner',{timeout:30000},async()=>{
  const result=project(api+'use api::Mode as M;pub fn echo(value:Option<Result<(M,bool),u8>>)->Option<Result<(M,bool),u8>>{value}');
  assert.deepEqual(result.meta.refused,[]);
  const value=some(Object.freeze({$:'Ok',field0:Object.freeze({$:'Tuple',field0:tag('Paused'),field1:true})}));
  await verifyCohortTargets(result,js=>{assert.deepEqual(js.echo(value),value);assert.deepEqual(js.echo(none),none);});
});

test('shared reference pointees preserve public owners while nominal fixed arrays retain their Copy obligation',{timeout:30000},async()=>{
  const source=api+'pub fn borrow(value:Option<&api::Mode>)->Option<&api::Mode>{value}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,js=>{const borrowed=some(tag('Paused'));assert.deepEqual(js.borrow(borrowed),borrowed);});
  const array=project(api+'pub fn echo(value:Option<[api::Mode;1]>)->Option<[api::Mode;1]>{value}');
  assert.ok(array.meta.refused.some(entry=>entry.name==='echo'&&/checked scalar or borrowed-str Copy profile/.test(entry.message)));
  assert.equal(array.meta.executable.some(entry=>entry.name==='echo'),false);
});

test('complete original out-of-line imports retain public enum owners during generic layout construction',{timeout:30000},async()=>{
  const files={'src/lib.rs':'mod api;mod consumer;pub fn choose()->Option<api::Mode>{consumer::choose()}',
    'src/api.rs':'mod hidden;pub use hidden::Mode;','src/api/hidden.rs':'pub enum Mode{Ready,Paused}',
    'src/consumer.rs':'use crate::api::Mode;pub fn choose()->Option<Mode>{Some(Mode::Ready)}'};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,js=>assert.deepEqual(js.choose(),some(tag('Ready'))));
});

test('an earlier valid public type occurrence does not authorize a later written private path',()=>{
  for(const source of [
    api+'pub fn good(value:Option<api::Mode>)->Option<api::Mode>{value}pub fn bad(value:Option<api::hidden::Mode>)->u8{0}',
    api+'pub fn bad(value:Result<api::hidden::Mode,u8>)->u8{0}',
    api+'pub fn bad(value:(api::hidden::Mode,bool))->u8{0}',
    api+'pub fn bad(value:Option<&api::hidden::Mode>)->u8{0}',
  ]){const result=project(source);assert.ok(result.meta.refused.some(entry=>entry.name==='bad'),source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);}
});

test('canonical normalization evidence is private to the original parser occurrence and consuming scope',()=>{
  const declaration='pub fn typed(value:api::Mode)->u8{0}fn main(){}';
  const source=api+declaration,options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source};
  const graph=resolveModuleGraph(options),bindings=resolveModuleBindings({modules:graph.modules,compilationProfile:graph.compilationProfile});
  const scope=bindings.scopes.find(scope=>scope.path.length===0),parser=new HostRustParser(tokenizeRust(declaration));
  configureParserSourceScope(parser,scope,bindings.scopes,[]);
  const surface=parser.file(),type=surface.items.find(item=>item.name==='typed').params[0].type;
  assert.deepEqual(originalSourceTypeOwner(parser,type,[]),['crate','api','hidden','Mode']);
  assert.deepEqual(normalizeGeneratedTypeOwner(parser,structuredClone(type),[]).path,type.path,'Metadata copies retain an exact already resolved source occurrence');
  assert.equal(originalSourceTypeOwner(new HostRustParser(tokenizeRust(source)),type,[]),null);
  assert.equal(originalSourceTypeOwner(parser,type,['other']),null);
  assert.equal(originalSourceTypeOwner(parser,{...type,span:{start:type.span.start+1,end:type.span.end+1}},[]),null);
  assert.equal(originalSourceTypeOwner(parser,{...type,path:['crate','api','hidden','Other']},[]),null);
  const original=structuredClone(type);type.path=['crate','api','hidden','Other'];
  assert.throws(()=>checkProgram(linkParsedFile(parser,surface,declaration)),/changed before original source linking|changed after source capture/);
  configureParserSourceScope(parser,scope,bindings.scopes,[]);
  assert.equal(originalSourceTypeOwner(parser,original,[]),null,'A new namespace configuration revokes the earlier occurrence evidence');
});
