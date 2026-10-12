import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRust} from '../extensions/host-contracts.mjs';
import {translateProject} from '../project.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});

test('condition operands keep uppercase source constants through boolean arithmetic and unary parsing',{timeout:30000},async()=>{
  const source='const CAP:u8=2;const SIGNED:i32=2;const FLAG:bool=false;'
    +'pub fn both(v:u8,b:bool)->u8{if b && v==CAP{1}else{0}}'
    +'pub fn either(v:u8,b:bool)->u8{if b || v==CAP{1}else{0}}'
    +'pub fn add(v:u8,one:u8)->u8{if v==one+CAP{1}else{0}}'
    +'pub fn multiply(v:u8,one:u8)->u8{if v==one*CAP{1}else{0}}'
    +'pub fn negate(v:i32)->u8{if v== -SIGNED{1}else{0}}'
    +'pub fn invert()->u8{if !FLAG{1}else{0}}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,api=>{
    assert.equal(api.both(2n,true),1n);assert.equal(api.both(2n,false),0n);
    assert.equal(api.either(0n,true),1n);assert.equal(api.either(0n,false),0n);
    assert.equal(api.add(5n,3n),1n);assert.equal(api.add(6n,3n),0n);
    assert.equal(api.multiply(6n,3n),1n);assert.equal(api.multiply(7n,3n),0n);
    assert.equal(api.negate(-2n),1n);assert.equal(api.negate(2n),0n);assert.equal(api.invert(),1n);
  });
});

test('explicit parentheses and call arguments retain original record construction in conditions',{timeout:30000},async()=>{
  const result=project('struct Item{value:u8} fn read(value:Item)->u8{value.value}'
    +'pub fn grouped(v:u8)->u8{if (Item{value:v}).value==2u8{3}else{4}}'
    +'pub fn argument(v:u8)->u8{if read(Item{value:v})==2u8{3}else{4}}');
  assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,api=>{for(const name of ['grouped','argument']){assert.equal(api[name](2n),3n);assert.equal(api[name](1n),4n);}});
});

test('unit enum paths before condition blocks retain syntax without gaining unproved equality',()=>{
  const conditions=['if b && v==Choice::Last{return 1;}0','if b || v!=Choice::Last{return 1;}0','while v==Choice::Last{return 1;}0','match v==Choice::Last{true=>1,false=>0}'];
  for(const body of conditions){
    const source=`enum Choice{First,Last} pub fn compare(v:Choice,b:bool)->u8{${body}}`;
    assert.doesNotThrow(()=>parseRust(source+'fn main(){}'),source);
    const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='compare'),false,source);
    assert.ok(result.meta.refused.some(item=>item.name==='compare'),source);
  }
});

test('unparenthesized record expressions remain refused in condition source positions',()=>{
  const source='struct Item{value:u8} pub fn bad(v:u8)->u8{if Item{value:v}.value==2u8{3}else{4}}';
  const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false);
  assert.ok(result.meta.refused.some(item=>item.name==='bad'));
});
