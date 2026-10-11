import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {checkProgram,parseRust} from '../extensions/host-contracts.mjs';
import {roundTripProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'});
test('checked slice readers retain actual shared reference results through meta and both targets',async()=>{
  const source="pub fn first(v:&[u8])->Option<&u8>{v.first()} pub fn last(v:&[u8])->Option<&u8>{v.last()} pub fn at(v:&[u8],n:usize)->Option<&u8>{v.get(n)} pub fn copied(v:&[u8])->u8{v.first().map_or(0,|n|*n)} pub fn nested(v:&'static [&'static u64])->Option<&'static &'static u64>{v.first()} pub fn words(v:&[String])->Option<&String>{v.first()} pub fn vectors(v:&[Vec<u8>])->Option<&Vec<u8>>{v.first()}";
  const checked=roundTripProgram(checkProgram(parseRust(source+' fn main(){}')));
  const first=checked.declarations.get('first'),layout=checked.declarations.get(first.ret.name);
  assert.equal(layout.standardGeneric.arguments[0].rustReference.kind,'shared');
  assert.equal(layout.standardGeneric.arguments[0].rustReference.pointee.rustPrimitiveName,'u8');
  const nested=checked.declarations.get(checked.declarations.get('nested').ret.name).standardGeneric.arguments[0];
  assert.equal(nested.rustReference.pointee.rustReference.pointee.rustPrimitiveName,'u64');
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.deepEqual(api.first([7n,9n]),some(7n));assert.deepEqual(api.last([7n,9n]),some(9n));assert.deepEqual(api.at([7n,9n],1n),some(9n));
    assert.deepEqual(api.first([]),none);assert.deepEqual(api.at([7n],99n),none);
    assert.equal(api.copied([7n,9n]),7n);assert.equal(api.copied([]),0n);assert.deepEqual(api.nested([9n]),some(9n));
    assert.deepEqual(api.words(['one','two']),some('one'));assert.deepEqual(api.words([]),none);const inner=Object.freeze([3n]);assert.equal(api.vectors([inner]).field0,inner);
    assert.throws(()=>api.first([256n]),TypeError);assert.throws(()=>api.at([7n],-1n),RangeError);
    let reads=0;const accessor=[7n];Object.defineProperty(accessor,'0',{get(){reads++;return 7n;}});assert.throws(()=>api.first(accessor),TypeError);assert.equal(reads,0);
  });
});
test('slice readers cannot invent by-value results or callback inputs from shared borrows',()=>{
  for(const source of [
    'pub fn bad(v:&[u8])->Option<u8>{v.first()}',
    'pub fn bad(v:&[String])->Option<String>{v.first()}',
    'pub fn bad(v:&[Vec<u8>])->Option<Vec<u8>>{v.first()}',
    'pub fn bad(v:&[u8])->Option<u8>{v.last()}',
    'pub fn bad(v:&[u8],n:usize)->Option<u8>{v.get(n)}',
    'pub fn bad(v:&[u8])->u8{v.first().map_or(0,|n|n)}',
    'pub fn bad(v:&[&u64])->Option<&u64>{v.first()}',
    'pub fn bad(v:&[usize])->Option<&u64>{v.first()}',
    'pub fn bad(v:&[u64],n:u64)->Option<&u64>{v.get(n)}',
    'pub fn bad(v:&[Box<u8>])->Option<&u8>{v.first()}',
  ]){
    const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);
    assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});
