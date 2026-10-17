import test from 'node:test';
import assert from 'node:assert/strict';
import {originalMacroTrees} from '../macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro} from '../declarative-macros.mjs';
import {compileArithmeticAssociatedSource,isArithmeticAssociatedSource,projectedArithmeticAssociatedValue} from '../arithmetic-associated-source.mjs';
import {compileArithmeticSourceFragments,bindArithmeticSourceData,bindArithmeticAssociatedSource,projectArithmeticSource} from '../arithmetic-source-fragments.mjs';
import {compileArithmeticSourceData} from '../arithmetic-source-data.mjs';
const expanded=source=>expandDeclarativeMacro(compileDeclarativeMacro(source,{name:'definitions',owner:['fixture']}),originalMacroTrees(''));
test('generic associated source constant binding reads original literal rather than hardcoding a ZERO spelling',()=>{
  const source='trait Word:Copy+PartialEq{const ZERO:Self;} macro_rules! definitions {()=>{impl Word for u32 {const ZERO:Self=7;}}} fn check<T:Word>(values:&[T])->bool{values.iter().rev().any(|&x| x != T::ZERO)}',associated=compileArithmeticAssociatedSource([expanded(source)]),program=bindArithmeticAssociatedSource(bindArithmeticSourceData(compileArithmeticSourceFragments(source,['check']),['fixture'],[compileArithmeticSourceData(source,['fixture'])]),associated);
  assert.equal(projectedArithmeticAssociatedValue(associated,'Word','u32','ZERO'),7n);assert.equal(projectArithmeticSource(program,'check',[[7n,7n]]).value,false);assert.equal(projectArithmeticSource(program,'check',[[7n,8n]]).value,true);assert.equal(projectArithmeticSource(program,'check',[[]]).value,false);
  assert.equal(program.associatedSource.privateMetaRoundtrip,true);assert.equal(projectArithmeticSource(program,'check',[[7n]]).parseAdmission,false);
});
test('cloned, mismatched source and duplicate actual associated owners fail closed',()=>{
  const source='trait Word:Copy+PartialEq{const ZERO:Self;} macro_rules! definitions {()=>{impl Word for u32 {const ZERO:Self=7;}}} fn read(x:u32)->u32{x}',proof=expanded(source),associated=compileArithmeticAssociatedSource([proof]),program=bindArithmeticSourceData(compileArithmeticSourceFragments(source,['read']),['fixture'],[compileArithmeticSourceData(source,['fixture'])]);
  assert.equal(isArithmeticAssociatedSource(structuredClone(associated)),false);assert.throws(()=>compileArithmeticAssociatedSource([structuredClone(proof)]),/private actual/);assert.throws(()=>bindArithmeticAssociatedSource(program,structuredClone(associated)),/private matching/);
  const other=compileArithmeticAssociatedSource([expanded(source+' ')]);assert.throws(()=>bindArithmeticAssociatedSource(program,other),/matching/);
  const duplicate=compileArithmeticAssociatedSource([proof,proof]);assert.throws(()=>projectedArithmeticAssociatedValue(duplicate,'Word','u32','ZERO'),/ambiguous/);
  for(const key of ['traitOwnerVerified','primitiveTypeOwnerVerified','attributeOwnerVerified','generatedBehaviorVerified','namespaceAuthority','parseAdmission'])assert.equal(associated[key],false,key);
});
