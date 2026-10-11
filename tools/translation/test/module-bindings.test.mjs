import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {sourceItems} from '../rust-structure.mjs';
const modules=entries=>Object.entries(entries).map(([name,source])=>({file:name?`src/${name.replaceAll('::','/')}.rs`:'src/lib.rs',path:name?name.split('::'):[],source,items:sourceItems(source)}));
const scope=(result,name='')=>result.scopes.find(scope=>scope.path.join('::')===name);
const binding=(result,name,namespace='type',owner='')=>scope(result,owner).bindings.find(binding=>binding.name===name && binding.namespace===namespace);
const resolve=(entries,options={})=>resolveModuleBindings({modules:modules(entries),...options});

test('nested use trees bind actual modules, aliases, constants and both tuple namespaces',()=>{
  const result=resolve({'':'mod model; use model::{self as owner, Count as Alias, nested::{VALUE as amount}};',model:'pub struct Count(pub u8); pub mod nested;', 'model::nested':'pub const VALUE:u8=7;'});
  assert.deepEqual(result.diagnostics,[]);
  assert.deepEqual(binding(result,'owner').target,['crate','model']);
  assert.deepEqual(binding(result,'Alias').target,['crate','model','Count']);
  assert.deepEqual(binding(result,'Alias','value').target,['crate','model','Count']);
  assert.deepEqual(binding(result,'amount','value').target,['crate','model','nested','VALUE']);
  assert.equal(scope(result).unresolvedTypeScope,false);assert.equal(scope(result).unresolvedMacroScope,false);
});

test('self, super, repeated super and crate prefixes resolve from each actual module',()=>{
  const result=resolve({'':'mod outer; pub struct Root;',outer:'pub struct Parent; mod child;', 'outer::child':'use self as own; use super::{Parent, self as parent}; use super::super::Root; use crate::outer::Parent as P;'});
  assert.deepEqual(result.diagnostics,[]);
  assert.deepEqual(binding(result,'own','type','outer::child').target,['crate','outer','child']);
  assert.deepEqual(binding(result,'parent','type','outer::child').target,['crate','outer']);
  assert.deepEqual(binding(result,'Root','type','outer::child').target,['crate','Root']);
  assert.deepEqual(binding(result,'P','type','outer::child').target,['crate','outer','Parent']);
});

test('local globs expose visible declarations and descendants can import parent private names',()=>{
  const result=resolve({'':'mod model; mod child; struct Parent; use model::*;',model:'pub struct Public; struct Private; pub(crate) fn crate_fn(){} pub struct Secret(u8);',child:'use super::*;'});
  assert.equal(binding(result,'Public').status,'resolved');assert.equal(binding(result,'Private'),undefined);
  assert.equal(binding(result,'Secret','value'),undefined,'a private tuple field restricts constructor access');
  assert.equal(binding(result,'Secret').status,'resolved');assert.equal(binding(result,'crate_fn','value').status,'resolved');
  assert.equal(binding(result,'Parent','type','child').status,'resolved');
  assert.equal(scope(result).unresolvedTypeScope,false);assert.equal(scope(result,'child').unresolvedMacroScope,false);
});

test('reexports reach a fixed point independently of file and import order',()=>{
  const entries={'':'mod api; mod middle; mod model; use api::*;',api:'pub use crate::middle::Count;',middle:'pub use crate::model::Count;',model:'pub struct Count { value:u8 }'};
  const result=resolve(entries);assert.deepEqual(result.diagnostics,[]);
  assert.deepEqual(binding(result,'Count').target,['crate','model','Count']);
  assert.equal(binding(result,'Count').declaration.source,'src/model.rs');
  assert.equal(binding(result,'Count','value'),undefined,'named record structs have no value constructor binding');
  const reversed=resolveModuleBindings({modules:modules(entries).reverse()});
  assert.deepEqual(binding(reversed,'Count').target,binding(result,'Count').target);
});

