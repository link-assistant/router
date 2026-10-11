import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeMonomorphicType,monomorphicTypeName} from '../monomorphic.mjs';
const named=path=>({kind:'named',path});
const array=element=>({kind:'array',element});
test('monomorphic names distinguish recursive arrays, qualified paths and parameter boundaries',()=>{
  const types=[named(['a_b']),named(['a','b']),named(['array','a']),array(named(['a'])),array(named(['a','b'])),array(named(['a_b'])),array(array(named(['a']))),named(['雪'])];
  assert.equal(new Set(types.map(encodeMonomorphicType)).size,types.length);
  assert.equal(encodeMonomorphicType(named(['crate','a','b'])),encodeMonomorphicType(named(['a','b'])));
  const names=types.flatMap(left=>types.map(right=>monomorphicTypeName('Result',[left,right])));
  assert.equal(new Set(names).size,types.length ** 2);
  assert.ok(names.every(name=>/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)));
  assert.equal(monomorphicTypeName('Option',[{kind:'fixed',bits:32,signed:true}]),'RouterOption_3_i32');
});
test('actual pointer integer identities remain distinct from portable fixed widths',()=>{
  const type=name=>({kind:'fixed',bits:64,signed:name.startsWith('i'),rustPrimitiveName:name});
  const types=['u64','usize','i64','isize'].map(type);
  assert.equal(new Set(types.map(encodeMonomorphicType)).size,4);
  assert.equal(encodeMonomorphicType(type('u64')),'u64');assert.equal(encodeMonomorphicType(type('i64')),'i64');
  assert.equal(encodeMonomorphicType(type('usize')),'rust_usize');assert.equal(encodeMonomorphicType(type('isize')),'rust_isize');
  assert.equal(new Set(types.map(element=>encodeMonomorphicType(array(element)))).size,4);
  assert.equal(new Set(types.flatMap(left=>types.map(right=>monomorphicTypeName('Result',[left,right])))).size,16);
});
