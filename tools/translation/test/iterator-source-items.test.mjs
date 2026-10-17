import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {roundTripProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

test('slice iter retains reference items and copied proves actual scalar Copy before collecting Vec',async()=>{
  const source='pub fn copy(v:&[u8])->Vec<u8>{v.iter().copied().collect()} pub fn mapped(v:&[u64])->Vec<u64>{v.iter().map(|x|10/x).take(1).collect()} pub fn filtered(v:&[u64])->Vec<u64>{v.iter().filter(|x|**x%2==1).map(|x|x+1).collect()} pub fn total(v:&[u8])->u8{let mut result:u8=0;for mut x in v.iter().copied(){x+=1;result+=x;}result} pub fn sum(v:&[u8])->u8{v.iter().sum()}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  const program=roundTripProgram(checkProgram(parseRust(source+' fn main(){}')));
  assert.equal(program.declarations.get('copy').body.object.sourceIteratorCopy.itemType.rustReference.pointee.rustPrimitiveName,'u8');
  assert.deepEqual(program.declarations.get('copy').body.type.rustOwnership,{kind:'owned',source:'Vec'});
  await verifyTypedTargets(result,api=>{
    assert.deepEqual(api.copy([1n,2n]),Object.freeze([1n,2n]));assert.deepEqual(api.copy([]),Object.freeze([]));
    assert.deepEqual(api.mapped([2n,0n]),Object.freeze([5n]));assert.throws(()=>api.mapped([0n]),RangeError);
    assert.deepEqual(api.filtered([1n,2n,3n]),Object.freeze([2n,4n]));assert.equal(api.total([1n,3n]),6n);assert.throws(()=>api.total([255n]),RangeError);
    assert.equal(api.sum([1n,3n]),4n);assert.equal(api.sum([]),0n);assert.throws(()=>api.sum([255n,1n]),RangeError);
  });
});
test('owned Vec IntoIterator produces values without inventing a shared item or Copy call',async()=>{
  const source='pub fn map(v:Vec<u8>)->Vec<u8>{v.into_iter().map(|x|x+1).collect()} pub fn total(v:Vec<u8>)->u8{let mut result:u8=0;for mut x in v{x+=1;result+=x;}result}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.deepEqual(api.map([1n,3n]),[2n,4n]);assert.equal(api.total([1n,3n]),6n);assert.throws(()=>api.map([255n]),RangeError);});
});
test('iterator reference depth cannot be erased at callbacks, collect boundaries or assignments',()=>{
  for(const source of [
    'pub fn bad(v:&[u64])->Vec<u64>{v.iter().map(|x|x).collect()}',
    'pub fn bad(v:&[u8])->u8{let mut result:u8=0;for mut x in v{x+=1;result+=x;}result}',
    'pub fn bad(v:&[u64])->usize{v.iter().filter(|x|x%2==1).count()}',
    'pub fn bad(v:Vec<u8>)->Vec<u8>{v.into_iter().copied().collect()}',
    'pub fn bad(v:&[String])->Vec<String>{v.iter().copied().collect()}',
    'pub fn bad(v:&[u8])->&[u8]{v.iter().copied().collect::<Vec<u8>>()}',
    'pub fn bad(s:&str,p:&str)->Option<&str>{s.strip_prefix(p)}',
  ]){
    const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);
    assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});