test('named imports and declarations shadow globs separately in each namespace',()=>{
  const result=resolve({'':'mod a; mod b; use a::*; use b::Item; struct Own {field:u8}',a:'pub struct Item; pub struct Own(pub u8);',b:'pub struct Item;'});
  assert.equal(binding(result,'Item').status,'resolved');assert.deepEqual(binding(result,'Item').target,['crate','b','Item']);
  assert.deepEqual(binding(result,'Own').target,['crate','Own']);
  assert.deepEqual(binding(result,'Own','value').target,['crate','a','Own']);
  assert.equal(result.diagnostics.length,0);
});

test('different glob targets and duplicate explicit imports stay ambiguous rather than choosing a path',()=>{
  for(const imports of ['use a::*; use b::*;','use a::Item; use b::Item;','use a::Item; use a::Item;']) {
    const result=resolve({'':`mod a; mod b; ${imports}`,a:'pub struct Item;',b:'pub struct Item;'});
    assert.equal(binding(result,'Item').status,'ambiguous');assert.equal(binding(result,'Item').target,null);assert.ok(result.diagnostics.some(diagnostic=>/ambiguous/u.test(diagnostic.message)));
  }
});

test('unknown named extern imports shadow only their names while unknown globs make scope incomplete',()=>{
  const named=resolve({'':'use unknown::{String, helper as call};'});
  for(const namespace of ['type','value','macro'])assert.equal(binding(named,'String',namespace).status,'unresolved');
  assert.equal(scope(named).unresolvedTypeScope,false);assert.equal(scope(named).unresolvedMacroScope,false);
  assert.ok(named.diagnostics.length);
  const glob=resolve({'':'use unknown::*;'});assert.equal(scope(glob).unresolvedTypeScope,true);assert.equal(scope(glob).unresolvedMacroScope,true);
});

test('explicit external tables allow only recorded canonical exports and glob completeness is asserted',()=>{
  const table={bindings:[{name:'Error',namespace:'type',target:['std','io','Error'],kind:'struct'}],complete:true};
  const externalModules=new Map([['std::io',table]]),result=resolve({'':'use ::std::io::{self as io, Error}; use std::io::*;'}, {externalModules});
  assert.equal(binding(result,'Error').status,'resolved');assert.deepEqual(binding(result,'io').target,['std','io']);
  assert.equal(scope(result).unresolvedTypeScope,false);
  const incomplete=resolve({'':'use std::io::*;'}, {externalModules:new Map([['std::io',{...table,complete:false}]])});
  assert.equal(scope(incomplete).unresolvedTypeScope,true);assert.equal(scope(incomplete).unresolvedMacroScope,true);
  const shadow=resolve({'':'mod std; use std::io::Error;',std:'pub struct Local;'}, {externalModules});
  assert.equal(binding(shadow,'Error').status,'unresolved','local type owner wins over extern fallback');
});

test('restricted visibility checks actual ancestor paths and rejects private sibling imports',()=>{
  const result=resolve({'':'mod owner; mod sibling;',owner:'pub(super) struct Parent; pub(in crate::owner) struct Narrow; pub mod child;', 'owner::child':'use super::Narrow;',sibling:'use crate::owner::{Parent, Narrow};'});
  assert.equal(binding(result,'Narrow','type','owner::child').status,'resolved');
  assert.equal(binding(result,'Parent','type','sibling').status,'resolved');
  assert.equal(binding(result,'Narrow','type','sibling').status,'unresolved');
  const reexport=resolve({'':'mod child; pub use child::Private;',child:'struct Private;'});
  assert.equal(binding(reexport,'Private').status,'unresolved');
});

