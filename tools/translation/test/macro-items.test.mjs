import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput} from '../declarative-macros.mjs';
import {originalMacroTrees,originalMacroTreeText} from '../macro-token-trees.mjs';
import {loadDeclarativeSourceProof,tokioConfigurationSourceDefinition,declarativeSourceInvocations} from '../declarative-source-profile.mjs';
import {declarativeConditionalAttributePossibilities} from '../declarative-closure.mjs';
const root=new URL('../../../',import.meta.url),compile=source=>compileDeclarativeMacro(source,{name:'example',owner:['fixture']});
const render=expansion=>expansion.trees.map(originalMacroTreeText).join(' ');

test('opaque item captures parse bounded original modules imports and macro item delimiters',()=>{
  const definition=compile('macro_rules! example {($($item:item)*)=>{$($item)*};}');
  for(const source of [
    'pub mod named; pub use crate::one::{Thing,Other};',
    '#[doc(hidden)] #[deprecated="old"] pub use super::one as renamed;',
    'pub(crate) mod nested {use crate::one::*; pub mod inner;}',
    'known! { unknown token input } known::again!(opaque); known::third![opaque];',
  ]) {
    const expansion=expandDeclarativeMacro(definition,originalMacroTrees(source));assert.ok(expansion.trees.every(tree=>tree.kind==='fragment'&&tree.fragment==='item'));
    const receiver=compile('macro_rules! example {($($item:item)*)=>{$($item)*};}');
    assert.equal(render(expandDeclarativeMacro(receiver,declarativeSubInput(expansion))),render(expansion));
    const literal=compile('macro_rules! example {(pub mod named;) => {WRONG};}');
    assert.throws(()=>expandDeclarativeMacro(literal,declarativeSubInput(expansion)),/does not match/);
  }
});

test('unproved item forms malformed imports attributes and terminators remain refusals',()=>{
  const definition=compile('macro_rules! example {($($item:item)*)=>{$($item)*};}');
  for(const source of [
    'pub mod named','mod ;','mod true;','pub(in unknown) mod named;',
    'use *;','use known::;','use known as;','use known::{one other};',
    '#![unknown] mod named;','#[unknown(call!())] mod named;',
    'known!(opaque)','pub known! {opaque}','known[opaque];','fn unproved(){}','struct Unproved(u8);',
    'impl Unknown {}','mod nested {let value=7;}',
  ])assert.throws(()=>expandDeclarativeMacro(definition,originalMacroTrees(source)),/does not match/);
});

test('original locked Tokio cfg_rt transcribes complete task module items with both docsrs possibilities retained',()=>{
  const proof=loadDeclarativeSourceProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
  const definition=tokioConfigurationSourceDefinition(proof,'cfg_rt');
  const invocations=declarativeSourceInvocations(proof,'tokio/src/task/mod.rs').filter(entry=>entry.path.join('::')==='cfg_rt');assert.equal(invocations.length,1);
  const expansion=expandDeclarativeMacro(definition,invocations[0].trees);
  const item=expansion.trees.find(tree=>tree.kind==='fragment'&&tree.fragment==='item'&&tree.trees.some(token=>token.text==='task_local'));assert.ok(item);
  assert.equal(item.trees.map(originalMacroTreeText).join(' '),'mod task_local ;');
  const conditional=declarativeConditionalAttributePossibilities({dependencies:proof,expansion});assert.ok(conditional.rows.length>20);
  assert.ok(conditional.rows.every(row=>row.formula.kind==='atom'&&row.formula.name==='["docsrs"]'));
  for(const row of conditional.rows) {
    assert.deepEqual(row.alternatives[0],{predicate:false,attributes:[]});
    assert.equal(row.alternatives[1].predicate,true);assert.equal(row.alternatives[1].attributes[0][0].text,'doc');assert.equal(row.ownerResolved,false);
  }
  assert.equal(conditional.ownerVerified,false);assert.equal(conditional.namespaceComplete,false);assert.equal(conditional.generatedBehavior,false);
  assert.throws(()=>tokioConfigurationSourceDefinition(structuredClone(proof),'cfg_rt'),/sealed/);
  assert.throws(()=>declarativeSourceInvocations(proof,'untracked/task.rs'),/unregistered/);
});
