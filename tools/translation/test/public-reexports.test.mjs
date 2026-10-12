import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const tag=$=>Object.freeze({$});
const api='mod api{mod hidden{pub enum Mode{Ready,Paused} pub fn number()->u8{7}}pub use self::hidden::{Mode,number};}';

test('public reexports preserve the checked route to enum and function canonical owners',{timeout:60_000},async()=>{
  const result=project(api+'pub fn choose(v:api::Mode)->u8{match v{api::Mode::Ready=>api::number(),api::Mode::Paused=>0}}');
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,js=>{assert.equal(js.choose(tag('Ready')),7n);assert.equal(js.choose(tag('Paused')),0n);});
});

test('named source imports retain actual public reexport visibility without exposing private modules',{timeout:60_000},async()=>{
  const result=project(api+'use api::Mode as M; use api::number as N;pub fn choose(v:M)->u8{match v{M::Ready=>N(),M::Paused=>0}}');
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,js=>{assert.equal(js.choose(tag('Ready')),7n);assert.equal(js.choose(tag('Paused')),0n);});
});

test('module alias reexports check remaining written suffixes at their actual canonical module',{timeout:60_000},async()=>{
  const source='mod api{mod hidden{pub mod inner{pub fn number()->u8{9}pub(super) fn secret()->u8{2}}}pub use hidden::inner as Shared;}mod relay{pub use crate::api::Shared as Public;}pub fn choose()->u8{relay::Public::number()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);await verifyTypedTargets(result,js=>assert.equal(js.choose(),9n));
  const invalid=project(source+'pub fn bad()->u8{relay::Public::secret()}');
  assert.ok(invalid.meta.refused.some(item=>item.name==='bad'));assert.equal(invalid.meta.executable.some(item=>item.name==='bad'),false);
});

test('cross-file reexports use complete original module bindings rather than a canonical path visibility guess',{timeout:60_000},async()=>{
  const files={'src/lib.rs':'mod api; mod consumer; pub fn choose()->u8{consumer::read()}','src/api.rs':'mod hidden; pub use hidden::number as exposed;','src/api/hidden.rs':'pub fn number()->u8{11}','src/consumer.rs':'use crate::api::exposed; pub fn read()->u8{exposed()}'};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,js=>assert.equal(js.choose(),11n));
});

test('direct private canonical paths and excessive reexport visibility remain source-bearing refusals',()=>{
  for(const source of [
    api+'pub fn bad()->u8{api::hidden::number()}',
    api+'pub fn bad(v:api::hidden::Mode)->u8{0}',
    'mod api{mod hidden{pub(super) fn private()->u8{7}}pub use hidden::private;}pub fn bad()->u8{api::private()}',
    'mod api{mod hidden{pub struct Secret(u8);}pub use hidden::Secret;}pub fn bad()->api::Secret{api::Secret(1)}',
    'mod api{pub use crate::relay::number;}mod relay{pub use crate::api::number;}pub fn bad()->u8{api::number()}',
  ]){const result=project(source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);}
});

test('reexport canonical targets retain actual source value and type namespace distinctions',{timeout:60_000},async()=>{
  const source='mod api{mod hidden{pub mod types{pub struct Mode{pub value:u8}}pub mod values{pub fn Mode()->u8{13}}}pub use hidden::types::Mode;pub use hidden::values::Mode;}pub fn typed(v:api::Mode)->u8{v.value}pub fn called()->u8{api::Mode()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);await verifyTypedTargets(result,js=>{assert.equal(js.typed(Object.freeze({$:'Mode',value:3n})),3n);assert.equal(js.called(),13n);});
});

test('an actual shared canonical name in type and value namespaces retains its separate backend obligation',()=>{
  const source='mod api{mod hidden{pub struct Mode{pub value:u8}pub fn Mode()->u8{13}}pub use hidden::Mode;}pub fn typed(v:api::Mode)->u8{v.value}pub fn called()->u8{api::Mode()}';
  const result=project(source);
  assert.equal(result.meta.refused.filter(item=>item.name==='api.hidden.Mode'&&item.message==='duplicate module-scoped declaration').length,2);
  for(const name of ['typed','called']){assert.ok(result.meta.refused.some(item=>item.name===name));assert.equal(result.meta.executable.some(item=>item.name===name),false);}
});