test('enum globs preserve unit/tuple constructors and self binds only the type namespace',()=>{
  const result=resolve({'':'mod model; use model::Choice::*; use model::Choice::{self as Kind};',model:'pub enum Choice { Unit, Tuple(u8), Named { value:u8 } }'});
  assert.equal(binding(result,'Unit').status,'resolved');assert.equal(binding(result,'Unit','value').status,'resolved');
  assert.equal(binding(result,'Tuple','value').status,'resolved');assert.equal(binding(result,'Named','value'),undefined);
  assert.deepEqual(binding(result,'Kind').target,['crate','model','Choice']);assert.equal(binding(result,'Kind','value'),undefined);
});

test('glob and named reexport cycles retain explicit uncertainty with bounded termination',()=>{
  const glob=resolve({'':'mod a; mod b; use a::*;',a:'pub use crate::b::*;',b:'pub use crate::a::*;'});
  for(const name of ['','a','b'])assert.equal(scope(glob,name).unresolvedTypeScope,true);
  assert.ok(glob.diagnostics.some(diagnostic=>/cycle/u.test(diagnostic.message)));
  const named=resolve({'':'mod a; mod b;',a:'pub use crate::b::X;',b:'pub use crate::a::X;'});
  assert.equal(binding(named,'X','type','a').status,'unresolved');assert.ok(named.diagnostics.length);
});

test('procedural and item expansion scopes never grant complete glob evidence',()=>{
  for(const source of ['#[cfg_attr(feature="x", custom)] pub struct Maybe;','#[derive(Custom)] pub struct Record;','inject_items!();']) {
    const result=resolve({'':'mod model; use model::*;',model:source});assert.equal(scope(result).unresolvedTypeScope,true,source);assert.equal(scope(result).unresolvedMacroScope,true,source);
  }
  const macroUse=resolve({'':'#[macro_use] mod model; use model::*;',model:'pub struct Plain;'});
  assert.equal(scope(macroUse).unresolvedMacroScope,true);
});

test('conditional named declarations preserve their shadow names and unavailable bodies preserve macro uncertainty',()=>{
  const conditional=resolve({'':'mod model; use model::*;',model:'#[cfg(feature="x")] pub struct Maybe; pub struct Plain;'});
  assert.equal(binding(conditional,'Maybe').status,'unresolved');assert.equal(binding(conditional,'Maybe').target,null);
  assert.equal(binding(conditional,'Plain').status,'resolved');assert.equal(scope(conditional).unresolvedTypeScope,false);
  const inline=resolve({'':'mod model; use model::*;',model:'mod nested { pub struct X; } pub struct Plain;'});
  assert.equal(binding(inline,'Plain').status,'resolved');assert.equal(scope(inline).unresolvedTypeScope,false);
  assert.equal(scope(inline).unresolvedMacroScope,true,'an unavailable module could export macros to the crate root');
});

test('macro definitions retain expansion obligations and exported identities belong to crate root',()=>{
  const result=resolve({'':'mod model; use crate::published as imported;',model:'macro_rules! local {()=>{}} #[macro_export] macro_rules! published {()=>{}}'});
  assert.equal(binding(result,'local','macro','model').status,'unresolved');
  assert.deepEqual(binding(result,'published','macro').target,['crate','published']);
  assert.deepEqual(binding(result,'imported','macro').target,['crate','published']);
  assert.equal(binding(result,'published','macro').source,'src/model.rs');
});

test('familiar derive names cannot certify a complete scope when their macro binding is unproven',()=>{
  const result=resolve({'':'mod model; use model::*;',model:'use custom::Debug; #[derive(Debug)] pub struct Plain;'});
  assert.equal(scope(result).unresolvedTypeScope,true);assert.equal(scope(result).unresolvedMacroScope,true);
  assert.ok(result.diagnostics.some(diagnostic=>/attribute macro provenance/u.test(diagnostic.message)));
  const typeOnly=resolve({'':'use library::Debug; #[derive(Debug)] pub struct Plain;'}, {externalModules:new Map([['library',{complete:true,bindings:[{name:'Debug',namespace:'type',target:['library','Debug'],kind:'trait'}]}]])});
  assert.equal(scope(typeOnly).unresolvedTypeScope,false,'a type namespace import does not shadow the derive macro namespace');
  const registered=resolve({'':'use library::Debug; #[derive(Debug)] pub struct Plain;'}, {externalModules:new Map([['library',{complete:true,bindings:[{name:'Debug',namespace:'macro',target:['library','Debug'],kind:'derive-macro',standardDerive:true}]}]])});
  assert.equal(scope(registered).unresolvedTypeScope,false,'an explicit trusted standard derive profile may establish its own provenance');
});

