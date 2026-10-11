import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {parserSourceScope} from '../source-scopes.mjs';
import {macroBindingAffects,macroScopeUncertain,attributeMacroProvenance} from '../macro-subnamespaces.mjs';
const resolve=(entries,options={})=>resolveModuleBindings({modules:Object.entries(entries).map(([path,source])=>({file:path?`src/${path}.rs`:'src/lib.rs',path:path?path.split('::'):[],source,items:sourceItems(source)})),...options});
const scope=(result,path='')=>result.scopes.find(scope=>scope.path.join('::')===path);

test('actual bang Copy and Clone definitions do not shadow standard derives',()=>{
  const result=resolve({'':'macro_rules! Copy {()=>{0}} macro_rules! Clone {()=>{1}} #[derive(Clone,Copy)] pub enum Kind { Ready }'}),root=scope(result);
  assert.equal(root.unresolvedTypeScope,false);assert.equal(root.unresolvedAttributeMacroScope,false);
  assert.equal(root.bindings.find(binding=>binding.name==='Copy').macroKind,'bang');
  assert.deepEqual(attributeMacroProvenance([root]).shadowedNames,[]);
  assert.ok(parserSourceScope(root).shadowedBuiltinMacros.has('Copy'));
  assert.ok(!result.diagnostics.some(diagnostic=>/derive binding/u.test(diagnostic.message)));
});

test('unknown ordinary child expansions and nested exports retain root bang uncertainty only',()=>{
  for(const child of ['#[derive(Unknown)] struct Child;','pub fn register(){#[macro_export] macro_rules! format {()=>{0}}}','inject_items!();']){
    const result=resolve({'':'mod child; #[derive(Clone,Copy)] pub enum Kind { Ready }',child}),root=scope(result);
    assert.equal(root.unresolvedBangMacroScope,true,child);assert.equal(root.unresolvedMacroScope,true,child);
    assert.equal(root.unresolvedAttributeMacroScope,false,child);assert.equal(root.unresolvedTypeScope,false,child);
    assert.equal(attributeMacroProvenance([root]).unresolvedImportScope,false,child);
    assert.equal(parserSourceScope(root,result.scopes).unresolvedBangMacroScope,true,child);
  }
});

test('known exported bang names keep source bindings and do not imply derive imports',()=>{
  const result=resolve({'':'mod child; #[derive(Clone,Copy)] pub enum Kind{Ready}',child:'#[macro_export] macro_rules! Copy {()=>{0}} #[macro_export] macro_rules! matches {()=>{1}}'}),root=scope(result);
  assert.equal(root.unresolvedAttributeMacroScope,false);assert.equal(root.unresolvedTypeScope,false);
  assert.equal(root.bindings.find(binding=>binding.name==='Copy').macroKind,'bang');
  const parser=parserSourceScope(root,result.scopes);assert.ok(parser.shadowedBuiltinMacros.has('matches'));
  assert.equal(attributeMacroProvenance([root]).unresolvedImportScope,false);
});

test('local procedural attributes item expansions unknown globs and conditional attributes remain closed',()=>{
  for(const source of ['#[unknown] struct S;','#[derive(Unknown)] struct S;','inject_items!();','use unknown::*;','#[cfg_attr(feature="x",unknown)] struct S;']){
    const root=scope(resolve({'':source}));assert.equal(root.unresolvedTypeScope,true,source);
    assert.equal(root.unresolvedBangMacroScope,true,source);assert.equal(root.unresolvedAttributeMacroScope,true,source);
    assert.equal(attributeMacroProvenance([root]).unresolvedImportScope,true,source);
  }
  const result=resolve({'':'mod child; use child::*;',child:'#[derive(Unknown)] pub struct S;'});
  assert.equal(scope(result).unresolvedAttributeMacroScope,true,'glob imports propagate the actual child attribute uncertainty');
});

test('explicit imports preserve duplicate binding errors across macro subnamespaces',()=>{
  const externalModules=new Map([['derive_lib',{complete:true,bindings:[{name:'Copy',namespace:'macro',macroKind:'derive',kind:'derive-macro',target:['derive_lib','Copy']}]}]]);
  const result=resolve({'':'mod child; use derive_lib::Copy; #[derive(Clone,Copy)] pub enum Kind{Ready}',child:'#[macro_export] macro_rules! Copy {()=>{0}}'},{externalModules});
  const binding=scope(result).bindings.find(binding=>binding.namespace==='macro'&&binding.name==='Copy');
  assert.equal(binding.status,'ambiguous');assert.equal(binding.macroKind,'unknown');
  assert.ok(result.diagnostics.some(diagnostic=>diagnostic.name==='Copy'&&/ambiguous/u.test(diagnostic.message)));
  assert.ok(attributeMacroProvenance([scope(result)]).shadowedNames.includes('Copy'));
  assert.equal(scope(result).unresolvedTypeScope,true);
});

test('unknown named macro imports cannot be discarded as bang-only evidence',()=>{
  const root=scope(resolve({'':'use unknown::Copy; #[derive(Clone,Copy)] pub enum Kind{Ready}'}));
  assert.equal(root.unresolvedAttributeMacroScope,true);assert.equal(root.unresolvedTypeScope,true);
  assert.ok(attributeMacroProvenance([root]).importedNames.includes('Copy'));
  assert.equal(macroBindingAffects({namespace:'macro',name:'Copy',status:'unresolved'},'attribute'),true);
});

test('legacy missing macro subnamespace evidence stays conservative',()=>{
  assert.equal(macroScopeUncertain({unresolvedMacroScope:true},'attribute'),true);
  assert.equal(macroScopeUncertain({},'bang'),true);
  assert.equal(macroScopeUncertain({unresolvedMacroScope:false},'attribute'),false);
  assert.equal(macroBindingAffects({namespace:'macro',macroKind:'bang',status:'ambiguous'},'attribute'),true);
  assert.throws(()=>macroScopeUncertain({},'value'),TypeError);
});
