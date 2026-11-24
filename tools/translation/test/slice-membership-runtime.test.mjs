import test from 'node:test';
import assert from 'node:assert/strict';
import {assertBorrowedStringSlice,borrowedStringSliceContains} from '../extensions/slice-membership-runtime.mjs';

test('borrowed string membership uses exact Unicode scalar contents and dense empty slices',()=>{
  for(const [values,needle,expected]of [[[], '',false],[[''], '',true],[['a','b'], 'b',true],[['a','b'],'ab',false],[['é'],'é',false],[['🦀','零'],'零',true],[['\0secret'],'\0secret',true],[['same','same'],'same',true]])assert.equal(borrowedStringSliceContains(Object.freeze(values),needle),expected);
  assert.equal(borrowedStringSliceContains(['a','b'],'a',2),true);
  assert.throws(()=>borrowedStringSliceContains(['a'],'a',2),TypeError);
  for(const value of [null,0,{},'a',Object.create(Array.prototype)])assert.throws(()=>borrowedStringSliceContains(value,'a'),TypeError);
  for(const value of [null,0,{},['a'],'\ud800','\udc00'])assert.throws(()=>borrowedStringSliceContains(['a'],value),TypeError);
});

test('membership validates every element and rejects holes extra fields accessors and prototypes',()=>{
  for(const value of [[,'a'],['a',0],['a','\ud800'],Object.assign(['a'],{extra:'a'}),Object.assign(['a'],{[Symbol('extra')]:'a'})])assert.throws(()=>borrowedStringSliceContains(value,'a'),TypeError);
  let reads=0;const getter=['a','b'];Object.defineProperty(getter,'1',{get(){reads++;throw new Error('getter must not run');}});
  assert.throws(()=>borrowedStringSliceContains(getter,'a'),TypeError);assert.equal(reads,0);
  const custom=['a'];Object.setPrototypeOf(custom,{get includes(){reads++;throw new Error('custom dispatch must not run');}});
  assert.throws(()=>borrowedStringSliceContains(custom,'a'),TypeError);assert.equal(reads,0);
  const values=['a'];Object.defineProperty(values,'includes',{get(){reads++;throw new Error('own dispatch must not run');}});
  assert.throws(()=>borrowedStringSliceContains(values,'a'),TypeError);assert.equal(reads,0);
});

test('proxy and revoked-proxy arrays are rejected before any trap executes',()=>{
  let reads=0;const traps={get(){reads++;throw new Error('proxy get');},getPrototypeOf(){reads++;throw new Error('proxy prototype');},ownKeys(){reads++;throw new Error('proxy keys');},getOwnPropertyDescriptor(){reads++;throw new Error('proxy descriptor');}};
  assert.throws(()=>borrowedStringSliceContains(new Proxy(['a'],traps),'a'),TypeError);
  const revoked=Proxy.revocable(['a'],traps);revoked.revoke();assert.throws(()=>assertBorrowedStringSlice(revoked.proxy),TypeError);assert.equal(reads,0);
});
