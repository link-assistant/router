import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {lockedTomlValueNamespaceBindings} from '../toml-value-namespace.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const original=path=>execFileSync('git',['show','HEAD:'+path],{encoding:'utf8',maxBuffer:2_000_000});
const dependencies=()=>loadDeriveDependencyProof({manifest:original('Cargo.toml'),lock:original('Cargo.lock')});
const project=(source,deriveDependencies)=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies});

test('only genuine current Cargo proof selects original TOML public function identity',()=>{
  const proof=dependencies(),bindings=lockedTomlValueNamespaceBindings(proof);assert.equal(bindings.length,1);
  assert.deepEqual([bindings[0].namespace,bindings[0].kind,bindings[0].target],['value','fn',['toml_edit','value']]);
  assert.equal(bindings[0].sourceEvidence.callAuthority,false);assert.equal(bindings[0].sourceEvidence.layoutAuthority,false);assert.equal(bindings[0].sourceEvidence.namespaceComplete,false);
  assert.deepEqual(lockedTomlValueNamespaceBindings(structuredClone(proof)),[]);assert.deepEqual(lockedTomlValueNamespaceBindings(null),[]);
});

test('source function identity permits actual parameter/local/closure shadowing with typed targets',async()=>{
  const source='use toml_edit::value;pub fn parameter(value:u8)->u8{value}pub fn local()->u8{let value=7u8;value}pub fn callback(input:Option<u8>)->Option<u8>{input.map(|value|value+1u8)}';
  const result=project(source,dependencies());assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.parameter(3n),3n);assert.equal(api.local(),7n);assert.deepEqual(api.callback(Object.freeze({$:"Some",field0:5n})),Object.freeze({$:"Some",field0:6n}));},{childTimeoutMs:15000});
  const absent=project(source);assert.equal(absent.meta.executable.some(item=>item.name==='parameter'),false);
});

test('namespace identity admits no TOML calls types constructors globs or local package shadows',()=>{
  for(const source of ['use toml_edit::value;pub fn bad()->u8{value(7u8)}','use toml_edit::*;pub fn bad(value:u8)->u8{value}','use toml_edit::Item;pub fn bad(value:Item)->Item{value}','mod toml_edit{pub const value:u8=7u8;}use toml_edit::value;pub fn bad(value:u8)->u8{value}']){const result=project(source,dependencies());assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.ok(result.meta.refused.length,source);}
});
