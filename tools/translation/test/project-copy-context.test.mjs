import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
const copy='#[derive(Clone,Copy)] pub enum Kind{A,B} impl Kind{pub fn amount(self)->u8{match self{Self::A=>1,Self::B=>2}}} pub fn run(value:Kind)->u8{value.amount()}';
test('a layoutless source module retains its original context for standard implementation targets',async()=>{
  const source='mod empty {trait Marker{} impl Marker for std::time::Duration{}} pub fn amount()->u8{7}';
  const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='amount'),true);
  assert.equal(result.meta.unloweredItems.some(item=>item.term==='impl'&&item.module.join('.')==='empty'),true);
  await verifyTypedTargets(result,api=>assert.equal(api.amount(),7n));
});
test('layoutless nested scopes do not invent opaque layouts or remove an unrelated checked Copy body',async()=>{
  const source=copy+'mod outer {pub mod empty {trait Marker{} pub struct Opaque<T>{value:T} impl<T> Marker for Opaque<T>{} impl Marker for std::time::Duration{}}}';
  const result=project(source);assert.ok(result.meta.refused.some(item=>item.name==='Opaque'));
  assert.equal(result.meta.checkedMethods.some(item=>item.name==='Kind.amount'),true);
  assert.equal(result.meta.checkedMethods.some(item=>item.name?.startsWith('outer.empty.Opaque.')),false);
  await verifyTypedTargets(result,api=>{assert.equal(api.run(Object.freeze({$:'A'})),1n);assert.equal(api.run(Object.freeze({$:'B'})),2n);});
});
test('missing target layouts stay source-bearing refusals inside empty contexts',async()=>{
  const source='mod empty {trait Marker{} impl Marker for std::ffi::OsString{}} pub fn amount()->u8{7}';
  const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='amount'),true);
  assert.equal(result.meta.unloweredItems.filter(item=>item.term==='impl').length,1);
  assert.equal(result.meta.executable.some(item=>item.name?.includes('Marker')),false);
  await verifyTypedTargets(result,api=>assert.equal(api.amount(),7n));
});
test('an inactive source module supplies neither layout context nor trait implementation',async()=>{
  const source=copy+'#[cfg(test)] mod std {trait Marker{} impl Marker for std::time::Duration{}}';
  const result=project(source);assert.equal(result.sourceScopes.some(scope=>scope.module.join('.')==='std'),false);
  assert.equal(result.meta.checkedMethods.some(item=>item.name==='Kind.amount'),true);
  await verifyTypedTargets(result,api=>assert.equal(api.run(Object.freeze({$:'A'})),1n));
});
test('unknown conditional implementation scopes retain their Copy obligations',()=>{
  const files={'src/lib.rs':copy+'mod empty;','src/empty.rs':'#![cfg(unix)]\nimpl Drop for crate::Kind{fn drop(&mut self){}} trait Marker{} impl Marker for std::time::Duration{}}'};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE});
  assert.equal(result.meta.executable.some(item=>item.name==='run'),false);
  assert.equal(result.sourceScopes.find(scope=>scope.module[0]==='empty').configurationCondition,'unknown');
});