test('const fn qualifiers, raw names and generic tuple constructors keep their actual namespaces',()=>{
  const result=resolve({'':'mod model; use model::*;',model:'pub const fn read()->u8{1} pub const r#unsafe:u8=1; pub struct r#type; pub struct Generic<T>(pub T); pub const unsafe fn owned()->u8{1}'});
  assert.equal(binding(result,'read','value').status,'resolved');assert.equal(binding(result,'fn','value'),undefined);
  assert.equal(binding(result,'owned','value').status,'resolved');assert.equal(binding(result,'unsafe','value').status,'resolved');
  assert.deepEqual(binding(result,'type').target,['crate','model','type']);
  assert.equal(binding(result,'Generic','value').status,'resolved');
});

test('a pinned item partition that swallows a following declaration cannot certify a complete glob',()=>{
  const result=resolve({'':'mod model; use model::*;',model:'pub const unsafe fn owned()->u8{1} pub const VALUE:u8=2;'});
  assert.equal(scope(result).unresolvedTypeScope,true);assert.equal(scope(result).unresolvedMacroScope,true);
  assert.ok(result.diagnostics.some(diagnostic=>/partition/u.test(diagnostic.message)));
});

test('invalid self aliases and struct self imports refuse without granting actual targets',()=>{
  for(const source of ['use crate;','use self;','struct S; use S::{self};','use super::Missing;','use self::*;']) {
    const result=resolve({'':source});assert.ok(result.diagnostics.length,source);
    for(const imported of scope(result).bindings.filter(binding=>binding.via==='named-import'))assert.notEqual(imported.status,'resolved');
  }
});

test('binding evidence is serializable and does not mutate or freeze tracked graph inputs',()=>{
  const input=modules({'':'mod model; use model::*;',model:'pub struct Item;'}),before=JSON.stringify(input),result=resolveModuleBindings({modules:input});
  assert.equal(JSON.stringify(input),before);assert.equal(Object.isFrozen(input[0]),false);assert.ok(Object.isFrozen(result.scopes));
  assert.deepEqual(JSON.parse(JSON.stringify(result)),result);
});

test('built-in path on a conditional module preserves named uncertainty without poisoning other type owners',()=>{
  const result=resolve({'':'#[derive(Clone,Copy)] pub struct RefUpdate { value:u8 } #[cfg(test)] #[path="git_proxy_tests.rs"] mod tests;'});
  assert.equal(scope(result).unresolvedTypeScope,false);assert.equal(scope(result).unresolvedMacroScope,true);
  assert.equal(binding(result,'RefUpdate').status,'resolved');assert.equal(binding(result,'tests').status,'unresolved');
  assert.ok(result.diagnostics.some(diagnostic=>/compilation-condition/u.test(diagnostic.message)));
  const tracked=resolve({'':'#[path="actual.rs"] mod model; use model::*;',model:'pub struct Actual;'});
  assert.equal(scope(tracked).unresolvedTypeScope,false);assert.deepEqual(binding(tracked,'Actual').target,['crate','model','Actual']);
  for(const source of ['#[path="other.rs"] struct Bad;','#[path=other] mod bad;','#[path("other.rs")] mod bad;','#[cfg_attr(test,path="other.rs")] mod bad;'])assert.equal(scope(resolve({'':source})).unresolvedTypeScope,true,source);
});
