import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'}),ok=field0=>Object.freeze({$:'Ok',field0}),err=field0=>Object.freeze({$:'Err',field0});
test('nested generated Option Result and tuple owners remain at crate root across source modules',{timeout:30_000},async()=>{
  const sources={'src/lib.rs':'mod left;mod right; pub fn relay(v:Option<Result<(Option<u64>,Option<u64>),u8>>)->Option<Result<(Option<u64>,Option<u64>),u8>>{right::echo(left::echo(v))}',
    'src/left.rs':'pub fn echo(v:Option<Result<(Option<u64>,Option<u64>),u8>>)->Option<Result<(Option<u64>,Option<u64>),u8>>{v}',
    'src/right.rs':'pub fn echo(v:Option<Result<(Option<u64>,Option<u64>),u8>>)->Option<Result<(Option<u64>,Option<u64>),u8>>{v}'};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(sources),readSource:path=>sources[path]});assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,api=>{for(const value of [none,some(err(2n)),some(ok(Object.freeze({$:'Tuple',field0:some(3n),field1:none})))])assert.deepEqual(api.relay(value),value);});
});
test('an authored generated-looking basename preserves its genuine local type owner',{timeout:30_000},async()=>{
  const sources={'src/lib.rs':'mod local; pub fn plain(v:Option<u8>)->Option<u8>{v}',
    'src/local.rs':'pub struct RouterOption_2_u8{pub value:u16} pub fn echo(v:Option<RouterOption_2_u8>)->Option<RouterOption_2_u8>{v}'};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(sources),readSource:path=>sources[path]});assert.deepEqual(result.meta.refused,[]);
  assert.ok(result.meta.executable.some(entry=>entry.name==='local.echo'));
  const tagged=Object.freeze({$:'RouterOption_2_u8',value:513n});
  await verifyCohortTargets(result,api=>{assert.deepEqual(api.plain(some(2n)),some(2n));assert.deepEqual(api['local.echo'](some(tagged)),some(tagged));assert.throws(()=>api['local.echo'](some(2n)),TypeError);});
});
