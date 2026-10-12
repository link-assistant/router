import test from 'node:test';
import assert from 'node:assert/strict';
import {compileArithmeticSourceFragments,projectArithmeticSource,isArithmeticSourceFragments} from '../arithmetic-source-fragments.mjs';
test('source block scopes share outer mutable places while branch-local shadow bindings stay local',()=>{
  const source='fn update(x:u64)->u64{let mut total=x;if x != 0 {total=total+1;let total=x;}total}';
  const program=compileArithmeticSourceFragments(source,['update']);assert.equal(projectArithmeticSource(program,'update',[4n]).value,5n);assert.equal(projectArithmeticSource(program,'update',[0n]).value,0n);
});
test('source immutable assignments and arithmetic identity/overflow changes explicitly refuse',()=>{
  const immutable=compileArithmeticSourceFragments('fn bad(x:u64)->u64{let local=x;local=x;local}',['bad']);assert.throws(()=>projectArithmeticSource(immutable,'bad',[1n]),/mutable binder/);
  const overflow=compileArithmeticSourceFragments('fn add(x:u64)->u64{x+1}',['add']);assert.throws(()=>projectArithmeticSource(overflow,'add',[(1n<<64n)-1n]),RangeError);
  const identity=compileArithmeticSourceFragments('fn bad(x:u32,y:u64)->u32{x+y}',['bad']);assert.throws(()=>projectArithmeticSource(identity,'bad',[1n,1n]),/identities differ/);
  const call=compileArithmeticSourceFragments('fn helper(x:u32)->u32{x} fn bad(x:u64)->u32{helper(x)}',['helper','bad']);assert.throws(()=>projectArithmeticSource(call,'bad',[1n]),/parameter identity differs/);
});
test('serialized arithmetic fragments carry source evidence and cannot manufacture a private executable seal',()=>{
  const program=compileArithmeticSourceFragments('fn high(x:u64)->u64{x>>1}',['high']);assert.equal(isArithmeticSourceFragments(program),true);assert.equal(isArithmeticSourceFragments(JSON.parse(JSON.stringify(program))),false);assert.throws(()=>projectArithmeticSource(JSON.parse(JSON.stringify(program)),'high',[2n]),/private source/);
  const result=projectArithmeticSource(program,'high',[2n]);assert.equal(result.value,1n);assert.equal(result.projectionOnly,true);assert.equal(result.parseAdmission,false);assert.equal(result.sourceBehaviorFidelityVerified,false);
});

test('actual duplicate source owners refuse; singleton tuple punctuation survives private meta roundtrip',()=>{
  assert.throws(()=>compileArithmeticSourceFragments('fn a(x:u64)->u64{x} fn a(x:u64)->u64{x+1}',['a']),/ambiguous/);
  const program=compileArithmeticSourceFragments('fn one(x:u64)->(u64,){(x,)}',['one']);assert.deepEqual(projectArithmeticSource(program,'one',[3n]).value,[3n]);assert.equal(program.privateMetaRoundtrip,true);assert.match(program.checkedMetaSha256,/^[0-9a-f]{64}$/u);
  assert.throws(()=>compileArithmeticSourceFragments('fn one(x:u64)->(u64,){(x,,)}',['one']),/empty separated/);
});
