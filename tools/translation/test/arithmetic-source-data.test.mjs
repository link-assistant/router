import test from 'node:test';
import assert from 'node:assert/strict';
import {compileArithmeticSourceData,isArithmeticSourceData} from '../arithmetic-source-data.mjs';
import {compileArithmeticSourceFragments,bindArithmeticSourceData,bindArithmeticCalleeSource,projectArithmeticSource} from '../arithmetic-source-fragments.mjs';
const entry=['pkg','math'];
function compile(source,paths){const program=compileArithmeticSourceFragments(source,paths),data=compileArithmeticSourceData(source,entry);return {data,program:bindArithmeticSourceData(program,entry,[data])};}
test('actual literal array/reference/word-cfg data syntax is private and retains unresolved owner metadata',()=>{
  const source='#[cfg(fast_arithmetic="32")] type Limb=u32; #[cfg(fast_arithmetic="64")] type Limb=u64; #[cfg(fast_arithmetic="32")] const A:[u32;1]=[3]; #[cfg(fast_arithmetic="64")] const A:[u64;1]=[7]; const B:&[Limb]=&A; fn read()->Limb{B[0]}';
  const {data,program}=compile(source,['read']);assert.equal(isArithmeticSourceData(data),true);assert.equal(isArithmeticSourceData(structuredClone(data)),false);
  assert.equal(projectArithmeticSource(program,'read',[],{limbBits:32}).value,3n);assert.equal(projectArithmeticSource(program,'read',[],{limbBits:64}).value,7n);
  for(const key of ['namespaceComplete','typeOwnerVerified','attributeOwnerVerified','parseAdmission'])assert.equal(data[key],false);
  assert.throws(()=>bindArithmeticSourceData(compileArithmeticSourceFragments(source,['read']),entry,[structuredClone(data)]),/private compiled source/);
});
test('ambiguous constants, mismatched original bytes/types and custom source attributes never supply a default binding',()=>{
  const ambiguous='const A:u32=1; const A:u32=2; fn read()->u32{A}',a=compile(ambiguous,['read']);assert.throws(()=>projectArithmeticSource(a.program,'read',[]),/absent or ambiguous/);
  const source='const A:[u32;1]=[1]; const B:&[u64]=&A; fn read()->u64{B[0]}',b=compile(source,['read']);assert.throws(()=>projectArithmeticSource(b.program,'read',[]),/primitive identity differs/);
  const attrs='#[custom] const A:u32=1; fn read()->u32{A}',c=compile(attrs,['read']);assert.throws(()=>projectArithmeticSource(c.program,'read',[]),/attribute owner\/phase/);
  assert.throws(()=>bindArithmeticSourceData(compileArithmeticSourceFragments(source,['read']),entry,[compileArithmeticSourceData(source+' ',entry)]),/entry identity differs/);
});
test('original source imports resolve graph constants without clearing external namespace or macro uncertainty',()=>{
  const source='use super::data::*; fn read()->u32{A}',program=compileArithmeticSourceFragments(source,['read']),data=compileArithmeticSourceData(source,entry),external=compileArithmeticSourceData('const A:u32=9;',['pkg','data']);
  const modules=[data,external],bound=bindArithmeticSourceData(program,entry,modules);modules.pop();assert.equal(projectArithmeticSource(bound,'read',[]).value,9n);assert.equal(bound.sourceDataContext.namespaceComplete,false);assert.equal(bound.sourceOwnerVerified,false);assert.equal(bound.parseAdmission,false);
  assert.throws(()=>bindArithmeticSourceData(program,entry,[data,data]),/ambiguous/);
});

test('original cfg word aliases must be present and unique rather than accepting a caller model name',()=>{
  const valid='#[cfg(fast_arithmetic="32")] type Limb=u32; #[cfg(fast_arithmetic="64")] type Limb=u64; fn read(x:Limb)->Limb{x}',a=compile(valid,['read']);assert.equal(a.data.aliases.length,2);assert.equal(projectArithmeticSource(a.program,'read',[7n],{limbBits:32}).value,7n);assert.equal(projectArithmeticSource(a.program,'read',[1n<<40n],{limbBits:64}).value,1n<<40n);
  for(const source of ['fn read(x:Limb)->Limb{x}','type Limb=u64; fn read(x:Limb)->Limb{x}','type Limb=u32; type Limb=u32; fn read(x:Limb)->Limb{x}']){const b=compile(source,['read']);assert.throws(()=>projectArithmeticSource(b.program,'read',[1n]),/word alias/);}
});

test('cross-module callee binding requires private exact source identity and never grants free-function imports',()=>{
  const source='fn read(x:u32)->u32{x}',base=compile(source,['read']),externalSource='fn helper(x:u32)->u32{x}',externalData=compileArithmeticSourceData(externalSource,['pkg','other']),external=compileArithmeticSourceFragments(externalSource,['helper']),bound=bindArithmeticSourceData(compileArithmeticSourceFragments(source,['read']),entry,[base.data,externalData]);
  assert.throws(()=>bindArithmeticCalleeSource(bound,[{modulePath:['pkg','other'],program:external}]),/private source programs/);assert.throws(()=>bindArithmeticCalleeSource(bound,[{modulePath:['pkg','other'],program:structuredClone(external)}]),/private source programs/);assert.throws(()=>bindArithmeticCalleeSource(bound,[{modulePath:['pkg','missing'],program:external}]),/matching original/);
});
